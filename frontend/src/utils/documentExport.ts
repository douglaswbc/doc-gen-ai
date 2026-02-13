// src/utils/documentExport.ts

/**
 * Utilitário para exportar documentos HTML para PDF e Word
 */

// @ts-ignore - html2pdf.js não tem tipos
import html2pdf from 'html2pdf.js';

/**
 * Baixa o documento como PDF
 * @param htmlContent - Conteúdo HTML do documento
 * @param filename - Nome do arquivo (sem extensão)
 */
export const downloadAsPDF = async (htmlContent: string, filename: string = 'documento'): Promise<void> => {
    // Cria um container temporário com estilos
    const container = document.createElement('div');
    container.innerHTML = `
        <style>
            body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #000; background: #fff; }
            * { color: #000 !important; border-color: #000 !important; }
            p { text-align: justify; line-height: 1.5; margin-bottom: 12px; color: #000; }
            ol { margin-left: 30pt; padding-left: 0; list-style-position: outside; }
            li { margin-bottom: 8px; list-style-type: decimal; display: list-item; }
            table { width: 100%; border-collapse: collapse; border: 1px solid #000; page-break-inside: avoid; color: #000; }
            th, td { border: 1px solid #000; padding: 8px; color: #000; }
            h2, h3 { margin-top: 20px; color: #000; }
        </style>
        ${htmlContent}
    `;

    const options = {
        margin: [15, 15, 15, 15] as [number, number, number, number], // mm
        filename: `${filename}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait' as const
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
        await html2pdf().set(options).from(container).save();
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        throw new Error('Falha ao gerar o PDF');
    }
};

/**
 * Baixa o documento como Word (formato .doc compatível)
 * Usa formato HTML que o Word reconhece nativamente
 * @param htmlContent - Conteúdo HTML do documento
 * @param filename - Nome do arquivo (sem extensão)
 */
export const downloadAsWord = async (htmlContent: string, filename: string = 'documento'): Promise<void> => {
    // Formata o HTML para Word com estilos embutidos e headers especiais para Word
    const fullHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <meta name="ProgId" content="Word.Document">
            <meta name="Generator" content="Microsoft Word 15">
            <meta name="Originator" content="Microsoft Word 15">
            <!--[if gte mso 9]>
            <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                    <w:DoNotOptimizeForBrowser/>
                </w:WordDocument>
            </xml>
            <![endif]-->
            <style>
                @page { 
                    size: A4; 
                    margin: 2cm; 
                }
                body { 
                    font-family: Arial, Helvetica, sans-serif; 
                    font-size: 12pt; 
                    color: #000; 
                    line-height: 1.5;
                }
                p { 
                    text-align: justify; 
                    margin-bottom: 12px; 
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                }
                th, td { 
                    border: 1px solid black; 
                    padding: 8px; 
                }
                h2, h3 { 
                    margin-top: 20px; 
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `;

    try {
        // Cria Blob com tipo MIME do Word
        const blob = new Blob(['\ufeff', fullHtml], {
            type: 'application/msword'
        });

        // Cria link de download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erro ao gerar Word:', error);
        throw new Error('Falha ao gerar o documento Word');
    }
};

/**
 * Formata um nome de arquivo seguro
 */
export const sanitizeFilename = (name: string): string => {
    return name
        .replace(/[^a-zA-Z0-9\s\-_àáâãéêíóôõúç]/gi, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
};
