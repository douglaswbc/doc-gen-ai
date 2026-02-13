from fastapi import APIRouter
from api.endpoints import agents, search, clients, jurisprudence, jurisdiction #, health

api_router = APIRouter()

# Inclui os endpoints específicos
api_router.include_router(agents.router, prefix="/agents", tags=["Agents"])
api_router.include_router(search.router, prefix="/search", tags=["Search"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(jurisprudence.router, prefix="/jurisprudence", tags=["Jurisprudence"])
api_router.include_router(jurisdiction.router, prefix="/jurisdiction", tags=["Jurisdiction"])
#api_router.include_router(health.router, tags=["Health"])