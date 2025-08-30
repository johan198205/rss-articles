"""Pipeline execution router."""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import time
from datetime import datetime
from loguru import logger

from core.models import RunResponse, RunItem
from core.config_store import config_store
from core.store import dedupe_store
from services.collector import RSSCollector
from services.filters import ArticleFilters
from services.scoring import LLMScorer
from services.writers import ContentWriters
from services.notion_write import NotionWriter
from core.status import pipeline_status

router = APIRouter(prefix="/api/run", tags=["run"])

@router.post("/", response_model=RunResponse)
async def run_pipeline(
    dry_run: bool = Query(True, description="If true, don't write to Notion"),
    limit: Optional[int] = Query(None, description="Limit number of articles to process"),
    feeds: Optional[List[str]] = Query(None, description="Specific feed URLs to process")
):
    """Run the RSS processing pipeline."""
    start_time = time.time()
    
    try:
        # Load configuration
        config = config_store.load()
        
        # Filter feeds if specified
        active_feeds = config.feeds
        if feeds:
            active_feeds = [f for f in active_feeds if f.feed_url in feeds]
        
        if not active_feeds:
            raise HTTPException(status_code=400, detail="No active feeds found")
        
        logger.info(f"Starting pipeline run (dry_run={dry_run}, limit={limit}, feeds={len(active_feeds)})")
        
        # Start status tracking
        pipeline_status.start(len(active_feeds), dry_run, limit)
        
        # Initialize services
        pipeline_status.update_stage("initializing", "Initialiserar tjänster...")
        collector = RSSCollector()
        filters = ArticleFilters()
        scorer = LLMScorer()
        writers = ContentWriters()
        notion_writer = NotionWriter()
        
        # Collect articles
        pipeline_status.update_stage("collecting", "Samlar artiklar från RSS-feeds...")
        all_articles = []
        processed_feeds = 0
        for feed_rule in active_feeds:
            if not feed_rule.enabled:
                continue
            
            processed_feeds += 1
            pipeline_status.update_feed_progress(feed_rule.label, processed_feeds, len(all_articles))
            
            articles = collector.collect_from_feed(feed_rule)
            all_articles.extend(articles)
        
        logger.info(f"Collected {len(all_articles)} articles total")
        
        # Apply limit if specified
        if limit and limit > 0:
            all_articles = all_articles[:limit]
        
        # Process articles
        pipeline_status.update_stage("processing", f"Bearbetar {len(all_articles)} artiklar...")
        
        run_items = []
        kept_count = 0
        skipped_count = 0
        filtered_count = 0
        processed_articles = 0
        
        for article in all_articles:
            processed_articles += 1
            
            # Update progress every 5 articles or for the last article
            if processed_articles % 5 == 0 or processed_articles == len(all_articles):
                pipeline_status.update_article_progress(
                    article.title, processed_articles, kept_count, skipped_count, filtered_count
                )
            
            try:
                # Check for duplicates
                if dedupe_store.is_duplicate(article.url, article.title):
                    run_items.append(RunItem(
                        article=article,
                        status="skipped",
                        reason="Duplicate article"
                    ))
                    skipped_count += 1
                    continue
                
                # Apply hard filters
                allowed, filter_reason = filters.apply_filters(article, 
                    next(f for f in active_feeds if f.label == article.source_label))
                
                if not allowed:
                    run_items.append(RunItem(
                        article=article,
                        status="filtered",
                        reason=filter_reason
                    ))
                    filtered_count += 1
                    continue
                
                # Score with LLM
                score_result = scorer.score_article(article, 
                    next(f for f in active_feeds if f.label == article.source_label), config)
                
                if not score_result:
                    run_items.append(RunItem(
                        article=article,
                        status="skipped",
                        reason="LLM scoring failed"
                    ))
                    skipped_count += 1
                    continue
                
                # Generate content if keeping
                linkedin_article = None
                personal_post = None
                
                if score_result.keep:
                    linkedin_article = writers.write_linkedin_article(article, config)
                    personal_post = writers.write_personal_post(article, config)
                    
                    # Write to Notion if not dry run
                    if not dry_run and linkedin_article and personal_post:
                        success = notion_writer.write_article(
                            article, score_result, linkedin_article, personal_post
                        )
                        if success:
                            dedupe_store.mark_processed(article.url, article.title)
                        else:
                            logger.error(f"Failed to write {article.title} to Notion")
                
                # Create run item
                run_item = RunItem(
                    article=article,
                    score_result=score_result,
                    linkedin_article=linkedin_article,
                    personal_post=personal_post,
                    status="kept" if score_result.keep else "skipped",
                    reason=score_result.reason_short
                )
                
                run_items.append(run_item)
                
                if score_result.keep:
                    kept_count += 1
                else:
                    skipped_count += 1
                
            except Exception as e:
                logger.error(f"Error processing article {article.title}: {e}")
                run_items.append(RunItem(
                    article=article,
                    status="skipped",
                    reason=f"Processing error: {str(e)}"
                ))
                skipped_count += 1
        
        duration = time.time() - start_time
        
        logger.info(f"Pipeline completed: {kept_count} kept, {skipped_count} skipped, {filtered_count} filtered in {duration:.2f}s")
        
        # Mark as completed
        pipeline_status.complete(kept_count, skipped_count, filtered_count, duration)
        
        return RunResponse(
            kept_count=kept_count,
            skipped_count=skipped_count,
            filtered_count=filtered_count,
            duration_seconds=duration,
            items=run_items,
            dry_run=dry_run
        )
        
    except Exception as e:
        logger.error(f"Pipeline run failed: {e}")
        raise HTTPException(status_code=500, detail=f"Pipeline run failed: {str(e)}")
