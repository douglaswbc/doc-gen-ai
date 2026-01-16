import httpx
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

SERPER_API_KEY = os.getenv("SERPER_API_KEY")

async def search_inss_address(user_address: str) -> str:
    """Busca a agência do INSS mais próxima usando Serper Places API"""
    if not SERPER_API_KEY:
        print("⚠️ SERPER_API_KEY ausente. Retornando mock.")
        return "INSS - Endereço Mockado (Configure a API Key)"
        
    url = "https://google.serper.dev/places"
    # Procuramos "INSS perto de [endereço do cliente]"
    payload = json_payload = {
        "q": f"INSS Previdência Social near {user_address}",
        "gl": "br",
        "hl": "pt-br"
    }
    headers = {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=10.0)
            
        if response.status_code == 200:
            data = response.json()
            if "places" in data and len(data["places"]) > 0:
                place = data["places"][0]
                return f"{place.get('title', 'INSS')} - {place.get('address', '')}"
                
    except Exception as e:
        print(f"❌ Erro na busca Serper: {e}")
    
    return "Endereço do INSS a ser citado (Não localizado automaticamente)"

async def search_jurisprudence(query: str) -> list:
    """Busca jurisprudência no Google via Serper"""
    if not SERPER_API_KEY:
        return []

    url = "https://google.serper.dev/search"
    payload = {
        "q": f"jurisprudência {query} site:jusbrasil.com.br OR site:stj.jus.br",
        "num": 3,
        "gl": "br",
        "hl": "pt-br"
    }
    headers = {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=10.0)
            
        if response.status_code == 200:
            data = response.json()
            results = []
            for item in data.get("organic", []):
                results.append({
                    "title": item.get("title"),
                    "snippet": item.get("snippet"),
                    "link": item.get("link")
                })
            return results
    except Exception:
        pass
        
    return []