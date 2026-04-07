import json
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from database.connection import execute_query
from utils.middleware import get_current_user
from services.permission_service import can_manage_schema, can_view_schema
from services.database_service import create_or_use_database, execute_in_project_db

router = APIRouter(prefix="/schema", tags=["schema"])

class AttributeDef(BaseModel):
    name: str
    data_type: str
    is_primary_key: bool = False
    is_not_null: bool = False
    max_length: Optional[int] = None

class EntityDef(BaseModel):
    name: str
    attributes: List[AttributeDef]

class SchemaDefinition(BaseModel):
    project_id: int
    entities: List[EntityDef]

class GenerateSQLRequest(BaseModel):
    project_id: int
    entities: List[dict]
    database_name: str

class ExecuteSQLRequest(BaseModel):
    project_id: int
    entities: List[dict]
    database_name: str


@router.post("/save")
async def save_schema(schema: SchemaDefinition, request: Request):
    user = get_current_user(request)
    if not can_manage_schema(schema.project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized to modify schema")
    
    # Trim entity and attribute names
    for entity in schema.entities:
        entity.name = entity.name.strip()
        if not entity.name:
            raise HTTPException(status_code=400, detail="Entity name cannot be empty")
        
        for attr in entity.attributes:
            attr.name = attr.name.strip()
            if not attr.name:
                raise HTTPException(status_code=400, detail="Attribute name cannot be empty")
            
            if attr.data_type.upper() in ("VARCHAR", "CHAR") and not attr.max_length:
                attr.max_length = 255
    
    # Check for duplicate entity names
    entity_names = [e.name for e in schema.entities]
    if len(entity_names) != len(set(entity_names)):
        raise HTTPException(status_code=400, detail="Duplicate entity names found")
    
    # Check for duplicate attribute names within each entity
    for entity in schema.entities:
        attr_names = [a.name for a in entity.attributes]
        if len(attr_names) != len(set(attr_names)):
            raise HTTPException(status_code=400, detail=f"Duplicate attribute names in entity '{entity.name}'")
    
    # Save schema
    definition = json.dumps(schema.dict())
    existing = execute_query(
        "SELECT id FROM schema_definitions WHERE project_id=%s", 
        (schema.project_id,), fetch_one=True
    )
    
    if existing:
        execute_query(
            "UPDATE schema_definitions SET definition=%s WHERE project_id=%s", 
            (definition, schema.project_id), commit=True
        )
    else:
        execute_query(
            "INSERT INTO schema_definitions (project_id, definition) VALUES (%s, %s)", 
            (schema.project_id, definition), commit=True
        )
    
    return {"message": "Schema saved successfully"}


@router.get("/{project_id}")
async def get_schema(project_id: int, request: Request):
    user = get_current_user(request)
    if not can_view_schema(project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    row = execute_query(
        "SELECT definition FROM schema_definitions WHERE project_id=%s", 
        (project_id,), fetch_one=True
    )
    
    if row and row["definition"]:
        definition = json.loads(row["definition"])
    else:
        definition = {"entities": []}
    
    return {"definition": definition}


@router.post("/generate-sql")
async def generate_sql(req: GenerateSQLRequest, request: Request):
    user = get_current_user(request)
    if not can_manage_schema(req.project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not req.entities:
        raise HTTPException(status_code=400, detail="No entities defined")
    
    # Trim entity and attribute names
    for entity in req.entities:
        entity["name"] = entity["name"].strip()
        if not entity["name"]:
            raise HTTPException(status_code=400, detail="Entity name cannot be empty")
        
        for attr in entity.get("attributes", []):
            attr["name"] = attr["name"].strip()
            if not attr["name"]:
                raise HTTPException(status_code=400, detail="Attribute name cannot be empty")
            
            if attr["data_type"].upper() in ("VARCHAR", "CHAR") and not attr.get("max_length"):
                attr["max_length"] = 255
    
    # Validate database name
    if not req.database_name or not req.database_name.strip():
        raise HTTPException(status_code=400, detail="Database name is required")
    
    # Create or use the specified database
    try:
        db_name = create_or_use_database(req.project_id, req.database_name.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create database: {str(e)}")
    
    # Generate SQL statements
    sql_statements = []
    for entity in req.entities:
        cols = []
        for attr in entity.get("attributes", []):
            col_def = f"`{attr['name']}` {attr['data_type']}"
            
            if attr['data_type'].upper() in ('VARCHAR', 'CHAR'):
                length = attr.get('max_length', 255)
                col_def += f"({length})"
            
            if attr.get('is_primary_key'):
                col_def += " PRIMARY KEY"
            if attr.get('is_not_null'):
                col_def += " NOT NULL"
            cols.append(col_def)
        
        table_name = entity['name'].lower()
        create_sql = f"CREATE TABLE IF NOT EXISTS `{table_name}` (\n  " + ",\n  ".join(cols) + "\n);"
        sql_statements.append(create_sql)
    
    return {
        "sql": sql_statements, 
        "database": db_name,
        "message": f"SQL will be executed in database: {db_name}"
    }


@router.post("/execute")
async def execute_schema(req: ExecuteSQLRequest, request: Request):
    user = get_current_user(request)
    if not can_manage_schema(req.project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not req.entities:
        raise HTTPException(status_code=400, detail="No entities to execute")
    
    # Trim entity and attribute names
    for entity in req.entities:
        entity["name"] = entity["name"].strip()
        for attr in entity.get("attributes", []):
            attr["name"] = attr["name"].strip()
            if attr["data_type"].upper() in ("VARCHAR", "CHAR") and not attr.get("max_length"):
                attr["max_length"] = 255
    
    # Create or ensure database exists
    try:
        db_name = create_or_use_database(req.project_id, req.database_name.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create database: {str(e)}")
    
    # Generate and execute SQL statements
    results = []
    for entity in req.entities:
        cols = []
        for attr in entity.get("attributes", []):
            col_def = f"`{attr['name']}` {attr['data_type']}"
            
            if attr['data_type'].upper() in ('VARCHAR', 'CHAR'):
                length = attr.get('max_length', 255)
                col_def += f"({length})"
            
            if attr.get('is_primary_key'):
                col_def += " PRIMARY KEY"
            if attr.get('is_not_null'):
                col_def += " NOT NULL"
            cols.append(col_def)
        
        table_name = entity['name'].lower()
        create_sql = f"CREATE TABLE IF NOT EXISTS `{table_name}` (\n  " + ",\n  ".join(cols) + "\n);"
        
        try:
            # Execute the SQL in the project's database
            execute_in_project_db(req.project_id, create_sql, commit=True)
            results.append({
                "sql": create_sql, 
                "status": "success", 
                "table": table_name
            })
            
            # Record history
            execute_query(
                "INSERT INTO sql_history (project_id, user_id, sql_text, status) VALUES (%s, %s, %s, 'success')",
                (req.project_id, user["id"], create_sql), commit=True
            )
        except Exception as e:
            results.append({
                "sql": create_sql, 
                "status": "failed", 
                "error": str(e), 
                "table": table_name
            })
            execute_query(
                "INSERT INTO sql_history (project_id, user_id, sql_text, status) VALUES (%s, %s, %s, 'failed')",
                (req.project_id, user["id"], create_sql), commit=True
            )
    
    # Verify tables were created
    try:
        tables_result = execute_in_project_db(req.project_id, "SHOW TABLES", fetch=True)
        created_tables = [list(t.values())[0] for t in tables_result] if tables_result else []
        results.append({
            "verification": "completed", 
            "tables_found": created_tables,
            "count": len(created_tables)
        })
    except Exception as e:
        results.append({"verification": "failed", "error": str(e)})
    
    return {"results": results, "database": db_name}


@router.delete("/entity/{project_id}/{entity_name}")
async def delete_entity(project_id: int, entity_name: str, request: Request):
    user = get_current_user(request)
    if not can_manage_schema(project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get current schema
    row = execute_query(
        "SELECT definition FROM schema_definitions WHERE project_id=%s", 
        (project_id,), fetch_one=True
    )
    
    if not row or not row["definition"]:
        raise HTTPException(status_code=404, detail="No schema found for this project")
    
    schema_def = json.loads(row["definition"])
    original_count = len(schema_def["entities"])
    schema_def["entities"] = [e for e in schema_def["entities"] if e["name"] != entity_name]
    
    if len(schema_def["entities"]) == original_count:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Save updated schema
    execute_query(
        "UPDATE schema_definitions SET definition=%s WHERE project_id=%s",
        (json.dumps(schema_def), project_id), commit=True
    )
    
    # Drop the corresponding table if it exists in the project database
    try:
        table_name = entity_name.lower()
        execute_in_project_db(project_id, f"DROP TABLE IF EXISTS `{table_name}`", commit=True)
    except Exception as e:
        print(f"Warning: Could not drop table {table_name}: {e}")
    
    return {"message": f"Entity '{entity_name}' and its table deleted"}