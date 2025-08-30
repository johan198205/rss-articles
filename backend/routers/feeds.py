"""Feed management router."""
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
import pandas as pd
import io
from typing import List

from core.models import FeedRule
from core.config_store import config_store

router = APIRouter(prefix="/api/feeds", tags=["feeds"])

@router.get("/", response_model=List[FeedRule])
async def get_feeds():
    """Get all feed rules."""
    try:
        config = config_store.load()
        return config.feeds
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load feeds: {str(e)}")

@router.post("/upload")
async def upload_feeds_excel(file: UploadFile = File(...)):
    """Upload Excel file with feed rules."""
    try:
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="File must be Excel format (.xlsx or .xls)")
        
        # Read Excel file
        content = await file.read()
        df = pd.read_excel(io.BytesIO(content))
        
        # Validate required columns
        required_columns = ['feed_url', 'label', 'topic_default']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {missing_columns}"
            )
        
        # Convert to FeedRule objects
        feeds = []
        for _, row in df.iterrows():
            try:
                # Parse comma-separated lists
                include_any = _parse_list_field(row.get('include_any', ''))
                include_all = _parse_list_field(row.get('include_all', ''))
                exclude_any = _parse_list_field(row.get('exclude_any', ''))
                
                feed = FeedRule(
                    feed_url=str(row['feed_url']),
                    label=str(row['label']),
                    topic_default=str(row['topic_default']),
                    include_any=include_any,
                    include_all=include_all,
                    exclude_any=exclude_any,
                    min_words=int(row.get('min_words', 200)),
                    max_age_days=int(row.get('max_age_days', 10)),
                    language=str(row.get('language', '')),
                    source_weight=float(row.get('source_weight', 1.0)),
                    enabled=bool(row.get('enabled', True))
                )
                feeds.append(feed)
            except Exception as e:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Error parsing row {len(feeds) + 1}: {str(e)}"
                )
        
        # Update configuration
        config_store.update_feeds(feeds)
        
        return {
            "message": f"Successfully uploaded {len(feeds)} feed rules",
            "count": len(feeds)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process Excel file: {str(e)}")

@router.get("/export")
async def export_feeds_excel():
    """Export feed rules to Excel file."""
    try:
        config = config_store.load()
        
        # Convert feeds to DataFrame
        data = []
        for feed in config.feeds:
            data.append({
                'feed_url': feed.feed_url,
                'label': feed.label,
                'topic_default': feed.topic_default,
                'include_any': ','.join(feed.include_any),
                'include_all': ','.join(feed.include_all),
                'exclude_any': ','.join(feed.exclude_any),
                'min_words': feed.min_words,
                'max_age_days': feed.max_age_days,
                'language': feed.language,
                'source_weight': feed.source_weight,
                'enabled': feed.enabled
            })
        
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Feeds')
        
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=feeds.xlsx"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export feeds: {str(e)}")

@router.post("/validate")
async def validate_feeds():
    """Validate all feed rules."""
    try:
        config = config_store.load()
        results = []
        
        for i, feed in enumerate(config.feeds):
            errors = []
            
            # Validate required fields
            if not feed.feed_url:
                errors.append("feed_url is required")
            if not feed.label:
                errors.append("label is required")
            if not feed.topic_default:
                errors.append("topic_default is required")
            
            # Validate topic_default
            valid_topics = ["SEO & AI visibility", "Webbanalys & AI", "Generativ AI"]
            if feed.topic_default not in valid_topics:
                errors.append(f"topic_default must be one of: {valid_topics}")
            
            # Validate numeric fields
            if feed.min_words < 0:
                errors.append("min_words must be non-negative")
            if feed.max_age_days < 0:
                errors.append("max_age_days must be non-negative")
            if not (0.0 <= feed.source_weight <= 2.0):
                errors.append("source_weight must be between 0.0 and 2.0")
            
            results.append({
                "index": i,
                "label": feed.label,
                "feed_url": feed.feed_url,
                "valid": len(errors) == 0,
                "errors": errors
            })
        
        valid_count = sum(1 for r in results if r["valid"])
        
        return {
            "total": len(results),
            "valid": valid_count,
            "invalid": len(results) - valid_count,
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate feeds: {str(e)}")

def _parse_list_field(value) -> List[str]:
    """Parse comma-separated string to list, handling empty values."""
    if pd.isna(value) or value == '':
        return []
    return [item.strip() for item in str(value).split(',') if item.strip()]
