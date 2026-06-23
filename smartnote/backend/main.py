from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="SmartNote API",
    description="Superior note-taking platform with AI features",
    version="1.0.0"
)

# CORS middleware configuration
origins = [
    "http://localhost:3000",      # React dev server
    "http://localhost:5173",      # Vite dev server
    "http://localhost:5500",      # Live Server
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== ROUTES ==============

# Health check endpoint
@app.get("/")
async def root():
    """Root endpoint - health check"""
    return {
        "status": "success",
        "message": "SmartNote API is running",
        "version": "1.0.0"
    }

@app.get("/debug/ui", response_class=HTMLResponse)
async def debug_ui():
    """Serve debug UI"""
    with open('debug_ui.html', 'r') as f:
        return f.read()

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "SmartNote Backend"
    }

@app.get("/api/debug/table-structure")
async def debug_table_structure():
    """Debug endpoint - check notes table structure"""
    try:
        from database import supabase
        # Try to fetch one note to see the structure
        response = supabase.table("notes").select("*").limit(1).execute()
        return {
            "status": "success",
            "data": response.data,
            "count": len(response.data) if response.data else 0
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

@app.get("/api/debug/users/{user_id}")
async def debug_check_user(user_id: str):
    """Debug endpoint - check if user exists"""
    try:
        from database import supabase
        response = supabase.table("users").select("*").eq("id", user_id).execute()
        return {
            "status": "success",
            "user_exists": len(response.data) > 0,
            "user": response.data[0] if response.data else None
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

@app.post("/api/debug/create-user")
async def debug_create_user(user_id: str, email: str = "test@example.com"):
    """Debug endpoint - create a user record"""
    try:
        from database import supabase
        
        data = {
            "id": user_id,
            "email": email,
            "name": email.split("@")[0]
        }
        
        print(f"DEBUG: Creating user with data: {data}")
        response = supabase.table("users").insert(data).execute()
        
        print(f"DEBUG: User creation response: {response.data}")
        
        return {
            "status": "success",
            "user": response.data[0] if response.data else None
        }
    except Exception as e:
        import traceback
        print(f"DEBUG: Error: {str(e)}")
        traceback.print_exc()
        return {
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        }

# Route imports
from routes import notes, upload, tts, summarizer
app.include_router(notes.router, prefix="/api/notes", tags=["Notes"])
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(tts.router, prefix="/api/speech", tags=["Speech"])
app.include_router(summarizer.router, prefix="/api/summarizer", tags=["Summarizer"])

# ============== ERROR HANDLING ==============

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": str(exc),
            "detail": "Internal server error"
        }
    )

# ============== STARTUP/SHUTDOWN EVENTS ==============

@app.on_event("startup")
async def startup_event():
    """Run on startup"""
    print("✅ SmartNote API started")
    # TODO: Initialize Supabase connection
    # TODO: Test database connection
    pass

@app.on_event("shutdown")
async def shutdown_event():
    """Run on shutdown"""
    print("❌ SmartNote API shutting down")
    pass

# ============== MAIN ==============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
