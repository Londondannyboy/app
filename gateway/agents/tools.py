"""
Agent Tools - Connect agents to external services

Tools for:
- Zep knowledge graph search
- Neon user profile CRUD
- SuperMemory personalization
- Fact extraction and storage
"""

from typing import Optional, Literal
from pydantic import BaseModel, Field
from pydantic_ai import RunContext

from .quest_agent import quest_agent, QuestContext, FactConflictResolution
from .extractor import ExtractedFact
from utils.llm_config import get_model


@quest_agent.tool
async def search_knowledge(ctx: RunContext[QuestContext], query: str) -> str:
    """Search Zep knowledge graph for relocation information."""
    if not ctx.deps.zep_client:
        return "Knowledge base unavailable"

    graph_id = f"{ctx.deps.app_id}_knowledge"  # e.g., "relocation_knowledge"

    try:
        results = await ctx.deps.zep_client.graph.search(
            graph_id=graph_id,
            query=query,
            limit=5
        )

        if not results:
            return f"No information found about: {query}"

        formatted = []
        for r in results:
            formatted.append(f"- {r.content} (source: {r.metadata.get('source', 'unknown')})")

        return f"Found {len(results)} results:\n" + "\n".join(formatted)
    except Exception as e:
        return f"Search error: {str(e)}"


@quest_agent.tool
async def get_user_profile(ctx: RunContext[QuestContext]) -> str:
    """Get current user profile facts from Neon."""
    if not ctx.deps.user_id or not ctx.deps.neon_service:
        return "No user profile available (anonymous session)"

    try:
        facts = await ctx.deps.neon_service.get_facts(ctx.deps.user_id)

        if not facts:
            return "No profile information yet"

        by_type = {}
        for f in facts:
            by_type.setdefault(f.fact_type, []).append(f.fact_value)

        formatted = []
        for fact_type, values in by_type.items():
            formatted.append(f"{fact_type}: {', '.join(str(v) for v in values)}")

        return "User profile:\n" + "\n".join(formatted)
    except Exception as e:
        return f"Profile error: {str(e)}"


@quest_agent.tool
async def get_personalization(ctx: RunContext[QuestContext], query: str) -> str:
    """Get personalized context from SuperMemory."""
    if not ctx.deps.user_id or not ctx.deps.supermemory_client:
        return "No personalization available"

    try:
        context = await ctx.deps.supermemory_client.get_personalized_context(
            user_id=ctx.deps.user_id,
            query=query
        )
        return context or "No relevant personalization found"
    except Exception as e:
        return f"Personalization error: {str(e)}"


@quest_agent.tool(require_approval=True)
async def update_primary_preference(
    ctx: RunContext[QuestContext],
    preference_type: Literal["destination", "origin"],
    new_value: str,
    previous_value: Optional[str] = None
) -> str:
    """
    Update a primary preference (destination/origin).

    Requires user approval via voice/text confirmation.
    AI should ask: "Would you like to set {new_value} as your primary {preference_type}?"
    """
    if not ctx.deps.user_id:
        return "Cannot update preferences for anonymous users"

    try:
        # Mark previous as superseded
        if previous_value:
            existing = await ctx.deps.neon_service.get_active_fact(
                ctx.deps.user_id, preference_type
            )
            if existing:
                await ctx.deps.neon_service.mark_superseded(existing.id)

        # Create new active fact
        new_fact = await ctx.deps.neon_service.create_fact(
            user_id=ctx.deps.user_id,
            fact_type=preference_type,
            value=new_value,
            confidence=1.0,  # User-confirmed = 100%
            source="user_verified",
        )

        return f"Updated {preference_type} to {new_value}" + (
            f" (previously: {previous_value})" if previous_value else ""
        )
    except Exception as e:
        return f"Update error: {str(e)}"


@quest_agent.tool
async def extract_and_store_fact(
    ctx: RunContext[QuestContext],
    fact: ExtractedFact
) -> str:
    """Extract and store a user fact, handling conflicts intelligently."""
    if not ctx.deps.user_id or not ctx.deps.neon_service:
        return "Cannot store facts for anonymous users"

    try:
        # Check for existing fact of same type
        existing = await ctx.deps.neon_service.get_fact_by_type(
            ctx.deps.user_id,
            fact.fact_type
        )

        if existing:
            # Use LLM to resolve conflict
            resolution = await resolve_fact_conflict(
                existing_value=existing.fact_value,
                new_value=fact.value,
                context=fact.reasoning
            )

            if resolution.action == "update":
                await ctx.deps.neon_service.update_fact(
                    fact_id=existing.id,
                    value=fact.value,
                    confidence=fact.confidence,
                    source="voice_llm"
                )
                return f"Updated {fact.fact_type}: {existing.fact_value} → {fact.value}"

            elif resolution.action == "merge":
                await ctx.deps.neon_service.update_fact(
                    fact_id=existing.id,
                    value=resolution.merged_value,
                    confidence=fact.confidence,
                    source="voice_llm"
                )
                return f"Merged {fact.fact_type}: {resolution.merged_value}"

            elif resolution.action == "keep_both":
                await ctx.deps.neon_service.create_fact(
                    user_id=ctx.deps.user_id,
                    fact_type=fact.fact_type,
                    value=fact.value,
                    confidence=fact.confidence,
                    source="voice_llm"
                )
                return f"Added additional {fact.fact_type}: {fact.value}"

            else:  # ignore
                return f"Kept existing {fact.fact_type}: {existing.fact_value}"

        else:
            # Create new fact
            await ctx.deps.neon_service.create_fact(
                user_id=ctx.deps.user_id,
                fact_type=fact.fact_type,
                value=fact.value,
                confidence=fact.confidence,
                source="voice_llm"
            )
            return f"Stored new {fact.fact_type}: {fact.value}"

    except Exception as e:
        return f"Storage error: {str(e)}"


@quest_agent.tool
async def suggest_similar_destinations(
    ctx: RunContext[QuestContext],
    destination: str
) -> str:
    """Find destinations similar to user's interest."""
    if not ctx.deps.zep_client:
        return "Similarity search unavailable"

    try:
        similar = await ctx.deps.zep_client.graph.search(
            graph_id="destinations",
            query=f"countries similar to {destination} for relocation visa digital nomad",
            limit=3
        )

        if not similar:
            return f"No similar destinations found for {destination}"

        suggestions = []
        for dest in similar:
            if dest.name != destination:
                suggestions.append(f"- {dest.name}: {dest.metadata.get('reason', 'similar profile')}")

        return f"Similar to {destination}:\n" + "\n".join(suggestions)
    except Exception as e:
        return f"Similarity error: {str(e)}"


async def resolve_fact_conflict(
    existing_value: str,
    new_value: str,
    context: str
) -> FactConflictResolution:
    """Use LLM to decide how to handle conflicting facts."""
    from pydantic_ai import Agent

    resolver = Agent(
        get_model("anthropic", "claude-sonnet-4"),
        output_type=FactConflictResolution,
        system_prompt="""Decide how to handle a fact conflict:

- UPDATE: New value replaces old (user changed their mind)
- MERGE: Combine values (e.g., multiple destinations)
- KEEP_BOTH: Both are valid (e.g., primary and secondary preferences)
- IGNORE: New value is noise or repetition

Consider the context to understand user intent."""
    )

    result = await resolver.run(
        f"Existing: {existing_value}\nNew: {new_value}\nContext: {context}"
    )
    return result.data
