"""
Text chat endpoints with Vercel AI Data Stream Protocol.

Supports streaming with tool calls, thinking, and fact extraction events.
"""

import json
from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, Request, Header
from fastapi.responses import StreamingResponse
from typing import Optional

from agents import quest_agent, QuestContext

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/completions")
async def chat_completions(
    request: Request,
    x_app_id: Optional[str] = Header(default="dashboard", alias="X-App-Id"),
    x_stack_user_id: Optional[str] = Header(default=None, alias="X-Stack-User-Id"),
):
    """
    Text chat endpoint using Vercel AI Data Stream Protocol.

    Streams events:
    - thinking: Agent reasoning
    - tool_call: Tool being invoked
    - tool_result: Tool response
    - text_delta: Response text (word by word)
    - fact_extracted: New fact extracted
    """
    body = await request.json()
    messages = body.get("messages", [])
    session_id = body.get("session_id", str(uuid4()))

    # Get latest user message
    user_message = None
    for msg in reversed(messages):
        if msg.get("role") == "user":
            user_message = msg.get("content", "")
            break

    if not user_message:
        return StreamingResponse(
            iter(['data: {"type": "error", "error": "No message"}\n\n']),
            media_type="text/event-stream"
        )

    # Build context with service references
    context = QuestContext(
        app_id=x_app_id,
        user_id=x_stack_user_id,
        session_id=session_id,
        # Services will be injected at runtime
    )

    async def generate_sse():
        """Generate Vercel AI-compatible SSE events."""
        try:
            # Immediate thinking feedback
            yield f'data: {json.dumps({"type": "thinking", "content": "Let me check on that..."})}\n\n'

            async with quest_agent.run_stream(user_message, deps=context) as result:
                async for event in result.stream_events():
                    if event.type == "tool_call":
                        yield f'data: {json.dumps({"type": "tool_call", "name": event.tool_name})}\n\n'

                    elif event.type == "tool_result":
                        yield f'data: {json.dumps({"type": "tool_result", "name": event.tool_name, "result": str(event.result)[:200]})}\n\n'

                    elif event.type == "text_delta":
                        yield f'data: {json.dumps({"type": "text_delta", "text": event.text})}\n\n'

            yield 'data: [DONE]\n\n'

        except Exception as e:
            yield f'data: {json.dumps({"type": "error", "error": str(e)})}\n\n'
            yield 'data: [DONE]\n\n'

    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
