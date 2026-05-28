DEFAULT_MODELS = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "claude-3-5-sonnet",
    "claude-3-opus",
    "gemini-2-flash",
    "llama-3-70b",
]

TASKS: dict[str, str] = {
    "architecture": "Architektur",
    "debugging": "Debugging",
    "code-review": "Code-Review",
    "documentation": "Dokumentation",
    "testing": "Testing",
    "refactoring": "Refactoring",
    "planning": "Planung",
    "security": "Sicherheit",
    "onboarding": "Onboarding",
    "other": "Sonstiges",
}

PASSWORD_RULES = [
    {"id": "length", "label": "Mindestens 12 Zeichen"},
    {"id": "uppercase", "label": "Mindestens ein Großbuchstabe (A–Z)"},
    {"id": "lowercase", "label": "Mindestens ein Kleinbuchstabe (a–z)"},
    {"id": "digit", "label": "Mindestens eine Zahl (0–9)"},
]

USERNAME_RULES = [
    {"id": "length", "label": "3–64 Zeichen"},
    {"id": "charset", "label": "Nur Buchstaben, Zahlen, _ und -"},
]
