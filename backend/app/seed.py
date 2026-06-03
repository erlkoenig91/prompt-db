import asyncio
import logging

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import Prompt, PromptVisibility, User
from app.security import hash_password

logger = logging.getLogger(__name__)

SYSTEM_USERNAME = "prompt-db"

EXAMPLE_PROMPTS = [
    {
        "title": "Code review checklist",
        "description": "Structured review for pull requests and code changes.",
        "model": "gpt-4o",
        "task": "code-review",
        "tags": "example,standard,code-review",
        "content": """You are a senior developer performing a thorough code review.

Analyze the provided code against these criteria:
1. Correctness: logic errors, edge cases, error handling
2. Security: injection, unsafe defaults, missing validation
3. Maintainability: readability, naming, duplication, SOLID
4. Tests: coverage of critical paths, missing test cases
5. Performance: obvious bottlenecks or unnecessary allocations

Response format:
- Summary (2–3 sentences)
- Critical findings (must fix)
- Improvement suggestions (optional)
- Positive feedback (what works well)

Be precise, constructive, and reference specific locations in the code.""",
    },
    {
        "title": "Debugging assistant",
        "description": "Systematic analysis for bugs and unexpected behavior.",
        "model": "claude-3-5-sonnet",
        "task": "debugging",
        "tags": "example,standard,debugging",
        "content": """You help debug software problems.

Approach:
1. Understand the problem: expected vs. actual behavior
2. Reproduction: steps, environment, frequency
3. Hypotheses: 3–5 plausible causes, sorted by likelihood
4. Diagnosis: which logs, breakpoints, or tests would you add?
5. Fix proposal: minimal change with rationale
6. Prevention: how do we avoid regressions?

Respond with structured Markdown headings. If information is missing, ask at most 3 targeted follow-up questions.""",
    },
    {
        "title": "Architecture design",
        "description": "Template for technical concepts and architecture decisions.",
        "model": "gpt-4o",
        "task": "architecture",
        "tags": "example,standard,architecture",
        "content": """You are a software architect and produce a pragmatic architecture proposal.

Consider:
- Requirements and non-goals
- Constraints (team, budget, time, compliance)
- Scaling, availability, security
- Trade-offs instead of silver bullets

Deliver a document with:
1. Context & problem statement
2. Proposed solution (components, interfaces, data flow)
3. Alternatives (at least one) with pros/cons
4. Risks & open questions
5. Recommended next steps (PoC, spike, MVP)

Keep the proposal actionable and avoid over-engineering.""",
    },
]


async def seed_example_prompts() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.username == SYSTEM_USERNAME))
        owner = result.scalar_one_or_none()
        if owner is None:
            owner = User(
                username=SYSTEM_USERNAME,
                hashed_password=hash_password("disabled-system-account-no-login"),
                is_active=False,
            )
            session.add(owner)
            await session.flush()

        created = 0
        for example in EXAMPLE_PROMPTS:
            existing = await session.execute(
                select(Prompt).where(Prompt.title == example["title"], Prompt.owner_id == owner.id)
            )
            if existing.scalar_one_or_none():
                continue
            session.add(
                Prompt(
                    title=example["title"],
                    content=example["content"],
                    description=example["description"],
                    model=example["model"],
                    task=example["task"],
                    visibility=PromptVisibility.PUBLIC,
                    tags=example["tags"],
                    owner_id=owner.id,
                )
            )
            created += 1

        await session.commit()
        if created:
            logger.info("Created %s example prompt(s)", created)


def run_seed() -> None:
    asyncio.run(seed_example_prompts())


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_seed()
