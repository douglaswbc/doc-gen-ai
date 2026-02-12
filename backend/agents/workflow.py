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
from models.schemas import PeticaoAIOutput, DadosTecnicos, CorrecaoItem
from services.search import search_jurisprudence
from services.calculations import generate_payment_table

load_dotenv()

# --- 1. DEFINIÇÃO DO ESTADO ---
class AgentState(TypedDict):
    input_text: str
    doc_type: str
    client_data: dict 
    system_instruction: Optional[str]
    
    research_results: str 
    calc_results: str
    
    draft: Optional[PeticaoAIOutput]
    review_comments: str
    quality_score: int
    revision_count: int
    legal_strategy: Optional[str]

# CONFIGURAÇÃO DO MODELO
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# --- 2. AGENTES (NÓS DO GRAFO) ---

# 🧠 ORQUESTRADOR
def orchestrator_node(state: AgentState):
    print("🤖 [ORCHESTRATOR] Analisando estado do processo...")
    
    res = state.get("research_results", "")
    if not res or len(str(res).strip()) < 10:
        return {"next": "researcher"}
    
    # Se não tiver estratégia definida, passa pelo Strategist
    if not state.get("legal_strategy"):
        return {"next": "strategist"}
    
    calc = state.get("calc_results", "")
    if not calc or len(str(calc).strip()) < 5:
        return {"next": "calculator"}
        
    if not state.get("draft"):
        return {"next": "writer"}
        
    score = state.get("quality_score", 0)
    
    # Lógica de fluxo: Writer -> Editor -> Reviewer
    # Como não temos uma flag explícita de "editado", podemos usar o fluxo do grafo.
    # Mas para simplificar a decisão aqui:
    # O grafo abaixo forçará: Writer -> Editor -> Reviewer.
    # O Orquestrador só decide o loop de repetição.
    
    if score == 0:
        return {"next": "reviewer"}
        
    rev_count = state.get("revision_count", 0)
    if score < 8 and rev_count < 2:
        print(f"   🔄 Nota baixa ({score}). Solicitando reescrita. Tentativa {rev_count+1}/2")
        return {"next": "writer"}
        
    print("   ✅ Processo concluído com sucesso.")
    return {"next": "END"}

# 📚 PESQUISADOR
async def researcher_node(state: AgentState):
    print("🔎 [RESEARCHER] Buscando jurisprudência...")
    query = f"{state['doc_type']} {state['input_text'][:50]}"
    results = await search_jurisprudence(query)
    formatted_results = "\n".join([f"- {r['title']}: {r['snippet']}" for r in results])
    return {"research_results": formatted_results or "Nenhuma jurisprudência encontrada."}

# ♟️ ESTRATEGISTA (NOVO)
def strategist_node(state: AgentState):
    print("♟️ [STRATEGIST] Definindo estratégia processual...")
    
    input_text = state.get("input_text", "").lower()
    client_data = state.get("client_data", {})
    specific_details = str(client_data.get("specific_details", "")).lower()
    
    # Combine input text and specific details for broader keyword search
    full_text_analysis = f"{input_text} {specific_details}"
    
    strategy_points = []
    
    # 1. Gratuidade de Justiça (Padrão para segurado especial)
    strategy_points.append("PEDIR GRATUIDADE DE JUSTIÇA: Cliente hipossuficiente. Art. 98 CPC.")
    
    # 2. Coisa Julgada (Antigo processo sem resolução de mérito)
    # Palavras-chave: processo anterior, ajuizou, extinto, sem resolução, falta de procuração
    keywords_cj = ["processo anterior", "ajuizou", "extinto", "sem resolução", "falta de procuração", "indefereimento", "já entrou", "acao idêntica", "acao identica", "coisa julgada"]
    
    prev_benefit = str(client_data.get("previous_benefit", "")).lower()
    has_prev_indication = prev_benefit and len(prev_benefit) > 3 and "não consta" not in prev_benefit and "nada consta" not in prev_benefit
    
    if any(k in full_text_analysis for k in keywords_cj) or has_prev_indication:
        strategy_points.append(
            "PRELIMINAR DE NÃO INCIDÊNCIA DE COISA JULGADA: "
            "Identificado indício de processo anterior (administrativo ou judicial) extinto ou indeferido. "
            "Argumentar que a extinção anterior foi SEM resolução de mérito (apenas formalmente, ex: falta de procuração ou carência). "
            "Citar CPC Art. 486. A parte tem direito a propor nova ação corrigida."
        )

    # 3. Pedidos Liminares / Tutela
    if "liminar" in full_text_analysis or "tutela" in full_text_analysis or "urgência" in full_text_analysis:
        strategy_points.append("PEDIR TUTELA DE URGÊNCIA: Demonstrar perigo de dano e probabilidade do direito.")
        
    # 3. Prioridade de Tramitação
    # Verifica idade ou deficiência nos dados ou input
    if "idoso" in full_text_analysis or client_data.get("age", 0) > 60:
         strategy_points.append("PEDIR PRIORIDADE DE TRAMITAÇÃO (IDOSO). Estatuto do Idoso.")
         
    strategy_text = "\n".join(strategy_points)
    print(f"   🎯 Estratégia definida: {strategy_text}")
    
    return {"legal_strategy": strategy_text}

# 🧮 CALCULISTA
def calculator_node(state: AgentState):
    print("💰 [CALCULATOR] Processando valores...")
    c_data = state.get("client_data", {})
    birth_date = c_data.get("child_birth_date") or "2024-01-01"
    table, total = generate_payment_table(birth_date)
    summary = f"Valor Total da Causa: R$ {total}. Tabela com {len(table)} competências."
    return {"calc_results": summary}

# ✍️ ESCRITOR (JURÍDICO)
def writer_node(state: AgentState):
    print("✍️ [WRITER] Redigindo a petição...")
    
    feedback = state.get("review_comments", "")
    if feedback:
        print(f"   ⚠️ Aplicando correções do Revisor: {feedback}")

    instruction_from_db = state.get("system_instruction")
    base_prompt = instruction_from_db if (instruction_from_db and len(str(instruction_from_db)) > 10) else \
        "Você é um Advogado Previdenciário Sênior. Redija a peça jurídica final preenchendo o schema JSON rigorosamente."

    data_correction_instruction = """
    TAREFA EXTRA - SANITIZAÇÃO DE DADOS:
    Analise o JSON 'client_data' fornecido.
    1. Campos Simples: Corrija 'name', 'address', 'profession' (ex: "lauradora" -> "Lavradora").
    2. Listas: Corrija nomes em 'children', 'evidence_list'.
    Preencha 'dados_cadastrais_corrigidos' APENAS com os campos alterados.
    """

    system_prompt = f"""{base_prompt}
    
    {data_correction_instruction}

    
    {data_correction_instruction}

    Contexto Jurídico: {{research}}
    Estratégia Processual: {{strategy}}
    Dados Financeiros: {{calcs}}
    Críticas Anteriores: {{feedback}}
    
    **INSTRUÇÃO ESPECIAL PARA PRELIMINARES (CRÍTICO)**:
    Use a 'Estratégia Processual' acima para preencher o campo 'preliminares'.
    O campo 'preliminares' NÃO pode ser vazio.
    FORMATO OBRIGATÓRIO (HTML):
    Use `<h3>I.1 – TÍTULO DA PRELIMINAR</h3>` para cada tópico.
    Exemplo:
    `<h3>I.1 – DA GRATUIDADE DA JUSTIÇA</h3><p>Texto...</p>`
    `<h3>I.2 – DA NÃO INCIDÊNCIA DE COISA JULGADA</h3><p>Texto...</p>`

    **INSTRUÇÃO SOBRE PROVAS (DEDUPLICAÇÃO)**:
    No campo `lista_provas`, NÃO inclua "Certidão de Nascimento" ou "Título de Eleitor/Certidão Eleitoral".
    Esses documentos já são inseridos automaticamente pelo sistema.
    Liste apenas OUTRAS provas citadas no contexto ou inferidas (ex: Carteira de Sindicato, Notas Fiscais, Ficha de Atendimento, Comprovante de Residência, etc).
    """

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "Caso: {input}\nTipo: {doc_type}")
    ])
    
    structured_llm = llm.with_structured_output(PeticaoAIOutput)
    chain = prompt | structured_llm
    
    result = chain.invoke({
        "research": state.get("research_results"),
        "strategy": state.get("legal_strategy"),
        "calcs": state.get("calc_results"),
        "calcs": state.get("calc_results"),
        "feedback": feedback,
        "input": state["input_text"],
        "doc_type": state["doc_type"]
    })
    
    return {
        "draft": result,
        "revision_count": state.get("revision_count", 0) + 1,
        "quality_score": 0,
        "review_comments": "" 
    }

# 📝 AGENTE NOVO: EDITOR (GRAMÁTICA E ESTILO)
def editor_node(state: AgentState):
    print("E [EDITOR] Revisando gramática e estilo...")
    
    draft = state["draft"]
    
    # Prompt focado puramente na língua portuguesa
    system_prompt = """Você é um Revisor Gramatical implacável de um escritório de advocacia de alto nível.
    Sua tarefa é polir o texto jurídico gerado, garantindo:
    1. Concordância nominal e verbal perfeita.
    2. Uso correto de crase e pontuação.
    3. Substituição de termos repetitivos por sinônimos elegantes.
    4. Clareza e coesão textual.
    
    NÃO altere os fatos, datas ou valores. Apenas a forma do texto.
    Retorne o MESMO objeto JSON, mas com os campos de texto ('resumo_fatos') aprimorados.
    """
    
    # Criamos um prompt que recebe o objeto Draft e pede o mesmo objeto de volta, mas melhorado
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "Corrija este rascunho: {draft_json}")
    ])
    
    structured_llm = llm.with_structured_output(PeticaoAIOutput)
    chain = prompt | structured_llm
    
    # Passamos o dump do modelo atual para ele reescrever
    improved_draft = chain.invoke({
        "draft_json": draft.model_dump_json()
    })
    
    return {"draft": improved_draft}

# 🕵️ REVISOR (JURÍDICO)
def reviewer_node(state: AgentState):
    print("⚖️ [REVIEWER] Analisando qualidade jurídica...")
    
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
workflow.add_node("strategist", strategist_node) # <--- NOVO NÓ
workflow.add_node("calculator", calculator_node)
workflow.add_node("writer", writer_node)
workflow.add_node("editor", editor_node)   # <--- NOVO NÓ
workflow.add_node("reviewer", reviewer_node)

workflow.set_entry_point("orchestrator")

def decide_next(state):
    return state["next"]

workflow.add_conditional_edges(
    "orchestrator",
    decide_next,
    {
        "researcher": "researcher",
        "strategist": "strategist",
        "calculator": "calculator",
        "writer": "writer",
        "reviewer": "reviewer", # Nota: O Orchestrator manda pro Reviewer se score == 0...
        "END": END
    }
)

# FLUXO AJUSTADO:
workflow.add_edge("researcher", "orchestrator")
workflow.add_edge("strategist", "orchestrator")
workflow.add_edge("calculator", "orchestrator")

# AQUI ESTÁ A MUDANÇA PRINCIPAL NO FLUXO:
# Writer -> Editor -> Reviewer -> Orchestrator
# Quando o Writer termina, ele manda para o Editor.
# Quando o Editor termina, ele manda para o Reviewer (para ver se a edição não quebrou nada jurídico).
# O Reviewer manda para o Orchestrator (que decide se aprova ou manda reescrever).

workflow.add_edge("writer", "editor")  # Writer passa para Editor
workflow.add_edge("editor", "orchestrator") # Editor volta pro Orquestrador?
# Melhor: Writer -> Editor -> Orchestrator (que vai ver score 0 e mandar pro Reviewer)
# Mas o Orchestrator vai ver 'score=0' e mandar pro 'reviewer'. 
# O problema é: O writer reseta o score para 0.
# Se Writer -> Editor -> Orchestrator -> Reviewer, funciona.

workflow.add_edge("editor", "orchestrator") # Editor devolve pro Orquestrador
workflow.add_edge("reviewer", "orchestrator")

app_graph = workflow.compile()