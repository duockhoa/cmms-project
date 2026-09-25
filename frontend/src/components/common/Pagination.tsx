import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  itemName?: string;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  itemName = 'mục',
  onPageChange,
  className = '',
}) => {
  if (totalPages <= 1 && totalItems <= pageSize) {
    return null;
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Thuật toán Smart Ellipsis sinh danh sách số trang tối đa 7 nút
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`custom-pagination ${className}`}>
      {/* Thông tin số lượng bản ghi: Trên mobile tự động căn giữa và nằm gọn gàng */}
      <div className="pagination-info">
        Hiển thị <strong>{startItem}-{endItem}</strong> trong tổng số <strong>{totalItems}</strong> {itemName}
      </div>

      {/* Cụm điều hướng trang */}
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-secondary btn-sm pagination-nav-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft size={15} />
          <span className="pagination-btn-label">Trang trước</span>
        </button>

        {/* Danh sách nút số trang kèm dấu ... (hiển thị trên tablet/desktop) */}
        <div className="pagination-page-list">
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                  •••
                </span>
              );
            }
            const pNum = Number(p);
            const isActive = pNum === currentPage;
            return (
              <button
                key={`page-${pNum}`}
                type="button"
                className={`btn btn-sm pagination-page-btn ${isActive ? 'btn-primary active' : 'btn-secondary'}`}
                onClick={() => onPageChange(pNum)}
                aria-current={isActive ? 'page' : undefined}
              >
                {pNum}
              </button>
            );
          })}
        </div>

        {/* Chỉ báo trang thu gọn cho mobile (<= 640px) */}
        <div className="pagination-mobile-indicator">
          <span>{currentPage}</span> / {totalPages}
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm pagination-nav-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Trang sau"
        >
          <span className="pagination-btn-label">Trang sau</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};
