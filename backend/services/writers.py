"""Content writers for LinkedIn articles and posts."""
from typing import Optional
from tenacity import retry, stop_after_attempt, wait_exponential
from openai import OpenAI
from loguru import logger

from ..core.models import Article
from ..core.settings import settings

class ContentWriters:
    """Writers for LinkedIn content generation."""
    
    def __init__(self):
        self.client = None
        if settings.openai_api_key:
            self.client = OpenAI(api_key=settings.openai_api_key)
    
    def write_linkedin_article(self, article: Article, config) -> Optional[str]:
        """Write structured LinkedIn article in Swedish."""
        if not self.client:
            logger.error("OpenAI client not initialized - missing API key")
            return None
        
        try:
            system_prompt = config.prompts.get("writer_linkedin_system", "")
            user_prompt = config.prompts.get("writer_linkedin_user_template", "").format(
                title=article.title,
                content=article.content or ""
            )
            
            response = self._call_openai(system_prompt, user_prompt, config.model)
            return response
            
        except Exception as e:
            logger.error(f"Error writing LinkedIn article for {article.title}: {e}")
            return None
    
    def write_personal_post(self, article: Article, config) -> Optional[str]:
        """Write personal LinkedIn post in Swedish."""
        if not self.client:
            logger.error("OpenAI client not initialized - missing API key")
            return None
        
        try:
            system_prompt = config.prompts.get("writer_personal_system", "")
            user_prompt = config.prompts.get("writer_personal_user_template", "").format(
                title=article.title,
                content=article.content or ""
            )
            
            response = self._call_openai(system_prompt, user_prompt, config.model)
            return response
            
        except Exception as e:
            logger.error(f"Error writing personal post for {article.title}: {e}")
            return None
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def _call_openai(self, system_prompt: str, user_prompt: str, model: str) -> Optional[str]:
        """Call OpenAI API with retry logic."""
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=1500
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise
