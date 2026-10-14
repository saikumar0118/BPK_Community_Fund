# ==============================================================================
# PBK COMMUNITY WELFARE FUND - BACKEND API ENTRYPOINT
# File: BackEnd/main.py
# Purpose: FastAPI application instantiation, CORS middleware configuration,
#          global route registration, and root health check endpoints.
# ==============================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import main API router containing all module routes
from routes import router
from database import engine, Base
import models

# Automatically create database tables if they do not exist
Base.metadata.create_all(bind=engine)

# ------------------------------------------------------------------------------
# 1. APPLICATION INITIALIZATION
# ------------------------------------------------------------------------------
app = FastAPI(
    title="PBK Community Fund API",
    description="Backend API for PBK Community Fund management portal",
    version="1.0.0"
)

# ------------------------------------------------------------------------------
# 2. CORS MIDDLEWARE (Cross-Origin Resource Sharing)
# Enables secure communication between Frontend (Member/Admin portals) and Backend API
# ------------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# 3. ROUTER REGISTRATION
# Registers all API endpoints under the '/api' prefix (Auth, Members, Funds, Receipts, etc.)
# ------------------------------------------------------------------------------
app.include_router(router)

# ------------------------------------------------------------------------------
# 4. ROOT & HEALTH CHECK ENDPOINTS
# Used for server liveness monitoring and connection diagnostics
# ------------------------------------------------------------------------------
@app.get("/")
def home():
    """Root endpoint to confirm backend service is running."""
    return {
        "message": "PBK Community Fund Backend is running"
    }


@app.get("/health")
def health_check():
    """Health check endpoint for automated uptime monitoring."""
    return {
        "status": "OK"
    }


