
import React from 'react';
import { StockData } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell
} from 'recharts';

interface AnalysisChartsProps {
  data: StockData[];
}

const AnalysisCharts: React.FC<AnalysisChartsProps> = ({ data }) => {
  // Top 5 by Margin of Safety (using typed property instead of raw index)
  const topMargin = [...data]
    .sort((a, b) => b.marginSafety - a.marginSafety)
    .slice(0, 5)
    .map(d => ({
        name: d.ticker,
        margin: d.marginSafety > -100 ? d.marginSafety : 0, 
        price: d.currentPrice
    }));

  // Risk (Debt) vs Reward (DY)
  const riskRewardData = data
    .filter(d => d.dy > 0 && d.debtEbitda < 10 && d.debtEbitda > -5) 
    .map(d => ({
      x: d.debtEbitda,
      y: d.dy,
      z: d.marginSafety,
      name: d.ticker
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-3 rounded shadow-xl text-xs">
          <p className="font-bold text-slate-800 mb-1">{data.name}</p>
          {data.margin !== undefined && <p className="text-emerald-600">Margem: {data.margin.toFixed(2)}%</p>}
          {data.x !== undefined && <p className="text-red-500">Dívida/EBITDA: {data.x.toFixed(2)}</p>}
          {data.y !== undefined && <p className="text-blue-600">DY: {data.y.toFixed(2)}%</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Chart 1: Top Margin of Safety */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Top 5 - Margem de Segurança</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topMargin} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={50} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} cursor={{fill: '#f1f5f9', opacity: 0.5}} />
              <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
                {topMargin.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.margin > 30 ? '#10b981' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Risk vs Reward */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Risco (Dívida) vs Retorno (DY)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Debt/EBITDA" 
                tick={{ fill: '#64748b', fontSize: 10 }}
                label={{ value: 'Dívida/EBITDA (Menor é melhor)', position: 'bottom', fill: '#94a3b8', fontSize: 10, offset: 0 }} 
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="DY" 
                tick={{ fill: '#64748b', fontSize: 10 }}
                label={{ value: 'Dividend Yield %', angle: -90, position: 'left', fill: '#94a3b8', fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }} />
              <Scatter name="Ações" data={riskRewardData} fill="#8884d8">
                {riskRewardData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.z > 20 ? '#10b981' : (entry.x > 3 ? '#ef4444' : '#f59e0b')} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalysisCharts;
