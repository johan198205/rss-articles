"""Global status tracking for pipeline execution."""
from typing import Optional, Dict, Any
from datetime import datetime
import threading

class PipelineStatus:
    """Thread-safe status tracking for pipeline execution."""
    
    def __init__(self):
        self._lock = threading.Lock()
        self._status: Optional[Dict[str, Any]] = None
        self._start_time: Optional[datetime] = None
    
    def start(self, total_feeds: int, dry_run: bool, limit: Optional[int]):
        """Start pipeline execution tracking."""
        with self._lock:
            self._start_time = datetime.now()
            self._status = {
                "running": True,
                "stage": "initializing",
                "message": "Pipeline startar...",
                "total_feeds": total_feeds,
                "processed_feeds": 0,
                "total_articles": 0,
                "processed_articles": 0,
                "kept_count": 0,
                "skipped_count": 0,
                "filtered_count": 0,
                "dry_run": dry_run,
                "limit": limit,
                "current_feed": None,
                "current_article": None,
                "timestamp": self._start_time.isoformat()
            }
    
    def update_stage(self, stage: str, message: str, **kwargs):
        """Update pipeline stage and message."""
        with self._lock:
            if self._status:
                self._status.update({
                    "stage": stage,
                    "message": message,
                    "timestamp": datetime.now().isoformat(),
                    **kwargs
                })
    
    def update_feed_progress(self, current_feed: str, processed_feeds: int, articles_collected: int):
        """Update feed processing progress."""
        with self._lock:
            if self._status:
                self._status.update({
                    "stage": "collecting",
                    "message": f"Bearbetar feed {processed_feeds}/{self._status['total_feeds']}: {current_feed}",
                    "current_feed": current_feed,
                    "processed_feeds": processed_feeds,
                    "total_articles": articles_collected,
                    "timestamp": datetime.now().isoformat()
                })
    
    def update_article_progress(self, current_article: str, processed_articles: int, kept: int, skipped: int, filtered: int):
        """Update article processing progress."""
        with self._lock:
            if self._status:
                self._status.update({
                    "stage": "processing",
                    "message": f"Bearbetar artikel {processed_articles}/{self._status['total_articles']}: {current_article[:50]}...",
                    "current_article": current_article,
                    "processed_articles": processed_articles,
                    "kept_count": kept,
                    "skipped_count": skipped,
                    "filtered_count": filtered,
                    "timestamp": datetime.now().isoformat()
                })
    
    def complete(self, kept: int, skipped: int, filtered: int, duration: float):
        """Mark pipeline as completed."""
        with self._lock:
            if self._status:
                self._status.update({
                    "running": False,
                    "stage": "completed",
                    "message": f"Pipeline klar! {kept} behållna, {skipped} hoppade över, {filtered} filtrerade",
                    "kept_count": kept,
                    "skipped_count": skipped,
                    "filtered_count": filtered,
                    "duration_seconds": duration,
                    "timestamp": datetime.now().isoformat()
                })
    
    def get_status(self) -> Optional[Dict[str, Any]]:
        """Get current status."""
        with self._lock:
            return self._status.copy() if self._status else None
    
    def clear(self):
        """Clear status."""
        with self._lock:
            self._status = None
            self._start_time = None

# Global status instance
pipeline_status = PipelineStatus()
