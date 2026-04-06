from utils.security import hash_password, verify_password, create_access_token
from utils.otp import generate_otp, store_otp, verify_otp
from database.connection import execute_query
from datetime import datetime, timedelta

def register_user(email, password):
    existing = execute_query("SELECT id FROM users WHERE email=%s", (email,), fetch_one=True)
    if existing:
        return False, "Email already registered"
    hashed = hash_password(password)
    execute_query(
        "INSERT INTO users (email, password_hash, is_active) VALUES (%s, %s, FALSE)",
        (email, hashed),
        commit=True
    )
    otp = generate_otp()
    store_otp(email, otp, "register")
    return True, otp

def activate_user(email, otp):
    if not verify_otp(email, otp, "register"):
        return False, "Invalid or expired OTP"
    execute_query("UPDATE users SET is_active=TRUE WHERE email=%s", (email,), commit=True)
    return True, "Account activated"

def login_user(email, password):
    user = execute_query(
        "SELECT id, email, password_hash, is_active, is_super_admin FROM users WHERE email=%s",
        (email,),
        fetch_one=True
    )
    if not user or not verify_password(password, user["password_hash"]):
        return False, "Invalid credentials", None
    if not user["is_active"]:
        return False, "Account not activated", None
    otp = generate_otp()
    store_otp(email, otp, "login")
    return True, otp, user

def verify_login_otp(email, otp):
    if not verify_otp(email, otp, "login"):
        return False, None
    user = execute_query(
        "SELECT id, email, is_super_admin FROM users WHERE email=%s AND is_active=TRUE",
        (email,),
        fetch_one=True
    )
    if not user:
        return False, None
    token = create_access_token(data={
        "sub": user["email"],
        "user_id": user["id"],
        "is_super_admin": user["is_super_admin"]
    })
    expires = datetime.utcnow() + timedelta(minutes=60)
    execute_query(
        "INSERT INTO sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
        (user["id"], token, expires),
        commit=True
    )
    return True, {"access_token": token, "user": user}