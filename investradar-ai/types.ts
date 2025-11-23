
export interface StockData {
  id: string; // Unique ID (usually ticker)
  raw: string[]; // Keep original raw row for display/export
  
  // Parsed Numeric Values for Charts/Analysis
  plProjected: number;
  plDeviation: number; // Percentage
  dy: number; // Percentage
  marginSafety: number; // Percentage
  cagr: number; // Percentage
  debtEbitda: number;
  priceDiff: number; // Percentage
  
  // Metadata
  ticker: string;
  company: string;
  sector: string;
  currentPrice: number;
  fairPrice: number;

  // Rankings (Calculated)
  rankPL: number;
  rankDeviation: number;
  rankDY: number;
  rankMargin: number;
  rankCAGR: number;
  rankDebt: number;
  rankTotal: number;
  rankGeneral: number; // The final calculated rank
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

export const STANDARD_HEADERS = [
  "Ranking Geral", "Status", "Ranking PL", "Ranking Desvio PL", "Ranking DY", "Ranking Mg",
  "Ranking CAGR", "Ranking Divida", "Ranking Total", "Empresa", "Código", "Atuação",
  "Quantidade total de ações", "Valor de mercado", "Lucro líquido estimado 2025",
  "P/L projetado", "P/L médio (últ. 10 anos)", "Desvio do P/L da sua média",
  "CAGR lucros (últ. 5 anos)", "Dívida líquida/EBITDA", "Lucro por ação estimado",
  "Payout esperado", "Dividendo por ação bruto projetado", "Dividend Yield estimado",
  "Cotação atual", "Preço Teto", "Margem de segurança", "Preço de entrada",
  "Dif. Preço Atual x Entrada", "Frequência nos anúncios", "Meses que costumam anunciar dividendos",
  "Última atualização", "Investidor10"
];

export const NETO_INVEST_HEADERS = [
  "Empresa", "Código", "Atuação", "Quantidade total de ações", "Valor de mercado", 
  "Lucro líquido estimado 2025", "P/L projetado", "P/L médio (últ. 10 anos)", 
  "Desvio do P/L da sua média", "CAGR lucros (últ. 5 anos)", "Dívida líquida/EBITDA", 
  "Lucro por ação estimado", "Payout esperado", "Dividendo por ação bruto projetado", 
  "Dividend Yield bruto estimado", "Cotação atual", "Preço Teto", "Margem de segurança", 
  "Frequência nos anúncios", "Meses que costumam anunciar dividendos", "Última atualização"
];

// Configuration to tell the Table component how to render specific columns
export interface TableLayoutConfig {
  stickyIndices: number[]; // Indices of columns that should stay fixed on the left
  tickerIndex: number;
  companyIndex: number;
  statusIndex?: number; // Optional, as Neto Invest might not have it
  generalRankIndex?: number; // Optional
}
