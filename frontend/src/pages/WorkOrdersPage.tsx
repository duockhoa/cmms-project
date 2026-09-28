import React from 'react';
import { CreateWorkOrderModal } from '../components/work-orders/CreateWorkOrderModal';
import { DeleteWorkOrderModal } from '../components/work-orders/DeleteWorkOrderModal';
import { DeviceScannerModal } from '../components/work-orders/DeviceScannerModal';
import { MaterialRequestModal, ReturnMaterialModal } from '../components/work-orders/MaterialRequestModal';
import { WorkOrderChecklistModal } from '../components/work-orders/WorkOrderChecklistModal';
import { WorkOrderSelectorModal } from '../components/work-orders/WorkOrderSelectorModal';
import { WorkOrderStatusModal } from '../components/work-orders/WorkOrderStatusModal';
import { WorkOrdersContent } from '../components/work-orders/WorkOrdersContent';
import { useWorkOrdersPage } from '../hooks/useWorkOrdersPage';

export const WorkOrdersPage: React.FC = () => {
  const workOrdersViewModel = useWorkOrdersPage();
  const {
    isAddOpen, formData, equipmentList, techniciansList, setFormData, setIsAddOpen,
    handleCreate, isChecklistOpen, selectedChecklistWO, setIsChecklistOpen,
    selectedMaterialWO, woTransactions, materialLoading, setSelectedMaterialWO,
    handleReturnClick, returnItemTarget, returnQuantity, returnReason,
    setReturnQuantity, setReturnReason, setReturnItemTarget, handleReturnSubmit,
    isQrScannerOpen, manualDeviceCode, setManualDeviceCode, setIsQrScannerOpen,
    handleDeviceIdentified, toast, isSelectWoOpen, multipleWosList,
    setIsSelectWoOpen, setSelectedDetailWoId, woToPause, pauseReason, isPausing,
    setPauseReason, setWoToPause, confirmQuickPause, woToDelete, isDeleting,
    setWoToDelete, confirmDeleteWo,
  } = workOrdersViewModel;
  return (
    <div>
      <WorkOrdersContent model={workOrdersViewModel} />
      <CreateWorkOrderModal
        isOpen={isAddOpen}
        formData={formData}
        equipmentList={equipmentList}
        technicians={techniciansList}
        onChange={setFormData}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleCreate}
      />

      <WorkOrderChecklistModal
        isOpen={isChecklistOpen}
        workOrder={selectedChecklistWO}
        onClose={() => setIsChecklistOpen(false)}
      />

      <MaterialRequestModal
        workOrder={selectedMaterialWO}
        transactions={woTransactions}
        loading={materialLoading}
        onClose={() => setSelectedMaterialWO(null)}
        onReturn={handleReturnClick}
      />

      <ReturnMaterialModal
        target={returnItemTarget}
        quantity={returnQuantity}
        reason={returnReason}
        onQuantityChange={setReturnQuantity}
        onReasonChange={setReturnReason}
        onClose={() => setReturnItemTarget(null)}
        onSubmit={handleReturnSubmit}
      />

      <DeviceScannerModal
        isOpen={isQrScannerOpen}
        manualCode={manualDeviceCode}
        onManualCodeChange={setManualDeviceCode}
        onClose={() => setIsQrScannerOpen(false)}
        onIdentify={handleDeviceIdentified}
        onInvalidManualCode={() => toast.error('Nhập mã', 'Vui lòng nhập mã thiết bị.')}
      />

      <WorkOrderSelectorModal
        isOpen={isSelectWoOpen}
        workOrders={multipleWosList}
        onClose={() => setIsSelectWoOpen(false)}
        onSelect={(workOrderId) => {
          setIsSelectWoOpen(false);
          setSelectedDetailWoId(workOrderId);
        }}
      />

      <WorkOrderStatusModal
        workOrder={woToPause}
        reason={pauseReason}
        submitting={isPausing}
        onReasonChange={setPauseReason}
        onClose={() => setWoToPause(null)}
        onSubmit={confirmQuickPause}
      />

      <DeleteWorkOrderModal
        workOrder={woToDelete}
        deleting={isDeleting}
        onClose={() => setWoToDelete(null)}
        onConfirm={confirmDeleteWo}
      />

    </div>
  );
};
