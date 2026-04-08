from fastapi import Request, HTTPException
from jose import jwt, ExpiredSignatureError
from config import Config
from database.connection import execute_query

async def auth_middleware(request: Request, call_next):
    # Allow OPTIONS preflight requests
    if request.method == "OPTIONS":
        return await call_next(request)
    
    # Public endpoints (no token required)
    public_paths = [
        "/auth/register", 
        "/auth/login", 
        "/auth/verify-otp",
        "/auth/forgot-password",
        "/auth/reset-password",
        "/docs", 
        "/openapi.json", 
        "/health",
        "/setup/status",
        "/setup/configure-database"
    ]
    
    if request.url.path in public_paths:
        return await call_next(request)
    
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    
    token = auth_header.split(" ")[1]
    
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITHM])
        user_email = payload.get("sub")
        user_id = payload.get("user_id")
        user_role = payload.get("role", "user")
        
        # Check blacklist
        blacklisted = execute_query("SELECT id FROM blacklist WHERE user_id=%s", (user_id,), fetch_one=True)
        if blacklisted:
            raise HTTPException(status_code=403, detail="Your account has been blacklisted")
        
        request.state.user = {
            "id": user_id,
            "email": user_email,
            "role": user_role
        }
        
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired. Please login again.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    
    return await call_next(request)

def get_current_user(request: Request):
    return getattr(request.state, "user", None)