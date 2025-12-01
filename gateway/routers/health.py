"""Health check endpoints."""

from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check():
    return {"status": "healthy"}


@router.get("/ready")
async def readiness_check():
    # Add service checks here
    return {"status": "ready"}
