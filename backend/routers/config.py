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
async def update_config(config: ConfigModel):
    """Update entire configuration."""
    try:
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
async def update_settings(
    model: str = None,
    importance_threshold: float = None,
    min_words: int = None,
    max_age_days: int = None,
    language: str = None
):
    """Update model, threshold, and defaults."""
    try:
        updates = {}
        
        if model is not None:
            updates['model'] = model
        
        if importance_threshold is not None:
            updates['threshold'] = {"importance": importance_threshold}
        
        if any(x is not None for x in [min_words, max_age_days, language]):
            defaults = {}
            if min_words is not None:
                defaults['min_words'] = min_words
            if max_age_days is not None:
                defaults['max_age_days'] = max_age_days
            if language is not None:
                defaults['language'] = language
            updates['defaults'] = defaults
        
        config_store.update_settings(**updates)
        return {"message": "Settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")
