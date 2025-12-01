"""
Quest App Gateway - FastAPI + Pydantic AI

Stack:
  FastAPI → HTTP layer (routes, SSE, auth)
      ↓
  Pydantic AI → Intelligence layer (agents, tools, structured output)
      ↓
  Temporal.io → Durable workflows (multi-day async processes)
"""

import os
from contextlib import asynccontextmanager

import logfire
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# Initialize Logfire for observability
if os.getenv("LOGFIRE_TOKEN"):
    logfire.configure(
        service_name="quest-app-gateway",
        send_to_logfire=True,
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management."""
    # Startup
    print("🚀 Quest App Gateway starting...")
    yield
    # Shutdown
    print("👋 Quest App Gateway shutting down...")


app = FastAPI(
    title="Quest App Gateway",
    description="AI-powered relocation assistant API",
    version="0.1.0",
    lifespan=lifespan,
)

# Instrument FastAPI with Logfire
if os.getenv("LOGFIRE_TOKEN"):
    logfire.instrument_fastapi(app)

# CORS for Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from routers import health, voice, chat, dashboard, user_profile

app.include_router(health.router)
app.include_router(voice.router)
app.include_router(chat.router)
app.include_router(dashboard.router)
app.include_router(user_profile.router)


@app.get("/")
async def root():
    return {
        "service": "Quest App Gateway",
        "status": "healthy",
        "version": "0.1.0",
    }
