"""
FastAPI application entry point.

@description Main application factory with CORS, routes, static files, and startup events
@author Developer
@date 24-03-2026
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine
from .models import User, Task, Attachment # Ensure models are loaded for Base.metadata
from .routers import auth, tasks, attachments


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    Base.metadata.create_all(bind=engine)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield


app = FastAPI(
    title="Task Management API",
    description="A modern task management platform API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Angular dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "http://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register routers
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(attachments.router)


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "message": "Task Management API is running"}
