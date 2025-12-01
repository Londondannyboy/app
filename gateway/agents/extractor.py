"""
Fact Extractor Agent - Background extraction

Runs in parallel with the main Talker agent.
Uses Claude Haiku for fast structured output (~400ms).
"""

from typing import Literal
from pydantic import BaseModel, Field
from pydantic_ai import Agent

from utils.llm_config import MODELS


class ExtractedFact(BaseModel):
    """Structured output for extracted facts."""

    fact_type: Literal[
        "destination", "origin", "family", "children", "profession",
        "employer", "work_type", "budget", "timeline", "visa_interest"
    ]
    value: str
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str  # Why this was extracted


# Background extraction agent
fact_extractor = Agent(
    MODELS["extractor"],
    output_type=ExtractedFact,
    system_prompt="""Extract user facts from conversation messages.

EXTRACTION RULES:
- Only extract explicitly stated facts, not implied
- Distinguish ORIGIN (where from) vs DESTINATION (where going)
- Include confidence based on clarity of statement

FACT TYPES:
- destination: Where they want to move TO
- origin: Where they're currently FROM
- family: Family status (single, married, partner)
- children: Number of children
- profession: Job title or field
- employer: Company name
- work_type: Remote, hybrid, on-site
- budget: Monthly budget or price range
- timeline: When they want to move
- visa_interest: Specific visa types mentioned

EXAMPLES:
"I'm from London" → origin: "London", confidence: 0.95
"I'm thinking about Cyprus" → destination: "Cyprus", confidence: 0.7
"I need to move by June" → timeline: "June", confidence: 0.85

Return the most significant fact from the message.
If no clear fact is present, return null.
"""
)
