import asyncio
import os
from fastapi import APIRouter, HTTPException, Header, Depends
from supabase import create_client, Client
from typing import Optional

from models.schemas import GenerateRequest, GenerateResponse
from agents.workflow import app_graph
from services.search import search_jurisprudence, search_judicial_subsection
from services.calculations import generate_payment_table, get_valor_extenso

router = APIRouter()

# Inicializa o Supabase no Python
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# --- FUNÇÃO DE SEGURANÇA ---
async def verify_token(authorization: Optional[str] = Header(None)):
    """Verifica se o usuário enviou um token válido do Supabase"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Token de autenticação ausente.")

    try:
        # O formato vem como "Bearer <token>"
        token = authorization.split(" ")[1]

        # Pergunta ao Supabase quem é esse usuário
        user = supabase.auth.get_user(token)

        if not user:
            raise HTTPException(status_code=401, detail="Sessão inválida ou expirada.")

        return user
    except Exception as e:
        print(f"❌ Erro de Auth: {e}")
        raise HTTPException(status_code=401, detail="Acesso negado.")

# --- ROTA PROTEGIDA ---
@router.post("/generate", response_model=GenerateResponse)
async def generate_document(
    request: GenerateRequest, 
    user_auth = Depends(verify_token) # <--- AQUI ESTÁ A MÁGICA
):
    print(f"🚀 [API] Usuário Autenticado: {user_auth.user.email}")

    try:
        print("🔍 Buscando Jurisprudência e Jurisdição...")
        juris_task = search_jurisprudence(f"{request.docType} rural recentes")
        subsection_task = search_judicial_subsection(
            request.clientData.address, 
            city=request.clientData.city, 
            state=request.clientData.state
        )

        raw_jurisprudencias, juris_data = await asyncio.gather(juris_task, subsection_task)
        inss_address = "Consultar Órgão Previdenciário Local" # Valor padrão agora

        # 2. CÁLCULOS FINANCEIROS
        print("💰 Realizando cálculos...")
        # Tenta pegar a data de nascimento da criança do form ou do primeiro filho da lista
        data_nascimento = getattr(request.clientData, 'child_birth_date', None)
        if not data_nascimento and request.clientData.children:
            data_nascimento = request.clientData.children[0].get('birth_date')
        
        tabela, valor_total = generate_payment_table(data_nascimento)
        valor_extenso = get_valor_extenso(valor_total)

        # 3. INTELIGÊNCIA ARTIFICIAL (LangGraph)
        print(f"🤖 Buscando instruções para o agente slug: '{request.agentSlug}'")
        
        # Busca a system_instruction do agente no banco pelo slug (mais robusto)
        agent_res = supabase.table('ai_agents').select('system_instruction').eq('slug', request.agentSlug).execute()
        system_instruction = None
        if agent_res.data and len(agent_res.data) > 0:
            system_instruction = agent_res.data[0].get('system_instruction')
            print(f"✅ Instrução personalizada encontrada para {request.agentName}")
        else:
            print(f"⚠️ Aviso: Agente '{request.agentName}' não encontrado ou sem instrução. Usando fallback.")

        print("🤖 Gerando texto jurídico...")
        contexto = f"""
        Cliente: {request.clientName}
        Endereço INSS Encontrado: {inss_address}
        Valor da Causa Calculado: R$ {valor_total}
        Detalhes do Caso: {request.details}
        Dados do Formulário: {request.clientData.model_dump_json()}
        """
        
        result = await app_graph.ainvoke({
            "input_text": contexto,
            "doc_type": request.docType,
            "system_instruction": system_instruction
        })
        
        ai_data = result["final_output"]

        # 4. FORMATAÇÃO FINAL
        juris_formatada = [
            {"tribunal": j["title"], "ementa": j["snippet"], "referencia": j["link"]}
            for j in raw_jurisprudencias
        ]

        # Retorna o JSON que o Template.ts do Frontend espera (inclui cidade/uf da subseção e correções)
        return GenerateResponse(
            resumo_fatos=ai_data.resumo_fatos,
            preliminares=getattr(ai_data, 'preliminares', None),
            dados_tecnicos=ai_data.dados_tecnicos.model_dump(),
            lista_provas=ai_data.lista_provas,
            
            # Dados enriquecidos pelo Python:
            inss_address=inss_address,
            end_cidade_uf=f"{juris_data.get('city', '')}-{juris_data.get('state', '')}" if isinstance(juris_data, dict) else str(juris_data),
            jurisdiction=juris_data if isinstance(juris_data, dict) else None,
            correcoes=getattr(ai_data, 'correcoes', []),
            jurisprudencias_selecionadas=juris_formatada[:3],
            tabela_calculo=tabela,
            valor_causa_extenso=valor_extenso
        )

    except Exception as e:
        print(f"❌ Erro Crítico: {e}")
        import traceback
        traceback.print_exc() # Mostra o erro real no terminal
        raise HTTPException(status_code=500, detail=str(e))