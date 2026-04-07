from fastapi import APIRouter, HTTPException, Request
from database.connection import execute_query
from utils.middleware import get_current_user
from services.permission_service import is_project_member

router = APIRouter(prefix="/sql-history", tags=["sql-history"])

@router.get("/{project_id}")
async def get_sql_history(project_id: int, request: Request):
    user = get_current_user(request)
    if not is_project_member(project_id, user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    history = execute_query(
        """SELECT h.*, u.email FROM sql_history h
           JOIN users u ON h.user_id = u.id
           WHERE h.project_id = %s ORDER BY h.executed_at DESC""",
        (project_id,), fetch_all=True
    )
    return history