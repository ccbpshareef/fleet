from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False, unique=True)
    license_number = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String, nullable=True, index=True)

    lorries = relationship("Lorry", back_populates="driver")
    trips = relationship("Trip", back_populates="driver")
    assignments = relationship("DriverAssignment", back_populates="driver")


class Lorry(Base):
    __tablename__ = "lorries"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String, nullable=False, unique=True, index=True)
    current_location = Column(String, nullable=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String, nullable=True, index=True)

    driver = relationship("Driver", back_populates="lorries")
    trips = relationship("Trip", back_populates="lorry")
    assignments = relationship("DriverAssignment", back_populates="lorry")


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    lorry_id = Column(Integer, ForeignKey("lorries.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    load_type = Column(String, nullable=True)
    load_weight = Column(Float, nullable=True)
    load_location = Column(String, nullable=False)
    unload_location = Column(String, nullable=False)
    contact_person_name = Column(String, nullable=True)
    contact_person_phone = Column(String, nullable=True)
    loading_date = Column(Date, nullable=True)
    unloading_date = Column(Date, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    distance_km = Column(Float, nullable=True)
    load_price = Column(Float, nullable=False, default=0.0)
    status = Column(String, nullable=False, default="Loading")
    created_by = Column(String, nullable=True, index=True)

    lorry = relationship("Lorry", back_populates="trips")
    driver = relationship("Driver", back_populates="trips")
    expenses = relationship(
        "Expense", back_populates="trip", cascade="all, delete-orphan"
    )


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False, index=True)
    diesel = Column(Float, nullable=False, default=0.0)
    toll = Column(Float, nullable=False, default=0.0)
    driver_bata = Column(Float, nullable=False, default=0.0)
    driver_daily_wage = Column(Float, nullable=False, default=0.0)
    driver_commission_percent = Column(Float, nullable=False, default=0.0)
    driver_commission_amount = Column(Float, nullable=False, default=0.0)
    maintenance = Column(Float, nullable=False, default=0.0)
    other = Column(Float, nullable=False, default=0.0)
    proof_images_json = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_by = Column(String, nullable=True, index=True)

    trip = relationship("Trip", back_populates="expenses")


class DriverAssignment(Base):
    __tablename__ = "driver_assignments"

    id = Column(Integer, primary_key=True, index=True)
    lorry_id = Column(Integer, ForeignKey("lorries.id"), nullable=False, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False, index=True)
    assigned_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    daily_wage = Column(Float, nullable=False, default=0.0)
    commission_percent = Column(Float, nullable=False, default=0.0)
    notes = Column(String, nullable=True)
    status = Column(String, nullable=False, default="Active")
    created_by = Column(String, nullable=True, index=True)

    lorry = relationship("Lorry", back_populates="assignments")
    driver = relationship("Driver", back_populates="assignments")
    leaves = relationship(
        "DriverAssignmentLeave",
        back_populates="assignment",
        cascade="all, delete-orphan",
    )


class DriverAssignmentLeave(Base):
    __tablename__ = "driver_assignment_leaves"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("driver_assignments.id"), nullable=False, index=True)
    leave_start = Column(Date, nullable=False)
    leave_end = Column(Date, nullable=False)
    reason = Column(String, nullable=True)
    created_by = Column(String, nullable=True, index=True)

    assignment = relationship("DriverAssignment", back_populates="leaves")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    identifier = Column(String, nullable=False, unique=True, index=True)
    role = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    profile_image_url = Column(String, nullable=True)
    preferred_language = Column(String, nullable=False, default="en")


class UserAccount(Base):
    __tablename__ = "user_accounts"

    id = Column(Integer, primary_key=True, index=True)
    identifier = Column(String, nullable=False, unique=True, index=True)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True, index=True)
