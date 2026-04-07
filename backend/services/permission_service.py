from database.connection import execute_query
from typing import List, Dict, Any

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

# New granular permission functions
def can_access_database(project_id, user_id, required_level='read'):
    """Check if user has database-level access"""
    # Super admin and project admins have full access
    user = execute_query("SELECT is_super_admin, is_admin FROM users WHERE id=%s", (user_id,), fetch_one=True)
    if user and (user['is_super_admin'] or user['is_admin']):
        return True
    
    # Check project member role
    member = execute_query(
        "SELECT role FROM project_members WHERE project_id=%s AND user_id=%s AND status='approved'",
        (project_id, user_id), fetch_one=True
    )
    if member and member['role'] == 'admin':
        return True
    
    # Check database permissions
    perm = execute_query(
        "SELECT permission_type FROM database_permissions WHERE project_id=%s AND user_id=%s",
        (project_id, user_id), fetch_one=True
    )
    if not perm:
        return False
    
    level_order = {'read': 1, 'write': 2, 'admin': 3, 'full': 4}
    required_order = level_order.get(required_level, 0)
    user_order = level_order.get(perm['permission_type'], 0)
    return user_order >= required_order

def can_access_table(project_id, table_name, user_id, required_action='read'):
    """Check if user has table-level access"""
    # Check database access first (inherits)
    if can_access_database(project_id, user_id, 'write' if required_action != 'read' else 'read'):
        return True
    
    # Check specific table permissions
    perm = execute_query(
        "SELECT permission_type FROM table_permissions WHERE project_id=%s AND table_name=%s AND user_id=%s",
        (project_id, table_name, user_id), fetch_one=True
    )
    if not perm:
        return False
    
    if required_action == 'read':
        return perm['permission_type'] in ('read', 'write', 'delete', 'full')
    elif required_action == 'write':
        return perm['permission_type'] in ('write', 'full')
    elif required_action == 'delete':
        return perm['permission_type'] in ('delete', 'full')
    
    return False

def grant_database_access(project_id, user_id, permission_type, granted_by):
    """Grant database-level access to a user"""
    execute_query(
        """INSERT INTO database_permissions (project_id, user_id, permission_type, granted_by) 
           VALUES (%s, %s, %s, %s)
           ON DUPLICATE KEY UPDATE permission_type=%s, granted_by=%s, granted_at=NOW()""",
        (project_id, user_id, permission_type, granted_by, permission_type, granted_by), commit=True
    )
    return True

def revoke_database_access(project_id, user_id):
    """Remove database-level access from a user"""
    execute_query(
        "DELETE FROM database_permissions WHERE project_id=%s AND user_id=%s",
        (project_id, user_id), commit=True
    )
    return True

def grant_table_access(project_id, table_name, user_id, permission_type, granted_by):
    """Grant table-level access to a user"""
    execute_query(
        """INSERT INTO table_permissions (project_id, table_name, user_id, permission_type, granted_by) 
           VALUES (%s, %s, %s, %s, %s)
           ON DUPLICATE KEY UPDATE permission_type=%s, granted_by=%s, granted_at=NOW()""",
        (project_id, table_name, user_id, permission_type, granted_by, permission_type, granted_by), commit=True
    )
    return True

def revoke_table_access(project_id, table_name, user_id):
    """Remove table-level access from a user"""
    execute_query(
        "DELETE FROM table_permissions WHERE project_id=%s AND table_name=%s AND user_id=%s",
        (project_id, table_name, user_id), commit=True
    )
    return True

def get_project_users_with_permissions(project_id):
    """Get all users with their permissions for a project"""
    users = execute_query("""
        SELECT 
            u.id, u.email, u.is_super_admin, u.is_admin,
            pm.role as project_role,
            dp.permission_type as database_permission,
            GROUP_CONCAT(CONCAT(tp.table_name, ':', tp.permission_type)) as table_permissions
        FROM users u
        LEFT JOIN project_members pm ON pm.project_id=%s AND pm.user_id=u.id AND pm.status='approved'
        LEFT JOIN database_permissions dp ON dp.project_id=%s AND dp.user_id=u.id
        LEFT JOIN table_permissions tp ON tp.project_id=%s AND tp.user_id=u.id
        WHERE u.is_active = TRUE
        GROUP BY u.id
    """, (project_id, project_id, project_id), fetch_all=True)
    return users

def get_project_tables(project_id):
    """Get all tables defined in the project schema"""
    from services.schema_service import get_schema_definition
    schema = get_schema_definition(project_id)
    if schema and 'entities' in schema:
        return [entity['name'] for entity in schema['entities']]
    return []