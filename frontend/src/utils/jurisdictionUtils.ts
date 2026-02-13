// src/utils/jurisdictionUtils.ts

export const getJurisdictionHeader = (aiData: any, fallbackCityUf: string) => {
    if (aiData.jurisdiction) {
        const j = aiData.jurisdiction;
        const subsection = j.subsection || j.subsecao;
        const has_jef = j.has_jef;
        const courtCity = j.courtCity || j.city;
        const legal_basis = j.legal_basis;
        const section = j.section;
        const state = j.state;

        const courtType = has_jef ? 'VARA DO JUIZADO ESPECIAL FEDERAL' : 'VARA FEDERAL';
        const displayedCity = courtCity || j.city || '';

        // Se a seção vier como "Seção Judiciária do Pará", usamos diretamente. 
        // Caso contrário, montamos com a UF.
        const secDisplay = section ? section.toUpperCase() : `SEÇÃO JUDICIÁRIA DO ${state?.toUpperCase() || ''}`;

        const legalLabel = legal_basis
            ? `<br><span style="font-size: 8pt; font-weight: normal; text-transform: none;">(${legal_basis})</span>`
            : '';

        return `AO JUÍZO FEDERAL DA ${courtType} DA COMARCA DE ${displayedCity.toUpperCase()} - ${secDisplay}.${legalLabel}`;
    }

    return `AO JUÍZO FEDERAL DA VARA DO JUIZADO ESPECIAL FEDERAL DA COMARCA DE ${fallbackCityUf.toUpperCase()}.`;
};
