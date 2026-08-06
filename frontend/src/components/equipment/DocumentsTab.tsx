import React from 'react';
import { FileText, Eye, Download } from 'lucide-react';

interface DocumentsTabProps {
  attachmentsList: any[];
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setPreviewFileUrl: (url: string | null) => void;
  setPreviewFileName: (name: string) => void;
  API_BASE: string;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  attachmentsList,
  handleFileUpload,
  setPreviewFileUrl,
  setPreviewFileName,
  API_BASE,
}) => {
  return (
    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: '150px' }}>
          <select className="form-select" style={{ height: '32px', fontSize: '12px' }}>
            <option>Tất cả tài liệu</option>
          </select>
        </div>
        <div>
          <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            + Tải lên tài liệu
            <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {attachmentsList.length === 0 ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: '13px' }}>
            Không có tài liệu hoặc SOP nào được tải lên cho thiết bị này
          </div>
        ) : attachmentsList.map((doc: any, idx: number) => {
          const sizeStr = doc.fileSize > 1024 * 1024 
            ? (doc.fileSize / (1024 * 1024)).toFixed(1) + ' MB' 
            : (doc.fileSize / 1024).toFixed(0) + ' KB';
          const downloadUrl = `${API_BASE}/api/v1/attachments/${doc.id}/download`;
          const viewUrl = `${API_BASE}/api/v1/attachments/${doc.id}/view`;

          return (
            <div key={doc.id || idx} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '6px',
                  backgroundColor: '#f0fdf4',
                  color: '#16a34a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <FileText size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{doc.originalName}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '1px 6px' }}>{doc.description || 'SOP'}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sizeStr}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  title="Xem trực tiếp"
                  onClick={() => {
                    setPreviewFileUrl(viewUrl);
                    setPreviewFileName(doc.originalName);
                  }}
                >
                  <Eye size={14} />
                </button>
                <a href={downloadUrl} className="btn btn-secondary btn-sm" title="Tải về" target="_blank" rel="noreferrer">
                  <Download size={14} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
