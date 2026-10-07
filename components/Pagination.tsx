import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalItems, itemsPerPage, onChange }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  // Janela de até 5 páginas centrada na atual
  const windowSize = Math.min(5, totalPages);
  let first = Math.max(1, currentPage - 2);
  first = Math.min(first, totalPages - windowSize + 1);
  const pages = Array.from({ length: windowSize }, (_, i) => first + i);

  return (
    <div className="px-4 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row gap-3 items-center justify-between">
      <div className="text-xs font-semibold text-slate-500">
        Mostrando <span className="font-bold text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> até{' '}
        <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, totalItems)}</span> de{' '}
        <span className="font-bold text-slate-700 dark:text-slate-300">{totalItems}</span> registros
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
          className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-1">
          {pages.map(p => (
            <button key={p} onClick={() => onChange(p)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${currentPage === p ? 'bg-moura-orange-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {p}
            </button>
          ))}
        </div>
        <button onClick={() => onChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
          className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
