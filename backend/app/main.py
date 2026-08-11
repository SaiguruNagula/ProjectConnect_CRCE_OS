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
from app.modules.health.router import router as health_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging("DEBUG" if settings.debug else "INFO")
    settings.assert_production_safe()
    logger.info("Application starting", extra={"env": settings.env})
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

    app.include_router(health_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
