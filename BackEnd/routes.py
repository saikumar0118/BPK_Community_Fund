"""
================================================================================
BPK Community Fund - FastAPI REST API Router (routes.py)
================================================================================
Defines all backend REST API endpoints across the system, structured by
functional domain and directly mapped to their respective frontend tabs.

API Section Index & Linked Frontend Tabs:
  Section 1:  Helper Utilities & Security Resolvers
  Section 2:  Member Authentication & Registration   -> HomeLogRegisPass (Member Tabs)
  Section 3:  Admin Authentication & Registration    -> HomeLogRegisPass (Admin Tabs)
  Section 4:  Password Recovery & Reset via OTP      -> HomeLogRegisPass (Forgot Password)
  Section 5:  Admin Invitation Codes Management      -> Admin Settings Tab
  Section 6:  Registration OTP Verification         -> Auth Portal Signup Flow
  Section 7:  Funds Management                       -> Admin Funds & Member Fund Details
  Section 8:  Causes / Cases & Events                -> Admin Cases/Events & Member Cases
  Section 9:  Announcements & Broadcasts            -> Admin Announcements & Member Bell
  Section 10: Contributions & Donation Processing    -> Member Contribute & Admin Receipts
  Section 11: Member Directory & Profile             -> Admin Members & Member Profile Tab
  Section 12: Member Security & Contact Changes      -> Member Profile (Security Settings)
  Section 13: Member Account Lifecycle & Retention   -> Member Profile (Account Deletion)
  Section 14: Admin Dashboard Metrics & Statistics   -> Admin Overview Tab
  Section 15: Admin Activity & Audit Logs            -> Admin Active Login / Activity Tab
  Section 16: Fund Updates & Soft Deletion           -> Admin Funds Tab
  Section 17: Fund Usage / Expenses Breakdown        -> Admin Funds Tab (Usage Modal)
  Section 18: Cause & Announcement Updates / Deletion-> Admin Cases & Announcements Tabs
  Section 19: Admin Member Management & Soft-Delete  -> Admin Members Tab
  Section 20: Recycle Bin & 30-Day Soft Retention    -> Admin Recycle Bin Tab
  Section 21: Contribution / Receipt Deletion        -> Admin Receipts Tab
  Section 22: Donation & QR Scanner Settings         -> Admin Funds & Member Contribute
================================================================================
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import os
import bcrypt
import secrets
import hashlib
import json
from datetime import datetime, timedelta, date
import re

from database import SessionLocal
from models import (
    Member, Admin, AdminInvitation, RegistrationOTP,
    Fund, FundUsage, Cause, Contribution, Announcement, ActivityLog, MemberDocument,
    PasswordResetRequest, DeletedRecord
)

from schemas import (
    MemberRegister, MemberLogin, AdminRegister,
    AdminLogin, ChangePassword, PasswordResetSendOtp, PasswordResetVerifyAndChange,
    OTPSendRequest, OTPVerifyRequest,
    ContributionCreate, ContributionOut, FundCreate, FundOut,
    CauseCreate, CauseOut, AnnouncementCreate, AnnouncementOut,
    MemberProfileUpdate, AdminDashboardStats,
    FundUsageCreate, FundUsageUpdate, FundUpdate, CauseUpdate, AnnouncementUpdate,
    MemberAdminCreate, MemberAdminUpdate,
    MemberPasswordChange, MemberPhoneOtpSend, MemberPhoneOtpVerify,
    MemberEmailOtpSend, MemberEmailOtpVerify,
    AdminInvitationGenerate,
    MemberDisableAccount, MemberDeleteOtpSend, MemberDeleteConfirm, MemberSelfRestore
)

# Initialize FastAPI router
router = APIRouter(
    prefix="/api",
    tags=["BPK Community Fund API"]
)


# ==============================================================================
# SECTION 1: HELPER UTILITIES & SECURITY RESOLVERS
# ==============================================================================


def normalize_phone_number(p: str | None) -> str:
    if not p:
        return ""
    digits = re.sub(r"\D", "", p)
    return digits[-10:] if len(digits) >= 10 else digits


def get_phone_variants(p: str | None) -> list[str]:
    if not p:
        return []
    raw = p.strip()
    clean = normalize_phone_number(raw)
    variants = [raw, clean, f"+91{clean}", f"+91 {clean}"]
    return list(dict.fromkeys([v for v in variants if v]))


def resolve_user_account(raw_ident: str, db: Session):
    """
    Resolves a user (Member or Admin) by any valid identifier:
    - Pure numeric ID (e.g. '21')
    - Formatted Member/Admin ID (e.g. 'PBK-M021', 'PBK-M21', 'PBK21', 'M021', 'M21', 'PBK-021')
    - Phone number variants (e.g. '0000000000', '+91 0000000000')
    - Email address (e.g. 'liki@pbk.org')
    - Member first name, last name, or full name (e.g. 'liki', 'harsha')
    - Admin username or full name (e.g. 'admin')
    """
    if not raw_ident:
        return (None, None)
    ident = str(raw_ident).strip()
    if not ident:
        return (None, None)

    # 1. Numeric ID
    if ident.isdigit() and len(ident) < 7:
        uid = int(ident)
        m = db.query(Member).filter(Member.id == uid).first()
        if m:
            return (m, "Member")
        a = db.query(Admin).filter(Admin.id == uid).first()
        if a:
            return (a, "Admin")

    # 2. Formatted ID with letters (PBK-M021, M021, PBK21, etc.)
    id_digits = re.sub(r"\D", "", ident)
    if id_digits and (ident.upper().startswith("PBK") or ident.upper().startswith("M")):
        uid = int(id_digits)
        m = db.query(Member).filter(Member.id == uid).first()
        if m:
            return (m, "Member")
        a = db.query(Admin).filter(Admin.id == uid).first()
        if a:
            return (a, "Admin")

    # 3. Phone variants
    phone_vars = get_phone_variants(ident)
    if phone_vars:
        m = db.query(Member).filter(Member.phone.in_(phone_vars)).first()
        if m:
            return (m, "Member")
        a = db.query(Admin).filter(Admin.phone.in_(phone_vars)).first()
        if a:
            return (a, "Admin")

    # 4. Email address
    if "@" in ident:
        m = db.query(Member).filter(func.lower(Member.email) == ident.lower()).first()
        if m:
            return (m, "Member")
        a = db.query(Admin).filter(func.lower(Admin.email) == ident.lower()).first()
        if a:
            return (a, "Admin")

    # 5. Member first_name / last_name / full name
    m = db.query(Member).filter(
        (func.lower(Member.first_name) == ident.lower()) |
        (func.lower(Member.last_name) == ident.lower()) |
        (func.lower(func.concat(Member.first_name, " ", Member.last_name)) == ident.lower())
    ).first()
    if m:
        return (m, "Member")

    # 6. Admin username / full_name
    a = db.query(Admin).filter(
        (func.lower(Admin.username) == ident.lower()) |
        (func.lower(Admin.full_name) == ident.lower())
    ).first()
    if a:
        return (a, "Admin")

    return (None, None)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def check_admin_permission(
    required_level: str,  # "Super Admin" or "Admin"
    x_admin_role: str | None = None,
    x_admin_id: int | None = None,
    db: Session | None = None
):
    role = None
    if x_admin_id and db:
        adm = db.query(Admin).filter(Admin.id == x_admin_id).first()
        if adm and adm.role:
            role = adm.role
    if not role and x_admin_role:
        role = x_admin_role

    if not role:
        return True

    clean_role = role.strip()

    if required_level == "Super Admin" and clean_role != "Super Admin":
        raise HTTPException(
            status_code=403,
            detail=f"Permission Denied: Only Super Admin can perform this action. Your role is '{clean_role}'."
        )

    if required_level == "Admin" and clean_role not in ["Super Admin", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail=f"Permission Denied: General Admin cannot modify funds, receipts, or member records. Your role is '{clean_role}'."
        )

    return True



# ==============================================================================
# SECTION 2: MEMBER AUTHENTICATION & REGISTRATION
# Linked Frontend: HomeLogRegisPass.html (Member Login & Member Register Tabs)
# Endpoints:
#   - POST /api/members/register : Register new member account with contact validation
#   - POST /api/members/login    : Authenticate member (Phone, Email, or Member ID)
# ==============================================================================

@router.post("/members/register")
def register_member(
    member_data: MemberRegister,
    db: Session = Depends(get_db)
):
    clean_phone = normalize_phone_number(member_data.phone)

    # Check whether phone number already exists
    existing_member = (
        db.query(Member)
        .filter(Member.phone.in_(get_phone_variants(member_data.phone)))
        .first()
    )

    if existing_member:
        raise HTTPException(
            status_code=400,
            detail="Phone number is already registered"
        )

    # Check whether email already exists
    clean_email = str(member_data.email).strip().lower() if member_data.email else None
    if clean_email:
        existing_email = db.query(Member).filter(func.lower(Member.email) == clean_email).first()
        if existing_email:
            raise HTTPException(
                status_code=400,
                detail=f"Email address '{clean_email}' is already registered. Please use a unique email address."
            )

    # Hash the password
    hashed_password = bcrypt.hashpw(
        member_data.password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    member_gender = "M" if member_data.gender and member_data.gender.upper().startswith("M") else ("F" if member_data.gender and member_data.gender.upper().startswith("F") else "N")

    # Create member
    new_member = Member(
        first_name=member_data.first_name,
        last_name=member_data.last_name,
        gender=member_gender,
        phone=clean_phone,
        email=member_data.email,
        state=member_data.state,
        district=member_data.district,
        city=member_data.city,
        village=member_data.village,
        address=member_data.address,
        password_hash=hashed_password,
        status="active"
    )

    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    formatted_phone = f"+91 {new_member.phone}" if new_member.phone and not new_member.phone.startswith("+91") else (new_member.phone or "")

    return {
        "message": "Member registered successfully",
        "member_id": new_member.id,
        "phone": formatted_phone
    }



# ------------------------------------------------------------------------------
# Member Login Endpoint
# Validates credentials, checks 30-day scheduled deletion & disabled status
# ------------------------------------------------------------------------------
@router.post("/members/login")
def login_member(
    login_data: MemberLogin,
    db: Session = Depends(get_db)
):
    username = login_data.username.strip()
    member, role = resolve_user_account(username, db)

    if member is None or role != "Member":
        raise HTTPException(
            status_code=401,
            detail="Invalid Member ID, Phone, Email, or password"
        )

    password_correct = bcrypt.checkpw(
        login_data.password.encode("utf-8"),
        member.password_hash.encode("utf-8")
    )

    if not password_correct:
        raise HTTPException(
            status_code=401,
            detail="Invalid phone/ID or password"
        )

    # 1. Check if member account is scheduled for deletion (30-day grace period)
    if member.is_deleted:
        if member.scheduled_deletion_at and datetime.now() > member.scheduled_deletion_at:
            raise HTTPException(
                status_code=403,
                detail="Your account has been permanently purged after the 30-day grace period."
            )
        days_remaining = 30
        if member.scheduled_deletion_at:
            delta = member.scheduled_deletion_at - datetime.now()
            days_remaining = max(1, delta.days + (1 if delta.seconds > 0 else 0))
        return {
            "status": "pending_deletion",
            "message": f"Your account is currently scheduled for permanent deletion in {days_remaining} day(s).",
            "member_id": member.id,
            "first_name": member.first_name,
            "last_name": member.last_name or "",
            "days_remaining": days_remaining,
            "scheduled_deletion_at": member.scheduled_deletion_at.strftime("%d %b %Y, %I:%M %p") if member.scheduled_deletion_at else "",
            "can_restore": True
        }

    # 2. Check if member account is temporarily disabled
    if member.status != "active":
        return {
            "status": "disabled",
            "message": "Your account is temporarily disabled. You can reactivate your account at any time.",
            "member_id": member.id,
            "first_name": member.first_name,
            "last_name": member.last_name or "",
            "can_reactivate": True
        }

    formatted_phone = f"+91 {member.phone}" if member.phone and not member.phone.startswith("+91") else (member.phone or "")

    try:
        log = ActivityLog(
            user_type="Member",
            user_id=member.id,
            action="Login",
            description=f"Member PBK-M{member.id:03d} ({member.first_name} {member.last_name or ''}) logged in"
        )
        db.add(log)
        db.commit()
    except Exception:
        pass

    return {
        "message": "Login successful",
        "member_id": member.id,
        "first_name": member.first_name,
        "last_name": member.last_name,
        "phone": formatted_phone,
        "email": member.email,
        "role": "member"
    }


# ==============================================================================
# SECTION 3: ADMIN AUTHENTICATION & REGISTRATION
# Linked Frontend: HomeLogRegisPass.html (Admin Login & Admin Register Tabs)
# Endpoints:
#   - POST /api/admins/register : Register new admin account (requires invitation code)
#   - POST /api/admins/login    : Authenticate admin credentials and return role
# ==============================================================================

@router.post("/admins/register")
def register_admin(
    admin_data: AdminRegister,
    db: Session = Depends(get_db)
):
    # Validate Admin Invitation Code
    code_hash = hashlib.sha256(
        admin_data.invitation_code.strip().encode("utf-8")
    ).hexdigest()

    invitation = (
        db.query(AdminInvitation)
        .filter(AdminInvitation.invitation_code_hash == code_hash)
        .first()
    )

    if invitation is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid invitation code"
        )

    if invitation.status == "Used":
        raise HTTPException(
            status_code=400,
            detail="This invitation code has already been used and cannot be reused"
        )
    elif invitation.status == "Revoked":
        raise HTTPException(
            status_code=400,
            detail="This invitation code has been disabled because a newer code was generated"
        )
    elif invitation.status == "Expired" or datetime.now() > invitation.expires_at:
        if invitation.status != "Expired":
            invitation.status = "Expired"
            db.commit()
        raise HTTPException(
            status_code=400,
            detail="Invitation code has expired"
        )
    elif invitation.status != "Pending":
        raise HTTPException(
            status_code=400,
            detail="Invitation code is no longer valid"
        )

    existing_email = (
        db.query(Admin)
        .filter(Admin.email == admin_data.email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email is already registered"
        )

    clean_phone = normalize_phone_number(admin_data.phone)

    existing_phone = (
        db.query(Admin)
        .filter(Admin.phone.in_(get_phone_variants(admin_data.phone)))
        .first()
    )

    if existing_phone:
        raise HTTPException(
            status_code=400,
            detail="Phone number is already registered"
        )

    hashed_password = bcrypt.hashpw(
        admin_data.password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    gender_val = "M" if admin_data.gender and admin_data.gender.upper().startswith("M") else ("F" if admin_data.gender and admin_data.gender.upper().startswith("F") else "N")

    assigned_role = invitation.role or "Admin"

    new_admin = Admin(
        first_name=admin_data.first_name,
        last_name=admin_data.last_name,
        gender=gender_val,
        phone=clean_phone,
        email=admin_data.email,
        state=admin_data.state,
        district=admin_data.district,
        city=admin_data.city,
        village=admin_data.village,
        address=admin_data.address,
        password_hash=hashed_password,
        role=assigned_role,
        status="active"
    )

    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    # Mark invitation as used
    invitation.status = "Used"
    invitation.used_by_admin_id = new_admin.id
    invitation.used_at = datetime.now()
    db.commit()

    formatted_phone = f"+91 {new_admin.phone}" if new_admin.phone and not new_admin.phone.startswith("+91") else (new_admin.phone or "")

    return {
        "message": f"Admin registered successfully as {assigned_role}",
        "admin_id": new_admin.id,
        "email": new_admin.email,
        "phone": formatted_phone,
        "role": assigned_role
    }


# ------------------------------------------------------------------------------
# Admin Login Endpoint
# Authenticates admin credentials, checks active status, records activity log
# ------------------------------------------------------------------------------
@router.post("/admins/login")
def login_admin(
    login_data: AdminLogin,
    db: Session = Depends(get_db)
):
    username = login_data.username.strip()
    admin, role = resolve_user_account(username, db)

    if admin is None or role != "Admin":
        raise HTTPException(
            status_code=401,
            detail="Invalid Admin ID, Phone, Email, or password"
        )

    if admin.status != "active":
        raise HTTPException(
            status_code=403,
            detail="Admin account is inactive"
        )

    password_correct = bcrypt.checkpw(
        login_data.password.encode("utf-8"),
        admin.password_hash.encode("utf-8")
    )

    if not password_correct:
        raise HTTPException(
            status_code=401,
            detail="Invalid phone/email or password"
        )

    formatted_phone = f"+91 {admin.phone}" if admin.phone and not admin.phone.startswith("+91") else (admin.phone or "")
    admin_role = admin.role or "Super Admin"

    try:
        log = ActivityLog(
            user_type="Admin",
            user_id=admin.id,
            action="Login",
            description=f"Admin {admin.first_name} {admin.last_name or ''} ({admin_role}) logged in successfully"
        )
        db.add(log)
        db.commit()
    except Exception:
        pass

    return {
        "message": "Admin login successful",
        "admin_id": admin.id,
        "first_name": admin.first_name,
        "last_name": admin.last_name,
        "phone": formatted_phone,
        "email": admin.email,
        "role": admin_role
    }


# ==============================================================================
# SECTION 4: PASSWORD RECOVERY & RESET VIA OTP
# Linked Frontend: HomeLogRegisPass.html (Forgot Password Modal)
# Endpoints:
#   - POST /api/auth/change-password                : Update password via old password or OTP
#   - POST /api/auth/reset-password/send-otp        : Request reset OTP for Member/Admin
#   - POST /api/auth/reset-password/verify-and-change: Verify OTP and save new password
# ==============================================================================

@router.post("/auth/change-password")
def change_password(
    data: ChangePassword,
    db: Session = Depends(get_db)
):
    username = data.username.strip()
    user, target_role = resolve_user_account(username, db)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="Account not found. Please verify your Member ID, Phone, Email, or Name."
        )

    # Check validation via OTP or Current Password
    if data.otp_id and data.otp_code:
        otp_rec = db.query(RegistrationOTP).filter(RegistrationOTP.id == data.otp_id).first()
        if not otp_rec or otp_rec.status not in ["Pending", "Verified"]:
            raise HTTPException(status_code=400, detail="OTP verification record is invalid or already used.")
        if datetime.now() > otp_rec.expires_at:
            otp_rec.status = "Expired"
            db.commit()
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
        if otp_rec.attempts >= 5:
            otp_rec.status = "Expired"
            db.commit()
            raise HTTPException(status_code=400, detail="Maximum OTP verification attempts exceeded.")
        if otp_rec.otp_code != str(data.otp_code).strip():
            otp_rec.attempts += 1
            db.commit()
            raise HTTPException(status_code=400, detail="Incorrect OTP verification code.")
        otp_rec.status = "Used"
    elif data.current_password:
        password_correct = bcrypt.checkpw(
            data.current_password.encode("utf-8"),
            user.password_hash.encode("utf-8")
        )
        if not password_correct:
            raise HTTPException(
                status_code=400,
                detail="Current password does not match."
            )
    else:
        raise HTTPException(
            status_code=400,
            detail="Please provide your current password or verify with an OTP."
        )

    new_hash = bcrypt.hashpw(
        data.new_password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    user.password_hash = new_hash
    db.commit()

    return {
        "message": "Password updated successfully"
    }


## Password Reset via OTP: Send OTP
@router.post("/auth/reset-password/send-otp")
def send_reset_password_otp(
    data: PasswordResetSendOtp,
    db: Session = Depends(get_db)
):
    raw_ident = data.identifier.strip()
    if not raw_ident:
        raise HTTPException(status_code=400, detail="Member ID, Mobile number, Email, or Name is required.")

    user, target_role = resolve_user_account(raw_ident, db)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail=f"No registered account found matching '{raw_ident}'. Please check your Member ID, Phone, Email, or Name."
        )

    target_phone = user.phone
    target_email = user.email

    otp_type = "Email" if ("@" in raw_ident or (data.otp_type and data.otp_type.lower() == "email")) else "Phone"

    # Automatically adapt to the contact method available on this account
    if otp_type == "Phone":
        if not target_phone and target_email:
            otp_type = "Email"
        elif not target_phone:
            raise HTTPException(
                status_code=400,
                detail="No registered mobile number found for this account. Please use Email verification."
            )
    else:
        if not target_email and target_phone:
            otp_type = "Phone"
        elif not target_email:
            raise HTTPException(
                status_code=400,
                detail="No registered email found for this account. Please use Mobile SMS verification."
            )

    clean_target = ""
    if otp_type == "Phone":
        clean_target = normalize_phone_number(target_phone)
        db.query(RegistrationOTP).filter(
            RegistrationOTP.phone.in_(get_phone_variants(clean_target)),
            RegistrationOTP.status.in_(["Pending", "Verified"])
        ).update({"status": "Expired"}, synchronize_session=False)
    else:
        clean_target = target_email.lower().strip()
        db.query(RegistrationOTP).filter(
            func.lower(RegistrationOTP.email) == clean_target,
            RegistrationOTP.status.in_(["Pending", "Verified"])
        ).update({"status": "Expired"}, synchronize_session=False)

    otp_code = f"{secrets.randbelow(9000) + 1000:04d}"
    expires_at = datetime.now() + timedelta(minutes=10)

    new_otp = RegistrationOTP(
        user_type=target_role,
        phone=clean_target if otp_type == "Phone" else None,
        email=clean_target if otp_type == "Email" else None,
        otp_type=otp_type,
        otp_code=otp_code,
        expires_at=expires_at,
        status="Pending",
        attempts=0
    )
    db.add(new_otp)
    db.commit()
    db.refresh(new_otp)

    masked = ""
    if otp_type == "Phone":
        masked = f"+91 XXXXXX{clean_target[-4:]}" if len(clean_target) >= 4 else f"+91 {clean_target}"
    else:
        parts = clean_target.split("@")
        masked = f"{parts[0][:2]}***@{parts[1]}" if len(parts) == 2 else clean_target

    return {
        "message": f"OTP sent to {masked}",
        "otp_id": new_otp.id,
        "otp_code": otp_code,
        "otp_type": otp_type,
        "target": masked,
        "user_type": target_role
    }


## Password Reset via OTP: Verify and Change
@router.post("/auth/reset-password/verify-and-change")
def verify_and_change_password(
    data: PasswordResetVerifyAndChange,
    db: Session = Depends(get_db)
):
    new_pwd = data.new_password.strip()
    if len(new_pwd) < 6:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 6 characters long."
        )

    otp_record = db.query(RegistrationOTP).filter(RegistrationOTP.id == data.otp_id).first()
    if not otp_record:
        raise HTTPException(status_code=404, detail="OTP verification record not found.")

    if otp_record.status not in ["Pending", "Verified"]:
        raise HTTPException(status_code=400, detail="OTP is no longer valid or already used.")

    if datetime.now() > otp_record.expires_at:
        otp_record.status = "Expired"
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new OTP.")

    if otp_record.attempts >= 5:
        otp_record.status = "Expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Maximum verification attempts exceeded.")

    if otp_record.otp_code != str(data.otp_code).strip():
        otp_record.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect OTP code. Please try again.")

    raw_ident = data.identifier.strip()
    user, _ = resolve_user_account(raw_ident, db)

    # Fallback to match user by OTP record's phone or email
    if user is None:
        if otp_record.phone:
            user = db.query(Member).filter(Member.phone.in_(get_phone_variants(otp_record.phone))).first()
            if not user:
                user = db.query(Admin).filter(Admin.phone.in_(get_phone_variants(otp_record.phone))).first()
        elif otp_record.email:
            user = db.query(Member).filter(func.lower(Member.email) == otp_record.email.lower()).first()
            if not user:
                user = db.query(Admin).filter(func.lower(Admin.email) == otp_record.email.lower()).first()

    if user is None:
        raise HTTPException(status_code=404, detail="User account could not be found.")

    new_hash = bcrypt.hashpw(new_pwd.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user.password_hash = new_hash
    otp_record.status = "Used"
    db.commit()

    return {
        "message": "Password updated successfully! You can now log in with your new password."
    }



# ==============================================================================
# SECTION 5: ADMIN INVITATION CODES MANAGEMENT
# Linked Frontend: Admin Portal -> Settings Tab & HomeLogRegisPass Admin Register
# Endpoints:
#   - POST /api/admin-invitations/generate : Generate 10-char cryptographic invite code
#   - POST /api/admin-invitations/verify   : Check code validity, role, and expiry
# ==============================================================================

@router.post("/admin-invitations/generate")
def generate_admin_invitation(
    data: AdminInvitationGenerate | None = Body(None),
    x_admin_role: str | None = Header(None, alias="X-Admin-Role"),
    x_admin_id: int | None = Header(None, alias="X-Admin-Id"),
    db: Session = Depends(get_db)
):
    # Determine requested role and requester ID
    target_role = "Admin"
    requester_id = x_admin_id
    if data:
        if data.role:
            target_role = data.role.strip()
        if data.admin_id:
            requester_id = data.admin_id

    # Verify requester has Super Admin permission
    # Verify requester has Super Admin permission
    requester_role = None
    requester_admin = None
    if requester_id:
        requester_admin = db.query(Admin).filter(Admin.id == requester_id).first()
        if requester_admin and requester_admin.role:
            requester_role = requester_admin.role
    if not requester_role and x_admin_role:
        requester_role = x_admin_role

    if requester_role != "Super Admin":
        raise HTTPException(
            status_code=403,
            detail=f"Permission Denied: Only Super Admin can generate invitation codes. Your role is '{requester_role}'."
        )

    # Validate target role
    valid_roles = ["Super Admin", "Admin", "General Admin"]
    if target_role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid admin category '{target_role}'. Allowed roles: {', '.join(valid_roles)}"
        )

    # Automatically revoke all existing pending invitation codes
    # so that ONLY this newly generated invitation code will be valid
    db.query(AdminInvitation).filter(
        AdminInvitation.status == "Pending"
    ).update(
        {"status": "Revoked"},
        synchronize_session=False
    )
    db.commit()

    # Generate a random invitation code
    raw_code = (
        "PBK-"
        + secrets.token_hex(2).upper()
        + "-"
        + secrets.token_hex(2).upper()
        + "-"
        + secrets.token_hex(2).upper()
    )

    # Hash the invitation code before storing it
    code_hash = hashlib.sha256(
        raw_code.encode("utf-8")
    ).hexdigest()

    # Invitation expires after 24 hours
    expires_at = datetime.now() + timedelta(hours=24)

    new_invitation = AdminInvitation(
        invitation_code_hash=code_hash,
        role=target_role,
        created_by_admin_id=requester_id or 1,
        expires_at=expires_at,
        status="Pending"
    )

    db.add(new_invitation)

    # Log to ActivityLog
    admin_actor = f"{requester_admin.first_name} {requester_admin.last_name or ''}".strip().title() if requester_admin else "Sai Kumar (Super Admin)"
    log = ActivityLog(
        user_type="Admin",
        user_id=requester_id or 1,
        action="Invitation Generated",
        description=f"Admin {admin_actor} generated new invitation code for role '{target_role}'"
    )
    db.add(log)

    db.commit()
    db.refresh(new_invitation)

    # Return the actual code so the authorized generator
    # can copy and give it to the new admin
    return {
        "message": f"Admin invitation generated successfully for {target_role}",
        "invitation_code": raw_code,
        "role": target_role,
        "expires_at": expires_at.strftime("%d %b %Y, %I:%M %p"),
        "invitation_id": new_invitation.id
    }


# ------------------------------------------------------------------------------
# Verify Admin Invitation Code
# Validates code hash, expiration, and single-use state
# ------------------------------------------------------------------------------
@router.post("/admin-invitations/verify")
def verify_admin_invitation(
    invitation_code: str | None = None,
    payload: dict | None = None,
    db: Session = Depends(get_db)
):
    code = invitation_code or (payload.get("invitation_code") if payload else None)
    if not code:
        raise HTTPException(
            status_code=400,
            detail="Invitation code is required"
        )

    code_hash = hashlib.sha256(
        code.strip().encode("utf-8")
    ).hexdigest()

    invitation = (
        db.query(AdminInvitation)
        .filter(
            AdminInvitation.invitation_code_hash == code_hash
        )
        .first()
    )

    if invitation is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid invitation code"
        )

    if invitation.status == "Used":
        raise HTTPException(
            status_code=400,
            detail="This invitation code has already been used and cannot be reused"
        )
    elif invitation.status == "Revoked":
        raise HTTPException(
            status_code=400,
            detail="This invitation code has been disabled because a newer code was generated"
        )
    elif invitation.status == "Expired" or datetime.now() > invitation.expires_at:
        if invitation.status != "Expired":
            invitation.status = "Expired"
            db.commit()

        raise HTTPException(
            status_code=400,
            detail="Invitation code has expired"
        )
    elif invitation.status != "Pending":
        raise HTTPException(
            status_code=400,
            detail="Invitation code is no longer valid"
        )

    return {
        "message": f"Invitation code verified successfully for {invitation.role or 'Admin'}",
        "valid": True,
        "role": invitation.role or "Admin",
        "invitation_id": invitation.id
    }


# ==============================================================================
# SECTION 6: REGISTRATION OTP VERIFICATION
# Linked Frontend: HomeLogRegisPass.html (Member / Admin Registration Verification)
# Endpoints:
#   - POST /api/registration-otp/send   : Dispatch SMS/Email OTP for registration
#   - POST /api/registration-otp/verify : Verify OTP code before submitting registration
# ==============================================================================

@router.post("/registration-otp/send")
def send_registration_otp(
    payload: OTPSendRequest | None = None,
    user_type: str | None = None,
    otp_type: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    db: Session = Depends(get_db)
):
    target_user_type = payload.user_type if payload else user_type
    target_otp_type = payload.otp_type if payload else otp_type
    target_phone = payload.phone if payload else phone
    target_email = str(payload.email) if payload and payload.email else email

    if not target_user_type or target_user_type not in ["Member", "Admin"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid user type"
        )

    if not target_otp_type or target_otp_type not in ["Phone", "Email"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP type"
        )

    if target_otp_type == "Phone" and not target_phone:
        raise HTTPException(
            status_code=400,
            detail="Phone number is required"
        )

    if target_otp_type == "Email" and not target_email:
        raise HTTPException(
            status_code=400,
            detail="Email address is required"
        )

    # 4-digit OTP for front-end 4-box layout
    otp_code = f"{secrets.randbelow(9000) + 1000:04d}"

    expires_at = datetime.now() + timedelta(minutes=10)

    new_otp = RegistrationOTP(
        user_type=target_user_type,
        phone=target_phone,
        email=target_email,
        otp_type=target_otp_type,
        otp_code=otp_code,
        expires_at=expires_at,
        status="Pending",
        attempts=0
    )

    db.add(new_otp)
    db.commit()
    db.refresh(new_otp)

    return {
        "message": "OTP generated successfully",
        "otp_id": new_otp.id,
        "otp": otp_code,
        "expires_at": expires_at
    }


#registration-otp/verify
@router.post("/registration-otp/verify")
def verify_registration_otp(
    payload: OTPVerifyRequest | None = None,
    otp_id: int | None = None,
    otp_code: str | None = None,
    db: Session = Depends(get_db)
):
    target_otp_id = payload.otp_id if payload else otp_id
    target_otp_code = payload.otp_code if payload else otp_code

    if not target_otp_id or not target_otp_code:
        raise HTTPException(
            status_code=400,
            detail="Missing OTP ID or code"
        )

    otp_record = (
        db.query(RegistrationOTP)
        .filter(
            RegistrationOTP.id == target_otp_id
        )
        .first()
    )

    if otp_record is None:
        raise HTTPException(
            status_code=404,
            detail="OTP record not found"
        )

    if otp_record.status == "Verified" and otp_record.otp_code == str(target_otp_code).strip():
        return {
            "message": "OTP verified successfully",
            "verified": True,
            "otp_id": otp_record.id
        }

    if otp_record.status != "Pending":
        raise HTTPException(
            status_code=400,
            detail="OTP is no longer valid"
        )

    if datetime.now() > otp_record.expires_at:
        otp_record.status = "Expired"
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="OTP has expired"
        )

    if otp_record.attempts >= 5:
        otp_record.status = "Expired"
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="Maximum OTP attempts exceeded"
        )

    if otp_record.otp_code != str(target_otp_code).strip():
        otp_record.attempts += 1
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    otp_record.status = "Verified"
    db.commit()

    return {
        "message": "OTP verified successfully",
        "verified": True,
        "otp_id": otp_record.id
    }


# ==============================================================================
# SECTION 7: FUNDS MANAGEMENT PIPELINE
# Linked Frontend: Admin Funds Tab & Member Fund Details View
# Endpoints:
#   - GET  /api/funds : List all funds with collected & spent balances
#   - POST /api/funds : Create a new community fund target
# ==============================================================================

@router.get("/funds")
def get_funds(
    financial_year: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Fund)
    if financial_year:
        query = query.filter(Fund.financial_year == financial_year)
    funds = query.all()

    result = []
    for f in funds:
        # Calculate collected amount from contributions
        collected = (
            db.query(func.coalesce(func.sum(Contribution.contribution_amount), 0))
            .filter(
                Contribution.fund_name == f.name,
                Contribution.status == "completed"
            )
            .scalar()
        )

        # Calculate used amount from fund_usage
        used = (
            db.query(func.coalesce(func.sum(FundUsage.amount), 0))
            .filter(
                (FundUsage.fund_id == f.id) | (FundUsage.fund_type == f.name),
                func.lower(FundUsage.status).in_(["completed", "approved"])
            )
            .scalar()
        )

        result.append({
            "id": f.id,
            "financial_year": f.financial_year,
            "name": f.name,
            "target_amount": float(f.target_amount or 0),
            "collected_amount": float(collected or 0),
            "used_amount": float(used or 0),
            "status": f.status
        })

    return result


@router.post("/funds")
def create_fund(
    fund_data: FundCreate,
    x_admin_role: str | None = Header(None, alias="X-Admin-Role"),
    x_admin_id: int | None = Header(None, alias="X-Admin-Id"),
    db: Session = Depends(get_db)
):
    check_admin_permission("Admin", x_admin_role, x_admin_id, db)
    new_fund = Fund(
        financial_year=fund_data.financial_year,
        name=fund_data.name,
        target_amount=fund_data.target_amount,
        status=fund_data.status or "Active"
    )
    db.add(new_fund)
    db.commit()
    db.refresh(new_fund)

    return {
        "message": "Fund created successfully",
        "fund_id": new_fund.id,
        "name": new_fund.name
    }


# ==============================================================================
# SECTION 8: CAUSES / CASES & EVENTS PIPELINE
# Linked Frontend: Admin Cases & Events Tab & Member Cases View
# Endpoints:
#   - GET  /api/causes : Fetch all causes, targets, and collected amounts
#   - POST /api/causes : Create a new emergency relief / community cause
# ==============================================================================

@router.get("/causes")
def get_causes(
    status: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Cause)
    if status:
        query = query.filter(Cause.status == status)
    causes = query.all()

    active_members = db.query(Member).filter(Member.status == "active").count() or 1

    return [
        {
            "id": c.id,
            "cause_code": c.cause_code,
            "name": c.name,
            "description": c.description,
            "target_per_member": float(c.target_per_member or c.target_amount or 0),
            "target_amount": float(c.target_amount or (float(c.target_per_member or 0) * active_members)),
            "raised_amount": float(c.raised_amount or 0),
            "status": c.status,
            "date": c.created_at.strftime("%d %b %Y") if c.created_at else (c.start_date.strftime("%d %b %Y") if c.start_date else "")
        }
        for c in causes
    ]


@router.post("/causes")
def create_cause(
    cause_data: CauseCreate,
    db: Session = Depends(get_db)
):
    active_members = db.query(Member).filter(Member.status == "active").count() or 1
    t_per_member = float(cause_data.target_per_member or cause_data.target_amount or 0)
    t_total = float(cause_data.target_amount) if (cause_data.target_amount and cause_data.target_amount > t_per_member) else (t_per_member * active_members)

    new_cause = Cause(
        cause_code=cause_data.cause_code,
        name=cause_data.name,
        description=cause_data.description,
        target_per_member=t_per_member,
        target_amount=t_total,
        raised_amount=0.00,
        status=cause_data.status or "Draft"
    )
    db.add(new_cause)

    # Activity log
    log = ActivityLog(
        user_type="Admin",
        user_id=1,
        action="Created Cause",
        description=f"Admin created new cause '{new_cause.name}' (#{new_cause.cause_code}) with target ₹{t_per_member:,.0f}/member (Status: {new_cause.status})"
    )
    db.add(log)

    db.commit()
    db.refresh(new_cause)

    return {
        "message": "Cause created successfully",
        "cause_id": new_cause.id,
        "cause_code": new_cause.cause_code,
        "status": new_cause.status,
        "target_per_member": float(new_cause.target_per_member or 0),
        "target_amount": float(new_cause.target_amount or 0)
    }


# ==============================================================================
# SECTION 9: ANNOUNCEMENTS & BROADCASTS PIPELINE
# Linked Frontend: Admin Announcements Tab & Member Headbar Notification Bell
# Endpoints:
#   - GET  /api/announcements : List published and draft community announcements
#   - POST /api/announcements : Broadcast a new announcement to community members
# ==============================================================================

@router.get("/announcements")
def get_announcements(
    status: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Announcement)
    if status:
        query = query.filter(Announcement.status == status)
    else:
        query = query.filter(Announcement.status.in_(["Published", "Draft"]))
    items = query.order_by(desc(Announcement.created_at)).all()

    return [
        {
            "id": a.id,
            "title": a.title,
            "message": a.message,
            "announcement_type": a.announcement_type,
            "status": a.status,
            "date": a.publish_date.strftime("%d %b %Y") if a.publish_date else a.created_at.strftime("%d %b %Y")
        }
        for a in items
    ]


@router.post("/announcements")
def create_announcement(
    data: AnnouncementCreate,
    db: Session = Depends(get_db)
):
    new_ann = Announcement(
        title=data.title,
        message=data.message,
        announcement_type=data.announcement_type or "General",
        status=data.status or "Published",
        publish_date=date.today()
    )
    db.add(new_ann)
    db.commit()
    db.refresh(new_ann)

    return {
        "message": "Announcement created successfully",
        "announcement_id": new_ann.id,
        "title": new_ann.title
    }


# ==============================================================================
# SECTION 10: CONTRIBUTIONS & DONATION PROCESSING PIPELINE
# Linked Frontend: Member Contribute Tab, Member My Contributions, Admin Receipts Tab
# Endpoints:
#   - POST /api/members/{member_id}/contributions : Submit new donation (QR/UPI/Cash)
#   - GET  /api/members/{member_id}/contributions : Member's personal contribution history
#   - GET  /api/admin/contributions               : All community contributions & receipts
#   - PUT  /api/admin/contributions/{id}/status   : Admin verify / approve contribution
# ==============================================================================

@router.post("/members/{member_id}/contributions")
def create_contribution(
    member_id: int,
    data: ContributionCreate,
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Generate sequential Receipt / Contribution ID: e.g. PBK-C009
    total_count = db.query(func.count(Contribution.id)).scalar() or 0
    receipt_num = f"PBK-C{str(total_count + 1).zfill(3)}"

    # Parse contribution date
    contrib_date = date.today()
    if data.contribution_date:
        try:
            contrib_date = datetime.strptime(data.contribution_date, "%Y-%m-%d").date()
        except Exception:
            contrib_date = date.today()

    new_contrib = Contribution(
        member_id=member_id,
        contribution_amount=data.contribution_amount,
        contribution_type=data.contribution_type or "General",
        fund_name=data.fund_name,
        contribution_date=contrib_date,
        payment_method=data.payment_method or "UPI",
        transaction_reference=data.transaction_reference or f"UPI{secrets.randbelow(900000000) + 100000000}",
        receipt_number=receipt_num,
        notes=data.notes,
        status=(data.status or "pending").lower()
    )

    db.add(new_contrib)

    # If contribution matches a cause (either directly or via notes/dedication), update raised amount only if completed
    cause = db.query(Cause).filter(Cause.name == data.fund_name).first()
    if not cause and data.notes:
        for c in db.query(Cause).all():
            if c.name and c.name.lower() in data.notes.lower():
                cause = c
                break
    if cause and new_contrib.status == "completed":
        cause.raised_amount = float(cause.raised_amount or 0) + float(data.contribution_amount)

    # Log activity
    log = ActivityLog(
        user_type="Member",
        user_id=member_id,
        action="Contributed",
        description=f"{member.first_name} contributed ₹{data.contribution_amount} to {data.fund_name} ({new_contrib.status.capitalize()})"
    )
    db.add(log)

    db.commit()
    db.refresh(new_contrib)

    return {
        "message": "Contribution submitted successfully",
        "id": new_contrib.id,
        "receipt_number": new_contrib.receipt_number,
        "amount": float(new_contrib.contribution_amount),
        "fund_name": new_contrib.fund_name,
        "date": new_contrib.contribution_date.strftime("%d %b %Y"),
        "method": new_contrib.payment_method,
        "status": new_contrib.status
    }


@router.get("/members/{member_id}/contributions")
def get_member_contributions(
    member_id: int,
    db: Session = Depends(get_db)
):
    items = (
        db.query(Contribution)
        .filter(Contribution.member_id == member_id)
        .order_by(desc(Contribution.contribution_date), desc(Contribution.id))
        .all()
    )

    return [
        {
            "id": c.receipt_number or f"PBK-C{str(c.id).zfill(3)}",
            "db_id": c.id,
            "date": c.contribution_date.strftime("%d %b %Y") if c.contribution_date else "",
            "purpose": c.fund_name or "General Fund",
            "amount": float(c.contribution_amount),
            "method": c.payment_method or "UPI",
            "status": "Completed" if c.status == "completed" else ("Rejected" if c.status == "rejected" else ("Cancelled" if c.status == "cancelled" else "Pending")),
            "notes": c.notes or "",
            "ref": c.transaction_reference or ""
        }
        for c in items
    ]


@router.get("/admin/contributions")
def get_all_contributions(
    db: Session = Depends(get_db)
):
    items = (
        db.query(Contribution, Member)
        .join(Member, Contribution.member_id == Member.id)
        .order_by(desc(Contribution.contribution_date), desc(Contribution.id))
        .all()
    )

    return [
        {
            "id": c.receipt_number or f"PBK-C{str(c.id).zfill(3)}",
            "db_id": c.id,
            "member": f"{m.first_name} {m.last_name or ''}".strip(),
            "member_id": m.id,
            "fund": c.fund_name or "General Fund",
            "amount": float(c.contribution_amount),
            "method": c.payment_method or "UPI",
            "status": "Completed" if c.status == "completed" else ("Rejected" if c.status == "rejected" else ("Cancelled" if c.status == "cancelled" else "Pending")),
            "date": c.contribution_date.strftime("%d %b %Y") if c.contribution_date else "",
            "ref": c.transaction_reference or "",
            "notes": c.notes or ""
        }
        for c, m in items
    ]


@router.put("/admin/contributions/{contrib_id}/status")
def update_contribution_status(
    contrib_id: int,
    status: str = Query(...),
    x_admin_role: str | None = Header(None, alias="X-Admin-Role"),
    x_admin_id: int | None = Header(None, alias="X-Admin-Id"),
    db: Session = Depends(get_db)
):
    check_admin_permission("Admin", x_admin_role, x_admin_id, db)
    contrib = db.query(Contribution).filter(Contribution.id == contrib_id).first()
    if not contrib:
        raise HTTPException(status_code=404, detail="Contribution not found")

    old_status = (contrib.status or "").lower()
    new_status = status.lower().strip()
    if new_status not in ["pending", "completed", "rejected", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status. Allowed: pending, completed, rejected, cancelled")

    contrib.status = new_status

    # If cause exists (either directly or via notes/dedication), adjust raised_amount accordingly
    cause = db.query(Cause).filter(Cause.name == contrib.fund_name).first()
    if not cause and contrib.notes:
        for c in db.query(Cause).all():
            if c.name and c.name.lower() in contrib.notes.lower():
                cause = c
                break
    if cause:
        if old_status != "completed" and new_status == "completed":
            cause.raised_amount = float(cause.raised_amount or 0) + float(contrib.contribution_amount)
        elif old_status == "completed" and new_status != "completed":
            cause.raised_amount = max(0.0, float(cause.raised_amount or 0) - float(contrib.contribution_amount))

    # Log activity
    c_mem = db.query(Member).filter(Member.id == contrib.member_id).first()
    m_info = f" for member PBK-M{c_mem.id:03d} ({c_mem.first_name} {c_mem.last_name or ''})" if c_mem else ""
    admin_log = ActivityLog(
        user_type="Admin",
        user_id=1,
        action="Verification",
        description=f"Admin updated contribution {contrib.receipt_number or contrib.id}{m_info} status to {new_status.capitalize()}"
    )
    db.add(admin_log)

    db.commit()

    return {"message": f"Contribution status updated to {new_status.capitalize()}", "status": new_status.capitalize()}


# ==============================================================================
# SECTION 11: MEMBER DIRECTORY & PROFILE PIPELINE
# Linked Frontend: Admin Members Tab & Member Profile Tab
# Endpoints:
#   - GET /api/admin/members            : All active registered members directory
#   - GET /api/members/{id}/profile     : Specific member's complete profile
#   - PUT /api/members/{id}/profile     : Update personal & address details
# ==============================================================================

@router.get("/admin/members")
def get_all_members(
    db: Session = Depends(get_db)
):
    members = db.query(Member).filter(Member.is_deleted == False).order_by(desc(Member.id)).all()

    return [
        {
            "id": f"PBK-M{str(m.id).zfill(3)}",
            "db_id": m.id,
            "name": f"{m.first_name} {m.last_name or ''}".strip(),
            "firstName": m.first_name,
            "lastName": m.last_name or "",
            "gender": "Male" if m.gender == "M" else ("Female" if m.gender == "F" else "Other"),
            "phone": f"+91 {m.phone}" if m.phone and not m.phone.startswith("+91") else (m.phone or "—"),
            "email": m.email or "N/A",
            "city": m.city or "",
            "district": m.district or "",
            "state": m.state or "",
            "address": m.address or "",
            "status": "Active" if m.status == "active" else "Inactive",
            "verified": True,
            "joinDate": m.created_at.strftime("%d %b %Y") if m.created_at else "2026"
        }
        for m in members
    ]


@router.get("/members/{member_id}/profile")

def get_member_profile(
    member_id: int,
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    return {
        "id": member.id,
        "first_name": member.first_name,
        "last_name": member.last_name or "",
        "phone": f"+91 {member.phone}" if member.phone and not member.phone.startswith("+91") else (member.phone or ""),
        "email": member.email or "",
        "gender": member.gender,
        "dob": member.dob or "",
        "door_no": member.door_no or "",
        "state": member.state or "",
        "district": member.district or "",
        "city": member.city or "",
        "village": member.village or "",
        "address": member.address or "",
        "status": member.status
    }


@router.put("/members/{member_id}/profile")
def update_member_profile(
    member_id: int,
    data: MemberProfileUpdate,
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if data.first_name is not None: member.first_name = data.first_name
    if data.last_name is not None: member.last_name = data.last_name
    if data.email is not None: member.email = str(data.email)
    if data.phone is not None: member.phone = data.phone
    if data.dob is not None: member.dob = data.dob
    if data.door_no is not None: member.door_no = data.door_no
    if data.state is not None: member.state = data.state
    if data.district is not None: member.district = data.district
    if data.city is not None: member.city = data.city
    if data.village is not None: member.village = data.village
    if data.address is not None: member.address = data.address

    db.commit()

    return {"message": "Profile updated successfully"}


# ==============================================================================
# SECTION 12: MEMBER SECURITY & CONTACT UPDATE PIPELINE
# Linked Frontend: Member Profile Tab -> Security Settings Sub-panel
# Endpoints:
#   - POST /api/members/{id}/security/change-password : Change password with old pwd or OTP
#   - POST /api/members/{id}/security/send-phone-otp   : Request OTP to update mobile
#   - POST /api/members/{id}/security/verify-phone-otp : Confirm OTP to save new mobile
#   - POST /api/members/{id}/security/send-email-otp   : Request OTP to update email
#   - POST /api/members/{id}/security/verify-email-otp : Confirm OTP to save new email
# ==============================================================================

@router.post("/members/{member_id}/security/change-password")
def member_change_password(
    member_id: int,
    data: MemberPasswordChange,
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if data.otp_id and data.otp_code:
        otp_rec = db.query(RegistrationOTP).filter(RegistrationOTP.id == data.otp_id).first()
        if not otp_rec or otp_rec.status not in ["Pending", "Verified"]:
            raise HTTPException(status_code=400, detail="OTP verification record is invalid or already used.")
        if datetime.now() > otp_rec.expires_at:
            otp_rec.status = "Expired"
            db.commit()
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
        if otp_rec.otp_code != str(data.otp_code).strip():
            otp_rec.attempts += 1
            db.commit()
            raise HTTPException(status_code=400, detail="Incorrect OTP verification code.")
        otp_rec.status = "Used"
    elif data.current_password:
        password_correct = bcrypt.checkpw(
            data.current_password.encode("utf-8"),
            member.password_hash.encode("utf-8")
        )
        if not password_correct:
            raise HTTPException(status_code=400, detail="Current password does not match.")
    else:
        raise HTTPException(status_code=400, detail="Either current password or OTP verification is required.")

    new_pwd = data.new_password.strip()
    if len(new_pwd) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")

    member.password_hash = bcrypt.hashpw(new_pwd.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    db.commit()

    return {"message": "Password updated successfully"}


@router.post("/members/{member_id}/security/send-phone-otp")
def member_send_phone_otp(
    member_id: int,
    data: MemberPhoneOtpSend,
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    clean_new_phone = normalize_phone_number(data.new_phone)
    if len(clean_new_phone) != 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile number.")

    current_clean = normalize_phone_number(member.phone)
    if current_clean == clean_new_phone:
        raise HTTPException(status_code=400, detail="New phone number is the same as your current phone number.")

    existing = db.query(Member).filter(
        Member.id != member_id,
        Member.phone.in_(get_phone_variants(clean_new_phone))
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This phone number is already registered to another member.")

    otp_code = f"{secrets.randbelow(9000) + 1000:04d}"
    expires_at = datetime.now() + timedelta(minutes=10)

    db.query(RegistrationOTP).filter(
        RegistrationOTP.phone.in_(get_phone_variants(clean_new_phone)),
        RegistrationOTP.status == "Pending"
    ).update({"status": "Expired"}, synchronize_session=False)

    new_otp = RegistrationOTP(
        user_type="Member",
        phone=clean_new_phone,
        otp_type="Phone",
        otp_code=otp_code,
        expires_at=expires_at,
        status="Pending",
        attempts=0
    )
    db.add(new_otp)
    db.commit()
    db.refresh(new_otp)

    return {
        "message": f"Verification code sent to +91 {clean_new_phone}",
        "otp_id": new_otp.id,
        "otp_code": otp_code,
        "phone": clean_new_phone
    }


@router.post("/members/{member_id}/security/verify-phone-otp")
def member_verify_phone_otp(
    member_id: int,
    data: MemberPhoneOtpVerify,
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    clean_new_phone = normalize_phone_number(data.new_phone)
    if len(clean_new_phone) != 10:
        raise HTTPException(status_code=400, detail="Invalid phone number format.")

    otp_record = db.query(RegistrationOTP).filter(RegistrationOTP.id == data.otp_id).first()
    if not otp_record:
        raise HTTPException(status_code=404, detail="Verification record not found.")

    if otp_record.status != "Pending":
        raise HTTPException(status_code=400, detail="Verification code is no longer valid.")

    if datetime.now() > otp_record.expires_at:
        otp_record.status = "Expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")

    if otp_record.attempts >= 5:
        otp_record.status = "Expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Maximum verification attempts exceeded.")

    if otp_record.otp_code != str(data.otp_code).strip():
        otp_record.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect verification code. Please try again.")

    existing = db.query(Member).filter(
        Member.id != member_id,
        Member.phone.in_(get_phone_variants(clean_new_phone))
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number is already registered to another member.")

    otp_record.status = "Verified"
    member.phone = clean_new_phone
    db.commit()
    db.refresh(member)

    formatted_phone = f"+91 {clean_new_phone}"
    return {
        "message": "Phone number verified and updated successfully!",
        "phone": formatted_phone,
        "raw_phone": clean_new_phone
    }


@router.post("/members/{member_id}/security/send-email-otp")
def member_send_email_otp(
    member_id: int,
    data: MemberEmailOtpSend,
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    clean_new_email = str(data.new_email).strip().lower()
    if not clean_new_email or "@" not in clean_new_email or "." not in clean_new_email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    if member.email and member.email.strip().lower() == clean_new_email:
        raise HTTPException(status_code=400, detail="New email address is the same as your current email.")

    existing = db.query(Member).filter(
        Member.id != member_id,
        func.lower(Member.email) == clean_new_email
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This email address is already registered to another member.")

    otp_code = f"{secrets.randbelow(9000) + 1000:04d}"
    expires_at = datetime.now() + timedelta(minutes=10)

    db.query(RegistrationOTP).filter(
        func.lower(RegistrationOTP.email) == clean_new_email,
        RegistrationOTP.status == "Pending"
    ).update({"status": "Expired"}, synchronize_session=False)

    new_otp = RegistrationOTP(
        user_type="Member",
        email=clean_new_email,
        otp_type="Email",
        otp_code=otp_code,
        expires_at=expires_at,
        status="Pending",
        attempts=0
    )
    db.add(new_otp)
    db.commit()
    db.refresh(new_otp)

    return {
        "message": f"Verification code sent to {clean_new_email}",
        "otp_id": new_otp.id,
        "otp_code": otp_code,
        "email": clean_new_email
    }


@router.post("/members/{member_id}/security/verify-email-otp")
def member_verify_email_otp(
    member_id: int,
    data: MemberEmailOtpVerify,
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    clean_new_email = str(data.new_email).strip().lower()

    otp_record = db.query(RegistrationOTP).filter(RegistrationOTP.id == data.otp_id).first()
    if not otp_record:
        raise HTTPException(status_code=404, detail="Verification record not found.")

    if otp_record.status != "Pending":
        raise HTTPException(status_code=400, detail="Verification code is no longer valid.")

    if datetime.now() > otp_record.expires_at:
        otp_record.status = "Expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")

    if otp_record.attempts >= 5:
        otp_record.status = "Expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Maximum verification attempts exceeded.")

    if otp_record.otp_code != str(data.otp_code).strip():
        otp_record.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect verification code. Please try again.")

    existing = db.query(Member).filter(
        Member.id != member_id,
        func.lower(Member.email) == clean_new_email
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email address is already registered to another member.")

    otp_record.status = "Verified"
    member.email = clean_new_email
    db.commit()
    db.refresh(member)

    return {
        "message": "Email address verified and updated successfully!",
        "email": member.email
    }


# ==============================================================================
# SECTION 13: MEMBER ACCOUNT LIFECYCLE & 30-DAY RETENTION PIPELINE
# Linked Frontend: Member Profile Tab (Security -> Disable / Delete Account Modal)
# Endpoints:
#   - POST /api/members/{id}/disable          : Temporarily disable member account
#   - POST /api/members/{id}/reactivate       : Reactivate a disabled member account
#   - POST /api/members/{id}/delete/send-otp  : Send 6-digit confirmation OTP for deletion
#   - POST /api/members/{id}/delete/confirm   : Confirm OTP and initiate 30-day retention
#   - POST /api/members/{id}/restore          : Self-restore member account within grace period
# ==============================================================================

@router.post("/members/{member_id}/disable")
def member_disable_account(
    member_id: int,
    data: MemberDisableAccount | None = None,
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member account not found")

    if data and data.password:
        if not bcrypt.checkpw(data.password.encode("utf-8"), member.password_hash.encode("utf-8")):
            raise HTTPException(status_code=400, detail="Incorrect password. Account was not disabled.")

    member.status = "inactive"
    log = ActivityLog(
        user_type="Member",
        user_id=member.id,
        action="Disabled Account",
        description=f"Member PBK-M{member.id:03d} ({member.first_name} {member.last_name or ''}) temporarily disabled their account."
    )
    db.add(log)
    db.commit()

    return {
        "message": "Your account has been temporarily disabled. You can reactivate it at any time by logging in."
    }


@router.post("/members/{member_id}/reactivate")
def member_reactivate_account(
    member_id: int,
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member account not found")

    member.status = "active"
    member.is_deleted = False
    member.scheduled_deletion_at = None
    member.deletion_reason = None

    log = ActivityLog(
        user_type="Member",
        user_id=member.id,
        action="Reactivated Account",
        description=f"Member PBK-M{member.id:03d} ({member.first_name} {member.last_name or ''}) reactivated their account."
    )
    db.add(log)
    db.commit()

    formatted_phone = f"+91 {member.phone}" if member.phone and not member.phone.startswith("+91") else (member.phone or "")

    return {
        "message": "Account reactivated successfully! Welcome back.",
        "member_id": member.id,
        "first_name": member.first_name,
        "last_name": member.last_name or "",
        "phone": formatted_phone,
        "email": member.email or "",
        "role": "member"
    }


@router.post("/members/{member_id}/delete/send-otp")
def member_delete_send_otp(
    member_id: int,
    data: MemberDeleteOtpSend,
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member account not found")

    channel = "Phone" if data.otp_channel.lower() == "phone" else "Email"
    target = member.phone if channel == "Phone" else member.email

    if channel == "Email" and (not target or "@" not in target):
        raise HTTPException(status_code=400, detail="No registered email address found on your profile. Please select Mobile OTP.")

    if channel == "Phone" and not target:
        raise HTTPException(status_code=400, detail="No registered phone number found on your profile.")

    # Generate 6-digit OTP code
    otp_code = f"{secrets.randbelow(900000) + 100000:06d}"
    expires_at = datetime.now() + timedelta(minutes=10)

    # Invalidate previous pending OTPs
    db.query(RegistrationOTP).filter(
        RegistrationOTP.user_type == "Member",
        RegistrationOTP.status == "Pending",
        (RegistrationOTP.phone == member.phone) | (RegistrationOTP.email == member.email)
    ).update({"status": "Expired"}, synchronize_session=False)

    otp_entry = RegistrationOTP(
        user_type="Member",
        phone=member.phone if channel == "Phone" else None,
        email=member.email if channel == "Email" else None,
        otp_type=channel,
        otp_code=otp_code,
        expires_at=expires_at,
        status="Pending",
        attempts=0
    )
    db.add(otp_entry)
    db.commit()
    db.refresh(otp_entry)

    if channel == "Phone":
        masked = f"+91 ******{member.phone[-4:]}" if len(member.phone) >= 4 else member.phone
    else:
        parts = member.email.split("@")
        masked = f"{parts[0][:2]}***@{parts[1]}" if len(parts) == 2 else member.email

    return {
        "message": f"Verification code sent to registered {channel} ({masked}).",
        "otp_id": otp_entry.id,
        "otp_code": otp_code,
        "masked_target": masked,
        "channel": channel
    }


@router.post("/members/{member_id}/delete/confirm")
def member_delete_confirm(
    member_id: int,
    data: MemberDeleteConfirm,
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member account not found")

    otp_rec = db.query(RegistrationOTP).filter(RegistrationOTP.id == data.otp_id).first()
    if not otp_rec or otp_rec.status != "Pending":
        raise HTTPException(status_code=400, detail="Invalid or expired OTP verification request.")

    if datetime.now() > otp_rec.expires_at:
        otp_rec.status = "Expired"
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new verification code.")

    if otp_rec.attempts >= 5:
        otp_rec.status = "Expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Maximum OTP verification attempts exceeded.")

    if otp_rec.otp_code != str(data.otp_code).strip():
        otp_rec.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect OTP verification code.")

    otp_rec.status = "Used"

    # Full snapshot of member before scheduling deletion
    contribs = db.query(Contribution).filter(Contribution.member_id == member_id).all()
    docs = db.query(MemberDocument).filter(MemberDocument.member_id == member_id).all()

    member_snapshot = {
        "id": member.id,
        "pbk_id": f"PBK-M{str(member.id).zfill(3)}",
        "first_name": member.first_name,
        "last_name": member.last_name or "",
        "gender": member.gender,
        "phone": member.phone,
        "email": member.email or "",
        "dob": member.dob or "",
        "door_no": member.door_no or "",
        "state": member.state or "",
        "district": member.district or "",
        "city": member.city or "",
        "village": member.village or "",
        "address": member.address or "",
        "password_hash": member.password_hash,
        "status": member.status,
        "created_at": member.created_at.isoformat() if member.created_at else None,
        "contributions_count": len(contribs),
        "total_contributed": sum(float(c.contribution_amount or 0) for c in contribs),
        "contributions": [
            {
                "id": c.id,
                "receipt_number": c.receipt_number,
                "amount": float(c.contribution_amount or 0),
                "fund_name": c.fund_name,
                "payment_method": c.payment_method,
                "transaction_reference": c.transaction_reference,
                "status": c.status,
                "date": c.contribution_date.isoformat() if c.contribution_date else None
            }
            for c in contribs
        ],
        "documents": [
            {
                "id": d.id,
                "document_type": d.document_type,
                "document_name": d.document_name,
                "verification_status": d.verification_status
            }
            for d in docs
        ]
    }

    expires_at = datetime.now() + timedelta(days=30)
    del_rec = DeletedRecord(
        record_type="Member",
        record_id=member.id,
        record_name=f"{member.first_name} {member.last_name or ''}".strip(),
        record_data=json.dumps(member_snapshot, default=str),
        deleted_by="Member",
        reason=data.reason or "Member self-service account deletion request (30-day retention countdown)",
        deleted_at=datetime.now(),
        expires_at=expires_at,
        status="Pending"
    )
    db.add(del_rec)

    # Soft delete member
    member.is_deleted = True
    member.status = "inactive"
    member.scheduled_deletion_at = expires_at
    member.deletion_reason = data.reason or "Self-requested deletion (30 days retention)"

    log = ActivityLog(
        user_type="Member",
        user_id=member.id,
        action="Scheduled Account Deletion",
        description=f"Member PBK-M{member.id:03d} ({member.first_name} {member.last_name or ''}) scheduled account deletion with 30-day grace period ending on {expires_at.strftime('%d %b %Y')}."
    )
    db.add(log)
    db.commit()

    return {
        "message": "Account scheduled for deletion. You have 30 days to cancel this request by simply logging in.",
        "expires_at": expires_at.strftime("%d %b %Y, %I:%M %p"),
        "days_remaining": 30
    }


@router.post("/members/{member_id}/restore")
def member_self_restore(
    member_id: int,
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member account not found")

    if member.is_deleted and member.scheduled_deletion_at and datetime.now() > member.scheduled_deletion_at:
        raise HTTPException(status_code=403, detail="The 30-day grace period has expired. Account cannot be restored.")

    member.is_deleted = False
    member.status = "active"
    member.scheduled_deletion_at = None
    member.deletion_reason = None

    del_records = db.query(DeletedRecord).filter(
        DeletedRecord.record_type == "Member",
        DeletedRecord.record_id == member_id,
        DeletedRecord.status == "Pending"
    ).all()
    for dr in del_records:
        dr.status = "Restored"
        dr.restored_at = datetime.now()

    log = ActivityLog(
        user_type="Member",
        user_id=member.id,
        action="Restored Account",
        description=f"Member PBK-M{member.id:03d} ({member.first_name} {member.last_name or ''}) canceled deletion request and restored account back to active."
    )
    db.add(log)
    db.commit()

    formatted_phone = f"+91 {member.phone}" if member.phone and not member.phone.startswith("+91") else (member.phone or "")

    return {
        "message": "Account restored successfully! Welcome back to PBK Community Fund.",
        "member_id": member.id,
        "first_name": member.first_name,
        "last_name": member.last_name or "",
        "phone": formatted_phone,
        "email": member.email or "",
        "role": "member"
    }



# ==============================================================================
# SECTION 14: ADMIN DASHBOARD METRICS & KPI OVERVIEW
# Linked Frontend: Admin Portal -> Overview Tab (KPI Cards, Balance, Recent Activity)
# Endpoints:
#   - GET /api/admin/dashboard-stats : Summary counts, collections, usages, and balance
# ==============================================================================

@router.get("/admin/dashboard-stats")
def get_admin_dashboard_stats(
    db: Session = Depends(get_db)
):
    active_funds_rows = db.query(Fund).filter(Fund.status == "Active").all()
    active_fund_names = [f.name for f in active_funds_rows]
    active_fund_ids = [f.id for f in active_funds_rows]
    all_funds_map = {f.name: f.status for f in db.query(Fund).all()}
    total_members = db.query(func.count(Member.id)).filter(Member.status == "Active").scalar() or 0

    total_amount = (
        db.query(func.coalesce(func.sum(Contribution.contribution_amount), 0))
        .filter(Contribution.status == "completed")
        .filter(Contribution.fund_name.in_(active_fund_names))
        .scalar()
    ) or 0
    total_count = (
        db.query(func.count(Contribution.id))
        .filter(Contribution.fund_name.in_(active_fund_names))
        .scalar()
    ) or 0
    total_used = (
        db.query(func.coalesce(func.sum(FundUsage.amount), 0))
        .filter(func.lower(FundUsage.status).in_(["completed", "approved"]))
        .filter((FundUsage.fund_id.in_(active_fund_ids)) | (FundUsage.fund_type.in_(active_fund_names)))
        .scalar()
    ) or 0
    active_funds = len(active_funds_rows)
    published_causes = db.query(func.count(Cause.id)).filter(Cause.status == "Published").scalar() or 0

    recent_items = (
        db.query(Contribution, Member)
        .join(Member, Contribution.member_id == Member.id)
        .order_by(desc(Contribution.id))
        .limit(5)
        .all()
    )

    recent_list = [
        {
            "id": c.receipt_number or f"PBK-C{str(c.id).zfill(3)}",
            "member": f"{m.first_name} {m.last_name or ''}".strip(),
            "amount": float(c.contribution_amount),
            "fund": c.fund_name or "General Fund",
            "fund_status": all_funds_map.get(c.fund_name, "Active"),
            "date": c.contribution_date.strftime("%d %b %Y") if c.contribution_date else "",
            "status": "Completed" if c.status == "completed" else c.status.capitalize(),
            "payment_method": c.payment_method or "UPI"
        }
        for c, m in recent_items
    ]

    return {
        "total_members": total_members,
        "total_contributions_amount": float(total_amount),
        "total_contributions_count": total_count,
        "total_used_amount": float(total_used),
        "current_balance": float(max(0.0, float(total_amount) - float(total_used))),
        "active_funds_count": active_funds,
        "published_causes_count": published_causes,
        "recent_contributions": recent_list
    }


# ==============================================================================
# SECTION 15: ADMIN ACTIVITY & AUDIT LOGS PIPELINE
# Linked Frontend: Admin Portal -> Active Login / Activity Logs Tab
# Endpoints:
#   - GET /api/admin/activity-logs : Audit trail of administrative and member actions
# ==============================================================================

@router.get("/admin/activity-logs")
def get_activity_logs(
    db: Session = Depends(get_db)
):
    import re
    logs = db.query(ActivityLog).order_by(desc(ActivityLog.id)).limit(150).all()

    # Preload members, admins, and deleted records for fast resolution
    members_map = {m.id: m for m in db.query(Member).all()}
    admins_map = {a.id: a for a in db.query(Admin).all()}
    deleted_members_map = {r.record_id: r for r in db.query(DeletedRecord).filter(DeletedRecord.record_type == "Member").all()}

    res = []
    for l in logs:
        # 1. Resolve actor display
        if l.user_type == "Admin":
            adm = admins_map.get(l.user_id)
            if adm:
                adm_name = f"{adm.first_name} {adm.last_name or ''}".strip().title()
                role_label = adm.role or "Super Admin"
                actor_display = f"{adm_name} ({role_label})"
            else:
                actor_display = "Sai Kumar (Super Admin)"
            actor_role = "Admin"
        else:
            mem = members_map.get(l.user_id)
            if mem:
                mem_name = f"{mem.first_name} {mem.last_name or ''}".strip().title()
                actor_display = f"{mem_name} (Member)"
            elif l.user_id in deleted_members_map:
                del_m = deleted_members_map[l.user_id]
                actor_display = f"{del_m.record_name.strip().title()} (Member)"
            else:
                actor_display = f"Member #{l.user_id}"
            actor_role = "Member"

        # 2. Resolve target member details
        target_m_id = "-"
        target_m_name = "-"

        log_desc = l.description or ""
        m_id_match = re.search(r'\bPBK-M0*(\d+)\b', log_desc, re.IGNORECASE)
        m_num_match = re.search(r'\bmember\s+#?(\d+)\b', log_desc, re.IGNORECASE)

        ref_id = None
        if m_id_match:
            ref_id = int(m_id_match.group(1))
        elif m_num_match:
            ref_id = int(m_num_match.group(1))
        elif l.user_type == "Member":
            ref_id = l.user_id

        if ref_id and ref_id in members_map:
            m_obj = members_map[ref_id]
            target_m_id = f"PBK-M{m_obj.id:03d}"
            target_m_name = f"{m_obj.first_name} {m_obj.last_name or ''}".strip().title()
        elif ref_id and ref_id in deleted_members_map:
            del_m = deleted_members_map[ref_id]
            target_m_id = f"PBK-M{ref_id:03d}"
            target_m_name = del_m.record_name.strip().title()
        elif ref_id:
            target_m_id = f"PBK-M{ref_id:03d}"
            name_in_paren = re.search(r'\bPBK-M\d+\s*\(([^)]+)\)', log_desc, re.IGNORECASE)
            if name_in_paren:
                target_m_name = name_in_paren.group(1).strip().title()
        else:
            c_match = re.search(r'\b(PBK-C\d+)\b', log_desc, re.IGNORECASE)
            if c_match:
                rc_num = c_match.group(1)
                c_obj = db.query(Contribution).filter(Contribution.receipt_number == rc_num).first()
                if c_obj and c_obj.member_id in members_map:
                    m_obj = members_map[c_obj.member_id]
                    target_m_id = f"PBK-M{m_obj.id:03d}"
                    target_m_name = f"{m_obj.first_name} {m_obj.last_name or ''}".strip().title()
                elif c_obj and c_obj.member_id in deleted_members_map:
                    del_m = deleted_members_map[c_obj.member_id]
                    target_m_id = f"PBK-M{del_m.record_id:03d}"
                    target_m_name = del_m.record_name.strip().title()

        # Fallback: scan if any known member name is referenced in log_desc
        if target_m_id == "-":
            for m_id, m_obj in members_map.items():
                if m_obj.first_name and len(m_obj.first_name) >= 3 and re.search(r'\b' + re.escape(m_obj.first_name) + r'\b', log_desc, re.IGNORECASE):
                    target_m_id = f"PBK-M{m_obj.id:03d}"
                    target_m_name = f"{m_obj.first_name} {m_obj.last_name or ''}".strip().title()
                    break

        # 3. Categorize Change Type
        action_lower = (l.action or "").lower()
        desc_lower = log_desc.lower()

        if "login" in action_lower or "login" in desc_lower or "logged in" in desc_lower:
            change_type = "Login"
        elif "delete" in action_lower or "delete" in desc_lower or "archived" in desc_lower:
            change_type = "Delete"
        elif "status" in action_lower or "status" in desc_lower or "disabled" in desc_lower or "enabled" in desc_lower or "inactive" in desc_lower or ("active" in desc_lower and "changed" in desc_lower):
            change_type = "Status Change"
        elif "verif" in action_lower or "verif" in desc_lower or "rejected" in desc_lower or "completed" in desc_lower:
            change_type = "Verification"
        elif "contribut" in action_lower or "contribut" in desc_lower:
            change_type = "Contribution"
        elif "create" in action_lower or "created" in desc_lower or "add" in action_lower or "added" in desc_lower or "registered" in desc_lower or "invitation" in desc_lower:
            change_type = "Create / Add"
        elif "publish" in action_lower or "publish" in desc_lower:
            change_type = "Publish"
        else:
            change_type = "Edit / Update"

        res.append({
            "id": l.id,
            "time": l.created_at.strftime("%I:%M %p") if l.created_at else "-",
            "date": l.created_at.strftime("%d %b %Y") if l.created_at else "-",
            "actor": actor_display,
            "actor_role": actor_role,
            "member_id": target_m_id,
            "member_name": target_m_name,
            "change_type": change_type,
            "action": l.action or "Activity",
            "description": log_desc or l.action
        })
    return res


# ==============================================================================
# SECTION 16: FUND UPDATES & SOFT-DELETION PIPELINE
# Linked Frontend: Admin Funds Tab (Edit Fund modal & Delete Fund confirmation)
# Endpoints:
#   - PUT    /api/funds/{fund_id} : Update fund target, year, or active status
#   - DELETE /api/funds/{fund_id} : Soft-delete fund with snapshot archived to deleted_records
# ==============================================================================

@router.put("/funds/{fund_id}")
def update_fund(
    fund_id: int,
    data: FundUpdate,
    x_admin_role: str | None = Header(None, alias="X-Admin-Role"),
    x_admin_id: int | None = Header(None, alias="X-Admin-Id"),
    db: Session = Depends(get_db)
):
    check_admin_permission("Admin", x_admin_role, x_admin_id, db)
    fund = db.query(Fund).filter(Fund.id == fund_id).first()
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    if data.name is not None: fund.name = data.name
    if data.target_amount is not None: fund.target_amount = data.target_amount
    if data.status is not None: fund.status = data.status
    if data.financial_year is not None: fund.financial_year = data.financial_year
    db.commit()
    return {"message": "Fund updated successfully"}


@router.delete("/funds/{fund_id}")
def delete_fund(
    fund_id: int,
    x_admin_role: str | None = Header(None, alias="X-Admin-Role"),
    x_admin_id: int | None = Header(None, alias="X-Admin-Id"),
    db: Session = Depends(get_db)
):
    check_admin_permission("Admin", x_admin_role, x_admin_id, db)
    fund = db.query(Fund).filter(Fund.id == fund_id).first()
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    norm_name = (fund.name or "").lower().strip()
    if norm_name in ["youth fund", "village fund", "village", "general fund"]:
        raise HTTPException(
            status_code=400,
            detail="Permanent funds (Youth Fund, Village Fund, General Fund) cannot be deleted."
        )

    # 1. Snapshot fund details and all usage records before deletion
    usages = db.query(FundUsage).filter(FundUsage.fund_id == fund_id).all()
    fund_snapshot = {
        "fund_id": fund.id,
        "name": fund.name,
        "target_amount": float(fund.target_amount or 0),
        "financial_year": fund.financial_year,
        "status": fund.status,
        "created_at": fund.created_at.isoformat() if fund.created_at else None,
        "usages_count": len(usages),
        "usages": [
            {
                "id": u.id,
                "usage_date": u.usage_date.isoformat() if u.usage_date else None,
                "purpose": u.purpose,
                "amount": float(u.amount or 0),
                "status": u.status,
                "notes": u.notes
            }
            for u in usages
        ]
    }

    archive_entry = DeletedRecord(
        record_type="Fund",
        record_id=fund.id,
        record_name=fund.name,
        record_data=json.dumps(fund_snapshot, default=str),
        deleted_by="Admin",
        reason="Admin initiated fund deletion"
    )
    db.add(archive_entry)

    # Log to ActivityLog
    log = ActivityLog(
        user_type="Admin",
        user_id=1,
        action="Deleted Fund",
        description=f"Admin deleted fund #{fund.id} ('{fund.name}'). Full snapshot archived to deleted_records table."
    )
    db.add(log)

    db.query(FundUsage).filter(FundUsage.fund_id == fund_id).delete(synchronize_session=False)
    db.delete(fund)
    db.commit()
    return {"message": "Fund permanently deleted and full snapshot archived to deleted_records table"}



# ==============================================================================
# SECTION 17: FUND USAGE & EXPENSES BREAKDOWN PIPELINE
# Linked Frontend: Admin Funds Tab -> Fund Usage / Expense Tracking Modal
# Endpoints:
#   - GET    /api/fund-usage            : List all expense disbursements
#   - POST   /api/fund-usage            : Record a new fund usage / expense
#   - PUT    /api/fund-usage/{usage_id} : Update expense amount, purpose, or status
#   - DELETE /api/fund-usage/{usage_id} : Delete an expense disbursement record
# ==============================================================================

@router.get("/fund-usage")
def get_fund_usage(
    fund_type: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(FundUsage)
    if fund_type and fund_type.strip() and fund_type.strip().lower() != "all":
        query = query.filter(func.lower(FundUsage.fund_type) == fund_type.strip().lower())
    usages = query.order_by(desc(FundUsage.usage_date), desc(FundUsage.id)).all()
    return [
        {
            "id": u.id,
            "fund_id": u.fund_id,
            "date": u.usage_date.strftime("%d %b %Y") if u.usage_date else "",
            "raw_date": u.usage_date.strftime("%Y-%m-%d") if u.usage_date else "",
            "fundType": u.fund_type or (u.fund.name if u.fund else "General Fund"),
            "purpose": u.purpose,
            "amount": float(u.amount),
            "status": u.status,
            "notes": u.notes or ""
        }
        for u in usages
    ]


@router.post("/fund-usage")
def create_fund_usage(
    data: FundUsageCreate,
    x_admin_role: str | None = Header(None, alias="X-Admin-Role"),
    x_admin_id: int | None = Header(None, alias="X-Admin-Id"),
    db: Session = Depends(get_db)
):
    check_admin_permission("Admin", x_admin_role, x_admin_id, db)
    fund = None
    if data.fund_id:
        fund = db.query(Fund).filter(Fund.id == data.fund_id).first()
    if not fund and data.fund_type:
        fund = db.query(Fund).filter(Fund.name == data.fund_type).first()
    if not fund:
        fund = db.query(Fund).first()

    u_date = date.today()
    if data.usage_date:
        try:
            u_date = datetime.strptime(data.usage_date, "%Y-%m-%d").date()
        except Exception:
            u_date = date.today()

    new_usage = FundUsage(
        fund_id=fund.id if fund else 1,
        usage_date=u_date,
        fund_type=data.fund_type or (fund.name if fund else "General Fund"),
        purpose=data.purpose,
        amount=data.amount,
        status=data.status or "Completed",
        notes=data.notes
    )
    db.add(new_usage)

    log = ActivityLog(
        user_type="Admin",
        user_id=1,
        action="Fund Usage",
        description=f"Recorded fund usage of ₹{data.amount} for {data.purpose}"
    )
    db.add(log)

    db.commit()
    db.refresh(new_usage)
    return {
        "message": "Fund usage recorded successfully",
        "id": new_usage.id,
        "date": new_usage.usage_date.strftime("%d %b %Y") if new_usage.usage_date else "",
        "raw_date": new_usage.usage_date.strftime("%Y-%m-%d") if new_usage.usage_date else "",
        "fundType": new_usage.fund_type,
        "purpose": new_usage.purpose,
        "amount": float(new_usage.amount),
        "status": new_usage.status
    }


@router.put("/fund-usage/{usage_id}")
def update_fund_usage(
    usage_id: int,
    data: FundUsageUpdate,
    x_admin_role: str | None = Header(None, alias="X-Admin-Role"),
    x_admin_id: int | None = Header(None, alias="X-Admin-Id"),
    db: Session = Depends(get_db)
):
    check_admin_permission("Admin", x_admin_role, x_admin_id, db)
    u = db.query(FundUsage).filter(FundUsage.id == usage_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Fund usage record not found")

    if data.fund_id is not None:
        fund = db.query(Fund).filter(Fund.id == data.fund_id).first()
        if fund:
            u.fund_id = fund.id
    if data.fund_type is not None:
        fund = db.query(Fund).filter(Fund.name == data.fund_type).first()
        if fund:
            u.fund_id = fund.id
        u.fund_type = data.fund_type

    if data.usage_date is not None:
        try:
            u.usage_date = datetime.strptime(data.usage_date, "%Y-%m-%d").date()
        except Exception:
            pass

    if data.purpose is not None:
        u.purpose = data.purpose
    if data.amount is not None:
        u.amount = data.amount
    if data.status is not None:
        u.status = data.status
    if data.notes is not None:
        u.notes = data.notes

    db.commit()
    db.refresh(u)

    log = ActivityLog(
        user_type="Admin",
        user_id=1,
        action="Fund Usage",
        description=f"Updated fund usage of ₹{u.amount} for {u.purpose}"
    )
    db.add(log)
    db.commit()

    return {
        "message": "Fund usage updated successfully",
        "id": u.id,
        "date": u.usage_date.strftime("%d %b %Y") if u.usage_date else "",
        "raw_date": u.usage_date.strftime("%Y-%m-%d") if u.usage_date else "",
        "fundType": u.fund_type or (u.fund.name if u.fund else "General Fund"),
        "purpose": u.purpose,
        "amount": float(u.amount),
        "status": u.status
    }


@router.delete("/fund-usage/{usage_id}")
def delete_fund_usage(
    usage_id: int,
    x_admin_role: str | None = Header(None, alias="X-Admin-Role"),
    x_admin_id: int | None = Header(None, alias="X-Admin-Id"),
    db: Session = Depends(get_db)
):
    check_admin_permission("Admin", x_admin_role, x_admin_id, db)
    u = db.query(FundUsage).filter(FundUsage.id == usage_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Fund usage record not found")
    db.delete(u)
    db.commit()
    return {"message": "Fund usage record deleted"}


# ==============================================================================
# SECTION 18: CAUSES & ANNOUNCEMENTS UPDATES / DELETION PIPELINE
# Linked Frontend: Admin Cases & Events Tab and Admin Announcements Tab
# Endpoints:
#   - PUT    /api/causes/{cause_id}        : Modify cause targets or publication status
#   - DELETE /api/causes/{cause_id}        : Delete a community cause
#   - PUT    /api/announcements/{ann_id}   : Update announcement title, message, status
#   - DELETE /api/announcements/{ann_id}   : Delete an announcement
# ==============================================================================

@router.put("/causes/{cause_id}")
def update_cause(
    cause_id: int,
    data: CauseUpdate,
    db: Session = Depends(get_db)
):
    c = db.query(Cause).filter(Cause.id == cause_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cause not found")
    if data.name is not None: c.name = data.name
    if data.description is not None: c.description = data.description

    active_members = db.query(Member).filter(Member.status == "active").count() or 1
    if data.target_per_member is not None:
        c.target_per_member = data.target_per_member
        c.target_amount = float(data.target_amount) if (data.target_amount and data.target_amount > data.target_per_member) else (data.target_per_member * active_members)
    elif data.target_amount is not None:
        c.target_amount = data.target_amount

    if data.status is not None: c.status = data.status

    log = ActivityLog(
        user_type="Admin",
        user_id=1,
        action="Updated Cause",
        description=f"Admin updated cause '{c.name}' (#{c.cause_code}) - Status: {c.status}, Target: ₹{float(c.target_per_member or 0):,.0f}/member"
    )
    db.add(log)

    db.commit()
    return {"message": "Cause updated successfully"}


@router.delete("/causes/{cause_id}")
def delete_cause(
    cause_id: int,
    db: Session = Depends(get_db)
):
    c = db.query(Cause).filter(Cause.id == cause_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cause not found")

    log = ActivityLog(
        user_type="Admin",
        user_id=1,
        action="Deleted Cause",
        description=f"Admin deleted cause '{c.name}' (#{c.cause_code})"
    )
    db.add(log)

    db.delete(c)
    db.commit()
    return {"message": "Cause deleted successfully"}


@router.put("/announcements/{ann_id}")
def update_announcement(
    ann_id: int,
    data: AnnouncementUpdate,
    db: Session = Depends(get_db)
):
    a = db.query(Announcement).filter(Announcement.id == ann_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Announcement not found")
    if data.title is not None: a.title = data.title
    if data.message is not None: a.message = data.message
    if data.announcement_type is not None: a.announcement_type = data.announcement_type
    if data.status is not None: a.status = data.status
    db.commit()
    return {"message": "Announcement updated successfully"}


@router.delete("/announcements/{ann_id}")
def delete_announcement(
    ann_id: int,
    db: Session = Depends(get_db)
):
    a = db.query(Announcement).filter(Announcement.id == ann_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(a)
    db.commit()
    return {"message": "Announcement deleted successfully"}


# ==============================================================================
# SECTION 19: ADMIN MEMBER MANAGEMENT & SOFT-DELETION PIPELINE
# Linked Frontend: Admin Portal -> Members Tab (Add, Edit, Toggle Status, Delete)
# Endpoints:
#   - POST   /api/admin/members               : Admin creates member with initial password
#   - PUT    /api/admin/members/{member_id}   : Admin updates member personal details
#   - PUT    /api/admin/members/{id}/status   : Admin activates/deactivates member
#   - DELETE /api/admin/members/{member_id}   : Soft-deletes member into Recycle Bin (30-day retention)
# ==============================================================================

@router.post("/admin/members")
def admin_create_member(
    data: MemberAdminCreate,
    x_admin_role: str | None = Header(None, alias="X-Admin-Role"),
    x_admin_id: int | None = Header(None, alias="X-Admin-Id"),
    db: Session = Depends(get_db)
):
    check_admin_permission("Super Admin", x_admin_role, x_admin_id, db)
    clean_phone = normalize_phone_number(data.phone)
    if not clean_phone or len(clean_phone) != 10:
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid 10-digit mobile number."
        )

    # 1. Unique Phone Check against all format variants
    existing_phone = db.query(Member).filter(
        Member.phone.in_(get_phone_variants(data.phone))
    ).first()
    if existing_phone:
        raise HTTPException(
            status_code=400,
            detail=f"Phone number '{clean_phone}' is already registered to '{existing_phone.first_name} {existing_phone.last_name or ''}'. Please use a unique phone number."
        )

    # 2. Unique Email Check (if email provided)
    clean_email = data.email.strip().lower() if data.email and data.email.strip() else None
    if clean_email in ["n/a", "na", "none", "null", "-", ""]:
        clean_email = None

    if clean_email:
        existing_email = db.query(Member).filter(
            func.lower(Member.email) == clean_email
        ).first()
        if existing_email:
            raise HTTPException(
                status_code=400,
                detail=f"Email address '{clean_email}' is already registered to '{existing_email.first_name} {existing_email.last_name or ''}'. Please use a unique email address."
            )

    initial_password = (data.password.strip() if data.password and data.password.strip() else "Member@123")
    hashed = bcrypt.hashpw(initial_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    gender_val = "M" if data.gender.upper().startswith("M") else ("F" if data.gender.upper().startswith("F") else "N")

    m = Member(
        first_name=data.first_name.strip(),
        last_name=(data.last_name or "").strip(),
        gender=gender_val,
        phone=clean_phone,
        email=clean_email,
        password_hash=hashed,
        status="active" if (data.status or "").lower() == "active" else "inactive"
    )
    db.add(m)
    db.commit()
    db.refresh(m)

    log = ActivityLog(
        user_type="Admin",
        user_id=1,
        action="Member Created",
        description=f"Admin created new member PBK-M{m.id:03d} ({m.first_name} {m.last_name or ''}) - Status: {m.status.capitalize()}"
    )
    db.add(log)
    db.commit()

    return {
        "message": "Member created and saved in database successfully",
        "id": m.id,
        "default_password": initial_password
    }


@router.put("/admin/members/{member_id}")
def admin_update_member(
    member_id: int,
    data: MemberAdminUpdate,
    x_admin_role: str | None = Header(None, alias="X-Admin-Role"),
    x_admin_id: int | None = Header(None, alias="X-Admin-Id"),
    db: Session = Depends(get_db)
):
    check_admin_permission("Super Admin", x_admin_role, x_admin_id, db)
    m = db.query(Member).filter(Member.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")

    if data.phone is not None:
        clean_p = normalize_phone_number(data.phone)
        if len(clean_p) != 10:
            raise HTTPException(status_code=400, detail="Please provide a valid 10-digit phone number.")
        other_phone = db.query(Member).filter(
            Member.id != member_id,
            Member.phone.in_(get_phone_variants(data.phone))
        ).first()
        if other_phone:
            raise HTTPException(
                status_code=400,
                detail=f"Phone number '{clean_p}' is already registered to another member ('{other_phone.first_name} {other_phone.last_name or ''}')."
            )
        m.phone = clean_p

    if data.email is not None:
        clean_e = data.email.strip().lower() if data.email.strip() else None
        if clean_e in ["n/a", "na", "none", "null", "-", ""]:
            clean_e = None

        if clean_e:
            other_email = db.query(Member).filter(
                Member.id != member_id,
                func.lower(Member.email) == clean_e
            ).first()
            if other_email:
                raise HTTPException(
                    status_code=400,
                    detail=f"Email address '{clean_e}' is already registered to another member ('{other_email.first_name} {other_email.last_name or ''}')."
                )
            m.email = clean_e
        else:
            m.email = None

    if data.first_name is not None: m.first_name = data.first_name.strip()
    if data.last_name is not None: m.last_name = data.last_name.strip()
    if data.gender is not None:
        m.gender = "M" if data.gender.upper().startswith("M") else ("F" if data.gender.upper().startswith("F") else "N")
    if data.status is not None: m.status = data.status.lower()

    changed_items = []
    if data.first_name is not None: changed_items.append("First Name")
    if data.last_name is not None: changed_items.append("Last Name")
    if data.phone is not None: changed_items.append("Phone")
    if data.email is not None: changed_items.append("Email")
    if data.gender is not None: changed_items.append("Gender")
    if data.status is not None: changed_items.append("Status")
    change_desc = ", ".join(changed_items) if changed_items else "Profile Details"

    log = ActivityLog(
        user_type="Admin",
        user_id=1,
        action="Member Updated",
        description=f"Admin updated member PBK-M{m.id:03d} ({m.first_name} {m.last_name or ''}) - updated {change_desc}"
    )
    db.add(log)

    db.commit()
    return {"message": "Member updated successfully in database"}


@router.put("/admin/members/{member_id}/status")
def admin_toggle_member_status(
    member_id: int,
    status: str | None = None,
    payload: dict | None = None,
    x_admin_role: str | None = Header(None, alias="X-Admin-Role"),
    x_admin_id: int | None = Header(None, alias="X-Admin-Id"),
    db: Session = Depends(get_db)
):
    check_admin_permission("Super Admin", x_admin_role, x_admin_id, db)
    m = db.query(Member).filter(Member.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")

    target_status = (status or (payload.get("status") if payload else "")).strip().lower()
    if target_status not in ["active", "inactive"]:
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'inactive'")

    m.status = target_status
    log = ActivityLog(
        user_type="Admin",
        user_id=1,
        action="Member Status Changed",
        description=f"Admin set member PBK-M{m.id:03d} ({m.first_name} {m.last_name or ''}) status to {target_status.capitalize()}"
    )
    db.add(log)
    db.commit()
    db.refresh(m)
    return {
        "message": f"Member account status updated to {target_status.capitalize()}",
        "id": m.id,
        "status": m.status
    }


def restore_member_from_record(deleted_rec: DeletedRecord, db: Session, restored_by: str = "Admin"):
    """
    Restores a member record from DeletedRecord snapshot back into active MySQL tables.
    Handles both soft-deleted rows and historically purged rows.
    """
    data = {}
    try:
        data = json.loads(deleted_rec.record_data)
    except Exception:
        data = {}

    mem_id = deleted_rec.record_id
    m = db.query(Member).filter(Member.id == mem_id).first()

    if m:
        m.is_deleted = False
        m.status = "active"
        m.scheduled_deletion_at = None
        m.deletion_reason = None
    else:
        # Recreate member row from snapshot
        phone = data.get("phone") or f"9{mem_id:09d}"[-10:]
        # Ensure no collision on phone
        existing_phone = db.query(Member).filter(Member.phone == phone).first()
        if existing_phone:
            phone = f"{phone[:8]}{mem_id % 100:02d}"

        pwd_hash = data.get("password_hash")
        if not pwd_hash:
            pwd_hash = bcrypt.hashpw("pbk@123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        m = Member(
            id=mem_id,
            first_name=data.get("first_name", deleted_rec.record_name or "Member"),
            last_name=data.get("last_name", ""),
            gender=data.get("gender", "M"),
            phone=phone,
            email=data.get("email") or None,
            dob=data.get("dob") or None,
            door_no=data.get("door_no") or None,
            state=data.get("state") or None,
            district=data.get("district") or None,
            city=data.get("city") or None,
            village=data.get("village") or None,
            address=data.get("address") or None,
            password_hash=pwd_hash,
            status="active",
            is_deleted=False,
            scheduled_deletion_at=None,
            deletion_reason=None
        )
        db.add(m)
        db.flush()

        # Recreate contributions if any were snapshotted
        contribs_data = data.get("contributions", [])
        for c in contribs_data:
            c_id = c.get("id")
            existing_c = db.query(Contribution).filter(Contribution.id == c_id).first() if c_id else None
            if not existing_c:
                c_date = date.today()
                if c.get("date"):
                    try:
                        c_date = date.fromisoformat(c["date"])
                    except Exception:
                        pass
                new_c = Contribution(
                    id=c_id,
                    member_id=mem_id,
                    contribution_amount=c.get("amount", 0.0),
                    contribution_type="General",
                    fund_name=c.get("fund_name", "General Fund"),
                    contribution_date=c_date,
                    payment_method=c.get("payment_method", "UPI"),
                    transaction_reference=c.get("transaction_reference"),
                    receipt_number=c.get("receipt_number"),
                    status=c.get("status", "completed")
                )
                db.add(new_c)

    deleted_rec.status = "Restored"
    deleted_rec.restored_at = datetime.now()

    log = ActivityLog(
        user_type="Admin" if "Admin" in str(restored_by) else "Member",
        user_id=1 if "Admin" in str(restored_by) else mem_id,
        action="Restored Member Account",
        description=f"{restored_by} restored member PBK-M{mem_id:03d} ({deleted_rec.record_name}) back to active database from Recycle Bin."
    )
    db.add(log)
    db.commit()
    db.refresh(m)
    return m


@router.delete("/admin/members/{member_id}")
def admin_delete_member(
    member_id: int,
    x_admin_role: str | None = Header(None, alias="X-Admin-Role"),
    x_admin_id: int | None = Header(None, alias="X-Admin-Id"),
    db: Session = Depends(get_db)
):
    check_admin_permission("Super Admin", x_admin_role, x_admin_id, db)
    m = db.query(Member).filter(Member.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")

    # Get admin actor name
    admin_actor = "Admin (Super Admin)"
    if x_admin_id:
        adm = db.query(Admin).filter(Admin.id == x_admin_id).first()
        if adm:
            admin_actor = f"{adm.first_name} {adm.last_name or ''} ({adm.role or 'Super Admin'})".strip()

    # 1. Collect full member snapshot before deletion
    contribs = db.query(Contribution).filter(Contribution.member_id == member_id).all()
    docs = db.query(MemberDocument).filter(MemberDocument.member_id == member_id).all()

    member_snapshot = {
        "id": m.id,
        "pbk_id": f"PBK-M{str(m.id).zfill(3)}",
        "first_name": m.first_name,
        "last_name": m.last_name or "",
        "gender": m.gender,
        "phone": m.phone,
        "email": m.email or "",
        "dob": m.dob or "",
        "door_no": m.door_no or "",
        "state": m.state or "",
        "district": m.district or "",
        "city": m.city or "",
        "village": m.village or "",
        "address": m.address or "",
        "password_hash": m.password_hash,
        "status": m.status,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "contributions_count": len(contribs),
        "total_contributed": sum(float(c.contribution_amount or 0) for c in contribs),
        "contributions": [
            {
                "id": c.id,
                "receipt_number": c.receipt_number,
                "amount": float(c.contribution_amount or 0),
                "fund_name": c.fund_name,
                "payment_method": c.payment_method,
                "transaction_reference": c.transaction_reference,
                "status": c.status,
                "date": c.contribution_date.isoformat() if c.contribution_date else None
            }
            for c in contribs
        ],
        "documents": [
            {
                "id": d.id,
                "document_type": d.document_type,
                "document_name": d.document_name,
                "verification_status": d.verification_status
            }
            for d in docs
        ]
    }

    expires_at = datetime.now() + timedelta(days=30)
    archive_entry = DeletedRecord(
        record_type="Member",
        record_id=m.id,
        record_name=f"{m.first_name} {m.last_name or ''}".strip(),
        record_data=json.dumps(member_snapshot, default=str),
        deleted_by=admin_actor,
        reason=f"Admin initiated 30-day soft deletion ({admin_actor})",
        deleted_at=datetime.now(),
        expires_at=expires_at,
        status="Pending"
    )
    db.add(archive_entry)

    # 2. Soft-delete the member
    m.is_deleted = True
    m.status = "inactive"
    m.scheduled_deletion_at = expires_at
    m.deletion_reason = f"Deleted by {admin_actor} (30-day retention countdown)"

    # Log to ActivityLog
    log = ActivityLog(
        user_type="Admin",
        user_id=x_admin_id or 1,
        action="Deleted Member Account",
        description=f"Admin {admin_actor} moved member PBK-M{m.id:03d} ({m.first_name} {m.last_name or ''}) to Recycle Bin with 30-day retention countdown."
    )
    db.add(log)
    db.commit()

    return {
        "message": f"Member PBK-M{m.id:03d} moved to Recycle Bin. Complete snapshot archived with 30-day undo/restore countdown.",
        "expires_at": expires_at.strftime("%d %b %Y, %I:%M %p"),
        "days_remaining": 30
    }


# ==============================================================================
# SECTION 20: RECYCLE BIN & 30-DAY RETENTION RESTORE PIPELINE
# Linked Frontend: Admin Portal -> Recycle Bin Tab (View soft-deleted records, Restore)
# Endpoints:
#   - GET  /api/admin/deleted-records            : List all archived records with countdown
#   - POST /api/admin/deleted-records/{id}/restore: Restore member or fund back to active DB
#   - GET  /api/admin/deleted-members            : Filter for deleted members only
#   - GET  /api/admin/deleted-funds              : Filter for deleted funds only
# ==============================================================================

@router.get("/admin/deleted-records")
def get_deleted_records(
    record_type: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(DeletedRecord)
    if record_type and record_type.strip() and record_type.lower() != "all":
        query = query.filter(func.lower(DeletedRecord.record_type) == record_type.strip().lower())
    records = query.order_by(desc(DeletedRecord.deleted_at), desc(DeletedRecord.id)).all()

    now = datetime.now()
    result = []
    for r in records:
        parsed_data = {}
        try:
            parsed_data = json.loads(r.record_data)
        except Exception:
            parsed_data = {"raw": r.record_data}

        days_remaining = 0
        is_expired = False
        if r.expires_at:
            if now > r.expires_at:
                is_expired = True
                days_remaining = 0
                if r.status == "Pending":
                    r.status = "Purged"
            else:
                delta = r.expires_at - now
                days_remaining = max(1, delta.days + (1 if delta.seconds > 0 else 0))

        result.append({
            "id": r.id,
            "record_type": r.record_type,
            "record_id": r.record_id,
            "formatted_id": f"PBK-M{r.record_id:03d}" if r.record_type == "Member" else f"ID #{r.record_id}",
            "record_name": r.record_name,
            "record_data": parsed_data,
            "deleted_by": r.deleted_by or "Admin",
            "reason": r.reason or "Record deleted",
            "deleted_at": r.deleted_at.strftime("%d %b %Y, %I:%M %p") if r.deleted_at else "",
            "expires_at": r.expires_at.strftime("%d %b %Y, %I:%M %p") if r.expires_at else "",
            "days_remaining": days_remaining,
            "status": r.status or ("Purged" if is_expired else "Pending"),
            "can_restore": (r.status == "Pending" and not is_expired),
            "restored_at": r.restored_at.strftime("%d %b %Y, %I:%M %p") if r.restored_at else None
        })
    db.commit()
    return result


@router.post("/admin/deleted-records/{record_id}/restore")
def admin_restore_deleted_record(
    record_id: int,
    x_admin_role: str | None = Header(None, alias="X-Admin-Role"),
    x_admin_id: int | None = Header(None, alias="X-Admin-Id"),
    db: Session = Depends(get_db)
):
    check_admin_permission("Admin", x_admin_role, x_admin_id, db)

    del_rec = db.query(DeletedRecord).filter(DeletedRecord.id == record_id).first()
    if not del_rec:
        raise HTTPException(status_code=404, detail="Deleted record not found in Recycle Bin.")

    if del_rec.status == "Restored":
        raise HTTPException(status_code=400, detail="This record has already been restored.")

    if del_rec.expires_at and datetime.now() > del_rec.expires_at:
        del_rec.status = "Purged"
        db.commit()
        raise HTTPException(status_code=400, detail="Cannot restore: the 30-day retention grace period has expired.")

    admin_actor = "Admin"
    if x_admin_id:
        adm = db.query(Admin).filter(Admin.id == x_admin_id).first()
        if adm:
            admin_actor = f"{adm.first_name} {adm.last_name or ''} ({adm.role or 'Admin'})".strip()

    if del_rec.record_type == "Member":
        restored_m = restore_member_from_record(del_rec, db, restored_by=admin_actor)
        return {
            "message": f"Member PBK-M{restored_m.id:03d} ({restored_m.first_name} {restored_m.last_name or ''}) successfully restored to active database!",
            "member_id": restored_m.id,
            "status": "Restored"
        }
    elif del_rec.record_type == "Fund":
        fund_data = json.loads(del_rec.record_data)
        existing_f = db.query(Fund).filter(Fund.id == del_rec.record_id).first()
        if not existing_f:
            new_f = Fund(
                id=del_rec.record_id,
                name=fund_data.get("name", del_rec.record_name),
                financial_year=fund_data.get("financial_year", "2026-2027"),
                target_amount=fund_data.get("target_amount", 0.0),
                status=fund_data.get("status", "Active")
            )
            db.add(new_f)
        else:
            existing_f.status = "Active"
        del_rec.status = "Restored"
        del_rec.restored_at = datetime.now()
        db.commit()
        return {
            "message": f"Fund '{del_rec.record_name}' successfully restored to active database!",
            "status": "Restored"
        }
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported record type: {del_rec.record_type}")


@router.get("/admin/deleted-members")
def get_deleted_members(db: Session = Depends(get_db)):
    return get_deleted_records(record_type="Member", db=db)


@router.get("/admin/deleted-funds")
def get_deleted_funds(db: Session = Depends(get_db)):
    return get_deleted_records(record_type="Fund", db=db)



# ==============================================================================
# SECTION 21: CONTRIBUTION / RECEIPT DELETION & INVITATIONS LIST
# Linked Frontend: Admin Receipts Tab & Admin Settings Tab
# Endpoints:
#   - DELETE /api/admin/contributions/{contrib_id} : Permanently delete a contribution record
#   - GET    /api/admin-invitations                : List all generated admin invitation codes
# ==============================================================================

@router.delete("/admin/contributions/{contrib_id}")
def delete_contribution(
    contrib_id: int,
    x_admin_role: str | None = Header(None, alias="X-Admin-Role"),
    x_admin_id: int | None = Header(None, alias="X-Admin-Id"),
    db: Session = Depends(get_db)
):
    check_admin_permission("Admin", x_admin_role, x_admin_id, db)
    c = db.query(Contribution).filter(Contribution.id == contrib_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contribution not found")
    db.delete(c)
    db.commit()
    return {"message": "Contribution record deleted"}


@router.get("/admin-invitations")
def get_admin_invitations(
    db: Session = Depends(get_db)
):
    invites = db.query(AdminInvitation).order_by(desc(AdminInvitation.id)).all()
    return [
        {
            "id": inv.id,
            "status": inv.status,
            "role": inv.role or "Admin",
            "expires_at": inv.expires_at.strftime("%d %b %Y, %I:%M %p") if inv.expires_at else "",
            "created_at": inv.created_at.strftime("%d %b %Y, %I:%M %p") if inv.created_at else "",
            "used_by": inv.used_by_admin_id
        }
        for inv in invites
    ]


# ==============================================================================
# SECTION 22: DONATION & QR SCANNER SETTINGS PIPELINE
# Linked Frontend: Admin Funds Tab (Donation Settings Panel) & Member Contribute Tab
# Endpoints:
#   - GET  /api/donation-settings : Retrieve active UPI ID, bank details, and payee info
#   - POST /api/donation-settings : Update UPI ID, payee name, and bank configuration
# ==============================================================================

DONATION_SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "donation_settings.json")

def load_donation_settings():
    default_settings = {
        "upi_id": "chanda.collection@bank",
        "payee_name": "PBK Community Welfare Fund",
        "bank_name": "State Bank of India",
        "account_number": "987654321012",
        "ifsc_code": "SBIN0001234",
        "branch_name": "Main Branch",
        "notes": "PBK Chanda Contribution"
    }
    if os.path.exists(DONATION_SETTINGS_FILE):
        try:
            with open(DONATION_SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                default_settings.update(data)
        except Exception:
            pass
    return default_settings

def save_donation_settings_to_file(settings: dict):
    with open(DONATION_SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2)

@router.get("/donation-settings")
def get_donation_settings():
    return load_donation_settings()

@router.post("/donation-settings")
def update_donation_settings(
    payload: dict = Body(...),
    x_admin_role: str | None = Header(None, alias="X-Admin-Role"),
    x_admin_id: int | None = Header(None, alias="X-Admin-Id"),
    db: Session = Depends(get_db)
):
    current = load_donation_settings()
    allowed_fields = ["upi_id", "payee_name", "bank_name", "account_number", "ifsc_code", "branch_name", "notes"]
    for k in allowed_fields:
        if k in payload and payload[k] is not None:
            current[k] = str(payload[k]).strip()
    save_donation_settings_to_file(current)
    
    # Activity log
    try:
        admin_uid = int(x_admin_id) if x_admin_id and str(x_admin_id).isdigit() else 1
        log = ActivityLog(
            user_type="Admin",
            user_id=admin_uid,
            action="Updated Donation Settings",
            description=f"Admin updated UPI & Donation Scanner settings (UPI: {current.get('upi_id')}, Payee: {current.get('payee_name')})"
        )
        db.add(log)
        db.commit()
    except Exception:
        pass

    return current

