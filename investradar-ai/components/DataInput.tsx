
import React, { useState } from 'react';
import { SAMPLE_DATA_STANDARD, SAMPLE_DATA_NETO } from '../services/dataProcessor';
import { Play, Table, FileSpreadsheet, ArrowLeft, Grid3X3, CheckCircle2 } from 'lucide-react';

interface DataInputProps {
  onProcess: (data: string, mode: 'standard' | 'neto') => void;
}

const DataInput: React.FC<DataInputProps> = ({ onProcess }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<'standard' | 'neto'>('standard');
  const [inputData, setInputData] = useState('');

  const handleModeSelect = (selectedMode: 'standard' | 'neto') => {
    setMode(selectedMode);
    setInputData(''); // Clear previous data
    setStep(2);
  };

  const handleLoadExample = () => {
      if (mode === 'neto') {
          setInputData(SAMPLE_DATA_NETO);
      } else {
          setInputData(SAMPLE_DATA_STANDARD);
      }
  };

  if (step === 1) {
    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-center text-slate-800">Selecione o Modelo de Dados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Option 1: Standard */}
                <button 
                    onClick={() => handleModeSelect('standard')}
                    className="group relative flex flex-col items-center p-8 bg-white border-2 border-slate-200 hover:border-blue-500 rounded-2xl transition-all hover:shadow-xl text-center"
                >
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Grid3X3 className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Modelo Padrão / Simplificado</h3>
                    <p className="text-sm text-slate-500 mb-6">
                        Utilize se você possui a planilha padrão do InvestRadar ou o modelo simplificado que inclui Rankings e Status.
                    </p>
                    <div className="mt-auto px-4 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        Selecionar Padrão
                    </div>
                </button>

                {/* Option 2: Neto Invest */}
                <button 
                    onClick={() => handleModeSelect('neto')}
                    className="group relative flex flex-col items-center p-8 bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-2xl transition-all hover:shadow-xl text-center"
                >
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Planilha Neto Invest</h3>
                    <p className="text-sm text-slate-500 mb-6">
                        Selecione esta opção se você utiliza a planilha específica do canal Neto Invest. O sistema irá respeitar a estrutura exata das colunas.
                    </p>
                    <div className="mt-auto px-4 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        Selecionar Neto Invest
                    </div>
                </button>

            </div>
        </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-xl border border-slate-200 p-6 animate-in slide-in-from-right-8 duration-300">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setStep(1)}
                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700"
                title="Voltar"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Table className="w-5 h-5 text-blue-600" />
                Importar Dados
                </h2>
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    Modo: {mode === 'neto' ? <span className="text-emerald-600 font-bold">Neto Invest</span> : <span className="text-blue-600 font-bold">Padrão</span>}
                </span>
            </div>
        </div>

        <button
            onClick={handleLoadExample}
            className={`text-xs font-medium transition-colors px-3 py-1.5 rounded-md flex items-center gap-1 border ${
                mode === 'neto' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            }`}
        >
            <FileSpreadsheet className="w-3 h-3" />
            Carregar Exemplo {mode === 'neto' ? 'Neto Invest' : 'Padrão'}
        </button>
      </div>

      <p className="text-sm text-slate-500 mb-4">
        Cole os dados da sua planilha 
        {mode === 'neto' ? ' Neto Invest (começando por "Empresa") ' : ' Padrão '} 
        abaixo. Certifique-se de incluir o cabeçalho.
      </p>

      <textarea
        value={inputData}
        onChange={(e) => setInputData(e.target.value)}
        placeholder={mode === 'neto' ? "Empresa\tCódigo\tAtuação..." : "Ranking Geral\tStatus\tRanking PL..."}
        className="w-full h-64 bg-slate-50 text-xs font-mono text-slate-800 p-4 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-all placeholder:text-slate-400"
      />

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => onProcess(inputData, mode)}
          disabled={!inputData.trim()}
          className={`flex items-center gap-2 px-6 py-2.5 text-white rounded-lg font-medium transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'neto' 
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
          }`}
        >
          <Play className="w-4 h-4" />
          Processar {mode === 'neto' ? 'Planilha' : 'Ranking'}
        </button>
      </div>
    </div>
  );
};

export default DataInput;
