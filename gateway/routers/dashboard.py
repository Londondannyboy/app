"""Dashboard endpoints for SSE events and profile aggregation."""

import asyncio
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Header
from sse_starlette.sse import EventSourceResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/events")
async def stream_dashboard_events(
    user_id: str,
    x_stack_user_id: Optional[str] = Header(default=None, alias="X-Stack-User-Id"),
):
    """
    SSE stream of dashboard events.

    Events:
    - fact_extracted: New fact extracted from conversation
    - fact_updated: Existing fact updated
    - profile_synced: Profile synced to Zep
    - activity: General activity events
    """
    effective_user_id = x_stack_user_id or user_id

    async def event_generator():
        # In production, use Redis PubSub or similar
        # For now, we'll use a simple heartbeat
        while True:
            # Heartbeat to keep connection alive
            yield {
                "event": "heartbeat",
                "data": datetime.utcnow().isoformat(),
            }
            await asyncio.sleep(30)

    return EventSourceResponse(event_generator())


@router.get("/profile/live")
async def get_live_profile(
    x_stack_user_id: str = Header(..., alias="X-Stack-User-Id"),
):
    """Get complete profile with Zep entities for dashboard display."""
    # TODO: Aggregate from Neon + Zep + SuperMemory
    return {
        "profile": {},
        "entities": [],
        "memories": [],
        "last_updated": datetime.utcnow().isoformat(),
    }
