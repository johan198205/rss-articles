"""Hard filters for articles before LLM processing."""
from typing import Tuple
from datetime import datetime, timedelta
import re
from loguru import logger

from core.models import Article, FeedRule

class ArticleFilters:
    """Hard filters for article processing."""
    
    def __init__(self):
        pass
    
    def apply_filters(self, article: Article, rule: FeedRule) -> Tuple[bool, str]:
        """Apply all hard filters to an article.
        
        Returns:
            Tuple of (allowed: bool, reason: str)
        """
        # Check if rule is enabled
        if not rule.enabled:
            return False, "Feed rule disabled"
        
        # Check age
        if article.published:
            age_days = (datetime.now() - article.published).days
            if age_days > rule.max_age_days:
                return False, f"Article too old ({age_days} days > {rule.max_age_days})"
        
        # Check word count
        if article.word_count < rule.min_words:
            return False, f"Article too short ({article.word_count} words < {rule.min_words})"
        
        # Check include_any (at least one must match)
        if rule.include_any:
            if not self._matches_any(article, rule.include_any):
                return False, f"No include_any matches: {rule.include_any}"
        
        # Check include_all (all must match)
        if rule.include_all:
            if not self._matches_all(article, rule.include_all):
                return False, f"Not all include_all match: {rule.include_all}"
        
        # Check exclude_any (none should match)
        if rule.exclude_any:
            if self._matches_any(article, rule.exclude_any):
                return False, f"Excluded by exclude_any: {rule.exclude_any}"
        
        # Check language (if specified)
        if rule.language:
            if not self._check_language(article, rule.language):
                return False, f"Language mismatch (expected: {rule.language})"
        
        return True, "Passed all filters"
    
    def _matches_any(self, article: Article, keywords: list) -> bool:
        """Check if article matches any of the keywords."""
        text = f"{article.title} {article.content or ''} {article.summary or ''}".lower()
        
        for keyword in keywords:
            if keyword.lower() in text:
                return True
        return False
    
    def _matches_all(self, article: Article, keywords: list) -> bool:
        """Check if article matches all keywords."""
        text = f"{article.title} {article.content or ''} {article.summary or ''}".lower()
        
        for keyword in keywords:
            if keyword.lower() not in text:
                return False
        return True
    
    def _check_language(self, article: Article, expected_lang: str) -> bool:
        """Check if article is in expected language."""
        try:
            from langdetect import detect
            
            # Use title and first part of content for language detection
            text = article.title
            if article.content:
                text += " " + article.content[:500]
            
            detected = detect(text)
            return detected == expected_lang
            
        except Exception as e:
            logger.warning(f"Language detection failed: {e}")
            # If detection fails, assume it's okay
            return True
