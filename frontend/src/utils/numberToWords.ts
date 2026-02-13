// src/utils/numberToWords.ts

/**
 * Converte um valor numérico para valor por extenso em português brasileiro
 * Ex: 6511.02 -> "seis mil quinhentos e onze reais e dois centavos"
 */

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const ESPECIAIS = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

/**
 * Converte número de 0 a 999 para extenso
 */
const numberToWordsUpTo999 = (n: number): string => {
    if (n === 0) return '';
    if (n === 100) return 'cem';

    let result = '';

    // Centenas
    const centenas = Math.floor(n / 100);
    if (centenas > 0) {
        result += CENTENAS[centenas];
        n = n % 100;
        if (n > 0) result += ' e ';
    }

    // Dezenas e unidades
    if (n >= 10 && n <= 19) {
        result += ESPECIAIS[n - 10];
    } else {
        const dezenas = Math.floor(n / 10);
        const unidades = n % 10;

        if (dezenas > 0) {
            result += DEZENAS[dezenas];
            if (unidades > 0) result += ' e ';
        }

        if (unidades > 0) {
            result += UNIDADES[unidades];
        }
    }

    return result;
};

/**
 * Converte valor monetário para extenso
 * @param value - Valor numérico (ex: 6511.02)
 * @returns String por extenso (ex: "seis mil quinhentos e onze reais e dois centavos")
 */
export const moneyToWords = (value: number | string): string => {
    // Converte para número se for string
    let num: number;
    if (typeof value === 'string') {
        num = parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
    } else {
        num = value;
    }

    if (isNaN(num) || num === 0) return 'zero reais';

    // Separa reais e centavos
    const reais = Math.floor(num);
    const centavos = Math.round((num - reais) * 100);

    let result = '';

    // Processa reais
    if (reais > 0) {
        if (reais >= 1000000000) {
            const bilhoes = Math.floor(reais / 1000000000);
            result += numberToWordsUpTo999(bilhoes) + (bilhoes === 1 ? ' bilhão' : ' bilhões');
            const resto = reais % 1000000000;
            if (resto > 0) result += ' ';
        }

        if (reais >= 1000000) {
            const milhoes = Math.floor((reais % 1000000000) / 1000000);
            if (milhoes > 0) {
                result += numberToWordsUpTo999(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões');
                const resto = reais % 1000000;
                if (resto > 0) result += ' ';
            }
        }

        if (reais >= 1000) {
            const milhares = Math.floor((reais % 1000000) / 1000);
            if (milhares > 0) {
                if (milhares === 1) {
                    result += 'mil';
                } else {
                    result += numberToWordsUpTo999(milhares) + ' mil';
                }
                const resto = reais % 1000;
                if (resto > 0 && resto < 100) {
                    result += ' e ';
                } else if (resto >= 100) {
                    result += ' ';
                }
            }
        }

        const centenasFinal = reais % 1000;
        if (centenasFinal > 0) {
            result += numberToWordsUpTo999(centenasFinal);
        }

        result += reais === 1 ? ' real' : ' reais';
    }

    // Processa centavos
    if (centavos > 0) {
        if (reais > 0) result += ' e ';
        result += numberToWordsUpTo999(centavos);
        result += centavos === 1 ? ' centavo' : ' centavos';
    }

    return result;
};
