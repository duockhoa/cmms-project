import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import { Modal } from '../../common/Modal';
import { FunctionalUnitCustomForm } from './FunctionalUnitCustomForm';
import { FunctionalUnitLibraryPicker } from './FunctionalUnitLibraryPicker';

export const FunctionalUnitFormModal: React.FC<any> = ({
  allCategories, editingUnit, equipmentCode, filteredLibrary, formData,
  handleDeselectAllLibrary, handleSelectAllFilteredLibrary, handleSubmit,
  handleToggleLibraryItem, isModalOpen, libCategory, libSearch, libraryList, modalMode,
  selectedLibItems, setFormData, setIsModalOpen, setLibCategory, setLibSearch,
  setModalMode, setSelectedLibItems, submitting, units,
}) => (
  <>
      {/* ==================================================== */}
      {/* MODAL THÊM / SỬA CỤM CHỨC NĂNG (GIAO DIỆN NÂNG CẤP) */}
      {/* ==================================================== */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => !submitting && setIsModalOpen(false)}
          title={editingUnit ? `Chỉnh sửa cụm: ${editingUnit.name}` : 'Thêm cụm chức năng cho thiết bị'}
          maxWidth="640px"
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Chế độ chọn (chỉ hiển thị khi thêm mới) */}
            {!editingUnit && (
              <div style={{ 
                display: 'flex', 
                backgroundColor: 'var(--bg-secondary)', 
                padding: '4px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)',
                gap: '4px'
              }}>
                <button
                   onClick={() => {
                    setModalMode('LIBRARY');
                    setSelectedLibItems([]);
                  }}
                >
                  <BookOpen size={15} /> 1. Chọn từ Thư viện có sẵn ({libraryList.length})
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: modalMode === 'CUSTOM' ? '#2563eb' : 'transparent',
                    color: modalMode === 'CUSTOM' ? '#ffffff' : 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => {
                    setModalMode('CUSTOM');
                    setSelectedLibItems([]);
                    const nextIndex = (units.length + 1).toString().padStart(2, '0');
                    setFormData({
                      name: '',
                      code: equipmentCode ? `${equipmentCode}-CU${nextIndex}` : `CU-${nextIndex}`,
                      description: '',
                      status: 'OPERATIONAL',
                      category: 'Cơ khí',
                    });
                  }}
                >
                  <Sparkles size={15} /> 2. Tạo cụm mới độc lập
                </button>
              </div>
            )}

            <FunctionalUnitLibraryPicker
              allCategories={allCategories}
              editingUnit={editingUnit}
              equipmentCode={equipmentCode}
              filteredLibrary={filteredLibrary}
              formData={formData}
              handleDeselectAllLibrary={handleDeselectAllLibrary}
              handleSelectAllFilteredLibrary={handleSelectAllFilteredLibrary}
              handleToggleLibraryItem={handleToggleLibraryItem}
              libCategory={libCategory}
              libSearch={libSearch}
              modalMode={modalMode}
              selectedLibItems={selectedLibItems}
              setFormData={setFormData}
              setLibCategory={setLibCategory}
              setLibSearch={setLibSearch}
              units={units}
            />

            <FunctionalUnitCustomForm
              allCategories={allCategories}
              editingUnit={editingUnit}
              formData={formData}
              modalMode={modalMode}
              setFormData={setFormData}
            />

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  submitting || 
                  (modalMode === 'LIBRARY' && !editingUnit ? selectedLibItems.length === 0 : !formData.name.trim())
                }
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {submitting ? (
                  'Đang xử lý...'
                ) : editingUnit ? (
                  'Lưu thay đổi'
                ) : modalMode === 'LIBRARY' ? (
                  selectedLibItems.length === 0 
                    ? 'Chọn cụm để gán' 
                    : selectedLibItems.length === 1 
                    ? 'Gán 1 cụm vào thiết bị' 
                    : `Gán (${selectedLibItems.length}) cụm vào thiết bị`
                ) : (
                  'Tạo & gán vào thiết bị'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
  </>
);
