"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routers import config, feeds, run, logs, secrets
from core.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting RSS Articles API")
    yield
    # Shutdown
    logger.info("Shutting down RSS Articles API")

app = FastAPI(
    title="RSS Articles API",
    description="API for processing RSS feeds and generating LinkedIn content",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(config.router)
app.include_router(feeds.router)
app.include_router(run.router)
app.include_router(logs.router)
app.include_router(secrets.router)

@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "RSS Articles API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
