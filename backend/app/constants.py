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
    "architecture": "Architecture",
    "debugging": "Debugging",
    "code-review": "Code review",
    "documentation": "Documentation",
    "testing": "Testing",
    "refactoring": "Refactoring",
    "planning": "Planning",
    "security": "Security",
    "onboarding": "Onboarding",
    "other": "Other",
}

PASSWORD_RULES = [
    {"id": "length", "label": "At least 12 characters"},
    {"id": "uppercase", "label": "At least one uppercase letter (A–Z)"},
    {"id": "lowercase", "label": "At least one lowercase letter (a–z)"},
    {"id": "digit", "label": "At least one digit (0–9)"},
]

USERNAME_RULES = [
    {"id": "length", "label": "3–64 characters"},
    {"id": "charset", "label": "Letters, digits, _ and - only"},
]
