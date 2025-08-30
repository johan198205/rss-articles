"""SQLite store for deduplication."""
import sqlite3
import hashlib
import os
from typing import Optional

class DedupeStore:
    """SQLite store for article deduplication."""
    
    def __init__(self, db_path: str = None):
        """Initialize dedupe store with SQLite database."""
        if db_path is None:
            # Default to /data/dedupe.db relative to project root
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            data_dir = os.path.join(project_root, "data")
            os.makedirs(data_dir, exist_ok=True)
            db_path = os.path.join(data_dir, "dedupe.db")
        
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Initialize database with articles table."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS articles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    hash TEXT UNIQUE NOT NULL,
                    url TEXT NOT NULL,
                    title TEXT NOT NULL,
                    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
    
    def _generate_hash(self, url: str, title: str) -> str:
        """Generate SHA256 hash for URL + title combination."""
        content = f"{url}::{title}"
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    def is_duplicate(self, url: str, title: str) -> bool:
        """Check if article is already processed."""
        hash_value = self._generate_hash(url, title)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT 1 FROM articles WHERE hash = ?",
                (hash_value,)
            )
            return cursor.fetchone() is not None
    
    def mark_processed(self, url: str, title: str):
        """Mark article as processed."""
        hash_value = self._generate_hash(url, title)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT OR IGNORE INTO articles (hash, url, title) VALUES (?, ?, ?)",
                (hash_value, url, title)
            )
            conn.commit()
    
    def get_stats(self) -> dict:
        """Get deduplication statistics."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM articles")
            total = cursor.fetchone()[0]
            
            cursor = conn.execute("""
                SELECT COUNT(*) FROM articles 
                WHERE processed_at >= datetime('now', '-1 day')
            """)
            last_24h = cursor.fetchone()[0]
            
            return {
                "total_processed": total,
                "last_24h": last_24h
            }

# Global dedupe store instance
dedupe_store = DedupeStore()
