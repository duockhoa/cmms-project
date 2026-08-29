import React, { useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HeaderSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/equipment?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div style={{ position: 'relative', width: '220px' }}>
      <input
        type="text"
        className="form-input"
        placeholder="Tìm kiếm..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          paddingLeft: '34px',
          paddingRight: query ? '28px' : '12px',
          height: '36px',
          fontSize: '13px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-primary, #f8fafc)',
          border: '1px solid var(--border-color, #e2e8f0)',
          transition: 'all 0.15s ease',
        }}
      />
      <SearchIcon
        size={15}
        style={{
          position: 'absolute',
          left: '11px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted, #94a3b8)',
          pointerEvents: 'none',
        }}
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
};
