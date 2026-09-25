import { useState, useCallback } from 'react';

export interface UseModalReturn<T = any> {
  isOpen: boolean;
  data: T | null;
  open: (data?: T | null) => void;
  close: () => void;
  toggle: () => void;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Hook useModal quản lý trạng thái mở/đóng và dữ liệu kèm theo của Modal.
 * Giúp loại bỏ việc khai báo lặp lại các cặp useState (isOpen, selectedItem, isEditOpen...)
 * và tự động làm sạch vùng nhớ dữ liệu khi modal được đóng lại.
 */
export function useModal<T = any>(defaultOpen = false, initialData: T | null = null): UseModalReturn<T> {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [data, setData] = useState<T | null>(initialData);

  const open = useCallback((modalData?: T | null) => {
    if (modalData !== undefined) {
      setData(modalData);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
    setData,
  };
}
