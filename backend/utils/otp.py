import random
from datetime import datetime, timedelta
from database.connection import execute_query

def generate_otp():
    return f"{random.randint(100000, 999999)}"

def store_otp(email, otp, purpose):
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    execute_query(
        "INSERT INTO otp_verifications (email, otp_code, purpose, expires_at, verified) VALUES (%s, %s, %s, %s, FALSE)",
        (email, otp, purpose, expires_at),
        commit=True
    )

def verify_otp(email, otp, purpose):
    row = execute_query(
        "SELECT id, expires_at FROM otp_verifications WHERE email=%s AND otp_code=%s AND purpose=%s AND verified=FALSE ORDER BY id DESC LIMIT 1",
        (email, otp, purpose),
        fetch_one=True
    )
    if not row:
        return False
    if datetime.utcnow() > row['expires_at']:
        return False
    execute_query("UPDATE otp_verifications SET verified=TRUE WHERE id=%s", (row['id'],), commit=True)
    return True