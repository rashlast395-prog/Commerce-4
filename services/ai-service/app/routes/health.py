from datetime import datetime, timezone

from fastapi import APIRouter

from app.config import settings

router = APIRouter()


@router.get("/health")
def health_check() -> dict:
    return {
        "status": "ok",
        "service": "richys-eat-ai-service",
        "firebaseConfigured": settings.firebase_configured,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
