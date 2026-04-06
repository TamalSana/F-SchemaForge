from database.connection import execute_query

def is_project_admin(project_id, user_id):
    row = execute_query(
        "SELECT id FROM project_members WHERE project_id=%s AND user_id=%s AND role='admin' AND status='approved'",
        (project_id, user_id), fetch_one=True
    )
    return row is not None

def is_project_member(project_id, user_id):
    row = execute_query(
        "SELECT id FROM project_members WHERE project_id=%s AND user_id=%s AND status='approved'",
        (project_id, user_id), fetch_one=True
    )
    return row is not None

def can_execute_sql(project_id, user_id):
    return is_project_admin(project_id, user_id)

def can_manage_schema(project_id, user_id):
    return is_project_admin(project_id, user_id)

def can_view_schema(project_id, user_id):
    return is_project_member(project_id, user_id) or is_project_admin(project_id, user_id)