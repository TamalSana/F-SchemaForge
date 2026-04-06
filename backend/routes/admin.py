from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from database.connection import execute_query
from utils.middleware import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

class ConfigUpdate(BaseModel):
    db_host: str
    db_user: str
    db_password: str
    db_name: str

class BlacklistRequest(BaseModel):
    user_id: int = None
    ip_address: str = None
    reason: str

def require_super_admin(user):
    if not user.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Super admin required")

@router.get("/logs")
async def get_logs(request: Request):
    user = get_current_user(request)
    require_super_admin(user)
    logs = execute_query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200", fetch_all=True)
    return logs

@router.post("/blacklist")
async def add_blacklist(req: BlacklistRequest, request: Request):
    user = get_current_user(request)
    require_super_admin(user)
    execute_query(
        "INSERT INTO blacklist (user_id, ip_address, reason) VALUES (%s, %s, %s)",
        (req.user_id, req.ip_address, req.reason), commit=True
    )
    return {"message": "Blacklisted"}

@router.get("/sessions")
async def get_sessions(request: Request):
    user = get_current_user(request)
    require_super_admin(user)
    sessions = execute_query(
        "SELECT s.*, u.email FROM sessions s JOIN users u ON s.user_id = u.id ORDER BY s.expires_at DESC",
        fetch_all=True
    )
    return sessions

@router.post("/config/db")
async def update_db_config(req: ConfigUpdate, request: Request):
    user = get_current_user(request)
    require_super_admin(user)
    execute_query("CREATE TABLE IF NOT EXISTS system_config (`key` VARCHAR(100), `value` TEXT)")
    execute_query("REPLACE INTO system_config (`key`, `value`) VALUES (%s, %s)", ("DB_HOST", req.db_host), commit=True)
    execute_query("REPLACE INTO system_config (`key`, `value`) VALUES (%s, %s)", ("DB_USER", req.db_user), commit=True)
    execute_query("REPLACE INTO system_config (`key`, `value`) VALUES (%s, %s)", ("DB_PASSWORD", req.db_password), commit=True)
    execute_query("REPLACE INTO system_config (`key`, `value`) VALUES (%s, %s)", ("DB_NAME", req.db_name), commit=True)
    return {"message": "Config updated (will apply on restart)"}