from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from database.connection import execute_query, get_db_connection
from utils.middleware import get_current_user
from services.permission_service import is_project_admin
import mysql.connector
from utils.security import hash_password, verify_password

router = APIRouter(prefix="/admin", tags=["admin"])

def require_super_admin(user):
    if not user or user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

def require_admin_or_super(user):
    if not user or user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

class ChangeCredentialsRequest(BaseModel):
    current_password: str
    new_email: Optional[str] = None
    new_password: Optional[str] = None


# User Management Models
class PromoteUserRequest(BaseModel):
    user_id: int
    role: str  # 'admin' or 'user'

class DeleteUserRequest(BaseModel):
    user_id: int

# Get all users
@router.get("/users")
async def list_users(request: Request):
    user = get_current_user(request)
    require_admin_or_super(user)
    
    users = execute_query("""
        SELECT u.id, u.email, u.role, u.is_active,
               CASE WHEN b.id IS NOT NULL THEN TRUE ELSE FALSE END as is_blacklisted,
               b.reason as blacklist_reason
        FROM users u
        LEFT JOIN blacklist b ON u.id = b.user_id
        ORDER BY FIELD(u.role, 'super_admin', 'admin', 'user'), u.id
    """, fetch_all=True)
    return users

# Promote/Demote user (only super admin or admin can do this)
@router.post("/users/promote")
async def promote_user(req: PromoteUserRequest, request: Request):
    current_user = get_current_user(request)
    require_admin_or_super(current_user)
    
    # Get target user
    target = execute_query("SELECT id, email, role FROM users WHERE id=%s", (req.user_id,), fetch_one=True)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot modify super admin
    if target["role"] == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot modify super admin account")
    
    # Only super admin can promote to admin (admins cannot create other admins)
    if req.role == "admin" and current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can promote users to admin")
    
    # Cannot demote self
    if target["id"] == current_user["id"]:
        raise HTTPException(status_code=403, detail="Cannot change your own role")
    
    # Update role
    execute_query("UPDATE users SET role=%s WHERE id=%s", (req.role, req.user_id), commit=True)
    
    # If promoting to admin, also give them admin access in projects they're already members of
    if req.role == "admin":
        # Optionally make them admin in all projects they belong to
        execute_query("""
            UPDATE project_members SET role='admin' 
            WHERE user_id=%s AND role='member'
        """, (req.user_id,), commit=True)
    
    return {"message": f"User {target['email']} promoted to {req.role}"}

# Permanently delete user (super admin only)
@router.delete("/users/delete/{user_id}")
async def delete_user(user_id: int, request: Request):
    current_user = get_current_user(request)
    require_super_admin(current_user)
    
    # Get target user
    target = execute_query("SELECT id, email, role FROM users WHERE id=%s", (user_id,), fetch_one=True)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot delete super admin
    if target["role"] == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot delete super admin account")
    
    # Cannot delete self
    if target["id"] == current_user["id"]:
        raise HTTPException(status_code=403, detail="Cannot delete your own account")
    
    # Delete user's sessions
    execute_query("DELETE FROM sessions WHERE user_id=%s", (user_id,), commit=True)
    
    # Delete user's blacklist entries
    execute_query("DELETE FROM blacklist WHERE user_id=%s", (user_id,), commit=True)
    
    # Delete user's permissions
    execute_query("DELETE FROM user_permissions WHERE user_id=%s", (user_id,), commit=True)
    
    # Remove from project members
    execute_query("DELETE FROM project_members WHERE user_id=%s", (user_id,), commit=True)
    
    # Delete OTP verifications
    execute_query("DELETE FROM otp_verifications WHERE email=%s", (target["email"],), commit=True)
    
    # Finally delete the user
    execute_query("DELETE FROM users WHERE id=%s", (user_id,), commit=True)
    
    return {"message": f"User {target['email']} permanently deleted"}

# Blacklist management
class BlacklistRequest(BaseModel):
    user_id: int
    reason: Optional[str] = "No reason provided"

@router.post("/blacklist/add")
async def add_to_blacklist(req: BlacklistRequest, request: Request):
    current_user = get_current_user(request)
    require_admin_or_super(current_user)
    
    target = execute_query("SELECT id, email, role FROM users WHERE id=%s", (req.user_id,), fetch_one=True)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot blacklist super admin
    if target["role"] == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot blacklist super admin")
    
    existing = execute_query("SELECT id FROM blacklist WHERE user_id=%s", (req.user_id,), fetch_one=True)
    if existing:
        raise HTTPException(status_code=400, detail="User is already blacklisted")
    
    execute_query(
        "INSERT INTO blacklist (user_id, reason) VALUES (%s, %s)",
        (req.user_id, req.reason), commit=True
    )
    
    # Also invalidate all their sessions
    execute_query("DELETE FROM sessions WHERE user_id=%s", (req.user_id,), commit=True)
    
    return {"message": f"User {target['email']} blacklisted"}

@router.delete("/blacklist/remove/{user_id}")
async def remove_from_blacklist(user_id: int, request: Request):
    current_user = get_current_user(request)
    require_admin_or_super(current_user)
    
    execute_query("DELETE FROM blacklist WHERE user_id=%s", (user_id,), commit=True)
    return {"message": "User removed from blacklist"}

# Project access management
class ProjectAccessRequest(BaseModel):
    user_id: int
    project_id: int
    role: str
    action: str

@router.post("/project-access")
async def manage_project_access(req: ProjectAccessRequest, request: Request):
    current_user = get_current_user(request)
    require_admin_or_super(current_user)
    
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

# Project creation permission
class ProjectCreatePermission(BaseModel):
    user_id: int
    can_create: bool

@router.post("/permissions/create-project")
async def set_project_create_permission(req: ProjectCreatePermission, request: Request):
    current_user = get_current_user(request)
    require_admin_or_super(current_user)
    
    execute_query(
        "REPLACE INTO user_permissions (user_id, can_create_project) VALUES (%s, %s)",
        (req.user_id, req.can_create), commit=True
    )
    return {"message": "Permission updated"}

# Get all projects (for admin)
@router.get("/projects/all")
async def get_all_projects(request: Request):
    current_user = get_current_user(request)
    require_admin_or_super(current_user)
    
    projects = execute_query("SELECT id, name, created_by, created_at FROM projects", fetch_all=True)
    return projects

# Logs, sessions, config endpoints
@router.get("/logs")
async def get_logs(request: Request):
    current_user = get_current_user(request)
    require_admin_or_super(current_user)
    
    logs = execute_query("""
        SELECT l.*, u.email 
        FROM audit_logs l
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.created_at DESC LIMIT 200
    """, fetch_all=True)
    return logs

@router.get("/sessions")
async def get_sessions(request: Request):
    current_user = get_current_user(request)
    require_admin_or_super(current_user)
    
    sessions = execute_query("""
        SELECT s.*, u.email, u.role 
        FROM sessions s 
        JOIN users u ON s.user_id = u.id 
        ORDER BY s.expires_at DESC
    """, fetch_all=True)
    return sessions

class ConfigUpdate(BaseModel):
    db_host: str
    db_user: str
    db_password: str
    db_name: str

@router.post("/config/db")
async def update_db_config(req: ConfigUpdate, request: Request):
    current_user = get_current_user(request)
    require_admin_or_super(current_user)
    
    execute_query("CREATE TABLE IF NOT EXISTS system_config (`key` VARCHAR(100), `value` TEXT)")
    execute_query("REPLACE INTO system_config (`key`, `value`) VALUES (%s, %s)", ("DB_HOST", req.db_host), commit=True)
    execute_query("REPLACE INTO system_config (`key`, `value`) VALUES (%s, %s)", ("DB_USER", req.db_user), commit=True)
    execute_query("REPLACE INTO system_config (`key`, `value`) VALUES (%s, %s)", ("DB_PASSWORD", req.db_password), commit=True)
    execute_query("REPLACE INTO system_config (`key`, `value`) VALUES (%s, %s)", ("DB_NAME", req.db_name), commit=True)
    return {"message": "Config updated (will apply on restart)"}

@router.post("/change-credentials")
async def change_credentials(req: ChangeCredentialsRequest, request: Request):
    current_user = get_current_user(request)
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can change credentials")
    
    user = execute_query(
        "SELECT id, email, password_hash FROM users WHERE id=%s",
        (current_user["id"],), fetch_one=True
    )
    if not verify_password(req.current_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Require at least one change
    if not req.new_email and not req.new_password:
        raise HTTPException(status_code=400, detail="At least one field (new email or new password) must be provided")
    
    changes = []
    if req.new_email and req.new_email != user["email"]:
        existing = execute_query("SELECT id FROM users WHERE email=%s", (req.new_email,), fetch_one=True)
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        execute_query("UPDATE users SET email=%s WHERE id=%s", (req.new_email, user["id"]), commit=True)
        changes.append(f"Email changed to {req.new_email}")
    
    if req.new_password:
        if len(req.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
        new_hashed = hash_password(req.new_password)
        execute_query("UPDATE users SET password_hash=%s WHERE id=%s", (new_hashed, user["id"]), commit=True)
        changes.append("Password changed")
    
    execute_query("DELETE FROM sessions WHERE user_id=%s", (user["id"],), commit=True)
    return {"message": f"Credentials updated. Please login again. Changes: {', '.join(changes)}"}
