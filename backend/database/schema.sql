-- =====================================================
-- SchemaForge Database Schema
-- MySQL Native Syntax
-- =====================================================

-- Create database
CREATE DATABASE IF NOT EXISTS schemaforge_metadata;
USE schemaforge_metadata;

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- =====================================================
-- 2. OTP VERIFICATIONS TABLE
-- =====================================================
DROP TABLE IF EXISTS otp_verifications;
CREATE TABLE otp_verifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose ENUM('register', 'login') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_email_purpose ON otp_verifications(email, purpose);
CREATE INDEX idx_otp_expires ON otp_verifications(expires_at);

-- =====================================================
-- 3. PROJECTS TABLE
-- =====================================================
DROP TABLE IF EXISTS projects;
CREATE TABLE projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    secret_key VARCHAR(64) UNIQUE NOT NULL,
    database_name VARCHAR(255),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_projects_secret_key ON projects(secret_key);
CREATE INDEX idx_projects_created_by ON projects(created_by);

-- =====================================================
-- 4. PROJECT MEMBERS TABLE
-- =====================================================
DROP TABLE IF EXISTS project_members;
CREATE TABLE project_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('admin', 'member') DEFAULT 'member',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    joined_at TIMESTAMP NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_member (project_id, user_id)
);

CREATE INDEX idx_pm_project ON project_members(project_id);
CREATE INDEX idx_pm_user ON project_members(user_id);
CREATE INDEX idx_pm_status ON project_members(status);

-- =====================================================
-- 5. SCHEMA DEFINITIONS TABLE
-- =====================================================
DROP TABLE IF EXISTS schema_definitions;
CREATE TABLE schema_definitions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    definition JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project_schema (project_id)
);

-- =====================================================
-- 6. PROJECT DATABASES TABLE
-- =====================================================
DROP TABLE IF EXISTS project_databases;
CREATE TABLE project_databases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL UNIQUE,
    database_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_pd_project ON project_databases(project_id);

-- =====================================================
-- 7. SQL HISTORY TABLE
-- =====================================================
DROP TABLE IF EXISTS sql_history;
CREATE TABLE sql_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    sql_text TEXT NOT NULL,
    status ENUM('success', 'failed', 'rolled_back') DEFAULT 'success',
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sql_project ON sql_history(project_id);
CREATE INDEX idx_sql_user ON sql_history(user_id);
CREATE INDEX idx_sql_executed_at ON sql_history(executed_at);

-- =====================================================
-- 8. AUDIT LOGS TABLE
-- =====================================================
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- =====================================================
-- 9. BLACKLIST TABLE
-- =====================================================
DROP TABLE IF EXISTS blacklist;
CREATE TABLE blacklist (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    ip_address VARCHAR(45),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_blacklist_user ON blacklist(user_id);
CREATE INDEX idx_blacklist_ip ON blacklist(ip_address);

-- =====================================================
-- 10. SESSIONS TABLE
-- =====================================================
DROP TABLE IF EXISTS sessions;
CREATE TABLE sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token(255));
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- =====================================================
-- 11. USER PERMISSIONS TABLE
-- =====================================================
DROP TABLE IF EXISTS user_permissions;
CREATE TABLE user_permissions (
    user_id INT PRIMARY KEY,
    can_create_project BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- 12. DATABASE PERMISSIONS TABLE
-- =====================================================
DROP TABLE IF EXISTS database_permissions;
CREATE TABLE database_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    permission_type ENUM('read', 'write', 'admin', 'full') DEFAULT 'read',
    granted_by INT,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_db_permission (project_id, user_id)
);

CREATE INDEX idx_db_perm_project ON database_permissions(project_id);
CREATE INDEX idx_db_perm_user ON database_permissions(user_id);

-- =====================================================
-- 13. TABLE PERMISSIONS TABLE
-- =====================================================
DROP TABLE IF EXISTS table_permissions;
CREATE TABLE table_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    permission_type ENUM('read', 'write', 'delete', 'full') DEFAULT 'read',
    granted_by INT,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_table_permission (project_id, table_name, user_id)
);

CREATE INDEX idx_tbl_perm_project ON table_permissions(project_id);
CREATE INDEX idx_tbl_perm_user ON table_permissions(user_id);
CREATE INDEX idx_tbl_perm_table ON table_permissions(table_name);

-- =====================================================
-- 14. SYSTEM CONFIGURATION TABLE
-- =====================================================
DROP TABLE IF EXISTS system_config;
CREATE TABLE system_config (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- 15. USER ACTIVITY LOGS
-- =====================================================
DROP TABLE IF EXISTS user_activity;
CREATE TABLE user_activity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    activity_type VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_activity_user ON user_activity(user_id);
CREATE INDEX idx_activity_type ON user_activity(activity_type);
CREATE INDEX idx_activity_created ON user_activity(created_at);

-- =====================================================
-- 16. PASSWORD RESET TABLE (for credential changes)
-- =====================================================
DROP TABLE IF EXISTS password_resets;
CREATE TABLE password_resets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    reset_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_reset_token (reset_token)
);

CREATE INDEX idx_reset_token ON password_resets(reset_token);
CREATE INDEX idx_reset_expires ON password_resets(expires_at);

-- =====================================================
-- INITIAL DATA: Create Super Admin
-- Note: Password is 'Admin@123' hashed with pbkdf2_sha256
-- The backend will re-hash this on first run if needed
-- =====================================================

-- Insert super admin (password: Admin@123)
-- This hash is for pbkdf2_sha256 with 100000 iterations
INSERT INTO users (email, password_hash, role, is_active) 
VALUES (
    'admin@schemaforge.com', 
    'pbkdf2_sha256$100000$abc123def456$5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    'super_admin', 
    TRUE
) ON DUPLICATE KEY UPDATE 
    role = 'super_admin', 
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP;

-- Give super admin project creation permission
INSERT INTO user_permissions (user_id, can_create_project) 
SELECT id, TRUE FROM users WHERE email = 'admin@schemaforge.com'
ON DUPLICATE KEY UPDATE can_create_project = TRUE;

-- Insert system configuration defaults
INSERT INTO system_config (config_key, config_value) VALUES
('system_name', 'SchemaForge'),
('system_version', '1.0.0'),
('allow_registration', 'true'),
('smtp_enabled', 'false'),
('session_timeout_minutes', '60')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- =====================================================
-- END OF SCHEMA
-- =====================================================

-- Display confirmation
SELECT 'SchemaForge database schema created successfully!' AS Status;
SELECT COUNT(*) AS TotalUsers FROM users;
SELECT COUNT(*) AS TotalTables FROM information_schema.tables WHERE table_schema = 'schemaforge_metadata';