"""
LLM Configuration for Pydantic AI Gateway

Supports:
- Pydantic AI Gateway (gateway.pydantic.dev) for unified access
- Direct provider fallback (anthropic, google, openai)

Set PYDANTIC_AI_GATEWAY_API_KEY to enable gateway mode.
Get your key at: https://gateway.pydantic.dev
"""

import os

# Official env var name from Pydantic AI docs
PYDANTIC_AI_GATEWAY_API_KEY = os.getenv("PYDANTIC_AI_GATEWAY_API_KEY")


def get_model(provider: str = "anthropic", model: str = "claude-sonnet-4") -> str:
    """
    Return model string, prefixed with gateway if configured.

    Args:
        provider: LLM provider (anthropic, google, openai, groq, bedrock)
        model: Model name

    Examples:
        get_model("anthropic", "claude-sonnet-4")
        → "gateway/anthropic:claude-sonnet-4" (if gateway configured)
        → "anthropic:claude-sonnet-4" (fallback)

        get_model("google", "gemini-2.0-flash")
        → "gateway/google:gemini-2.0-flash" (if gateway configured)
    """
    if PYDANTIC_AI_GATEWAY_API_KEY:
        return f"gateway/{provider}:{model}"
    return f"{provider}:{model}"


# Model presets for different use cases
MODELS = {
    # Fast responses for user-facing chat
    "talker": get_model("google", "gemini-2.0-flash"),

    # Structured extraction (runs in background)
    "extractor": get_model("anthropic", "claude-3.5-haiku"),

    # Complex reasoning for conflict resolution
    "reasoning": get_model("anthropic", "claude-sonnet-4"),

    # Summarization
    "summarizer": get_model("anthropic", "claude-3.5-haiku"),
}
