from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from utils.security import hash_password, verify_password, create_access_token
from utils.otp import generate_otp, store_otp, verify_otp
from database.connection import execute_query
import logging
import secrets

router = APIRouter(prefix="/auth", tags=["auth"])

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class OTPVerifyRequest(BaseModel):
    email: str
    otp: str
    purpose: str

@router.post("/register")
async def register(req: RegisterRequest):
    existing = execute_query("SELECT id FROM users WHERE email=%s", (req.email,), fetch_one=True)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(req.password)
    execute_query(
        "INSERT INTO users (email, password_hash, is_active, role) VALUES (%s, %s, FALSE, 'user')",
        (req.email, hashed), commit=True
    )
    
    otp = generate_otp()
    store_otp(req.email, otp, "register")
    logging.info(f"OTP for {req.email} (register): {otp}")
    
    return {"message": "User registered. Verify OTP to activate account."}

@router.post("/verify-otp")
async def verify_otp_endpoint(req: OTPVerifyRequest):
    if not verify_otp(req.email, req.otp, req.purpose):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    if req.purpose == "register":
        execute_query("UPDATE users SET is_active=TRUE WHERE email=%s", (req.email,), commit=True)
        return {"message": "Account activated. You can now login."}
    
    elif req.purpose == "login":
        user = execute_query(
            "SELECT id, email, role FROM users WHERE email=%s AND is_active=TRUE",
            (req.email,), fetch_one=True
        )
        if not user:
            raise HTTPException(status_code=401, detail="User not active or does not exist")
        
        token = create_access_token(data={
            "sub": user["email"],
            "user_id": user["id"],
            "role": user["role"]
        })
        
        from datetime import datetime, timedelta
        expires = datetime.utcnow() + timedelta(minutes=60)
        execute_query(
            "INSERT INTO sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
            (user["id"], token, expires), commit=True
        )
        
        # IMPORTANT: Return the user object with role
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "role": user["role"]  # This must be included
            }
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid purpose")

@router.post("/login")
async def login(req: LoginRequest):
    user = execute_query(
        "SELECT id, email, password_hash, is_active FROM users WHERE email=%s",
        (req.email,), fetch_one=True
    )
    
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user["is_active"]:
        raise HTTPException(status_code=401, detail="Account not activated. Verify OTP first.")
    
    # Check if user is blacklisted
    blacklisted = execute_query(
        "SELECT reason, created_at FROM blacklist WHERE user_id=%s",
        (user["id"],), fetch_one=True
    )
    if blacklisted:
        raise HTTPException(
            status_code=403, 
            detail=f"Your account has been blacklisted.\nReason: {blacklisted['reason'] or 'No reason provided'}"
        )
    
    otp = generate_otp()
    store_otp(req.email, otp, "login")
    logging.info(f"Login OTP for {req.email}: {otp}")
    
    return {"message": "OTP sent. Please verify.", "email": req.email}

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    # Check if user exists
    user = execute_query("SELECT id FROM users WHERE email=%s", (req.email,), fetch_one=True)
    if not user:
        # For security, don't reveal if email exists
        return {"message": "If an account with that email exists, an OTP has been sent."}
    
    # Generate OTP and store with purpose 'reset'
    otp = generate_otp()
    store_otp(req.email, otp, "reset")
    logging.info(f"Password reset OTP for {req.email}: {otp}")
    return {"message": "OTP sent to your email."}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    # Verify OTP
    if not verify_otp(req.email, req.otp, "reset"):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Update password
    hashed = hash_password(req.new_password)
    execute_query("UPDATE users SET password_hash=%s WHERE email=%s", (hashed, req.email), commit=True)
    
    # Invalidate all sessions for this user
    user = execute_query("SELECT id FROM users WHERE email=%s", (req.email,), fetch_one=True)
    if user:
        execute_query("DELETE FROM sessions WHERE user_id=%s", (user["id"],), commit=True)
    
    return {"message": "Password reset successful. Please login with your new password."}
