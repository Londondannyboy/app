"""User profile endpoints for facts CRUD."""

from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/user/profile", tags=["user_profile"])


class Fact(BaseModel):
    id: str
    fact_type: str
    fact_value: str
    confidence: float
    source: str
    created_at: datetime
    is_superseded: bool = False


class FactCreate(BaseModel):
    fact_type: str
    fact_value: str
    confidence: float = 1.0
    source: str = "user_edit"


class FactUpdate(BaseModel):
    fact_value: Optional[str] = None
    confidence: Optional[float] = None
    is_verified: Optional[bool] = None


@router.get("/facts")
async def get_facts(
    x_stack_user_id: str = Header(..., alias="X-Stack-User-Id"),
) -> dict:
    """Get all active facts for user."""
    # TODO: Query Neon database
    return {"facts": [], "user_id": x_stack_user_id}


@router.post("/facts")
async def create_fact(
    fact: FactCreate,
    x_stack_user_id: str = Header(..., alias="X-Stack-User-Id"),
):
    """Create a new fact (user-initiated)."""
    # TODO: Insert into Neon, sync to Zep
    return {"id": "new-id", "status": "created"}


@router.patch("/facts/{fact_id}")
async def update_fact(
    fact_id: str,
    update: FactUpdate,
    x_stack_user_id: str = Header(..., alias="X-Stack-User-Id"),
):
    """Update an existing fact."""
    # TODO: Update in Neon, sync to Zep
    return {"id": fact_id, "status": "updated"}


@router.delete("/facts/{fact_id}")
async def delete_fact(
    fact_id: str,
    x_stack_user_id: str = Header(..., alias="X-Stack-User-Id"),
):
    """Delete (supersede) a fact."""
    # TODO: Mark as superseded in Neon
    return {"id": fact_id, "status": "deleted"}


@router.post("/facts/{fact_id}/verify")
async def verify_fact(
    fact_id: str,
    x_stack_user_id: str = Header(..., alias="X-Stack-User-Id"),
):
    """User confirms an AI-extracted fact."""
    # TODO: Update source to user_verified, confidence to 1.0
    return {"id": fact_id, "status": "verified"}
