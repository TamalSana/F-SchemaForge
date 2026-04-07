from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, Any
from database.connection import execute_query
from utils.middleware import get_current_user
from services.permission_service import is_project_member
from services.schema_service import get_schema_definition, create_table_from_entity, find_entity_ignore_case
import mysql.connector

router = APIRouter(prefix="/data", tags=["data"])

class InsertDataRequest(BaseModel):
    project_id: int
    table_name: str
    data: Dict[str, Any]

def ensure_table_exists(project_id: int, entity_name: str) -> bool:
    full_table = f"project_{project_id}_{entity_name.lower()}"
    try:
        result = execute_query(f"SHOW TABLES LIKE '{full_table}'", fetch_one=True)
        if result:
            return True
    except:
        pass
    
    schema_def = get_schema_definition(project_id)
    if not schema_def or "entities" not in schema_def:
        return False
    
    entity = find_entity_ignore_case(schema_def["entities"], entity_name)
    if not entity:
        return False
    
    try:
        create_table_from_entity(project_id, entity)
        return True
    except Exception as e:
        print(f"Auto-create failed: {e}")
        return False

@router.post("/insert")
async def insert_data(req: InsertDataRequest, request: Request):
    user = get_current_user(request)
    if not is_project_member(req.project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    entity_name = req.table_name
    full_table = f"project_{req.project_id}_{entity_name.lower()}"
    
    if not ensure_table_exists(req.project_id, entity_name):
        raise HTTPException(
            status_code=404,
            detail=f"Table '{entity_name}' does not exist and no matching entity found in saved schema. Please go to Schema Designer, create an entity named '{entity_name}' with at least one attribute, and click Save Schema."
        )
    
    columns = ", ".join(f"`{k}`" for k in req.data.keys())
    placeholders = ", ".join(["%s"] * len(req.data))
    values = list(req.data.values())
    
    try:
        execute_query(f"INSERT INTO {full_table} ({columns}) VALUES ({placeholders})", values, commit=True)
        return {"message": "Data inserted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{project_id}/{table_name}")
async def get_data(project_id: int, table_name: str, request: Request):
    user = get_current_user(request)
    if not is_project_member(project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    full_table = f"project_{project_id}_{table_name.lower()}"
    try:
        rows = execute_query(f"SELECT * FROM {full_table} LIMIT 100", fetch_all=True)
        return {"data": rows}
    except mysql.connector.errors.ProgrammingError as e:
        if "doesn't exist" in str(e):
            return {"data": []}
        raise HTTPException(status_code=500, detail=str(e))
    
@router.delete("/row/{project_id}/{table_name}/{row_id}")
async def delete_row(project_id: int, table_name: str, row_id: int, request: Request):
    user = get_current_user(request)
    if not is_project_member(project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    full_table = f"project_{project_id}_{table_name.lower()}"
    # We assume there is a column named 'id' as primary key
    try:
        execute_query(f"DELETE FROM {full_table} WHERE id = %s", (row_id,), commit=True)
        return {"message": "Row deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))