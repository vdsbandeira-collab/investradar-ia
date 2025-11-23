
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StockData, TableLayoutConfig } from '../types';
import { 
  ArrowUpRight, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  ArrowUpDown, 
  Search, 
  X,
  ListFilter,
  Columns,
  Eye
} from 'lucide-react';
import { parseBRNumber } from '../services/dataProcessor';

interface StockTableProps {
  data: StockData[];
  headers: string[];
  onCopy: () => void;
  initialHiddenColumns?: number[];
  layoutConfig: TableLayoutConfig | null;
}

const StockTable: React.FC<StockTableProps> = ({ 
  data, 
  headers, 
  onCopy, 
  initialHiddenColumns = [],
  layoutConfig
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: number; direction: 'asc' | 'desc' } | null>(null);
  
  // Filtering State
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<number, string>>({});

  // Column Visibility State
  const [hiddenColumns, setHiddenColumns] = useState<Set<number>>(new Set(initialHiddenColumns));
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Sync hidden columns when initial props change
  useEffect(() => {
    setHiddenColumns(new Set(initialHiddenColumns));
  }, [initialHiddenColumns]);
  
  // Resizing State
  // Default values need to be dynamic based on layout, but initial state helps prevent layout shifts
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const [resizingCol, setResizingCol] = useState<number | null>(null);
  
  const columnSelectorRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Initialize column widths based on layout config
  useEffect(() => {
      if (layoutConfig) {
        const newWidths: Record<number, number> = {};
        // Rank General
        if (layoutConfig.generalRankIndex !== undefined) newWidths[layoutConfig.generalRankIndex] = 80;
        // Company
        newWidths[layoutConfig.companyIndex] = 220;
        // Ticker
        newWidths[layoutConfig.tickerIndex] = 100;
        
        setColWidths(prev => ({...prev, ...newWidths}));
      }
  }, [layoutConfig]);

  // Close column selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Resizing Global Events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingCol !== null && resizingRef.current) {
        const diff = e.clientX - resizingRef.current.startX;
        const newWidth = Math.max(50, resizingRef.current.startWidth + diff); // Min width 50px
        setColWidths(prev => ({ ...prev, [resizingCol]: newWidth }));
      }
    };

    const handleMouseUp = () => {
      if (resizingCol !== null) {
        setResizingCol(null);
        resizingRef.current = null;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    if (resizingCol !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol]);

  const startResizing = (e: React.MouseEvent, colIndex: number) => {
    e.stopPropagation(); // Prevent sorting trigger
    e.preventDefault();
    const currentWidth = colWidths[colIndex] || 150;
    setResizingCol(colIndex);
    resizingRef.current = { startX: e.clientX, startWidth: currentWidth };
  };

  // --- Logic: Column Reordering ---
  // Ensure sticky columns are rendered first in DOM order so sticky works correctly
  const orderedColumnIndices = useMemo(() => {
    if (!layoutConfig) return headers.map((_, i) => i);

    const fixedIndices = [...layoutConfig.stickyIndices];
    const otherIndices = headers.map((_, i) => i).filter(i => !fixedIndices.includes(i));
    
    return [...fixedIndices, ...otherIndices];
  }, [headers, layoutConfig]);

  // --- Logic: Dynamic Sticky Positions ---
  const getStickyLeft = (colIndex: number) => {
      if (!layoutConfig || !layoutConfig.stickyIndices.includes(colIndex)) return 0;
      
      let left = 0;
      // Sum width of all *previous* sticky columns
      for (const idx of layoutConfig.stickyIndices) {
          if (idx === colIndex) break;
          left += (colWidths[idx] || (idx === layoutConfig.companyIndex ? 220 : idx === layoutConfig.generalRankIndex ? 80 : 100)); // Fallback defaults
      }
      return left;
  };

  // --- Logic: Filter -> Sort ---
  const processedData = useMemo(() => {
    let result = [...data];

    // 1. Apply Filters
    if (Object.keys(filters).length > 0) {
      result = result.filter(item => {
        return Object.entries(filters).every(([colIndex, filterValue]) => {
          if (!filterValue) return true;
          const cellValue = String(item.raw[parseInt(colIndex)] || '').toLowerCase();
          return cellValue.includes(filterValue.toLowerCase());
        });
      });
    }

    // 2. Apply Sorting
    if (sortConfig !== null) {
      result.sort((a, b) => {
        const valAStr = a.raw[sortConfig.key];
        const valBStr = b.raw[sortConfig.key];

        const numA = parseBRNumber(valAStr);
        const numB = parseBRNumber(valBStr);

        const isNumA = numA !== -Infinity;
        const isNumB = numB !== -Infinity;

        if (isNumA && isNumB) {
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        const strA = valAStr || '';
        const strB = valBStr || '';

        return sortConfig.direction === 'asc'
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      });
    }
    return result;
  }, [data, sortConfig, filters]);

  // --- Handlers ---

  const requestSort = (key: number) => {
    if (resizingCol !== null) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (colIndex: number, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [colIndex]: value };
      if (!value) delete newFilters[colIndex];
      return newFilters;
    });
  };

  const toggleColumnVisibility = (index: number) => {
    if (layoutConfig?.stickyIndices.includes(index)) return;

    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const clearFilters = () => setFilters({});

  const getStatusBadge = (status: string) => {
    if (!status || status.trim() === '' || status === '-') {
      return <span className="text-slate-300">-</span>;
    }
    const s = status ? status.toLowerCase() : '';
    let styles = "bg-slate-100 text-slate-600 border-slate-200";
    
    if (s.includes('quente')) styles = "bg-rose-50 text-rose-700 border-rose-200 font-bold shadow-sm ring-1 ring-rose-100";
    else if (s.includes('carteira')) styles = "bg-blue-50 text-blue-700 border-blue-200 font-semibold shadow-sm ring-1 ring-blue-100";
    else if (s.includes('no radar')) styles = "bg-amber-50 text-amber-700 border-amber-200 font-medium ring-1 ring-amber-100";
    else if (s.includes('fora')) styles = "bg-slate-50 text-slate-400 border-slate-200 opacity-80";

    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide border ${styles}`}>{status}</span>;
  };

  // Helper to get column styles
  const getColumnStyles = (i: number, isSticky: boolean) => {
    const width = colWidths[i] || 150;
    let style: React.CSSProperties = {
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
    };

    if (isSticky) {
        style.left = `${getStickyLeft(i)}px`;
    }

    return style;
  };

  if (!layoutConfig) return null;

  return (
    <div className="space-y-4">
      {/* --- Toolbar --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
        
        <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium text-sm">
            <span className="text-blue-600 font-bold text-lg">{processedData.length}</span> ativos
            {processedData.length !== data.length && <span className="text-slate-400 text-xs ml-1">(de {data.length})</span>}
            </span>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {/* Filter Toggle */}
            <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 border shadow-sm ${
                    showFilters ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-blue-100' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
                <ListFilter className="w-4 h-4" />
                Filtros
                {Object.keys(filters).length > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{Object.keys(filters).length}</span>
                )}
            </button>

            {/* Column Selector */}
            <div className="relative" ref={columnSelectorRef}>
                <button
                    onClick={() => setShowColumnSelector(!showColumnSelector)}
                    className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                >
                    <Columns className="w-4 h-4" />
                    Colunas
                </button>

                {showColumnSelector && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 max-h-80 overflow-y-auto ring-1 ring-black/5">
                        <div className="text-xs font-bold text-slate-400 px-2 py-2 uppercase tracking-wider mb-1 border-b border-slate-100">Exibir Colunas</div>
                        <div className="space-y-0.5 mt-1">
                            {orderedColumnIndices.map((i) => (
                                <button
                                    key={i}
                                    onClick={() => toggleColumnVisibility(i)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between transition-colors ${
                                        hiddenColumns.has(i) ? 'text-slate-400 hover:bg-slate-50' : 'text-slate-700 hover:bg-blue-50 font-medium'
                                    }`}
                                >
                                    <span className="truncate pr-2">{headers[i]}</span>
                                    {!hiddenColumns.has(i) && <Eye className="w-3.5 h-3.5 text-blue-500" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>

            <button
                onClick={onCopy}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20 active:translate-y-0.5"
            >
                <Copy className="w-4 h-4" />
                Copiar
            </button>
        </div>
      </div>

      {/* --- Table Container --- */}
      <div className="relative rounded-xl border border-slate-200 shadow-xl bg-white overflow-hidden flex flex-col max-h-[800px]">
        <div className="overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            <table className="w-auto text-left text-sm whitespace-nowrap border-collapse table-fixed">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-xs tracking-wider sticky top-0 z-40 shadow-sm">
                <tr>
                {orderedColumnIndices.map((i) => {
                    if (hiddenColumns.has(i)) return null;
                    const h = headers[i];
                    const isSticky = layoutConfig.stickyIndices.includes(i);
                    const isTicker = i === layoutConfig.tickerIndex;
                    const isRank = i === layoutConfig.generalRankIndex;
                    
                    let headerClass = "relative px-3 py-4 border-b border-slate-200 cursor-pointer select-none group/header hover:bg-slate-100 transition-colors border-r border-slate-100 last:border-r-0 ";
                    
                    if (isSticky) {
                        headerClass += `sticky z-50 bg-slate-50 border-r border-slate-200 `;
                        if (isTicker) headerClass += "shadow-[6px_0_12px_-4px_rgba(0,0,0,0.08)] ";
                    }

                    return (
                        <th
                            key={i}
                            onClick={() => requestSort(i)}
                            className={headerClass}
                            style={getColumnStyles(i, isSticky)}
                            title={h}
                        >
                            <div className={`flex items-center gap-2 w-full overflow-hidden ${isRank || isTicker ? 'justify-center' : ''}`}>
                                <span className="truncate">{h}</span>
                                <span className="text-slate-400 group-hover/header:text-blue-600 shrink-0">
                                {sortConfig?.key === i ? (
                                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                    <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                                )}
                                </span>
                            </div>
                            <div 
                                className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400 active:bg-blue-600 z-50"
                                onMouseDown={(e) => startResizing(e, i)}
                                onClick={(e) => e.stopPropagation()} 
                            />
                        </th>
                    )
                })}
                </tr>
                {/* Filter Row */}
                {showFilters && (
                    <tr className="bg-slate-50/50">
                        {orderedColumnIndices.map((i) => {
                            if (hiddenColumns.has(i)) return null;
                            const isSticky = layoutConfig.stickyIndices.includes(i);
                            const isTicker = i === layoutConfig.tickerIndex;
                            let thClass = "px-2 py-2 border-b border-slate-200 border-r border-slate-100 ";
                            if (isSticky) {
                                thClass += `sticky z-50 bg-slate-50 border-r border-slate-200 `;
                                if (isTicker) thClass += "shadow-[6px_0_12px_-4px_rgba(0,0,0,0.08)] ";
                            }

                            return (
                                <th key={`filter-${i}`} className={thClass} style={getColumnStyles(i, isSticky)}>
                                    <div className="relative w-full">
                                        <input 
                                            type="text"
                                            value={filters[i] || ''}
                                            onChange={(e) => handleFilterChange(i, e.target.value)}
                                            className="w-full pl-7 pr-2 py-1.5 text-[11px] border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-normal text-slate-700 bg-white placeholder:text-slate-400"
                                            placeholder="Filtrar..."
                                        />
                                        <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-slate-400" />
                                        {filters[i] && (
                                            <button 
                                                onClick={() => handleFilterChange(i, '')}
                                                className="absolute right-2 top-2 text-slate-400 hover:text-red-500"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </th>
                            )
                        })}
                    </tr>
                )}
            </thead>
            <tbody className="divide-y divide-slate-100">
                {processedData.length === 0 ? (
                    <tr>
                        <td colSpan={headers.length} className="px-4 py-16 text-center text-slate-400 text-sm">
                            <div className="flex flex-col items-center gap-3">
                                <div className="p-3 bg-slate-50 rounded-full">
                                    <Search className="w-6 h-6 opacity-30" />
                                </div>
                                <p>Nenhum resultado encontrado.</p>
                                <button onClick={clearFilters} className="text-blue-600 hover:underline text-xs font-medium">Limpar filtros</button>
                            </div>
                        </td>
                    </tr>
                ) : (
                    processedData.map((stock) => (
                    <tr key={stock.id} className="hover:bg-blue-50 transition-colors group even:bg-slate-50">
                        {orderedColumnIndices.map((cIndex) => {
                        if (hiddenColumns.has(cIndex)) return null;
                        const cell = stock.raw[cIndex];
                        const isSticky = layoutConfig.stickyIndices.includes(cIndex);
                        const isTicker = cIndex === layoutConfig.tickerIndex;
                        const isCompany = cIndex === layoutConfig.companyIndex;
                        const isRank = cIndex === layoutConfig.generalRankIndex;

                        let className = "px-6 py-4 border-r border-slate-100 text-slate-700 text-sm overflow-hidden text-ellipsis ";
                        let content: React.ReactNode = cell;
                        
                        if (isSticky) {
                            className += `z-30 sticky border-r-slate-200 bg-white group-hover:bg-blue-50 group-even:bg-slate-50 `;
                            if (isTicker) className += "shadow-[6px_0_12px_-4px_rgba(0,0,0,0.08)] text-center font-bold text-blue-600 ";
                            else if (isRank) className += "text-center font-bold text-slate-900 ";
                            else if (isCompany) className += "font-medium text-slate-900 ";
                        }

                        if (isTicker) {
                            content = <a href={`https://www.google.com/search?q=acao+${cell}`} target="_blank" rel="noreferrer" className="hover:underline flex justify-center">{cell}</a>
                        }
                        
                        if (layoutConfig.statusIndex !== undefined && cIndex === layoutConfig.statusIndex) {
                            content = getStatusBadge(cell);
                            className += "text-center align-middle ";
                        }

                        if (headers[cIndex]?.includes('Investidor10') || (typeof cell === 'string' && cell.startsWith('http'))) {
                            content = (
                                <a 
                                    href={cell} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium hover:underline bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-100 hover:border-blue-200 transition-colors text-xs"
                                    title={cell}
                                >
                                    Abrir <ArrowUpRight className="w-3 h-3" />
                                </a>
                            );
                        }

                        // Heuristic coloring for metrics
                        if (typeof cell === 'string') {
                            const looksLikeNumber = cell.match(/^[-+]?[0-9]*[.,]?[0-9]+[%]?$/);
                            if (looksLikeNumber) className += "tabular-nums ";

                            const headerName = headers[cIndex]?.toLowerCase() || "";
                            if (cell.includes('%') || headerName.includes('desvio') || headerName.includes('dif.')) {
                                const val = parseFloat(cell.replace(',', '.').replace('%', ''));
                                if (!isNaN(val)) {
                                    // Positive is GOOD for these
                                    if (headerName.includes('dy') || headerName.includes('cagr') || headerName.includes('margem') || headerName.includes('yield')) {
                                        if (val > 0) className += "text-emerald-700 font-bold ";
                                        else if (val < 0) className += "text-rose-600 font-bold ";
                                    }
                                    // Positive is BAD for these
                                    else if (headerName.includes('dif.') || headerName.includes('desvio')) {
                                        if (val < 0) className += "text-emerald-700 font-bold "; 
                                        else if (val > 0) className += "text-rose-600 font-bold "; 
                                    }
                                }
                            }
                        }

                        return (
                            <td key={cIndex} className={className} style={getColumnStyles(cIndex, isSticky)}>
                                {content}
                            </td>
                        );
                        })}
                    </tr>
                    ))
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default StockTable;
