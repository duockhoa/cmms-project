import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useFunctionalUnits } from '../../hooks/useFunctionalUnits';
import { FunctionalUnitCloneModal } from './functional-units/FunctionalUnitCloneModal';
import { FunctionalUnitDeleteModal } from './functional-units/FunctionalUnitDeleteModal';
import { FunctionalUnitFormModal } from './functional-units/FunctionalUnitFormModal';
import { FunctionalUnitsList } from './functional-units/FunctionalUnitsList';

interface FunctionalUnitsTabProps {
  equipmentId: string;
  equipmentCode?: string;
  equipmentName?: string;
  onUnitsUpdated?: () => void;
}

const renderStatusBadge = (status: string) => {
  switch (status) {
    case 'OPERATIONAL':
      return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Hoạt động tốt</span>;
    case 'WARNING':
      return <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} /> Cần theo dõi</span>;
    case 'INCIDENT':
      return <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12} /> Sự cố / Hỏng</span>;
    case 'INACTIVE':
      return <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>Ngừng hoạt động</span>;
    default:
      return <span className="badge">{status}</span>;
  }
};

export const FunctionalUnitsTab: React.FC<FunctionalUnitsTabProps> = ({
  equipmentId,
  equipmentCode,
  equipmentName,
  onUnitsUpdated,
}) => {
  const functionalUnits = useFunctionalUnits({ equipmentId, equipmentCode, onUnitsUpdated });
  const operationalCount = functionalUnits.units.filter(unit => unit.status === 'OPERATIONAL').length;
  const warningCount = functionalUnits.units.filter(unit => unit.status === 'WARNING').length;
  const incidentCount = functionalUnits.units.filter(unit => unit.status === 'INCIDENT').length;

  return (
    <div style={{ padding: '24px 0' }}>
      <FunctionalUnitsList
        handleOpenAddModal={functionalUnits.handleOpenAddModal}
        handleOpenCloneModal={functionalUnits.handleOpenCloneModal}
        handleOpenEditModal={functionalUnits.handleOpenEditModal}
        incidentCount={incidentCount}
        loadData={functionalUnits.loadData}
        loading={functionalUnits.loading}
        operationalCount={operationalCount}
        renderStatusBadge={renderStatusBadge}
        setUnitToDelete={functionalUnits.setUnitToDelete}
        totalCount={functionalUnits.units.length}
        units={functionalUnits.units}
        warningCount={warningCount}
      />

      <FunctionalUnitFormModal
        allCategories={functionalUnits.allCategories}
        editingUnit={functionalUnits.editingUnit}
        equipmentCode={equipmentCode}
        filteredLibrary={functionalUnits.filteredLibrary}
        formData={functionalUnits.formData}
        handleDeselectAllLibrary={functionalUnits.handleDeselectAllLibrary}
        handleSelectAllFilteredLibrary={functionalUnits.handleSelectAllFilteredLibrary}
        handleSubmit={functionalUnits.handleSubmit}
        handleToggleLibraryItem={functionalUnits.handleToggleLibraryItem}
        isModalOpen={functionalUnits.isModalOpen}
        libCategory={functionalUnits.libCategory}
        libSearch={functionalUnits.libSearch}
        libraryList={functionalUnits.libraryList}
        modalMode={functionalUnits.modalMode}
        selectedLibItems={functionalUnits.selectedLibItems}
        setFormData={functionalUnits.setFormData}
        setIsModalOpen={functionalUnits.setIsModalOpen}
        setLibCategory={functionalUnits.setLibCategory}
        setLibSearch={functionalUnits.setLibSearch}
        setModalMode={functionalUnits.setModalMode}
        setSelectedLibItems={functionalUnits.setSelectedLibItems}
        submitting={functionalUnits.submitting}
        units={functionalUnits.units}
      />

      <FunctionalUnitCloneModal
        allEquipments={functionalUnits.allEquipments}
        cloning={functionalUnits.cloning}
        equipmentCode={equipmentCode}
        equipmentName={equipmentName}
        handleDeselectAllUnits={functionalUnits.handleDeselectAllUnits}
        handleExecuteClone={functionalUnits.handleExecuteClone}
        handleSelectAllUnits={functionalUnits.handleSelectAllUnits}
        handleSelectSourceEquipment={functionalUnits.handleSelectSourceEquipment}
        handleToggleUnitSelect={functionalUnits.handleToggleUnitSelect}
        isCloneModalOpen={functionalUnits.isCloneModalOpen}
        loadingSourceUnits={functionalUnits.loadingSourceUnits}
        selectedSourceEqId={functionalUnits.selectedSourceEqId}
        selectedUnitIds={functionalUnits.selectedUnitIds}
        setIsCloneModalOpen={functionalUnits.setIsCloneModalOpen}
        sourceUnits={functionalUnits.sourceUnits}
        units={functionalUnits.units}
      />

      <FunctionalUnitDeleteModal
        handleConfirmDelete={functionalUnits.handleConfirmDelete}
        isDeleting={functionalUnits.isDeleting}
        setUnitToDelete={functionalUnits.setUnitToDelete}
        unitToDelete={functionalUnits.unitToDelete}
      />
    </div>
  );
};
