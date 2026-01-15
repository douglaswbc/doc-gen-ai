// src/services/salaryAdjustmentService.ts

/**
 * Serviço para cálculo de reajustes do salário mínimo
 * Dados históricos de 1994 a 2026
 */

export interface SalaryData {
    vigencia: string; // Data de vigência (YYYY-MM-DD)
    valor: number; // Valor do salário mínimo
    reajuste: number; // Percentual de reajuste
    legislacao: string; // Lei/Decreto/MP
}

// Dados históricos do salário mínimo (do mais recente para o mais antigo)
const SALARY_HISTORY: SalaryData[] = [
    { vigencia: '2026-01-01', valor: 1621.00, reajuste: 6.79, legislacao: 'Projeção pendente' },
    { vigencia: '2025-01-01', valor: 1518.00, reajuste: 7.95, legislacao: 'Decreto 12.342/2024' },
    { vigencia: '2024-01-01', valor: 1412.00, reajuste: 6.97, legislacao: 'Decreto 11.864/2024' },
    { vigencia: '2023-05-01', valor: 1320.00, reajuste: 8.90, legislacao: 'MP 1.172/2023' },
    { vigencia: '2023-01-01', valor: 1302.00, reajuste: 7.43, legislacao: 'MP 1.143/2022' },
    { vigencia: '2022-01-01', valor: 1212.00, reajuste: 10.16, legislacao: 'MP 1.091/2021' },
    { vigencia: '2021-01-01', valor: 1100.00, reajuste: 5.26, legislacao: 'MP 1.021/2020' },
    { vigencia: '2020-02-01', valor: 1045.00, reajuste: 0.58, legislacao: 'MP 919/2020' },
    { vigencia: '2020-01-01', valor: 1039.00, reajuste: 4.10, legislacao: 'MP 916/2019' },
    { vigencia: '2019-01-01', valor: 998.00, reajuste: 4.61, legislacao: 'Decreto 9.661/2019' },
    { vigencia: '2018-01-01', valor: 954.00, reajuste: 1.81, legislacao: 'Decreto 9.255/2017' },
    { vigencia: '2017-01-01', valor: 937.00, reajuste: 6.48, legislacao: 'Lei 13.152/2015' },
    { vigencia: '2016-01-01', valor: 880.00, reajuste: 11.68, legislacao: 'Decreto 8.618/2015' },
    { vigencia: '2015-01-01', valor: 788.00, reajuste: 8.84, legislacao: 'Decreto 8.381/2014' },
    { vigencia: '2014-01-01', valor: 724.00, reajuste: 6.78, legislacao: 'Decreto 8.166/2013' },
    { vigencia: '2013-01-01', valor: 678.00, reajuste: 9.00, legislacao: 'Decreto 7.872/2012' },
    { vigencia: '2012-01-01', valor: 622.00, reajuste: 14.13, legislacao: 'Decreto 7.655/2011' },
    { vigencia: '2011-03-01', valor: 545.00, reajuste: 0.93, legislacao: 'Lei 12.382/2011' },
    { vigencia: '2011-01-01', valor: 540.00, reajuste: 5.88, legislacao: 'MP 516/2010' },
    { vigencia: '2010-01-01', valor: 510.00, reajuste: 9.68, legislacao: 'Lei 12.255/2010' },
    { vigencia: '2009-02-01', valor: 465.00, reajuste: 12.05, legislacao: 'Lei 11.944/2009' },
    { vigencia: '2008-03-01', valor: 415.00, reajuste: 9.21, legislacao: 'Lei 11.709/2008' },
    { vigencia: '2007-04-01', valor: 380.00, reajuste: 8.57, legislacao: 'Lei 11.498/2007' },
    { vigencia: '2006-04-01', valor: 350.00, reajuste: 16.67, legislacao: 'Lei 11.321/2006' },
    { vigencia: '2005-05-01', valor: 300.00, reajuste: 15.38, legislacao: 'Lei 11.164/2005' },
    { vigencia: '2004-05-01', valor: 260.00, reajuste: 8.33, legislacao: 'Lei 10.888/2004' },
    { vigencia: '2003-06-01', valor: 240.00, reajuste: 20.00, legislacao: 'Lei 10.699/2003' },
    { vigencia: '2002-06-01', valor: 200.00, reajuste: 11.11, legislacao: 'Lei 10.525/2002' },
    { vigencia: '2001-06-01', valor: 180.00, reajuste: 19.21, legislacao: 'MP 2.194-6/2001' },
    { vigencia: '2000-06-01', valor: 151.00, reajuste: 11.03, legislacao: 'Lei 9.971/2000' },
    { vigencia: '1999-05-01', valor: 136.00, reajuste: 4.62, legislacao: 'Lei 9.971/2000' },
    { vigencia: '1998-05-01', valor: 130.00, reajuste: 8.33, legislacao: 'Lei 9.971/2000' },
    { vigencia: '1997-05-01', valor: 120.00, reajuste: 7.14, legislacao: 'Lei 9.971/2000' },
    { vigencia: '1996-05-01', valor: 112.00, reajuste: 12.00, legislacao: 'Lei 9.971/2000' },
    { vigencia: '1995-05-01', valor: 100.00, reajuste: 42.86, legislacao: 'Lei 9.032/1995' },
    { vigencia: '1994-09-01', valor: 70.00, reajuste: 8.04, legislacao: 'MP 598/1994' },
    { vigencia: '1994-07-01', valor: 64.79, reajuste: 0, legislacao: 'Lei 8.880/1994' },
];

/**
 * Retorna o salário mínimo vigente em uma determinada data
 */
export const getSalaryForDate = (date: Date | string): number => {
    const targetDate = typeof date === 'string' ? new Date(date) : date;

    // Encontra o salário vigente na data (o primeiro que seja <= à data alvo)
    for (const salary of SALARY_HISTORY) {
        const vigenciaDate = new Date(salary.vigencia);
        if (targetDate >= vigenciaDate) {
            return salary.valor;
        }
    }

    // Fallback: retorna o salário mais antigo
    return SALARY_HISTORY[SALARY_HISTORY.length - 1].valor;
};

/**
 * Calcula o valor reajustado de uma data base até hoje
 * Aplica todos os reajustes ocorridos entre a data base e a data atual
 */
export const calculateAdjustedValue = (
    baseValue: number,
    baseDate: Date | string
): number => {
    const baseDateObj = typeof baseDate === 'string' ? new Date(baseDate) : baseDate;
    const today = new Date();

    let adjustedValue = baseValue;

    // Aplica todos os reajustes que ocorreram após a data base
    for (const salary of SALARY_HISTORY) {
        const vigenciaDate = new Date(salary.vigencia);

        // Se a vigência é posterior à data base e anterior/igual a hoje
        if (vigenciaDate > baseDateObj && vigenciaDate <= today) {
            // Aplica o reajuste
            adjustedValue = adjustedValue * (1 + salary.reajuste / 100);
        }
    }

    return Math.round(adjustedValue * 100) / 100; // Arredonda para 2 casas decimais
};

/**
 * Gera a tabela de pagamentos para o salário maternidade
 * @param birthDate - Data de nascimento da criança
 * @param months - Número de meses de benefício (padrão: 4)
 * @returns Array com competência, valor_base e valor_reajustado
 */
export const generatePaymentTable = (
    birthDate: Date | string,
    months: number = 4
): Array<{ competencia: string; valor_base: number; valor_reajustado: number }> => {
    const birthDateObj = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    const table = [];

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    for (let i = 0; i < months; i++) {
        // Calcula a data da competência (mês do nascimento + i)
        const competenciaDate = new Date(birthDateObj);
        competenciaDate.setMonth(competenciaDate.getMonth() + i);

        // Busca o salário mínimo vigente naquela competência
        const valorBase = getSalaryForDate(competenciaDate);

        // Calcula o valor reajustado até hoje
        const valorReajustado = calculateAdjustedValue(valorBase, competenciaDate);

        // Formata a competência
        const month = monthNames[competenciaDate.getMonth()];
        const year = competenciaDate.getFullYear();
        const competencia = `${month}/${year}`;

        table.push({
            competencia,
            valor_base: valorBase,
            valor_reajustado: valorReajustado
        });
    }

    return table;
};

/**
 * Calcula o total da tabela
 */
export const calculateTotal = (
    table: Array<{ valor_base: number; valor_reajustado: number }>
): { total_base: number; total_reajustado: number } => {
    const total_base = table.reduce((sum, row) => sum + row.valor_base, 0);
    const total_reajustado = table.reduce((sum, row) => sum + row.valor_reajustado, 0);

    return {
        total_base: Math.round(total_base * 100) / 100,
        total_reajustado: Math.round(total_reajustado * 100) / 100
    };
};
