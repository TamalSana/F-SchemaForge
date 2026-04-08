from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from database.connection import execute_query
from utils.middleware import get_current_user
from services.permission_service import (
    is_project_admin, grant_database_access, revoke_database_access,
    grant_table_access, revoke_table_access, get_project_users_with_permissions,
    get_project_tables, can_access_database
)

router = APIRouter(prefix="/permissions", tags=["permissions"])


class GrantDatabaseAccessRequest(BaseModel):
    project_id: int
    user_id: int
    permission_type: str  # read, write, admin, full

class GrantTableAccessRequest(BaseModel):
    project_id: int
    table_name: str
    user_id: int
    permission_type: str  # read, write, delete, full

@router.get("/{project_id}/users")
async def get_project_permissions(project_id: int, request: Request):
    user = get_current_user(request)
    if not (is_project_admin(project_id, user["id"]) or user.get("is_super_admin") or user.get("is_admin")):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = get_project_users_with_permissions(project_id)
    tables = get_project_tables(project_id)
    return {"users": users, "tables": tables}

@router.post("/database/grant")
async def grant_db_access(req: GrantDatabaseAccessRequest, request: Request):
    admin_user = get_current_user(request)
    if not (is_project_admin(req.project_id, admin_user["id"]) or admin_user.get("is_super_admin")):
        raise HTTPException(status_code=403, detail="Admin access required")
    if req.user_id == admin_user["id"]:
        raise HTTPException(status_code=403, detail="You cannot grant permissions to yourself")
    grant_database_access(req.project_id, req.user_id, req.permission_type, admin_user["id"])
    return {"message": f"Database access granted with {req.permission_type} permission"}

@router.delete("/database/revoke/{project_id}/{user_id}")
async def revoke_db_access(project_id: int, user_id: int, request: Request):
    admin_user = get_current_user(request)
    if not (is_project_admin(project_id, admin_user["id"]) or admin_user.get("is_super_admin")):
        raise HTTPException(status_code=403, detail="Admin access required")
    if user_id == admin_user["id"]:
        raise HTTPException(status_code=403, detail="You cannot revoke your own permissions")
    
    revoke_database_access(project_id, user_id)
    return {"message": "Database access revoked"}

@router.post("/table/grant")
async def grant_tbl_access(req: GrantTableAccessRequest, request: Request):
    admin_user = get_current_user(request)
    if not (is_project_admin(req.project_id, admin_user["id"]) or admin_user.get("is_super_admin")):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    grant_table_access(req.project_id, req.table_name, req.user_id, req.permission_type, admin_user["id"])
    return {"message": f"Table access granted with {req.permission_type} permission"}

@router.delete("/table/revoke/{project_id}/{table_name}/{user_id}")
async def revoke_tbl_access(project_id: int, table_name: str, user_id: int, request: Request):
    admin_user = get_current_user(request)
    if not (is_project_admin(project_id, admin_user["id"]) or admin_user.get("is_super_admin")):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    revoke_table_access(project_id, table_name, user_id)
    return {"message": "Table access revoked"}