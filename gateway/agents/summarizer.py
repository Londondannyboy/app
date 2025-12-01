"""
Summarizer Agent - Background conversation compression

Runs when conversations get long (>30 messages).
Generates titles and summaries for dashboard display.
"""

from typing import List
from pydantic import BaseModel
from pydantic_ai import Agent

from utils.llm_config import MODELS


class ConversationSummary(BaseModel):
    """Structured summary of a conversation."""

    title: str  # Short title for dashboard (5-7 words)
    summary: str  # Compressed context for next conversation
    key_facts_mentioned: List[str]  # Facts referenced in conversation
    topics_discussed: List[str]  # Main topics covered


# Summarization agent
summarizer_agent = Agent(
    MODELS["summarizer"],
    output_type=ConversationSummary,
    system_prompt="""Summarize this conversation for future context.

Create:
1. A short title (5-7 words) describing the main topic
2. A concise summary preserving key context
3. List of facts the user mentioned (destinations, preferences, etc.)
4. Main topics discussed

Focus on information useful for continuing the conversation later.

EXAMPLES:
Title: "Cyprus visa questions and cost of living"
Summary: "User interested in Cyprus digital nomad visa. Discussed requirements,
cost of living in Limassol, and healthcare options. Has remote work, budget ~3k/month."
Key facts: ["destination: Cyprus", "budget: 3000/month", "work_type: remote"]
Topics: ["digital nomad visa", "cost of living", "healthcare"]
"""
)
