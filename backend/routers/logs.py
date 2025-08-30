"""Logs management router."""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse
import os
from typing import List

router = APIRouter(prefix="/api/logs", tags=["logs"])

@router.get("/tail", response_class=PlainTextResponse)
async def get_logs_tail(lines: int = Query(200, description="Number of lines to return")):
    """Get tail of log file."""
    try:
        # Get log file path
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        log_file = os.path.join(project_root, "logs", "run.log")
        
        if not os.path.exists(log_file):
            return "No log file found"
        
        # Read last N lines
        with open(log_file, 'r', encoding='utf-8') as f:
            all_lines = f.readlines()
        
        # Return last N lines
        tail_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
        
        return ''.join(tail_lines)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read logs: {str(e)}")

@router.get("/info")
async def get_logs_info():
    """Get information about log files."""
    try:
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        logs_dir = os.path.join(project_root, "logs")
        
        info = {
            "logs_directory": logs_dir,
            "exists": os.path.exists(logs_dir),
            "files": []
        }
        
        if os.path.exists(logs_dir):
            for file in os.listdir(logs_dir):
                file_path = os.path.join(logs_dir, file)
                if os.path.isfile(file_path):
                    stat = os.stat(file_path)
                    info["files"].append({
                        "name": file,
                        "size_bytes": stat.st_size,
                        "modified": stat.st_mtime
                    })
        
        return info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get log info: {str(e)}")
