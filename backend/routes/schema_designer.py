import json
from fastapi import APIRouter, HTTPException, Request
from schemas import SchemaDefinition
from database.connection import execute_query
from utils.middleware import get_current_user
from services.permission_service import can_manage_schema, can_view_schema
from services.schema_service import generate_sql_from_definition, get_schema_definition, create_table_from_entity

router = APIRouter(prefix="/schema", tags=["schema"])

@router.post("/save")
async def save_schema(schema: SchemaDefinition, request: Request):
    user = get_current_user(request)
    if not can_manage_schema(schema.project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized to modify schema")
    
    # Auto‑fix missing max_length for VARCHAR/CHAR before saving
    for entity in schema.entities:
        for attr in entity.attributes:
            if attr.data_type.upper() in ("VARCHAR", "CHAR") and not attr.max_length:
                attr.max_length = 255
    
    definition = json.dumps(schema.dict())
    existing = execute_query("SELECT id FROM schema_definitions WHERE project_id=%s", (schema.project_id,), fetch_one=True)
    if existing:
        execute_query("UPDATE schema_definitions SET definition=%s WHERE project_id=%s", (definition, schema.project_id), commit=True)
    else:
        execute_query("INSERT INTO schema_definitions (project_id, definition) VALUES (%s, %s)", (schema.project_id, definition), commit=True)
    return {"message": "Schema saved"}

@router.get("/{project_id}")
async def get_schema(project_id: int, request: Request):
    user = get_current_user(request)
    if not can_view_schema(project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    row = execute_query("SELECT definition FROM schema_definitions WHERE project_id=%s", (project_id,), fetch_one=True)
    if row and row["definition"]:
        definition = json.loads(row["definition"])
    else:
        definition = {"entities": []}
    return {"definition": definition}

@router.post("/generate-sql")
async def generate_sql(schema: SchemaDefinition, request: Request):
    user = get_current_user(request)
    if not can_manage_schema(schema.project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Auto‑fix missing data before generation
    for entity in schema.entities:
        if not entity.name:
            raise HTTPException(status_code=400, detail="An entity has no name.")
        if not entity.attributes:
            raise HTTPException(status_code=400, detail=f"Entity '{entity.name}' has no attributes.")
        for attr in entity.attributes:
            if not attr.name:
                raise HTTPException(status_code=400, detail=f"Entity '{entity.name}' has an attribute with no name.")
            if not attr.data_type:
                raise HTTPException(status_code=400, detail=f"Attribute '{attr.name}' in entity '{entity.name}' has no data type.")
            if attr.data_type.upper() in ("VARCHAR", "CHAR") and not attr.max_length:
                attr.max_length = 255
            if attr.max_length:
                attr.max_length = int(attr.max_length)
    
    try:
        sql_statements = generate_sql_from_definition(schema)
        return {"sql": sql_statements}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/execute")
async def execute_schema(schema: SchemaDefinition, request: Request):
    user = get_current_user(request)
    if not can_manage_schema(schema.project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Auto‑fix missing length
    for entity in schema.entities:
        for attr in entity.attributes:
            if attr.data_type.upper() in ("VARCHAR", "CHAR") and not attr.max_length:
                attr.max_length = 255
    
    sql_statements = generate_sql_from_definition(schema)
    results = []
    for stmt in sql_statements:
        try:
            execute_query(stmt, commit=True)
            results.append({"sql": stmt, "status": "success"})
        except Exception as e:
            results.append({"sql": stmt, "status": "failed", "error": str(e)})
    return {"results": results}

# Delete entity endpoint (used by frontend)
@router.delete("/entity/{project_id}/{entity_name}")
async def delete_entity(project_id: int, entity_name: str, request: Request):
    user = get_current_user(request)
    if not can_manage_schema(project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get current schema definition (as dict)
    schema_def = get_schema_definition(project_id)
    if not schema_def:
        raise HTTPException(status_code=404, detail="No schema found for this project")
    
    original_count = len(schema_def["entities"])
    schema_def["entities"] = [e for e in schema_def["entities"] if e["name"] != entity_name]
    if len(schema_def["entities"]) == original_count:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Save updated schema
    execute_query(
        "UPDATE schema_definitions SET definition=%s WHERE project_id=%s",
        (json.dumps(schema_def), project_id),
        commit=True
    )
    
    # Drop the corresponding table if it exists
    table_name = f"project_{project_id}_{entity_name.lower()}"
    try:
        execute_query(f"DROP TABLE IF EXISTS {table_name}", commit=True)
    except Exception as e:
        print(f"Warning: Could not drop table {table_name}: {e}")
    
    return {"message": f"Entity '{entity_name}' and its table deleted"}

@router.post("/execute")
async def execute_schema(schema: SchemaDefinition, request: Request):
    user = get_current_user(request)
    if not can_manage_schema(schema.project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for entity in schema.entities:
        for attr in entity.attributes:
            if attr.data_type.upper() in ("VARCHAR", "CHAR") and not attr.max_length:
                attr.max_length = 255
    
    sql_statements = generate_sql_from_definition(schema)
    results = []
    for stmt in sql_statements:
        try:
            execute_query(stmt, commit=True)
            results.append({"sql": stmt, "status": "success"})
            # Record history
            execute_query(
                "INSERT INTO sql_history (project_id, user_id, sql_text, status) VALUES (%s, %s, %s, 'success')",
                (schema.project_id, user["id"], stmt), commit=True
            )
        except Exception as e:
            results.append({"sql": stmt, "status": "failed", "error": str(e)})
            execute_query(
                "INSERT INTO sql_history (project_id, user_id, sql_text, status) VALUES (%s, %s, %s, 'failed')",
                (schema.project_id, user["id"], stmt), commit=True
            )
    return {"results": results}