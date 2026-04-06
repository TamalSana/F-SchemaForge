import json
from fastapi import APIRouter, HTTPException, Request
from schemas import SchemaDefinition
from database.connection import execute_query
from utils.middleware import get_current_user
from services.permission_service import can_manage_schema, can_view_schema
from services.schema_service import generate_sql_from_definition

router = APIRouter(prefix="/schema", tags=["schema"])

@router.post("/save")
async def save_schema(schema: SchemaDefinition, request: Request):
    user = get_current_user(request)
    if not can_manage_schema(schema.project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized to modify schema")
    
    if not schema.entities:
        raise HTTPException(status_code=400, detail="At least one entity is required")
    
    entity_names = [e.name for e in schema.entities]
    if len(entity_names) != len(set(entity_names)):
        raise HTTPException(status_code=400, detail="Duplicate entity names")
    
    for entity in schema.entities:
        if not entity.attributes:
            raise HTTPException(status_code=400, detail=f"Entity '{entity.name}' has no attributes")
        for attr in entity.attributes:
            if not attr.data_type:
                raise HTTPException(status_code=400, detail=f"Attribute '{attr.name}' missing data type")
    
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
    
    if not schema.entities:
        raise HTTPException(status_code=400, detail="No entities defined. Please add at least one entity.")
    
    for entity in schema.entities:
        if not entity.attributes:
            raise HTTPException(status_code=400, detail=f"Entity '{entity.name}' has no attributes.")
    
    try:
        sql_statements = generate_sql_from_definition(schema)
        return {"sql": sql_statements}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/execute")
async def execute_schema(schema: SchemaDefinition, request: Request):
    user = get_current_user(request)
    if not can_manage_schema(schema.project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not schema.entities:
        raise HTTPException(status_code=400, detail="No entities to execute")
    
    sql_statements = generate_sql_from_definition(schema)
    results = []
    for stmt in sql_statements:
        try:
            execute_query(stmt, commit=True)
            results.append({"sql": stmt, "status": "success"})
        except Exception as e:
            results.append({"sql": stmt, "status": "failed", "error": str(e)})
    return {"results": results}