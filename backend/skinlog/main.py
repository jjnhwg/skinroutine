"""FastAPI app for the skincare test log."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from skinlog.routers import (
    catalog,
    days,
    files,
    health,
    legacy,
    products,
    routine,
    settings,
    tags,
)


def create_app() -> FastAPI:
    app = FastAPI(title="Skin Test Log")
    # Lets the Vite dev server (different port) talk to this API directly
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.include_router(health.router, prefix="/api")
    app.include_router(catalog.router, prefix="/api")
    app.include_router(settings.router, prefix="/api")
    app.include_router(products.router, prefix="/api")
    app.include_router(files.router, prefix="/api")
    app.include_router(routine.router, prefix="/api")
    app.include_router(days.router, prefix="/api")
    app.include_router(days.photo_days_router, prefix="/api")
    app.include_router(tags.router, prefix="/api")
    app.include_router(legacy.router, prefix="/api")
    return app


async def _validation_error(_request: Request, error: RequestValidationError) -> JSONResponse:
    """FastAPI's usual 422 list, minus pydantic's "Value error, " prefix, so the UI can show
    the message as-is."""
    detail = [
        {"loc": item["loc"], "msg": item["msg"].removeprefix("Value error, ")}
        for item in error.errors()
    ]
    return JSONResponse({"detail": detail}, status_code=422)


app = create_app()
