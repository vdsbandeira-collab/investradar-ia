
import { StockData, SortOrder, STANDARD_HEADERS, NETO_INVEST_HEADERS, TableLayoutConfig } from '../types';

// Helper: Parse Brazilian formatted numbers (e.g., "1.234,56" or "12,50%")
export const parseBRNumber = (str: string | undefined): number => {
  if (!str || typeof str !== 'string') return -Infinity;
  
  let cleanStr = str.replace(/[R$\%\s]/g, ''); // Remove symbols
  cleanStr = cleanStr.replace(/\./g, ''); // Remove thousands separator
  cleanStr = cleanStr.replace(',', '.'); // Replace decimal separator
  
  const num = parseFloat(cleanStr);
  return isNaN(num) ? -Infinity : num;
};

// Helper for ASC sorting where null/-Infinity should be treated as "worst"
export const parseBRNumberAsc = (str: string | undefined): number => {
  const num = parseBRNumber(str);
  return num === -Infinity ? Infinity : num; 
};

interface ProcessResult {
    processed: StockData[];
    headers: string[];
    initialHiddenColumns: number[];
    layoutConfig: TableLayoutConfig;
}

export const processStockData = (rawData: string, mode: 'standard' | 'neto'): ProcessResult => {
  const rows = rawData.trim().split('\n').map(row => row.split('\t'));
  if (rows.length < 2) {
      throw new Error("Dados insuficientes.");
  }

  // --- NETO INVEST MODE ---
  if (mode === 'neto') {
    // Neto Invest headers are fixed as per requirement
    const headers = NETO_INVEST_HEADERS; 
    const dataRows = rows.slice(1); // Skip input header, strictly use defined structure

    // Mapping based on Neto Invest structure:
    // 0: Empresa, 1: Código, 2: Atuação ... 
    // 6: P/L Proj, 8: Desvio PL, 9: CAGR, 10: Div/EBITDA
    // 14: DY, 15: Cotação, 16: Teto, 17: Margem
    
    const stocks: StockData[] = dataRows.map(row => {
        // Pad row if needed
        const safeRow = [...row];
        while(safeRow.length < headers.length) safeRow.push('');

        return {
            id: safeRow[1] || `unknown-${Math.random()}`,
            raw: safeRow,
            ticker: safeRow[1],
            company: safeRow[0],
            sector: safeRow[2],
            // Metrics mapping
            plProjected: parseBRNumber(safeRow[6]),
            plDeviation: parseBRNumber(safeRow[8]),
            dy: parseBRNumber(safeRow[14]),
            marginSafety: parseBRNumber(safeRow[17]),
            cagr: parseBRNumber(safeRow[9]),
            debtEbitda: parseBRNumber(safeRow[10]),
            currentPrice: parseBRNumber(safeRow[15]),
            fairPrice: parseBRNumber(safeRow[16]),
            priceDiff: 0, // Not explicitly in Neto sheet, can calculate or leave 0
            
            // Ranks (calculated later)
            rankPL: 0, rankDeviation: 0, rankDY: 0, rankMargin: 0, 
            rankCAGR: 0, rankDebt: 0, rankTotal: 0, rankGeneral: 0
        };
    });

    // Calculate Price Difference for Neto Mode (Current - Fair / Fair) if not present
    stocks.forEach(s => {
        if (s.currentPrice > 0 && s.fairPrice > 0) {
            s.priceDiff = ((s.currentPrice - s.fairPrice) / s.fairPrice) * 100;
        }
    });

    // Calculate Ranks internally for Charts/AI
    calculateRanks(stocks);

    return {
        processed: stocks,
        headers: headers,
        initialHiddenColumns: [], // Show all columns for Neto Invest
        layoutConfig: {
            stickyIndices: [0, 1], // Empresa and Código
            companyIndex: 0,
            tickerIndex: 1,
            // Status and General Rank don't exist in this view
        }
    };
  }

  // --- STANDARD MODE (Includes "Standard" and "Alternate/Simplified" inputs) ---
  else {
    let inputHeaders = rows[0];
    let dataRows = rows.slice(1);
    let activeHeaders = STANDARD_HEADERS;
    let initialHiddenColumns: number[] = [];

    // Check if input is the "Simplified" format (starts with "Empresa") but user selected Standard Mode template
    // We normalize it to the Standard Full Format (33 cols)
    if (inputHeaders[0] && inputHeaders[0].trim().toLowerCase() === 'empresa') {
        initialHiddenColumns = [1, 27]; // Hide Status (1) and Entry Price (27) by default
        
        dataRows = dataRows.map(row => {
            const newRow = new Array(STANDARD_HEADERS.length).fill('');
            // Map simplified input to standard slots
            // Input 0 (Empresa) -> Standard 9
            newRow[9] = row[0];
            newRow[10] = row[1]; // Ticker
            newRow[11] = row[2]; // Sector
            
            // Metrics
            newRow[15] = row[6]; // PL Proj
            newRow[17] = row[8]; // Desvio
            newRow[18] = row[9]; // CAGR
            newRow[19] = row[10]; // Divida
            newRow[23] = row[14]; // DY
            newRow[24] = row[15]; // Cotacao
            newRow[25] = row[16]; // Teto
            newRow[26] = row[17]; // Margem
            
            // Frequencia etc
            newRow[29] = row[18];
            newRow[30] = row[19];
            newRow[31] = row[20];

            // Investidor 10 link
            if (row[1]) newRow[32] = `https://investidor10.com.br/acoes/${row[1].trim()}`;

            // Calculate Price Diff
            const price = parseBRNumber(row[15]);
            const fair = parseBRNumber(row[16]);
            if (price !== -Infinity && fair !== -Infinity && fair !== 0) {
                const diff = ((price - fair) / fair) * 100;
                newRow[28] = diff.toFixed(2).replace('.', ',') + '%';
            } else {
                newRow[28] = "0,00%";
            }

            return newRow;
        });
    }

    const stocks: StockData[] = dataRows.map(row => {
        const safeRow = [...row];
        while(safeRow.length < activeHeaders.length) safeRow.push('');

        // Standard indices
        // 9: Empresa, 10: Ticker, 15: PL, 17: Desvio, 23: DY, 26: Margem, 18: CAGR, 19: Divida
        return {
            id: safeRow[10] || `unknown-${Math.random()}`,
            raw: safeRow,
            ticker: safeRow[10],
            company: safeRow[9],
            sector: safeRow[11],
            plProjected: parseBRNumber(safeRow[15]),
            plDeviation: parseBRNumber(safeRow[17]),
            dy: parseBRNumber(safeRow[23]),
            marginSafety: parseBRNumber(safeRow[26]),
            cagr: parseBRNumber(safeRow[18]),
            debtEbitda: parseBRNumber(safeRow[19]),
            currentPrice: parseBRNumber(safeRow[24]),
            fairPrice: parseBRNumber(safeRow[25]),
            priceDiff: parseBRNumber(safeRow[28]),
            
            rankPL: 0, rankDeviation: 0, rankDY: 0, rankMargin: 0, 
            rankCAGR: 0, rankDebt: 0, rankTotal: 0, rankGeneral: 0
        };
    });

    calculateRanks(stocks);

    return {
        processed: stocks,
        headers: activeHeaders,
        initialHiddenColumns,
        layoutConfig: {
            stickyIndices: [0, 9, 10], // Geral, Empresa, Ticker
            generalRankIndex: 0,
            statusIndex: 1,
            companyIndex: 9,
            tickerIndex: 10
        }
    };
  }
};

// Internal helper to calculate rankings
const calculateRanks = (stocks: StockData[]) => {
    const applyRank = (key: keyof StockData, targetRank: keyof StockData, order: SortOrder) => {
        stocks.sort((a, b) => {
            const valA = a[key] as number;
            const valB = b[key] as number;
            const safeA = valA === -Infinity || valA === Infinity ? (order === SortOrder.ASC ? Infinity : -Infinity) : valA;
            const safeB = valB === -Infinity || valB === Infinity ? (order === SortOrder.ASC ? Infinity : -Infinity) : valB;
            return order === SortOrder.ASC ? safeA - safeB : safeB - safeA;
        });
        stocks.forEach((s, i) => { (s as any)[targetRank] = i + 1; });
    };

    applyRank('plProjected', 'rankPL', SortOrder.ASC);
    applyRank('plDeviation', 'rankDeviation', SortOrder.ASC);
    applyRank('dy', 'rankDY', SortOrder.DESC);
    applyRank('marginSafety', 'rankMargin', SortOrder.DESC);
    applyRank('cagr', 'rankCAGR', SortOrder.DESC);
    applyRank('debtEbitda', 'rankDebt', SortOrder.ASC);

    // Total Rank
    stocks.forEach(s => {
        s.rankTotal = s.rankPL + s.rankDeviation + s.rankDY + s.rankMargin + s.rankCAGR + s.rankDebt;
    });

    // General Rank
    applyRank('rankTotal', 'rankGeneral', SortOrder.ASC);

    // If Standard Mode, update the RAW array with calculated ranks so the table shows them
    // Note: We don't do this for Neto Invest because the table columns don't exist there
    if (stocks.length > 0 && stocks[0].raw.length >= 9) {
        stocks.forEach(s => {
            // Check if it's the standard structure by length or specific check
             // Only update if indices align with standard
            if (s.raw.length >= 30) {
                s.raw[0] = s.rankGeneral.toString();
                s.raw[2] = s.rankPL.toString();
                s.raw[3] = s.rankDeviation.toString();
                s.raw[4] = s.rankDY.toString();
                s.raw[5] = s.rankMargin.toString();
                s.raw[6] = s.rankCAGR.toString();
                s.raw[7] = s.rankDebt.toString();
                s.raw[8] = s.rankTotal.toString();
            }
        });
    }

    // Default Sort (Price Diff ASC)
    stocks.sort((a, b) => {
        const valA = a.priceDiff === -Infinity ? Infinity : a.priceDiff; 
        const valB = b.priceDiff === -Infinity ? Infinity : b.priceDiff;
        return valA - valB;
    });
};

export const SAMPLE_DATA_STANDARD = `Ranking Geral	Status	Ranking PL	Ranking Desvio PL	Ranking DY	Ranking Mg	Ranking CAGR	Ranking Divida	Ranking Total	Empresa	Código	Atuação	Quantidade total de ações	Valor de mercado	Lucro líquido estimado 2025	P/L projetado	P/L médio (últ. 10 anos)	Desvio do P/L da sua média	CAGR lucros (últ. 5 anos)	Dívida líquida/EBITDA	Lucro por ação estimado	Payout esperado	Dividendo por ação bruto projetado	Dividend Yield estimado	Cotação atual	Preço Teto	Margem de segurança	Preço de entrada	Dif. Preço Atual x Entrada	Frequência nos anúncios	Meses que costumam anunciar dividendos	Última atualização	Investidor10
42	Fora do radar	44	31	59	14	76	9	251	SLC Agrícola	SLCE3	Agronegócio	441.205.368,00	7.138.702.854	840.000.000,00	8,5	10,8	-21,30%	8%	2,3	1,9	50,00%	0,95	5,90%	16,18	22,33	38%	18,31	-11,64%	Semestral	abril e dezembro	08/11/2025	https://investidor10.com.br/acoes/SLCE3
1	Carteira	1	1	1	1	1	1	6	Banco do Brasil	BBAS3	Bancos	2.865.417.020	150.000.000.000	35.000.000.000	4,0	6,5	-35,00%	15%	0,0	12,00	40,00%	4,80	12,50%	26,50	45,00	41%	30,00	-15,00%	Trimestral	mar,jun,set,dez	08/11/2025	https://investidor10.com.br/acoes/BBAS3`;

export const SAMPLE_DATA_NETO = `Empresa	Código	Atuação	Quantidade total de ações 	Valor de mercado	Lucro líquido estimado 2025	P/L projetado	P/L médio (últ. 10 anos)	Desvio do P/L da sua média	CAGR lucros (últ. 5 anos)	Dívida líquida/EBITDA	Lucro por ação estimado	Payout esperado	Dividendo por ação bruto projetado	Dividend Yield bruto estimado	Cotação atual	Preço Teto	Margem de segurança	Frequência nos anúncios	Meses que costumam anunciar dividendos	Última atualização
SLC Agrícola	SLCE3	Agronegócio	441.205.368,00	R$ 7.138.702.854,24	R$ 840.000.000,00	8,5	10,8	-21,3%	8,4%	2,30	R$ 1,90	50,00%	R$ 0,95	5,9%	R$ 16,18	R$ 22,33	28%	Semestral	abril e dezembro	08/11/2025
Brasilagro	AGRO3	Agronegócio	99.615.457,00	R$ 1.851.851.345,63	R$ 150.000.000,00	12,3	11,0	12,2%	22,8%	1,70	R$ 1,51	65,00%	R$ 0,98	5,3%	R$ 18,59	R$ 24,35	24%	Anual	outubro	08/11/2025
Wiz	WIZC3	Seguros	159.907.000,00	R$ 1.292.048.560,00	R$ 210.000.000,00	6,2	8,6	-28,5%	11,1%	0,70	R$ 1,31	50,00%	R$ 0,66	8,1%	R$ 8,08	R$ 10,51	23%	Anual	abril	08/11/2025
BB Seguridade	BBSE3	Seguros	1.941.214.909,00	R$ 64.584.220.022,43	R$ 8.800.000.000,00	7,3	12,1	-39,3%	18,3%	0,00	R$ 4,53	88,00%	R$ 3,99	12,0%	R$ 33,27	R$ 43,07	23%	Semestral	fevereiro e agosto	08/11/2025
Petroreconcâvo	RECV3	Oléo, gás e biocomb.	292.973.655,00	R$ 3.184.623.629,85	R$ 650.000.000,00	4,9	9,3	-47,3%	31,7%	1,00	R$ 2,22	40,00%	R$ 0,89	8,2%	R$ 10,87	R$ 14,00	22%	Semestral	maio e dez	07/11/2025
Banco BMG	BMGB4	Bancos	582.649.952,00	R$ 2.482.088.795,52	R$ 540.000.000,00	4,6	8,3	-44,6%	0,3%	0,00	R$ 0,93	50,00%	R$ 0,46	10,9%	R$ 4,26	R$ 5,45	22%	Trimestral	abr jul out e dez	13/11/2025
Porto Seguro	PSSA3	Seguros	646.586.060,00	R$ 29.548.982.942,00	R$ 3.400.000.000,00	8,7	11,0	-21,0%	13,4%	0,00	R$ 5,26	50,00%	R$ 2,63	5,8%	R$ 45,70	R$ 57,84	21%	Quadrimestral	mar, jun e out	15/11/2025
IRB	IRBR3	Seguros	81.843.000,00	R$ 3.944.832.600,00	R$ 550.000.000,00	7,2	15,8	-54,6%	0,0%	0,00	R$ 6,72	75,00%	R$ 5,04	10,5%	R$ 48,20	R$ 59,32	19%	Indefinido	Indefinido	13/11/2025
Banco Banrisul	BRSR6	Bancos	408.974.000,00	R$ 5.836.058.980,00	R$ 1.270.000.000,00	4,6	6,5	-29,3%	1,1%	0,00	R$ 3,11	45,00%	R$ 1,40	9,8%	R$ 14,27	R$ 17,28	17%	Trimestral	Mar, jun, set, dez	14/11/2025
Vulcabras	VULC3	Calçados	271.548.956,00	R$ 5.371.238.349,68	R$ 600.000.000,00	9,0	9,5	-5,8%	79,5%	0,02	R$ 2,21	92,00%	R$ 2,03	10,3%	R$ 19,78	R$ 23,92	17%	Mensal	jan a dezembro	06/11/2025
Irani	RANI3	Papel e Celulose	221.172.300,00	R$ 1.875.541.104,00	R$ 265.000.000,00	7,1	9,4	-24,7%	33,0%	2,06	R$ 1,20	65,00%	R$ 0,78	9,2%	R$ 8,48	R$ 10,00	15%	5x por ano	mar abr mai ago nov	31/10/2025
Petrobras	PETR4	Oléo, gás e biocomb.	12.888.732.761,00	R$ 419.786.026.025,77	R$ 100.000.000.000,00	4,2	6,2	-32,3%	65,6%	1,53	R$ 7,76	45,00%	R$ 3,49	10,7%	R$ 32,57	R$ 38,00	14%	Trimestral	abr mai ago nov	14/11/2025
Suzano	SUZB3	Papel e Celulose	1.235.911.173,00	R$ 59.706.868.767,63	R$ 10.000.000.000,00	12,7	12,7	0,5%	10,9%	3,30	R$ 8,09	37,00%	R$ 2,99	6,2%	R$ 48,31	R$ 56,31	14%	Semestral	abril e dez	08/11/2025
Ferbasa	FESA4	Siderurgia e Metalurgia	338.867.600,00	R$ 2.338.186.440,00	R$ 260.000.000,00	9,0	9,4	-4,3%	31,3%	-1,33	R$ 0,77	95,00%	R$ 0,73	10,6%	R$ 6,90	R$ 8,00	14%	Quadrimestral	jun set dez	10/11/2025
Grendene	GRND3	Calçados	902.160.000,00	R$ 4.276.238.400,00	R$ 720.000.000,00	5,9	10,9	-45,5%	14,9%	-2,38	R$ 0,80	55,00%	R$ 0,44	9,3%	R$ 4,74	R$ 5,49	14%	Quadrimestral	maio ago e nov	07/11/2025
Metalúrgica Gerdau	GOAU3	Siderurgia e Metalurgia	993.706.000,00	R$ 10.334.542.400,00	R$ 1.360.000.000,00	7,6	8,9	-14,6%	6,7%	0,85	R$ 1,37	70,00%	R$ 0,96	9,2%	R$ 10,40	R$ 12,00	13%	Trimestral	mar mai ago nov	31/10/2025
Klabin	KLBN11	Papel e Celulose	1.214.937.623,00	R$ 21.346.454.036,11	R$ 8.600.000.000,00	2,5	9,6	-74,1%	10,5%	3,70	R$ 7,08	15,00%	R$ 1,06	6,0%	R$ 17,57	R$ 20,00	12%	Trimestral	fev, mai, ago, nov	14/11/2025
Allos	ALOS3	Shoppings	499.612.226,00	R$ 13.469.545.612,96	R$ 1.500.000.000,00	9,0	14,4	-37,6%	36,5%	1,80	R$ 3,00	112,00%	R$ 3,36	12,5%	R$ 26,96	R$ 30,57	12%	Mensal	jan-dez	18/11/2025
Klabin	KLBN4	Papel e Celulose	6.074.688.115,00	R$ 21.504.395.927,10	R$ 8.600.000.000,00	2,5	9,6	-74,0%	10,5%	3,70	R$ 1,42	15,00%	R$ 0,21	6,0%	R$ 3,54	R$ 4,00	12%	Trimestral	fev, mai, ago, nov	14/11/2025
Shulz	SHUL4	Bens Industriais	356.964.439,00	R$ 1.706.290.018,42	R$ 275.000.000,00	6,2	9,2	-32,6%	13,9%	0,12	R$ 0,77	50,00%	R$ 0,39	8,1%	R$ 4,78	R$ 5,39	11%	Trimestral	abr jun set dez	15/11/2025
Mahle Metal Leve	LEVE3	Automóveis e Motocicletas	135.539.000,00	R$ 4.476.853.170,00	R$ 620.000.000,00	7,2	11,2	-35,5%	34,5%	0,87	R$ 4,57	65,00%	R$ 2,97	9,0%	R$ 33,03	R$ 37,17	11%	Semestral	abril e nov	12/11/2025
Unifique	FIQE3	Telecomunicações	353.049.959,00	R$ 1.867.634.283,11	R$ 210.000.000,00	8,9	9,7	-8,3%	20,0%	0,84	R$ 0,59	50,00%	R$ 0,30	5,6%	R$ 5,29	R$ 5,95	11%	Quadrimestral	fev junho e dez	18/11/2025
Klabin	KLBN3	Papel e Celulose	6.074.688.115,00	R$ 21.625.889.689,40	R$ 8.600.000.000,00	2,5	9,6	-73,8%	10,5%	3,70	R$ 1,42	15,00%	R$ 0,21	6,0%	R$ 3,56	R$ 4,00	11%	Trimestral	fev, mai, ago, nov	14/11/2025
Tegma	TGMA3	Logistica	66.003.000,00	R$ 2.413.729.710,00	R$ 270.000.000,00	8,9	12,9	-30,7%	30,7%	-0,35	R$ 4,09	80,00%	R$ 3,27	8,9%	R$ 36,57	R$ 40,91	11%	Quadrimestral	abr ago e nov	15/11/2025
Dexxos	DEXP3	Industrial	107.361.840,00	R$ 867.483.667,20	R$ 150.000.000,00	5,8	5,9	-2,0%	2,8%	0,08	R$ 1,40	35,00%	R$ 0,49	6,1%	R$ 8,08	R$ 9,00	10%	Semestral	abril e dezembro	16/11/2025
Banco da Amazônia	BAZA3	Bancos	56.058.000,00	R$ 4.416.809.820,00	R$ 1.000.000.000,00	4,4	4,9	-9,9%	35,9%	0,00	R$ 17,84	25,00%	R$ 4,46	5,7%	R$ 78,79	R$ 87,76	10%	Anual	abril	26/09/2025
Gerdau	GGBR3	Siderurgia e Metalurgia	1.989.711.987,00	R$ 31.457.346.514,47	R$ 3.900.000.000,00	8,1	10,5	-23,2%	6,7%	0,85	R$ 1,96	70,00%	R$ 1,37	8,7%	R$ 15,81	R$ 17,50	10%	Trimestral	mar mai ago nov	31/10/2025
Itausa	ITSA4	Holding	10.841.709.548,00	R$ 127.715.338.475,44	R$ 17.300.000.000,00	7,4	8,7	-15,1%	16,4%	0,00	R$ 1,60	65,00%	R$ 1,04	8,8%	R$ 11,78	R$ 12,77	8%	Semestral	fevereiro e ago	04/11/2025
Banco Pine	PINE4	Bancos	226.428.370,00	R$ 2.291.455.104,40	R$ 380.000.000,00	6,0	7,2	-16,2%	29,9%	0,00	R$ 1,68	35,00%	R$ 0,59	5,8%	R$ 10,12	R$ 10,91	7%	Trimestral	jan, abr, jul, out	15/11/2025
Odontoprev	ODPV3	Seguros	545.092.900,00	R$ 6.132.295.125,00	R$ 550.000.000,00	11,1	19,4	-42,5%	10,0%	-0,64	R$ 1,01	95,00%	R$ 0,96	8,5%	R$ 11,25	R$ 11,98	6%	8x por ano	mar abr mai jun ago set nov dez	08/11/2025
Romi	ROMI3	Industrial	93.171.000,00	R$ 750.026.550,00	R$ 90.000.000,00	8,3	8,7	-4,2%	-12,0%	3,04	R$ 0,97	65,00%	R$ 0,63	7,8%	R$ 8,05	R$ 8,50	5%	Trimestral	mar jun set e dez	21/10/2025
Caixa Seguridade	CXSE3	Seguros	3.000.000.000,00	R$ 47.190.000.000,00	R$ 4.400.000.000,00	10,7	12,4	-13,5%	19,7%	0,00	R$ 1,47	90,00%	R$ 1,32	8,4%	R$ 15,73	R$ 16,50	5%	Trimestral	jan, abr, ago e nov	14/11/2025
Banco Itau	ITUB3	Bancos	10.753.776.126,00	R$ 379.178.146.202,76	R$ 46.500.000.000,00	8,2	9,1	-10,4%	23,8%	0,00	R$ 4,32	70,00%	R$ 3,03	8,6%	R$ 35,26	R$ 36,75	4%	Semestral	fevereiro e ago	04/11/2025
Fleury	FLRY3	Saúde	544.279.713,00	R$ 8.343.808.000,29	R$ 790.000.000,00	10,6	25,0	-57,8%	17,8%	1,51	R$ 1,45	75,00%	R$ 1,09	7,1%	R$ 15,33	R$ 15,97	4%	Semestral	março e dezembro	08/11/2025
Celesc	CLSC4	Energia	38.572.000,00	R$ 4.524.109.880,00	R$ 780.000.000,00	5,8	5,6	3,6%	7,3%	2,20	R$ 20,22	35,00%	R$ 7,08	6,0%	R$ 117,29	R$ 121,33	3%	5x por ano	mar abr jun set dez	14/11/2025
Banco Bradesco	BBDC3	Bancos	10.597.012.700,00	R$ 170.823.844.724,00	R$ 25.000.000.000,00	6,8	9,2	-25,7%	4,9%	0,00	R$ 2,36	55,00%	R$ 1,30	8,0%	R$ 16,12	R$ 16,51	2%	Semestral	junho e dez	07/11/2025
Banco ABC Brasil	ABCB4	Bancos	236.936.000,00	R$ 5.603.536.400,00	R$ 980.000.000,00	5,7	6,7	-14,7%	27,5%	0,00	R$ 4,14	50,00%	R$ 2,07	8,7%	R$ 23,65	R$ 24,21	2%	Semestral	junho e dez	14/11/2025
Comgás	CGAS5	Oléo, gás e biocomb.	132.521.000,00	R$ 17.121.713.200,00	R$ 1.400.000.000,00	12,2	11,4	7,3%	6,8%	1,80	R$ 10,56	100,00%	R$ 10,56	8,2%	R$ 129,20	R$ 132,05	2%	Quadrimestral	março, agosto e novembro	14/11/2025
Marcopolo	POMO3	Industrial	1.126.067.103,00	R$ 7.848.687.707,91	R$ 1.200.000.000,00	6,5	10,8	-39,4%	68,2%	0,85	R$ 1,07	50,00%	R$ 0,53	7,6%	R$ 6,97	R$ 7,10	2%	Trimestral	fev mai ago e nov	08/11/2025
Banco Itau	ITUB4	Bancos	10.753.776.126,00	R$ 429.828.431.756,22	R$ 46.500.000.000,00	9,2	10,0	-7,6%	23,8%	0,00	R$ 4,32	65,00%	R$ 2,81	7,0%	R$ 39,97	R$ 40,43	1%	Semestral	fevereiro e ago	04/11/2025
CSN Mineração	CMIN3	Mineração	5.432.045.700,00	R$ 30.365.135.463,00	R$ 3.500.000.000,00	8,7	7,8	11,2%	-11,3%	-0,69	R$ 0,64	70,00%	R$ 0,45	8,1%	R$ 5,59	R$ 5,64	1%	Quadrimestral	abr jul dez	01/09/2025
Emae	EMAE4	Energia	36.947.000,00	R$ 1.403.616.530,00	R$ 430.000.000,00	3,3	14,6	-77,6%	0,0%	-12,04	R$ 11,64	25,00%	R$ 2,91	7,7%	R$ 37,99	R$ 38,06	0%	Anual	abril	18/11/2025
Vale	VALE3	Mineração	4.437.636.744,00	R$ 289.156.410.239,04	R$ 46.000.000.000,00	6,3	10,3	-39,0%	2,3%	0,99	R$ 10,37	48,00%	R$ 4,98	7,6%	R$ 65,16	R$ 65,00	0%	Quadrimestral	mar, ago e dez	30/10/2025
Electro Aço Altona	EALT4	Industrial	22.500.000,00	R$ 274.275.000,00	R$ 60.000.000,00	4,6	6,8	-32,8%	30,3%	0,77	R$ 2,67	30,00%	R$ 0,80	6,6%	R$ 12,19	R$ 12,00	-2%	Quadrimestral	abril, junho e dezembro	01/09/2025
Bradespar	BRAP4	Holding	393.097.000,00	R$ 7.189.744.130,00	R$ 1.600.000.000,00	4,5	8,7	-48,3%	-5,9%	-0,64	R$ 4,07	38,00%	R$ 1,55	8,5%	R$ 18,29	R$ 18,00	-2%	Semestral	abril e novembro	22/10/2025
Unipar	UNIP6	Químicos	112.722.576,00	R$ 6.718.265.529,60	R$ 650.000.000,00	10,3	9,3	11,1%	16,5%	0,89	R$ 5,77	95,00%	R$ 5,48	9,2%	R$ 59,60	R$ 57,66	-3%	Semestral	março e dezembro	13/11/2025
Cemig	CMIG4	Energia	2.861.781.207,00	R$ 31.508.211.089,07	R$ 3.900.000.000,00	8,1	8,2	-1,5%	19,6%	1,76	R$ 1,36	50,00%	R$ 0,68	6,2%	R$ 11,01	R$ 10,65	-3%	5x por ano	mar abr jun set dez	15/11/2025
Banco Bradesco	BBDC4	Bancos	10.597.012.700,00	R$ 199.117.868.633,00	R$ 25.000.000.000,00	8,0	10,1	-21,1%	1,2%	0,00	R$ 2,36	60,50%	R$ 1,43	7,6%	R$ 18,79	R$ 18,17	-3%	Semestral	junho e dez	07/11/2025
Marcopolo	POMO4	Industrial	1.126.067.103,00	R$ 8.276.593.207,05	R$ 1.200.000.000,00	6,9	9,7	-28,9%	68,2%	0,85	R$ 1,07	50,00%	R$ 0,53	7,2%	R$ 7,35	R$ 7,10	-3%	Trimestral	fev mai ago e nov	08/11/2025
Grazziotin	CGRA4	Varejo	20.082.600,00	R$ 624.568.860,00	R$ 100.000.000,00	6,2	7,3	-14,4%	7,8%	-1,63	R$ 4,98	50,00%	R$ 2,49	8,0%	R$ 31,10	R$ 29,88	-4%	Semestral	jun e dez	01/09/2025
Multiplan	MULT3	Shoppings	488.678.545,00	R$ 14.269.413.514,00	R$ 1.700.000.000,00	8,4	16,0	-47,5%	1,8%	2,28	R$ 3,48	45,00%	R$ 1,57	5,4%	R$ 29,20	R$ 27,83	-5%	Quadrimestral	jun set e dez	01/09/2025
Banco Banese	BGIP4	Bancos	21.548.228,00	R$ 663.685.422,40	R$ 100.000.000,00	6,6	7,3	-9,1%	22,0%	0,00	R$ 4,64	45,00%	R$ 2,09	6,8%	R$ 30,80	R$ 29,18	-6%	Trimestral	fev maio ago e nov	07/09/2025
Banco Santander	SANB4	Bancos	7.470.968.456,00	R$ 128.127.109.020,40	R$ 15.500.000.000,00	8,3	10,2	-19,0%	-1,5%	0,00	R$ 2,07	48,40%	R$ 1,00	5,9%	R$ 17,15	R$ 15,98	-7%	Trimestral	fev, abr, julho e out	08/11/2025
Banco Santander	SANB11	Bancos	3.735.484.228,00	R$ 123.569.818.262,24	R$ 15.500.000.000,00	8,0	10,2	-21,8%	-1,5%	0,00	R$ 4,15	46,00%	R$ 1,91	5,8%	R$ 33,08	R$ 30,50	-8%	Trimestral	fev, abr, julho e out	08/11/2025
Banco Santander	SANB3	Bancos	7.470.968.456,00	R$ 118.340.140.343,04	R$ 15.500.000.000,00	7,6	10,2	-25,1%	-1,5%	0,00	R$ 2,07	44,00%	R$ 0,91	5,8%	R$ 15,84	R$ 14,52	-9%	Trimestral	fev, abr, julho e out	08/11/2025
B3	B3SA3	Serviços Financeiros	5.168.573.066,00	R$ 71.791.479.886,74	R$ 5.000.000.000,00	14,4	21,0	-31,6%	14,7%	0,05	R$ 0,97	100,00%	R$ 0,97	7,0%	R$ 13,89	R$ 12,58	-10%	Trimestral	mar jun set dez	01/09/2025
BR Partners	BRBI11	Serviços Financeiros	104.995.666,67	R$ 2.044.265.630,00	R$ 185.000.000,00	11,1	9,1	21,4%	20,0%	0,00	R$ 1,76	85,00%	R$ 1,50	7,7%	R$ 19,47	R$ 17,62	-11%	Trimestral	mar maio ago e nov	08/11/2025
CSU	CSUD3	Tecnologia	41.280.684,00	R$ 792.176.325,96	R$ 100.000.000,00	7,9	10,1	-21,6%	14,7%	-0,13	R$ 2,42	50,00%	R$ 1,21	6,3%	R$ 19,19	R$ 17,30	-11%	Trimestral	mar abr jun set e dez	06/11/2025
Alupar	ALUP11	Energia	304.758.568,00	R$ 10.066.175.501,04	R$ 790.000.000,00	12,7	11,2	13,8%	-2,3%	3,50	R$ 2,59	65,00%	R$ 1,68	5,1%	R$ 33,03	R$ 29,00	-14%	Trimestral	abr mai ago nov	07/11/2025
Engie Brasil	EGIE3	Energia	815.927.740,00	R$ 34.791.158.833,60	R$ 2.700.000.000,00	12,9	13,8	-6,6%	2,4%	2,90	R$ 3,31	55,00%	R$ 1,82	4,3%	R$ 42,64	R$ 37,00	-15%	Quadrimestral	maio, ago e dez	05/11/2025
Banco do Brasil	BBAS3	Bancos	5.708.696.148,00	R$ 125.591.315.256,00	R$ 18.000.000.000,00	7,0	6,4	9,0%	13,2%	0,00	R$ 3,15	25,0%	R$ 0,79	3,6%	R$ 22,00	R$ 18,73	-17%	8x por ano	mar jun set e dez	12/11/2025
Tim	TIMS3	Telecomunicações	2.420.598.680,00	R$ 59.837.199.369,60	R$ 3.900.000.000,00	15,3	14,8	3,7%	14,5%	-0,18	R$ 1,61	100,00%	R$ 1,61	6,5%	R$ 24,72	R$ 20,95	-18%	5x por ano	mar abr jun set dez	07/11/2025
Ambev	ABEV3	Bebidas	15.727.892.789,00	R$ 214.213.899.786,18	R$ 14.000.000.000,00	15,3	22,0	-30,5%	5,3%	-0,57	R$ 0,89	90,00%	R$ 0,80	5,9%	R$ 13,62	R$ 11,50	-18%	Anual	dezembro	08/11/2025
CPFL Energia	CPFE3	Energia	1.152.254.440,00	R$ 54.951.014.243,60	R$ 5.300.000.000,00	10,4	13,0	-20,2%	8,7%	2,07	R$ 4,60	70,00%	R$ 3,22	6,8%	R$ 47,69	R$ 40,25	-18%	Semestral	abril e agosto	13/11/2025
Taesa	TAEE3	Energia	1.033.496.721,00	R$ 14.448.284.159,58	R$ 1.100.000.000,00	13,1	8,6	52,7%	-5,8%	4,10	R$ 1,06	100,00%	R$ 1,06	7,6%	R$ 13,98	R$ 11,65	-20%	Trimestral	mai, ago, nov, dez	01/09/2025
Taesa	TAEE4	Energia	1.033.496.721,00	R$ 14.592.973.700,52	R$ 1.100.000.000,00	13,3	8,6	54,3%	-5,8%	4,10	R$ 1,06	100,00%	R$ 1,06	7,5%	R$ 14,12	R$ 11,65	-21%	Trimestral	mai, ago, nov, dez	01/09/2025
Taesa	TAEE11	Energia	344.498.907,00	R$ 14.617.088.624,01	R$ 1.100.000.000,00	13,3	8,6	54,5%	-5,8%	4,10	R$ 3,19	100,00%	R$ 3,19	7,5%	R$ 42,43	R$ 35,00	-21%	Trimestral	mai, ago, nov, dez	01/09/2025
Sanepar	SAPR4	Saneamento	1.511.205.519,00	R$ 10.200.637.253,25	R$ 1.200.000.000,00	8,5	7,0	21,4%	17,8%	1,70	R$ 0,79	35,00%	R$ 0,28	4,1%	R$ 6,75	R$ 5,56	-21%	Semestral	jun e dez	01/09/2025
Copel	CPLE3	Energia	2.969.288.600,00	R$ 38.660.137.572,00	R$ 2.600.000.000,00	14,9	8,8	69,0%	-5,0%	2,30	R$ 0,88	91,00%	R$ 0,80	6,1%	R$ 13,02	R$ 10,62	-23%	Semestral	abril e dez	14/11/2025
CEB	CEBR5	Energia	72.082.000,00	R$ 1.858.994.780,00	R$ 185.000.000,00	10,0	7,1	41,5%	7,3%	-3,17	R$ 2,57	75,00%	R$ 1,92	7,5%	R$ 25,79	R$ 21,02	-23%	Semestral	Abril e novembro	08/11/2025
Sanepar	SAPR11	Saneamento	302.241.103,80	R$ 10.321.533.694,77	R$ 1.200.000.000,00	8,6	7,0	22,9%	17,8%	1,70	R$ 3,97	30,00%	R$ 1,19	3,5%	R$ 34,15	R$ 27,79	-23%	Semestral	jun e dez	01/09/2025
ISA Energia	ISAE4	Energia	658.883.304,00	R$ 17.862.326.371,44	R$ 1.450.000.000,00	12,3	7,8	57,9%	-0,5%	3,16	R$ 2,20	75,00%	R$ 1,65	6,1%	R$ 27,11	R$ 22,00	-23%	Anual	dezembro	07/11/2025
CEB	CEBR3	Energia	72.082.000,00	R$ 1.869.086.260,00	R$ 185.000.000,00	10,1	7,1	42,3%	7,3%	-3,17	R$ 2,57	75,00%	R$ 1,92	7,4%	R$ 25,93	R$ 21,02	-23%	Semestral	Abril e novembro	08/11/2025
CEB	CEBR6	Energia	72.082.000,00	R$ 2.062.266.020,00	R$ 185.000.000,00	11,1	7,1	57,0%	7,3%	-3,17	R$ 2,57	75,00%	R$ 2,12	7,4%	R$ 28,61	R$ 23,10	-24%	Semestral	Abril e novembro	08/11/2025
Banco Mercantil	BMEB4	Bancos	104.832.000,00	R$ 6.814.080.000,00	R$ 1.000.000.000,00	6,8	6,2	9,9%	30,1%	0,00	R$ 9,54	35,00%	R$ 3,34	5,1%	R$ 65,00	R$ 52,46	-24%	Semestral	fevereiro e ago	05/11/2025
Sanepar	SAPR3	Saneamento	1.511.205.519,00	R$ 10.759.783.295,28	R$ 1.200.000.000,00	9,0	7,0	28,1%	17,8%	1,70	R$ 0,79	31,85%	R$ 0,25	3,6%	R$ 7,12	R$ 5,56	-28%	Semestral	jun e dez	01/09/2025
Axia Energia	AXIA3	Energia	2.247.634.148,00	R$ 137.173.112.052,44	R$ 8.000.000.000,00	17,1	9,3	84,4%	0,8%	1,80	R$ 3,56	100,00%	R$ 3,56	5,8%	R$ 61,03	R$ 47,46	-29%	Semestral	Abril e dezembro	16/11/2025
Kepler Weber	KEPL3	Agronegócio	173.367.390,00	R$ 1.672.995.313,50	R$ 140.000.000,00	11,9	9,8	21,9%	17,3%	-0,19	R$ 0,81	60,00%	R$ 0,48	5,0%	R$ 9,65	R$ 7,50	-29%	Quadrimestral	mar ago e out	30/10/2025
Vibra Energia	VBBR3	Oléo, gás e biocomb.	1.114.510.920,00	R$ 28.865.832.828,00	R$ 2.700.000.000,00	10,7	9,0	18,8%	7,5%	2,22	R$ 2,42	50,00%	R$ 1,21	4,7%	R$ 25,90	R$ 19,00	-36%	Quadrimestral	abr set e dez	01/09/2025
Telefonica Vivo	VIVT3	Telecomunicações	3.240.086.216,00	R$ 111.718.172.727,68	R$ 6.100.000.000,00	18,3	15,5	18,2%	4,1%	0,40	R$ 1,88	100,00%	R$ 1,88	5,5%	R$ 34,48	R$ 25,10	-37%	6x por ano	fev até dez	31/10/2025
Copasa	CSMG3	Saneamento	379.181.000,00	R$ 14.367.168.090,00	R$ 1.440.000.000,00	20,1	9,1	121,2%	10,7%	2,10	R$ 3,80	42,00%	R$ 1,60	4,2%	R$ 37,89	R$ 22,15	-71%	Trimestral	mar, jun, set e dez	01/09/2025`;
