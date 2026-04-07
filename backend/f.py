import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.connection import init_db_pool, execute_query
from utils.security import hash_password, verify_password

def fix_super_admin():
    print("=" * 50)
    print("Fixing Super Admin Login")
    print("=" * 50)
    
    init_db_pool()
    
    admin_email = "admin@schemaforge.com"
    admin_password = "Admin@123"
    
    hashed = hash_password(admin_password)
    print(f"Generated hash: {hashed[:50]}...")
    
    existing = execute_query("SELECT id, email, role FROM users WHERE email=%s", (admin_email,), fetch_one=True)
    
    if existing:
        print(f"Found existing user: {existing['email']} (ID: {existing['id']}, Role: {existing['role']})")
        
        execute_query(
            "UPDATE users SET password_hash=%s, role='super_admin', is_active=TRUE WHERE email=%s",
            (hashed, admin_email), commit=True
        )
        print("✅ Updated password hash and role")
    else:
        print("User not found, creating new...")
        execute_query(
            "INSERT INTO users (email, password_hash, role, is_active) VALUES (%s, %s, 'super_admin', TRUE)",
            (admin_email, hashed), commit=True
        )
        print("✅ Created new super admin")
    
    user = execute_query("SELECT id, email, password_hash FROM users WHERE email=%s", (admin_email,), fetch_one=True)
    if user:
        is_valid = verify_password(admin_password, user["password_hash"])
        print(f"Password verification: {'✅ SUCCESS' if is_valid else '❌ FAILED'}")
    
    user = execute_query("SELECT id FROM users WHERE email=%s", (admin_email,), fetch_one=True)
    if user:
        execute_query(
            "INSERT INTO user_permissions (user_id, can_create_project) VALUES (%s, TRUE) ON DUPLICATE KEY UPDATE can_create_project=TRUE",
            (user["id"],), commit=True
        )
        print("✅ Permissions set")
    
    execute_query("DELETE FROM otp_verifications WHERE email=%s", (admin_email,), commit=True)
    print("✅ Cleared old OTPs")
    
    print("\n" + "=" * 50)
    print("SUPER ADMIN CREDENTIALS:")
    print(f"Email: {admin_email}")
    print(f"Password: {admin_password}")
    print("=" * 50)

if __name__ == "__main__":
    fix_super_admin()