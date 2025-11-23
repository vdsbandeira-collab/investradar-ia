import { GoogleGenAI } from "@google/genai";
import { StockData } from "../types";

// Check for API key availability
const apiKey = process.env.API_KEY || "";

const getClient = () => {
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
}

const DISCLAIMER = "⚠️ **Importante:** Nada aqui é recomendação de compra ou venda. As análises são apenas para fins de estudo e ampliação de conhecimento.\n\n";

// Helper to format data for context
const formatStockContext = (stocks: StockData[]): string => {
    return stocks.map(s => 
        `[${s.ticker}] ${s.company} | Rank: #${s.rankGeneral} | Preço: R$${s.currentPrice} | Teto: R$${s.fairPrice} | DY: ${s.dy}% | P/L: ${s.plProjected} | Div/EBITDA: ${s.debtEbitda} | Margem: ${s.marginSafety}% | Diff Preço: ${s.priceDiff}% | Status: ${s.raw[1] || 'N/A'}`
    ).join('\n');
};

export const askPortfolioAI = async (question: string, stocks: StockData[]): Promise<string> => {
    const ai = getClient();
    if (!ai) return "Chave de API não encontrada.";

    // Context Window is large enough on Gemini 2.5 to send full list usually
    const contextData = formatStockContext(stocks);

    const prompt = `
      Você é um assistente financeiro especialista em Value Investing (Graham/Buffett/Barsi) analisando a carteira do usuário.
      
      ABAIXO ESTÃO OS DADOS ATUAIS DAS AÇÕES (Rastreador do Usuário):
      ---
      ${contextData}
      ---

      PERGUNTA DO USUÁRIO:
      "${question}"

      INSTRUÇÕES:
      1. Responda APENAS com base nos dados fornecidos acima e em seu conhecimento geral de finanças.
      2. Se o usuário perguntar sobre uma ação que não está na lista, avise que não tem dados sobre ela.
      3. Seja objetivo, direto e utilize Markdown para formatar (negrito para Tickers e valores importantes).
      4. Responda em Português do Brasil.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return DISCLAIMER + (response.text || "Não consegui gerar uma resposta.");
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        return "Erro ao processar sua pergunta. Tente novamente.";
    }
};

export const analyzePortfolio = async (topStocks: StockData[]): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Chave de API não encontrada. Por favor, verifique se process.env.API_KEY está configurada.";

  const stockSummaries = topStocks.map(s => 
    `- ${s.ticker} (${s.company}): Rank Geral #${s.rankGeneral}, Preço R$${s.currentPrice}, Preço Teto R$${s.fairPrice}, DY ${s.dy}%, P/L ${s.plProjected}, Dívida/EBITDA ${s.debtEbitda}, Margem de Segurança ${s.marginSafety}%`
  ).join('\n');

  const prompt = `
    Atue como um analista financeiro sênior e investidor de valor (estilo Graham/Buffett).
    Analise as seguintes ações brasileiras que ficaram no topo do meu ranking fundamentalista:

    ${stockSummaries}

    Forneça uma análise concisa (máx 300 palavras) cobrindo:
    1. A oportunidade mais atrativa baseada na relação Risco x Retorno (Ranking Geral e Margem).
    2. Quaisquer sinais de alerta visíveis nas métricas (ex: dívida alta ou crescimento negativo se aparente).
    3. Uma recomendação final sobre qual priorizar para estudo.
    
    Formate usando Markdown. Responda em Português do Brasil.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return DISCLAIMER + (response.text || "Nenhuma análise gerada.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Falha ao gerar análise. Por favor, tente novamente mais tarde.";
  }
};

export const analyzeDiscountOpportunities = async (cheapStocks: StockData[]): Promise<string> => {
    const ai = getClient();
    if (!ai) return "Chave de API não encontrada.";
  
    const stockSummaries = cheapStocks.map(s => 
      `- ${s.ticker}: Preço Atual R$${s.currentPrice} vs Preço Entrada R$${s.priceDiff ? (s.currentPrice / (1 + (s.priceDiff/100))).toFixed(2) : 'N/A'} (Diferença: ${s.priceDiff}%), P/L ${s.plProjected}, DY ${s.dy}%`
    ).join('\n');
  
    const prompt = `
      Você é um especialista em identificar oportunidades de compra em ações descontadas ("Bargain Hunting").
      Eu selecionei as ações da minha lista que estão com o maior DESCONTO em relação ao meu preço de entrada estipulado (Diferença negativa).
  
      Dados das ações mais baratas vs entrada:
      ${stockSummaries}
  
      Por favor, analise:
      1. Quais destas parecem ser uma oportunidade real de aporte agora (estão baratas por ineficiência do mercado)?
      2. Quais podem ser uma "Armadilha de Valor" (estão baratas porque a empresa está piorando)? Olhe para o P/L para ajudar a decidir.
      3. Indique a top #1 para aportar hoje visando valorização e dividendos.
  
      Seja direto. Use Markdown.
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return DISCLAIMER + (response.text || "Nenhuma análise gerada.");
    } catch (error) {
      console.error("Gemini API Error (Discounts):", error);
      return "Erro ao analisar descontos.";
    }
  };

export const analyzeRisks = async (riskyStocks: StockData[]): Promise<string> => {
    const ai = getClient();
    if (!ai) return "Chave de API não encontrada.";

    const stockSummaries = riskyStocks.map(s => 
        `- ${s.ticker}: Dívida/EBITDA ${s.debtEbitda}, Margem Seg ${s.marginSafety}%, P/L ${s.plProjected}, DY ${s.dy}%`
    ).join('\n');

    const prompt = `
        Atue como um gestor de riscos. Analise as seguintes ações da minha lista que apresentam indicadores preocupantes (Dívida alta ou Margem de segurança negativa):

        ${stockSummaries}

        1. Identifique qual delas representa o maior risco para a carteira no momento.
        2. Explique brevemente o impacto da Dívida/EBITDA alta ou Margem negativa neste contexto.
        3. Recomende se devo manter observação ou considerar saída (hipoteticamente).

        Seja cauteloso e direto. Use Markdown.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return DISCLAIMER + (response.text || "Nenhuma análise de risco gerada.");
    } catch (error) {
        console.error("Gemini API Error (Risks):", error);
        return "Erro ao analisar riscos.";
    }
}