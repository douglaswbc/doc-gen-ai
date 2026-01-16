// src/utils/templates/salarioMaternidade.ts

import { moneyToWords } from '../numberToWords';

/**
 * Interface simples para o Template
 */
interface AgentTemplate {
  render: (
    aiData: any, 
    clientData: any, 
    officeData: any, 
    signers: any[], 
    generatorInfo?: { name: string; id: string }
  ) => string;
}

/**
 * Template HTML Otimizado para Exportação Word
 */
export const template: AgentTemplate = {
  render: (aiData: any, clientData: any, officeData: any, signers: any[], generatorInfo?: { name: string; id: string }) => {

    // === GERAÇÃO DE ID ÚNICO ===
    const generateDocId = () => {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `DOC-${timestamp}-${randomChars}`;
    };
    const documentId = generateDocId();
    const generatedAt = new Date().toLocaleString('pt-BR');

    // === HELPERS ===
    const formatMoney = (val: number | string) => {
      if (!val) return 'R$ 0,00';
      const num = typeof val === 'string'
        ? parseFloat(val.replace(/[^\d,-]/g, '').replace(',', '.'))
        : val;
      return (isNaN(num) ? 0 : num).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '...';
      try {
        if (dateStr.includes('/')) return dateStr;
        const date = new Date(dateStr);
        // Ajuste de timezone
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
        return isNaN(date.getTime()) ? dateStr : adjustedDate.toLocaleDateString('pt-BR');
      } catch (e) { return dateStr; }
    };

    const calculateAge = (birthDate: string) => {
      if (!birthDate) return '';
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return `${age} anos`;
    };

    const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

    // === 1. CABEÇALHO (ESTRUTURA DE TABELA PARA WORD) ===
    const headerHtml = officeData ? `
    <table width="100%" style="width: 100%; border-bottom: 2px solid #000; margin-bottom: 20px;" cellspacing="0" cellpadding="0">
      <tr>
        <td style="width: 80px; vertical-align: middle; padding-bottom: 10px;">
          ${officeData.logo_url
            ? `<img src="${officeData.logo_url}" width="70" height="70" style="width: 70px; height: 70px; object-fit: contain;" alt="Logo" />`
            : `<div style="width: 70px; height: 70px; background: #f0f0f0;"></div>`
          }
        </td>
        <td style="vertical-align: middle; padding-left: 10px; padding-bottom: 10px;">
          <p style="margin: 0; font-size: 16pt; font-weight: bold; text-transform: uppercase; color: #000;">${officeData.name}</p>
          ${officeData.cnpj ? `<p style="margin: 0; font-size: 9pt; color: #666;">CNPJ: ${officeData.cnpj}</p>` : ''}
          
          <div style="margin-top: 5px; font-size: 9pt; color: #444;">
            ${officeData.address ? `<span>${officeData.address}${officeData.city ? `, ${officeData.city}` : ''}${officeData.state ? `-${officeData.state}` : ''}</span><br>` : ''}
            <span>
              ${officeData.phone ? `Tel: ${officeData.phone}` : ''}
              ${officeData.email ? ` | ${officeData.email}` : ''}
            </span>
          </div>
          ${officeData.slogan ? `<p style="margin: 5px 0 0 0; font-size: 9pt; font-style: italic; color: #666;">"${officeData.slogan}"</p>` : ''}
        </td>
      </tr>
    </table>
  ` : '';

    // === 2. BLOCO DE PRIORIDADES (TABELA PARA WORD) ===
    const check = (val: boolean) => val ? "X" : "&nbsp;&nbsp;";
    const priorityBox = `
    <table width="100%" style="width: 100%; border: 1px solid #000; margin: 15px 0;" cellspacing="0" cellpadding="5">
      <tr>
        <td>
          <b>Prioridade Legal na tramitação processual:</b><br>
          ( ${check(aiData.prioridades?.idoso)} ) Idoso(a) maior de 60 anos - Lei 10.741/2003<br>
          ( ${check(aiData.prioridades?.deficiente)} ) Deficiente - Lei 12.008/2009 - Laudo em anexo<br>
          ( ${check(aiData.prioridades?.menor)} ) Menor nos termos do ECA - Lei 8.069/1990
        </td>
      </tr>
    </table>
  `;

    // === 3. TABELA DE CÁLCULO (LINHAS COMPACTAS) ===
    let totalValue = 0;
    const calcRows = aiData.tabela_calculo?.map((row: any) => {
      const valorBase = typeof row.valor_base === 'string' ? parseFloat(row.valor_base) : row.valor_base;
      const valorReajustado = typeof row.valor_reajustado === 'string' ? parseFloat(row.valor_reajustado) : row.valor_reajustado;
      totalValue += valorReajustado || 0;

      // Note a classe 'compact-row' e estilos inline para garantir
      return `
    <tr>
      <td style="border: 1px solid #000; padding: 4px;">${row.competencia}</td>
      <td style="border: 1px solid #000; padding: 4px;">${formatMoney(valorBase)}</td>
      <td style="border: 1px solid #000; padding: 4px;">${formatMoney(valorReajustado)}</td>
    </tr>`;
    }).join('') || '<tr><td colspan="3">Cálculo não gerado</td></tr>';

    const valorExtenso = aiData.valor_causa_extenso || moneyToWords(totalValue);

    // === 4. ASSINATURAS ===
    const signersHtml = signers.map(s => `
    <div style="display: inline-block; margin: 0 20px; text-align: center; min-width: 200px; vertical-align: top;">
      <p style="margin-bottom: 30px; color: #000;">_________________________________</p>
      <b style="text-transform: uppercase;">${s.full_name}</b><br>
      <span style="font-size: 10pt;">OAB ${s.oab || '...'}</span>
    </div>
  `).join('');

    // === CSS ESPECIAL PARA WORD ===
    // Word lê styles no head. Importante: "table p { margin: 0 }" remove o espaçamento extra nas tabelas.
    const styles = `
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; line-height: 1.5; }
        p { margin-top: 0; margin-bottom: 12px; text-align: justify; }
        
        /* Tabelas */
        table { border-collapse: collapse; width: 100%; font-size: 11pt; }
        td, th { vertical-align: top; }
        
        /* Correção para Word: Remove margens de parágrafos dentro de tabelas */
        table p { margin: 0; line-height: 1.2; } 
        
        /* Classes utilitárias */
        .data-table td { border: 1px solid #000; padding: 4px 6px; }
        .bg-gray { background-color: #f0f0f0; font-weight: bold; width: 40%; }
        
        h2 { text-align: center; font-size: 14pt; margin: 20px 0; font-weight: bold; }
        h3 { font-size: 12pt; text-transform: uppercase; margin-top: 20px; font-weight: bold; text-decoration: underline; }
      </style>
    `;

    // === HTML FINAL ===
    return `
    <html>
    <head>
      <meta charset="utf-8">
      ${styles}
    </head>
    <body>
      
      ${headerHtml}

      <p align="center" style="font-weight: bold; text-transform: uppercase; margin-bottom: 20px;">
        AO JUÍZO FEDERAL DA VARA DO JUIZADO ESPECIAL FEDERAL DA SUBSEÇÃO JUDICIÁRIA DA COMARCA DE ${aiData.end_cidade_uf || 'COMPETENTE'}.
      </p>

      <div style="text-align: center; font-weight: bold; margin: 20px 0;">
        SEGURADO ESPECIAL <br> JUÍZO 100% DIGITAL
      </div>

      ${priorityBox}

      <p>
        <b>${clientData.name.toUpperCase()}</b>, ${clientData.nationality}, ${clientData.marital_status}, 
        ${aiData.dados_tecnicos?.profissao_formatada || capitalize(clientData.profession) || 'Agricultora'}, 
        nascido(a) em ${formatDate(clientData.birth_date)} (${calculateAge(clientData.birth_date)}), portador(a) do CPF nº ${clientData.cpf} e RG nº ${clientData.rg} (${clientData.rg_issuer || ''}), 
        residente e domiciliado(a) em ${clientData.address}, por meio de seus procuradores infra firmados, 
        com endereço eletrônico em ${officeData?.email || 'custodioadvocacia@gmail.com'}, endereço físico descrito no rodapé da página, 
        onde recebe intimações e notificações, de estilo, vem a ínclita presença de Vossa Excelência, com fulcro no art. 5º, inciso V da CF/88, 
        cumulado com a Lei nº 8.078/90 e demais dispositivo aplicáveis à espécie, propor a presente
      </p>

      <h2>AÇÃO PREVIDENCIÁRIA DE CONCESSÃO DE SALÁRIO MATERNIDADE (RURAL)</h2>

      <p>
        Em face do <b>INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS</b>, pessoa jurídica de direito público, 
        podendo ser citado em sua agência mais próxima localizada à <b>${aiData.inss_address || 'Endereço não localizado'}</b>.
      </p>

      <h3>I. PRELIMINARMENTE</h3>
      ${aiData.preliminares || '<p>Requer a parte Autora os benefícios da gratuidade da justiça, com fulcro no art. 5º, Inciso LXXIV da CF/88 e nos termos da Lei 1.060/50, haja vista declarar-se pobre na forma da lei, não podendo custear a máquina jurisdicional sem prejuízo de seu sustento e o da sua família.</p>'}

      <h3>II. QUADRO SINÓPTICO</h3>
      <p style="font-weight: bold; margin-bottom: 5px;">RESUMO DAS PRINCIPAIS INFORMAÇÕES DO PROCESSO</p>
      
      <table class="data-table" cellspacing="0" cellpadding="4">
        <tr><td class="bg-gray">NOME:</td><td>${clientData.name.toUpperCase()}</td></tr>
        <tr><td class="bg-gray">Idade no Req. Adm.:</td><td>${calculateAge(clientData.birth_date)}</td></tr>
        <tr><td class="bg-gray">Pedido:</td><td>Salário maternidade – segurado especial</td></tr>
        <tr><td class="bg-gray">Criança:</td><td>${capitalize(clientData.child_name)}</td></tr>
        <tr><td class="bg-gray">Data de Nascimento:</td><td>${formatDate(clientData.child_birth_date)}</td></tr>
        <tr><td class="bg-gray">Data do Req. Adm:</td><td>${formatDate(clientData.der)}</td></tr>
        <tr><td class="bg-gray">NB:</td><td>${clientData.nb}</td></tr>
        <tr><td class="bg-gray">Situação do Benefício:</td><td>${capitalize(clientData.benefit_status)}</td></tr>
        <tr><td class="bg-gray">Data do Indef. Adm:</td><td>${formatDate(clientData.denied_date)}</td></tr>
        
        <tr>
            <td class="bg-gray">Motivo da Decisão do INSS:</td>
            <td>${aiData.dados_tecnicos?.motivo_indeferimento || capitalize(clientData.decision_reason)}</td>
        </tr>
        <tr>
            <td class="bg-gray">Tempo de Trabalho Rural:</td>
            <td>${aiData.dados_tecnicos?.tempo_atividade || capitalize(clientData.activity_before_birth) || 'Mais de 10 meses antes do nascimento'}</td>
        </tr>
        <tr>
            <td class="bg-gray">Período Declarado:</td>
            <td>${aiData.dados_tecnicos?.periodo_rural_declarado || clientData.special_insured_period}</td>
        </tr>
        <tr>
            <td class="bg-gray">Ponto Controvertido:</td>
            <td>${aiData.dados_tecnicos?.ponto_controvertido || capitalize(clientData.controversial_point) || 'Carência'}</td>
        </tr>
        <tr>
            <td class="bg-gray">Benefício Anterior:</td>
            <td>${aiData.dados_tecnicos?.beneficio_anterior || capitalize(clientData.previous_benefit) || 'Não consta'}</td>
        </tr>
        <tr>
            <td class="bg-gray">CNIS Averbado:</td>
            <td>${aiData.dados_tecnicos?.cnis_averbado || capitalize(clientData.cnis_period) || 'Não consta'}</td>
        </tr>
        <tr>
            <td class="bg-gray">Vínculo Urbano:</td>
            <td>${aiData.dados_tecnicos?.vinculo_urbano || capitalize(clientData.urban_link) || 'Nunca teve'}</td>
        </tr>
      </table>

      <h3>III. SÍNTESE DO CONTEXTO FÁTICO</h3>
      ${aiData.resumo_fatos}

      <h3>IV. DAS PROVAS JUNTADAS AOS AUTOS</h3>
      <ol style="margin-left: 20px;">
        <li>Certidão de nascimento da criança ${clientData.child_name || 'João de Tal'} constando a zona rural como local de nascimento;</li>
        <li>Certidão eleitoral constando a comunidade rural como local de votação;</li>
        ${aiData.lista_provas?.map((p: string) => `<li>${p}</li>`).join('') || '<li>Outros documentos em anexo.</li>'}
      </ol>
      <p>
        O contexto probatório carreado, não deixa dúvida que a parte Autora é segurada especial, possui início de prova material, 
        vive em regime de economia familiar exercido em condições de mútua dependência e colaboração, com sua família para garantir sua subsistência, 
        comprovando-se a carência exigida pela lei, fazendo jus ao benefício pleiteado.
      </p>

      <h3>V. FUNDAMENTAÇÃO JURÍDICA</h3>
      <p>O salário-maternidade é um direito assegurado pelo art. 71 da Lei nº 8.213/1991, estendido às seguradas especiais pelo art. 39, parágrafo único, da mesma lei, que garante o benefício mediante comprovação de atividade rural nos 10 meses anteriores ao parto.</p>
      <p>Entretanto, recentemente, o STF ao julgar Ações Diretas de Inconstitucionalidade (ADIs) 2110 e 2111, decidiu que a exigência de carência (período mínimo de 10 meses de contribuição) para o pagamento do salário-maternidade às seguradas especiais, como as trabalhadoras rurais, é inconstitucional.</p>
      <p>Portanto, presentes os requisitos: maternidade comprovada e exercício de atividade rural no período de carência, o indeferimento administrativo viola os princípios da legalidade e da proteção social.</p>

      ${aiData.jurisprudencias_selecionadas && aiData.jurisprudencias_selecionadas.length > 0 ? `
      <h3>VI. JURISPRUDÊNCIA</h3>
      <p>Em reforço à fundamentação acima, destacam-se as seguintes decisões dos tribunais superiores:</p>
      ${aiData.jurisprudencias_selecionadas.map((j: any, idx: number) => `
        <div style="margin: 15px 0; border-left: 3px solid #000; padding-left: 10px;">
          <p style="margin: 0; font-weight: bold;">${idx + 1}. ${j.tribunal}</p>
          <p style="margin: 5px 0; font-style: italic;">"${j.ementa}"</p>
          <p style="margin: 0; font-size: 10pt; color: #555;">${j.referencia}</p>
        </div>
      `).join('')}
      ` : ''}

      <h3>${aiData.jurisprudencias_selecionadas && aiData.jurisprudencias_selecionadas.length > 0 ? 'VII' : 'VI'}. PEDIDO/REQUERIMENTOS</h3>
      <p>Diante do exposto, requer:</p>
      <ol style="margin-left: 20px;">
        <li>A citação do INSS para contestar a ação;</li>
        <li>A procedência do pedido para condenar o INSS a conceder o Salário-Maternidade Rural;</li>
        <li>O pagamento das parcelas vencidas, monetariamente corrigidas;</li>
        <li>A concessão da Gratuidade da Justiça;</li>
        <li>A condenação em honorários advocatícios sucumbenciais.</li>
      </ol>

      <p>Protesta o alegado por todos os meios admitidos em direito.</p>

      <p>Dar-se à causa o valor de <b>${formatMoney(totalValue)}</b> (${valorExtenso}), renunciando a eventual excedente da alçada do Juizado Especial Federal.</p>
      
      <p style="font-weight: bold; margin-top: 20px;">PLANILHA DE CÁLCULO</p>
      <table class="data-table" cellspacing="0" cellpadding="4" style="text-align: center;">
        <tr class="bg-gray">
            <td>Competência</td><td>Valor Base</td><td>Valor Reajustado</td>
        </tr>
        ${calcRows}
        <tr style="font-weight: bold;"><td colspan="2" style="text-align: right;">TOTAL</td><td>${formatMoney(totalValue)}</td></tr>
      </table>

      <div style="margin-top: 15px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; font-size: 10pt;">
        <p style="font-weight: bold; margin: 0 0 5px 0;">METODOLOGIA DE CÁLCULO:</p>
        <p style="margin: 0;">O salário-maternidade rural é calculado com base no valor de 1 (um) salário mínimo vigente no mês de competência (Lei 8.213/91). Benefício de 120 dias.</p>
      </div>

      <div style="margin-top: 60px; text-align: center;">
        <p>Termos em que, pede e espera deferimento.</p>
        <p>${aiData.end_cidade_uf || 'Local'}, ${new Date().toLocaleDateString('pt-BR')}.</p>
        <br><br><br>
        ${signersHtml}
      </div>

      <div style="margin-top: 40px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 8pt; color: #666; display: flex; justify-content: space-between;">
        <span><b>ID:</b> ${documentId}</span>
        <span><b>Gerado por:</b> ${generatorInfo?.name || 'Sistema'} | ${generatedAt}</span>
      </div>

    </body>
    </html>
  `;
  }
};