import os
import asyncio
import re
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

async def get_supabase_client():
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    if not url or not key:
        raise ValueError("Supabase configuration missing (SUPABASE_URL/SUPABASE_KEY)")
    return create_client(url, key)

async def search_jurisprudence(query: str) -> list:
    """Busca jurisprudência na tabela 'jurisprudences' do Supabase"""
    try:
        supabase = await get_supabase_client()
        # Busca textual simples nos campos principais
        # Nota: Usamos ilike para busca case-insensitive simplificada
        res = supabase.table('jurisprudences').select('*').or_(f"title.ilike.%{query}%,summary.ilike.%{query}%,full_text.ilike.%{query}%").limit(3).execute()
        
        data = getattr(res, 'data', [])
        results = []
        for item in data:
            results.append({
                "title": item.get("title"),
                "snippet": item.get("summary") or item.get("citation"),
                "link": item.get("source_url")
            })
        return results
    except Exception as e:
        print(f"❌ Erro na busca de jurisprudência Supabase: {e}")
        return []

async def search_judicial_subsection(user_address: str, city: str = None, state: str = None) -> dict:
    """Busca a subseção judiciária (Fórum/Subseção) usando dados estruturados ou endereço"""
    
    # 1. Se já temos Cidade e UF estruturados, priorizamos eles
    if city and state:
        print(f"📍 [Search] Usando dados estruturados: {city} - {state}")
        db = await search_jurisdiction_db(city, state)
        if db.get('found'):
            return db

    # 2. Caso contrário, tenta extrair do endereço (como plano de fallback)
    print(f"🔍 [Search] Analisando endereço para jurisdição: '{user_address}'")
    try:
        # Extrai o estado (ex: "PA") - Busca por 2 letras isoladas no final ou após hífen/vírgula
        clean_addr = (user_address or "").strip()
        state_match = re.search(r"[\s,\-/]([A-Za-z]{2})\s*$", clean_addr)
        extracted_state = state_match.group(1).upper() if state_match else (state.upper() if state else None)
        
        # Fallback para regex mais simples se falhar
        if not extracted_state:
            state_match = re.search(r"([A-Za-z]{2})\s*$", clean_addr)
            extracted_state = state_match.group(1).upper() if state_match else None

        print(f"📍 [Search] Estado extraído: {extracted_state}")
        
        if extracted_state:
            # Divide o endereço por vírgulas, hifens ou barras e remove espaços
            parts = [p.strip() for p in re.split(r'[,/\-]', user_address or "")]
            # Filtra partes muito curtas ou que pareçam ser o estado
            parts = [p for p in parts if len(p) > 2 and p.upper() != extracted_state]
            
            print(f"📋 [Search] Partes candidatas a município: {parts}")
            
            # Tenta encontrar no banco de dados, começando do fim do endereço
            for part in reversed(parts):
                print(f"🔎 [Search] Tentando município: '{part}' em {extracted_state}")
                db = await search_jurisdiction_db(part, extracted_state)
                if isinstance(db, dict) and db.get('found'):
                    print(f"✅ [Search] Jurisdição encontrada: {db.get('subsecao')} em {db.get('city')}")
                    return db
    except Exception as e:
        print(f"⚠️ Erro no lookup de jurisdição: {e}")

    print("❌ [Search] Jurisdição não localizada.")
    return { "city": "Não localizada", "state": (state or ""), "has_jef": True, "subsecao": "Não localizada" }

async def search_jurisdiction_db(municipality: str, state: str) -> dict:
    try:
        if not municipality or not state:
            return { 'found': False }

        supabase = await get_supabase_client()
        cleaned_mun = municipality.strip().lower()
        state_upper = state.upper()

        # 1. Busca todos os municípios do estado
        mun_q = supabase.table('municipalities').select('id, name').eq('state', state_upper).execute()
        all_mun = getattr(mun_q, 'data', [])
        
        target_mun_id = None
        target_mun_name = None
        
        # Tenta encontrar o município (match exato primeiro)
        for m in all_mun:
            m_name = m['name'].lower()
            if m_name == cleaned_mun:
                target_mun_id = m['id']
                target_mun_name = m['name']
                break
        
        # Se não achou exato, tenta conter (fuzzy match simples)
        if not target_mun_id:
            for m in all_mun:
                m_name = m['name'].lower()
                if m_name in cleaned_mun or cleaned_mun in m_name:
                    target_mun_id = m['id']
                    target_mun_name = m['name']
                    break
        
        if not target_mun_id:
            return { 'found': False }

        # 2. Busca o mapeamento de jurisdição
        res = supabase.table('jurisdiction_map').select(
            'legal_basis, subsection:subsection_id(name,city,has_jef, judicial_sections(name))'
        ).eq('municipality_id', target_mun_id).limit(1).execute()
        
        data = getattr(res, 'data', [])
        
        if data and len(data) > 0:
            row = data[0]
            subsection = row.get('subsection', {})
            section_data = subsection.get('judicial_sections', {})
            
            return {
                'found': True,
                'municipio': target_mun_name,
                'state': state_upper,
                'subsecao': subsection.get('name'),
                'city': subsection.get('city'),
                'has_jef': subsection.get('has_jef'),
                'section': section_data.get('name') if isinstance(section_data, dict) else None,
                'legal_basis': row.get('legal_basis')
            }
        
        return { 'found': False }
    except Exception as e:
        return { 'error': str(e) }
