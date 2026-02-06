from pydantic import BaseModel, Field
from typing import List, Optional, Any

# --- Modelos Internos da IA ---
class DadosTecnicos(BaseModel):
    motivo_indeferimento: str = Field(description="Motivo formal corrigido")
    tempo_atividade: str = Field(description="Tempo de atividade corrigido")
    periodo_rural_declarado: str = Field(description="Ex: Desde os 12 anos até a atualidade")
    ponto_controvertido: str = Field(description="Ex: Qualidade de Segurado Especial")
    beneficio_anterior: str = Field(description="Ex: Não consta")
    cnis_averbado: str = Field(description="Ex: Não constam vínculos")
    vinculo_urbano: str = Field(description="Ex: Nunca exerceu atividade urbana")
    profissao_formatada: str = Field(description="Ex: Agricultora (Economia Familiar)")

class PeticaoAIOutput(BaseModel):
    preliminares: Optional[str] = Field(None, description="HTML com as preliminares (Justiça Gratuita, Prioridades, etc)")
    resumo_fatos: str
    dados_tecnicos: DadosTecnicos
    lista_provas: List[str]
    correcoes: List[dict] = []

# --- Modelos da API (Entrada/Saída) ---
class ClientData(BaseModel):
    name: str
    cpf: Optional[str] = None
    birth_date: Optional[str] = None
    zip_code: Optional[str] = None
    address: str
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    details: str
    child_birth_date: Optional[str] = None
    children: Optional[List[dict]] = None
    class Config:
        extra = "allow"

class GenerateRequest(BaseModel):
    agentName: str
    docType: str
    clientName: str
    details: str
    clientData: ClientData

class GenerateResponse(BaseModel):
    resumo_fatos: str
    dados_tecnicos: dict
    lista_provas: List[str]
    inss_address: str
    end_cidade_uf: str = ""
    jurisdiction: Optional[dict] = None
    correcoes: List[dict] = []
    jurisprudencias_selecionadas: List[dict]
    tabela_calculo: List[Any] = []
    valor_causa_extenso: str = "A calcular"