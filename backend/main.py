from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import init_db_pool, execute_query
from routes import auth, projects, schema_designer, data, admin
from utils.middleware import auth_middleware
from utils.security import hash_password

app = FastAPI(title="SchemaForge Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    init_db_pool()
    # Create super admin if not exists
    admin_email = "admin@schemaforge.com"
    existing = execute_query("SELECT id FROM users WHERE email=%s", (admin_email,), fetch_one=True)
    if not existing:
        hashed = hash_password("Admin@123")
        execute_query(
            "INSERT INTO users (email, password_hash, is_active, is_super_admin) VALUES (%s, %s, TRUE, TRUE)",
            (admin_email, hashed), commit=True
        )
        print("Super admin created: admin@schemaforge.com / Admin@123")

app.middleware("http")(auth_middleware)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(schema_designer.router)
app.include_router(data.router)
app.include_router(admin.router)

@app.get("/health")
async def health():
    return {"status": "ok"}