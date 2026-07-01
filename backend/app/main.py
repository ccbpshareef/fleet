from datetime import date, datetime, timedelta
import json
import re
from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine, get_db
from .models import (
    Driver,
    DriverAssignment,
    DriverAssignmentLeave,
    Expense,
    Lorry,
    Notification,
    Trip,
    UserAccount,
    UserProfile,
)
from .schemas import (
    ActiveStatusUpdate,
    DashboardOut,
    DriverAssignmentCreate,
    DriverAssignmentComplete,
    DriverAssignmentLeaveCreate,
    DriverAssignmentLeaveOut,
    DriverAssignmentOut,
    DriverAssignmentTripOut,
    DriverAssignmentUpdate,
    DriverCreate,
    DriverHistoryOut,
    DriverCreateOut,
    DriverOut,
    ExpenseCreate,
    ExpenseOut,
    ForgotPasswordRequest,
    LoginAsUserRequest,
    LoginRequest,
    LoginResponse,
    LorryHistoryOut,
    RegisterUserRequest,
    RegisterUserResponse,
    UserIdCheckResponse,
    LorryCreate,
    LorryOut,
    NotificationOut,
    TripCreate,
    TripOut,
    TripStatusUpdate,
    TripUpdate,
    TripExpenseUpdate,
    UserAccountListItem,
    UserProfileCreate,
    UserProfileOut,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fleet Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def round_money(value) -> float:
    return round(float(value or 0), 2)


def expense_total(expense: Expense) -> float:
    return (
        expense.diesel
        + expense.toll
        + expense.driver_bata
        + expense.driver_daily_wage
        + expense.driver_commission_amount
        + expense.maintenance
        + expense.other
    )


def trip_totals(db: Session, trip: Trip) -> tuple[float, float]:
    expenses = db.query(Expense).filter(Expense.trip_id == trip.id).all()
    total_expenses = sum(expense_total(item) for item in expenses)
    return total_expenses, trip.load_price - total_expenses


def driver_earning_total(db: Session, trip_id: int) -> float:
    expenses = db.query(Expense).filter(Expense.trip_id == trip_id).all()
    return sum(
        (item.driver_bata or 0)
        + (item.driver_daily_wage or 0)
        + (item.driver_commission_amount or 0)
        for item in expenses
    )


def trip_working_days(trip: Trip) -> int:
    if trip.loading_date and trip.unloading_date:
        return max((trip.unloading_date - trip.loading_date).days + 1, 1)
    return 1


def date_range_days(start_day: date, end_day: date) -> set[date]:
    if end_day < start_day:
        return set()
    current = start_day
    values: set[date] = set()
    while current <= end_day:
        values.add(current)
        current += timedelta(days=1)
    return values


def assignment_effective_end(assignment: DriverAssignment) -> datetime:
    return assignment.completed_at or datetime.utcnow()


def assignment_total_days(assignment: DriverAssignment) -> int:
    start_day = assignment.assigned_at.date()
    end_day = assignment_effective_end(assignment).date()
    if end_day < start_day:
        return 0
    return len(date_range_days(start_day, end_day))


def assignment_leave_days(assignment: DriverAssignment) -> int:
    assignment_days = date_range_days(
        assignment.assigned_at.date(),
        assignment_effective_end(assignment).date(),
    )
    leave_days: set[date] = set()
    for leave in assignment.leaves:
        leave_days.update(
            date_range_days(leave.leave_start, leave.leave_end).intersection(assignment_days)
        )
    return len(leave_days)


def assignment_gap_days_before(db: Session, assignment: DriverAssignment) -> int:
    previous = (
        db.query(DriverAssignment)
        .filter(
            DriverAssignment.driver_id == assignment.driver_id,
            DriverAssignment.id != assignment.id,
            DriverAssignment.completed_at.isnot(None),
            DriverAssignment.completed_at <= assignment.assigned_at,
        )
        .order_by(DriverAssignment.completed_at.desc())
        .first()
    )
    if not previous or not previous.completed_at:
        return 0
    gap_start = previous.completed_at.date()
    gap_end = assignment.assigned_at.date()
    if gap_end <= gap_start:
        return 0
    return max((gap_end - gap_start).days - 1, 0)


def current_stint_ids_for_assignments(assignments: list[DriverAssignment]) -> set[int]:
    by_driver: dict[int, list[DriverAssignment]] = {}
    for assignment in assignments:
        by_driver.setdefault(assignment.driver_id, []).append(assignment)
    current_ids: set[int] = set()
    for items in by_driver.values():
        active = next((item for item in items if item.status == "Active"), None)
        if active:
            current_ids.add(active.id)
            continue
        latest = max(items, key=lambda item: item.assigned_at)
        current_ids.add(latest.id)
    return current_ids


def serialize_assignments_list(
    db: Session,
    assignments: list[DriverAssignment],
    viewer_role: str | None = None,
) -> list[DriverAssignmentOut]:
    current_ids = current_stint_ids_for_assignments(assignments)
    return [
        serialize_assignment(
            db,
            assignment,
            viewer_role,
            is_current_stint=assignment.id in current_ids,
            gap_days_before=assignment_gap_days_before(db, assignment),
        )
        for assignment in assignments
    ]


COMMISSION_TRANSPORT_THRESHOLD = 120_000.0


def stint_commission_total(total_transport: float, commission_percent: float) -> float:
    transport = float(total_transport or 0)
    percent = float(commission_percent or 0)
    if transport < COMMISSION_TRANSPORT_THRESHOLD:
        return 0.0
    return round_money(transport * percent / 100)


def trip_commission_allocations(trips: list[Trip], commission_percent: float) -> dict[int, float]:
    ordered = sorted(trips, key=lambda item: (item.loading_date or date.min, item.id))
    total_transport = sum(float(item.load_price or 0) for item in ordered)
    stint_commission = stint_commission_total(total_transport, commission_percent)
    if stint_commission <= 0 or total_transport <= 0:
        return {item.id: 0.0 for item in ordered}
    return {
        item.id: round_money(stint_commission * (float(item.load_price or 0) / total_transport))
        for item in ordered
    }


def assignment_for_trip(db: Session, trip: Trip) -> DriverAssignment | None:
    assignments = (
        db.query(DriverAssignment)
        .filter(DriverAssignment.driver_id == trip.driver_id, DriverAssignment.lorry_id == trip.lorry_id)
        .order_by(DriverAssignment.assigned_at.desc())
        .all()
    )
    for assignment in assignments:
        if trip_matches_assignment_window(trip, assignment):
            return assignment
    return None


def commission_for_trip_in_stint(
    db: Session,
    trip: Trip,
    commission_percent: float | None = None,
) -> float:
    assignment = assignment_for_trip(db, trip)
    if not assignment:
        return 0.0
    percent = float(
        commission_percent if commission_percent is not None else assignment.commission_percent or 0
    )
    stint_trips = assignment_trips_for(db, assignment)
    allocations = trip_commission_allocations(stint_trips, percent)
    return allocations.get(trip.id, 0.0)


def sync_stint_trip_commissions(db: Session, trip: Trip) -> None:
    assignment = assignment_for_trip(db, trip)
    if not assignment:
        return
    stint_trips = assignment_trips_for(db, assignment)
    percent = float(assignment.commission_percent or 0)
    allocations = trip_commission_allocations(stint_trips, percent)
    for stint_trip in stint_trips:
        expenses = db.query(Expense).filter(Expense.trip_id == stint_trip.id).order_by(Expense.id.asc()).all()
        for expense in expenses:
            expense.driver_commission_percent = percent
            expense.driver_commission_amount = allocations.get(stint_trip.id, 0.0)


def reconcile_all_stint_commissions(db: Session) -> None:
    seen_assignment_ids: set[int] = set()
    trips = db.query(Trip).order_by(Trip.id.asc()).all()
    for trip in trips:
        assignment = assignment_for_trip(db, trip)
        if not assignment or assignment.id in seen_assignment_ids:
            continue
        sync_stint_trip_commissions(db, trip)
        seen_assignment_ids.add(assignment.id)
    db.commit()


def trip_matches_assignment_window(trip: Trip, assignment: DriverAssignment) -> bool:
    trip_day = (
        trip.loading_date
        or trip.unloading_date
        or (trip.completed_at.date() if trip.completed_at else None)
    )
    if not trip_day:
        return False
    return assignment.assigned_at.date() <= trip_day <= assignment_effective_end(assignment).date()


def assignment_trips_for(db: Session, assignment: DriverAssignment) -> list[Trip]:
    trips = (
        db.query(Trip)
        .filter(
            Trip.driver_id == assignment.driver_id,
            Trip.lorry_id == assignment.lorry_id,
        )
        .order_by(Trip.loading_date.desc(), Trip.id.desc())
        .all()
    )
    return [trip for trip in trips if trip_matches_assignment_window(trip, assignment)]


def serialize_assignment_trip(
    trip: Trip,
    commission_percent: float,
    commission_amount: float,
    *,
    commission_eligible: bool,
) -> DriverAssignmentTripOut:
    load_price = float(trip.load_price or 0)
    percent = float(commission_percent or 0)
    return DriverAssignmentTripOut(
        trip_id=trip.id,
        route=f"{trip.load_location} -> {trip.unload_location}",
        load_price=load_price,
        working_days=trip_working_days(trip),
        commission_percent=percent,
        commission_amount=commission_amount,
        commission_eligible=commission_eligible,
        loading_date=trip.loading_date,
        unloading_date=trip.unloading_date,
        status=trip.status,
    )


def complete_active_assignments_for_driver(
    db: Session,
    driver_id: int,
    completed_at: datetime,
    *,
    exclude_assignment_id: int | None = None,
) -> None:
    active_assignments = (
        db.query(DriverAssignment)
        .filter(DriverAssignment.driver_id == driver_id, DriverAssignment.status == "Active")
        .all()
    )
    for assignment in active_assignments:
        if exclude_assignment_id and assignment.id == exclude_assignment_id:
            continue
        assignment.status = "Completed"
        assignment.completed_at = completed_at
        lorry = db.query(Lorry).filter(Lorry.id == assignment.lorry_id).first()
        if lorry and lorry.driver_id == assignment.driver_id:
            lorry.driver_id = None


def assignment_transport_total(db: Session, assignment: DriverAssignment) -> float:
    trips = assignment_trips_for(db, assignment)
    return sum(trip.load_price or 0 for trip in trips)


def serialize_assignment(
    db: Session,
    assignment: DriverAssignment,
    viewer_role: str | None = None,
    *,
    is_current_stint: bool = False,
    gap_days_before: int | None = None,
) -> DriverAssignmentOut:
    total_days = assignment_total_days(assignment)
    leave_days = assignment_leave_days(assignment)
    working_days = max(total_days - leave_days, 0)
    assignment_trips = assignment_trips_for(db, assignment)
    commission_percent = float(assignment.commission_percent or 0)
    total_transport_amount = round_money(sum(float(trip.load_price or 0) for trip in assignment_trips))
    commission_eligible = total_transport_amount >= COMMISSION_TRANSPORT_THRESHOLD
    allocations = trip_commission_allocations(assignment_trips, commission_percent)
    trip_items = [
        serialize_assignment_trip(
            trip,
            commission_percent,
            allocations.get(trip.id, 0.0),
            commission_eligible=commission_eligible,
        )
        for trip in assignment_trips
    ]
    commission_amount = stint_commission_total(total_transport_amount, commission_percent)
    wage_amount = round_money(working_days * float(assignment.daily_wage or 0))
    accepted = bool(assignment.driver_accepted)
    earnings_visible = accepted or viewer_role in {"user", "admin"}

    return DriverAssignmentOut(
        id=assignment.id,
        lorry_id=assignment.lorry_id,
        driver_id=assignment.driver_id,
        assigned_at=assignment.assigned_at,
        completed_at=assignment.completed_at,
        daily_wage=float(assignment.daily_wage or 0),
        commission_percent=commission_percent,
        rates_locked=True,
        notes=assignment.notes,
        status=assignment.status,
        total_days=total_days,
        leave_days=leave_days,
        working_days=working_days,
        total_transport_amount=total_transport_amount if earnings_visible else 0,
        wage_amount=wage_amount if earnings_visible else 0,
        commission_amount=commission_amount if earnings_visible else 0,
        total_earning=(wage_amount + commission_amount) if earnings_visible else 0,
        commission_transport_threshold=COMMISSION_TRANSPORT_THRESHOLD,
        commission_eligible=commission_eligible if earnings_visible else False,
        gap_days_before=gap_days_before if gap_days_before is not None else assignment_gap_days_before(db, assignment),
        is_current_stint=is_current_stint,
        driver_accepted=accepted,
        driver_accepted_at=assignment.driver_accepted_at,
        earnings_visible=earnings_visible,
        trips=trip_items if earnings_visible else [],
        leaves=[
            DriverAssignmentLeaveOut.model_validate(leave)
            for leave in sorted(assignment.leaves, key=lambda item: item.leave_start)
        ],
        created_by=assignment.created_by,
    )


def notification_recipient(ctx: dict) -> str | None:
    role = ctx.get("role")
    if role == "admin":
        owner = (ctx.get("owner") or "").strip()
        return owner.lower() if owner else None
    if role == "user":
        owner = (ctx.get("owner") or "").strip()
        return owner.lower() if owner else None
    return None


def create_notification(
    db: Session,
    recipient: str,
    event_type: str,
    title: str,
    message: str,
    *,
    driver_id: int | None = None,
    related_type: str | None = None,
    related_id: int | None = None,
) -> None:
    clean_recipient = (recipient or "").strip().lower()
    if not clean_recipient:
        return
    db.add(
        Notification(
            recipient=clean_recipient,
            driver_id=driver_id,
            event_type=event_type,
            title=title,
            message=message,
            related_type=related_type,
            related_id=related_id,
            is_read=False,
            created_at=datetime.utcnow(),
        )
    )


def notify_driver_owner(
    db: Session,
    driver_id: int,
    event_type: str,
    title: str,
    message: str,
    *,
    related_type: str | None = None,
    related_id: int | None = None,
) -> None:
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver or not driver.created_by:
        return
    create_notification(
        db,
        driver.created_by,
        event_type,
        title,
        message,
        driver_id=driver_id,
        related_type=related_type,
        related_id=related_id,
    )


def serialize_notification(db: Session, item: Notification) -> NotificationOut:
    driver_name = None
    if item.driver_id:
        driver = db.query(Driver).filter(Driver.id == item.driver_id).first()
        driver_name = driver.name if driver else None
    return NotificationOut(
        id=item.id,
        recipient=item.recipient,
        driver_id=item.driver_id,
        driver_name=driver_name,
        event_type=item.event_type,
        title=item.title,
        message=item.message,
        related_type=item.related_type,
        related_id=item.related_id,
        is_read=bool(item.is_read),
        created_at=item.created_at,
    )


def build_auth_context(
    db: Session,
    viewer: str | None,
    role: str | None,
    scope_user: str | None = None,
) -> dict:
    if role == "admin":
        return {"role": "admin", "owner": (scope_user or "").strip(), "driver_id": None}
    if role == "driver":
        account = None
        if viewer:
            account = (
                db.query(UserAccount)
                .filter(UserAccount.identifier == viewer.strip().lower())
                .first()
            )
        driver_id = account.driver_id if account else None
        owner = None
        if driver_id:
            driver = db.query(Driver).filter(Driver.id == driver_id).first()
            owner = driver.created_by if driver else None
        return {"role": "driver", "owner": owner, "driver_id": driver_id}
    return {"role": "user", "owner": viewer, "driver_id": None}


def scoped_query(
    query,
    model,
    db: Session,
    viewer: str | None,
    role: str | None,
    scope_user: str | None = None,
):
    ctx = build_auth_context(db, viewer, role, scope_user)
    if ctx["role"] == "admin":
        if not ctx["owner"]:
            return query.filter(model.id < 0)
        return query.filter(model.created_by == ctx["owner"])
    if ctx["role"] == "driver":
        driver_id = ctx.get("driver_id")
        if not driver_id:
            return query.filter(model.id < 0)
        if model is Trip:
            return query.filter(Trip.driver_id == driver_id)
        if model is Driver:
            return query.filter(Driver.id == driver_id)
        if model is Expense:
            trip_ids = [
                row[0]
                for row in db.query(Trip.id).filter(Trip.driver_id == driver_id).all()
            ]
            if not trip_ids:
                return query.filter(model.id < 0)
            return query.filter(Expense.trip_id.in_(trip_ids))
        if model is Lorry:
            owner = ctx.get("owner")
            if owner:
                return query.filter(Lorry.created_by == owner)
            return query.filter(model.id < 0)
        if model is DriverAssignment:
            return query.filter(DriverAssignment.driver_id == driver_id)
        if model is DriverAssignmentLeave:
            assignment_ids = [
                row[0]
                for row in db.query(DriverAssignment.id).filter(DriverAssignment.driver_id == driver_id).all()
            ]
            if not assignment_ids:
                return query.filter(model.id < 0)
            return query.filter(DriverAssignmentLeave.assignment_id.in_(assignment_ids))
        return query.filter(model.id < 0)
    if ctx["owner"]:
        return query.filter(model.created_by == ctx["owner"])
    return query


def active_viewer(viewer: str | None) -> str:
    return viewer or "admin"


def write_owner(db: Session, viewer: str | None, role: str | None, scope_user: str | None = None) -> str:
    ctx = build_auth_context(db, viewer, role, scope_user)
    if ctx["role"] == "admin":
        return ctx["owner"] or active_viewer(viewer)
    if ctx["role"] == "driver":
        return ctx["owner"] or active_viewer(viewer)
    return active_viewer(viewer)


def driver_account_for(driver_id: int, db: Session) -> UserAccount | None:
    return (
        db.query(UserAccount)
        .filter(UserAccount.driver_id == driver_id, UserAccount.role == "driver")
        .first()
    )


def serialize_driver(driver: Driver, db: Session) -> DriverOut:
    account = driver_account_for(driver.id, db)
    return DriverOut(
        id=driver.id,
        name=driver.name,
        phone=driver.phone,
        license_number=driver.license_number,
        is_active=bool(driver.is_active),
        created_by=driver.created_by,
        login_identifier=account.identifier if account else None,
        has_login=bool(account),
    )


def login_response_for(account: UserAccount, db: Session, acting_as_admin: str | None = None) -> LoginResponse:
    driver_id = account.driver_id
    fleet_owner = None
    if account.role == "driver" and driver_id:
        driver = db.query(Driver).filter(Driver.id == driver_id).first()
        fleet_owner = driver.created_by if driver else None
    return LoginResponse(
        identifier=account.identifier,
        role=account.role,
        driver_id=driver_id,
        fleet_owner=fleet_owner,
        acting_as_admin=acting_as_admin,
    )


def ensure_trip_columns() -> None:
    if engine.dialect.name != "sqlite":
        return
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(trips)")).fetchall()
        existing_columns = {row[1] for row in rows}
        column_defs = {
            "contact_person_name": "TEXT",
            "contact_person_phone": "TEXT",
            "loading_date": "DATE",
            "unloading_date": "DATE",
            "completed_at": "DATETIME",
        }
        for column, ddl in column_defs.items():
            if column not in existing_columns:
                conn.execute(text(f"ALTER TABLE trips ADD COLUMN {column} {ddl}"))


def ensure_expense_columns() -> None:
    if engine.dialect.name != "sqlite":
        return
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(expenses)")).fetchall()
        existing_columns = {row[1] for row in rows}
        column_defs = {
            "driver_daily_wage": "FLOAT DEFAULT 0",
            "driver_commission_percent": "FLOAT DEFAULT 0",
            "driver_commission_amount": "FLOAT DEFAULT 0",
            "proof_images_json": "TEXT",
        }
        for column, ddl in column_defs.items():
            if column not in existing_columns:
                conn.execute(text(f"ALTER TABLE expenses ADD COLUMN {column} {ddl}"))


def expense_proof_images(expense: Expense) -> list[dict]:
    raw_value = getattr(expense, "proof_images_json", None)
    if not raw_value:
        return []
    try:
        parsed = json.loads(raw_value)
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        return []


def serialize_expense(expense: Expense) -> ExpenseOut:
    return ExpenseOut(
        id=expense.id,
        trip_id=expense.trip_id,
        diesel=round_money(expense.diesel),
        toll=round_money(expense.toll),
        driver_bata=round_money(expense.driver_bata),
        driver_daily_wage=round_money(expense.driver_daily_wage),
        driver_commission_percent=round_money(expense.driver_commission_percent),
        driver_commission_amount=round_money(expense.driver_commission_amount),
        maintenance=round_money(expense.maintenance),
        other=round_money(expense.other),
        proof_images=expense_proof_images(expense),
        notes=expense.notes,
        total=expense_total(expense),
        created_by=expense.created_by,
    )


def ensure_created_by_columns() -> None:
    if engine.dialect.name != "sqlite":
        return
    with engine.begin() as conn:
        table_columns = {
            "drivers": "created_by",
            "lorries": "created_by",
            "trips": "created_by",
            "expenses": "created_by",
            "driver_assignments": "created_by",
        }
        for table_name, column in table_columns.items():
            rows = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
            existing_columns = {row[1] for row in rows}
            if column not in existing_columns:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column} TEXT"))


def ensure_active_status_columns() -> None:
    if engine.dialect.name != "sqlite":
        return
    with engine.begin() as conn:
        table_columns = {
            "drivers": ("is_active", "BOOLEAN DEFAULT 1"),
            "lorries": ("is_active", "BOOLEAN DEFAULT 1"),
        }
        for table_name, (column, ddl) in table_columns.items():
            rows = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
            existing_columns = {row[1] for row in rows}
            if column not in existing_columns:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column} {ddl}"))


def ensure_driver_assignment_columns() -> None:
    if engine.dialect.name != "sqlite":
        return
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(driver_assignments)")).fetchall()
        existing_columns = {row[1] for row in rows}
        column_defs = {
            "daily_wage": "FLOAT DEFAULT 0",
            "commission_percent": "FLOAT DEFAULT 0",
            "notes": "TEXT",
            "driver_accepted": "BOOLEAN DEFAULT 0",
            "driver_accepted_at": "DATETIME",
        }
        for column, ddl in column_defs.items():
            if column not in existing_columns:
                conn.execute(text(f"ALTER TABLE driver_assignments ADD COLUMN {column} {ddl}"))
        conn.execute(
            text(
                "UPDATE driver_assignments SET driver_accepted = 1 "
                "WHERE status = 'Completed' AND (driver_accepted IS NULL OR driver_accepted = 0)"
            )
        )


def ensure_notification_table() -> None:
    if engine.dialect.name != "sqlite":
        return
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    recipient TEXT NOT NULL,
                    driver_id INTEGER,
                    event_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    related_type TEXT,
                    related_id INTEGER,
                    is_read BOOLEAN NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notifications_recipient ON notifications (recipient)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notifications_driver_id ON notifications (driver_id)"))


def ensure_user_account_driver_column() -> None:
    if engine.dialect.name != "sqlite":
        return
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(user_accounts)")).fetchall()
        existing_columns = {row[1] for row in rows}
        if "driver_id" not in existing_columns:
            conn.execute(text("ALTER TABLE user_accounts ADD COLUMN driver_id INTEGER"))


def ensure_user_profile_columns() -> None:
    if engine.dialect.name != "sqlite":
        return
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(user_profiles)")).fetchall()
        existing_columns = {row[1] for row in rows}
        if "profile_image_url" not in existing_columns:
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN profile_image_url TEXT"))
        if "preferred_language" not in existing_columns:
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN preferred_language TEXT DEFAULT 'en'"))


def seed_proper_data(db: Session) -> dict:
    has_data = (
        db.query(Driver).first()
        or db.query(Lorry).first()
        or db.query(Trip).first()
        or db.query(Expense).first()
    )
    if has_data:
        return {"seeded": False, "message": "Data already exists. Skipped seed."}

    driver_names = ["Ravi Kumar", "Srinivas Rao", "Kiran Kumar", "Pradeep Reddy", "Anil Yadav"]
    drivers: list[Driver] = []
    for idx, name in enumerate(driver_names, start=1):
        item = Driver(
            name=name,
            phone=f"98490000{idx}",
            license_number=f"TS-HMV-{2400 + idx}",
        )
        db.add(item)
        drivers.append(item)
    db.flush()

    lorry_numbers = [
        "TS09AB1001",
        "TS09AB1002",
        "TS09AB1003",
        "TS09AB1004",
        "TS09AB1005",
    ]
    lorries: list[Lorry] = []
    for idx, vehicle_number in enumerate(lorry_numbers):
        item = Lorry(
            vehicle_number=vehicle_number,
            current_location="Hyderabad",
            driver_id=drivers[idx].id,
        )
        db.add(item)
        lorries.append(item)
    db.flush()

    routes = [
        ("Hyderabad", "Vijayawada"),
        ("Warangal", "Khammam"),
        ("Nellore", "Guntur"),
        ("Nizamabad", "Karimnagar"),
        ("Kurnool", "Anantapur"),
    ]
    statuses = ["Loading", "On route", "Delivered", "On route", "Unloading"]
    load_types = ["Cement Bags", "Rice Bags", "TMT Steel", "Ceramic Tiles", "Fertilizer Sacks"]
    contact_names = ["Raju", "Nagesh", "Basha", "Lokesh", "Murali"]
    contact_phones = ["9701000011", "9701000012", "9701000013", "9701000014", "9701000015"]

    for idx in range(5):
        trip = Trip(
            lorry_id=lorries[idx].id,
            driver_id=drivers[idx].id,
            load_type=load_types[idx],
            load_location=routes[idx][0],
            unload_location=routes[idx][1],
            contact_person_name=contact_names[idx],
            contact_person_phone=contact_phones[idx],
            loading_date=date(2026, 4, 10 + idx),
            unloading_date=date(2026, 4, 11 + idx),
            completed_at=datetime.utcnow() if statuses[idx] == "Delivered" else None,
            load_price=25000 + (idx * 3500),
            status=statuses[idx],
        )
        db.add(trip)
        db.flush()

        expense = Expense(
            trip_id=trip.id,
            diesel=3500 + (idx * 200),
            toll=700 + (idx * 80),
            driver_bata=1200 + (idx * 100),
            driver_daily_wage=800 + (idx * 50),
            driver_commission_percent=6.0,
            driver_commission_amount=((25000 + (idx * 3500)) * 6.0) / 100,
            maintenance=400 + (idx * 60),
            other=250 + (idx * 40),
            notes="Initial seeded expense",
        )
        db.add(expense)

    db.commit()
    return {"seeded": True, "message": "Proper sample data added: 5 lorries, 5 drivers, 5 trips."}


@app.on_event("startup")
def startup_seed():
    ensure_trip_columns()
    ensure_expense_columns()
    ensure_created_by_columns()
    ensure_active_status_columns()
    ensure_driver_assignment_columns()
    ensure_notification_table()
    ensure_user_profile_columns()
    ensure_user_account_driver_column()
    ensure_default_users()
    ensure_demo_driver_logins()
    db = SessionLocal()
    try:
        reconcile_all_stint_commissions(db)
    finally:
        db.close()


def ensure_default_users() -> None:
    db = SessionLocal()
    try:
        defaults = [
            ("admin", "admin123", "admin"),
            ("user1", "user123", "user"),
            ("user2", "user123", "user"),
        ]
        for identifier, password, role in defaults:
            existing = db.query(UserAccount).filter(UserAccount.identifier == identifier).first()
            if not existing:
                db.add(UserAccount(identifier=identifier, password=password, role=role))
        db.commit()
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    identifier = (payload.identifier or "").strip().lower()
    user = db.query(UserAccount).filter(UserAccount.identifier == identifier).first()
    if not user or user.password != payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.role == "driver" and not user.driver_id:
        raise HTTPException(status_code=403, detail="Driver account is not linked")
    return login_response_for(user, db)


@app.post("/auth/login-as-user", response_model=LoginResponse)
def login_as_user(
    payload: LoginAsUserRequest,
    viewer: str | None = None,
    role: str | None = None,
    db: Session = Depends(get_db),
):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    admin = db.query(UserAccount).filter(UserAccount.identifier == (viewer or "").strip().lower()).first()
    if not admin or admin.role != "admin":
        raise HTTPException(status_code=403, detail="Invalid admin session")
    target_id = (payload.target_identifier or "").strip().lower()
    target = db.query(UserAccount).filter(UserAccount.identifier == target_id).first()
    if not target or target.role != "user":
        raise HTTPException(status_code=404, detail="User not found")
    return login_response_for(target, db, acting_as_admin=admin.identifier)


@app.post("/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    identifier = (payload.identifier or "").strip().lower()
    user = db.query(UserAccount).filter(UserAccount.identifier == identifier).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if len(payload.new_password or "") < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters")
    user.password = payload.new_password
    db.commit()
    return {"message": "Password reset successful"}


RESERVED_USER_IDS = {"admin", "user", "driver", "root", "system", "fleet"}


def normalize_user_id(raw: str) -> str:
    value = (raw or "").strip().lower()
    value = re.sub(r"[^a-z0-9_]+", "_", value.replace(" ", "_"))
    value = re.sub(r"_+", "_", value).strip("_")
    return value[:32]


def user_id_taken(identifier: str, db: Session) -> bool:
    return db.query(UserAccount).filter(UserAccount.identifier == identifier).first() is not None


def suggest_user_ids(base: str, db: Session, limit: int = 5) -> List[str]:
    base = normalize_user_id(base) or "user"
    suggestions: List[str] = []
    candidates = [
        f"{base}1",
        f"{base}2",
        f"{base}3",
        f"{base}_fleet",
        f"{base}_01",
        f"fleet_{base}",
    ]
    for n in range(10, 210):
        candidates.append(f"{base}{n}")
    for cand in candidates:
        normalized = normalize_user_id(cand)
        if len(normalized) < 3 or normalized in RESERVED_USER_IDS:
            continue
        if normalized in suggestions or user_id_taken(normalized, db):
            continue
        suggestions.append(normalized)
        if len(suggestions) >= limit:
            break
    return suggestions


def _default_user_display_name(email: str, phone: str) -> str:
    if email and "@" in email:
        return email.split("@")[0].replace(".", " ").replace("_", " ").strip().title()[:80] or "Fleet User"
    digits = "".join(ch for ch in phone if ch.isdigit())
    return f"User {digits[-4:]}" if len(digits) >= 4 else "Fleet User"


@app.get("/auth/check-user-id", response_model=UserIdCheckResponse)
def check_user_id(identifier: str, db: Session = Depends(get_db)):
    normalized = normalize_user_id(identifier)
    if len(normalized) < 3:
        return UserIdCheckResponse(
            identifier=normalized,
            available=False,
            suggestions=[],
            message="User ID must be at least 3 characters (letters, numbers, underscore)",
        )
    if normalized in RESERVED_USER_IDS:
        suggestions = suggest_user_ids(f"{normalized}_user", db)
        return UserIdCheckResponse(
            identifier=normalized,
            available=False,
            suggestions=suggestions,
            message="This User ID is reserved",
        )
    available = not user_id_taken(normalized, db)
    suggestions = [] if available else suggest_user_ids(normalized, db)
    return UserIdCheckResponse(
        identifier=normalized,
        available=available,
        suggestions=suggestions,
        message="User ID is available" if available else "User ID already taken",
    )


@app.post("/auth/register-user", response_model=RegisterUserResponse)
def register_user(payload: RegisterUserRequest, db: Session = Depends(get_db)):
    identifier = normalize_user_id(payload.identifier)
    phone = (payload.phone or "").strip()
    email = (payload.email or "").strip().lower()
    language = (payload.preferred_language or "en").strip().lower()
    password = payload.password or ""
    confirm = payload.confirm_password or ""

    if len(identifier) < 3:
        raise HTTPException(status_code=400, detail="User ID must be at least 3 characters")
    if identifier in RESERVED_USER_IDS:
        raise HTTPException(status_code=400, detail="This User ID is reserved")
    if user_id_taken(identifier, db):
        suggestions = suggest_user_ids(identifier, db)
        detail = "User ID already exists"
        if suggestions:
            detail = f"{detail}. Try: {', '.join(suggestions)}"
        raise HTTPException(status_code=400, detail=detail)
    if len(phone) < 8:
        raise HTTPException(status_code=400, detail="Valid phone number is required")
    if not email or "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Valid email is required")
    if language not in {"en", "te"}:
        raise HTTPException(status_code=400, detail="Language must be en or te")
    if len(password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    if password != confirm:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    existing_email = db.query(UserProfile).filter(UserProfile.email == email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = UserAccount(identifier=identifier, password=password, role="user")
    db.add(user)

    full_name = (payload.full_name or "").strip() or _default_user_display_name(email, phone)
    db.add(
        UserProfile(
            identifier=identifier,
            role="user",
            full_name=full_name,
            phone=phone,
            email=email,
            preferred_language=language,
        )
    )
    db.commit()
    db.refresh(user)

    base = login_response_for(user, db)
    return RegisterUserResponse(
        **base.model_dump(),
        message=f"Account created. Your User ID is {identifier}.",
    )


def ensure_demo_driver_logins() -> None:
    db = SessionLocal()
    try:
        driver = db.query(Driver).order_by(Driver.id.asc()).first()
        if not driver:
            return
        if not driver.created_by:
            driver.created_by = "user1"
        login_id = f"driver{driver.id}"
        existing = db.query(UserAccount).filter(UserAccount.identifier == login_id).first()
        if not existing:
            db.add(
                UserAccount(
                    identifier=login_id,
                    password="driver123",
                    role="driver",
                    driver_id=driver.id,
                )
            )
            profile = db.query(UserProfile).filter(UserProfile.identifier == login_id).first()
            if not profile:
                db.add(
                    UserProfile(
                        identifier=login_id,
                        role="driver",
                        full_name=driver.name,
                        phone=driver.phone,
                        email=f"{login_id}@fleet.local",
                        preferred_language="en",
                    )
                )
        db.commit()
    finally:
        db.close()


@app.get("/users", response_model=List[UserAccountListItem])
def list_users(role: str | None = None, scope_user: str | None = None, db: Session = Depends(get_db)):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    accounts = (
        db.query(UserAccount)
        .filter(UserAccount.role == "user")
        .order_by(UserAccount.identifier.asc())
        .all()
    )
    items: List[UserAccountListItem] = []
    for account in accounts:
        profile = db.query(UserProfile).filter(UserProfile.identifier == account.identifier).first()
        items.append(
            UserAccountListItem(
                identifier=account.identifier,
                role=account.role,
                full_name=profile.full_name if profile else None,
            )
        )
    return items


@app.get("/user-profile", response_model=UserProfileOut | None)
def get_user_profile(identifier: str, db: Session = Depends(get_db)):
    return db.query(UserProfile).filter(UserProfile.identifier == identifier).first()


@app.post("/user-profile", response_model=UserProfileOut)
def create_or_update_user_profile(payload: UserProfileCreate, db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.identifier == payload.identifier).first()
    if profile:
        profile.role = payload.role
        profile.full_name = payload.full_name
        profile.phone = payload.phone
        profile.email = payload.email
        profile.profile_image_url = payload.profile_image_url
        profile.preferred_language = payload.preferred_language or "en"
    else:
        profile = UserProfile(**payload.model_dump())
        db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@app.post("/seed-proper")
def seed_proper(db: Session = Depends(get_db)):
    return seed_proper_data(db)


@app.post("/reset-and-seed-proper")
def reset_and_seed_proper(db: Session = Depends(get_db)):
    db.query(DriverAssignment).delete()
    db.query(Expense).delete()
    db.query(Trip).delete()
    db.query(Lorry).delete()
    db.query(Driver).delete()
    db.commit()
    return seed_proper_data(db)


def _default_driver_login_id(driver_id: int) -> str:
    return f"driver{driver_id}"


def _default_driver_password(driver_id: int) -> str:
    return f"driver{driver_id}123"


@app.post("/drivers", response_model=DriverCreateOut)
def create_driver(
    payload: DriverCreate,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    ctx = build_auth_context(db, viewer, role, scope_user)
    if ctx["role"] not in {"user", "admin"}:
        raise HTTPException(status_code=403, detail="Only fleet owners can create drivers")
    if ctx["role"] == "admin" and not ctx["owner"]:
        raise HTTPException(status_code=400, detail="Select a user before creating drivers")

    name = (payload.name or "").strip()
    phone = (payload.phone or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Driver name is required")
    if not phone:
        raise HTTPException(status_code=400, detail="Driver phone is required")

    driver_data = payload.model_dump(exclude={"login_identifier", "password"})
    driver_data["name"] = name
    driver_data["phone"] = phone
    driver = Driver(**driver_data)
    driver.created_by = write_owner(db, viewer, role, scope_user)
    db.add(driver)
    db.flush()

    login_auto = not (payload.login_identifier or "").strip()
    password_auto = not (payload.password or "").strip()
    login_identifier = (payload.login_identifier or "").strip().lower() or _default_driver_login_id(driver.id)
    password = (payload.password or "").strip() or _default_driver_password(driver.id)

    if len(login_identifier) < 3:
        raise HTTPException(status_code=400, detail="Driver login ID must be at least 3 characters")
    if len(password) < 4:
        raise HTTPException(status_code=400, detail="Driver password must be at least 4 characters")

    existing = db.query(UserAccount).filter(UserAccount.identifier == login_identifier).first()
    if existing:
        suggestions = suggest_user_ids(login_identifier, db)
        detail = "Login ID already exists"
        if suggestions:
            detail = f"{detail}. Try: {', '.join(suggestions)}"
        raise HTTPException(status_code=400, detail=detail)

    db.add(
        UserAccount(
            identifier=login_identifier,
            password=password,
            role="driver",
            driver_id=driver.id,
        )
    )
    profile = db.query(UserProfile).filter(UserProfile.identifier == login_identifier).first()
    if not profile:
        db.add(
            UserProfile(
                identifier=login_identifier,
                role="driver",
                full_name=driver.name,
                phone=driver.phone,
                preferred_language="en",
            )
        )

    db.commit()
    db.refresh(driver)

    owner = driver.created_by
    if owner:
        create_notification(
            db,
            owner,
            "driver_created",
            "New driver added",
            f"Driver {driver.name} was added to your fleet. Login ID: {login_identifier}.",
            driver_id=driver.id,
            related_type="driver",
            related_id=driver.id,
        )
        db.commit()

    base = serialize_driver(driver, db)
    message = f"Driver {driver.name} created successfully. Login ID: {login_identifier}."
    return DriverCreateOut(
        **base.model_dump(),
        message=message,
        initial_password=password if (login_auto or password_auto) else None,
        login_auto_generated=login_auto,
        password_auto_generated=password_auto,
    )


@app.get("/drivers", response_model=List[DriverOut])
def list_drivers(viewer: str | None = None, role: str | None = None, scope_user: str | None = None, db: Session = Depends(get_db)):
    drivers = scoped_query(db.query(Driver), Driver, db, viewer, role, scope_user).order_by(Driver.id.desc()).all()
    return [serialize_driver(item, db) for item in drivers]


@app.get("/drivers/me", response_model=DriverOut)
def get_my_driver(
    viewer: str | None = None,
    role: str | None = None,
    db: Session = Depends(get_db),
):
    ctx = build_auth_context(db, viewer, role)
    if ctx["role"] != "driver" or not ctx.get("driver_id"):
        raise HTTPException(status_code=403, detail="Driver access required")
    driver = db.query(Driver).filter(Driver.id == ctx["driver_id"]).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return serialize_driver(driver, db)


@app.patch("/drivers/{driver_id}/status", response_model=DriverOut)
def update_driver_status(
    driver_id: int,
    payload: ActiveStatusUpdate,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    driver = scoped_query(db.query(Driver), Driver, db, viewer, role, scope_user).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    driver.is_active = payload.is_active
    if not payload.is_active:
        complete_active_assignments_for_driver(db, driver.id, datetime.utcnow())
    db.commit()
    db.refresh(driver)
    return serialize_driver(driver, db)


def delete_driver_and_related(
    db: Session,
    driver: Driver,
    viewer: str | None,
    role: str | None,
    scope_user: str | None,
) -> str:
    driver_id = driver.id
    driver_name = driver.name

    trip_ids = [trip.id for trip in db.query(Trip).filter(Trip.driver_id == driver_id).all()]
    if trip_ids:
        db.query(Expense).filter(Expense.trip_id.in_(trip_ids)).delete(synchronize_session=False)
        db.query(Trip).filter(Trip.id.in_(trip_ids)).delete(synchronize_session=False)
        db.expire_all()

    assignment_ids = [
        item.id for item in db.query(DriverAssignment).filter(DriverAssignment.driver_id == driver_id).all()
    ]
    if assignment_ids:
        db.query(DriverAssignmentLeave).filter(
            DriverAssignmentLeave.assignment_id.in_(assignment_ids)
        ).delete(synchronize_session=False)
        db.query(DriverAssignment).filter(DriverAssignment.id.in_(assignment_ids)).delete(synchronize_session=False)

    db.query(Lorry).filter(Lorry.driver_id == driver_id).update({Lorry.driver_id: None}, synchronize_session=False)
    db.query(Notification).filter(Notification.driver_id == driver_id).delete(synchronize_session=False)

    account = driver_account_for(driver_id, db)
    if account:
        db.query(UserProfile).filter(UserProfile.identifier == account.identifier).delete(synchronize_session=False)
        db.delete(account)

    owner = driver.created_by
    db.delete(driver)
    db.flush()

    if owner:
        create_notification(
            db,
            owner,
            "driver_deleted",
            "Driver removed",
            f"Driver {driver_name} was removed from your fleet.",
            related_type="driver",
            related_id=driver_id,
        )

    return driver_name


@app.delete("/drivers/{driver_id}")
def delete_driver(
    driver_id: int,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    ctx = build_auth_context(db, viewer, role, scope_user)
    if ctx["role"] not in {"user", "admin"}:
        raise HTTPException(status_code=403, detail="Only fleet owners can delete drivers")
    if ctx["role"] == "admin" and not ctx["owner"]:
        raise HTTPException(status_code=400, detail="Select a user before deleting drivers")

    driver = scoped_query(db.query(Driver), Driver, db, viewer, role, scope_user).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    driver_name = delete_driver_and_related(db, driver, viewer, role, scope_user)
    db.commit()
    return {"ok": True, "message": f"Driver {driver_name} deleted successfully."}


@app.get("/drivers/{driver_id}/history", response_model=DriverHistoryOut)
def get_driver_history(
    driver_id: int,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    driver = scoped_query(db.query(Driver), Driver, db, viewer, role, scope_user).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    trips = (
        scoped_query(db.query(Trip), Trip, db, viewer, role, scope_user)
        .filter(Trip.driver_id == driver_id)
        .order_by(Trip.id.desc())
        .all()
    )
    history_items = []
    total_driver_earning = 0.0
    total_company_net = 0.0
    total_working_days = 0
    total_transport_amount = 0.0
    total_commission_amount = 0.0
    for trip in trips:
        trip_expenses, company_net = trip_totals(db, trip)
        expenses = (
            scoped_query(db.query(Expense), Expense, db, viewer, role, scope_user)
            .filter(Expense.trip_id == trip.id)
            .all()
        )
        commission_amount = commission_for_trip_in_stint(db, trip)
        transport_amount = float(trip.load_price or 0)
        working_days = trip_working_days(trip)
        stint_assignment = assignment_for_trip(db, trip)
        bata_amount = round_money(sum(float(item.driver_bata or 0) for item in expenses))
        if stint_assignment:
            # Keep history consistent with locked assignment wage (days × daily_wage),
            # so trip expense edits do not reduce earned wage unexpectedly.
            wage_amount = round_money(working_days * float(stint_assignment.daily_wage or 0))
        else:
            wage_amount = round_money(sum(float(item.driver_daily_wage or 0) for item in expenses))
        driver_earned = round_money(bata_amount + wage_amount + commission_amount)
        trip_total_earning = driver_earned

        total_working_days += working_days
        total_transport_amount += transport_amount
        total_commission_amount += commission_amount
        total_driver_earning += driver_earned
        total_company_net += company_net
        stint_transport = 0.0
        if stint_assignment:
            stint_transport = sum(
                float(item.load_price or 0) for item in assignment_trips_for(db, stint_assignment)
            )
        commission_eligible = stint_transport >= COMMISSION_TRANSPORT_THRESHOLD
        history_items.append(
            {
                "trip_id": trip.id,
                "lorry_id": trip.lorry_id,
                "lorry_number": trip.lorry.vehicle_number if trip.lorry else None,
                "route": f"{trip.load_location} -> {trip.unload_location}",
                "status": trip.status,
                "working_days": working_days,
                "transport_amount": transport_amount,
                "commission_amount": commission_amount,
                "commission_eligible": commission_eligible,
                "trip_total_earning": trip_total_earning,
                "load_price": trip.load_price,
                "trip_expenses": trip_expenses,
                "driver_earned": driver_earned,
                "company_net": company_net,
                "completed_at": trip.completed_at,
            }
        )
    assignments = (
        scoped_query(db.query(DriverAssignment), DriverAssignment, db, viewer, role, scope_user)
        .filter(DriverAssignment.driver_id == driver_id)
        .order_by(DriverAssignment.assigned_at.desc())
        .all()
    )
    assignment_items = serialize_assignments_list(db, assignments, role)
    total_assignment_wage = round_money(sum(item.wage_amount for item in assignment_items))
    total_assignment_commission = round_money(sum(item.commission_amount for item in assignment_items))
    total_assignment_earning = round_money(sum(item.total_earning for item in assignment_items))
    return DriverHistoryOut(
        driver_id=driver.id,
        driver_name=driver.name,
        is_active=bool(driver.is_active),
        total_trips=len(trips),
        total_working_days=total_working_days,
        total_transport_amount=total_transport_amount,
        total_commission_amount=total_commission_amount,
        total_driver_earning=total_driver_earning,
        total_company_net=total_company_net,
        total_assignment_wage=total_assignment_wage,
        total_assignment_commission=total_assignment_commission,
        total_assignment_earning=total_assignment_earning,
        commission_transport_threshold=COMMISSION_TRANSPORT_THRESHOLD,
        assignments=assignment_items,
        trips=history_items,
    )


@app.get("/notifications", response_model=List[NotificationOut])
def list_notifications(
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    ctx = build_auth_context(db, viewer, role, scope_user)
    recipient = notification_recipient(ctx)
    if not recipient:
        raise HTTPException(status_code=403, detail="Notifications are available to fleet users only")
    items = (
        db.query(Notification)
        .filter(Notification.recipient == recipient)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(100)
        .all()
    )
    return [serialize_notification(db, item) for item in items]


@app.patch("/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: int,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    ctx = build_auth_context(db, viewer, role, scope_user)
    recipient = notification_recipient(ctx)
    if not recipient:
        raise HTTPException(status_code=403, detail="Notifications are available to fleet users only")
    item = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.recipient == recipient)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Notification not found")
    item.is_read = True
    db.commit()
    db.refresh(item)
    return serialize_notification(db, item)


@app.post("/notifications/read-all")
def mark_all_notifications_read(
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    ctx = build_auth_context(db, viewer, role, scope_user)
    recipient = notification_recipient(ctx)
    if not recipient:
        raise HTTPException(status_code=403, detail="Notifications are available to fleet users only")
    db.query(Notification).filter(Notification.recipient == recipient, Notification.is_read.is_(False)).update(
        {"is_read": True},
        synchronize_session=False,
    )
    db.commit()
    return {"ok": True}


@app.delete("/notifications")
def clear_all_notifications(
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    ctx = build_auth_context(db, viewer, role, scope_user)
    recipient = notification_recipient(ctx)
    if not recipient:
        raise HTTPException(status_code=403, detail="Notifications are available to fleet users only")
    deleted = (
        db.query(Notification)
        .filter(Notification.recipient == recipient)
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"ok": True, "deleted": deleted}


@app.get("/driver-assignments", response_model=List[DriverAssignmentOut])
def list_driver_assignments(viewer: str | None = None, role: str | None = None, scope_user: str | None = None, db: Session = Depends(get_db)):
    assignments = (
        scoped_query(db.query(DriverAssignment), DriverAssignment, db, viewer, role, scope_user)
        .order_by(DriverAssignment.assigned_at.desc())
        .all()
    )
    return serialize_assignments_list(db, assignments, role)


@app.get("/drivers/{driver_id}/assignments", response_model=List[DriverAssignmentOut])
def list_driver_assignments_for_driver(
    driver_id: int,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    driver = scoped_query(db.query(Driver), Driver, db, viewer, role, scope_user).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    assignments = (
        scoped_query(db.query(DriverAssignment), DriverAssignment, db, viewer, role, scope_user)
        .filter(DriverAssignment.driver_id == driver_id)
        .order_by(DriverAssignment.assigned_at.desc())
        .all()
    )
    return serialize_assignments_list(db, assignments, role)


@app.post("/driver-assignments", response_model=DriverAssignmentOut)
def create_driver_assignment(
    payload: DriverAssignmentCreate,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    driver = scoped_query(db.query(Driver), Driver, db, viewer, role, scope_user).filter(Driver.id == payload.driver_id).first()
    lorry = scoped_query(db.query(Lorry), Lorry, db, viewer, role, scope_user).filter(Lorry.id == payload.lorry_id).first()
    if not driver or not lorry:
        raise HTTPException(status_code=404, detail="Driver or lorry not found")

    assignment_time = payload.assigned_at or datetime.utcnow()
    existing = (
        scoped_query(db.query(DriverAssignment), DriverAssignment, db, viewer, role, scope_user)
        .filter(DriverAssignment.lorry_id == payload.lorry_id, DriverAssignment.status == "Active")
        .first()
    )
    if existing:
        existing.status = "Completed"
        existing.completed_at = assignment_time
        lorry = scoped_query(db.query(Lorry), Lorry, db, viewer, role, scope_user).filter(Lorry.id == existing.lorry_id).first()
        if lorry and lorry.driver_id == existing.driver_id:
            lorry.driver_id = None

    complete_active_assignments_for_driver(db, payload.driver_id, assignment_time)

    assignment = DriverAssignment(
        lorry_id=payload.lorry_id,
        driver_id=payload.driver_id,
        assigned_at=assignment_time,
        daily_wage=float(payload.daily_wage or 0),
        commission_percent=float(payload.commission_percent or 0),
        notes=payload.notes,
        status="Active",
        driver_accepted=False,
        created_by=write_owner(db, viewer, role, scope_user),
    )
    lorry.driver_id = payload.driver_id
    db.add(assignment)
    db.flush()
    notify_driver_owner(
        db,
        driver.id,
        "assignment_pending",
        "Assignment awaiting driver acceptance",
        f"{driver.name} was assigned to lorry {lorry.vehicle_number}. Daily wage Rs {float(payload.daily_wage or 0):.0f}, commission {float(payload.commission_percent or 6):.0f}%. Waiting for driver to accept.",
        related_type="assignment",
        related_id=assignment.id,
    )
    db.commit()
    db.refresh(assignment)
    return serialize_assignment(
        db,
        assignment,
        role,
        is_current_stint=assignment.status == "Active",
        gap_days_before=assignment_gap_days_before(db, assignment),
    )


@app.post("/driver-assignments/{assignment_id}/accept", response_model=DriverAssignmentOut)
def accept_driver_assignment(
    assignment_id: int,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    ctx = build_auth_context(db, viewer, role, scope_user)
    if ctx["role"] != "driver" or not ctx.get("driver_id"):
        raise HTTPException(status_code=403, detail="Only the assigned driver can accept")

    assignment = (
        scoped_query(db.query(DriverAssignment), DriverAssignment, db, viewer, role, scope_user)
        .filter(DriverAssignment.id == assignment_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.driver_id != ctx["driver_id"]:
        raise HTTPException(status_code=403, detail="This assignment is not yours")
    if assignment.status != "Active":
        raise HTTPException(status_code=400, detail="Only active assignments can be accepted")
    if assignment.driver_accepted:
        return serialize_assignment(
        db,
        assignment,
        role,
        is_current_stint=assignment.status == "Active",
        gap_days_before=assignment_gap_days_before(db, assignment),
    )

    assignment.driver_accepted = True
    assignment.driver_accepted_at = datetime.utcnow()
    driver = db.query(Driver).filter(Driver.id == assignment.driver_id).first()
    lorry = db.query(Lorry).filter(Lorry.id == assignment.lorry_id).first()
    notify_driver_owner(
        db,
        assignment.driver_id,
        "assignment_accepted",
        "Driver accepted assignment",
        f"{driver.name if driver else 'Driver'} accepted the assignment on lorry {lorry.vehicle_number if lorry else assignment.lorry_id}. Earnings are now visible to the driver.",
        related_type="assignment",
        related_id=assignment.id,
    )
    db.commit()
    db.refresh(assignment)
    return serialize_assignment(
        db,
        assignment,
        role,
        is_current_stint=assignment.status == "Active",
        gap_days_before=assignment_gap_days_before(db, assignment),
    )


@app.patch("/driver-assignments/{assignment_id}/complete", response_model=DriverAssignmentOut)
def complete_driver_assignment(
    assignment_id: int,
    payload: DriverAssignmentComplete | None = None,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    assignment = (
        scoped_query(db.query(DriverAssignment), DriverAssignment, db, viewer, role, scope_user)
        .filter(DriverAssignment.id == assignment_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment.status = "Completed"
    assignment.completed_at = payload.completed_at if payload and payload.completed_at else datetime.utcnow()
    lorry = scoped_query(db.query(Lorry), Lorry, db, viewer, role, scope_user).filter(Lorry.id == assignment.lorry_id).first()
    if lorry and lorry.driver_id == assignment.driver_id:
        lorry.driver_id = None
    db.commit()
    db.refresh(assignment)
    return serialize_assignment(
        db,
        assignment,
        role,
        is_current_stint=assignment.status == "Active",
        gap_days_before=assignment_gap_days_before(db, assignment),
    )


@app.post("/driver-assignments/{assignment_id}/leaves", response_model=DriverAssignmentOut)
def add_driver_assignment_leave(
    assignment_id: int,
    payload: DriverAssignmentLeaveCreate,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    assignment = (
        scoped_query(db.query(DriverAssignment), DriverAssignment, db, viewer, role, scope_user)
        .filter(DriverAssignment.id == assignment_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if payload.leave_end < payload.leave_start:
        raise HTTPException(status_code=400, detail="Leave end date must be on or after leave start date")

    leave = DriverAssignmentLeave(
        assignment_id=assignment.id,
        leave_start=payload.leave_start,
        leave_end=payload.leave_end,
        reason=payload.reason,
        created_by=write_owner(db, viewer, role, scope_user),
    )
    db.add(leave)
    db.commit()
    db.refresh(assignment)
    return serialize_assignment(
        db,
        assignment,
        role,
        is_current_stint=assignment.status == "Active",
        gap_days_before=assignment_gap_days_before(db, assignment),
    )


@app.patch("/driver-assignments/{assignment_id}", response_model=DriverAssignmentOut)
def update_driver_assignment(
    assignment_id: int,
    payload: DriverAssignmentUpdate,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    assignment = (
        scoped_query(db.query(DriverAssignment), DriverAssignment, db, viewer, role, scope_user)
        .filter(DriverAssignment.id == assignment_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if payload.assigned_at is not None:
        assignment.assigned_at = payload.assigned_at
    if payload.notes is not None:
        assignment.notes = payload.notes

    if payload.driver_id is not None:
        driver = scoped_query(db.query(Driver), Driver, db, viewer, role, scope_user).filter(Driver.id == payload.driver_id).first()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver not found")
        assignment.driver_id = payload.driver_id

    if payload.lorry_id is not None:
        lorry = scoped_query(db.query(Lorry), Lorry, db, viewer, role, scope_user).filter(Lorry.id == payload.lorry_id).first()
        if not lorry:
            raise HTTPException(status_code=404, detail="Lorry not found")
        assignment.lorry_id = payload.lorry_id

    lorry = scoped_query(db.query(Lorry), Lorry, db, viewer, role, scope_user).filter(Lorry.id == assignment.lorry_id).first()
    if lorry:
        lorry.driver_id = assignment.driver_id

    db.commit()
    db.refresh(assignment)
    return serialize_assignment(
        db,
        assignment,
        role,
        is_current_stint=assignment.status == "Active",
        gap_days_before=assignment_gap_days_before(db, assignment),
    )


@app.post("/lorries", response_model=LorryOut)
def create_lorry(
    payload: LorryCreate,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    ctx = build_auth_context(db, viewer, role, scope_user)
    if ctx["role"] not in {"user", "admin"}:
        raise HTTPException(status_code=403, detail="Only fleet owners can add lorries")
    if ctx["role"] == "admin" and not ctx["owner"]:
        raise HTTPException(status_code=400, detail="Select a user before adding lorries")

    vehicle_number = (payload.vehicle_number or "").strip()
    if not vehicle_number:
        raise HTTPException(status_code=400, detail="Vehicle number is required")

    existing = db.query(Lorry).filter(Lorry.vehicle_number == vehicle_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vehicle number already exists")

    lorry = Lorry(
        vehicle_number=vehicle_number,
        current_location=(payload.current_location or "").strip() or None,
        driver_id=payload.driver_id,
    )
    lorry.created_by = write_owner(db, viewer, role, scope_user)
    db.add(lorry)
    db.commit()
    db.refresh(lorry)
    return lorry


@app.get("/lorries", response_model=List[LorryOut])
def list_lorries(viewer: str | None = None, role: str | None = None, scope_user: str | None = None, db: Session = Depends(get_db)):
    return scoped_query(db.query(Lorry), Lorry, db, viewer, role, scope_user).order_by(Lorry.id.desc()).all()


@app.patch("/lorries/{lorry_id}/status", response_model=LorryOut)
def update_lorry_status(
    lorry_id: int,
    payload: ActiveStatusUpdate,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    lorry = scoped_query(db.query(Lorry), Lorry, db, viewer, role, scope_user).filter(Lorry.id == lorry_id).first()
    if not lorry:
        raise HTTPException(status_code=404, detail="Lorry not found")
    lorry.is_active = payload.is_active
    db.commit()
    db.refresh(lorry)
    return lorry


def delete_lorry_and_related(
    db: Session,
    lorry: Lorry,
) -> str:
    lorry_id = lorry.id
    vehicle_number = lorry.vehicle_number

    active_trip = (
        db.query(Trip)
        .filter(
            Trip.lorry_id == lorry_id,
            Trip.status.notin_(["Delivered", "Trip Done"]),
        )
        .first()
    )
    if active_trip:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete lorry with an active trip. Complete or reassign the trip first.",
        )

    trip_ids = [trip.id for trip in db.query(Trip).filter(Trip.lorry_id == lorry_id).all()]
    if trip_ids:
        db.query(Expense).filter(Expense.trip_id.in_(trip_ids)).delete(synchronize_session=False)
        db.query(Trip).filter(Trip.id.in_(trip_ids)).delete(synchronize_session=False)
        db.expire_all()

    assignment_ids = [
        item.id for item in db.query(DriverAssignment).filter(DriverAssignment.lorry_id == lorry_id).all()
    ]
    if assignment_ids:
        db.query(DriverAssignmentLeave).filter(
            DriverAssignmentLeave.assignment_id.in_(assignment_ids)
        ).delete(synchronize_session=False)
        db.query(DriverAssignment).filter(DriverAssignment.id.in_(assignment_ids)).delete(synchronize_session=False)

    db.delete(lorry)
    db.flush()
    return vehicle_number


@app.delete("/lorries/{lorry_id}")
def delete_lorry(
    lorry_id: int,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    ctx = build_auth_context(db, viewer, role, scope_user)
    if ctx["role"] not in {"user", "admin"}:
        raise HTTPException(status_code=403, detail="Only fleet owners can delete lorries")
    if ctx["role"] == "admin" and not ctx["owner"]:
        raise HTTPException(status_code=400, detail="Select a user before deleting lorries")

    lorry = scoped_query(db.query(Lorry), Lorry, db, viewer, role, scope_user).filter(Lorry.id == lorry_id).first()
    if not lorry:
        raise HTTPException(status_code=404, detail="Lorry not found")

    vehicle_number = delete_lorry_and_related(db, lorry)
    db.commit()
    return {"ok": True, "message": f"Lorry {vehicle_number} deleted successfully."}


@app.get("/lorries/{lorry_id}/history", response_model=LorryHistoryOut)
def get_lorry_history(
    lorry_id: int,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    lorry = scoped_query(db.query(Lorry), Lorry, db, viewer, role, scope_user).filter(Lorry.id == lorry_id).first()
    if not lorry:
        raise HTTPException(status_code=404, detail="Lorry not found")
    trips = (
        scoped_query(db.query(Trip), Trip, db, viewer, role, scope_user)
        .filter(Trip.lorry_id == lorry_id)
        .order_by(Trip.id.desc())
        .all()
    )
    history_items = []
    total_income = 0.0
    total_expenses = 0.0
    total_profit = 0.0
    for trip in trips:
        trip_expenses, lorry_profit = trip_totals(db, trip)
        total_income += trip.load_price
        total_expenses += trip_expenses
        total_profit += lorry_profit
        history_items.append(
            {
                "trip_id": trip.id,
                "driver_id": trip.driver_id,
                "driver_name": trip.driver.name if trip.driver else None,
                "route": f"{trip.load_location} -> {trip.unload_location}",
                "status": trip.status,
                "load_price": trip.load_price,
                "trip_expenses": trip_expenses,
                "lorry_profit": lorry_profit,
                "completed_at": trip.completed_at,
            }
        )
    return LorryHistoryOut(
        lorry_id=lorry.id,
        vehicle_number=lorry.vehicle_number,
        is_active=bool(lorry.is_active),
        total_trips=len(trips),
        total_income=total_income,
        total_expenses=total_expenses,
        total_profit=total_profit,
        trips=history_items,
    )


@app.post("/trips", response_model=TripOut)
def create_trip(payload: TripCreate, viewer: str | None = None, role: str | None = None, scope_user: str | None = None, db: Session = Depends(get_db)):
    ctx = build_auth_context(db, viewer, role, scope_user)
    trip_data = payload.model_dump()
    if ctx["role"] == "driver":
        if not ctx.get("driver_id"):
            raise HTTPException(status_code=403, detail="Driver account is not linked")
        trip_data["driver_id"] = ctx["driver_id"]

    lorry = scoped_query(db.query(Lorry), Lorry, db, viewer, role, scope_user).filter(Lorry.id == trip_data["lorry_id"]).first()
    driver = scoped_query(db.query(Driver), Driver, db, viewer, role, scope_user).filter(Driver.id == trip_data["driver_id"]).first()
    if not lorry or not driver:
        raise HTTPException(status_code=400, detail="Invalid lorry_id or driver_id")

    if trip_data.get("status") in {"Delivered", "Trip Done"}:
        trip_data["completed_at"] = datetime.utcnow()
    trip = Trip(**trip_data)
    trip.created_by = write_owner(db, viewer, role, scope_user)
    db.add(trip)
    db.commit()
    db.refresh(trip)
    if ctx["role"] == "driver":
        notify_driver_owner(
            db,
            trip.driver_id,
            "driver_trip_created",
            f"Driver created trip #{trip.id}",
            f"{driver.name}: {trip.load_location} → {trip.unload_location} ({trip.status}).",
            related_type="trip",
            related_id=trip.id,
        )
        db.commit()
    total_expenses, net_profit = trip_totals(db, trip)
    return TripOut(**trip.__dict__, total_expenses=total_expenses, net_profit=net_profit)


@app.get("/trips", response_model=List[TripOut])
def list_trips(viewer: str | None = None, role: str | None = None, scope_user: str | None = None, db: Session = Depends(get_db)):
    trips = scoped_query(db.query(Trip), Trip, db, viewer, role, scope_user).order_by(Trip.id.desc()).all()
    result: List[TripOut] = []
    for trip in trips:
        total_expenses, net_profit = trip_totals(db, trip)
        result.append(
            TripOut(
                **trip.__dict__,
                total_expenses=total_expenses,
                net_profit=net_profit,
            )
        )
    return result


def apply_trip_update(trip: Trip, payload: TripUpdate) -> None:
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return

    if "loading_date" in data:
        trip.loading_date = data["loading_date"]

    if "unloading_date" in data:
        trip.unloading_date = data["unloading_date"]

    if "status" in data and data["status"] is not None:
        trip.status = data["status"]
        if data["status"] in {"Delivered", "Trip Done"}:
            trip.completed_at = datetime.utcnow()
        else:
            trip.completed_at = None


def upsert_trip_expense(
    db: Session,
    trip: Trip,
    payload: TripExpenseUpdate,
    viewer: str | None,
    role: str | None,
    scope_user: str | None,
) -> None:
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return

    records = db.query(Expense).filter(Expense.trip_id == trip.id).order_by(Expense.id.asc()).all()
    expense = records[0] if records else None
    if expense is None:
        expense = Expense(trip_id=trip.id)
        expense.created_by = write_owner(db, viewer, role, scope_user)
        db.add(expense)

    for key, value in data.items():
        setattr(expense, key, round_money(value))

    sync_stint_trip_commissions(db, trip)


def apply_trip_save(
    db: Session,
    trip: Trip,
    payload: TripStatusUpdate,
    viewer: str | None,
    role: str | None,
    scope_user: str | None,
) -> None:
    data = payload.model_dump(exclude_unset=True)
    expense_block = data.pop("expense", None)
    if data:
        apply_trip_update(trip, TripUpdate(**data))
        if "load_price" in data:
            sync_stint_trip_commissions(db, trip)
    if expense_block:
        upsert_trip_expense(db, trip, TripExpenseUpdate(**expense_block), viewer, role, scope_user)
    if not data and not expense_block:
        raise HTTPException(status_code=400, detail="No trip fields to update")


@app.patch("/trips/{trip_id}", response_model=TripOut)
def update_trip(
    trip_id: int,
    payload: TripUpdate,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    trip = scoped_query(db.query(Trip), Trip, db, viewer, role, scope_user).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if not payload.model_dump(exclude_unset=True):
        raise HTTPException(status_code=400, detail="No trip fields to update")
    apply_trip_update(trip, payload)
    if role == "driver":
        notify_driver_owner(
            db,
            trip.driver_id,
            "driver_trip_update",
            f"Driver updated trip #{trip.id}",
            f"{trip.load_location} → {trip.unload_location}: trip details updated.",
            related_type="trip",
            related_id=trip.id,
        )
    db.commit()
    db.refresh(trip)
    total_expenses, net_profit = trip_totals(db, trip)
    return TripOut(**trip.__dict__, total_expenses=total_expenses, net_profit=net_profit)


@app.patch("/trips/{trip_id}/status", response_model=TripOut)
def update_trip_status(
    trip_id: int,
    payload: TripStatusUpdate,
    viewer: str | None = None,
    role: str | None = None,
    scope_user: str | None = None,
    db: Session = Depends(get_db),
):
    trip = scoped_query(db.query(Trip), Trip, db, viewer, role, scope_user).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    apply_trip_save(db, trip, payload, viewer, role, scope_user)
    if role == "driver":
        changes = []
        data = payload.model_dump(exclude_unset=True)
        if "status" in data:
            changes.append(f"status → {data['status']}")
        if "loading_date" in data:
            changes.append(f"loading date → {data['loading_date']}")
        if "unloading_date" in data:
            changes.append(f"unloading date → {data['unloading_date']}")
        if data.get("expense"):
            changes.append("expense details updated")
        detail = ", ".join(changes) if changes else "trip details updated"
        notify_driver_owner(
            db,
            trip.driver_id,
            "driver_trip_update",
            f"Driver updated trip #{trip.id}",
            f"{trip.load_location} → {trip.unload_location}: {detail}.",
            related_type="trip",
            related_id=trip.id,
        )
    db.commit()
    db.refresh(trip)
    total_expenses, net_profit = trip_totals(db, trip)
    return TripOut(**trip.__dict__, total_expenses=total_expenses, net_profit=net_profit)


@app.post("/expenses", response_model=ExpenseOut)
def add_expense(payload: ExpenseCreate, viewer: str | None = None, role: str | None = None, scope_user: str | None = None, db: Session = Depends(get_db)):
    trip = scoped_query(db.query(Trip), Trip, db, viewer, role, scope_user).filter(Trip.id == payload.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    payload_data = payload.model_dump()
    commission_percent = float(payload_data.get("driver_commission_percent") or 0)
    assignment = assignment_for_trip(db, trip)
    if assignment and not commission_percent:
        commission_percent = float(assignment.commission_percent or 0)
    payload_data["driver_commission_percent"] = commission_percent
    payload_data["driver_commission_amount"] = commission_for_trip_in_stint(db, trip, commission_percent)
    payload_data["proof_images_json"] = json.dumps(payload_data.pop("proof_images", []) or [])

    expense = Expense(**payload_data)
    expense.created_by = write_owner(db, viewer, role, scope_user)
    db.add(expense)
    sync_stint_trip_commissions(db, trip)
    if role == "driver":
        notify_driver_owner(
            db,
            trip.driver_id,
            "driver_expense_update",
            f"Driver added expense on trip #{trip.id}",
            f"{trip.load_location} → {trip.unload_location}: expense recorded by driver.",
            related_type="trip",
            related_id=trip.id,
        )
    db.commit()
    db.refresh(expense)
    return serialize_expense(expense)


@app.get("/expenses", response_model=List[ExpenseOut])
def list_expenses(viewer: str | None = None, role: str | None = None, scope_user: str | None = None, db: Session = Depends(get_db)):
    expenses = scoped_query(db.query(Expense), Expense, db, viewer, role, scope_user).order_by(Expense.id.desc()).all()
    return [serialize_expense(item) for item in expenses]


@app.get("/dashboard", response_model=DashboardOut)
def dashboard(viewer: str | None = None, role: str | None = None, scope_user: str | None = None, db: Session = Depends(get_db)):
    lorry_query = scoped_query(db.query(Lorry), Lorry, db, viewer, role, scope_user)
    driver_query = scoped_query(db.query(Driver), Driver, db, viewer, role, scope_user)
    trip_query = scoped_query(db.query(Trip), Trip, db, viewer, role, scope_user)
    expense_query = scoped_query(db.query(Expense), Expense, db, viewer, role, scope_user)

    total_lorries = lorry_query.count() or 0
    total_drivers = driver_query.count() or 0
    running_trips = (
        trip_query
        .filter(Trip.status.notin_(["Delivered", "Trip Done"]))
        .count()
        or 0
    )

    trips = trip_query.all()
    expenses = expense_query.all()

    total_income = sum(item.load_price for item in trips)
    total_expenses = sum(expense_total(item) for item in expenses)
    total_profit = total_income - total_expenses

    return DashboardOut(
        total_lorries=total_lorries,
        total_drivers=total_drivers,
        running_trips=running_trips,
        total_income=total_income,
        total_expenses=total_expenses,
        total_profit=total_profit,
    )
