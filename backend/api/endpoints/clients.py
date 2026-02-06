from fastapi import APIRouter

router = APIRouter()

# Nota: Este endpoint foi desativado pois a persistência agora é feita 
# diretamente pelo frontend no campo JSONB 'children' da tabela 'clients'.
# Mantemos o router aqui para não quebrar as importações do FastAPI.
