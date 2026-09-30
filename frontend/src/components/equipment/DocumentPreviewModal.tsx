import React from 'react';
import { X } from 'lucide-react';

interface DocumentPreviewModalProps {
  previewFileUrl: string | null;
  previewFileName: string;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  previewFileUrl,
  previewFileName,
  onClose,
}) => {
  if (!previewFileUrl) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: 'rgba(15, 23, 42, 0.4)', 
      backdropFilter: 'blur(8px)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 1000, 
      padding: '24px' 
    }}>
      <div className="card" style={{ 
        width: '80%', 
        height: '80%', 
        padding: '24px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px', 
        borderRadius: '16px', 
        backgroundColor: '#ffffff', 
        border: '1px solid var(--border-color)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Xem trực tiếp: {previewFileName}</h3>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
          <iframe 
            src={previewFileUrl} 
            style={{ width: '100%', height: '100%', border: 'none' }} 
            title="SOP Preview Frame" 
          />
        </div>
      </div>
    </div>
  );
};
