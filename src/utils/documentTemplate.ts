// src/utils/documentTemplate.ts

export const buildHtml = (aiData: any, clientData: any, officeData: any, signers: any[]) => {

    // Função auxiliar para calcular idade
    const calculateAge = (birthDate: string) => {
        if (!birthDate) return 'Não inf.';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age + ' anos';
    };

    // 1. Cabeçalho do Escritório (Se existir)
    const headerHtml = officeData ? `
    <div style="text-align: center; font-family: sans-serif; margin-bottom: 20px;">
      <h3 style="margin: 0; text-transform: uppercase; color: #000;">${officeData.name}</h3>
      <p style="margin: 2px 0; font-size: 10pt; color: #333;">
        ${officeData.address || ''} <br>
        ${officeData.phone || ''} | ${officeData.website || ''}
      </p>
      <hr style="border: 1px solid #000; margin-top: 10px;">
    </div>
  ` : '';

    // 2. Checkboxes de Prioridade (Visual Idêntico ao PDF)
    const check = (val: boolean) => val ? "X" : "&nbsp;&nbsp;";
    const priorityBox = `
    <div style="border: 1px solid #000; padding: 10px; margin: 15px 0; width: fit-content; font-size: 11pt;">
      <b>Prioridade Legal na tramitação processual:</b><br>
      ( ${check(aiData.prioridades?.idoso)} ) Idoso(a) maior de 60 anos - Lei 10.741/2003<br>
      ( ${check(aiData.prioridades?.deficiente)} ) Deficiente - Lei 12.008/2009<br>
      ( ${check(aiData.prioridades?.menor)} ) Menor nos termos do ECA - Lei 8.069/1990
    </div>
  `;

    // 3. Linhas da Tabela de Cálculo
    // O template já formata como moeda caso a IA mande número puro
    const formatCurrency = (val: string | number) => {
        if (typeof val === 'string' && val.includes('R$')) return val;
        return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const calcRows = aiData.tabela_calculo?.map((row: any) => `
    <tr>
      <td style="border: 1px solid #000; padding: 5px;">${row.competencia}</td>
      <td style="border: 1px solid #000; padding: 5px;">${formatCurrency(row.valor_base)}</td>
      <td style="border: 1px solid #000; padding: 5px;">${formatCurrency(row.valor_reajustado)}</td>
    </tr>
  `).join('') || '';

    // 4. Assinaturas (Centralizadas e Lado a Lado se couber)
    const signersHtml = signers.map(s => `
    <div style="display: inline-block; margin: 0 20px; text-align: center; vertical-align: top; min-width: 200px;">
      <p style="margin-bottom: 30px;">_____________________________</p>
      <b>${s.full_name}</b><br>
      OAB ${s.oab || '...'}
    </div>
  `).join('');

    // 5. Soma Total (Cálculo no Frontend para garantir precisão)
    const totalValue = aiData.tabela_calculo?.reduce((acc: number, r: any) => {
        // Tenta limpar R$ e converter
        const valStr = String(r.valor_reajustado).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        const val = parseFloat(valStr);
        return acc + (isNaN(val) ? 0 : val);
    }, 0) || 0;

    const totalFormatted = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // === MONTAGEM FINAL DO DOCUMENTO HTML ===
    return `
    <div style="font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; line-height: 1.5;">
      
      ${headerHtml}

      <p style="font-weight: bold; text-transform: uppercase; margin-bottom: 20px;">
        AO JUÍZO FEDERAL DA VARA DO JUIZADO ESPECIAL FEDERAL DA SUBSEÇÃO JUDICIÁRIA DE ${aiData.end_cidade_uf || 'COMPETENTE'}
      </p>

      <div style="margin: 20px 0; font-weight: bold; text-transform: uppercase;">
        SEGURADO ESPECIAL <br> JUÍZO 100% DIGITAL
      </div>

      ${priorityBox}

      <p style="text-align: justify; margin-top: 20px;">
        <b>${clientData.name.toUpperCase()}</b>, ${clientData.nationality}, ${clientData.marital_status}, ${clientData.profession}, 
        nascida em ${new Date(clientData.birth_date).toLocaleDateString('pt-BR')}, portadora do CPF nº ${clientData.cpf} e RG nº ${clientData.rg} (${clientData.rg_issuer}), 
        residente e domiciliada em ${clientData.address}, por seus procuradores infra-assinados, vem respeitosamente à presença de Vossa Excelência propor a presente
      </p>

      <h2 style="text-align: center; margin: 20px 0; text-transform: uppercase;">AÇÃO PREVIDENCIÁRIA DE CONCESSÃO DE SALÁRIO-MATERNIDADE<br>(SEGURADA ESPECIAL – AGRICULTORA)</h2>

      <p style="margin-bottom: 20px;">
        em face do <b>INSTITUTO NACIONAL DO SEGURO SOCIAL – INSS</b>, autarquia federal, pelos motivos fáticos e jurídicos a seguir expendidos:
      </p>

      <h3>I. PRELIMINAR – GRATUIDADE DA JUSTIÇA</h3>
      <p>Nos termos do art. 5º, LXXIV da Constituição Federal e art. 98 do CPC, a Autora requer a concessão da gratuidade da justiça, por ser pobre na acepção jurídica do termo, não podendo arcar com as custas processuais sem prejuízo de seu sustento e de sua família.</p>

      <h3>II. QUADRO SINÓPTICO</h3>
      <table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin: 20px 0; font-size: 10pt;">
        <tr><td style="background: #f0f0f0; width: 40%;"><b>NOME</b></td><td>${clientData.name}</td></tr>
        <tr><td style="background: #f0f0f0;"><b>IDADE NO REQ. ADM.</b></td><td>${calculateAge(clientData.birth_date)}</td></tr>
        <tr><td style="background: #f0f0f0;"><b>PEDIDO</b></td><td>Salário-Maternidade (Segurada Especial)</td></tr>
        <tr><td style="background: #f0f0f0;"><b>CRIANÇA</b></td><td>${clientData.child_name} (Nasc: ${new Date(clientData.child_birth_date).toLocaleDateString('pt-BR')})</td></tr>
        <tr><td style="background: #f0f0f0;"><b>DER / NB</b></td><td>${new Date(clientData.der).toLocaleDateString('pt-BR')} / ${clientData.nb}</td></tr>
        <tr><td style="background: #f0f0f0;"><b>SITUAÇÃO / DECISÃO</b></td><td>${clientData.benefit_status} (Indeferido em ${new Date(clientData.denied_date).toLocaleDateString('pt-BR')})</td></tr>
        <tr><td style="background: #f0f0f0;"><b>MOTIVO DO INDEFERIMENTO</b></td><td>${clientData.decision_reason}</td></tr>
        <tr><td style="background: #f0f0f0;"><b>CARÊNCIA ANTES DO PARTO</b></td><td>${clientData.activity_before_birth}</td></tr>
        <tr><td style="background: #f0f0f0;"><b>PERÍODO DECLARADO</b></td><td>${clientData.special_insured_period}</td></tr>
        <tr><td style="background: #f0f0f0;"><b>PONTO CONTROVERTIDO</b></td><td>${clientData.controversial_point}</td></tr>
      </table>

      <h3>III. SÍNTESE FÁTICA</h3>
      ${aiData.resumo_fatos}

      <h3>IV. DAS PROVAS</h3>
      <p>A Autora apresenta a seguinte documentação que comprova sua atividade rural:</p>
      <ul>
        ${clientData.evidence_list ? clientData.evidence_list.split('\n').map((e: string) => `<li>${e}</li>`).join('') : '<li>Documentos em anexo.</li>'}
      </ul>
      <p>Conforme Súmula 73 da TNU, as provas em nome do cônjuge estendem-se à autora.</p>

      <h3>V. FUNDAMENTAÇÃO JURÍDICA</h3>
      ${aiData.fundamentacao}

      <h3>VI. PEDIDOS</h3>
      <ul>
        ${aiData.pedidos?.map((p: string) => `<li>${p}</li>`).join('')}
      </ul>

      <h3>VII. DO VALOR DA CAUSA</h3>
      <p>Dá-se à causa o valor de <b>${totalFormatted}</b> (${aiData.valor_causa_extenso}), correspondente às parcelas vencidas e vincendas conforme planilha:</p>
      
      <table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin: 10px 0; text-align: center;">
        <tr style="background: #f0f0f0; font-weight: bold;">
            <td>Competência</td><td>Valor Base</td><td>Valor Reajustado</td>
        </tr>
        ${calcRows}
        <tr style="font-weight: bold;"><td colspan="2" style="text-align: right; padding-right: 10px;">TOTAL</td><td>${totalFormatted}</td></tr>
      </table>

      <div style="margin-top: 60px; text-align: center;">
        <p>Termos em que, pede deferimento.</p>
        <p>${aiData.end_cidade_uf || 'Local'}, ${new Date().toLocaleDateString('pt-BR')}.</p>
        <br><br>
        ${signersHtml}
      </div>

    </div>
  `;
};