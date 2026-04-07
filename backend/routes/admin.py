from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from database.connection import execute_query
from utils.middleware import get_current_user
from typing import List, Optional

router = APIRouter(prefix="/admin", tags=["admin"])

class UserRoleUpdate(BaseModel):
    user_id: int
    is_super_admin: bool

class ProjectAccessRequest(BaseModel):
    user_id: int
    project_id: int
    role: str  # 'admin' or 'member'
    action: str  # 'add' or 'remove'

class ProjectCreatePermission(BaseModel):
    user_id: int
    can_create: bool

class ConfigUpdate(BaseModel):
    db_host: str
    db_user: str
    db_password: str
    db_name: str


class BlacklistUserRequest(BaseModel):
    user_id: int
    reason: Optional[str] = "No reason provided"

def require_super_admin(user):
    if not user.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Super admin required")

@router.get("/logs")
async def get_logs(request: Request):
    user = get_current_user(request)
    require_super_admin(user)
    logs = execute_query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200", fetch_all=True)
    return logs


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

@router.get("/users")
async def list_users(request: Request):
    require_super_admin(get_current_user(request))
    users = execute_query("""
        SELECT u.id, u.email, u.is_super_admin, 
               CASE WHEN b.id IS NOT NULL THEN TRUE ELSE FALSE END as is_blacklisted,
               b.reason as blacklist_reason
        FROM users u
        LEFT JOIN blacklist b ON u.id = b.user_id
        ORDER BY u.id
    """, fetch_all=True)
    return users

@router.post("/users/role")
async def update_user_role(req: UserRoleUpdate, request: Request):
    require_super_admin(get_current_user(request))
    execute_query("UPDATE users SET is_super_admin=%s WHERE id=%s", (req.is_super_admin, req.user_id), commit=True)
    return {"message": "User role updated"}

@router.post("/blacklist/add")
async def add_to_blacklist(req: BlacklistUserRequest, request: Request):
    require_super_admin(get_current_user(request))
    # Check if already blacklisted
    existing = execute_query("SELECT id FROM blacklist WHERE user_id=%s", (req.user_id,), fetch_one=True)
    if existing:
        raise HTTPException(status_code=400, detail="User is already blacklisted")
    execute_query(
        "INSERT INTO blacklist (user_id, reason) VALUES (%s, %s)",
        (req.user_id, req.reason), commit=True
    )
    return {"message": "User blacklisted"}

@router.delete("/blacklist/remove/{user_id}")
async def remove_from_blacklist(user_id: int, request: Request):
    require_super_admin(get_current_user(request))
    execute_query("DELETE FROM blacklist WHERE user_id=%s", (user_id,), commit=True)
    return {"message": "User removed from blacklist"}

@router.post("/permissions/create-project")
async def set_project_create_permission(req: ProjectCreatePermission, request: Request):
    require_super_admin(get_current_user(request))
    execute_query(
        "REPLACE INTO user_permissions (user_id, can_create_project) VALUES (%s, %s)",
        (req.user_id, req.can_create), commit=True
    )
    return {"message": "Permission updated"}

@router.post("/project-access")
async def manage_project_access(req: ProjectAccessRequest, request: Request):
    require_super_admin(get_current_user(request))
    if req.action == "add":
        existing = execute_query(
            "SELECT id FROM project_members WHERE project_id=%s AND user_id=%s",
            (req.project_id, req.user_id), fetch_one=True
        )
        if existing:
            execute_query(
                "UPDATE project_members SET role=%s, status='approved', joined_at=NOW() WHERE project_id=%s AND user_id=%s",
                (req.role, req.project_id, req.user_id), commit=True
            )
        else:
            execute_query(
                "INSERT INTO project_members (project_id, user_id, role, status, joined_at) VALUES (%s, %s, %s, 'approved', NOW())",
                (req.project_id, req.user_id, req.role), commit=True
            )
    elif req.action == "remove":
        execute_query(
            "DELETE FROM project_members WHERE project_id=%s AND user_id=%s",
            (req.project_id, req.user_id), commit=True
        )
    return {"message": f"Access {req.action}ed"}

@router.post("/permissions/create-project")
async def set_project_create_permission(req: ProjectCreatePermission, request: Request):
    require_super_admin(get_current_user(request))
    execute_query(
        "REPLACE INTO user_permissions (user_id, can_create_project) VALUES (%s, %s)",
        (req.user_id, req.can_create), commit=True
    )
    return {"message": "Permission updated"}

@router.get("/permissions/{user_id}")
async def get_user_permissions(user_id: int, request: Request):
    require_super_admin(get_current_user(request))
    perm = execute_query("SELECT can_create_project FROM user_permissions WHERE user_id=%s", (user_id,), fetch_one=True)
    return {"can_create_project": perm["can_create_project"] if perm else True}
