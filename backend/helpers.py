"""Shared helpers for the Fleet FastAPI service."""

import json
from typing import Any

from fastapi.responses import JSONResponse


def logger(message: str, log_level: str = "INFO") -> None:
    print(f"[{log_level}] {message}")


def make_json_response(data: dict, code: int = 200) -> JSONResponse:
    if not isinstance(data, dict):
        data = {}
    payload = dict(data)
    payload["statusCode"] = code
    return JSONResponse(
        content=json.loads(json.dumps(payload, default=str)),
        status_code=code,
    )


async def get_request_body(request) -> dict[str, Any]:
    try:
        data = await request.json()
        return data if isinstance(data, dict) else {}
    except Exception:
        raw = (await request.body()).decode("utf-8", errors="replace")
        if not raw or not raw.strip():
            return {}
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}


def get_auth_params(request) -> tuple[str | None, str | None, str | None]:
    return (
        (request.query_params.get("viewer") or "").strip() or None,
        (request.query_params.get("role") or "").strip() or None,
        (request.query_params.get("scope_user") or "").strip() or None,
    )
