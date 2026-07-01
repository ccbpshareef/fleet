from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class DriverBase(BaseModel):
    name: str
    phone: str
    license_number: Optional[str] = None


class DriverCreate(DriverBase):
    login_identifier: Optional[str] = None
    password: Optional[str] = None


class DriverOut(DriverBase):
    id: int
    is_active: bool = True
    created_by: Optional[str] = None
    login_identifier: Optional[str] = None
    has_login: bool = False

    class Config:
        from_attributes = True


class DriverCreateOut(DriverOut):
    message: str = ""
    initial_password: Optional[str] = None
    login_auto_generated: bool = False
    password_auto_generated: bool = False


class LorryBase(BaseModel):
    vehicle_number: str
    current_location: Optional[str] = None
    driver_id: Optional[int] = None


class LorryCreate(LorryBase):
    pass


class LorryOut(LorryBase):
    id: int
    is_active: bool = True
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class TripBase(BaseModel):
    lorry_id: int
    driver_id: int
    load_type: Optional[str] = None
    load_weight: Optional[float] = None
    load_location: str
    unload_location: str
    contact_person_name: Optional[str] = None
    contact_person_phone: Optional[str] = None
    loading_date: Optional[date] = None
    unloading_date: Optional[date] = None
    distance_km: Optional[float] = None
    load_price: float = Field(ge=0)
    status: str = "Loading"


class TripCreate(TripBase):
    pass


class TripStatusUpdate(BaseModel):
    """Partial trip update: status, dates, and/or expense breakdown."""
    model_config = {"extra": "ignore"}

    status: Optional[str] = None
    loading_date: Optional[date] = None
    unloading_date: Optional[date] = None
    expense: Optional["TripExpenseUpdate"] = None


class TripExpenseUpdate(BaseModel):
    diesel: Optional[float] = None
    toll: Optional[float] = None
    driver_bata: Optional[float] = None
    driver_daily_wage: Optional[float] = None
    driver_commission_percent: Optional[float] = None
    driver_commission_amount: Optional[float] = None
    maintenance: Optional[float] = None
    other: Optional[float] = None


class TripUpdate(BaseModel):
    status: Optional[str] = None
    loading_date: Optional[date] = None
    unloading_date: Optional[date] = None


class ActiveStatusUpdate(BaseModel):
    is_active: bool


class TripOut(TripBase):
    id: int
    completed_at: Optional[datetime] = None
    total_expenses: float
    net_profit: float
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class ExpenseBase(BaseModel):
    trip_id: int
    diesel: float = 0
    toll: float = 0
    driver_bata: float = 0
    driver_daily_wage: float = 0
    driver_commission_percent: float = 0
    driver_commission_amount: float = 0
    maintenance: float = 0
    other: float = 0
    proof_images: list["ExpenseProofImage"] = []
    notes: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseOut(ExpenseBase):
    id: int
    total: float
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class ExpenseProofImage(BaseModel):
    category: str
    name: Optional[str] = None
    data_url: str


class DashboardOut(BaseModel):
    total_lorries: int
    total_drivers: int
    running_trips: int
    total_income: float
    total_expenses: float
    total_profit: float


class DriverAssignmentCreate(BaseModel):
    lorry_id: int
    driver_id: int
    assigned_at: Optional[datetime] = None
    daily_wage: float = 0
    commission_percent: float = 6
    notes: Optional[str] = None


class DriverAssignmentUpdate(BaseModel):
    driver_id: Optional[int] = None
    lorry_id: Optional[int] = None
    assigned_at: Optional[datetime] = None
    notes: Optional[str] = None


class DriverAssignmentComplete(BaseModel):
    completed_at: Optional[datetime] = None


class DriverAssignmentLeaveCreate(BaseModel):
    leave_start: date
    leave_end: date
    reason: Optional[str] = None


class DriverAssignmentLeaveOut(BaseModel):
    id: int
    assignment_id: int
    leave_start: date
    leave_end: date
    reason: Optional[str] = None
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class DriverAssignmentTripOut(BaseModel):
    trip_id: int
    route: str
    load_price: float = 0
    working_days: int = 0
    commission_percent: float = 0
    commission_amount: float = 0
    commission_eligible: bool = False
    loading_date: Optional[date] = None
    unloading_date: Optional[date] = None
    status: str = ""


class DriverAssignmentOut(BaseModel):
    id: int
    lorry_id: int
    driver_id: int
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    daily_wage: float = 0
    commission_percent: float = 0
    rates_locked: bool = True
    notes: Optional[str] = None
    status: str
    total_days: int = 0
    leave_days: int = 0
    working_days: int = 0
    total_transport_amount: float = 0
    wage_amount: float = 0
    commission_amount: float = 0
    total_earning: float = 0
    commission_transport_threshold: float = 120_000
    commission_eligible: bool = False
    gap_days_before: int = 0
    is_current_stint: bool = False
    driver_accepted: bool = False
    driver_accepted_at: Optional[datetime] = None
    earnings_visible: bool = False
    trips: list[DriverAssignmentTripOut] = []
    leaves: list[DriverAssignmentLeaveOut] = []
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: int
    recipient: str
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    event_type: str
    title: str
    message: str
    related_type: Optional[str] = None
    related_id: Optional[int] = None
    is_read: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class DriverTripHistoryItem(BaseModel):
    trip_id: int
    lorry_id: int
    lorry_number: Optional[str] = None
    route: str
    status: str
    working_days: int = 0
    transport_amount: float = 0
    commission_amount: float = 0
    commission_eligible: bool = False
    trip_total_earning: float = 0
    load_price: float
    trip_expenses: float
    driver_earned: float
    company_net: float
    completed_at: Optional[datetime] = None


class DriverHistoryOut(BaseModel):
    driver_id: int
    driver_name: str
    is_active: bool
    total_trips: int
    total_working_days: int = 0
    total_transport_amount: float = 0
    total_commission_amount: float = 0
    total_driver_earning: float
    total_company_net: float
    total_assignment_wage: float = 0
    total_assignment_commission: float = 0
    total_assignment_earning: float = 0
    commission_transport_threshold: float = 120_000
    assignments: list[DriverAssignmentOut] = []
    trips: list[DriverTripHistoryItem]


class LorryTripHistoryItem(BaseModel):
    trip_id: int
    driver_id: int
    driver_name: Optional[str] = None
    route: str
    status: str
    load_price: float
    trip_expenses: float
    lorry_profit: float
    completed_at: Optional[datetime] = None


class LorryHistoryOut(BaseModel):
    lorry_id: int
    vehicle_number: str
    is_active: bool
    total_trips: int
    total_income: float
    total_expenses: float
    total_profit: float
    trips: list[LorryTripHistoryItem]


class UserAccountListItem(BaseModel):
    identifier: str
    role: str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    identifier: str
    password: str
    role: Optional[str] = None


class LoginResponse(BaseModel):
    identifier: str
    role: str
    driver_id: Optional[int] = None
    fleet_owner: Optional[str] = None
    acting_as_admin: Optional[str] = None


class LoginAsUserRequest(BaseModel):
    target_identifier: str


class ForgotPasswordRequest(BaseModel):
    identifier: str
    new_password: str


class RegisterUserRequest(BaseModel):
    identifier: str
    phone: str
    email: str
    preferred_language: str = "en"
    password: str
    confirm_password: str
    full_name: Optional[str] = None


class RegisterUserResponse(LoginResponse):
    message: str = ""


class UserIdCheckResponse(BaseModel):
    identifier: str
    available: bool
    suggestions: List[str] = []
    message: str = ""


class UserProfileCreate(BaseModel):
    identifier: str
    role: str
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    profile_image_url: Optional[str] = None
    preferred_language: str = "en"


class UserProfileOut(UserProfileCreate):
    id: int

    class Config:
        from_attributes = True


ExpenseBase.model_rebuild()
