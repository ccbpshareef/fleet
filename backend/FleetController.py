"""
Fleet Management API Controller (Lorry backend).
Uses jnp_reports_db tables from create_tables.sql (abbreviated column names).
Mirrors D:\\Lorry\\backend FastAPI endpoints for fleet/lorry management.
"""

import asyncio
import json
import re
from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import Request

from databse import DatabaseService
from helpers import get_auth_params, get_request_body, logger, make_json_response

DB = "jnp_reports_db"
COMMISSION_TRANSPORT_THRESHOLD = 120_000.0
RESERVED_USER_IDS = {"admin", "user", "driver", "root", "system", "fleet"}


def _round_money(value) -> float:
    return round(float(value or 0), 2)


def _fleet_json(data=None, code=200, message=None):
    """
    Standard Fleet API response envelope.
    Always returns: {status, message?, data, statusCode}
    """
    if (
        isinstance(data, dict)
        and data.get("status") in {"success", "fail"}
        and "data" in data
    ):
        return make_json_response(data, code)

    payload = {
        "status": "success" if code < 400 else "fail",
        "data": data if data is not None else {},
    }
    if message:
        payload["message"] = message
    return make_json_response(payload, code)


def _fleet_error(detail, code=400, data=None):
    return make_json_response(
        {
            "status": "fail",
            "message": str(detail),
            "data": data if data is not None else {},
        },
        code,
    )


def _serialize_fleet_value(v):
    if v is None:
        return None
    if hasattr(v, "isoformat"):
        return v.isoformat()
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, bytes):
        return v.decode("utf-8", errors="replace")
    return v


def _serialize_fleet_row(row):
    if not row or not isinstance(row, dict):
        return row
    return {k: _serialize_fleet_value(v) for k, v in row.items()}


def _serialize_fleet_rows(rows):
    return [_serialize_fleet_row(r) for r in rows] if rows else []



def _execute_write(query, params=None, return_last_id=False):
    connection = None
    cursor = None
    try:
        connection = DatabaseService.get_connection()
        if not connection:
            raise Exception("Database connection failed")
        cursor = connection.cursor(dictionary=True)
        cursor.execute(query, params or ())
        last_id = cursor.lastrowid
        connection.commit()
        return last_id if return_last_id else cursor.rowcount
    except Exception:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        raise
    finally:
        if cursor:
            cursor.close()
        if connection and not DatabaseService.is_managed_connection(connection):
            if connection.is_connected():
                connection.close()


def _normalize_user_id(raw: str) -> str:
    value = (raw or "").strip().lower()
    value = re.sub(r"[^a-z0-9_]+", "_", value.replace(" ", "_"))
    value = re.sub(r"_+", "_", value).strip("_")
    return value[:32]


def _expense_total_row(expense) -> float:
    if not expense:
        return 0.0
    return _round_money(
        (expense.get("diesel") or 0)
        + (expense.get("toll") or 0)
        + (expense.get("driver_bata") or 0)
        + (expense.get("driver_daily_wage") or 0)
        + (expense.get("driver_commission_amount") or 0)
        + (expense.get("maintenance") or 0)
        + (expense.get("other") or 0)
    )


def _trip_working_days(trip) -> int:
    ld = trip.get("loading_date")
    ud = trip.get("unloading_date")
    if ld and ud:
        if isinstance(ld, str):
            ld = date.fromisoformat(ld[:10])
        if isinstance(ud, str):
            ud = date.fromisoformat(ud[:10])
        return max((ud - ld).days + 1, 1)
    return 1


class FleetController:
    """Fleet/lorry management APIs backed by jnp_reports_db."""

    @staticmethod
    async def _run_db_query(query, params=None, fetch_all=True):
        return await asyncio.to_thread(DatabaseService.execute_query, query, params, fetch_all)

    @staticmethod
    async def _run_db_write(query, params=None, return_last_id=False):
        return await asyncio.to_thread(_execute_write, query, params, return_last_id)

    @staticmethod
    async def _build_auth_context(viewer, role, scope_user):
        if role == "admin":
            return {"role": "admin", "owner": (scope_user or "").strip() or None, "driver_id": None}
        if role == "driver":
            driver_id = None
            owner = None
            if viewer:
                acc = await FleetController._run_db_query(
                    f"SELECT drv_id FROM {DB}.jnp_usr_acc WHERE ident = %s",
                    (viewer.strip().lower(),),
                    fetch_all=False,
                )
                driver_id = (acc or {}).get("drv_id")
                if driver_id:
                    drv = await FleetController._run_db_query(
                        f"SELECT crt_by FROM {DB}.jnp_drv WHERE id = %s",
                        (driver_id,),
                        fetch_all=False,
                    )
                    owner = (drv or {}).get("crt_by")
            return {"role": "driver", "owner": owner, "driver_id": driver_id}
        return {"role": "user", "owner": viewer, "driver_id": None}

    @staticmethod
    def _owner_filter_sql(ctx, table_alias=""):
        prefix = f"{table_alias}." if table_alias else ""
        col = f"{prefix}crt_by"
        if ctx["role"] == "admin":
            if not ctx["owner"]:
                return "1=0", ()
            return f"{col} = %s", (ctx["owner"],)
        if ctx["role"] == "driver":
            return "1=1", ()
        if ctx["owner"]:
            return f"{col} = %s", (ctx["owner"],)
        return "1=0", ()

    @staticmethod
    async def _write_owner(viewer, role, scope_user):
        ctx = await FleetController._build_auth_context(viewer, role, scope_user)
        if ctx["role"] == "admin":
            return ctx["owner"] or viewer or "admin"
        if ctx["role"] == "driver":
            return ctx["owner"] or viewer or "admin"
        return viewer or "admin"

    @staticmethod
    def _map_driver(row, login_identifier=None, has_login=False):
        if not row:
            return None
        return {
            "id": row["id"],
            "name": row["name"],
            "phone": row["phone"],
            "license_number": row.get("license_number"),
            "is_active": bool(row.get("is_active", 1)),
            "created_by": row.get("created_by"),
            "login_identifier": login_identifier,
            "has_login": has_login,
        }

    @staticmethod
    def _driver_select():
        return f"""
            SELECT id, nm AS name, ph AS phone, lic_no AS license_number,
                   act AS is_active, crt_by AS created_by, crt_at AS created_at
            FROM {DB}.jnp_drv
        """

    @staticmethod
    def _lorry_select():
        return f"""
            SELECT id, veh_no AS vehicle_number, loc AS current_location,
                   drv_id AS driver_id, act AS is_active, crt_by AS created_by, crt_at AS created_at
            FROM {DB}.jnp_lry
        """

    @staticmethod
    def _trip_select():
        return f"""
            SELECT id, lry_id AS lorry_id, drv_id AS driver_id, ld_typ AS load_type,
                   ld_wt AS load_weight, ld_loc AS load_location, uld_loc AS unload_location,
                   cp_nm AS contact_person_name, cp_ph AS contact_person_phone,
                   ld_dt AS loading_date, uld_dt AS unloading_date, cmp_at AS completed_at,
                   dist_km AS distance_km, ld_prc AS load_price, sts AS status,
                   crt_by AS created_by, crt_at AS created_at
            FROM {DB}.jnp_trp
        """

    @staticmethod
    def _expense_select():
        return f"""
            SELECT id, trp_id AS trip_id, dsl AS diesel, tol AS toll,
                   drv_bata AS driver_bata, drv_wg AS driver_daily_wage,
                   com_pct AS driver_commission_percent, com_amt AS driver_commission_amount,
                   mnt AS maintenance, oth AS other, prf_img AS proof_images_json,
                   nts AS notes, crt_by AS created_by, crt_at AS created_at
            FROM {DB}.jnp_exp
        """

    @staticmethod
    def _serialize_expense(row):
        if not row:
            return None
        proof = []
        raw = row.get("proof_images_json")
        if raw:
            try:
                parsed = json.loads(raw)
                proof = parsed if isinstance(parsed, list) else []
            except json.JSONDecodeError:
                proof = []
        out = _serialize_fleet_row(row)
        out.pop("proof_images_json", None)
        out["proof_images"] = proof
        out["total"] = _expense_total_row(row)
        for k in ("diesel", "toll", "driver_bata", "driver_daily_wage", "driver_commission_percent",
                  "driver_commission_amount", "maintenance", "other", "total"):
            if k in out and out[k] is not None:
                out[k] = _round_money(out[k])
        return out

    @staticmethod
    async def _trip_totals(trip_id):
        rows = await FleetController._run_db_query(
            f"{FleetController._expense_select()} WHERE trp_id = %s",
            (trip_id,),
        )
        total_exp = sum(_expense_total_row(r) for r in (rows or []))
        trip = await FleetController._run_db_query(
            f"{FleetController._trip_select()} WHERE id = %s",
            (trip_id,),
            fetch_all=False,
        )
        load_price = float((trip or {}).get("load_price") or 0)
        return total_exp, load_price - total_exp

    @staticmethod
    async def _serialize_trip(row):
        if not row:
            return None
        out = _serialize_fleet_row(row)
        total_exp, net = await FleetController._trip_totals(row["id"])
        out["total_expenses"] = _round_money(total_exp)
        out["net_profit"] = _round_money(net)
        if out.get("load_price") is not None:
            out["load_price"] = _round_money(out["load_price"])
        return out

    @staticmethod
    async def _driver_login_info(driver_id):
        acc = await FleetController._run_db_query(
            f"SELECT ident FROM {DB}.jnp_usr_acc WHERE drv_id = %s AND rol = 'driver' LIMIT 1",
            (driver_id,),
            fetch_all=False,
        )
        if acc:
            return acc["ident"], True
        return None, False

    @staticmethod
    async def api_health():
        return _fleet_json({"service": "fleet", "health": "ok"}, 200, "Fleet API is healthy")

    @staticmethod
    async def api_login(request: Request):
        try:
            data = await get_request_body(request)
            identifier = (data.get("identifier") or "").strip().lower()
            password = data.get("password") or ""
            user = await FleetController._run_db_query(
                f"SELECT ident, pwd, rol, drv_id FROM {DB}.jnp_usr_acc WHERE ident = %s",
                (identifier,),
                fetch_all=False,
            )
            if not user or user.get("pwd") != password:
                return _fleet_error("Invalid credentials", 401)
            if user.get("rol") == "driver" and not user.get("drv_id"):
                return _fleet_error("Driver account is not linked", 403)
            fleet_owner = None
            if user.get("rol") == "driver" and user.get("drv_id"):
                drv = await FleetController._run_db_query(
                    f"SELECT crt_by FROM {DB}.jnp_drv WHERE id = %s",
                    (user["drv_id"],),
                    fetch_all=False,
                )
                fleet_owner = (drv or {}).get("crt_by")
            return _fleet_json({
                "identifier": user["ident"],
                "role": user["rol"],
                "driver_id": user.get("drv_id"),
                "fleet_owner": fleet_owner,
                "acting_as_admin": None,
            })
        except Exception as e:
            logger(f"Fleet login error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_login_as_user(request: Request):
        try:
            viewer, role, scope_user = get_auth_params(request)
            if role != "admin":
                return _fleet_error("Admin access required", 403)
            data = await get_request_body(request)
            target_id = (data.get("target_identifier") or "").strip().lower()
            target = await FleetController._run_db_query(
                f"SELECT ident, rol, drv_id FROM {DB}.jnp_usr_acc WHERE ident = %s",
                (target_id,),
                fetch_all=False,
            )
            if not target or target.get("rol") != "user":
                return _fleet_error("User not found", 404)
            return _fleet_json({
                "identifier": target["ident"],
                "role": target["rol"],
                "driver_id": target.get("drv_id"),
                "fleet_owner": None,
                "acting_as_admin": (viewer or "").strip().lower(),
            })
        except Exception as e:
            logger(f"Fleet login-as-user error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_forgot_password(request: Request):
        try:
            data = await get_request_body(request)
            identifier = (data.get("identifier") or "").strip().lower()
            new_password = data.get("new_password") or ""
            user = await FleetController._run_db_query(
                f"SELECT id FROM {DB}.jnp_usr_acc WHERE ident = %s",
                (identifier,),
                fetch_all=False,
            )
            if not user:
                return _fleet_error("User not found", 404)
            if len(new_password) < 4:
                return _fleet_error("New password must be at least 4 characters", 400)
            await FleetController._run_db_write(
                f"UPDATE {DB}.jnp_usr_acc SET pwd = %s WHERE ident = %s",
                (new_password, identifier),
            )
            return _fleet_json({"message": "Password reset successful"})
        except Exception as e:
            logger(f"Fleet forgot-password error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_check_user_id(request: Request):
        try:
            identifier = _normalize_user_id(request.query_params.get("identifier") or "")
            if len(identifier) < 3:
                return _fleet_json({
                    "identifier": identifier,
                    "available": False,
                    "suggestions": [],
                    "message": "User ID must be at least 3 characters (letters, numbers, underscore)",
                })
            if identifier in RESERVED_USER_IDS:
                return _fleet_json({
                    "identifier": identifier,
                    "available": False,
                    "suggestions": await FleetController._suggest_user_ids(f"{identifier}_user"),
                    "message": "This User ID is reserved",
                })
            taken = await FleetController._run_db_query(
                f"SELECT id FROM {DB}.jnp_usr_acc WHERE ident = %s",
                (identifier,),
                fetch_all=False,
            )
            available = not bool(taken)
            return _fleet_json({
                "identifier": identifier,
                "available": available,
                "suggestions": [] if available else await FleetController._suggest_user_ids(identifier),
                "message": "User ID is available" if available else "User ID already taken",
            })
        except Exception as e:
            logger(f"Fleet check-user-id error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def _suggest_user_ids(base, limit=5):
        base = _normalize_user_id(base) or "user"
        suggestions = []
        candidates = [f"{base}1", f"{base}2", f"{base}_fleet", f"fleet_{base}"]
        candidates.extend([f"{base}{n}" for n in range(10, 210)])
        for cand in candidates:
            normalized = _normalize_user_id(cand)
            if len(normalized) < 3 or normalized in RESERVED_USER_IDS or normalized in suggestions:
                continue
            taken = await FleetController._run_db_query(
                f"SELECT id FROM {DB}.jnp_usr_acc WHERE ident = %s",
                (normalized,),
                fetch_all=False,
            )
            if not taken:
                suggestions.append(normalized)
            if len(suggestions) >= limit:
                break
        return suggestions

    @staticmethod
    async def api_register_user(request: Request):
        try:
            data = await get_request_body(request)
            identifier = _normalize_user_id(data.get("identifier") or "")
            phone = (data.get("phone") or "").strip()
            email = (data.get("email") or "").strip().lower()
            language = (data.get("preferred_language") or "en").strip().lower()
            password = data.get("password") or ""
            confirm = data.get("confirm_password") or ""
            if len(identifier) < 3:
                return _fleet_error("User ID must be at least 3 characters", 400)
            if identifier in RESERVED_USER_IDS:
                return _fleet_error("This User ID is reserved", 400)
            if await FleetController._run_db_query(
                f"SELECT id FROM {DB}.jnp_usr_acc WHERE ident = %s", (identifier,), fetch_all=False
            ):
                suggestions = await FleetController._suggest_user_ids(identifier)
                detail = "User ID already exists"
                if suggestions:
                    detail = f"{detail}. Try: {', '.join(suggestions)}"
                return _fleet_error(detail, 400)
            if len(phone) < 8:
                return _fleet_error("Valid phone number is required", 400)
            if not email or "@" not in email:
                return _fleet_error("Valid email is required", 400)
            if language not in {"en", "te"}:
                return _fleet_error("Language must be en or te", 400)
            if len(password) < 4:
                return _fleet_error("Password must be at least 4 characters", 400)
            if password != confirm:
                return _fleet_error("Passwords do not match", 400)
            if await FleetController._run_db_query(
                f"SELECT id FROM {DB}.jnp_usr_prf WHERE eml = %s", (email,), fetch_all=False
            ):
                return _fleet_error("Email already registered", 400)
            full_name = (data.get("full_name") or "").strip()
            if not full_name:
                full_name = email.split("@")[0].replace(".", " ").replace("_", " ").title()[:80] or "Fleet User"
            await FleetController._run_db_write(
                f"INSERT INTO {DB}.jnp_usr_acc (ident, pwd, rol) VALUES (%s, %s, 'user')",
                (identifier, password),
            )
            await FleetController._run_db_write(
                f"""INSERT INTO {DB}.jnp_usr_prf (ident, rol, fl_nm, ph, eml, lang)
                    VALUES (%s, 'user', %s, %s, %s, %s)""",
                (identifier, full_name, phone, email, language),
            )
            return _fleet_json({
                "identifier": identifier,
                "role": "user",
                "driver_id": None,
                "fleet_owner": None,
                "acting_as_admin": None,
                "message": f"Account created. Your User ID is {identifier}.",
            }, 201)
        except Exception as e:
            logger(f"Fleet register-user error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_list_users(request: Request):
        try:
            _, role, _ = get_auth_params(request)
            if role != "admin":
                return _fleet_error("Admin access required", 403)
            accounts = await FleetController._run_db_query(
                f"SELECT ident, rol FROM {DB}.jnp_usr_acc WHERE rol = 'user' ORDER BY ident ASC"
            )
            items = []
            for acc in accounts or []:
                profile = await FleetController._run_db_query(
                    f"SELECT fl_nm FROM {DB}.jnp_usr_prf WHERE ident = %s",
                    (acc["ident"],),
                    fetch_all=False,
                )
                items.append({
                    "identifier": acc["ident"],
                    "role": acc["rol"],
                    "full_name": (profile or {}).get("fl_nm"),
                })
            return _fleet_json(items)
        except Exception as e:
            logger(f"Fleet list users error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_get_user_profile(request: Request, identifier: str | None = None):
        try:
            if identifier is None:
                identifier = (request.query_params.get("identifier") or "").strip().lower()
            else:
                identifier = identifier.strip().lower()
            row = await FleetController._run_db_query(
                f"""SELECT id, ident AS identifier, rol AS role, fl_nm AS full_name,
                           ph AS phone, eml AS email, prf_img AS profile_image_url,
                           lang AS preferred_language
                    FROM {DB}.jnp_usr_prf WHERE ident = %s""",
                (identifier,),
                fetch_all=False,
            )
            if not row:
                return _fleet_json(None)
            return _fleet_json(_serialize_fleet_row(row))
        except Exception as e:
            logger(f"Fleet get user profile error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_save_user_profile(request: Request):
        try:
            data = await get_request_body(request)
            identifier = (data.get("identifier") or "").strip().lower()
            existing = await FleetController._run_db_query(
                f"SELECT id FROM {DB}.jnp_usr_prf WHERE ident = %s",
                (identifier,),
                fetch_all=False,
            )
            if existing:
                await FleetController._run_db_write(
                    f"""UPDATE {DB}.jnp_usr_prf SET rol=%s, fl_nm=%s, ph=%s, eml=%s,
                        prf_img=%s, lang=%s WHERE ident=%s""",
                    (
                        data.get("role"),
                        data.get("full_name"),
                        data.get("phone"),
                        data.get("email"),
                        data.get("profile_image_url"),
                        data.get("preferred_language") or "en",
                        identifier,
                    ),
                )
            else:
                await FleetController._run_db_write(
                    f"""INSERT INTO {DB}.jnp_usr_prf
                        (ident, rol, fl_nm, ph, eml, prf_img, lang)
                        VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                    (
                        identifier,
                        data.get("role"),
                        data.get("full_name"),
                        data.get("phone"),
                        data.get("email"),
                        data.get("profile_image_url"),
                        data.get("preferred_language") or "en",
                    ),
                )
            return await FleetController.api_get_user_profile(request, identifier=identifier)
        except Exception as e:
            logger(f"Fleet save user profile error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_fleet_dashboard(request: Request):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            where, params = FleetController._owner_filter_sql(ctx)

            async def _count(table, extra_where=""):
                w = where
                p = params
                if extra_where:
                    w = f"({where}) AND {extra_where}" if where != "1=1" else extra_where
                row = await FleetController._run_db_query(
                    f"SELECT COUNT(*) AS c FROM {DB}.{table} WHERE {w}",
                    p,
                    fetch_all=False,
                )
                return int((row or {}).get("c") or 0)

            total_lorries = await _count("jnp_lry")
            total_drivers = await _count("jnp_drv")
            trip_where = where.replace("crt_by", "t.crt_by")
            running_row = await FleetController._run_db_query(
                f"""SELECT COUNT(*) AS c FROM {DB}.jnp_trp t
                    WHERE ({trip_where}) AND t.sts NOT IN ('Delivered', 'Trip Done')""",
                params,
                fetch_all=False,
            )
            running_trips = int((running_row or {}).get("c") or 0)

            trips = await FleetController._run_db_query(
                f"SELECT id, ld_prc AS load_price FROM {DB}.jnp_trp t WHERE {trip_where}",
                params,
            )
            trip_ids = [t["id"] for t in (trips or [])]
            total_income = sum(float(t.get("load_price") or 0) for t in (trips or []))
            total_expenses = 0.0
            if trip_ids:
                placeholders = ",".join(["%s"] * len(trip_ids))
                exp_rows = await FleetController._run_db_query(
                    f"""SELECT dsl, tol, drv_bata, drv_wg, com_amt, mnt, oth
                        FROM {DB}.jnp_exp WHERE trp_id IN ({placeholders})""",
                    tuple(trip_ids),
                )
                for e in exp_rows or []:
                    total_expenses += _expense_total_row({
                        "diesel": e.get("dsl"), "toll": e.get("tol"),
                        "driver_bata": e.get("drv_bata"), "driver_daily_wage": e.get("drv_wg"),
                        "driver_commission_amount": e.get("com_amt"),
                        "maintenance": e.get("mnt"), "other": e.get("oth"),
                    })

            return _fleet_json({
                "total_lorries": total_lorries,
                "total_drivers": total_drivers,
                "running_trips": running_trips,
                "total_income": _round_money(total_income),
                "total_expenses": _round_money(total_expenses),
                "total_profit": _round_money(total_income - total_expenses),
            })
        except Exception as e:
            logger(f"Fleet dashboard error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_list_drivers(request: Request):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            if ctx["role"] == "driver" and ctx.get("driver_id"):
                row = await FleetController._run_db_query(
                    f"{FleetController._driver_select()} WHERE id = %s",
                    (ctx["driver_id"],),
                    fetch_all=False,
                )
                login_id, has_login = await FleetController._driver_login_info(ctx["driver_id"])
                return _fleet_json([FleetController._map_driver(row, login_id, has_login)] if row else [])
            where, params = FleetController._owner_filter_sql(ctx)
            rows = await FleetController._run_db_query(
                f"{FleetController._driver_select()} WHERE {where} ORDER BY id DESC",
                params,
            )
            result = []
            for row in rows or []:
                login_id, has_login = await FleetController._driver_login_info(row["id"])
                result.append(FleetController._map_driver(row, login_id, has_login))
            return _fleet_json(result)
        except Exception as e:
            logger(f"Fleet list drivers error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_get_my_driver(request: Request):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            if ctx["role"] != "driver" or not ctx.get("driver_id"):
                return _fleet_error("Driver access required", 403)
            row = await FleetController._run_db_query(
                f"{FleetController._driver_select()} WHERE id = %s",
                (ctx["driver_id"],),
                fetch_all=False,
            )
            if not row:
                return _fleet_error("Driver not found", 404)
            login_id, has_login = await FleetController._driver_login_info(ctx["driver_id"])
            return _fleet_json(FleetController._map_driver(row, login_id, has_login))
        except Exception as e:
            logger(f"Fleet get my driver error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_create_driver(request: Request):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            if ctx["role"] not in {"user", "admin"}:
                return _fleet_error("Only fleet owners can create drivers", 403)
            if ctx["role"] == "admin" and not ctx["owner"]:
                return _fleet_error("Select a user before creating drivers", 400)
            data = await get_request_body(request)
            name = (data.get("name") or "").strip()
            phone = (data.get("phone") or "").strip()
            if not name:
                return _fleet_error("Driver name is required", 400)
            if not phone:
                return _fleet_error("Driver phone is required", 400)
            owner = await FleetController._write_owner(viewer, role, scope_user)
            driver_id = await FleetController._run_db_write(
                f"""INSERT INTO {DB}.jnp_drv (nm, ph, lic_no, act, crt_by)
                    VALUES (%s, %s, %s, 1, %s)""",
                (name, phone, data.get("license_number"), owner),
                return_last_id=True,
            )
            login_id = (data.get("login_identifier") or "").strip().lower() or f"driver{driver_id}"
            password = (data.get("password") or "").strip() or f"driver{driver_id}123"
            if len(login_id) < 3:
                return _fleet_error("Driver login ID must be at least 3 characters", 400)
            if await FleetController._run_db_query(
                f"SELECT id FROM {DB}.jnp_usr_acc WHERE ident = %s", (login_id,), fetch_all=False
            ):
                return _fleet_error("Login ID already exists", 400)
            await FleetController._run_db_write(
                f"INSERT INTO {DB}.jnp_usr_acc (ident, pwd, rol, drv_id) VALUES (%s, %s, 'driver', %s)",
                (login_id, password, driver_id),
            )
            await FleetController._run_db_write(
                f"""INSERT INTO {DB}.jnp_usr_prf (ident, rol, fl_nm, ph, lang)
                    VALUES (%s, 'driver', %s, %s, 'en')""",
                (login_id, name, phone),
            )
            row = await FleetController._run_db_query(
                f"{FleetController._driver_select()} WHERE id = %s", (driver_id,), fetch_all=False
            )
            base = FleetController._map_driver(row, login_id, True)
            base["message"] = f"Driver {name} created successfully. Login ID: {login_id}."
            base["initial_password"] = password if not (data.get("password") or "").strip() else None
            base["login_auto_generated"] = not (data.get("login_identifier") or "").strip()
            base["password_auto_generated"] = not (data.get("password") or "").strip()
            return _fleet_json(base, 201)
        except Exception as e:
            logger(f"Fleet create driver error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_update_driver_status(request: Request, driver_id: int):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            where, params = FleetController._owner_filter_sql(ctx)
            row = await FleetController._run_db_query(
                f"{FleetController._driver_select()} WHERE id = %s AND {where}",
                (driver_id,) + params,
                fetch_all=False,
            )
            if not row:
                return _fleet_error("Driver not found", 404)
            is_active = bool((await get_request_body(request)).get("is_active", True))
            await FleetController._run_db_write(f"UPDATE {DB}.jnp_drv SET act = %s WHERE id = %s", (1 if is_active else 0, driver_id))
            if not is_active:
                await FleetController._run_db_write(
                    f"UPDATE {DB}.jnp_drv_asg SET sts = 'Completed', cmp_at = NOW() WHERE drv_id = %s AND sts = 'Active'",
                    (driver_id,),
                )
            row = await FleetController._run_db_query(
                f"{FleetController._driver_select()} WHERE id = %s", (driver_id,), fetch_all=False
            )
            login_id, has_login = await FleetController._driver_login_info(driver_id)
            return _fleet_json(FleetController._map_driver(row, login_id, has_login))
        except Exception as e:
            logger(f"Fleet update driver status error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_delete_driver(request: Request, driver_id: int):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            if ctx["role"] not in {"user", "admin"}:
                return _fleet_error("Only fleet owners can delete drivers", 403)
            where, params = FleetController._owner_filter_sql(ctx)
            row = await FleetController._run_db_query(
                f"SELECT id, nm AS name FROM {DB}.jnp_drv WHERE id = %s AND {where}",
                (driver_id,) + params,
                fetch_all=False,
            )
            if not row:
                return _fleet_error("Driver not found", 404)
            trip_rows = await FleetController._run_db_query(
                    f"SELECT id FROM {DB}.jnp_trp WHERE drv_id = %s", (driver_id,)
                ) or []
            trip_ids = [r["id"] for r in trip_rows]
            if trip_ids:
                ph = ",".join(["%s"] * len(trip_ids))
                await FleetController._run_db_write(f"DELETE FROM {DB}.jnp_exp WHERE trp_id IN ({ph})", tuple(trip_ids))
                await FleetController._run_db_write(f"DELETE FROM {DB}.jnp_trp WHERE id IN ({ph})", tuple(trip_ids))
            asg_rows = await FleetController._run_db_query(
                    f"SELECT id FROM {DB}.jnp_drv_asg WHERE drv_id = %s", (driver_id,)
                ) or []
            asg_ids = [r["id"] for r in asg_rows]
            if asg_ids:
                ph = ",".join(["%s"] * len(asg_ids))
                await FleetController._run_db_write(f"DELETE FROM {DB}.jnp_drv_lv WHERE asg_id IN ({ph})", tuple(asg_ids))
                await FleetController._run_db_write(f"DELETE FROM {DB}.jnp_drv_asg WHERE id IN ({ph})", tuple(asg_ids))
            await FleetController._run_db_write(f"UPDATE {DB}.jnp_lry SET drv_id = NULL WHERE drv_id = %s", (driver_id,))
            await FleetController._run_db_write(f"DELETE FROM {DB}.jnp_notf WHERE drv_id = %s", (driver_id,))
            acc = await FleetController._run_db_query(
                f"SELECT ident FROM {DB}.jnp_usr_acc WHERE drv_id = %s AND rol = 'driver'",
                (driver_id,), fetch_all=False,
            )
            if acc:
                await FleetController._run_db_write(f"DELETE FROM {DB}.jnp_usr_prf WHERE ident = %s", (acc["ident"],))
                await FleetController._run_db_write(f"DELETE FROM {DB}.jnp_usr_acc WHERE ident = %s", (acc["ident"],))
            await FleetController._run_db_write(f"DELETE FROM {DB}.jnp_drv WHERE id = %s", (driver_id,))
            return _fleet_json({"ok": True, "message": f"Driver {row['name']} deleted successfully."})
        except Exception as e:
            logger(f"Fleet delete driver error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_driver_history(request: Request, driver_id: int):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            where, params = FleetController._owner_filter_sql(ctx)
            driver = await FleetController._run_db_query(
                f"{FleetController._driver_select()} WHERE id = %s AND {where}",
                (driver_id,) + params,
                fetch_all=False,
            )
            if not driver:
                return _fleet_error("Driver not found", 404)
            trips = await FleetController._run_db_query(
                f"""{FleetController._trip_select()} WHERE drv_id = %s ORDER BY id DESC""",
                (driver_id,),
            )
            history_items = []
            totals = defaultdict(float)
            for trip in trips or []:
                total_exp, company_net = await FleetController._trip_totals(trip["id"])
                expenses = await FleetController._run_db_query(
                    f"{FleetController._expense_select()} WHERE trp_id = %s", (trip["id"],)
                ) or []
                commission_amount = sum(float(e.get("driver_commission_amount") or 0) for e in expenses)
                bata_amount = sum(float(e.get("driver_bata") or 0) for e in expenses)
                wage_amount = sum(float(e.get("driver_daily_wage") or 0) for e in expenses)
                driver_earned = _round_money(bata_amount + wage_amount + commission_amount)
                lorry = await FleetController._run_db_query(
                    f"SELECT veh_no FROM {DB}.jnp_lry WHERE id = %s",
                    (trip["lorry_id"],), fetch_all=False,
                )
                wd = _trip_working_days(trip)
                totals["working_days"] += wd
                totals["transport"] += float(trip.get("load_price") or 0)
                totals["commission"] += commission_amount
                totals["driver_earning"] += driver_earned
                totals["company_net"] += company_net
                history_items.append(_serialize_fleet_row({
                    "trip_id": trip["id"],
                    "lorry_id": trip["lorry_id"],
                    "lorry_number": (lorry or {}).get("veh_no"),
                    "route": f"{trip['load_location']} -> {trip['unload_location']}",
                    "status": trip["status"],
                    "working_days": wd,
                    "transport_amount": float(trip.get("load_price") or 0),
                    "commission_amount": commission_amount,
                    "commission_eligible": commission_amount > 0,
                    "trip_total_earning": driver_earned,
                    "load_price": float(trip.get("load_price") or 0),
                    "trip_expenses": total_exp,
                    "driver_earned": driver_earned,
                    "company_net": company_net,
                    "completed_at": trip.get("completed_at"),
                }))
            assignments = await FleetController._run_db_query(
                f"""SELECT id, lry_id AS lorry_id, drv_id AS driver_id, asg_at AS assigned_at,
                           cmp_at AS completed_at, dy_wg AS daily_wage, com_pct AS commission_percent,
                           nts AS notes, sts AS status, drv_acc AS driver_accepted,
                           drv_acc_at AS driver_accepted_at, crt_by AS created_by
                    FROM {DB}.jnp_drv_asg WHERE drv_id = %s ORDER BY asg_at DESC""",
                (driver_id,),
            )
            assignment_items = []
            for a in assignments or []:
                assignment_items.append(await FleetController._serialize_assignment(a))
            return _fleet_json(_serialize_fleet_row({
                "driver_id": driver["id"],
                "driver_name": driver["name"],
                "is_active": bool(driver.get("is_active", 1)),
                "total_trips": len(trips or []),
                "total_working_days": int(totals["working_days"]),
                "total_transport_amount": totals["transport"],
                "total_commission_amount": totals["commission"],
                "total_driver_earning": totals["driver_earning"],
                "total_company_net": totals["company_net"],
                "total_assignment_wage": sum(a.get("wage_amount", 0) for a in assignment_items),
                "total_assignment_commission": sum(a.get("commission_amount", 0) for a in assignment_items),
                "total_assignment_earning": sum(a.get("total_earning", 0) for a in assignment_items),
                "commission_transport_threshold": COMMISSION_TRANSPORT_THRESHOLD,
                "assignments": assignment_items,
                "trips": history_items,
            }))
        except Exception as e:
            logger(f"Fleet driver history error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_list_lorries(request: Request):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            where, params = FleetController._owner_filter_sql(ctx)
            rows = await FleetController._run_db_query(
                f"{FleetController._lorry_select()} WHERE {where} ORDER BY id DESC", params
            )
            return _fleet_json(_serialize_fleet_rows(rows))
        except Exception as e:
            logger(f"Fleet list lorries error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_create_lorry(request: Request):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            if ctx["role"] not in {"user", "admin"}:
                return _fleet_error("Only fleet owners can add lorries", 403)
            data = await get_request_body(request)
            vehicle_number = (data.get("vehicle_number") or "").strip()
            if not vehicle_number:
                return _fleet_error("Vehicle number is required", 400)
            owner = await FleetController._write_owner(viewer, role, scope_user)
            where, params = FleetController._owner_filter_sql(
                await FleetController._build_auth_context(viewer, role, scope_user)
            )
            if await FleetController._run_db_query(
                f"SELECT id FROM {DB}.jnp_lry WHERE veh_no = %s AND {where}",
                (vehicle_number,) + params,
                fetch_all=False,
            ):
                return _fleet_error("Vehicle number already exists in your fleet", 400)
            lorry_id = await FleetController._run_db_write(
                f"""INSERT INTO {DB}.jnp_lry (veh_no, loc, drv_id, act, crt_by)
                    VALUES (%s, %s, %s, 1, %s)""",
                (vehicle_number, data.get("current_location"), data.get("driver_id"), owner),
                return_last_id=True,
            )
            row = await FleetController._run_db_query(
                f"{FleetController._lorry_select()} WHERE id = %s", (lorry_id,), fetch_all=False
            )
            return _fleet_json(_serialize_fleet_row(row), 201)
        except Exception as e:
            logger(f"Fleet create lorry error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_update_lorry_status(request: Request, lorry_id: int):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            where, params = FleetController._owner_filter_sql(ctx)
            row = await FleetController._run_db_query(
                f"{FleetController._lorry_select()} WHERE id = %s AND {where}",
                (lorry_id,) + params,
                fetch_all=False,
            )
            if not row:
                return _fleet_error("Lorry not found", 404)
            is_active = bool((await get_request_body(request)).get("is_active", True))
            await FleetController._run_db_write(f"UPDATE {DB}.jnp_lry SET act = %s WHERE id = %s", (1 if is_active else 0, lorry_id))
            row = await FleetController._run_db_query(
                f"{FleetController._lorry_select()} WHERE id = %s", (lorry_id,), fetch_all=False
            )
            return _fleet_json(_serialize_fleet_row(row))
        except Exception as e:
            logger(f"Fleet update lorry status error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_delete_lorry(request: Request, lorry_id: int):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            if ctx["role"] not in {"user", "admin"}:
                return _fleet_error("Only fleet owners can delete lorries", 403)
            where, params = FleetController._owner_filter_sql(ctx)
            row = await FleetController._run_db_query(
                f"SELECT id, veh_no AS vehicle_number FROM {DB}.jnp_lry WHERE id = %s AND {where}",
                (lorry_id,) + params,
                fetch_all=False,
            )
            if not row:
                return _fleet_error("Lorry not found", 404)
            active = await FleetController._run_db_query(
                f"""SELECT id FROM {DB}.jnp_trp
                    WHERE lry_id = %s AND sts NOT IN ('Delivered', 'Trip Done') LIMIT 1""",
                (lorry_id,), fetch_all=False,
            )
            if active:
                return _fleet_error(
                    "Cannot delete lorry with an active trip. Complete or reassign the trip first.", 400
                )
            trip_rows = await FleetController._run_db_query(
                f"SELECT id FROM {DB}.jnp_trp WHERE lry_id = %s", (lorry_id,)
            ) or []
            trip_ids = [r["id"] for r in trip_rows]
            if trip_ids:
                ph = ",".join(["%s"] * len(trip_ids))
                await FleetController._run_db_write(f"DELETE FROM {DB}.jnp_exp WHERE trp_id IN ({ph})", tuple(trip_ids))
                await FleetController._run_db_write(f"DELETE FROM {DB}.jnp_trp WHERE id IN ({ph})", tuple(trip_ids))
            asg_rows = await FleetController._run_db_query(
                f"SELECT id FROM {DB}.jnp_drv_asg WHERE lry_id = %s", (lorry_id,)
            ) or []
            asg_ids = [r["id"] for r in asg_rows]
            if asg_ids:
                ph = ",".join(["%s"] * len(asg_ids))
                await FleetController._run_db_write(f"DELETE FROM {DB}.jnp_drv_lv WHERE asg_id IN ({ph})", tuple(asg_ids))
                await FleetController._run_db_write(f"DELETE FROM {DB}.jnp_drv_asg WHERE id IN ({ph})", tuple(asg_ids))
            await FleetController._run_db_write(f"DELETE FROM {DB}.jnp_lry WHERE id = %s", (lorry_id,))
            return _fleet_json({"ok": True, "message": f"Lorry {row['vehicle_number']} deleted successfully."})
        except Exception as e:
            logger(f"Fleet delete lorry error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_lorry_history(request: Request, lorry_id: int):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            where, params = FleetController._owner_filter_sql(ctx)
            lorry = await FleetController._run_db_query(
                f"{FleetController._lorry_select()} WHERE id = %s AND {where}",
                (lorry_id,) + params,
                fetch_all=False,
            )
            if not lorry:
                return _fleet_error("Lorry not found", 404)
            trips = await FleetController._run_db_query(
                f"{FleetController._trip_select()} WHERE lorry_id = %s ORDER BY id DESC", (lorry_id,)
            )
            history_items = []
            total_income = total_expenses = total_profit = 0.0
            for trip in trips or []:
                trip_exp, lorry_profit = await FleetController._trip_totals(trip["id"])
                total_income += float(trip.get("load_price") or 0)
                total_expenses += trip_exp
                total_profit += lorry_profit
                driver = await FleetController._run_db_query(
                    f"SELECT nm FROM {DB}.jnp_drv WHERE id = %s", (trip["driver_id"],), fetch_all=False
                )
                history_items.append(_serialize_fleet_row({
                    "trip_id": trip["id"],
                    "driver_id": trip["driver_id"],
                    "driver_name": (driver or {}).get("nm"),
                    "route": f"{trip['load_location']} -> {trip['unload_location']}",
                    "status": trip["status"],
                    "load_price": float(trip.get("load_price") or 0),
                    "trip_expenses": trip_exp,
                    "lorry_profit": lorry_profit,
                    "completed_at": trip.get("completed_at"),
                }))
            return _fleet_json(_serialize_fleet_row({
                "lorry_id": lorry["id"],
                "vehicle_number": lorry["vehicle_number"],
                "is_active": bool(lorry.get("is_active", 1)),
                "total_trips": len(trips or []),
                "total_income": total_income,
                "total_expenses": total_expenses,
                "total_profit": total_profit,
                "trips": history_items,
            }))
        except Exception as e:
            logger(f"Fleet lorry history error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_list_trips(request: Request):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            if ctx["role"] == "driver" and ctx.get("driver_id"):
                rows = await FleetController._run_db_query(
                    f"{FleetController._trip_select()} WHERE drv_id = %s ORDER BY id DESC",
                    (ctx["driver_id"],),
                )
            else:
                where, params = FleetController._owner_filter_sql(ctx)
                rows = await FleetController._run_db_query(
                    f"{FleetController._trip_select()} WHERE {where} ORDER BY id DESC", params
                )
            serialized = []
            for r in rows or []:
                serialized.append(await FleetController._serialize_trip(r))
            return _fleet_json(serialized)
        except Exception as e:
            logger(f"Fleet list trips error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_create_trip(request: Request):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            data = await get_request_body(request)
            if ctx["role"] == "driver":
                if not ctx.get("driver_id"):
                    return _fleet_error("Driver account is not linked", 403)
                data["driver_id"] = ctx["driver_id"]
            lorry_id = data.get("lorry_id")
            driver_id = data.get("driver_id")
            status = data.get("status") or "Loading"
            completed_at = datetime.utcnow() if status in {"Delivered", "Trip Done"} else None
            owner = await FleetController._write_owner(viewer, role, scope_user)
            trip_id = await FleetController._run_db_write(
                f"""INSERT INTO {DB}.jnp_trp
                    (lry_id, drv_id, ld_typ, ld_wt, ld_loc, uld_loc, cp_nm, cp_ph,
                     ld_dt, uld_dt, cmp_at, dist_km, ld_prc, sts, crt_by)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (
                    lorry_id, driver_id, data.get("load_type"), data.get("load_weight"),
                    data.get("load_location"), data.get("unload_location"),
                    data.get("contact_person_name"), data.get("contact_person_phone"),
                    data.get("loading_date"), data.get("unloading_date"), completed_at,
                    data.get("distance_km"), data.get("load_price", 0), status, owner,
                ),
                return_last_id=True,
            )
            row = await FleetController._run_db_query(
                f"{FleetController._trip_select()} WHERE id = %s", (trip_id,), fetch_all=False
            )
            return _fleet_json(await FleetController._serialize_trip(row), 201)
        except Exception as e:
            logger(f"Fleet create trip error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_update_trip_status(request: Request, trip_id: int):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            if ctx["role"] == "driver" and ctx.get("driver_id"):
                row = await FleetController._run_db_query(
                    f"{FleetController._trip_select()} WHERE id = %s AND drv_id = %s",
                    (trip_id, ctx["driver_id"]),
                    fetch_all=False,
                )
            else:
                where, params = FleetController._owner_filter_sql(ctx)
                row = await FleetController._run_db_query(
                    f"{FleetController._trip_select()} WHERE id = %s AND {where}",
                    (trip_id,) + params,
                    fetch_all=False,
                )
            if not row:
                return _fleet_error("Trip not found", 404)
            data = await get_request_body(request)
            updates = []
            params_list = []
            if "status" in data and data["status"] is not None:
                updates.append("sts = %s")
                params_list.append(data["status"])
                if data["status"] in {"Delivered", "Trip Done"}:
                    updates.append("cmp_at = NOW()")
                else:
                    updates.append("cmp_at = NULL")
            if "loading_date" in data:
                updates.append("ld_dt = %s")
                params_list.append(data["loading_date"])
            if "unloading_date" in data:
                updates.append("uld_dt = %s")
                params_list.append(data["unloading_date"])
            expense_block = data.get("expense")
            if updates:
                params_list.append(trip_id)
                await FleetController._run_db_write(
                    f"UPDATE {DB}.jnp_trp SET {', '.join(updates)} WHERE id = %s",
                    tuple(params_list),
                )
            if expense_block:
                await FleetController._upsert_trip_expense(trip_id, expense_block, viewer, role, scope_user)
            if not updates and not expense_block:
                return _fleet_error("No trip fields to update", 400)
            row = await FleetController._run_db_query(
                f"{FleetController._trip_select()} WHERE id = %s", (trip_id,), fetch_all=False
            )
            return _fleet_json(await FleetController._serialize_trip(row))
        except Exception as e:
            logger(f"Fleet update trip status error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def _upsert_trip_expense(trip_id, expense_block, viewer, role, scope_user):
        existing = await FleetController._run_db_query(
            f"SELECT id FROM {DB}.jnp_exp WHERE trp_id = %s ORDER BY id ASC LIMIT 1",
            (trip_id,), fetch_all=False,
        )
        owner = await FleetController._write_owner(viewer, role, scope_user)
        fields = {
            "dsl": expense_block.get("diesel"),
            "tol": expense_block.get("toll"),
            "drv_bata": expense_block.get("driver_bata"),
            "drv_wg": expense_block.get("driver_daily_wage"),
            "com_pct": expense_block.get("driver_commission_percent"),
            "com_amt": expense_block.get("driver_commission_amount"),
            "mnt": expense_block.get("maintenance"),
            "oth": expense_block.get("other"),
        }
        set_parts = []
        vals = []
        for col, val in fields.items():
            if val is not None:
                set_parts.append(f"{col} = %s")
                vals.append(_round_money(val))
        if not set_parts:
            return
        if existing:
            vals.append(existing["id"])
            await FleetController._run_db_write(f"UPDATE {DB}.jnp_exp SET {', '.join(set_parts)} WHERE id = %s", tuple(vals))
        else:
            cols = ["trp_id", "crt_by"] + [p.split(" = ")[0] for p in set_parts]
            vals_insert = [trip_id, owner] + vals
            await FleetController._run_db_write(
                f"INSERT INTO {DB}.jnp_exp ({', '.join(cols)}) VALUES ({', '.join(['%s'] * len(cols))})",
                tuple(vals_insert),
            )

    @staticmethod
    async def api_list_expenses(request: Request):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            if ctx["role"] == "driver" and ctx.get("driver_id"):
                rows = await FleetController._run_db_query(
                    f"""{FleetController._expense_select()} e
                        INNER JOIN {DB}.jnp_trp t ON t.id = e.trp_id
                        WHERE t.drv_id = %s ORDER BY e.id DESC""",
                    (ctx["driver_id"],),
                )
            else:
                where, params = FleetController._owner_filter_sql(ctx, "e")
                rows = await FleetController._run_db_query(
                    f"{FleetController._expense_select()} e WHERE {where} ORDER BY e.id DESC", params
                )
            return _fleet_json([FleetController._serialize_expense(r) for r in (rows or [])])
        except Exception as e:
            logger(f"Fleet list expenses error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_create_expense(request: Request):
        try:
            viewer, role, scope_user = get_auth_params(request)
            data = await get_request_body(request)
            trip_id = data.get("trip_id")
            trip = await FleetController._run_db_query(
                f"{FleetController._trip_select()} WHERE id = %s", (trip_id,), fetch_all=False
            )
            if not trip:
                return _fleet_error("Trip not found", 404)
            owner = await FleetController._write_owner(viewer, role, scope_user)
            proof_json = json.dumps(data.get("proof_images") or [])
            expense_id = await FleetController._run_db_write(
                f"""INSERT INTO {DB}.jnp_exp
                    (trp_id, dsl, tol, drv_bata, drv_wg, com_pct, com_amt, mnt, oth, prf_img, nts, crt_by)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (
                    trip_id,
                    data.get("diesel", 0), data.get("toll", 0),
                    data.get("driver_bata", 0), data.get("driver_daily_wage", 0),
                    data.get("driver_commission_percent", 0), data.get("driver_commission_amount", 0),
                    data.get("maintenance", 0), data.get("other", 0),
                    proof_json, data.get("notes"), owner,
                ),
                return_last_id=True,
            )
            row = await FleetController._run_db_query(
                f"{FleetController._expense_select()} WHERE id = %s", (expense_id,), fetch_all=False
            )
            return _fleet_json(FleetController._serialize_expense(row), 201)
        except Exception as e:
            logger(f"Fleet create expense error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def _serialize_assignment(assignment):
        if not assignment:
            return None
        asg_id = assignment["id"]
        leaves = await FleetController._run_db_query(
            f"""SELECT id, asg_id AS assignment_id, lv_st AS leave_start, lv_ed AS leave_end,
                       rsn AS reason, crt_by AS created_by
                FROM {DB}.jnp_drv_lv WHERE asg_id = %s ORDER BY lv_st""",
            (asg_id,),
        )
        trips = await FleetController._run_db_query(
            f"""{FleetController._trip_select()}
                WHERE drv_id = %s AND lry_id = %s ORDER BY ld_dt DESC, id DESC""",
            (assignment["driver_id"], assignment["lorry_id"]),
        )
        total_transport = sum(float(t.get("load_price") or 0) for t in (trips or []))
        commission_pct = float(assignment.get("commission_percent") or 0)
        commission_eligible = total_transport >= COMMISSION_TRANSPORT_THRESHOLD
        commission_amount = (
            _round_money(total_transport * commission_pct / 100) if commission_eligible else 0.0
        )
        assigned_at = assignment.get("assigned_at")
        completed_at = assignment.get("completed_at")
        total_days = 0
        if assigned_at:
            end = completed_at or datetime.utcnow()
            if hasattr(assigned_at, "date"):
                start_d = assigned_at.date() if hasattr(assigned_at, "date") else assigned_at
            else:
                start_d = date.fromisoformat(str(assigned_at)[:10])
            end_d = end.date() if hasattr(end, "date") else date.fromisoformat(str(end)[:10])
            total_days = max((end_d - start_d).days + 1, 0)
        leave_days = 0
        for lv in leaves or []:
            ls = lv.get("leave_start")
            le = lv.get("leave_end")
            if ls and le:
                if isinstance(ls, str):
                    ls = date.fromisoformat(str(ls)[:10])
                if isinstance(le, str):
                    le = date.fromisoformat(str(le)[:10])
                leave_days += max((le - ls).days + 1, 0)
        working_days = max(total_days - leave_days, 0)
        daily_wage = float(assignment.get("daily_wage") or 0)
        wage_amount = _round_money(working_days * daily_wage)
        accepted = bool(assignment.get("driver_accepted"))
        return _serialize_fleet_row({
            "id": asg_id,
            "lorry_id": assignment["lorry_id"],
            "driver_id": assignment["driver_id"],
            "assigned_at": assignment.get("assigned_at"),
            "completed_at": assignment.get("completed_at"),
            "daily_wage": daily_wage,
            "commission_percent": commission_pct,
            "rates_locked": True,
            "notes": assignment.get("notes"),
            "status": assignment.get("status"),
            "total_days": total_days,
            "leave_days": leave_days,
            "working_days": working_days,
            "total_transport_amount": total_transport if accepted else 0,
            "wage_amount": wage_amount if accepted else 0,
            "commission_amount": commission_amount if accepted else 0,
            "total_earning": (wage_amount + commission_amount) if accepted else 0,
            "commission_transport_threshold": COMMISSION_TRANSPORT_THRESHOLD,
            "commission_eligible": commission_eligible if accepted else False,
            "gap_days_before": 0,
            "is_current_stint": assignment.get("status") == "Active",
            "driver_accepted": accepted,
            "driver_accepted_at": assignment.get("driver_accepted_at"),
            "earnings_visible": accepted,
            "trips": [] if not accepted else [
                _serialize_fleet_row({
                    "trip_id": t["id"],
                    "route": f"{t['load_location']} -> {t['unload_location']}",
                    "load_price": float(t.get("load_price") or 0),
                    "working_days": _trip_working_days(t),
                    "commission_percent": commission_pct,
                    "commission_amount": 0,
                    "commission_eligible": commission_eligible,
                    "loading_date": t.get("loading_date"),
                    "unloading_date": t.get("unloading_date"),
                    "status": t.get("status"),
                })
                for t in (trips or [])
            ],
            "leaves": _serialize_fleet_rows(leaves),
            "created_by": assignment.get("created_by"),
        })

    @staticmethod
    async def api_list_driver_assignments(request: Request):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            if ctx["role"] == "driver" and ctx.get("driver_id"):
                rows = await FleetController._run_db_query(
                    f"""SELECT id, lry_id AS lorry_id, drv_id AS driver_id, asg_at AS assigned_at,
                               cmp_at AS completed_at, dy_wg AS daily_wage, com_pct AS commission_percent,
                               nts AS notes, sts AS status, drv_acc AS driver_accepted,
                               drv_acc_at AS driver_accepted_at, crt_by AS created_by
                        FROM {DB}.jnp_drv_asg WHERE drv_id = %s ORDER BY asg_at DESC""",
                    (ctx["driver_id"],),
                )
            else:
                where, params = FleetController._owner_filter_sql(ctx)
                rows = await FleetController._run_db_query(
                    f"""SELECT id, lry_id AS lorry_id, drv_id AS driver_id, asg_at AS assigned_at,
                               cmp_at AS completed_at, dy_wg AS daily_wage, com_pct AS commission_percent,
                               nts AS notes, sts AS status, drv_acc AS driver_accepted,
                               drv_acc_at AS driver_accepted_at, crt_by AS created_by
                        FROM {DB}.jnp_drv_asg WHERE {where} ORDER BY asg_at DESC""",
                    params,
                )
            serialized = []
            for r in rows or []:
                serialized.append(await FleetController._serialize_assignment(r))
            return _fleet_json(serialized)
        except Exception as e:
            logger(f"Fleet list driver assignments error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_create_driver_assignment(request: Request):
        try:
            viewer, role, scope_user = get_auth_params(request)
            data = await get_request_body(request)
            lorry_id = data.get("lorry_id")
            driver_id = data.get("driver_id")
            assignment_time = data.get("assigned_at") or datetime.utcnow()
            owner = await FleetController._write_owner(viewer, role, scope_user)
            existing = await FleetController._run_db_query(
                f"SELECT id, drv_id FROM {DB}.jnp_drv_asg WHERE lry_id = %s AND sts = 'Active' LIMIT 1",
                (lorry_id,), fetch_all=False,
            )
            if existing:
                await FleetController._run_db_write(
                    f"UPDATE {DB}.jnp_drv_asg SET sts = 'Completed', cmp_at = %s WHERE id = %s",
                    (assignment_time, existing["id"]),
                )
                await FleetController._run_db_write(
                    f"UPDATE {DB}.jnp_lry SET drv_id = NULL WHERE id = %s AND drv_id = %s",
                    (lorry_id, existing["drv_id"]),
                )
            await FleetController._run_db_write(
                f"UPDATE {DB}.jnp_drv_asg SET sts = 'Completed', cmp_at = %s WHERE drv_id = %s AND sts = 'Active'",
                (assignment_time, driver_id),
            )
            asg_id = await FleetController._run_db_write(
                f"""INSERT INTO {DB}.jnp_drv_asg
                    (lry_id, drv_id, asg_at, dy_wg, com_pct, nts, sts, drv_acc, crt_by)
                    VALUES (%s,%s,%s,%s,%s,%s,'Active',0,%s)""",
                (
                    lorry_id, driver_id, assignment_time,
                    data.get("daily_wage", 0), data.get("commission_percent", 6),
                    data.get("notes"), owner,
                ),
                return_last_id=True,
            )
            await FleetController._run_db_write(f"UPDATE {DB}.jnp_lry SET drv_id = %s WHERE id = %s", (driver_id, lorry_id))
            row = await FleetController._run_db_query(
                f"""SELECT id, lry_id AS lorry_id, drv_id AS driver_id, asg_at AS assigned_at,
                           cmp_at AS completed_at, dy_wg AS daily_wage, com_pct AS commission_percent,
                           nts AS notes, sts AS status, drv_acc AS driver_accepted,
                           drv_acc_at AS driver_accepted_at, crt_by AS created_by
                    FROM {DB}.jnp_drv_asg WHERE id = %s""",
                (asg_id,), fetch_all=False,
            )
            return _fleet_json(await FleetController._serialize_assignment(row), 201)
        except Exception as e:
            logger(f"Fleet create driver assignment error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_accept_driver_assignment(request: Request, assignment_id: int):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            if ctx["role"] != "driver" or not ctx.get("driver_id"):
                return _fleet_error("Only the assigned driver can accept", 403)
            row = await FleetController._run_db_query(
                f"""SELECT id, drv_id AS driver_id, sts AS status, drv_acc AS driver_accepted
                    FROM {DB}.jnp_drv_asg WHERE id = %s""",
                (assignment_id,), fetch_all=False,
            )
            if not row:
                return _fleet_error("Assignment not found", 404)
            if row["driver_id"] != ctx["driver_id"]:
                return _fleet_error("This assignment is not yours", 403)
            if row["status"] != "Active":
                return _fleet_error("Only active assignments can be accepted", 400)
            if not row.get("driver_accepted"):
                await FleetController._run_db_write(
                    f"UPDATE {DB}.jnp_drv_asg SET drv_acc = 1, drv_acc_at = NOW() WHERE id = %s",
                    (assignment_id,),
                )
            return await FleetController.api_get_driver_assignment(assignment_id)
        except Exception as e:
            logger(f"Fleet accept assignment error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_get_driver_assignment(assignment_id):
        row = await FleetController._run_db_query(
            f"""SELECT id, lry_id AS lorry_id, drv_id AS driver_id, asg_at AS assigned_at,
                       cmp_at AS completed_at, dy_wg AS daily_wage, com_pct AS commission_percent,
                       nts AS notes, sts AS status, drv_acc AS driver_accepted,
                       drv_acc_at AS driver_accepted_at, crt_by AS created_by
                FROM {DB}.jnp_drv_asg WHERE id = %s""",
            (assignment_id,), fetch_all=False,
        )
        if not row:
            return _fleet_error("Assignment not found", 404)
        return _fleet_json(await FleetController._serialize_assignment(row))

    @staticmethod
    async def api_complete_driver_assignment(request: Request, assignment_id: int):
        try:
            data = await get_request_body(request)
            completed_at = data.get("completed_at") or datetime.utcnow()
            row = await FleetController._run_db_query(
                f"SELECT id, lry_id, drv_id FROM {DB}.jnp_drv_asg WHERE id = %s",
                (assignment_id,), fetch_all=False,
            )
            if not row:
                return _fleet_error("Assignment not found", 404)
            await FleetController._run_db_write(
                f"UPDATE {DB}.jnp_drv_asg SET sts = 'Completed', cmp_at = %s WHERE id = %s",
                (completed_at, assignment_id),
            )
            await FleetController._run_db_write(
                f"UPDATE {DB}.jnp_lry SET drv_id = NULL WHERE id = %s AND drv_id = %s",
                (row["lry_id"], row["drv_id"]),
            )
            return await FleetController.api_get_driver_assignment(assignment_id)
        except Exception as e:
            logger(f"Fleet complete assignment error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_add_driver_assignment_leave(request: Request, assignment_id: int):
        try:
            viewer, role, scope_user = get_auth_params(request)
            data = await get_request_body(request)
            row = await FleetController._run_db_query(
                f"SELECT id FROM {DB}.jnp_drv_asg WHERE id = %s", (assignment_id,), fetch_all=False
            )
            if not row:
                return _fleet_error("Assignment not found", 404)
            leave_start = data.get("leave_start")
            leave_end = data.get("leave_end")
            if leave_end < leave_start:
                return _fleet_error("Leave end date must be on or after leave start date", 400)
            owner = await FleetController._write_owner(viewer, role, scope_user)
            await FleetController._run_db_write(
                f"INSERT INTO {DB}.jnp_drv_lv (asg_id, lv_st, lv_ed, rsn, crt_by) VALUES (%s,%s,%s,%s,%s)",
                (assignment_id, leave_start, leave_end, data.get("reason"), owner),
            )
            return await FleetController.api_get_driver_assignment(assignment_id)
        except Exception as e:
            logger(f"Fleet add assignment leave error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_update_driver_assignment(request: Request, assignment_id: int):
        try:
            data = await get_request_body(request)
            row = await FleetController._run_db_query(
                f"SELECT id FROM {DB}.jnp_drv_asg WHERE id = %s", (assignment_id,), fetch_all=False
            )
            if not row:
                return _fleet_error("Assignment not found", 404)
            updates = []
            params = []
            if data.get("assigned_at") is not None:
                updates.append("asg_at = %s")
                params.append(data["assigned_at"])
            if data.get("notes") is not None:
                updates.append("nts = %s")
                params.append(data["notes"])
            if data.get("driver_id") is not None:
                updates.append("drv_id = %s")
                params.append(data["driver_id"])
            if data.get("lorry_id") is not None:
                updates.append("lry_id = %s")
                params.append(data["lorry_id"])
            if updates:
                params.append(assignment_id)
                await FleetController._run_db_write(
                    f"UPDATE {DB}.jnp_drv_asg SET {', '.join(updates)} WHERE id = %s",
                    tuple(params),
                )
            asg = await FleetController._run_db_query(
                f"SELECT lry_id, drv_id FROM {DB}.jnp_drv_asg WHERE id = %s",
                (assignment_id,), fetch_all=False,
            )
            if asg:
                await FleetController._run_db_write(
                    f"UPDATE {DB}.jnp_lry SET drv_id = %s WHERE id = %s",
                    (asg["drv_id"], asg["lry_id"]),
                )
            return await FleetController.api_get_driver_assignment(assignment_id)
        except Exception as e:
            logger(f"Fleet update assignment error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    def _notification_recipient(ctx):
        role = ctx.get("role")
        if role in {"admin", "user"}:
            owner = (ctx.get("owner") or "").strip()
            return owner.lower() if owner else None
        return None

    @staticmethod
    async def api_list_notifications(request: Request):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            recipient = FleetController._notification_recipient(ctx)
            if not recipient:
                return _fleet_error("Notifications are available to fleet users only", 403)
            rows = await FleetController._run_db_query(
                f"""SELECT n.id, n.rcpt AS recipient, n.drv_id AS driver_id, d.nm AS driver_name,
                           n.evt_typ AS event_type, n.ttl AS title, n.msg AS message,
                           n.rel_typ AS related_type, n.rel_id AS related_id,
                           n.rd AS is_read, n.crt_at AS created_at
                    FROM {DB}.jnp_notf n
                    LEFT JOIN {DB}.jnp_drv d ON d.id = n.drv_id
                    WHERE n.rcpt = %s
                    ORDER BY n.crt_at DESC, n.id DESC LIMIT 100""",
                (recipient,),
            )
            for r in rows or []:
                r["is_read"] = bool(r.get("is_read"))
            return _fleet_json(_serialize_fleet_rows(rows))
        except Exception as e:
            logger(f"Fleet list notifications error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_mark_notification_read(request: Request, notification_id: int):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            recipient = FleetController._notification_recipient(ctx)
            if not recipient:
                return _fleet_error("Notifications are available to fleet users only", 403)
            row = await FleetController._run_db_query(
                f"SELECT id FROM {DB}.jnp_notf WHERE id = %s AND rcpt = %s",
                (notification_id, recipient),
                fetch_all=False,
            )
            if not row:
                return _fleet_error("Notification not found", 404)
            await FleetController._run_db_write(
                f"UPDATE {DB}.jnp_notf SET rd = 1 WHERE id = %s",
                (notification_id,),
            )
            item = await FleetController._run_db_query(
                f"""SELECT n.id, n.rcpt AS recipient, n.drv_id AS driver_id, d.nm AS driver_name,
                           n.evt_typ AS event_type, n.ttl AS title, n.msg AS message,
                           n.rel_typ AS related_type, n.rel_id AS related_id,
                           n.rd AS is_read, n.crt_at AS created_at
                    FROM {DB}.jnp_notf n LEFT JOIN {DB}.jnp_drv d ON d.id = n.drv_id
                    WHERE n.id = %s""",
                (notification_id,),
                fetch_all=False,
            )
            if item:
                item["is_read"] = bool(item.get("is_read"))
            return _fleet_json(_serialize_fleet_row(item))
        except Exception as e:
            logger(f"Fleet mark notification read error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_mark_all_notifications_read(request: Request):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            recipient = FleetController._notification_recipient(ctx)
            if not recipient:
                return _fleet_error("Notifications are available to fleet users only", 403)
            await FleetController._run_db_write(
                f"UPDATE {DB}.jnp_notf SET rd = 1 WHERE rcpt = %s AND rd = 0",
                (recipient,),
            )
            return _fleet_json({"ok": True})
        except Exception as e:
            logger(f"Fleet mark all notifications read error: {e}")
            return _fleet_error(str(e), 500)

    @staticmethod
    async def api_clear_notifications(request: Request):
        try:
            viewer, role, scope_user = get_auth_params(request)
            ctx = await FleetController._build_auth_context(viewer, role, scope_user)
            recipient = FleetController._notification_recipient(ctx)
            if not recipient:
                return _fleet_error("Notifications are available to fleet users only", 403)
            deleted = await FleetController._run_db_write(
                f"DELETE FROM {DB}.jnp_notf WHERE rcpt = %s",
                (recipient,),
            )
            return _fleet_json({"ok": True, "deleted": deleted})
        except Exception as e:
            logger(f"Fleet clear notifications error: {e}")
            return _fleet_error(str(e), 500)
