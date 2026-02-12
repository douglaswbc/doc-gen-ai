import asyncio
import os
from typing import Optional

# Framework e Utilitários
from fastapi import APIRouter, HTTPException, Header, Depends
from supabase import create_client, Client

# Modelos e Schemas
from models.schemas import GenerateRequest, GenerateResponse

# Import do Grafo de Agentes
from agents.workflow import app_graph

# Serviços
from services.search import search_jurisprudence, search_judicial_subsection
from services.calculations import generate_payment_table, get_valor_extenso

router = APIRouter()

# Configuração do Supabase
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# --- FUNÇÃO DE SEGURANÇA ---
async def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token de autenticação ausente.")
    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Sessão inválida ou expirada.")
        return user
    except Exception as e:
        print(f"❌ Erro de Auth: {e}")
        raise HTTPException(status_code=401, detail="Acesso negado.")

# --- ROTA DE GERAÇÃO DE DOCUMENTOS ---
@router.post("/generate", response_model=GenerateResponse)
async def generate_document(
    request: GenerateRequest, 
    user_auth = Depends(verify_token)
):
    print(f"🚀 [API] Usuário Autenticado: {user_auth.user.email}")

    try:
        # =========================================================================
        # 1. PRÉ-PROCESSAMENTO (Python Puro)
        # =========================================================================
        print("🔍 [1/3] Executando Pesquisa Jurisprudencial e de Competência...")
        
        # Dispara buscas
        juris_task = search_jurisprudence(f"{request.docType} rural recentes")
        subsection_task = search_judicial_subsection(
            request.clientData.address, 
            city=request.clientData.city, 
            state=request.clientData.state
        )

        raw_jurisprudencias, juris_data = await asyncio.gather(juris_task, subsection_task)
        
        # DEFINIÇÃO DO INSS ADDRESS (Obrigatório para o GenerateResponse)
        inss_address = None # Deixa o frontend usar o fallback se necessário

        # Formata jurisprudência
        juris_text = "\n".join([f"- {j['title']}: {j['snippet']}" for j in raw_jurisprudencias])
        if not juris_text:
            juris_text = "Nenhuma jurisprudência específica encontrada no banco de dados local."

        print("💰 [2/3] Executando Cálculos Previdenciários...")
        
        # Cálculos
        data_nascimento = getattr(request.clientData, 'child_birth_date', None)
        if not data_nascimento and request.clientData.children:
            data_nascimento = request.clientData.children[0].get('birth_date')
        
        tabela, valor_total = generate_payment_table(data_nascimento)
        valor_extenso = get_valor_extenso(valor_total)
        
        calc_text = f"Valor Total da Causa: R$ {valor_total}. Tabela gerada com {len(tabela)} competências mensais."

        # =========================================================================
        # 2. INTELIGÊNCIA ARTIFICIAL (LangGraph)
        # =========================================================================
        print(f"🤖 [3/3] Acionando Agente Jurídico: '{request.agentSlug}'")

        # Busca instrução
        agent_res = supabase.table('ai_agents').select('system_instruction').eq('slug', request.agentSlug).execute()
        system_instruction = agent_res.data[0].get('system_instruction') if agent_res.data else None

        # Contexto
        contexto_cliente = f"""
        Cliente: {request.clientName}
        Detalhes do Caso: {request.details}
        Dados Formais (JSON): {request.clientData.model_dump_json()}
        Endereço INSS: {inss_address}
        """

        # Execução do Grafo
        result = await app_graph.ainvoke({
            "input_text": contexto_cliente,
            "doc_type": request.docType,
            "client_data": request.clientData.model_dump(),
            "research_results": juris_text,
            "calc_results": calc_text,
            "system_instruction": system_instruction,
            "revision_count": 0,
            "quality_score": 0,
            "review_comments": ""
        })
        
        # Recupera Draft
        ai_data = result.get("draft") or result.get("final_output")

        if not ai_data:
            raise ValueError("O Agente falhou em gerar o documento final (Draft não encontrado).")

        # =========================================================================
        # 3. MONTAGEM DA RESPOSTA (JSON para o Frontend)
        # =========================================================================
        
        # Formatações extras
        juris_formatada = [
            {"tribunal": j["title"], "ementa": j["snippet"], "referencia": j["link"]}
            for j in raw_jurisprudencias
        ]
        
        cidade_uf = "Não localizado"
        if isinstance(juris_data, dict):
            c = juris_data.get('city', '')
            s = juris_data.get('state', '')
            if c and s:
                cidade_uf = f"{c}-{s}"

        # Verifica se há correções cadastrais
        # Importante: ai_data.dados_cadastrais_corrigidos é um objeto Pydantic ou None
        correcao_cadastral_dict = None
        if ai_data.dados_cadastrais_corrigidos:
            correcao_cadastral_dict = ai_data.dados_cadastrais_corrigidos.model_dump()

        return GenerateResponse(
            resumo_fatos=ai_data.resumo_fatos,
            preliminares=getattr(ai_data, 'preliminares', None),
            dados_tecnicos=ai_data.dados_tecnicos.model_dump(),
            lista_provas=ai_data.lista_provas,
            correcoes=getattr(ai_data, 'correcoes', []),
            
            # Sanitização (Correção Cadastral)
            dados_cadastrais=correcao_cadastral_dict,
            
            # Dados do Python (AQUI ESTAVA O ERRO POTENCIAL)
            inss_address=inss_address, 
            end_cidade_uf=cidade_uf,
            jurisdiction=juris_data if isinstance(juris_data, dict) else None,
            
            # Listas e Tabelas
            jurisprudencias_selecionadas=juris_formatada[:3],
            tabela_calculo=tabela,
            valor_causa_extenso=valor_extenso
        )

    except Exception as e:
        print(f"❌ Erro Crítico na Geração: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro interno ao gerar documento: {str(e)}")