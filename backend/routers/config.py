"""Configuration management router."""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from core.models import ConfigModel
from core.config_store import config_store

router = APIRouter(prefix="/api/config", tags=["config"])

@router.get("/", response_model=ConfigModel)
async def get_config():
    """Get current configuration."""
    try:
        return config_store.load()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load config: {str(e)}")

@router.put("/", response_model=ConfigModel)
async def update_config(config_data: dict):
    """Update entire configuration."""
    try:
        # Handle both ConfigModel and dict input
        if isinstance(config_data, dict):
            # Convert dict to ConfigModel
            config = ConfigModel(**config_data)
        else:
            config = config_data
        
        config_store.save(config)
        return config_store.load()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save config: {str(e)}")

@router.put("/prompts")
async def update_prompts(prompts: Dict[str, str]):
    """Update prompts in configuration."""
    try:
        config_store.update_prompts(prompts)
        return {"message": "Prompts updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update prompts: {str(e)}")

@router.put("/settings")
async def update_settings(request: dict):
    """Update model, threshold, and defaults."""
    try:
        updates = {}
        
        if 'model' in request:
            updates['model'] = request['model']
        
        if 'importance_threshold' in request:
            updates['threshold'] = {"importance": request['importance_threshold']}
        
        # Add individual default fields directly to updates
        if 'min_words' in request:
            updates['min_words'] = request['min_words']
        if 'max_age_days' in request:
            updates['max_age_days'] = request['max_age_days']
        if 'language' in request:
            updates['language'] = request['language']
        if 'include_any' in request:
            updates['include_any'] = request['include_any'].split(',') if request['include_any'] else []
        if 'include_all' in request:
            updates['include_all'] = request['include_all'].split(',') if request['include_all'] else []
        if 'exclude_any' in request:
            updates['exclude_any'] = request['exclude_any'].split(',') if request['exclude_any'] else []
        
        config_store.update_settings(**updates)
        return {"message": "Settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")
