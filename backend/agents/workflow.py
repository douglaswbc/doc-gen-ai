import os
from typing import TypedDict, Optional
from dotenv import load_dotenv

# --- ATENÇÃO AOS IMPORTS NOVOS ---
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from models.schemas import PeticaoAIOutput # Import direto de models

load_dotenv()

class AgentState(TypedDict):
    input_text: str
    doc_type: str
    final_output: Optional[PeticaoAIOutput]

def writer_node(state: AgentState):
    api_key = os.getenv("OPENAI_API_KEY")
    # Se não tiver chave, usa um mock para não quebrar o teste
    if not api_key:
        print("⚠️ AVISO: OPENAI_API_KEY não encontrada. Usando modo simulação.")
        return {
            "final_output": PeticaoAIOutput(
                resumo_fatos="Simulação: Fatos processados com sucesso.",
                lista_provas=["Prova A", "Prova B"],
                dados_tecnicos={
                    "motivo_indeferimento": "Simulado", "tempo_atividade": "10 anos",
                    "periodo_rural_declarado": "2010-2024", "ponto_controvertido": "Qualidade",
                    "beneficio_anterior": "Não", "cnis_averbado": "Não",
                    "vinculo_urbano": "Não", "profissao_formatada": "Agricultora"
                }
            )
        }

    llm = ChatOpenAI(model="gpt-4-turbo", temperature=0.2, openai_api_key=api_key)
    structured_llm = llm.with_structured_output(PeticaoAIOutput)

    prompt = ChatPromptTemplate.from_messages([
           ("system", """Você é um advogado previdenciário sênior com redação impecável. 
           Sua tarefa é:
           1. Corrigir o português e normalizar a escrita (nomes devem começar com maiúsculas, remover gírias, corrigir erros de digitação).
           2. Se encontrar erros nos campos originais, retorne-os na lista 'correcoes' (ex: [{{"original": "pedro", "correto": "Pedro" }}]).
           3. Redigir as 'preliminares' em formato HTML (usando tags <p>, <b>). Se houver pedidos de gratuidade, prioridade ou teses específicas (como uso de provas do cônjuge), desenvolva-as formalmente.
           4. Redigir o 'resumo_fatos' de forma profissional e persuasiva.
           5. Estruturar os 'dados_tecnicos' e 'lista_provas' conforme os argumentos fornecidos.
           
           IMPORTANTE: O tom deve ser formal, técnico e livre de erros. Use terminologia jurídica correta."""),
        ("human", "Ação: {doc_type}\nDados: {input_text}")
    ])

    chain = prompt | structured_llm
    response = chain.invoke({"doc_type": state["doc_type"], "input_text": state["input_text"]})
    
    return {"final_output": response}

workflow = StateGraph(AgentState)
workflow.add_node("writer", writer_node)
workflow.set_entry_point("writer")
workflow.add_edge("writer", END)

app_graph = workflow.compile()