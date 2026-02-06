// src/utils/templates/salarioMaternidade.ts

import { moneyToWords } from '../numberToWords';
import { getJurisdictionHeader } from '../jurisdictionUtils';

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

    // 5. Soma Total (Cálculo no Frontend para garantir precisão)
    const totalValue = aiData.tabela_calculo?.reduce((acc: number, r: any) => {
      const val = typeof r.valor_reajustado === 'number' ? r.valor_reajustado : parseFloat(String(r.valor_reajustado).replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
      return acc + (isNaN(val) ? 0 : val);
    }, 0) || 0;

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

    // === Helpers para cidade/UF e data longa ===
    const getCityUf = () => {
      // Prioridade 1: cidade e estado limpos do clientData
      if (clientData.city && clientData.state) {
        const city = clientData.city.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        return `${city}-${clientData.state.toUpperCase()}`;
      }

      const raw = (aiData.end_cidade_uf || (clientData && (clientData.city || clientData.address)) || '').toString().trim();
      if (!raw) return 'COMPETENTE';
      let s = raw.replace(/\s+/g, ' ').trim();
      // If the raw contains 'subseção' or 'subsecao', extract the last City-UF occurrence
      if (/subse[cç]ã?o|subsecao/i.test(s)) {
        const reAll = /([A-Za-zÀ-ÖØ-öø-ÿ\.\s]+)[,\-]\s*([A-Za-z]{2})/g;
        let match: RegExpExecArray | null;
        let last: RegExpExecArray | null = null;
        while ((match = reAll.exec(s)) !== null) last = match;
        if (last) {
          const city = last[1].trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          const uf = last[2].toUpperCase();
          return `${city}-${uf}`;
        }
        // fallback: remove the phrase and continue
        s = s.replace(/subse[cç]ã?o\s+judiciari[ao]\s*(de|da|do)?\s*/ig, '').trim();
      }

      // Try City - UF or City, UF at end
      let m = s.match(/([A-Za-zÀ-ÖØ-öø-ÿ\.\s]+)[,\-]\s*([A-Za-z]{2})$/);
      if (m) {
        const city = m[1].trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        const uf = m[2].toUpperCase();
        return `${city}-${uf}`;
      }

      m = s.match(/([A-Za-zÀ-ÖØ-öø-ÿ\.\s]+)\s+([A-Za-z]{2})$/);
      if (m) {
        const city = m[1].trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        const uf = m[2].toUpperCase();
        return `${city}-${uf}`;
      }

      // If none found, return only city title-cased
      const onlyCity = s.split(',')[0].trim();
      return onlyCity.split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    };

    const formatLongDate = (d?: string | Date) => {
      const date = d ? (typeof d === 'string' ? new Date(d) : d) : new Date();
      if (isNaN(date.getTime())) return d || '';
      const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
    };

    // --- Helpers para aplicar correções vindas da IA ---
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const applyCorrectionsToString = (text: string, corrections: any[]) => {
      if (!text || !corrections || corrections.length === 0) return text;
      let out = String(text);
      corrections.forEach((c: any) => {
        const orig = c.original || c.erro || c.text;
        const corr = c.correto || c.corrected || c.correct || '';
        if (!orig || !corr) return;
        const re = new RegExp('\\b' + escapeRegExp(orig) + '\\b', 'gi');
        out = out.replace(re, corr);
      });
      return out;
    };

    // Clona clientData e aplica correções onde fizer sentido
    const correctedClientData = (() => {
      const cd: any = JSON.parse(JSON.stringify(clientData || {}));
      const corrections = aiData?.correcoes || [];

      const stringFields = [
        'name', 'nationality', 'marital_status', 'profession', 'address', 'child_name',
        'cpf', 'rg', 'rg_issuer', 'der', 'nb', 'benefit_status', 'denied_date', 'decision_reason',
        'activity_before_birth', 'special_insured_period', 'controversial_point', 'previous_benefit',
        'cnis_period', 'urban_link'
      ];

      // Aplica correções apenas se houver
      stringFields.forEach(f => {
        if (cd[f]) cd[f] = applyCorrectionsToString(cd[f], corrections);
      });

      // Sempre aplica Title Case simples em name e child_name
      const toTitle = (s: string) => s.split(/\s+/).filter(Boolean).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      if (cd.name) cd.name = toTitle(cd.name);
      if (cd.child_name) cd.child_name = toTitle(cd.child_name);
      if (cd.children && cd.children.length > 0 && cd.children[0].name) {
        cd.children[0].name = toTitle(cd.children[0].name);
      }

      return cd;
    })();

    const cd = correctedClientData; // alias usado no template

    // === 1. CABEÇALHO (ESTRUTURA DE TABELA PARA WORD) ===
    const headerHtml = officeData ? `
    <table width="100%" style="width: 100%; border-bottom: 2px solid #000; margin-bottom: 20px;" cellspacing="0" cellpadding="0">
      <tr>
        <td style="width: 80px; vertical-align: middle; padding-bottom: 10px;">
          ${officeData.logo_url
        ? `<img src="${officeData.logo_url}" width="70" height="70" style="width: 70px; height: 70px; object-fit: contain;" alt="Logo" />`
        : `<div style="width: 70px; height: 70px; background: #fff; border: 1px solid #000;"></div>`
      }
        </td>
        <td style="vertical-align: middle; padding-left: 10px; padding-bottom: 10px;">
          <p style="margin: 0; font-size: 16pt; font-weight: bold; text-transform: uppercase; color: #000;">${officeData.name}</p>
          ${officeData.cnpj ? `<p style="margin: 0; font-size: 9pt; color: #000;">CNPJ: ${officeData.cnpj}</p>` : ''}
          
          <div style="margin-top: 5px; font-size: 9pt; color: #000;">
            ${officeData.address ? `<span>${officeData.address}${officeData.city ? `, ${officeData.city}` : ''}${officeData.state ? `-${officeData.state}` : ''}</span><br>` : ''}
            <span>
              ${officeData.phone ? `Tel: ${officeData.phone}` : ''}
              ${officeData.email ? ` | ${officeData.email}` : ''}
            </span>
          </div>
          ${officeData.slogan ? `<p style="margin: 5px 0 0 0; font-size: 9pt; font-style: italic; color: #000;">"${officeData.slogan}"</p>` : ''}
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
    const calcRows = aiData.tabela_calculo?.map((row: any) => {
      const valorBase = typeof row.valor_base === 'string' ? parseFloat(row.valor_base) : row.valor_base;
      const valorReajustado = typeof row.valor_reajustado === 'string' ? parseFloat(row.valor_reajustado) : row.valor_reajustado;

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
        /* Página A4 e margens ABNT: esquerda 3cm, superior 3cm, direita 2cm, inferior 2cm */
        @page { size: A4; margin: 3cm 2cm 2cm 3cm; }

        html, body {
          height: 100%;
        }

        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          margin: 0;
          /* Não forçar cores aqui para permitir que o visualizador/useTheme controle (dark mode) */
          color: inherit;
          background: transparent;
        }

        p {
          margin: 0 0 12px 0;
          text-align: justify;
          text-justify: inter-word;
        }

        /* Tabelas */
        table { border-collapse: collapse; width: 100%; font-size: 11pt; color: #000 !important; }
        td, th { vertical-align: top; }

        /* Remove margens de parágrafos dentro de tabelas */
        table p { margin: 0; line-height: 1.2; }

        /* Classes utilitárias */
        .data-table td { border: 1px solid #000; padding: 6px 8px; }
        .bg-gray { background-color: #fff; font-weight: bold; width: 40%; color: #000; }

        h1, h2, h3 { color: #000; }
        h2 { text-align: center; font-size: 14pt; margin: 20px 0; font-weight: bold; }
        h3 { font-size: 12pt; text-transform: uppercase; margin-top: 20px; font-weight: bold; text-decoration: underline; }

        /* Regras para impressão/PDF: evitar quebra de tabelas e repetir cabeçalhos */
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }

        /* Evita que linhas e células sejam cortadas entre páginas */
        tr, td, th { page-break-inside: avoid; break-inside: avoid; }
        table { page-break-inside: auto; }

        /* Regras específicas para impressão */
        @media print {
          /* Força cores para impressão e fundo branco */
          * { color: #000 !important; background-color: transparent !important; }
          html, body { width: 210mm; height: 297mm; }
          body { margin: 0; background: #fff !important; }
          .data-table, table { page-break-inside: avoid; -webkit-region-break-inside: avoid; break-inside: avoid; }
          tr { page-break-inside: avoid; break-inside: avoid; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          .page-break { page-break-before: always; break-before: page; }
          img { max-width: 100%; height: auto; }
        }

        /* Small utility to keep the calculation table more likely on a single page */
        .calc-block { page-break-inside: avoid; break-inside: avoid; }
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
        ${getJurisdictionHeader(aiData, getCityUf())}
      </p>

      <div style="text-align: center; font-weight: bold; margin: 20px 0;">
        SEGURADO ESPECIAL <br> JUÍZO 100% DIGITAL
      </div>

      ${priorityBox}

      <p>
        <b>${cd.name.toUpperCase()}</b>, ${cd.nationality}, ${cd.marital_status}, 
        ${aiData.dados_tecnicos?.profissao_formatada || capitalize(cd.profession) || 'Agricultora'}, 
        nascido(a) em ${formatDate(cd.birth_date)} (${calculateAge(cd.birth_date)}), portador(a) do CPF nº ${cd.cpf} e RG nº ${cd.rg} (${cd.rg_issuer || ''}), 
        residente e domiciliado(a) em ${cd.address}, por meio de seus procuradores infra firmados, 
        com endereço eletrônico em ${officeData?.email || 'custodioadvocacia@gmail.com'}, endereço físico descrito no rodapé da página, 
        onde recebe intimações e notificações, de estilo, vem a ínclita presença de Vossa Excelência, com fulcro no art. 5º, inciso V da CF/88, 
        cumulado com a Lei nº 8.078/90 e demais dispositivo aplicáveis à espécie, propor a presente
      </p>

      <h2>AÇÃO PREVIDENCIÁRIA DE CONCESSÃO DE SALÁRIO MATERNIDADE (RURAL)</h2>

      <p>
        Em face do <b>INSTITUTO NACIONAL DO SEGURO SOCIAL – INSS</b>, autarquia federal, CNPJ 16.727.230/0001 97, 
        com endereço eletrônico conhecido por este juízo, podendo também ser citada em sua sede à 
        <b>${aiData.inss_address || 'Endereço não localizado'}</b> pelos motivos fáticos e jurídicos a seguir expendidos:
      </p>

      <h3>I. PRELIMINARMENTE</h3>
      ${aiData.preliminares || '<p>Requer a parte Autora os benefícios da gratuidade da justiça, com fulcro no art. 5º, Inciso LXXIV da CF/88 e nos termos da Lei 1.060/50, haja vista declarar-se pobre na forma da lei, não podendo custear a máquina jurisdicional sem prejuízo de seu sustento e o da sua família.</p>'}

      <h3>II. QUADRO SINÓPTICO</h3>
      <p style="font-weight: bold; margin-bottom: 5px;">RESUMO DAS PRINCIPAIS INFORMAÇÕES DO PROCESSO</p>
      
      <table class="data-table" cellspacing="0" cellpadding="4">
        <tr><td style="background: #fff; width: 40%; border: 1px solid #000;"><b>NOME</b></td><td style="border: 1px solid #000;">${cd.name.toUpperCase()}</td></tr>
        <tr><td style="background: #fff; border: 1px solid #000;"><b>IDADE NO REQ. ADM.</b></td><td style="border: 1px solid #000;">${calculateAge(cd.birth_date)}</td></tr>
        <tr><td style="background: #fff; border: 1px solid #000;"><b>PEDIDO</b></td><td style="border: 1px solid #000;">Salário-Maternidade (Segurada Especial)</td></tr>
        <tr>
          <td style="background: #fff; border: 1px solid #000;"><b>CRIANÇA(S)</b></td>
          <td style="border: 1px solid #000;">
            ${(cd.children && cd.children.length > 0)
        ? cd.children.map((c: any) => `${capitalize(c.name || '...')} (Nasc: ${formatDate(c.birth_date)})`).join('<br>')
        : capitalize(cd.child_name || '...') + ' (Nasc: ' + formatDate(cd.child_birth_date) + ')'
      }
          </td>
        </tr>

        ${(cd.children || []).map((child: any) =>
        (child.benefits || []).map((benefit: any, bIdx: number) => `
            <tr>
              <td style="background: #fff; border: 1px solid #000;">
                <b>DETALHES DO BENEFÍCIO (${child.name?.split(' ')[0] || 'Filho'}${bIdx > 0 ? ` - Negativa ${bIdx + 1}` : ''})</b>
              </td>
              <td style="border: 1px solid #000;">
                <b>DER:</b> ${formatDate(benefit.der)} | <b>NB:</b> ${benefit.nb}<br>
                <b>Situação:</b> ${capitalize(benefit.benefit_status)} em ${formatDate(benefit.denied_date)}<br>
                <b>Motivo:</b> ${benefit.decision_reason || 'Não informado'}
              </td>
            </tr>
          `).join('')
      ).join('')}
        
        <tr>
            <td class="bg-gray">Tempo de Trabalho Rural:</td>
            <td>${aiData.dados_tecnicos?.tempo_atividade || capitalize(cd.activity_before_birth) || 'Mais de 10 meses antes do nascimento'}</td>
        </tr>
        <tr>
            <td class="bg-gray">Período Declarado:</td>
            <td>${aiData.dados_tecnicos?.periodo_rural_declarado || cd.special_insured_period}</td>
        </tr>
        <tr>
            <td class="bg-gray">Ponto Controvertido:</td>
            <td>${aiData.dados_tecnicos?.ponto_controvertido || capitalize(cd.controversial_point) || 'Qualidade de segurado/carência'}</td>
        </tr>
        <tr>
            <td class="bg-gray">Benefício Anterior:</td>
            <td>${aiData.dados_tecnicos?.beneficio_anterior || capitalize(cd.previous_benefit) || 'Não consta'}</td>
        </tr>
        <tr>
            <td class="bg-gray">CNIS Averbado:</td>
            <td>${aiData.dados_tecnicos?.cnis_averbado || capitalize(cd.cnis_period) || 'Não consta'}</td>
        </tr>
        <tr>
            <td class="bg-gray">Vínculo Urbano:</td>
            <td>${aiData.dados_tecnicos?.vinculo_urbano || capitalize(cd.urban_link) || 'Nunca teve'}</td>
        </tr>
        ${aiData.correcoes && aiData.correcoes.length > 0 ? `
        <tr>
          <td class="bg-gray">Correções do Formulário:</td>
          <td>${aiData.correcoes.map((c: any) => `erro: ${c.original || c.erro || c.text || ''} - correto: ${c.correto || c.corrected || c.correct || ''}`).join('<br>')}</td>
        </tr>
        ` : ''}
      </table>

      <h3>III. SÍNTESE DO CONTEXTO FÁTICO</h3>
      ${aiData.resumo_fatos}

      <h3>IV. DAS PROVAS JUNTADAS AOS AUTOS</h3>
      <ol style="margin-left: 20px;">
        ${(cd.children && cd.children.length > 0)
        ? cd.children.map((c: any) => `<li>Certidão de nascimento da criança ${capitalize(c.name || '...')} constando a zona rural como local de nascimento;</li>`).join('')
        : `<li>Certidão de nascimento da criança ${cd.child_name || '...'} constando a zona rural como local de nascimento;</li>`
      }
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
          <p style="margin: 0; font-size: 10pt; color: #000;">${j.referencia}</p>
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

      <div style="margin-top: 15px; padding: 10px; background: #fff; border: 1px solid #000; font-size: 10pt;">
        <p style="font-weight: bold; margin: 0 0 5px 0;">METODOLOGIA DE CÁLCULO:</p>
        <p style="margin: 0;">O salário-maternidade rural é calculado com base no valor de 1 (um) salário mínimo vigente no mês de competência (Lei 8.213/91). Benefício de 120 dias.</p>
      </div>

      <div style="margin-top: 60px;">
        <p style="text-align: left;">Termos em que, pede e espera deferimento.</p>
        <p style="text-align: right;">${(() => {
        // Sugestão: Usar a cidade do escritório para a datação, se disponível.
        if (officeData?.city) {
          const city = officeData.city.trim().split(/\s+/).filter(Boolean).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          const state = officeData.state?.toUpperCase() || '';
          return `${city}${state ? `-${state}` : ''}, ${formatLongDate(new Date())}.`;
        }

        const raw = getCityUf();
        // Format city name properly for closing (Title Case city, uppercase UF when available)
        const m = raw.match(/^(.+)-([A-Z]{2})$/i);
        if (m) {
          const city = m[1].split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          const state = m[2].toUpperCase();
          return `${city}-${state}, ${formatLongDate(new Date())}.`;
        }
        const cityTitle = raw.split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        return `${cityTitle}, ${formatLongDate(new Date())}.`;
      })()}</p>
        <div style="margin-top: 20px; display: flex; justify-content: center; gap: 40px; flex-wrap: wrap;">
          ${signersHtml}
        </div>
      </div>

      <div style="margin-top: 40px; padding-top: 15px; border-top: 1px solid #000; font-size: 8pt; color: #000; display: flex; justify-content: space-between;">
        <span><b>ID:</b> ${documentId}</span>
        <span><b>Gerado por:</b> ${generatorInfo?.name || 'Sistema'} | ${generatedAt}</span>
      </div>

    </body>
    </html>
  `;
  }
};