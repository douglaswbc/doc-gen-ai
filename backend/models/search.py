import asyncio
from typing import List, Dict

async def search_inss_address(address: str) -> str:
    """Busca o endereço do INSS mais próximo (Simulado)"""
    # Futuramente: Conectar Google Maps API
    print(f"🔎 Buscando INSS para: {address}")
    await asyncio.sleep(0.5) 
    return "Previdência Social - Av. Dom Vicente Zico, 1081 - Cidade Nova, Ananindeua - PA"

async def search_jurisprudence(query: str) -> List[Dict]:
    """Busca jurisprudência (Simulado - RAG viria aqui)"""
    print(f"⚖️ Buscando leis para: {query}")
    await asyncio.sleep(0.5)
    
    # Retorna dados estruturados como o template espera
    return [
        {
            "title": "STF - ADI 2110",
            "snippet": "A carência para salário-maternidade rural é inconstitucional se exigir contribuição prévia.",
            "link": "https://stf.jus.br/jurisprudencia/adi2110"
        },
        {
            "title": "TNU - Súmula 14",
            "snippet": "Para a concessão de salário-maternidade, basta a prova do exercício de atividade rural no período de carência.",
            "link": "https://cjf.jus.br/tnu/sumula14"
        }
    ]