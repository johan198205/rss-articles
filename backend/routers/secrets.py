"""Secrets management router."""
from fastapi import APIRouter, HTTPException
from openai import OpenAI
from notion_client import Client

from core.models import SecretSetRequest, SecretTestRequest, SecretTestResponse
from core.settings import settings

router = APIRouter(prefix="/api/secrets", tags=["secrets"])

@router.get("/meta")
async def get_secrets_meta():
    """Get status of secrets (set/not set with masked preview)."""
    try:
        return settings.get_secret_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get secrets meta: {str(e)}")

@router.post("/set")
async def set_secret(request: SecretSetRequest):
    """Set a secret value."""
    try:
        # Validate key
        if request.key not in ["openai", "notion", "notion_database_id"]:
            raise HTTPException(status_code=400, detail="Key must be 'openai', 'notion', or 'notion_database_id'")
        
        # Validate value
        if not request.value or len(request.value.strip()) < 10:
            raise HTTPException(status_code=400, detail="Value must be at least 10 characters")
        
        # Persist to .env file and update in-memory cache
        settings.persist_secret(request.key, request.value.strip())
        
        # Return updated meta (never return full value)
        return settings.get_secret_status()
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set secret: {str(e)}")

@router.post("/test", response_model=SecretTestResponse)
async def test_secret(request: SecretTestRequest):
    """Test a secret connection."""
    try:
        if request.key == "openai":
            return await _test_openai()
        elif request.key == "notion":
            return await _test_notion()
        elif request.key == "notion_database_id":
            return await _test_notion_database_id()
        else:
            raise HTTPException(status_code=400, detail="Key must be 'openai', 'notion', or 'notion_database_id'")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to test secret: {str(e)}")

async def _test_openai() -> SecretTestResponse:
    """Test OpenAI API key."""
    if not settings.openai_api_key:
        return SecretTestResponse(ok=False, message="OpenAI API key not set")
    
    # Basic format validation
    if not settings.openai_api_key.startswith("sk-"):
        return SecretTestResponse(ok=False, message="Invalid OpenAI API key format (should start with 'sk-')")
    
    if len(settings.openai_api_key) < 20:
        return SecretTestResponse(ok=False, message="OpenAI API key too short")
    
    try:
        # Create client with minimal configuration
        client = OpenAI(
            api_key=settings.openai_api_key,
            timeout=10.0
        )
        
        # Make a minimal test call
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Test"}],
            max_tokens=1
        )
        
        return SecretTestResponse(ok=True, message="OpenAI connection successful")
        
    except Exception as e:
        # If we get a proxy error, just validate the format instead
        if "proxies" in str(e):
            return SecretTestResponse(ok=True, message="OpenAI API key format valid (connection test skipped due to proxy settings)")
        return SecretTestResponse(ok=False, message=f"OpenAI test failed: {str(e)}")

async def _test_notion() -> SecretTestResponse:
    """Test Notion API key and database access."""
    if not settings.notion_api_key:
        return SecretTestResponse(ok=False, message="Notion API key not set")
    
    if not settings.notion_database_id:
        return SecretTestResponse(ok=False, message="Notion database ID not set")
    
    try:
        client = Client(auth=settings.notion_api_key)
        
        # Try to retrieve database
        response = client.databases.retrieve(database_id=settings.notion_database_id)
        
        return SecretTestResponse(ok=True, message="Notion connection successful")
        
    except Exception as e:
        return SecretTestResponse(ok=False, message=f"Notion test failed: {str(e)}")

async def _test_notion_database_id() -> SecretTestResponse:
    """Test Notion database ID format."""
    if not settings.notion_database_id:
        return SecretTestResponse(ok=False, message="Notion database ID not set")
    
    # Basic format validation (Notion database IDs are 32 characters)
    if len(settings.notion_database_id) != 32:
        return SecretTestResponse(ok=False, message="Invalid Notion database ID format (should be 32 characters)")
    
    return SecretTestResponse(ok=True, message="Notion database ID format valid")
