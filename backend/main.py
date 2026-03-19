"""
main.py — FastAPI application entry point.

WHAT THIS FILE DOES:
    Creates the FastAPI app, mounts all routes, configures CORS
    (so the Next.js frontend can call this backend), and starts
    the uvicorn server.

WHY CORS MATTERS:
    Browsers block cross-origin requests by default.
    Your Next.js app runs on localhost:3000 (or Vercel).
    Your FastAPI runs on localhost:8000 (or Railway).
    CORS headers tell the browser "it's OK for this frontend to call me".

WHAT BREAKS WITHOUT IT:
    Every frontend API call fails with a CORS error in the browser console.

RUN COMMAND: uvicorn main:app --reload --port 8000
"""

import os
from dotenv import load_dotenv

# Load .env file BEFORE importing anything that reads env vars
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router

app = FastAPI(
    title="tnelections.info API",
    description="AI-powered voter intelligence for Tamil Nadu Elections 2026",
    version="1.0.0",
    docs_url="/docs",       # Swagger UI at http://localhost:8000/docs
    redoc_url="/redoc",     # ReDoc at http://localhost:8000/redoc
)

# ── CORS configuration ────────────────────────────────────────────────
# Allow requests from our frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",          # Local Next.js dev server
        "https://tnelections.info",       # Production domain
        "https://www.tnelections.info",
        "https://*.vercel.app",           # Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount all API routes under /api prefix ────────────────────────────
app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    return {
        "message": "tnelections.info API is running",
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )
