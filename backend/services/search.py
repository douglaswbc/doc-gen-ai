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


async def search_judicial_subsection(user_address: str) -> str:
    """Busca a subseção judiciária (Fórum/Subseção) mais próxima usando Serper Places API"""
    if not SERPER_API_KEY:
        print("⚠️ SERPER_API_KEY ausente. Retornando mock de subseção.")
        return "Subseção Judiciária - Cidade (Configure a API Key)"

    url = "https://google.serper.dev/places"
    # Procuramos por termos que indiquem o fórum ou subseção judiciária mais próxima
    payload = {
        "q": f"Fórum Subsecao Judiciaria near {user_address}",
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
                title = place.get('title', 'Subseção Judiciária')
                address = place.get('address', '') or ''
                combined = f"{title} {address}".strip()

                # Heurísticas para extrair Cidade e UF (ex: Santarém-PA, Santarém - PA, Santarém, PA)
                def extract_city_uf(text: str) -> str:
                    if not text:
                        return ''
                    # Normalize separators
                    t = text.replace('\u2013', '-').replace('\u2014', '-').replace('/', '-').replace('\n', ' ')
                    # Try patterns like "Cidade - UF" or "Cidade, UF"
                    import re
                    m = re.search(r"([A-Za-zÀ-ÖØ-öø-ÿ\.\s]+)[,-]\s*([A-Za-z]{2})\b", t)
                    if m:
                        city = m.group(1).strip()
                        state = m.group(2).upper()
                        return f"{city}-{state}"
                    # Try last token as state code
                    parts = re.split(r"[,\-]", t)
                    if len(parts) >= 2:
                        last = parts[-1].strip()
                        if re.match(r"^[A-Za-z]{2}$", last):
                            city = parts[-2].strip()
                            return f"{city}-{last.upper()}"
                    # Fallback: try to find two-letter uppercase token
                    m2 = re.search(r"([A-Za-zÀ-ÿ\s\.]+)\s+([A-Z]{2})\b", t)
                    if m2:
                        return f"{m2.group(1).strip()}-{m2.group(2)}"
                    return ''

                cityuf = extract_city_uf(combined)
                def normalize_city_uf(s: str) -> str:
                    if not s:
                        return ''
                    t = s.strip()
                    # remove ONLY the phrase 'Subseção Judiciária (de|da|do)' (case-insensitive, with/without accents)
                    import re
                    t = re.sub(r'(?i)subse[cç]ã?o\s+judiciari[ao]\s*(de|da|do)?\s*', '', t)
                    t = ' '.join(t.split())
                    # try to capture City and UF
                    import re
                    m = re.search(r"([A-Za-zÀ-ÖØ-öø-ÿ\.\s]+)[,\-]\s*([A-Za-z]{2})\b", t)
                    if m:
                        city = m.group(1).strip()
                        uf = m.group(2).upper()
                        # Title-case city
                        city_t = ' '.join([w.capitalize() for w in city.split()])
                        return f"{city_t}-{uf}"
                    # try last token as UF
                    parts = t.split()
                    if len(parts) >= 2 and re.match(r"^[A-Za-z]{2}$", parts[-1]):
                        uf = parts[-1].upper()
                        city = ' '.join(parts[:-1])
                        city_t = ' '.join([w.capitalize() for w in city.split()])
                        return f"{city_t}-{uf}"
                    return ''

                normalized = normalize_city_uf(cityuf)
                if normalized:
                    return normalized
                # Fallback: try normalizing combined text
                normalized2 = normalize_city_uf(combined)
                if normalized2:
                    return normalized2
                # Final fallback: return title and address concatenated
                return f"{title} - {address}"
    except Exception as e:
        print(f"❌ Erro na busca Serper (subseção): {e}")

    return "Subseção Judiciária mais próxima (Não localizada)"