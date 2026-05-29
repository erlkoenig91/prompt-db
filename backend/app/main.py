from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import distinct, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.version import get_version
from app.constants import DEFAULT_MODELS, PASSWORD_RULES, TASKS, USERNAME_RULES
from app.database import AsyncSessionLocal, engine, get_db
from app.models import Prompt, User
from app.routers import auth, prompts, settings as settings_router, stats, users
from app.routers.auth import limiter
from app.schemas import MetaResponse, TaskOption

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="Prompt DB API",
    version=get_version(),
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": get_version()}


@app.get("/ready")
async def ready() -> JSONResponse:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(select(User).limit(1))
        return JSONResponse({"status": "ready"})
    except Exception:
        return JSONResponse({"status": "not ready"}, status_code=503)


@app.get("/api/meta", response_model=MetaResponse)
async def meta(db: AsyncSession = Depends(get_db)) -> MetaResponse:
    result = await db.execute(select(distinct(Prompt.model)))
    used_models = {row[0] for row in result.all() if row[0]}
    models = sorted(set(DEFAULT_MODELS) | used_models, key=str.lower)

    return MetaResponse(
        version=get_version(),
        models=models,
        tasks=[TaskOption(value=key, label=label) for key, label in TASKS.items()],
        password_rules=PASSWORD_RULES,
        username_rules=USERNAME_RULES,
    )


app.include_router(auth.router, prefix="/api")
app.include_router(prompts.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(users.router, prefix="/api")
