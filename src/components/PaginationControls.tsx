import React from 'react';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, getTotalPages } from '../utils/pagination';

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  itemLabel?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  totalItems,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'records',
}) => {
  const totalPages = getTotalPages(totalItems, pageSize);
  const currentPage = totalItems === 0 ? 0 : Math.min(page, totalPages);
  const start = totalItems === 0 ? 0 : (Math.min(page, totalPages) - 1) * pageSize + 1;
  const end = totalItems === 0 ? 0 : Math.min(Math.min(page, totalPages) * pageSize, totalItems);

  return (
    <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-slate-500">
        <label className="flex items-center gap-2">
          <span>Show</span>
          <select
            className="input h-10 py-2 min-w-[92px]"
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
        <span>
          Showing <span className="font-semibold text-slate-700">{start}</span>-
          <span className="font-semibold text-slate-700">{end}</span> of{' '}
          <span className="font-semibold text-slate-700">{totalItems}</span> {itemLabel}
        </span>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-sm text-slate-500">
          Page <span className="font-semibold text-slate-700">{currentPage}</span> of{' '}
          <span className="font-semibold text-slate-700">{totalItems === 0 ? 0 : totalPages}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-secondary"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            Previous
          </button>
          <button
            className="btn btn-secondary"
            disabled={totalItems === 0 || currentPage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
