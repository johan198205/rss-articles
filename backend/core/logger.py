"""Logging configuration using loguru."""
import os
import sys
from loguru import logger

def setup_logger():
    """Set up loguru logger with rotation to /logs/run.log."""
    # Remove default handler
    logger.remove()
    
    # Ensure logs directory exists
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    logs_dir = os.path.join(project_root, "logs")
    os.makedirs(logs_dir, exist_ok=True)
    
    log_file = os.path.join(logs_dir, "run.log")
    
    # Add file handler with rotation
    logger.add(
        log_file,
        rotation="10 MB",
        retention="7 days",
        compression="zip",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}",
        level="INFO"
    )
    
    # Add console handler for development
    logger.add(
        sys.stdout,
        format="<green>{time:HH:mm:ss}</green> | <level>{level}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | <level>{message}</level>",
        level="INFO"
    )
    
    return logger

# Initialize logger
setup_logger()

