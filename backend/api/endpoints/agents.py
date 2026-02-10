import asyncio
import os
from typing import Optional

# Framework e Utilitários
from fastapi import APIRouter, HTTPException, Header, Depends
from supabase import create_client, Client

# Modelos e Schemas
from models.schemas import GenerateRequest, GenerateResponse

# Import do Grafo de Agentes (A "Mente" da IA)
from agents.workflow import app_graph

# Serviços (Ferramentas que o Python executa antes da IA)
from services.search import search_jurisprudence, search_judicial_subsection
from services.calculations import generate_payment_table, get_valor_extenso

router = APIRouter()

# Configuração do Supabase
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# --- FUNÇÃO DE SEGURANÇA ---
async def verify_token(authorization: Optional[str] = Header(None)):
    """
    Verifica se o request possui um token Bearer válido do Supabase Auth.
    Protege a rota contra acesso não autorizado.
    """
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
    """
    Rota principal que orquestra a criação do documento.
    Funciona em modo HÍBRIDO:
    1. Python Tradicional: Busca dados e faz cálculos (Rápido, Barato, Preciso).
    2. IA Generativa: Redige e revisa o texto jurídico (Criativo, Adaptável).
    """
    print(f"🚀 [API] Usuário Autenticado: {user_auth.user.email}")

    try:
        # =========================================================================
        # 1. PRÉ-PROCESSAMENTO (Python Puro)
        # =========================================================================
        # Executamos busca e cálculo aqui fora do agente por dois motivos:
        # A) Velocidade: Não precisamos esperar o LLM "decidir" chamar a ferramenta.
        # B) Estrutura: O Frontend precisa de dados estruturados (tabela, links) que
        #    são mais fáceis de garantir via código do que via parsing de texto da IA.

        print("🔍 [1/3] Executando Pesquisa Jurisprudencial e de Competência...")
        
        # Dispara buscas em paralelo para ganhar tempo
        juris_task = search_jurisprudence(f"{request.docType} rural recentes")
        subsection_task = search_judicial_subsection(
            request.clientData.address, 
            city=request.clientData.city, 
            state=request.clientData.state
        )

        # Aguarda ambas terminarem
        raw_jurisprudencias, juris_data = await asyncio.gather(juris_task, subsection_task)
        
        # Endereço do INSS (Pode ser melhorado com busca real no futuro)
        inss_address = "Consultar Órgão Previdenciário Local"

        # Formata a jurisprudência em texto para a IA ler
        juris_text = "\n".join([f"- {j['title']}: {j['snippet']}" for j in raw_jurisprudencias])
        if not juris_text:
            juris_text = "Nenhuma jurisprudência específica encontrada no banco de dados local."

        print("💰 [2/3] Executando Cálculos Previdenciários...")
        
        # Lógica para encontrar a data de nascimento (da criança ou do cliente)
        data_nascimento = getattr(request.clientData, 'child_birth_date', None)
        if not data_nascimento and request.clientData.children:
            # Pega o primeiro filho se houver lista
            data_nascimento = request.clientData.children[0].get('birth_date')
        
        # Gera a tabela financeira
        tabela, valor_total = generate_payment_table(data_nascimento)
        valor_extenso = get_valor_extenso(valor_total)
        
        # Formata o resumo do cálculo para a IA ler
        calc_text = f"Valor Total da Causa: R$ {valor_total}. Tabela gerada com {len(tabela)} competências mensais."

        # =========================================================================
        # 2. INTELIGÊNCIA ARTIFICIAL (LangGraph)
        # =========================================================================
        print(f"🤖 [3/3] Acionando Agente Jurídico: '{request.agentSlug}'")

        # Contexto textual rico para o Agente Escritor
        contexto_cliente = f"""
        Cliente: {request.clientName}
        Detalhes do Caso: {request.details}
        Dados Formais (JSON): {request.clientData.model_dump_json()}
        Endereço INSS: {inss_address}
        """

        # Invocação do Grafo
        # IMPORTANTE: Passamos 'research_results' e 'calc_results' preenchidos.
        # O 'orchestrator_node' verificará esses campos e pulará os agentes de 
        # pesquisa e cálculo, indo direto para o 'writer_node'.
        result = await app_graph.ainvoke({
            "input_text": contexto_cliente,
            "doc_type": request.docType,
            "client_data": request.clientData.model_dump(),
            
            # Estado Inicial Injetado
            "research_results": juris_text,
            "calc_results": calc_text,
            
            # Contadores de Controle
            "revision_count": 0,
            "quality_score": 0,
            "review_comments": ""
        })
        
        # Recupera o rascunho final gerado pelo Writer/Reviewer
        # No workflow.py corrigido, o resultado final fica na chave "draft"
        ai_data = result.get("draft")

        if not ai_data:
            print(f"⚠️ Erro: O grafo retornou sem 'draft'. Keys disponíveis: {result.keys()}")
            raise ValueError("O Agente falhou em gerar o documento final.")

        # =========================================================================
        # 3. MONTAGEM DA RESPOSTA (JSON para o Frontend)
        # =========================================================================
        # O Frontend espera um formato específico para preencher o Template.ts
        
        # Formata jurisprudência para o componente visual de "Cards"
        juris_formatada = [
            {"tribunal": j["title"], "ementa": j["snippet"], "referencia": j["link"]}
            for j in raw_jurisprudencias
        ]
        
        # Formata string de Cidade-UF
        cidade_uf = "Não localizado"
        if isinstance(juris_data, dict):
            c = juris_data.get('city', '')
            s = juris_data.get('state', '')
            if c and s:
                cidade_uf = f"{c}-{s}"

        return GenerateResponse(
            # Campos de Texto (Vindos da IA)
            resumo_fatos=ai_data.resumo_fatos,
            preliminares=getattr(ai_data, 'preliminares', None), # Opcional
            dados_tecnicos=ai_data.dados_tecnicos.model_dump(),  # Pydantic -> Dict
            lista_provas=ai_data.lista_provas,
            correcoes=getattr(ai_data, 'correcoes', []),
            
            # Campos Estruturados (Vindos do Python)
            inss_address=inss_address,
            end_cidade_uf=cidade_uf,
            jurisdiction=juris_data if isinstance(juris_data, dict) else None,
            
            # Dados Mistos
            jurisprudencias_selecionadas=juris_formatada[:3], # Top 3
            tabela_calculo=tabela,
            valor_causa_extenso=valor_extenso
        )

    except Exception as e:
        print(f"❌ Erro Crítico na Geração: {e}")
        import traceback
        traceback.print_exc() # Log detalhado no terminal para debug
        raise HTTPException(status_code=500, detail=f"Erro interno ao gerar documento: {str(e)}")