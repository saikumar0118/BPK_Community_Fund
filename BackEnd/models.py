"""
================================================================================
BPK Community Fund - Database Models (SQLAlchemy ORM)
================================================================================
Defines database tables and schema relationships for the entire application.
These models map directly to MySQL tables in 'pbk_db' and back all API
endpoints across the Admin, Member, and Authentication portals.

Model Summary & Linked Frontend Views:
  1. Member               -> Member Portal (Profile, Dashboard), Admin Members Tab, Auth
  2. Admin                -> Admin Portal, Admin Authentication
  3. AdminInvitation      -> Admin Registration / Invitation System
  4. RegistrationOTP      -> Registration & Account Deletion OTP Verification
  5. Fund                 -> Admin Funds Tab, Member Fund Details View
  6. FundUsage            -> Admin Funds Tab (Expenses / Usage Breakdown)
  7. Cause                -> Admin Cases & Events Tab, Member Cases View
  8. Contribution         -> Member Contribute Tab, Member My Contributions, Admin Receipts
  9. Announcement         -> Admin Announcements Tab, Member Headbar Notification Bell
 10. ActivityLog          -> Admin Active Login / Activity Logs Tab
 11. MemberDocument       -> Member Profile Document Verification
 12. PasswordResetRequest -> Auth Portal (Forgot Password / OTP Reset)
 13. DeletedRecord        -> Admin Recycle Bin Tab (30-day Soft Deletion & Restore)
================================================================================
"""

from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, Date, Numeric, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


# ==============================================================================
# 1. MEMBER MODEL
# Table: 'members'
# Linked Views:
#   - Member Portal: Profile Tab, Dashboard, Security (Delete Account)
#   - Admin Portal: Members Tab (List, Filter, Search, Soft-Delete)
#   - Auth Portal: Member Login, Member Registration
# ==============================================================================
class Member(Base):
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)

    # Personal Information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100))
    gender = Column(Enum("M", "F", "N"), nullable=False)

    # Contact Details
    phone = Column(String(20), unique=True, nullable=False)
    email = Column(String(150))
    dob = Column(String(50))

    # Address Details
    door_no = Column(String(50))
    state = Column(String(100))
    district = Column(String(100))
    city = Column(String(100))
    village = Column(String(100))
    address = Column(Text)

    # Authentication & Security
    password_hash = Column(String(255), nullable=False)
    status = Column(Enum("active", "inactive"), default="active")

    # Soft-deletion & 30-Day Retention Workflow
    is_deleted = Column(Boolean, default=False)
    scheduled_deletion_at = Column(DateTime, nullable=True)
    deletion_reason = Column(String(255), nullable=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ==============================================================================
# 2. ADMIN MODEL
# Table: 'admins'
# Linked Views:
#   - Admin Portal: Global admin authentication, permissions, activity logging
#   - Auth Portal: Admin Login, Admin Register (via valid Invitation Code)
# ==============================================================================
class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)

    # Personal Information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100))
    gender = Column(Enum("M", "F", "N"), nullable=False)

    # Contact Details
    phone = Column(String(20), unique=True, nullable=False)
    email = Column(String(150), unique=True, nullable=False)

    # Location Details
    state = Column(String(100))
    district = Column(String(100))
    city = Column(String(100))
    village = Column(String(100))
    address = Column(Text)

    # Security & Role
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="Super Admin")
    status = Column(Enum("active", "inactive"), default="active")

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ==============================================================================
# 3. ADMIN INVITATION MODEL
# Table: 'admin_invitations'
# Linked Views:
#   - Admin Portal: Settings / Admin Management (Generate invite codes)
#   - Auth Portal: Admin Registration (Validate invite code token)
# ==============================================================================
class AdminInvitation(Base):
    __tablename__ = "admin_invitations"

    id = Column(Integer, primary_key=True, index=True)
    invitation_code_hash = Column(String(64), unique=True, nullable=False)
    role = Column(String(50), default="Admin")
    expires_at = Column(DateTime, nullable=False)
    status = Column(Enum("Pending", "Used", "Expired", "Revoked"), default="Pending")
    created_by_admin_id = Column(Integer, nullable=True)
    used_by_admin_id = Column(Integer, nullable=True)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


# ==============================================================================
# 4. REGISTRATION & VERIFICATION OTP MODEL
# Table: 'registration_otps'
# Linked Views:
#   - Auth Portal: Member / Admin Registration phone & email verification
#   - Member Portal: Security Tab (Account self-deletion OTP verification)
# ==============================================================================
class RegistrationOTP(Base):
    __tablename__ = "registration_otps"

    id = Column(Integer, primary_key=True, index=True)
    user_type = Column(Enum("Member", "Admin"), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(150), nullable=True)
    otp_type = Column(Enum("Phone", "Email"), nullable=False)
    otp_code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    status = Column(Enum("Pending", "Verified", "Expired", "Used"), default="Pending")
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


# ==============================================================================
# 5. FUND MODEL
# Table: 'funds'
# Linked Views:
#   - Admin Portal: Funds Tab (Create, edit, toggle, soft-delete funds)
#   - Member Portal: Fund Details View, Contribute Tab (Select target fund)
# ==============================================================================
class Fund(Base):
    __tablename__ = "funds"

    id = Column(Integer, primary_key=True, index=True)
    financial_year = Column(String(20), nullable=False)
    name = Column(String(150), nullable=False)
    target_amount = Column(Numeric(12, 2), default=0.00)
    status = Column(Enum("Active", "Inactive", "Completed"), default="Active")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ==============================================================================
# 6. FUND USAGE MODEL
# Table: 'fund_usage'
# Linked Views:
#   - Admin Portal: Funds Tab -> Fund Usage breakdown / expense management
#   - Member Portal: Fund Details View (Transparency of spent funds)
# ==============================================================================
class FundUsage(Base):
    __tablename__ = "fund_usage"

    id = Column(Integer, primary_key=True, index=True)
    fund_id = Column(Integer, ForeignKey("funds.id"), nullable=False)
    usage_date = Column(Date, nullable=False)
    fund_type = Column(String(100), nullable=True)
    purpose = Column(String(255), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(Enum("Pending", "Approved", "Completed", "Cancelled"), default="Pending")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationship to Fund parent model
    fund = relationship("Fund", backref="usages")


# ==============================================================================
# 7. CAUSE MODEL (Cases & Events)
# Table: 'causes'
# Linked Views:
#   - Admin Portal: Cases & Events Tab (Create, publish, manage specific causes)
#   - Member Portal: Cases & Events View, Member Notification click redirect
# ==============================================================================
class Cause(Base):
    __tablename__ = "causes"

    id = Column(Integer, primary_key=True, index=True)
    cause_code = Column(String(50), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    target_per_member = Column(Numeric(12, 2), default=0.00)
    target_amount = Column(Numeric(12, 2), default=0.00)
    raised_amount = Column(Numeric(12, 2), default=0.00)
    status = Column(Enum("Draft", "Published", "Completed", "Cancelled"), default="Draft")
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ==============================================================================
# 8. CONTRIBUTION MODEL
# Table: 'contributions'
# Linked Views:
#   - Member Portal: Contribute Tab (Submit donation with dynamic QR / UPI)
#   - Member Portal: My Contributions Tab (History, download receipts)
#   - Admin Portal: Receipts Tab, Overview KPI metrics (Total collections)
# ==============================================================================
class Contribution(Base):
    __tablename__ = "contributions"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)
    contribution_amount = Column(Numeric(12, 2), nullable=False)
    contribution_type = Column(String(100), nullable=True)
    fund_name = Column(String(150), nullable=True)
    contribution_date = Column(Date, nullable=False)
    payment_method = Column(String(50), nullable=True)
    transaction_reference = Column(String(100), nullable=True)
    receipt_number = Column(String(100), unique=True, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(Enum("pending", "completed", "cancelled", "rejected"), default="pending")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationship to Member model
    member = relationship("Member", backref="contributions")


# ==============================================================================
# 9. ANNOUNCEMENT MODEL
# Table: 'announcements'
# Linked Views:
#   - Admin Portal: Announcements Tab (Create, publish, archive announcements)
#   - Member Portal: Headbar Notification Bell & Dropdown (Live alerts & badges)
# ==============================================================================
class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    announcement_type = Column(String(50), nullable=True)
    status = Column(Enum("Draft", "Published", "Archived"), default="Draft")
    publish_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ==============================================================================
# 10. ACTIVITY LOG MODEL
# Table: 'activity_logs'
# Linked Views:
#   - Admin Portal: Active Login / Activity Logs Tab (Audit trail of all actions)
# ==============================================================================
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_type = Column(Enum("Admin", "Member"), nullable=False)
    user_id = Column(Integer, nullable=False)
    action = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


# ==============================================================================
# 11. MEMBER DOCUMENT MODEL
# Table: 'member_documents'
# Linked Views:
#   - Member Portal: Profile Tab (Upload identity proof, address proof)
#   - Admin Portal: Members Tab -> View Documents modal / verify status
# ==============================================================================
class MemberDocument(Base):
    __tablename__ = "member_documents"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)
    document_type = Column(String(100), nullable=False)
    document_name = Column(String(255), nullable=False)
    document_path = Column(String(500), nullable=True)
    verification_status = Column(Enum("Pending", "Verified", "Rejected"), default="Pending")
    uploaded_at = Column(DateTime, server_default=func.now())
    verified_at = Column(DateTime, nullable=True)

    # Relationship to Member model
    member = relationship("Member", backref="documents")


# ==============================================================================
# 12. PASSWORD RESET REQUEST MODEL
# Table: 'password_reset_requests'
# Linked Views:
#   - Auth Portal: Forgot Password / Password Reset workflow via OTP
# ==============================================================================
class PasswordResetRequest(Base):
    __tablename__ = "password_reset_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_type = Column(Enum("Admin", "Member"), nullable=False)
    user_id = Column(Integer, nullable=False)
    verification_code = Column(String(10), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    status = Column(Enum("Pending", "Verified", "Used", "Expired"), default="Pending")
    created_at = Column(DateTime, server_default=func.now())


# ==============================================================================
# 13. DELETED RECORD MODEL (Recycle Bin / 30-Day Soft Retention Audit)
# Table: 'deleted_records'
# Linked Views:
#   - Admin Portal: Recycle Bin Tab (View soft-deleted members/funds, restore records)
#   - Member Portal: Security Tab (Deactivated accounts placed in 30-day retention)
# ==============================================================================
class DeletedRecord(Base):
    __tablename__ = "deleted_records"

    id = Column(Integer, primary_key=True, index=True)
    record_type = Column(String(50), nullable=False)  # 'Member', 'Fund', etc.
    record_id = Column(Integer, nullable=False)
    record_name = Column(String(150), nullable=True)
    record_data = Column(Text, nullable=False)       # Full JSON snapshot for restoration
    deleted_by = Column(String(100), default="Admin")
    reason = Column(String(255), nullable=True)
    deleted_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)      # 30 days after deletion date
    status = Column(String(20), default="Pending")    # 'Pending' or 'Restored'
    restored_at = Column(DateTime, nullable=True)