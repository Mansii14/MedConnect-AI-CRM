import sys
import os
import traceback
from fastapi import FastAPI

try:
    # Ensure backend directory is in python path
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if backend_dir not in sys.path:
        sys.path.append(backend_dir)
        
    from app.main import app
except Exception as e:
    tb = traceback.format_exc()
    app = FastAPI()
    
    @app.get("/")
    def debug_error():
        return {
            "error": str(e),
            "traceback": tb,
            "sys_path": sys.path,
            "cwd": os.getcwd()
        }
    
    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"])
    def catch_all(path_name: str):
        return {
            "error": str(e),
            "traceback": tb,
            "sys_path": sys.path,
            "cwd": os.getcwd()
        }

