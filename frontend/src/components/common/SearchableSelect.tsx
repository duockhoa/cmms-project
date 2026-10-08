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
  placeholder = '🔍 Tìm kiếm hoặc chọn...',
  disabled = false,
  className = '',
  compact = false,
  clearable = true,
  required = false,
  renderOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Selected Option
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  // Đồng bộ inputText với selectedOption khi không đang gõ
  useEffect(() => {
    if (!isTyping) {
      setInputText(selectedOption ? selectedOption.label : '');
    }
  }, [selectedOption, isTyping]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
        setInputText(selectedOption ? selectedOption.label : '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  // Filtered options with Vietnamese accent-insensitive matching
  const filteredOptions = useMemo(() => {
    if (!isTyping || !inputText.trim()) return options;
    const cleanQuery = removeVietnameseTones(inputText.trim());

    return options.filter((opt) => {
      const matchLabel = removeVietnameseTones(opt.label).includes(cleanQuery);
      const matchSub = opt.subLabel ? removeVietnameseTones(opt.subLabel).includes(cleanQuery) : false;
      const matchTag = opt.tag ? removeVietnameseTones(opt.tag).includes(cleanQuery) : false;
      return matchLabel || matchSub || matchTag;
    });
  }, [options, inputText, isTyping]);

  const handleInputFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    setIsTyping(true);
    // Khi click vào để tìm lại, bôi đen text hiện tại để dễ gõ đè
    inputRef.current?.select();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    setIsTyping(true);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelect = (option: SearchableOption) => {
    if (option.disabled) return;
    onChange(option.value, option);
    setInputText(option.label);
    setIsTyping(false);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', undefined);
    setInputText('');
    setIsTyping(false);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-select-container ${className}`}
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Direct Input Trigger */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          width: '100%',
        }}
      >
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: '8px',
            color: '#94a3b8',
            pointerEvents: 'none',
          }}
        />

        <input
          ref={inputRef}
          type="text"
          className="form-input"
          disabled={disabled}
          value={inputText}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          style={{
            height: compact ? '34px' : '38px',
            fontSize: compact ? '12.5px' : '13px',
            paddingLeft: '28px',
            paddingRight: clearable && selectedOption ? '48px' : '28px',
            backgroundColor: disabled ? '#f8fafc' : '#ffffff',
            borderColor: isOpen ? '#2563eb' : '#cbd5e1',
            boxShadow: isOpen ? '0 0 0 2px rgba(37,99,235,0.18)' : 'none',
            fontWeight: selectedOption && !isTyping ? 600 : 400,
            color: selectedOption && !isTyping ? '#1e293b' : '#334155',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              setIsTyping(false);
              setInputText(selectedOption ? selectedOption.label : '');
            }
            if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) {
              e.preventDefault();
              handleSelect(filteredOptions[0]);
            }
            if (e.key === 'ArrowDown' && !isOpen) {
              setIsOpen(true);
            }
          }}
        />

        {/* Right Action Icons */}
        <div
          style={{
            position: 'absolute',
            right: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}
        >
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

          <ChevronDown
            size={14}
            onClick={() => {
              if (!disabled) {
                if (isOpen) {
                  setIsOpen(false);
                } else {
                  inputRef.current?.focus();
                }
              }
            }}
            style={{
              color: '#94a3b8',
              cursor: 'pointer',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        </div>
      </div>

      {/* Hidden input for HTML5 required form validation */}
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
            width: 'max(100%, 360px)',
            maxWidth: '520px',
            zIndex: 99999,
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 12px 30px rgba(0,0,0,0.22), 0 4px 10px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            maxHeight: '260px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header count info */}
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #f1f5f9',
              fontSize: '11.5px',
              color: '#64748b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              {filteredOptions.length > 0
                ? `Tìm thấy ${filteredOptions.length} kết quả`
                : 'Không có kết quả'}
            </span>
            {isTyping && inputText && (
              <span style={{ fontStyle: 'italic' }}>Từ khóa: "{inputText}"</span>
            )}
          </div>

          {/* Options List */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '220px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Không tìm thấy mặt hàng nào phù hợp với từ khóa
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onMouseDown={(e) => {
                      // Dùng onMouseDown thay vì onClick để trigger trước khi input onBlur
                      e.preventDefault();
                      handleSelect(opt);
                    }}
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
                          <span style={{ fontWeight: isSelected ? 700 : 600, fontSize: '12.5px', color: '#1e293b' }}>
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
