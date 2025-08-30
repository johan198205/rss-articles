"""RSS collection and content extraction service."""
import feedparser
import requests
import trafilatura
from readability import Document
from typing import List, Optional
from datetime import datetime
import re
from loguru import logger

from core.models import Article, FeedRule

class RSSCollector:
    """Collects and extracts content from RSS feeds."""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def collect_from_feed(self, rule: FeedRule) -> List[Article]:
        """Collect articles from a single RSS feed."""
        try:
            logger.info(f"Collecting from feed: {rule.label} ({rule.feed_url})")
            
            # Parse RSS feed
            feed = feedparser.parse(rule.feed_url)
            
            if feed.bozo:
                logger.warning(f"Feed parsing issues for {rule.feed_url}: {feed.bozo_exception}")
            
            articles = []
            for entry in feed.entries:
                try:
                    article = self._process_entry(entry, rule)
                    if article:
                        articles.append(article)
                except Exception as e:
                    logger.error(f"Error processing entry {entry.get('title', 'Unknown')}: {e}")
                    continue
            
            logger.info(f"Collected {len(articles)} articles from {rule.label}")
            return articles
            
        except Exception as e:
            logger.error(f"Error collecting from feed {rule.feed_url}: {e}")
            return []
    
    def _process_entry(self, entry, rule: FeedRule) -> Optional[Article]:
        """Process a single RSS entry."""
        title = entry.get('title', '').strip()
        url = entry.get('link', '').strip()
        
        if not title or not url:
            return None
        
        # Parse published date
        published = None
        if hasattr(entry, 'published_parsed') and entry.published_parsed:
            try:
                published = datetime(*entry.published_parsed[:6])
            except:
                pass
        
        # Get summary
        summary = entry.get('summary', '')
        if hasattr(entry, 'content') and entry.content:
            summary = entry.content[0].value if entry.content else summary
        
        # Extract full content
        content = self._extract_content(url)
        if not content or len(content.split()) < 120:
            logger.debug(f"Skipping {title} - content too short or extraction failed")
            return None
        
        word_count = len(content.split())
        
        return Article(
            title=title,
            url=url,
            published=published,
            summary=summary,
            content=content,
            word_count=word_count,
            source_label=rule.label,
            source_weight=rule.source_weight
        )
    
    def _extract_content(self, url: str) -> Optional[str]:
        """Extract full text content from URL."""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            html = response.text
            
            # Try trafilatura first
            content = trafilatura.extract(html)
            if content and len(content.strip()) > 100:
                return self._clean_text(content)
            
            # Fallback to readability
            doc = Document(html)
            content = doc.summary()
            if content:
                # Strip HTML tags
                content = re.sub(r'<[^>]+>', '', content)
                return self._clean_text(content)
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting content from {url}: {e}")
            return None
    
    def _clean_text(self, text: str) -> str:
        """Clean extracted text."""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        # Remove common unwanted patterns
        text = re.sub(r'Advertisement\s*', '', text, flags=re.IGNORECASE)
        text = re.sub(r'Subscribe\s*to\s*.*?newsletter.*?', '', text, flags=re.IGNORECASE)
        
        return text
