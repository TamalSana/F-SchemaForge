from database.connection import execute_query
from services.permission_service import is_project_member

def insert_data(project_id, table_name, data, user_id):
    if not is_project_member(project_id, user_id):
        raise PermissionError("Not a member of this project")
    full_table = f"project_{project_id}_{table_name}"
    columns = ", ".join(f"`{k}`" for k in data.keys())
    placeholders = ", ".join(["%s"] * len(data))
    values = list(data.values())
    try:
        execute_query(
            f"INSERT INTO {full_table} ({columns}) VALUES ({placeholders})",
            values,
            commit=True
        )
        return True, "Data inserted"
    except Exception as e:
        return False, str(e)

def get_table_data(project_id, table_name, user_id, limit=100):
    if not is_project_member(project_id, user_id):
        raise PermissionError("Not a member of this project")
    full_table = f"project_{project_id}_{table_name}"
    rows = execute_query(f"SELECT * FROM {full_table} LIMIT %s", (limit,), fetch_all=True)
    return rows

def validate_insert_data(attributes, data):
    """Basic validation against schema attributes (type, not null, length)"""
    for attr in attributes:
        value = data.get(attr["name"])
        if attr.get("is_not_null") and (value is None or value == ""):
            return False, f"{attr['name']} cannot be null"
        if attr.get("max_length") and value and len(str(value)) > attr["max_length"]:
            return False, f"{attr['name']} exceeds max length {attr['max_length']}"
    return True, "Valid"