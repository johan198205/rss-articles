"""Status endpoint for pipeline execution tracking."""
from fastapi import APIRouter
from core.status import pipeline_status

router = APIRouter(prefix="/api/status", tags=["status"])

@router.get("/")
async def get_pipeline_status():
    """Get current pipeline execution status."""
    status = pipeline_status.get_status()
    return status or {"running": False, "message": "Ingen pipeline körs"}
