from fastapi import APIRouter, HTTPException, Request
from schemas import InsertDataRequest
from database.connection import execute_query
from utils.middleware import get_current_user
from services.permission_service import is_project_member
import mysql.connector

router = APIRouter(prefix="/data", tags=["data"])

@router.post("/insert")
async def insert_data(req: InsertDataRequest, request: Request):
    user = get_current_user(request)
    if not is_project_member(req.project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    full_table = f"project_{req.project_id}_{req.table_name}"
    columns = ", ".join(f"`{k}`" for k in req.data.keys())
    placeholders = ", ".join(["%s"] * len(req.data))
    values = list(req.data.values())
    try:
        execute_query(f"INSERT INTO {full_table} ({columns}) VALUES ({placeholders})", values, commit=True)
        return {"message": "Data inserted"}
    except mysql.connector.errors.ProgrammingError as e:
        if "doesn't exist" in str(e):
            raise HTTPException(status_code=404, detail=f"Table '{req.table_name}' does not exist. Please generate and execute the schema first.")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{project_id}/{table_name}")
async def get_data(project_id: int, table_name: str, request: Request):
    user = get_current_user(request)
    if not is_project_member(project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    full_table = f"project_{project_id}_{table_name}"
    try:
        rows = execute_query(f"SELECT * FROM {full_table} LIMIT 100", fetch_all=True)
        return {"data": rows}
    except mysql.connector.errors.ProgrammingError as e:
        if "doesn't exist" in str(e):
            return {"data": []}  # Table not created yet, return empty
        raise HTTPException(status_code=500, detail=str(e))