from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import init_db_pool
from routes import auth, projects, schema_designer, data, admin, permissions, setup, sql_history
from utils.middleware import auth_middleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        init_db_pool()
        print("Backend started (database may not be configured yet)")
    except Exception as e:
        print(f"Startup warning: {e}")
    yield
    # Shutdown (if needed)
    print("Shutting down...")

app = FastAPI(title="SchemaForge", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(auth_middleware)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(schema_designer.router)
app.include_router(data.router)
app.include_router(admin.router)
app.include_router(permissions.router)
app.include_router(setup.router)
app.include_router(sql_history.router)

@app.get("/health")
async def health():
    return {"status": "ok"}