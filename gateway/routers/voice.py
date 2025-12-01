"""Voice endpoints for Hume EVI integration."""

import os
from datetime import datetime
from uuid import uuid4
import json

from fastapi import APIRouter, Request, Header
from fastapi.responses import StreamingResponse
import httpx

from agents import quest_agent, QuestContext

router = APIRouter(prefix="/voice", tags=["voice"])

HUME_API_KEY = os.getenv("HUME_API_KEY")
HUME_SECRET_KEY = os.getenv("HUME_SECRET_KEY")


@router.get("/access-token")
async def get_access_token():
    """Get Hume access token for frontend."""
    if not HUME_API_KEY or not HUME_SECRET_KEY:
        return {"error": "Hume credentials not configured"}

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.hume.ai/oauth2-cc/token",
            auth=(HUME_API_KEY, HUME_SECRET_KEY),
            data={"grant_type": "client_credentials"},
        )
        data = response.json()
        return {"accessToken": data.get("access_token")}


@router.post("/chat/completions")
async def voice_chat_completions(
    request: Request,
    custom_session_id: str = None,
    x_stack_user_id: str = Header(default=None, alias="X-Stack-User-Id"),
):
    """
    Voice endpoint for Hume EVI - returns OpenAI-compatible SSE format.

    Hume sends messages in OpenAI format, we process with Pydantic AI agent
    and return OpenAI-compatible SSE for Hume to speak.
    """
    body = await request.json()

    # Extract user message from Hume format
    messages = body.get("messages", [])
    user_message = None
    for msg in reversed(messages):
        if msg.get("role") == "user":
            content = msg.get("content", "")
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        user_message = block.get("text", "")
                        break
            else:
                user_message = content
            break

    if not user_message:
        return StreamingResponse(
            iter(['data: {"error": "No message"}\n\n']),
            media_type="text/event-stream"
        )

    # Build context
    user_id = custom_session_id or x_stack_user_id or "anonymous"
    context = QuestContext(
        app_id="relocation",
        user_id=user_id if user_id != "anonymous" else None,
        session_id=custom_session_id or str(uuid4()),
        # Services will be injected at runtime
    )

    async def generate_sse():
        """Generate SSE events in OpenAI format for Hume."""
        try:
            async with quest_agent.run_stream(user_message, deps=context) as result:
                chunk_id = f"chatcmpl-{int(datetime.utcnow().timestamp())}"

                async for event in result.stream_events():
                    if event.type == "text_delta":
                        chunk = {
                            "id": chunk_id,
                            "object": "chat.completion.chunk",
                            "created": int(datetime.utcnow().timestamp()),
                            "model": "quest-agent",
                            "choices": [{
                                "index": 0,
                                "delta": {"content": event.text},
                                "finish_reason": None
                            }]
                        }
                        yield f"data: {json.dumps(chunk)}\n\n"

                # Final chunk
                final_chunk = {
                    "id": chunk_id,
                    "object": "chat.completion.chunk",
                    "created": int(datetime.utcnow().timestamp()),
                    "model": "quest-agent",
                    "choices": [{
                        "index": 0,
                        "delta": {},
                        "finish_reason": "stop"
                    }]
                }
                yield f"data: {json.dumps(final_chunk)}\n\n"
                yield "data: [DONE]\n\n"

        except Exception as e:
            error_chunk = {
                "id": "error",
                "object": "chat.completion.chunk",
                "choices": [{
                    "index": 0,
                    "delta": {"content": f"Error: {str(e)}"},
                    "finish_reason": "stop"
                }]
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream"
    )
