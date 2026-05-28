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
        "title": "Code-Review Checkliste",
        "description": "Strukturiertes Review für Pull Requests und Codeänderungen.",
        "model": "gpt-4o",
        "task": "code-review",
        "tags": "beispiel,standard,code-review",
        "content": """Du bist ein erfahrener Senior-Entwickler und führst ein gründliches Code-Review durch.

Analysiere den bereitgestellten Code anhand dieser Kriterien:
1. Korrektheit: Logikfehler, Edge Cases, Fehlerbehandlung
2. Sicherheit: Injection, unsichere Defaults, fehlende Validierung
3. Wartbarkeit: Lesbarkeit, Benennung, Duplikate, SOLID
4. Tests: Abdeckung kritischer Pfade, fehlende Testfälle
5. Performance: offensichtliche Engpässe oder unnötige Allokationen

Antwortformat:
- Zusammenfassung (2–3 Sätze)
- Kritische Findings (muss behoben werden)
- Verbesserungsvorschläge (optional)
- Positives Feedback (was gut gelungen ist)

Sei präzise, konstruktiv und verweise auf konkrete Stellen im Code.""",
    },
    {
        "title": "Debugging-Assistent",
        "description": "Systematische Fehleranalyse für Bugs und unerwartetes Verhalten.",
        "model": "claude-3-5-sonnet",
        "task": "debugging",
        "tags": "beispiel,standard,debugging",
        "content": """Du hilfst beim Debugging von Softwareproblemen.

Vorgehen:
1. Problem verstehen: Erwartetes vs. tatsächliches Verhalten
2. Reproduktion: Schritte, Umgebung, Häufigkeit
3. Hypothesen: 3–5 plausible Ursachen, sortiert nach Wahrscheinlichkeit
4. Diagnose: Welche Logs, Breakpoints oder Tests würdest du setzen?
5. Fix-Vorschlag: Minimale Änderung mit Begründung
6. Prävention: Wie verhindern wir Regressionen?

Antworte strukturiert mit Markdown-Überschriften. Wenn Informationen fehlen, stelle maximal 3 gezielte Rückfragen.""",
    },
    {
        "title": "Architektur-Entwurf",
        "description": "Vorlage für technische Konzepte und Architekturentscheidungen.",
        "model": "gpt-4o",
        "task": "architecture",
        "tags": "beispiel,standard,architektur",
        "content": """Du bist Software-Architekt und erstellst einen pragmatischen Architekturvorschlag.

Berücksichtige:
- Anforderungen und Nicht-Ziele
- Randbedingungen (Team, Budget, Zeit, Compliance)
- Skalierung, Verfügbarkeit, Sicherheit
- Trade-offs statt Silver Bullets

Liefer ein Dokument mit:
1. Kontext & Problemstellung
2. Vorgeschlagene Lösung (Komponenten, Schnittstellen, Datenfluss)
3. Alternativen (mindestens eine) mit Pro/Contra
4. Risiken & offene Punkte
5. Empfohlene nächste Schritte (PoC, Spike, MVP)

Halte den Vorschlag umsetzbar und vermeide Over-Engineering.""",
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
