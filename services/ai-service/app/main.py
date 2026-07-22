import logging

from fastapi import FastAPI, Request  # type: ignore[import]
from fastapi.middleware.cors import CORSMiddleware  # type: ignore[import]
from fastapi.responses import JSONResponse  # type: ignore[import]

from app.config import settings
from app.routes.analytics import router as analytics_router
from app.routes.health import router as health_router

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger("richys-eat-ai-service")

app = FastAPI(
    title="Richy's Eat AI Service",
    description="Analytics, forecasting, and reporting microservice for Richy's Eat.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tightened once the backend URL is known (Phase 8)
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RuntimeError)
async def runtime_error_handler(_request: Request, exc: RuntimeError) -> JSONResponse:
    # Firebase-not-configured and similar "service unavailable" conditions —
    # same "degrade with a clear message" pattern as the Node backend.
    return JSONResponse(status_code=503, content={"error": str(exc)})

app.include_router(health_router)
app.include_router(analytics_router)

# Analytics endpoints: /analytics/revenue-trends, /analytics/top-items,
# /analytics/demand-forecast, /analytics/customer-segments — internal only,
# called by the backend (which proxies to platform admin / restaurant owner
# dashboards), never exposed directly to the internet.

if not settings.firebase_configured:
    logger.warning(
        "Firebase credentials not fully set — AI service running without a live "
        "Firebase connection. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and "
        "FIREBASE_PRIVATE_KEY in services/ai-service/.env to enable Firestore reads."
    )
