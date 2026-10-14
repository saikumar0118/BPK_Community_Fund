"""
================================================================================
BPK Community Fund - Pydantic Request & Response Schemas
================================================================================
Defines strongly-typed data validation and serialization models for all
FastAPI endpoints. Schemas are organized by functional domain and mapped
to their corresponding frontend tabs and views.

Schema Domain Index:
  1. Authentication & Registration -> HomeLogRegisPass (Login & Register Tabs)
  2. Password Recovery (Forgot Pwd) -> HomeLogRegisPass (Forgot Password Modal)
  3. Generic OTP Operations        -> Auth Registration Verification Flow
  4. Contribution & Donation       -> Member Contribute & Admin Receipts Tabs
  5. Fund Management               -> Admin Funds & Member Fund Details Tabs
  6. Causes & Events               -> Admin Cases/Events & Member Cases Tabs
  7. Announcements                 -> Admin Announcements & Member Bell Alerts
  8. Member Profile                -> Member Profile Tab (Personal & Address Info)
  9. Admin Dashboard Statistics    -> Admin Overview Tab (KPI Cards & Charts)
 10. Fund Usage / Expense Tracking -> Admin Funds Tab (Fund Usage Modal)
 11. Admin Member Operations       -> Admin Members Tab (Add/Edit Modal)
 12. Member Security & Contact     -> Member Profile Tab (Security Settings)
 13. Admin Invitations             -> Admin Settings & Admin Registration
 14. Member Account Lifecycle      -> Member Profile (Account Deletion & 30-Day Retention)
================================================================================
"""

from pydantic import BaseModel, EmailStr


# ==============================================================================
# 1. AUTHENTICATION & REGISTRATION SCHEMAS
# Linked Views: HomeLogRegisPass.html (Login & Register tabs)
# ==============================================================================

class MemberRegister(BaseModel):
    """Payload for registering a new community member."""
    first_name: str
    last_name: str | None = None
    gender: str
    phone: str
    email: EmailStr | None = None
    state: str | None = None
    district: str | None = None
    city: str | None = None
    village: str | None = None
    address: str | None = None
    password: str


class MemberLogin(BaseModel):
    """Payload for authenticating a member via phone/email and password."""
    username: str
    password: str


class AdminRegister(BaseModel):
    """Payload for registering a new administrator using an invitation code."""
    invitation_code: str
    first_name: str
    last_name: str | None = None
    gender: str
    phone: str
    email: EmailStr
    phone_otp: str | None = None
    email_otp: str | None = None
    state: str | None = None
    district: str | None = None
    city: str | None = None
    village: str | None = None
    address: str | None = None
    password: str


class AdminLogin(BaseModel):
    """Payload for authenticating an administrator via phone/email and password."""
    username: str
    password: str


# ==============================================================================
# 2. PASSWORD RECOVERY & CHANGE SCHEMAS
# Linked Views: HomeLogRegisPass (Forgot Password) & Member Profile (Security)
# ==============================================================================

class ChangePassword(BaseModel):
    """Payload for changing password using old password or verification OTP."""
    username: str
    current_password: str | None = None
    new_password: str
    user_type: str | None = "Member"
    otp_id: int | None = None
    otp_code: str | None = None


class PasswordResetSendOtp(BaseModel):
    """Request OTP delivery for password reset (via SMS or Email)."""
    identifier: str
    otp_type: str = "Phone"
    user_type: str | None = None


class PasswordResetVerifyAndChange(BaseModel):
    """Verify OTP and apply new password in password recovery flow."""
    identifier: str
    otp_id: int
    otp_code: str
    new_password: str
    user_type: str | None = None


# ==============================================================================
# 3. GENERIC OTP SCHEMAS
# Linked Views: HomeLogRegisPass (Registration SMS/Email verification step)
# ==============================================================================

class OTPSendRequest(BaseModel):
    """Generic request to generate and dispatch a 6-digit OTP."""
    user_type: str  # "Member" or "Admin"
    otp_type: str   # "Phone" or "Email"
    phone: str | None = None
    email: EmailStr | str | None = None


class OTPVerifyRequest(BaseModel):
    """Generic request to validate a previously sent 6-digit OTP."""
    otp_id: int
    otp_code: str


# ==============================================================================
# 4. CONTRIBUTION & DONATION SCHEMAS
# Linked Views:
#   - Member Portal: Contribute Tab (Submit donation with dynamic QR)
#   - Member Portal: My Contributions Tab (History table & receipts)
#   - Admin Portal: Receipts Tab (Verify, search, filter contributions)
# ==============================================================================

class ContributionCreate(BaseModel):
    """Payload when a member initiates or records a community contribution."""
    contribution_amount: float
    fund_name: str
    contribution_type: str | None = "General"
    payment_method: str | None = "UPI"
    transaction_reference: str | None = None
    notes: str | None = None
    contribution_date: str | None = None
    status: str | None = "pending"


class ContributionOut(BaseModel):
    """Response model for displaying contribution details and receipt data."""
    id: int
    member_id: int
    contribution_amount: float
    contribution_type: str | None = None
    fund_name: str | None = None
    contribution_date: str | None = None
    payment_method: str | None = None
    transaction_reference: str | None = None
    receipt_number: str | None = None
    notes: str | None = None
    status: str | None = "pending"
    member_name: str | None = None

    class Config:
        from_attributes = True


# ==============================================================================
# 5. FUND MANAGEMENT SCHEMAS
# Linked Views:
#   - Admin Portal: Funds Tab (Create, update, monitor funds)
#   - Member Portal: Fund Details View & Contribute Tab fund selector
# ==============================================================================

class FundCreate(BaseModel):
    """Payload to create a new community fund target."""
    financial_year: str
    name: str
    target_amount: float = 0.0
    status: str | None = "Active"


class FundUpdate(BaseModel):
    """Payload to update an existing fund's target or status."""
    name: str | None = None
    target_amount: float | None = None
    status: str | None = None
    financial_year: str | None = None


class FundOut(BaseModel):
    """Response model for fund details including collected and spent sums."""
    id: int
    financial_year: str
    name: str
    target_amount: float
    collected_amount: float = 0.0
    used_amount: float = 0.0
    status: str

    class Config:
        from_attributes = True


# ==============================================================================
# 6. CAUSES & EVENTS SCHEMAS
# Linked Views:
#   - Admin Portal: Cases & Events Tab (Create, publish, edit causes)
#   - Member Portal: Cases & Events View (Browse causes, progress bars)
# ==============================================================================

class CauseCreate(BaseModel):
    """Payload to create a new community cause or emergency relief event."""
    cause_code: str
    name: str
    description: str | None = None
    target_per_member: float = 0.0
    target_amount: float = 0.0
    status: str | None = "Draft"


class CauseUpdate(BaseModel):
    """Payload to modify cause details, targets, or publication status."""
    name: str | None = None
    description: str | None = None
    target_per_member: float | None = None
    target_amount: float | None = None
    status: str | None = None


class CauseOut(BaseModel):
    """Response model returning cause target, raised amount, and status."""
    id: int
    cause_code: str
    name: str
    description: str | None = None
    target_per_member: float = 0.0
    target_amount: float
    raised_amount: float = 0.0
    status: str

    class Config:
        from_attributes = True


# ==============================================================================
# 7. ANNOUNCEMENT SCHEMAS
# Linked Views:
#   - Admin Portal: Announcements Tab (Draft and publish broadcasts)
#   - Member Portal: Headbar Notification Bell & Dropdown Alerts
# ==============================================================================

class AnnouncementCreate(BaseModel):
    """Payload to post a new announcement broadcast."""
    title: str
    message: str
    announcement_type: str | None = "General"
    status: str | None = "Published"


class AnnouncementUpdate(BaseModel):
    """Payload to update announcement content or archive status."""
    title: str | None = None
    message: str | None = None
    announcement_type: str | None = None
    status: str | None = None


class AnnouncementOut(BaseModel):
    """Response model returning announcement item for feeds and alerts."""
    id: int
    title: str
    message: str
    announcement_type: str | None = None
    status: str
    publish_date: str | None = None

    class Config:
        from_attributes = True


# ==============================================================================
# 8. MEMBER PROFILE SCHEMAS
# Linked Views: Member Portal -> Profile Tab (Personal & Address details)
# ==============================================================================

class MemberProfileUpdate(BaseModel):
    """Payload for members updating their personal and location information."""
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | str | None = None
    phone: str | None = None
    dob: str | None = None
    door_no: str | None = None
    state: str | None = None
    district: str | None = None
    city: str | None = None
    village: str | None = None
    address: str | None = None


# ==============================================================================
# 9. ADMIN DASHBOARD STATS SCHEMAS
# Linked Views: Admin Portal -> Overview Tab (KPI summary metrics)
# ==============================================================================

class AdminDashboardStats(BaseModel):
    """Summary metrics returned to populate the Admin Overview dashboard."""
    total_members: int
    total_contributions_amount: float
    total_contributions_count: int
    active_funds_count: int
    published_causes_count: int
    recent_contributions: list[dict] = []


# ==============================================================================
# 10. FUND USAGE / EXPENSE TRACKING SCHEMAS
# Linked Views: Admin Portal -> Funds Tab (Fund Usage / Expenses modal)
# ==============================================================================

class FundUsageCreate(BaseModel):
    """Payload to record an expense disbursement from a community fund."""
    fund_id: int | None = None
    fund_type: str | None = None
    usage_date: str | None = None
    purpose: str
    amount: float
    status: str | None = "Completed"
    notes: str | None = None


class FundUsageUpdate(BaseModel):
    """Payload to modify an existing expense entry."""
    fund_id: int | None = None
    fund_type: str | None = None
    usage_date: str | None = None
    purpose: str | None = None
    amount: float | None = None
    status: str | None = None
    notes: str | None = None


# ==============================================================================
# 11. ADMIN MEMBER MANAGEMENT SCHEMAS
# Linked Views: Admin Portal -> Members Tab (Add Member / Edit Member modals)
# ==============================================================================

class MemberAdminCreate(BaseModel):
    """Payload when an administrator manually registers a new member."""
    first_name: str
    last_name: str | None = None
    gender: str = "M"
    phone: str
    email: str | None = None
    dob: str | None = None
    member_type: str | None = "General"
    status: str | None = "active"
    password: str | None = None


class MemberAdminUpdate(BaseModel):
    """Payload when an administrator modifies member details or status."""
    first_name: str | None = None
    last_name: str | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    dob: str | None = None
    member_type: str | None = None
    status: str | None = None


# ==============================================================================
# 12. MEMBER SECURITY & CONTACT UPDATE SCHEMAS
# Linked Views: Member Portal -> Profile Tab -> Security Settings sub-panel
# ==============================================================================

class MemberPasswordChange(BaseModel):
    """Payload for authenticated members updating their login password."""
    current_password: str | None = None
    new_password: str
    otp_id: int | None = None
    otp_code: str | None = None


class MemberPhoneOtpSend(BaseModel):
    """Request OTP verification to change primary mobile number."""
    new_phone: str


class MemberPhoneOtpVerify(BaseModel):
    """Confirm OTP verification to finalize new mobile number."""
    new_phone: str
    otp_id: int
    otp_code: str


class MemberEmailOtpSend(BaseModel):
    """Request OTP verification to change primary email address."""
    new_email: str


class MemberEmailOtpVerify(BaseModel):
    """Confirm OTP verification to finalize new email address."""
    new_email: str
    otp_id: int
    otp_code: str


# ==============================================================================
# 13. ADMIN INVITATION SCHEMAS
# Linked Views: Admin Portal -> Settings Tab & Auth Portal Admin Registration
# ==============================================================================

class AdminInvitationGenerate(BaseModel):
    """Payload to generate a new cryptographic administrator invitation token."""
    role: str = "Admin"
    admin_id: int | None = None


# ==============================================================================
# 14. MEMBER ACCOUNT LIFECYCLE SCHEMAS (Deactivation, Deletion & 30-Day Retention)
# Linked Views:
#   - Member Portal: Profile Tab -> Security -> Delete My Account modal
#   - Admin Portal: Recycle Bin Tab (Soft-deleted records snapshot and restore)
# ==============================================================================

class MemberDisableAccount(BaseModel):
    """Payload to temporarily deactivate a member account."""
    reason: str | None = None
    password: str | None = None


class MemberDeleteOtpSend(BaseModel):
    """Request 6-digit OTP delivery for confirming account deletion."""
    otp_channel: str = "Phone"  # "Phone" or "Email"


class MemberDeleteConfirm(BaseModel):
    """Submit 6-digit OTP to confirm member account deletion into 30-day retention."""
    otp_id: int
    otp_code: str
    reason: str | None = None


class MemberSelfRestore(BaseModel):
    """Allow a deactivated or scheduled member to restore their account."""
    member_id: int
    password: str | None = None