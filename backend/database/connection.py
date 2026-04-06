import mysql.connector
from mysql.connector import pooling
from config import Config
import logging

db_pool = None

def init_db_pool():
    global db_pool
    try:
        db_pool = pooling.MySQLConnectionPool(
            pool_name="mypool",
            pool_size=10,
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            autocommit=False
        )
        logging.info("Database connection pool created")
    except Exception as e:
        logging.error(f"Failed to create pool: {e}")
        raise

def get_db_connection():
    return db_pool.get_connection()

def execute_query(query, params=None, fetch_one=False, fetch_all=False, commit=False):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(query, params or ())
        if commit:
            conn.commit()
        if fetch_one:
            result = cursor.fetchone()
        elif fetch_all:
            result = cursor.fetchall()
        else:
            result = None
        return result
    finally:
        cursor.close()
        conn.close()

def execute_transaction(queries_params_list):
    """Execute multiple queries in one transaction. Returns last inserted id."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    last_id = None
    try:
        for query, params in queries_params_list:
            cursor.execute(query, params or ())
            if cursor.lastrowid:
                last_id = cursor.lastrowid
        conn.commit()
        return last_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()