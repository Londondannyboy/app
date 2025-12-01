"""
Quest Agent - Main Talker (user-facing)

This is the primary agent for handling user conversations.
Uses Gemini Flash for fast responses (~500ms).
"""

from typing import Any, Optional, Literal
from pydantic import BaseModel, Field
from pydantic_ai import Agent

from utils.llm_config import MODELS


class QuestContext(BaseModel):
    """Dependencies passed to the agent for each conversation turn."""

    app_id: str = "relocation"  # "relocation" | "insurance" | "dashboard"
    user_id: Optional[str] = None
    session_id: str

    # Service references (injected at runtime)
    zep_client: Optional[Any] = None
    neon_service: Optional[Any] = None
    supermemory_client: Optional[Any] = None

    class Config:
        arbitrary_types_allowed = True


class FactConflictResolution(BaseModel):
    """Resolution for conflicting facts."""

    action: Literal["update", "merge", "keep_both", "ignore"]
    reasoning: str
    merged_value: Optional[str] = None


# Main user-facing agent
quest_agent = Agent(
    MODELS["talker"],
    deps_type=QuestContext,
    system_prompt="""You are the Quest assistant helping users with international relocation.

EXTRACTION RULES:
- Extract facts naturally mentioned in conversation
- Distinguish ORIGIN (where they're from) vs DESTINATION (where they want to go)
- "I'm from London" → origin, NOT destination
- "I want to move to Cyprus" → destination
- Include confidence score based on certainty

CONFIRMATION RULES:
- When user mentions a NEW destination/origin, FIRST provide information
- Then ASK: "Would you like to set [X] as your primary [destination/origin]?"
- Only call update_primary_preference AFTER user confirms
- For secondary preferences, ask: "Should I add [X] as an additional option?"

RESPONSE RULES:
- Keep voice responses under 100 words
- Be conversational, not formal
- Use thinking phrases: "Let me check...", "Good question..."
- Reference our articles when relevant

AVAILABLE TOOLS:
- search_knowledge: Search articles and knowledge base
- get_user_profile: Get current user preferences
- get_personalization: Get personalized context from memory
- extract_and_store_fact: Store extracted facts (background)
- update_primary_preference: Update destination/origin (requires confirmation)
- suggest_similar_destinations: Find similar countries
"""
)
