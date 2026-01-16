import asyncio
from fastapi import APIRouter, HTTPException

from models.schemas import GenerateRequest, GenerateResponse
from agents.workflow import app_graph
from services.search import search_inss_address, search_jurisprudence
from services.calculations import generate_payment_table, get_valor_extenso

router = APIRouter()

@router.post("/generate", response_model=GenerateResponse)
async def generate_document(request: GenerateRequest):
    print(f"🚀 [API] Iniciando: {request.clientName}")

    try:
        # 1. PARALELISMO: Buscas Externas (Serper)
        print("🔍 Buscando INSS e Jurisprudência...")
        inss_task = search_inss_address(request.clientData.address)
        juris_task = search_jurisprudence(f"{request.docType} rural recentes")
        
        inss_address, raw_jurisprudencias = await asyncio.gather(inss_task, juris_task)

        # 2. CÁLCULOS FINANCEIROS
        print("💰 Realizando cálculos...")
        # Tenta pegar a data de nascimento da criança do form ou usa a data atual como fallback
        data_nascimento = getattr(request.clientData, 'child_birth_date', None)
        
        tabela, valor_total = generate_payment_table(data_nascimento)
        valor_extenso = get_valor_extenso(valor_total)

        # 3. INTELIGÊNCIA ARTIFICIAL (LangGraph)
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
            "doc_type": request.docType
        })
        
        ai_data = result["final_output"]

        # 4. FORMATAÇÃO FINAL
        juris_formatada = [
            {"tribunal": j["title"], "ementa": j["snippet"], "referencia": j["link"]}
            for j in raw_jurisprudencias
        ]

        # Retorna o JSON que o Template.ts do Frontend espera
        return GenerateResponse(
            resumo_fatos=ai_data.resumo_fatos,
            dados_tecnicos=ai_data.dados_tecnicos.model_dump(),
            lista_provas=ai_data.lista_provas,
            
            # Dados enriquecidos pelo Python:
            inss_address=inss_address,
            jurisprudencias_selecionadas=juris_formatada[:3],
            tabela_calculo=tabela,
            valor_causa_extenso=valor_extenso
        )

    except Exception as e:
        print(f"❌ Erro Crítico: {e}")
        import traceback
        traceback.print_exc() # Mostra o erro real no terminal
        raise HTTPException(status_code=500, detail=str(e))