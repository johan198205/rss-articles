"""LLM scoring service using OpenAI."""
import json
import re
from typing import Optional
from tenacity import retry, stop_after_attempt, wait_exponential
from openai import OpenAI
from loguru import logger

from ..core.models import Article, FeedRule, ScoreResult
from ..core.settings import settings

class LLMScorer:
    """LLM-based article scoring service."""
    
    def __init__(self):
        self.client = None
        if settings.openai_api_key:
            self.client = OpenAI(api_key=settings.openai_api_key)
    
    def score_article(self, article: Article, rule: FeedRule, config) -> Optional[ScoreResult]:
        """Score an article using LLM."""
        if not self.client:
            logger.error("OpenAI client not initialized - missing API key")
            return None
        
        try:
            # Prepare content snippet (limit length for API)
            content = article.content or ""
            if len(content) > 4000:
                content = content[:4000] + "..."
            
            # Build prompt
            system_prompt = config.prompts.get("classifier_system", "")
            user_prompt = config.prompts.get("classifier_user_template", "").format(
                include_any=", ".join(rule.include_any),
                include_all=", ".join(rule.include_all),
                exclude_any=", ".join(rule.exclude_any),
                source_label=article.source_label,
                source_weight=article.source_weight,
                title=article.title,
                url=article.url,
                snippet_or_fulltext=content
            )
            
            # Call OpenAI
            response = self._call_openai(system_prompt, user_prompt, config.model)
            
            if not response:
                return None
            
            # Parse JSON response
            score_data = self._parse_score_response(response)
            if not score_data:
                return None
            
            # Validate and process score
            return self._process_score(score_data, rule, config)
            
        except Exception as e:
            logger.error(f"Error scoring article {article.title}: {e}")
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
                temperature=0.1,
                max_tokens=500
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise
    
    def _parse_score_response(self, response: str) -> Optional[dict]:
        """Parse JSON response from OpenAI."""
        try:
            # Try to extract JSON from response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                return json.loads(json_str)
            
            # If no JSON found, try parsing entire response
            return json.loads(response)
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.error(f"Response was: {response}")
            return None
    
    def _process_score(self, score_data: dict, rule: FeedRule, config) -> ScoreResult:
        """Process and validate score data."""
        # Validate topic
        valid_topics = ["SEO & AI visibility", "Webbanalys & AI", "Generativ AI"]
        topic = score_data.get("topic", "")
        if topic not in valid_topics:
            logger.warning(f"Invalid topic '{topic}', using default: {rule.topic_default}")
            topic = rule.topic_default
        
        # Get scores
        relevance = max(0, min(5, int(score_data.get("relevance", 0))))
        novelty = max(0, min(5, int(score_data.get("novelty", 0))))
        authority = max(0, min(5, int(score_data.get("authority", 0))))
        actionability = max(0, min(5, int(score_data.get("actionability", 0))))
        
        # Calculate importance
        importance = score_data.get("importance")
        if importance is None:
            # Calculate from other scores
            importance_base = (
                0.35 * relevance +
                0.25 * novelty +
                0.25 * actionability +
                0.15 * authority
            )
            importance = round(importance_base * rule.source_weight, 2)
        else:
            importance = float(importance)
        
        # Determine if to keep
        threshold = config.threshold.get("importance", 3.2)
        keep = importance >= threshold
        
        # Get reason
        reason_short = score_data.get("reason_short", "")[:240]
        
        return ScoreResult(
            topic=topic,
            relevance=relevance,
            novelty=novelty,
            authority=authority,
            actionability=actionability,
            importance=importance,
            keep=keep,
            reason_short=reason_short
        )
