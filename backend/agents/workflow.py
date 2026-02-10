import os
import operator
from typing import Annotated, List, TypedDict, Union, Optional
from dotenv import load_dotenv

# Imports do LangChain/LangGraph
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage

# Imports do seu projeto existente
from models.schemas import PeticaoAIOutput
from services.search import search_jurisprudence
from services.calculations import generate_payment_table

load_dotenv()

# --- 1. DEFINIÇÃO DO ESTADO (Memória do Processo) ---
class AgentState(TypedDict):
    input_text: str
    doc_type: str
    client_data: dict 
    system_instruction: Optional[str] # Instrução personalizada do banco
    
    # Memória Compartilhada (Pesquisa e Cálculos)
    research_results: str 
    calc_results: str
    
    # Controle do Documento
    draft: Optional[PeticaoAIOutput]
    review_comments: str
    quality_score: int
    revision_count: int

# ⚙️ CONFIGURAÇÃO DO MODELO
# GPT-4o é recomendado para Structured Outputs e melhor seguimento de instruções
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# --- 2. AGENTES (NÓS DO GRAFO) ---

# 🧠 AGENTE 1: ORQUESTRADOR (O Cérebro)
def orchestrator_node(state: AgentState):
    print("🤖 [ORCHESTRATOR] Analisando estado do processo...")
    
    # 1. Verifica Pesquisa (evita refazer se já veio do Python)
    res = state.get("research_results", "")
    if not res or len(str(res).strip()) < 10:
        return {"next": "researcher"}
    
    # 2. Verifica Cálculo (evita refazer se já veio do Python)
    calc = state.get("calc_results", "")
    if not calc or len(str(calc).strip()) < 5:
        return {"next": "calculator"}
        
    # 3. Se não tem rascunho, manda escrever
    if not state.get("draft"):
        return {"next": "writer"}
        
    # 4. Se tem rascunho mas a nota é 0 (acabou de ser escrito), manda REVISAR
    score = state.get("quality_score", 0)
    if score == 0:
        return {"next": "reviewer"}
        
    # 5. Loop de Qualidade: Nota baixa (< 8) e poucas tentativas
    rev_count = state.get("revision_count", 0)
    if score < 8 and rev_count < 2:
        print(f"   🔄 Nota baixa ({score}). Solicitando reescrita. Tentativa {rev_count+1}/2")
        return {"next": "writer"}
        
    print("   ✅ Processo concluído com sucesso.")
    return {"next": "END"}

# 📚 AGENTE 2: PESQUISADOR
async def researcher_node(state: AgentState):
    print("🔎 [RESEARCHER] Buscando jurisprudência...")
    query = f"{state['doc_type']} {state['input_text'][:50]}"
    
    results = await search_jurisprudence(query)
    formatted_results = "\n".join([f"- {r['title']}: {r['snippet']}" for r in results])
    
    return {
        "research_results": formatted_results or "Nenhuma jurisprudência encontrada."
    }

# 🧮 AGENTE 3: CALCULISTA
def calculator_node(state: AgentState):
    print("💰 [CALCULATOR] Processando valores...")
    
    c_data = state.get("client_data", {})
    birth_date = c_data.get("child_birth_date") or "2024-01-01"
    
    table, total = generate_payment_table(birth_date)
    summary = f"Valor Total da Causa: R$ {total}. Tabela com {len(table)} competências."
    
    return {
        "calc_results": summary
    }

# ✍️ AGENTE 4: ESCRITOR
def writer_node(state: AgentState):
    print("✍️ [WRITER] Redigindo a petição...")
    
    feedback = state.get("review_comments", "")
    if feedback:
        print(f"   ⚠️ Aplicando correções do Revisor: {feedback}")

    # Lógica do prompt (Banco vs Hardcoded) - Mantida da nossa última conversa
    instruction_from_db = state.get("system_instruction")
    base_prompt = instruction_from_db if (instruction_from_db and len(instruction_from_db) > 10) else \
        "Você é um Advogado Previdenciário Sênior. Redija a peça jurídica final preenchendo o schema JSON rigorosamente."

    # --- NOVO TRECHO DO PROMPT ---
    data_correction_instruction = """
    TAREFA EXTRA - SANITIZAÇÃO DE DADOS:
    Analise o JSON 'client_data' fornecido no input. Verifique se há erros de digitação, 
    capitalização ou gramática nos nomes, endereços e profissão.
    Se encontrar erros (ex: "rua das flores" -> "Rua das Flores", "lauradora" -> "Lavradora"),
    PREENCHA o campo 'dados_cadastrais_corrigidos' apenas com os campos corrigidos.
    Se estiver tudo correto, deixe esse campo como null.
    """

    system_prompt = f"""{base_prompt}
    
    {data_correction_instruction}

    1. Use a JURISPRUDÊNCIA fornecida para fundamentar.
    2. Use os CÁLCULOS fornecidos para os pedidos.
    3. Se houver CRÍTICAS da revisão anterior, corrija o texto.
    
    Contexto Jurídico: {{research}}
    Dados Financeiros: {{calcs}}
    Críticas Anteriores: {{feedback}}"""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "Caso: {input}\nTipo: {doc_type}")
    ])
    
    structured_llm = llm.with_structured_output(PeticaoAIOutput)
    chain = prompt | structured_llm
    
    # --- AQUI ESTAVA O ERRO: A EXECUÇÃO FOI RECUPERADA ---
    result = chain.invoke({
        "research": state.get("research_results"),
        "calcs": state.get("calc_results"),
        "feedback": feedback,
        "input": state["input_text"],
        "doc_type": state["doc_type"]
    })
    
    return {
        "draft": result,
        "revision_count": state.get("revision_count", 0) + 1,
        "quality_score": 0, # Reseta para forçar revisão
        "review_comments": "" 
    }

# 🕵️ AGENTE 5: REVISOR
def reviewer_node(state: AgentState):
    print("⚖️ [REVIEWER] Analisando qualidade...")
    
    draft = state["draft"]
    
    check_prompt = ChatPromptTemplate.from_messages([
        ("system", """Você é um Juiz Federal rigoroso. Analise o resumo dos fatos e provas.
        Se estiver bom, responda apenas 'APROVADO'.
        Se estiver ruim, incompleto ou alucinado, liste os erros resumidamente."""),
        ("human", f"Resumo: {draft.resumo_fatos}\nProvas: {draft.lista_provas}")
    ])
    
    response = llm.invoke(check_prompt.format_messages())
    content = response.content.strip()
    
    if "APROVADO" in content.upper():
        score = 10
        comments = ""
    else:
        score = 5 
        comments = content
        print(f"   ❌ Crítica encontrada: {comments[:50]}...")
        
    return {
        "quality_score": score, 
        "review_comments": comments
    }

# --- 3. MONTAGEM DO GRAFO ---

workflow = StateGraph(AgentState)

workflow.add_node("orchestrator", orchestrator_node)
workflow.add_node("researcher", researcher_node)
workflow.add_node("calculator", calculator_node)
workflow.add_node("writer", writer_node)
workflow.add_node("reviewer", reviewer_node)

workflow.set_entry_point("orchestrator")

def decide_next(state):
    return state["next"]

workflow.add_conditional_edges(
    "orchestrator",
    decide_next,
    {
        "researcher": "researcher",
        "calculator": "calculator",
        "writer": "writer",
        "reviewer": "reviewer",
        "END": END
    }
)

# Arestas de retorno
workflow.add_edge("researcher", "orchestrator")
workflow.add_edge("calculator", "orchestrator")
workflow.add_edge("writer", "orchestrator")
workflow.add_edge("reviewer", "orchestrator")

app_graph = workflow.compile()