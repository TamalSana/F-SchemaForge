import json
from database.connection import execute_query

def generate_sql_from_definition(schema):
    """Generate SQL from schema definition (Pydantic model)"""
    sql_statements = []
    for entity in schema.entities:
        # Trim entity name
        entity_name = entity.name.strip().lower()
        cols = []
        for attr in entity.attributes:
            # Trim attribute name
            attr_name = attr.name.strip()
            col_def = f"`{attr_name}` {attr.data_type}"
            if attr.data_type.upper() in ('VARCHAR', 'CHAR'):
                length = attr.max_length if attr.max_length else 255
                col_def += f"({length})"
            if attr.is_primary_key:
                col_def += " PRIMARY KEY"
            if attr.is_not_null:
                col_def += " NOT NULL"
            cols.append(col_def)
        table_name = f"{entity_name}"
        create_sql = f"CREATE TABLE IF NOT EXISTS `{table_name}` (\n  " + ",\n  ".join(cols) + "\n);"
        sql_statements.append(create_sql)
    return sql_statements

def get_schema_definition(project_id: int):
    row = execute_query("SELECT definition FROM schema_definitions WHERE project_id=%s", (project_id,), fetch_one=True)
    if row and row["definition"]:
        return json.loads(row["definition"])
    return None

def find_entity_ignore_case(entities, target_name):
    target_lower = target_name.lower().strip()
    for entity in entities:
        if entity["name"].lower().strip() == target_lower:
            return entity
    return None

def create_table_from_entity(project_id: int, entity: dict):
    if not entity.get("attributes"):
        raise ValueError(f"Entity '{entity['name']}' has no attributes")
    
    # Trim entity name
    entity_name = entity["name"].strip().lower()
    cols = []
    for attr in entity["attributes"]:
        attr_name = attr.get("name", "").strip()
        if not attr_name or not attr.get("data_type"):
            raise ValueError(f"Attribute missing name or data_type: {attr}")
        
        data_type = attr["data_type"].upper()
        col_def = f"`{attr_name}` {data_type}"
        
        if data_type in ("VARCHAR", "CHAR"):
            length = attr.get("max_length", 255)
            col_def += f"({length})"
        elif data_type == "DECIMAL" and not attr.get("max_length"):
            col_def += "(10,2)"
        
        if attr.get("is_primary_key"):
            col_def += " PRIMARY KEY"
        if attr.get("is_not_null"):
            col_def += " NOT NULL"
        cols.append(col_def)
    
    table_name = f"{entity_name}"
    create_sql = f"CREATE TABLE IF NOT EXISTS `{table_name}` (\n  " + ",\n  ".join(cols) + "\n);"
    print(f"Auto‑create SQL: {create_sql}")
    execute_query(create_sql, commit=True)
    return True

def execute_sql_on_project_db(sql, project_id):
    return execute_query(sql, commit=True)