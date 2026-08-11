"""The success transport envelope every endpoint returns.

Shape is fixed by the frozen frontend contract (frontend/app/src/types/index.ts):
    {"success": true, "message": "...", "data": ...}
204 responses carry no envelope at all.
"""

from __future__ import annotations

from pydantic import BaseModel


class ApiResponse[T](BaseModel):
    success: bool = True
    message: str = "Success"
    data: T


def ok[T](data: T, message: str = "Success") -> dict[str, object]:
    return {"success": True, "message": message, "data": data}
