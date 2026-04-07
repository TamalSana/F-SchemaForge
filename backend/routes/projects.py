from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from database.connection import get_db_connection, execute_query
from utils.middleware import get_current_user
from services.permission_service import is_project_admin
import secrets

router = APIRouter(prefix="/projects", tags=["projects"])

class CreateProjectRequest(BaseModel):
    name: str

class JoinProjectRequest(BaseModel):
    secret_key: str

class ApproveUserRequest(BaseModel):
    project_id: int
    user_id: int
    role: str

@router.post("/create")
async def create_project(req: CreateProjectRequest, request: Request):
    user = get_current_user(request)
    secret_key = secrets.token_hex(16)
    perm = execute_query("SELECT can_create_project FROM user_permissions WHERE user_id=%s", (user["id"],), fetch_one=True)
    if not perm or not perm["can_create_project"]:
        raise HTTPException(status_code=403, detail="You do not have permission to create projects")
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "INSERT INTO projects (name, secret_key, created_by) VALUES (%s, %s, %s)",
            (req.name, secret_key, user["id"])
        )
        project_id = cursor.lastrowid
        cursor.execute(
            "INSERT INTO project_members (project_id, user_id, role, status, joined_at) VALUES (%s, %s, 'admin', 'approved', NOW())",
            (project_id, user["id"])
        )
        conn.commit()
        return {"project_id": project_id, "secret_key": secret_key}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.get("/my")
async def get_my_projects(request: Request):
    user = get_current_user(request)
    rows = execute_query("""
        SELECT p.id, p.name, p.secret_key, p.database_name, pm.role 
        FROM projects p
        JOIN project_members pm ON p.id = pm.project_id
        WHERE pm.user_id = %s AND pm.status = 'approved'
    """, (user["id"],), fetch_all=True)
    
    # Hide secret key for non-admin members
    for row in rows:
        if row["role"] != "admin" and not user.get("is_super_admin") and not user.get("is_admin"):
            row["secret_key"] = "********"
    
    return rows

@router.post("/join")
async def join_project(req: JoinProjectRequest, request: Request):
    user = get_current_user(request)
    project = execute_query("SELECT id, name FROM projects WHERE secret_key=%s", (req.secret_key,), fetch_one=True)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    existing = execute_query(
        "SELECT id, status FROM project_members WHERE project_id=%s AND user_id=%s",
        (project["id"], user["id"]), fetch_one=True
    )
    if existing:
        if existing["status"] == "pending":
            raise HTTPException(status_code=400, detail="Already requested. Wait for admin approval.")
        elif existing["status"] == "approved":
            raise HTTPException(status_code=400, detail="Already a member.")
    execute_query(
        "INSERT INTO project_members (project_id, user_id, role, status) VALUES (%s, %s, 'member', 'pending')",
        (project["id"], user["id"]), commit=True
    )
    return {"message": "Join request sent to admin"}

@router.get("/{project_id}/members/pending")
async def get_pending_members(project_id: int, request: Request):
    user = get_current_user(request)
    if not is_project_admin(project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Admin only")
    rows = execute_query(
        "SELECT u.id, u.email FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id=%s AND pm.status='pending'",
        (project_id,), fetch_all=True
    )
    return rows

@router.post("/approve")
async def approve_user(req: ApproveUserRequest, request: Request):
    admin_user = get_current_user(request)
    if not is_project_admin(req.project_id, admin_user["id"]):
        raise HTTPException(status_code=403, detail="Admin only")
    execute_query(
        "UPDATE project_members SET status='approved', role=%s, joined_at=NOW() WHERE project_id=%s AND user_id=%s",
        (req.role, req.project_id, req.user_id), commit=True
    )
    return {"message": "User approved"}

@router.delete("/{project_id}")
async def delete_project(project_id: int, request: Request):
    user = get_current_user(request)
    # Check if user is admin of this project or super admin
    if not (user.get("is_super_admin") or is_project_admin(project_id, user["id"])):
        raise HTTPException(status_code=403, detail="Not authorized to delete this project")
    
    # First, drop all project-specific tables (they are named `project_{id}_*`)
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SHOW TABLES LIKE 'project_%'")
        tables = cursor.fetchall()
        for table in tables:
            table_name = table[0]
            if table_name.startswith(f"project_{project_id}_"):
                cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error dropping tables: {e}")
    
    # Delete project (cascade will remove members, schema_definitions)
    execute_query("DELETE FROM projects WHERE id=%s", (project_id,), commit=True)
    return {"message": "Project and all associated data deleted"}

@router.get("/all")
async def get_all_projects(request: Request):
    user = get_current_user(request)
    if not user.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Super admin only")
    projects = execute_query("SELECT id, name FROM projects", fetch_all=True)
    return projects