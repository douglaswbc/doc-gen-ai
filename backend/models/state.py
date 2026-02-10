from typing import TypedDict, List, Optional, Annotated
from models.schemas import PeticaoAIOutput
import operator

class AgentState(TypedDict):
    # Entradas do Usuário
    input_text: str
    doc_type: str
    client_data: dict  # Dados brutos do cliente
    
    # Memória Compartilhada dos Agentes
    jurisprudence_found: List[dict] # Resultado do Agente Pesquisador
    calculation_data: dict          # Resultado do Agente Calculista
    
    # Controle de Fluxo
    next_step: str                  # Onde ir agora?
    revision_count: int             # Para evitar loops infinitos
    
    # Saída Final
    final_output: Optional[PeticaoAIOutput]