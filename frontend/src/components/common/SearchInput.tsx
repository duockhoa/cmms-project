import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  onClear?: () => void;
  width?: string | number;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  debounceMs = 0,
  onClear,
  width,
  className = '',
  autoFocus = false,
  disabled = false,
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal value if prop value changes externally
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Debounced change if debounceMs > 0
  useEffect(() => {
    if (debounceMs <= 0) return;
    const handler = setTimeout(() => {
      if (internalValue !== value) {
        onChange(internalValue);
      }
    }, debounceMs);
    return () => clearTimeout(handler);
  }, [internalValue, debounceMs, onChange, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalValue(val);
    if (debounceMs <= 0) {
      onChange(val);
    }
  };

  const handleClear = () => {
    setInternalValue('');
    onChange('');
    if (onClear) onClear();
    inputRef.current?.focus();
  };

  return (
    <div
      className={`search-input-wrapper ${className}`.trim()}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: width || undefined,
        minWidth: '220px',
      }}
    >
      <Search
        size={15}
        style={{
          position: 'absolute',
          left: '12px',
          color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}
      />
      <input
        ref={inputRef}
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={internalValue}
        onChange={handleChange}
        autoFocus={autoFocus}
        disabled={disabled}
        style={{
          paddingLeft: '34px',
          paddingRight: internalValue ? '32px' : '12px',
          width: '100%',
        }}
      />
      {internalValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Xóa tìm kiếm"
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            borderRadius: '50%',
            transition: 'color 0.15s, background-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
