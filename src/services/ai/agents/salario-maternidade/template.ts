// src/services/ai/agents/salario-maternidade/template.ts

import { AgentTemplate } from '../base/types';
import { moneyToWords } from '../../../../utils/numberToWords';

/**
 * Template HTML para o agente de Salário Maternidade Rural
 */
export const template: AgentTemplate = {
  render: (aiData: any, clientData: any, officeData: any, signers: any[], generatorInfo?: { name: string; id: string }) => {

    // === GERAÇÃO DE ID ÚNICO DO DOCUMENTO ===
    const generateDocId = () => {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `DOC-${timestamp}-${randomChars}`;
    };
    const documentId = generateDocId();
    const generatedAt = new Date().toLocaleString('pt-BR');

    // === HELPERS DE FORMATAÇÃO ===
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
        return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
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

    // Helper para capitalizar (fallback estético caso a IA falhe)
    const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

    // === 1. CABEÇALHO DO ESCRITÓRIO (TIMBRADO) ===
    const headerHtml = officeData ? `
    <div style="border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 25px;">
      <table style="width: 100%;">
        <tr>
          <td style="width: 80px; vertical-align: middle;">
            ${officeData.logo_url
        ? `<img src="${officeData.logo_url}" style="width: 70px; height: 70px; object-fit: contain;" alt="Logo" />`
        : `<div style="width: 70px; height: 70px; background: #f0f0f0; border-radius: 8px;"></div>`
      }
          </td>
          <td style="vertical-align: middle; padding-left: 15px;">
            <h2 style="margin: 0; font-size: 16pt; font-weight: bold; text-transform: uppercase; color: #000;">${officeData.name}</h2>
            ${officeData.cnpj ? `<p style="margin: 3px 0 0 0; font-size: 9pt; color: #666;">CNPJ: ${officeData.cnpj}</p>` : ''}
          </td>
        </tr>
      </table>
      <div style="margin-top: 10px; font-size: 9pt; color: #444; line-height: 1.4;">
        ${officeData.address ? `<span>${officeData.address}${officeData.city ? `, ${officeData.city}` : ''}${officeData.state ? `-${officeData.state}` : ''}</span><br>` : ''}
        <span>
          ${officeData.phone ? `Tel: ${officeData.phone}` : ''}
          ${officeData.secondary_phone ? ` | ${officeData.secondary_phone}` : ''}
          ${officeData.email ? ` | ${officeData.email}` : ''}
          ${officeData.website ? ` | ${officeData.website}` : ''}
        </span>
      </div>
      ${officeData.slogan ? `<p style="margin: 8px 0 0 0; font-size: 9pt; font-style: italic; color: #666;">"${officeData.slogan}"</p>` : ''}
    </div>
  ` : '';

    // === 2. BLOCO DE PRIORIDADES ===
    const check = (val: boolean) => val ? "X" : "&nbsp;&nbsp;";
    const priorityBox = `
    <div style="border: 1px solid #000; padding: 10px; margin: 15px 0; width: fit-content; font-size: 10pt; background-color: #fff;">
      <b>Prioridade Legal na tramitação processual:</b><br>
      ( ${check(aiData.prioridades?.idoso)} ) Idoso(a) maior de 60 anos - Lei 10.741/2003<br>
      ( ${check(aiData.prioridades?.deficiente)} ) Deficiente - Lei 12.008/2009 - Laudo em anexo<br>
      ( ${check(aiData.prioridades?.menor)} ) Menor nos termos do ECA - Lei 8.069/1990
    </div>
  `;

    // === 3. TABELA DE CÁLCULO ===
    let totalValue = 0;
    const calcRows = aiData.tabela_calculo?.map((row: any) => {
      const rawVal = typeof row.valor_reajustado === 'string'
        ? parseFloat(row.valor_reajustado.replace(/[^\d,]/g, '').replace(',', '.'))
        : row.valor_reajustado;
      totalValue += rawVal || 0;

      return `
    <tr>
      <td style="border: 1px solid #000; padding: 5px;">${row.competencia}</td>
      <td style="border: 1px solid #000; padding: 5px;">${formatMoney(row.valor_base)}</td>
      <td style="border: 1px solid #000; padding: 5px;">${formatMoney(row.valor_reajustado)}</td>
    </tr>`;
    }).join('') || '<tr><td colspan="3">Cálculo não gerado</td></tr>';

    // === 4. ASSINATURAS ===
    const signersHtml = signers.map(s => `
    <div style="display: inline-block; margin: 0 30px; text-align: center; min-width: 200px; vertical-align: top;">
      <p style="margin-bottom: 40px; color: #000;">_________________________________</p>
      <b style="text-transform: uppercase;">${s.full_name}</b><br>
      <span style="font-size: 10pt;">OAB ${s.oab || '...'}</span>
    </div>
  `).join('');

    // === HTML FINAL COMPLETO ===
    return `
    <div style="font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; line-height: 1.5; padding: 40px;">
      
      ${headerHtml}

      <p style="font-weight: bold; text-transform: uppercase; margin-bottom: 20px;">
        AO JUÍZO FEDERAL DA VARA DO JUIZADO ESPECIAL FEDERAL DA SUBSEÇÃO JUDICIÁRIA DA COMARCA DE ${aiData.end_cidade_uf || 'COMPETENTE'}.
      </p>

      <div style="margin: 20px 0; font-weight: bold; text-transform: uppercase;">
        SEGURADO ESPECIAL <br> JUÍZO 100% DIGITAL
      </div>

      ${priorityBox}

      <p style="text-align: justify; margin-top: 25px;">
        <b>${clientData.name.toUpperCase()}</b>, ${clientData.nationality}, ${clientData.marital_status}, 
        ${aiData.dados_tecnicos?.profissao_formatada || capitalize(clientData.profession) || 'Agricultora'}, 
        nascido(a) em ${formatDate(clientData.birth_date)} (${calculateAge(clientData.birth_date)}), portador(a) do CPF nº ${clientData.cpf} e RG nº ${clientData.rg} (${clientData.rg_issuer || ''}), 
        residente e domiciliado(a) em ${clientData.address}, por meio de seus procuradores infra firmados, 
        com endereço eletrônico em ${officeData?.email || 'custodioadvocacia@gmail.com'}, endereço físico descrito no rodapé da página, 
        onde recebe intimações e notificações, de estilo, vem a ínclita presença de Vossa Excelência, com fulcro no art. 5º, inciso V da CF/88, 
        cumulado com a Lei nº 8.078/90 e demais dispositivo aplicáveis à espécie, propor a presente
      </p>

      <h2 style="text-align: center; margin: 30px 0; font-size: 14pt; font-weight: bold;">AÇÃO PREVIDENCIÁRIA DE CONCESSÃO DE SALÁRIO MATERNIDADE (SEGURADA ESPECIAL – AGRICULTORA)</h2>

      <p style="margin-bottom: 30px;">
        Em face do <b>INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS</b>, pessoa jurídica de direito público, 
        podendo ser citado em sua agência mais próxima localizada à <b>${aiData.inss_address || 'Endereço não localizado'}</b>...
      </p>

      <h3 style="font-size: 12pt; text-transform: uppercase;">I. PRELIMINARMENTE</h3>
      ${aiData.preliminares || '<p style="font-weight: bold;">DA GRATUIDADE DA JUSTIÇA:</p><p>Requer a parte Autora os benefícios da gratuidade da justiça, com fulcro no art. 5º, Inciso LXXIV da CF/88 e nos termos da Lei 1.060/50, haja vista declarar-se pobre na forma da lei, não podendo custear a máquina jurisdicional sem prejuízo de seu sustento e o da sua família.</p>'}

      <h3 style="font-size: 12pt; text-transform: uppercase; margin-top: 20px;">II. QUADRO SINÓPTICO</h3>
      <p style="font-weight: bold; margin-bottom: 5px;">RESUMO DAS PRINCIPAIS INFORMAÇÕES DO PROCESSO</p>
      
      <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 30px; font-size: 11pt;">
        <tr><td style="background: #f0f0f0; width: 45%; font-weight: bold;">NOME:</td><td>${clientData.name.toUpperCase()}</td></tr>
        <tr><td style="background: #f0f0f0; font-weight: bold;">Idade no Req. Adm.:</td><td>${calculateAge(clientData.birth_date)}</td></tr>
        <tr><td style="background: #f0f0f0; font-weight: bold;">Pedido:</td><td>Salário maternidade – segurado especial</td></tr>
        <tr><td style="background: #f0f0f0; font-weight: bold;">Criança:</td><td>${capitalize(clientData.child_name)}</td></tr>
        <tr><td style="background: #f0f0f0; font-weight: bold;">Data de Nascimento:</td><td>${formatDate(clientData.child_birth_date)}</td></tr>
        <tr><td style="background: #f0f0f0; font-weight: bold;">Data do Req. Adm:</td><td>${formatDate(clientData.der)}</td></tr>
        <tr><td style="background: #f0f0f0; font-weight: bold;">NB:</td><td>${clientData.nb}</td></tr>
        <tr><td style="background: #f0f0f0; font-weight: bold;">Situação do Benefício / Decisão do INSS:</td><td>${capitalize(clientData.benefit_status)}</td></tr>
        <tr><td style="background: #f0f0f0; font-weight: bold;">Data do Indef. Adm:</td><td>${formatDate(clientData.denied_date)}</td></tr>
        
        <tr>
            <td style="background: #f0f0f0; font-weight: bold;">Motivo da Decisão do INSS:</td>
            <td>${aiData.dados_tecnicos?.motivo_indeferimento || capitalize(clientData.decision_reason)}</td>
        </tr>
        <tr>
            <td style="background: #f0f0f0; font-weight: bold;">Tempo de contribuição ou de trabalho exercido antes do parto:</td>
            <td>${aiData.dados_tecnicos?.tempo_atividade || capitalize(clientData.activity_before_birth) || 'Mais de 10 meses antes do nascimento'}</td>
        </tr>
        <tr>
            <td style="background: #f0f0f0; font-weight: bold;">Período de Segurado Especial que declara:</td>
            <td>${aiData.dados_tecnicos?.periodo_rural_declarado || clientData.special_insured_period}</td>
        </tr>
        <tr>
            <td style="background: #f0f0f0; font-weight: bold;">Ponto controvertido:</td>
            <td>${aiData.dados_tecnicos?.ponto_controvertido || capitalize(clientData.controversial_point) || 'Carência'}</td>
        </tr>
        <tr>
            <td style="background: #f0f0f0; font-weight: bold;">Benefício recebido anteriormente:</td>
            <td>${aiData.dados_tecnicos?.beneficio_anterior || capitalize(clientData.previous_benefit) || 'Não consta'}</td>
        </tr>
        <tr>
            <td style="background: #f0f0f0; font-weight: bold;">Período de Segurado Averbado no CNIS:</td>
            <td>${aiData.dados_tecnicos?.cnis_averbado || capitalize(clientData.cnis_period) || 'Não consta'}</td>
        </tr>
        <tr>
            <td style="background: #f0f0f0; font-weight: bold;">Vinculo urbano:</td>
            <td>${aiData.dados_tecnicos?.vinculo_urbano || capitalize(clientData.urban_link) || 'Nunca teve'}</td>
        </tr>
      </table>

      <h3 style="font-size: 12pt; text-transform: uppercase;">III. SÍNTESE DO CONTEXTO FÁTICO</h3>
      ${aiData.resumo_fatos}

      <h3 style="font-size: 12pt; text-transform: uppercase; margin-top: 20px;">IV. DAS PROVAS JUNTADAS AOS AUTOS</h3>
      <ol style="margin-left: 20px; padding-left: 20px;">
        <li>Certidão de nascimento da criança ${clientData.child_name || 'João de Tal'} constando a zona rural como local de nascimento;</li>
        <li>Certidão eleitoral constando a comunidade rural como local de votação;</li>
        ${aiData.lista_provas?.map((p: string) => `<li style="margin-bottom: 5px;">${p}</li>`).join('') || '<li>Outros documentos em anexo.</li>'}
      </ol>
      <p style="margin-top: 15px;">
        O contexto probatório carreado, não deixa dúvida que a parte Autora é segurada especial, possui início de prova material, 
        vive em regime de economia familiar exercido em condições de mútua dependência e colaboração, com sua família para garantir sua subsistência, 
        comprovando-se a carência exigida pela lei, fazendo jus ao benefício pleiteado.
      </p>

      <h3 style="font-size: 12pt; text-transform: uppercase; margin-top: 20px;">V. FUNDAMENTAÇÃO JURÍDICA</h3>
      <p>O salário-maternidade é um direito assegurado pelo art. 71 da Lei nº 8.213/1991, estendido às seguradas especiais pelo art. 39, parágrafo único, da mesma lei, que garante o benefício mediante comprovação de atividade rural nos 10 meses anteriores ao parto.</p>
      <p>Entretanto, recentemente, o STF ao julgar Ações Diretas de Inconstitucionalidade (ADIs) 2110 e 2111, decidiu que a exigência de carência (período mínimo de 10 meses de contribuição) para o pagamento do salário-maternidade às seguradas especiais, como as trabalhadoras rurais, é inconstitucional. Essa decisão, tomada em 28 de março de 2024, equiparou o direito das seguradas especiais, facultativas e contribuintes individuais ao das trabalhadoras com carteira assinada, que já recebiam o benefício sem a necessidade de cumprir carência.</p>
      <p>Sabe-se que a Constituição Federal, em seu art. 7º, XVIII, assegura licença-maternidade remunerada como expressão da dignidade da pessoa humana e da proteção à maternidade e à infância.</p>
      <p>Importante ainda observar que tanto o STJ quanto os TRFs, possuem entendimentos pacíficos de que é desnecessária a comprovação de recolhimento de contribuições para a segurada especial, bastando prova do labor rural em regime de economia familiar.</p>
      <p>A TNU também reconhece que o início de prova material, ainda que em nome de outro membro do grupo familiar, é suficiente quando corroborado por prova testemunhal idônea.</p>
      <p>Portanto, presentes os requisitos: maternidade comprovada e exercício de atividade rural no período de carência, o indeferimento administrativo viola os princípios da legalidade e da proteção social.</p>

      ${aiData.jurisprudencias_selecionadas && aiData.jurisprudencias_selecionadas.length > 0 ? `
      <h3 style="font-size: 12pt; text-transform: uppercase; margin-top: 20px;">VI. JURISPRUDÊNCIA</h3>
      <p>Em reforço à fundamentação acima, destacam-se as seguintes decisões dos tribunais superiores:</p>
      ${aiData.jurisprudencias_selecionadas.map((j: any, idx: number) => `
        <div style="margin: 15px 0; padding: 10px; border-left: 3px solid #333;">
          <p style="margin: 0 0 5px 0;"><b>${idx + 1}. ${j.tribunal}</b></p>
          <p style="margin: 0 0 5px 0; font-style: italic;">"${j.ementa}"</p>
          <p style="margin: 0; font-size: 10pt; color: #555;">${j.referencia}</p>
        </div>
      `).join('')}
      <p style="margin-top: 15px;">Tais precedentes reforçam o entendimento de que a parte autora faz jus ao benefício pleiteado, devendo ser reconhecido o direito ao salário-maternidade.</p>
      ` : ''}

      <h3 style="font-size: 12pt; text-transform: uppercase; margin-top: 20px;">${aiData.jurisprudencias_selecionadas && aiData.jurisprudencias_selecionadas.length > 0 ? 'VII' : 'VI'}. PEDIDO/REQUERIMENTOS</h3>
      <p>Diante do exposto, requer:</p>
      <ol style="margin-left: 20px; padding-left: 20px;">
        <li style="margin-bottom: 10px;">nos termos do § 5º do artigo 272 do CPC, que as comunicações dos atos processuais sejam feitas com expressa indicação em nome dos advogados, inscritos na OAB, constantes da inicial sob pena de nulidade.</li>
        <li style="margin-bottom: 10px;">seja a presente Ação recebida, para ao final ser JULGADA TOTALMENTE PROCEDENTE concedendo à parte Autora o benefício de SALÁRIO MATERNIDADE – SEGURADA ESPECIAL;</li>
        <li style="margin-bottom: 10px;">a averbação do período reconhecido de atividade segurado especial no sistema CNIS;</li>
        <li style="margin-bottom: 10px;">seja a ré citada, dando-lhe oportunidade para se quiser, apresentar resposta, no prazo legal, sob pena de revelia, devendo constar do mandado a advertência do artigo 334 do CPC, e até a audiência de conciliação, junte aos autos o Processo Administrativo NB: <b>${clientData.nb}</b>, nos termos do Art. 11 da Lei 10.259/01;</li>
        <li style="margin-bottom: 10px;">pagar as parcelas correspondente a 120 dias de benefício, monetariamente corrigidas desde o parto e acrescidas de juros legais moratórios, incidentes até a data do efetivo pagamento;</li>
        <li style="margin-bottom: 10px;">designação de audiência “UNA”;</li>
        <li style="margin-bottom: 10px;">sejam concedidos os benefícios da justiça gratuita, por ser a parte autora pessoa pobre na acepção jurídica do termo;</li>
        <li style="margin-bottom: 10px;">sendo procedente os pedidos, o que se espera, REQUER autorização expressa em sentença para destaque, de 30% (trinta por cento) do que for apurado oportunamente em liquidação de sentença, respeitado e garantido, desde logo, o mínimo contratual estabelecido em contrato, tudo, nos termos da tabela da OAB, em favor da firma <b>${officeData?.name || 'CUSTÓDIO ADVOGADOS & CONSULTORES ASSOCIADOS'}</b>, ${officeData?.cnpj ? 'CNPJ Nº ' + officeData.cnpj : ''}, a título de honorários advocatícios contratuais, conforme previsto no instrumento particular que segue em anexo.</li>
      </ol>

      <p>Protesta o alegado por todos os meios admitidos em direito, especialmente o depoimento pessoal da parte autora e testemunhas que compareceram em audiência independente de intimação.</p>

      <p>Dar-se à causa o valor de <b>${formatMoney(totalValue)}</b> (${moneyToWords(totalValue)}), renunciando a eventual excedente da alçada do Juizado Especial Federal, especificamente paras fins de fixação da competência.</p>
      
      <p style="font-weight: bold; margin-top: 20px;">PLANILHA DE CÁLCULO</p>
      <table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin: 10px 0; text-align: center;">
        <tr style="background: #f0f0f0; font-weight: bold;">
            <td>Competência</td><td>Valor Base</td><td>Valor Reajustado</td>
        </tr>
        ${calcRows}
        <tr style="font-weight: bold;"><td colspan="2" style="text-align: right; padding-right: 10px;">TOTAL</td><td>${formatMoney(totalValue)}</td></tr>
      </table>

      <div style="margin-top: 15px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; font-size: 10pt;">
        <p style="font-weight: bold; margin: 0 0 8px 0;">METODOLOGIA DE CÁLCULO:</p>
        <p style="margin: 0; line-height: 1.5;">O salário-maternidade rural é calculado com base no valor de <b>1 (um) salário mínimo</b> vigente no mês de competência, conforme art. 73, I da Lei 8.213/91. O benefício corresponde a <b>120 dias (4 meses)</b> de pagamento, contados a partir do nascimento da criança. Os valores são reajustados monetariamente com base nos índices oficiais de correção do salário mínimo, aplicando-se os reajustes acumulados desde a data de cada competência até a data atual, conforme legislação vigente (Decretos e Medidas Provisórias que fixam o salário mínimo nacional).</p>
      </div>

      <div style="margin-top: 60px; text-align: center;">
        <p>Termos em que, pede e espera deferimento.</p>
        <p>${aiData.end_cidade_uf || 'Local'}, ${new Date().toLocaleDateString('pt-BR')}.</p>
        <br><br><br>
        ${signersHtml}
      </div>

      <div style="margin-top: 40px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 8pt; color: #666; display: flex; justify-content: space-between;">
        <div>
          <span style="font-weight: bold;">ID:</span> ${documentId}
        </div>
        <div>
          <span style="font-weight: bold;">Gerado por:</span> ${generatorInfo?.name || 'Sistema'} | ${generatedAt}
        </div>
      </div>

    </div>
  `;
  }
};