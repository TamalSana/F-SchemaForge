import mysql.connector
from mysql.connector import pooling
from config import Config
import logging
import os

db_pool = None

def init_db_pool():
    global db_pool
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if not os.path.exists(env_path):
        logging.warning("No .env file found. Database not configured. Please run setup.")
        db_pool = None
        return

    try:
        temp_conn = mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            autocommit=True
        )
        temp_cursor = temp_conn.cursor()
        temp_cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{Config.DB_NAME}`")
        temp_cursor.execute(f"USE `{Config.DB_NAME}`")
        temp_cursor.close()
        temp_conn.close()

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
        logging.error(f"Database connection failed: {e}. Please run setup.")
        db_pool = None

def get_db_connection():
    if db_pool is None:
        raise Exception("Database not configured. Please run setup.")
    return db_pool.get_connection()

def execute_query(query, params=None, fetch_one=False, fetch_all=False, commit=False, database=None):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    if database:
        try:
            cursor.execute(f"USE `{database}`")
        except:
            pass
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

def execute_transaction(queries_params_list, database=None):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    last_id = None
    if database:
        try:
            cursor.execute(f"USE `{database}`")
        except:
            pass
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