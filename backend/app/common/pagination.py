"""Shared pagination query and metadata.

Matches PageQuery / PaginationMeta in the frozen frontend contract: page starts
at 1, default limit 20, hard ceiling 100 so a client cannot ask for the world.
"""

from __future__ import annotations

from math import ceil
from typing import Literal

from fastapi import Query
from pydantic import BaseModel

DEFAULT_LIMIT = 20
MAX_LIMIT = 100


class PageParams(BaseModel):
    page: int = 1
    limit: int = DEFAULT_LIMIT
    sort: str | None = None
    order: Literal["asc", "desc"] = "asc"
    search: str | None = None

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


def page_params(
    page: int = Query(1, ge=1),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    sort: str | None = Query(None),
    order: Literal["asc", "desc"] = Query("asc"),
    search: str | None = Query(None),
) -> PageParams:
    return PageParams(page=page, limit=limit, sort=sort, order=order, search=search)


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total_items: int
    total_pages: int
    has_next: bool
    has_previous: bool


class Paginated[T](BaseModel):
    items: list[T]
    pagination: PaginationMeta


def paginate[T](items: list[T], total: int, params: PageParams) -> Paginated[T]:
    total_pages = ceil(total / params.limit) if total else 0
    return Paginated[T](
        items=items,
        pagination=PaginationMeta(
            page=params.page,
            limit=params.limit,
            total_items=total,
            total_pages=total_pages,
            has_next=params.page < total_pages,
            has_previous=params.page > 1,
        ),
    )
