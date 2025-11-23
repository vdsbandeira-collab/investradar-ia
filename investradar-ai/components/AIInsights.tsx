import React, { useState, useRef, useEffect } from 'react';
import { analyzePortfolio, analyzeDiscountOpportunities, analyzeRisks, askPortfolioAI } from '../services/geminiService';
import { StockData } from '../types';
import { Sparkles, Bot, Send, User, Loader2, TrendingDown, Medal, AlertTriangle, Target, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown'; 

interface AIInsightsProps {
  stocks: StockData[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AIInsights: React.FC<AIInsightsProps> = ({ stocks }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '⚠️ **Importante:** Nada aqui é recomendação de compra ou venda. As análises são apenas para fins de estudo e ampliação de conhecimento.\n\nOlá! Sou seu analista de investimentos pessoal. **Como posso ajudar sua carteira hoje?** Escolha uma opção ou digite sua pergunta abaixo.',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Use ref for the container instead of a dummy element to prevent window scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, loading, isOpen]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      role,
      content,
      timestamp: new Date()
    }]);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userQuestion = inputText;
    setInputText(''); // Clear input immediately
    setLoading(true);

    addMessage('user', userQuestion);

    try {
        const response = await askPortfolioAI(userQuestion, stocks);
        addMessage('assistant', response);
    } catch (error) {
        addMessage('assistant', "Desculpe, tive um problema ao processar sua pergunta.");
    } finally {
        setLoading(false);
    }
  };

  const handleChipAction = async (action: string) => {
    if (loading) return;
    setLoading(true);

    let userText = "";
    let resultText = "";

    try {
      if (action === 'rankings') {
        userText = "Quais são as melhores ações baseadas no Ranking Geral?";
        addMessage('user', userText);
        const topStocks = [...stocks].sort((a, b) => a.rankGeneral - b.rankGeneral).slice(0, 7);
        resultText = await analyzePortfolio(topStocks);
      } 
      else if (action === 'discounts') {
        userText = "Analise as maiores oportunidades de desconto (Preço vs Entrada).";
        addMessage('user', userText);
        const cheapStocks = [...stocks]
            .filter(s => s.priceDiff !== -Infinity && s.priceDiff !== Infinity)
            .sort((a, b) => a.priceDiff - b.priceDiff)
            .slice(0, 5);
        resultText = await analyzeDiscountOpportunities(cheapStocks);
      }
      else if (action === 'risks') {
        userText = "Quais ações apresentam maior risco na minha lista?";
        addMessage('user', userText);
        const riskyStocks = [...stocks]
            .sort((a, b) => b.debtEbitda - a.debtEbitda)
            .slice(0, 5);
        resultText = await analyzeRisks(riskyStocks);
      }
      else if (action === 'contributions') {
        userText = "Onde devo aportar meu dinheiro hoje?";
        addMessage('user', userText);
        const bestBuys = [...stocks]
            .filter(s => s.rankGeneral <= 20 && s.priceDiff < 0)
            .sort((a, b) => a.rankGeneral - b.rankGeneral)
            .slice(0, 5);
        
        if (bestBuys.length === 0) {
            resultText = "No momento, não encontrei ações que satisfaçam simultaneamente o critério de estar no Top 20 do Ranking E abaixo do preço de entrada. Considere olhar as **Oportunidades de Desconto** isoladamente.";
        } else {
            resultText = await analyzePortfolio(bestBuys);
        }
      }

      addMessage('assistant', resultText);

    } catch (error) {
      addMessage('assistant', "Desculpe, tive um problema ao analisar os dados. Verifique sua conexão ou tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const hasApiKey = !!process.env.API_KEY;

  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden mb-8 flex flex-col transition-all duration-500 ease-in-out ${isOpen ? 'h-[600px]' : 'h-[72px]'}`}>
      
      {/* Header - Clickable to Toggle */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between cursor-pointer shadow-md z-10 shrink-0 h-[72px]"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
              <h2 className="text-white font-bold text-sm md:text-base">Analista IA Gemini</h2>
              <p className="text-blue-100 text-xs">
                {isOpen ? 'Seu copiloto de investimentos' : 'Clique para expandir e conversar'}
              </p>
          </div>
        </div>
        <div className="text-white opacity-80 hover:opacity-100 transition-opacity">
          {isOpen ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
        </div>
      </div>

      {/* Main Content Area - Hidden when collapsed via height transition */}
      {!hasApiKey ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 gap-4 bg-slate-50">
            <div className="bg-yellow-100 p-4 rounded-full">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
            <div>
                <h3 className="font-bold text-slate-800">API Key Necessária</h3>
                <p className="text-sm mt-1 max-w-md">Para utilizar o analista de investimentos inteligente, você precisa configurar a variável <code>process.env.API_KEY</code> com sua chave da Google Gemini API.</p>
            </div>
        </div>
      ) : (
        <>
            {/* Chat Area */}
            <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-thin"
            >
                {messages.map((msg) => (
                <div
                    key={msg.id}
                    className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                        msg.role === 'user' ? 'bg-slate-200' : 'bg-blue-100'
                    }`}>
                        {msg.role === 'user' ? <User className="w-4 h-4 text-slate-600" /> : <Bot className="w-5 h-5 text-blue-600" />}
                    </div>

                    {/* Bubble */}
                    <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                    }`}>
                        {msg.role === 'assistant' ? (
                            <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:text-slate-800 prose-headings:font-bold prose-strong:text-slate-900 prose-ul:list-disc prose-ul:pl-4 prose-li:my-0.5">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        ) : (
                            msg.content
                        )}
                        <span className={`text-[10px] block mt-1 opacity-60 ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                            {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                    </div>
                </div>
                ))}
                
                {loading && (
                    <div className="flex justify-start w-full">
                        <div className="flex gap-3 max-w-[75%]">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center">
                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                            </div>
                            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm flex items-center gap-2">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input / Actions Area */}
            <div className="bg-white p-3 border-t border-slate-200 flex flex-col gap-3 shrink-0">
                
                {/* Suggestion Chips */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        type="button"
                        onClick={() => handleChipAction('discounts')}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
                    >
                        <TrendingDown className="w-3.5 h-3.5" />
                        Analisar Descontos
                    </button>

                    <button
                        type="button"
                        onClick={() => handleChipAction('rankings')}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
                    >
                        <Medal className="w-3.5 h-3.5" />
                        Melhores Rankings
                    </button>

                    <button
                        type="button"
                        onClick={() => handleChipAction('contributions')}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
                    >
                        <Target className="w-3.5 h-3.5" />
                        Vale estudo para aportar
                    </button>

                    <button
                        type="button"
                        onClick={() => handleChipAction('risks')}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Análise de Risco
                    </button>
                </div>

                {/* Text Input Form */}
                <form onSubmit={handleManualSubmit} className="relative flex items-center">
                    <input 
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Pergunte sobre sua carteira (Ex: Qual ação do agro tem melhor DY?)"
                        className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                        disabled={loading}
                    />
                    <button 
                        type="submit" 
                        disabled={!inputText.trim() || loading}
                        className="absolute right-2 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>

            </div>
        </>
      )}
    </div>
  );
};

export default AIInsights;