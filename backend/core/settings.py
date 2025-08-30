"""Application settings and environment configuration."""
import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

class Settings:
    """Application settings loaded from environment variables."""
    
    # API Keys (loaded from environment or in-memory cache)
    openai_api_key: Optional[str] = None
    notion_api_key: Optional[str] = None
    notion_database_id: Optional[str] = None
    
    # Application settings
    timezone: str = "Europe/Stockholm"
    backend_port: int = 8000
    
    def __init__(self):
        """Initialize settings from environment variables."""
        self.load_from_env()
    
    def load_from_env(self):
        """Load settings from environment variables."""
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.notion_api_key = os.getenv("NOTION_API_KEY")
        self.notion_database_id = os.getenv("NOTION_DATABASE_ID")
        self.timezone = os.getenv("TIMEZONE", "Europe/Stockholm")
        self.backend_port = int(os.getenv("BACKEND_PORT", "8000"))
    
    def set_secret(self, key: str, value: str):
        """Set a secret value in memory and optionally persist to .env file."""
        if key == "openai":
            self.openai_api_key = value
        elif key == "notion":
            self.notion_api_key = value
        else:
            raise ValueError(f"Unknown secret key: {key}")
    
    def get_secret_status(self) -> dict:
        """Get status of secrets (set/not set with masked preview)."""
        return {
            "openai_set": bool(self.openai_api_key),
            "openai_last4": self.openai_api_key[-4:] if self.openai_api_key else None,
            "notion_set": bool(self.notion_api_key),
            "notion_last4": self.notion_api_key[-4:] if self.notion_api_key else None,
        }
    
    def persist_secret(self, key: str, value: str):
        """Persist secret to backend/.env file."""
        env_file = os.path.join(os.path.dirname(__file__), '..', '.env')
        
        # Read existing .env file
        env_vars = {}
        if os.path.exists(env_file):
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        env_vars[k] = v
        
        # Update the specific key
        if key == "openai":
            env_vars["OPENAI_API_KEY"] = value
        elif key == "notion":
            env_vars["NOTION_API_KEY"] = value
        
        # Write back to .env file
        with open(env_file, 'w') as f:
            for k, v in env_vars.items():
                f.write(f"{k}={v}\n")
        
        # Update in-memory cache
        self.set_secret(key, value)

# Global settings instance
settings = Settings()

