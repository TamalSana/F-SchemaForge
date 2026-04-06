from database.connection import execute_query
from datetime import datetime

def log_audit(user_id, action, details, ip_address=None):
    execute_query(
        "INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (%s, %s, %s, %s)",
        (user_id, action, details, ip_address),
        commit=True
    )

def get_all_logs(limit=200):
    return execute_query(
        "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT %s",
        (limit,),
        fetch_all=True
    )

def get_active_sessions():
    return execute_query(
        "SELECT s.*, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.expires_at > NOW() ORDER BY s.expires_at DESC",
        fetch_all=True
    )

def blacklist_user(user_id, reason, admin_id=None):
    execute_query(
        "INSERT INTO blacklist (user_id, reason) VALUES (%s, %s)",
        (user_id, reason),
        commit=True
    )
    log_audit(admin_id, "BLACKLIST_USER", f"User {user_id} blacklisted. Reason: {reason}")

def update_system_config(key, value):
    execute_query(
        "CREATE TABLE IF NOT EXISTS system_config (`key` VARCHAR(100), `value` TEXT, UNIQUE KEY (`key`))"
    )
    execute_query(
        "REPLACE INTO system_config (`key`, `value`) VALUES (%s, %s)",
        (key, value),
        commit=True
    )

def get_system_config(key):
    row = execute_query(
        "SELECT `value` FROM system_config WHERE `key`=%s",
        (key,),
        fetch_one=True
    )
    return row["value"] if row else None