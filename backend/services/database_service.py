import mysql.connector
from mysql.connector import Error
from database.connection import execute_query, get_db_connection
from config import Config
import re

def sanitize_database_name(db_name):
    """Convert database name to valid MySQL database name"""
    name = re.sub(r'[^a-zA-Z0-9_]', '_', db_name)
    name = re.sub(r'_+', '_', name)
    name = name.lower()
    if name and name[0].isdigit():
        name = 'db_' + name
    return name[:64]

def create_or_use_database(project_id, db_name):
    """Create a new database or use existing one for the project"""
    sanitized_name = sanitize_database_name(db_name)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{sanitized_name}`")
        conn.commit()
        
        # Store mapping
        execute_query(
            """INSERT INTO project_databases (project_id, database_name) 
               VALUES (%s, %s) 
               ON DUPLICATE KEY UPDATE database_name=%s""",
            (project_id, sanitized_name, sanitized_name), 
            commit=True
        )
        
        # Update projects table
        execute_query(
            "UPDATE projects SET database_name=%s WHERE id=%s",
            (sanitized_name, project_id), commit=True
        )
        
        return sanitized_name
    except Error as e:
        print(f"Error creating database: {e}")
        raise e
    finally:
        cursor.close()
        conn.close()

def get_project_database(project_id):
    """Get the database name for a project"""
    try:
        db_info = execute_query(
            "SELECT database_name FROM project_databases WHERE project_id=%s",
            (project_id,), fetch_one=True
        )
        if db_info:
            return db_info["database_name"]
        
        project_info = execute_query(
            "SELECT database_name FROM projects WHERE id=%s",
            (project_id,), fetch_one=True
        )
        return project_info["database_name"] if project_info else None
    except Exception as e:
        print(f"Error getting project database: {e}")
        return None

def execute_in_project_db(project_id, query, params=None, commit=False, fetch=False):
    """Execute a query in the project's dedicated database"""
    db_name = get_project_database(project_id)
    if not db_name:
        raise Exception(f"No database configured for project {project_id}. Please generate SQL first.")
    
    try:
        conn = mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=db_name,
            autocommit=False
        )
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params or ())
        if commit:
            conn.commit()
        if fetch:
            result = cursor.fetchall()
        else:
            result = cursor.lastrowid if cursor.lastrowid else None
        cursor.close()
        conn.close()
        return result
    except Error as e:
        raise Exception(f"Database error: {str(e)}")

def create_table_in_project_db(project_id, table_name, columns_definitions):
    """Create a table in the project's database"""
    db_name = get_project_database(project_id)
    if not db_name:
        raise Exception(f"No database configured for project {project_id}")
    
    try:
        conn = mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=db_name,
            autocommit=False
        )
        cursor = conn.cursor()
        
        create_sql = f"CREATE TABLE IF NOT EXISTS `{table_name}` (\n  " + ",\n  ".join(columns_definitions) + "\n);"
        cursor.execute(create_sql)
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        raise Exception(f"Failed to create table {table_name}: {str(e)}")

def drop_project_database(project_id):
    """Drop the project's dedicated database"""
    db_name = get_project_database(project_id)
    if db_name:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(f"DROP DATABASE IF EXISTS `{db_name}`")
            conn.commit()
            execute_query("DELETE FROM project_databases WHERE project_id=%s", (project_id,), commit=True)
        except Exception as e:
            print(f"Error dropping database: {e}")
        finally:
            cursor.close()
            conn.close()