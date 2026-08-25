"""FastAPI application factory — wiring only, no business logic.

Routers are mounted here; every module keeps its own router/service/repository.
"""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.common.errors import register_error_handlers
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.session import engine
from app.modules.audit.router import router as audit_router
from app.modules.auth.router import router as auth_router
from app.modules.credits.router import router as credits_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.health.router import router as health_router
from app.modules.institutions.router import public_router as campus_impact_router
from app.modules.institutions.router import router as institutions_router
from app.modules.leaderboard.router import router as leaderboard_router
from app.modules.notifications.router import router as notifications_router
from app.modules.portfolio.router import router as portfolio_router
from app.modules.problems.router import router as problems_router
from app.modules.profiles.router import router as profiles_router
from app.modules.projects.router import router as projects_router
from app.modules.reviews.router import router as reviews_router
from app.modules.solutions.router import router as solutions_router
from app.modules.teams.router import router as teams_router
from app.modules.users.router import router as users_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging("DEBUG" if settings.debug else "INFO")
    settings.assert_production_safe()
    logger.info(
        "Application starting",
        # deployment_id names this installation in the logs an operator ships
        # to support; there is no call home (ADR-9).
        extra={"env": settings.env, "deployment_id": settings.deployment_id or "unset"},
    )
    yield
    engine.dispose()
    logger.info("Application stopped")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.project_name,
        version="0.1.0",
        lifespan=lifespan,
        # API docs are useful in development but are an attack surface in production.
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        request.state.request_id = request_id
        started = time.perf_counter()
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": round((time.perf_counter() - started) * 1000, 2),
            },
        )
        return response

    register_error_handlers(app)

    for module_router in (
        health_router,
        auth_router,
        institutions_router,
        # Anonymous, and the only such route outside health and auth: the
        # institution's own public headline counts (Phase 14).
        campus_impact_router,
        users_router,
        profiles_router,
        problems_router,
        teams_router,
        projects_router,
        reviews_router,
        credits_router,
        leaderboard_router,
        portfolio_router,
        solutions_router,
        # Cross-cutting: every module above raises into notifications and writes
        # to the audit log; neither reads back into them.
        notifications_router,
        audit_router,
        # Last: it reads every module above and is read by none of them.
        dashboard_router,
    ):
        app.include_router(module_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
