
import React, { useState, useCallback } from 'react';
import DataInput from './components/DataInput';
import StockTable from './components/StockTable';
import AnalysisCharts from './components/AnalysisCharts';
import AIInsights from './components/AIInsights';
import { processStockData } from './services/dataProcessor';
import { StockData, TableLayoutConfig } from './types';
import { Radar, ArrowLeft } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<StockData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [initialHiddenCols, setInitialHiddenCols] = useState<number[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<TableLayoutConfig | null>(null);
  const [view, setView] = useState<'input' | 'dashboard'>('input');

  const handleProcess = useCallback((rawData: string, mode: 'standard' | 'neto') => {
    try {
      const { processed, headers: processedHeaders, initialHiddenColumns, layoutConfig } = processStockData(rawData, mode);
      setData(processed);
      setHeaders(processedHeaders);
      setInitialHiddenCols(initialHiddenColumns);
      setLayoutConfig(layoutConfig);
      setView('dashboard');
    } catch (error) {
      alert("Erro ao processar dados. Verifique se o formato corresponde ao modo selecionado.");
      console.error(error);
    }
  }, []);

  const handleCopy = () => {
    if (!data.length) return;
    const headerStr = headers.join('\t');
    const bodyStr = data.map(stock => stock.raw.join('\t')).join('\n');
    const fullText = `${headerStr}\n${bodyStr}`;
    
    navigator.clipboard.writeText(fullText).then(() => {
        alert("Tabela copiada para a área de transferência!");
    });
  };

  const reset = () => {
    setView('input');
    setData([]);
    setInitialHiddenCols([]);
    setLayoutConfig(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Radar className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Invest<span className="text-blue-600">Radar</span>
            </h1>
          </div>
          {view === 'dashboard' && (
             <button 
                onClick={reset}
                className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors font-medium"
             >
                <ArrowLeft className="w-4 h-4" />
                Nova Análise
             </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'input' ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-300">
             <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Motor de Ranking de Investimentos</h2>
                <p className="text-slate-500">Selecione seu modelo de dados e cole sua planilha para gerar insights.</p>
             </div>
             <DataInput onProcess={handleProcess} />
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
            
            <AIInsights stocks={data} />

            <AnalysisCharts data={data} />
            
            <StockTable 
              data={data} 
              headers={headers} 
              onCopy={handleCopy} 
              initialHiddenColumns={initialHiddenCols}
              layoutConfig={layoutConfig}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
