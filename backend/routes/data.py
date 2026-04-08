from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, Any
from database.connection import execute_query
from utils.middleware import get_current_user
from services.permission_service import is_project_member
from services.database_service import execute_in_project_db, get_project_database
import mysql.connector

router = APIRouter(prefix="/data", tags=["data"])

class InsertDataRequest(BaseModel):
    project_id: int
    table_name: str
    data: Dict[str, Any]

@router.post("/insert")
async def insert_data(req: InsertDataRequest, request: Request):
    user = get_current_user(request)
    if not is_project_member(req.project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if project has a database
    db_name = get_project_database(req.project_id)
    if not db_name:
        raise HTTPException(
            status_code=404, 
            detail="No database configured for this project. Please generate and execute SQL first."
        )
    
    columns = ", ".join(f"`{k}`" for k in req.data.keys())
    placeholders = ", ".join(["%s"] * len(req.data))
    values = list(req.data.values())
    table_name = req.table_name.lower()
    
    try:
        result = execute_in_project_db(
            req.project_id, 
            f"INSERT INTO `{table_name}` ({columns}) VALUES ({placeholders})", 
            values, 
            commit=True
        )
        return {"message": "Data inserted", "id": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{project_id}/{table_name}")
async def get_data(project_id: int, table_name: str, request: Request):
    user = get_current_user(request)
    if not is_project_member(project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    db_name = get_project_database(project_id)
    if not db_name:
        return {"data": [], "message": "No database configured yet"}
    
    try:
        rows = execute_in_project_db(
            project_id, 
            f"SELECT * FROM `{table_name.lower()}` LIMIT 100", 
            fetch=True
        )
        return {"data": rows if rows else []}
    except Exception as e:
        if "doesn't exist" in str(e).lower():
            return {"data": [], "message": f"Table '{table_name}' not found"}
        raise HTTPException(status_code=500, detail=str(e))
    
@router.delete("/row/{project_id}/{table_name}/{row_id}")
async def delete_row(project_id: int, table_name: str, row_id: int, request: Request):
    user = get_current_user(request)
    if not is_project_member(project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    full_table = f"project_{project_id}_{table_name.lower()}"
    try:
        execute_query(f"DELETE FROM {full_table} WHERE id = %s", (row_id,), commit=True)
        return {"message": "Row deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))