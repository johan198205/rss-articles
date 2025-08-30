"""Notion integration for writing articles."""
from typing import Optional
from notion_client import Client
from datetime import datetime
import pytz
from loguru import logger

from core.models import Article, ScoreResult
from core.settings import settings

class NotionWriter:
    """Writes articles to Notion database."""
    
    def __init__(self):
        self.client = None
        if settings.notion_api_key and settings.notion_database_id:
            self.client = Client(auth=settings.notion_api_key)
            self.database_id = settings.notion_database_id
    
    def write_article(self, article: Article, score_result: ScoreResult, 
                     linkedin_article: str, personal_post: str, blog_post: str = None) -> bool:
        """Write article to Notion database."""
        if not self.client:
            logger.error("Notion client not initialized - missing API key or database ID")
            return False
        
        try:
            # Prepare date
            date_value = article.published
            if not date_value:
                # Use current date in configured timezone
                tz = pytz.timezone(settings.timezone)
                date_value = datetime.now(tz)
            
            # Create page properties
            properties = {
                "Titel": {
                    "title": [
                        {
                            "text": {
                                "content": article.title
                            }
                        }
                    ]
                },
                "URL": {
                    "url": article.url
                },
                "Publicerad": {
                    "date": {
                        "start": date_value.strftime("%Y-%m-%d")
                    }
                },
                "Vikt": {
                    "number": score_result.importance
                }
            }
            
            # Create page blocks
            blocks = [
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": "Artikel (struktur)"
                                }
                            }
                        ]
                    }
                },
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": linkedin_article
                                }
                            }
                        ]
                    }
                },
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": "Inlägg (personlig touch)"
                                }
                            }
                        ]
                    }
                },
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": personal_post
                                }
                            }
                        ]
                    }
                }
            ]
            
            # Add blog post section if available
            if blog_post:
                blocks.extend([
                    {
                        "object": "block",
                        "type": "heading_2",
                        "heading_2": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": "Blogginlägg"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": blog_post
                                    }
                                }
                            ]
                        }
                    }
                ])
            
            # Create page
            response = self.client.pages.create(
                parent={"database_id": self.database_id},
                properties=properties,
                children=blocks
            )
            
            logger.info(f"Successfully wrote article to Notion: {article.title}")
            return True
            
        except Exception as e:
            logger.error(f"Error writing to Notion: {e}")
            return False
    
    def test_connection(self) -> tuple[bool, str]:
        """Test Notion connection and database access."""
        if not self.client:
            return False, "Notion client not initialized"
        
        try:
            # Try to retrieve database properties
            response = self.client.databases.retrieve(database_id=self.database_id)
            db_title = response.get('title', [{}])[0].get('plain_text', 'Unknown')
            
            # Get available properties
            properties = response.get('properties', {})
            available_props = list(properties.keys())
            
            # Check required properties
            required_props = ["Titel", "URL", "Publicerad", "Vikt"]
            missing_props = [prop for prop in required_props if prop not in available_props]
            
            if missing_props:
                return False, f"Missing properties: {missing_props}. Available: {available_props}"
            
            return True, f"Connected to database: {db_title}. Properties: {available_props}"
            
        except Exception as e:
            return False, f"Connection failed: {str(e)}"
