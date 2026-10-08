import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';

export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
  tag?: string;
  tagColor?: string;
  disabled?: boolean;
  raw?: any;
}

export interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string, option?: SearchableOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  clearable?: boolean;
  required?: boolean;
  renderOption?: (option: SearchableOption) => React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '-- Chọn mục --',
  searchPlaceholder = 'Nhập tìm kiếm...',
  disabled = false,
  className = '',
  compact = false,
  clearable = true,
  required = false,
  renderOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Selected Option
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filtered options with Vietnamese accent-insensitive matching
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const cleanQuery = removeVietnameseTones(query.trim());

    return options.filter((opt) => {
      const matchLabel = removeVietnameseTones(opt.label).includes(cleanQuery);
      const matchSub = opt.subLabel ? removeVietnameseTones(opt.subLabel).includes(cleanQuery) : false;
      const matchTag = opt.tag ? removeVietnameseTones(opt.tag).includes(cleanQuery) : false;
      return matchLabel || matchSub || matchTag;
    });
  }, [options, query]);

  const handleSelect = (option: SearchableOption) => {
    if (option.disabled) return;
    onChange(option.value, option);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', undefined);
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-select-container ${className}`}
      style={{ position: 'relative', width: '100%', minWidth: compact ? '160px' : '220px' }}
    >
      {/* Trigger Box */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: compact ? '4px 8px' : '6px 10px',
          height: compact ? '34px' : '38px',
          backgroundColor: disabled ? '#f8fafc' : '#ffffff',
          border: `1px solid ${isOpen ? '#2563eb' : '#cbd5e1'}`,
          borderRadius: '6px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: compact ? '12.5px' : '13px',
          boxShadow: isOpen ? '0 0 0 2px rgba(37,99,235,0.15)' : 'none',
          transition: 'all 0.15s ease',
          userSelect: 'none',
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '6px' }}>
          {selectedOption ? (
            <span style={{ fontWeight: 600, color: '#1e293b' }}>
              {selectedOption.label}
              {selectedOption.tag && (
                <span
                  style={{
                    marginLeft: '6px',
                    fontSize: '11px',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    backgroundColor: selectedOption.tagColor || '#eff6ff',
                    color: '#1d4ed8',
                    fontWeight: 700,
                  }}
                >
                  {selectedOption.tag}
                </span>
              )}
            </span>
          ) : (
            <span style={{ color: '#94a3b8' }}>{placeholder}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#94a3b8' }}>
          {clearable && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                color: '#94a3b8',
                borderRadius: '50%',
              }}
              title="Xóa lựa chọn"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={15} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
        </div>
      </div>

      {/* Hidden input for form validation */}
      {required && (
        <input
          type="text"
          value={value}
          required
          onChange={() => {}}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
        />
      )}

      {/* Floating Dropdown List */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            maxHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Input Box */}
          <div
            style={{
              padding: '8px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f8fafc',
            }}
          >
            <Search size={14} color="#94a3b8" />
            <input
              ref={inputRef}
              type="text"
              className="form-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                height: '30px',
                fontSize: '12.5px',
                padding: '4px 8px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                flex: 1,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsOpen(false);
                if (e.key === 'Enter' && filteredOptions.length > 0) {
                  e.preventDefault();
                  handleSelect(filteredOptions[0]);
                }
              }}
            />
          </div>

          {/* Options List */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '240px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>
                Không tìm thấy kết quả phù hợp
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt)}
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: opt.disabled ? 'not-allowed' : 'pointer',
                      opacity: opt.disabled ? 0.6 : 1,
                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                      borderBottom: '1px solid #f8fafc',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !opt.disabled) e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !opt.disabled) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {renderOption ? (
                      renderOption(opt)
                    ) : (
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: isSelected ? 700 : 500, fontSize: '12.5px', color: '#1e293b' }}>
                            {opt.label}
                          </span>
                          {opt.tag && (
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: opt.tagColor || '#eff6ff',
                                color: '#1d4ed8',
                                fontWeight: 600,
                              }}
                            >
                              {opt.tag}
                            </span>
                          )}
                        </div>
                        {opt.subLabel && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                            {opt.subLabel}
                          </div>
                        )}
                      </div>
                    )}
                    {isSelected && <Check size={14} color="#2563eb" style={{ flexShrink: 0, marginLeft: '6px' }} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
