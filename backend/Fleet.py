from fastapi import APIRouter, Request

from FleetController import FleetController

router = APIRouter()


@router.get("/health")
async def health():
    return await FleetController.api_health()


# Auth
@router.post("/auth/login")
async def login(request: Request):
    return await FleetController.api_login(request)


@router.post("/auth/login-as-user")
async def login_as_user(request: Request):
    return await FleetController.api_login_as_user(request)


@router.post("/auth/forgot-password")
async def forgot_password(request: Request):
    return await FleetController.api_forgot_password(request)


@router.get("/auth/check-user-id")
async def check_user_id(request: Request):
    return await FleetController.api_check_user_id(request)


@router.post("/auth/register-user")
async def register_user(request: Request):
    return await FleetController.api_register_user(request)


# Users / profile
@router.get("/users")
async def list_users(request: Request):
    return await FleetController.api_list_users(request)


@router.get("/user-profile")
async def get_user_profile(request: Request):
    return await FleetController.api_get_user_profile(request)


@router.post("/user-profile")
async def save_user_profile(request: Request):
    return await FleetController.api_save_user_profile(request)


# Dashboard
@router.get("/dashboard")
async def fleet_dashboard(request: Request):
    return await FleetController.api_fleet_dashboard(request)


# Drivers
@router.get("/drivers")
async def list_drivers(request: Request):
    return await FleetController.api_list_drivers(request)


@router.post("/drivers")
async def create_driver(request: Request):
    return await FleetController.api_create_driver(request)


@router.get("/drivers/me")
async def get_my_driver(request: Request):
    return await FleetController.api_get_my_driver(request)


@router.patch("/drivers/{driver_id}/status")
async def update_driver_status(request: Request, driver_id: int):
    return await FleetController.api_update_driver_status(request, driver_id)


@router.delete("/drivers/{driver_id}")
async def delete_driver(request: Request, driver_id: int):
    return await FleetController.api_delete_driver(request, driver_id)


@router.get("/drivers/{driver_id}/history")
async def driver_history(request: Request, driver_id: int):
    return await FleetController.api_driver_history(request, driver_id)


# Lorries
@router.get("/lorries")
async def list_lorries(request: Request):
    return await FleetController.api_list_lorries(request)


@router.post("/lorries")
async def create_lorry(request: Request):
    return await FleetController.api_create_lorry(request)


@router.patch("/lorries/{lorry_id}/status")
async def update_lorry_status(request: Request, lorry_id: int):
    return await FleetController.api_update_lorry_status(request, lorry_id)


@router.delete("/lorries/{lorry_id}")
async def delete_lorry(request: Request, lorry_id: int):
    return await FleetController.api_delete_lorry(request, lorry_id)


@router.get("/lorries/{lorry_id}/history")
async def lorry_history(request: Request, lorry_id: int):
    return await FleetController.api_lorry_history(request, lorry_id)


# Trips
@router.get("/trips")
async def list_trips(request: Request):
    return await FleetController.api_list_trips(request)


@router.post("/trips")
async def create_trip(request: Request):
    return await FleetController.api_create_trip(request)


@router.patch("/trips/{trip_id}/status")
async def update_trip_status(request: Request, trip_id: int):
    return await FleetController.api_update_trip_status(request, trip_id)


# Expenses
@router.get("/expenses")
async def list_expenses(request: Request):
    return await FleetController.api_list_expenses(request)


@router.post("/expenses")
async def create_expense(request: Request):
    return await FleetController.api_create_expense(request)


# Driver assignments
@router.get("/driver-assignments")
async def list_driver_assignments(request: Request):
    return await FleetController.api_list_driver_assignments(request)


@router.post("/driver-assignments")
async def create_driver_assignment(request: Request):
    return await FleetController.api_create_driver_assignment(request)


@router.patch("/driver-assignments/{assignment_id}")
async def update_driver_assignment(request: Request, assignment_id: int):
    return await FleetController.api_update_driver_assignment(request, assignment_id)


@router.patch("/driver-assignments/{assignment_id}/complete")
async def complete_driver_assignment(request: Request, assignment_id: int):
    return await FleetController.api_complete_driver_assignment(request, assignment_id)


@router.post("/driver-assignments/{assignment_id}/leaves")
async def add_driver_assignment_leave(request: Request, assignment_id: int):
    return await FleetController.api_add_driver_assignment_leave(request, assignment_id)


@router.post("/driver-assignments/{assignment_id}/accept")
async def accept_driver_assignment(request: Request, assignment_id: int):
    return await FleetController.api_accept_driver_assignment(request, assignment_id)


# Notifications
@router.get("/notifications")
async def list_notifications(request: Request):
    return await FleetController.api_list_notifications(request)


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(request: Request, notification_id: int):
    return await FleetController.api_mark_notification_read(request, notification_id)


@router.post("/notifications/read-all")
async def mark_all_notifications_read(request: Request):
    return await FleetController.api_mark_all_notifications_read(request)


@router.delete("/notifications")
async def clear_notifications(request: Request):
    return await FleetController.api_clear_notifications(request)
