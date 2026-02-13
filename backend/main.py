from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.router import api_router # Importa o router central

app = FastAPI(title="PrevAI API", version="2.0")

origins = [
    "http://localhost:5173",           # Para você continuar trabalhando local
    "http://localhost:3000",
    "https://prev-ai.pages.dev",       # 🔒 Seu domínio oficial da Cloudflare
    "https://sua-url-customizada.com"  # (Se você comprar um domínio depois)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Use ["*"] se quiser facilitar agora
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra todas as rotas com o prefixo /api
app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {"status": "Backend Python Online 🚀"}