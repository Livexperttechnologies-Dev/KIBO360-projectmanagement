import React from "react";

export const TABLE_PAGE_SIZES = [8, 20, 50, 100, 200] as const;

interface TablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const TablePagination: React.FC<TablePaginationProps> = ({ page, pageSize, total, onPageChange, onPageSizeChange }) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(total, safePage * pageSize);
  const firstVisible = Math.max(1, Math.min(safePage - 2, pageCount - 4));
  const visiblePages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => firstVisible + index);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-500">
        <label className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:border-[#7200A5] focus:outline-none focus:ring-1 focus:ring-[#7200A5]/20"
          >
            {TABLE_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <span>Showing <strong className="text-slate-700">{start}–{end}</strong> of <strong className="text-slate-700">{total}</strong></span>
      </div>
      <nav aria-label="Table pagination" className="flex items-center gap-1">
        <button type="button" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
        {visiblePages.map((number) => (
          <button key={number} type="button" aria-current={number === safePage ? "page" : undefined} onClick={() => onPageChange(number)} className={`min-w-8 rounded-lg border px-2.5 py-1.5 font-semibold ${number === safePage ? "border-[#7200A5] bg-[#7200A5] text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {number}
          </button>
        ))}
        <button type="button" disabled={safePage >= pageCount} onClick={() => onPageChange(safePage + 1)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
      </nav>
    </div>
  );
};
