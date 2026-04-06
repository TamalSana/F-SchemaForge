import secrets
from database.connection import execute_query
from services.permission_service import is_project_admin

def create_project(name, creator_user_id):
    secret_key = secrets.token_urlsafe(16)
    execute_query(
        "INSERT INTO projects (name, secret_key, created_by) VALUES (%s, %s, %s)",
        (name, secret_key, creator_user_id),
        commit=True
    )
    project_id = execute_query("SELECT LAST_INSERT_ID() as id", fetch_one=True)["id"]
    execute_query(
        "INSERT INTO project_members (project_id, user_id, role, status, joined_at) VALUES (%s, %s, 'admin', 'approved', NOW())",
        (project_id, creator_user_id),
        commit=True
    )
    return project_id, secret_key

def get_user_projects(user_id):
    return execute_query(
        """SELECT p.id, p.name, p.secret_key, pm.role FROM projects p
           JOIN project_members pm ON p.id = pm.project_id
           WHERE pm.user_id = %s AND pm.status = 'approved'""",
        (user_id,),
        fetch_all=True
    )

def request_join_project(secret_key, user_id):
    project = execute_query("SELECT id, name FROM projects WHERE secret_key=%s", (secret_key,), fetch_one=True)
    if not project:
        return False, "Project not found"
    existing = execute_query(
        "SELECT id, status FROM project_members WHERE project_id=%s AND user_id=%s",
        (project["id"], user_id),
        fetch_one=True
    )
    if existing:
        if existing["status"] == "pending":
            return False, "Already requested. Wait for admin approval."
        elif existing["status"] == "approved":
            return False, "Already a member."
    execute_query(
        "INSERT INTO project_members (project_id, user_id, role, status) VALUES (%s, %s, 'member', 'pending')",
        (project["id"], user_id),
        commit=True
    )
    return True, "Join request sent"

def approve_join_request(project_id, user_id_to_approve, admin_user_id, role="member"):
    if not is_project_admin(project_id, admin_user_id):
        return False, "Only project admin can approve"
    execute_query(
        "UPDATE project_members SET status='approved', role=%s, joined_at=NOW() WHERE project_id=%s AND user_id=%s",
        (role, project_id, user_id_to_approve),
        commit=True
    )
    return True, "User approved"

def get_pending_members(project_id, admin_user_id):
    if not is_project_admin(project_id, admin_user_id):
        return []
    return execute_query(
        "SELECT u.id, u.email FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id=%s AND pm.status='pending'",
        (project_id,),
        fetch_all=True
    )