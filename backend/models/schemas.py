from pydantic import BaseModel, Field
from typing import List, Optional, Any

# --- 1. NOVO MODELO: Correção de Dados Cadastrais ---
class DadosCadastraisCorrigidos(BaseModel):
    name: Optional[str] = Field(None, description="Nome corrigido (Capitalização correta)")
    address: Optional[str] = Field(None, description="Logradouro corrigido (ex: Rua, Av.)")
    neighborhood: Optional[str] = Field(None, description="Bairro corrigido")
    city: Optional[str] = Field(None, description="Cidade corrigida")
    state: Optional[str] = Field(None, description="UF (Sigla)")
    # Se você tiver profissão no formulário, adicione aqui. 
    # Vou assumir que profissão muitas vezes vem nos 'details' ou num campo específico
    profession: Optional[str] = Field(None, description="Profissão corrigida (ex: Lavradora)")

# --- 2. Modelo de Correção Textual (MANTIDO) ---
class CorrecaoItem(BaseModel):
    original: str = Field(description="Trecho original com erro")
    correto: str = Field(description="Versão corrigida")

# --- 3. Dados Técnicos (MANTIDO) ---
class DadosTecnicos(BaseModel):
    motivo_indeferimento: str = Field(description="Motivo formal corrigido")
    tempo_atividade: str = Field(description="Tempo de atividade corrigido")
    periodo_rural_declarado: str = Field(description="Ex: Desde os 12 anos até a atualidade")
    ponto_controvertido: str = Field(description="Ex: Qualidade de Segurado Especial")
    beneficio_anterior: str = Field(description="Ex: Não consta")
    cnis_averbado: str = Field(description="Ex: Não constam vínculos")
    vinculo_urbano: str = Field(description="Ex: Nunca exerceu atividade urbana")
    profissao_formatada: str = Field(description="Ex: Agricultora (Economia Familiar)")

# --- 4. SAÍDA DA IA (ATUALIZADO) ---
class PeticaoAIOutput(BaseModel):
    preliminares: Optional[str] = Field(None, description="HTML com preliminares")
    resumo_fatos: str
    dados_tecnicos: DadosTecnicos
    lista_provas: List[str]
    correcoes: List[CorrecaoItem] = Field(default_factory=list)
    
    # NOVO CAMPO: A IA preencherá isso se encontrar erros no cadastro
    dados_cadastrais_corrigidos: Optional[DadosCadastraisCorrigidos] = Field(
        None, 
        description="Objeto contendo APENAS os campos cadastrais que precisaram de correção (ex: 'lauradora' -> 'Lavradora')"
    )

# --- Modelos da API ---
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
    agentSlug: str
    docType: str
    clientName: str
    details: str
    clientData: ClientData

class GenerateResponse(BaseModel):
    resumo_fatos: str
    preliminares: Optional[str] = None
    dados_tecnicos: dict
    lista_provas: List[str]
    inss_address: Optional[str] = None
    end_cidade_uf: str = ""
    jurisdiction: Optional[dict] = None
    correcoes: List[CorrecaoItem] = [] 
    
    # NOVO CAMPO NA RESPOSTA DA API
    dados_cadastrais: Optional[dict] = None # Frontend receberá isso
    
    jurisprudencias_selecionadas: List[dict]
    tabela_calculo: List[Any] = []
    valor_causa_extenso: str = "A calcular"