"""FastAPI app for the skincare test log."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from skinlog.routers import catalog, health


def create_app() -> FastAPI:
    app = FastAPI(title="Skin Test Log")
    # Lets the Vite dev server (different port) talk to this API directly
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router, prefix="/api")
    app.include_router(catalog.router, prefix="/api")
    return app


app = create_app()
