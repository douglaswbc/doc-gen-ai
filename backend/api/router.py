from fastapi import APIRouter
from api.endpoints import agents, search #, health

api_router = APIRouter()

# Inclui os endpoints específicos
api_router.include_router(agents.router, prefix="/agents", tags=["Agents"])
api_router.include_router(search.router, prefix="/search", tags=["Search"])
#api_router.include_router(health.router, tags=["Health"])