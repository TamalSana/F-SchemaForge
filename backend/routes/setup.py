from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import mysql.connector
from mysql.connector import Error
from utils.security import hash_password
import time

router = APIRouter(prefix="/setup", tags=["setup"])

class DatabaseConfigRequest(BaseModel):
    db_host: str
    db_user: str
    db_password: str
    db_name: str

@router.get("/status")
async def get_setup_status():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if not os.path.exists(env_path):
        return {"setup_completed": False}
    try:
        from config import Config
        conn = mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME
        )
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = %s AND table_name = 'setup_status'", (Config.DB_NAME,))
        count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        return {"setup_completed": count > 0}
    except:
        return {"setup_completed": False}

@router.post("/configure-database")
async def configure_database(req: DatabaseConfigRequest):
    try:
        conn = mysql.connector.connect(
            host=req.db_host,
            user=req.db_user,
            password=req.db_password,
            autocommit=True
        )
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{req.db_name}`")
        cursor.execute(f"USE `{req.db_name}`")

        # Run schema.sql (ignore duplicate errors)
        schema_path = os.path.join(os.path.dirname(__file__), "..", "database", "schema.sql")
        if os.path.exists(schema_path):
            with open(schema_path, 'r', encoding='utf-8') as f:
                schema_sql = f.read()
            statements = []
            for statement in schema_sql.split(';'):
                stmt = statement.strip()
                if stmt and not stmt.startswith('--'):
                    statements.append(stmt)
            for stmt in statements:
                try:
                    cursor.execute(stmt)
                    while cursor.nextset():
                        pass
                except Error as e:
                    print(f"Warning: {e}")
                    continue

        # Create super admin with proper hash
        admin_email = "admin@schemaforge.com"
        admin_password = "Admin@123"
        hashed = hash_password(admin_password)
        cursor.execute("SELECT id FROM users WHERE email = %s", (admin_email,))
        existing = cursor.fetchone()
        if existing:
            cursor.execute("UPDATE users SET password_hash = %s, role = 'super_admin', is_active = TRUE WHERE email = %s", (hashed, admin_email))
        else:
            cursor.execute("INSERT INTO users (email, password_hash, role, is_active) VALUES (%s, %s, 'super_admin', TRUE)", (admin_email, hashed))

        # Mark setup completed
        cursor.execute("""
            INSERT INTO setup_status (id, setup_completed, completed_at)
            VALUES (1, TRUE, NOW())
            ON DUPLICATE KEY UPDATE setup_completed=TRUE, completed_at=NOW()
        """)
        cursor.close()
        conn.close()

        # Write .env
        env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
        with open(env_path, 'w') as f:
            f.write(f"DB_HOST={req.db_host}\n")
            f.write(f"DB_USER={req.db_user}\n")
            f.write(f"DB_PASSWORD={req.db_password}\n")
            f.write(f"DB_NAME={req.db_name}\n")
            f.write("JWT_SECRET_KEY=mysecretkey123\n")
            f.write("JWT_ALGORITHM=HS256\n")
            f.write("ACCESS_TOKEN_EXPIRE_MINUTES=480\n")

        # Touch main.py to trigger uvicorn --reload
        main_path = os.path.join(os.path.dirname(__file__), "..", "main.py")
        if os.path.exists(main_path):
            os.utime(main_path, None)

        return {"message": "Setup complete! Backend will restart automatically.", "restart_required": True}

    except mysql.connector.Error as e:
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Setup failed: {str(e)}")