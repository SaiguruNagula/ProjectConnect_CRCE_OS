"""Domain errors and the centralized handlers that turn them into API responses.

Internal detail (stack traces, SQL, paths, credentials) never reaches a client:
handlers log the cause and return a generic message for anything unexpected.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base class for every error the API deliberately returns."""

    status_code = 500
    error_code = "INTERNAL_ERROR"
    default_message = "Something went wrong. Please try again."

    def __init__(
        self,
        message: str | None = None,
        *,
        errors: list[dict[str, str]] | None = None,
        error_code: str | None = None,
    ) -> None:
        self.message = message or self.default_message
        self.errors = errors or []
        if error_code:
            self.error_code = error_code
        super().__init__(self.message)


class ValidationError(AppError):
    status_code = 422
    error_code = "VALIDATION_ERROR"
    default_message = "Please correct the highlighted fields."


class BusinessRuleError(AppError):
    """A request that is well-formed but not allowed by the domain rules."""

    status_code = 409
    error_code = "BUSINESS_RULE_VIOLATION"
    default_message = "That action is not allowed right now."


class AuthenticationError(AppError):
    status_code = 401
    error_code = "UNAUTHENTICATED"
    default_message = "Sign in to continue."


class AuthorizationError(AppError):
    status_code = 403
    error_code = "FORBIDDEN"
    default_message = "You do not have access to this."


class NotFoundError(AppError):
    status_code = 404
    error_code = "NOT_FOUND"
    default_message = "We could not find what you were looking for."


class ServiceUnavailableError(AppError):
    status_code = 503
    error_code = "SERVICE_UNAVAILABLE"
    default_message = "The service is temporarily unavailable."


def error_response(
    request: Request,
    *,
    status_code: int,
    message: str,
    error_code: str,
    errors: list[dict[str, str]] | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {
        "success": False,
        "message": message,
        "errors": errors or [],
        "error_code": error_code,
        "timestamp": datetime.now(UTC).isoformat(),
        "path": request.url.path,
    }
    return JSONResponse(status_code=status_code, content=body)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError) -> JSONResponse:
        return error_response(
            request,
            status_code=exc.status_code,
            message=exc.message,
            error_code=exc.error_code,
            errors=exc.errors,
        )

    @app.exception_handler(RequestValidationError)
    async def _request_validation(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = [
            {
                "field": _field_name(item.get("loc", ())),
                "message": item.get("msg", "Invalid value."),
            }
            for item in exc.errors()
        ]
        return error_response(
            request,
            status_code=422,
            message="Please correct the highlighted fields.",
            error_code="VALIDATION_ERROR",
            errors=errors,
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return error_response(
            request,
            status_code=exc.status_code,
            message=str(exc.detail),
            error_code=_HTTP_ERROR_CODES.get(exc.status_code, "HTTP_ERROR"),
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        # Log the real cause; return nothing internal to the caller.
        logger.exception(
            "Unhandled exception", extra={"path": request.url.path, "method": request.method}
        )
        return error_response(
            request,
            status_code=500,
            message=AppError.default_message,
            error_code="INTERNAL_ERROR",
        )


_HTTP_ERROR_CODES = {
    401: "UNAUTHENTICATED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    429: "RATE_LIMITED",
}


def _field_name(loc: tuple[Any, ...] | list[Any]) -> str:
    """FastAPI reports ('body', 'field', 0); the frontend wants 'field.0'."""
    parts = [str(part) for part in loc if part not in ("body", "query", "path")]
    return ".".join(parts) or "request"
