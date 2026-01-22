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
           ("system", "Você é um advogado previdenciário sênior. Corrija o português e estruture os dados. Se encontrar erros ortográficos ou de formatação nos campos fornecidos (nomes, endereços, profissões, termos técnicos), retorne uma lista chamada 'correcoes' com objetos contendo 'original' e 'correto', por exemplo: [{{\"original\": \"rual\", \"correto\": \"rural\"}}, {{\"original\": \"douglas\", \"correto\": \"Douglas\"}}]. Preserve também os campos estruturados esperados."),
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