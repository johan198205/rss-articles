"""Configuration store for reading/writing config.yaml."""
import os
import yaml
from typing import Dict, Any
from .models import ConfigModel, FeedRule

class ConfigStore:
    """Manages configuration storage in /data/config.yaml."""
    
    def __init__(self, config_path: str = None):
        """Initialize config store with path to config file."""
        if config_path is None:
            # Default to /data/config.yaml relative to project root
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            config_path = os.path.join(project_root, "data", "config.yaml")
        
        self.config_path = config_path
        self._ensure_data_dir()
    
    def _ensure_data_dir(self):
        """Ensure the data directory exists."""
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
    
    def load(self) -> ConfigModel:
        """Load configuration from file, creating defaults if missing."""
        if not os.path.exists(self.config_path):
            return self._create_default_config()
        
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f) or {}
            
            # Convert feeds list to FeedRule objects
            if 'feeds' in data:
                feeds_data = data['feeds']
                data['feeds'] = [FeedRule(**feed) for feed in feeds_data]
            
            return ConfigModel(**data)
        except Exception as e:
            # If loading fails, create default config
            print(f"Error loading config: {e}. Creating default config.")
            return self._create_default_config()
    
    def save(self, config: ConfigModel):
        """Save configuration to file."""
        # Convert to dict for YAML serialization
        data = config.model_dump()
        
        # Convert FeedRule objects to dicts
        if 'feeds' in data:
            data['feeds'] = [feed.model_dump() for feed in data['feeds']]
        
        with open(self.config_path, 'w', encoding='utf-8') as f:
            yaml.dump(data, f, default_flow_style=False, allow_unicode=True)
    
    def _create_default_config(self) -> ConfigModel:
        """Create and save default configuration."""
        config = ConfigModel()
        self.save(config)
        return config
    
    def update_feeds(self, feeds: list[FeedRule]):
        """Update only the feeds in the configuration."""
        config = self.load()
        config.feeds = feeds
        self.save(config)
    
    def update_prompts(self, prompts: Dict[str, str]):
        """Update only the prompts in the configuration."""
        config = self.load()
        config.prompts.update(prompts)
        self.save(config)
    
    def update_settings(self, **kwargs):
        """Update model, threshold, or defaults in the configuration."""
        config = self.load()
        
        if 'model' in kwargs:
            config.model = kwargs['model']
        if 'threshold' in kwargs:
            config.threshold.update(kwargs['threshold'])
        if 'defaults' in kwargs:
            config.defaults.update(kwargs['defaults'])
        
        self.save(config)

# Global config store instance
config_store = ConfigStore()
