export const API_HOST = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
const API_BASE = API_HOST + '/api/v1';
const DEMO_USER_ID = (import.meta as any).env.VITE_USER_ID || 'tech-demo-id';

export const fetchWithAuth = async (url: string | URL, options: RequestInit = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': DEMO_USER_ID,
    'x-test-user-id': DEMO_USER_ID,
    ...options.headers
  };
  return fetch(url, { ...options, headers });
};


async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': DEMO_USER_ID,
      'x-test-user-id': DEMO_USER_ID,
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'API request failed');
    }
    return await res.json();
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Analytics
  getDashboard: () => request('/analytics/dashboard'),
  getKpis: (params?: { timezone?: string; actedById?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/analytics/kpis${query ? `?${query}` : ''}`);
  },

  // Equipment
  getEquipment: (params?: { search?: string; category?: string; status?: string; location?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/equipment${query ? `?${query}` : ''}`);
  },
  getEquipmentById: (id: string) => request(`/equipment/${id}`),
  createEquipment: (data: any) => request('/equipment', { method: 'POST', body: JSON.stringify(data) }),
  updateEquipment: (id: string, data: any) => request(`/equipment/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEquipment: (id: string) => request(`/equipment/${id}`, { method: 'DELETE' }),

  // Maintenance Requests
  getRequests: (params?: { status?: string; priority?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/requests${query ? `?${query}` : ''}`);
  },
  getRequestById: (id: string) => request(`/requests/${id}`),
  createRequest: (data: any) => request('/requests', { method: 'POST', body: JSON.stringify(data) }),
  approveRequest: (id: string, body?: any) =>
    request(`/requests/${id}/approve`, { method: 'POST', body: JSON.stringify(body || {}) }),
  rejectRequest: (id: string, body?: { reason?: string }) =>
    request(`/requests/${id}/reject`, { method: 'POST', body: JSON.stringify(body || {}) }),
  returnRequest: (id: string, body: any) =>
    request(`/requests/${id}/return`, { method: 'POST', body: JSON.stringify(body) }),
  resubmitRequest: (id: string, body: any) =>
    request(`/requests/${id}/resubmit`, { method: 'POST', body: JSON.stringify(body) }),
  cancelRequest: (id: string, body: any) =>
    request(`/requests/${id}/cancel`, { method: 'POST', body: JSON.stringify(body) }),
  getRequestHistory: (id: string) =>
    request(`/requests/${id}/history`),

  // Work Orders
  getWorkOrders: (params?: { status?: string; priority?: string; search?: string; equipmentId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/work-orders${query ? `?${query}` : ''}`);
  },
  getWorkOrderById: (id: string) => request(`/work-orders/${id}`),
  getWorkOrdersByEquipmentQr: (qrToken: string, scanMethod: string = 'QR_SCAN') =>
    request(`/work-orders/by-equipment-qr/${qrToken}?scanMethod=${scanMethod}`),
  getWorkOrderRepairLogs: (id: string) =>
    request(`/work-orders/${id}/execution-logs`),
  createWorkOrderRepairLog: (id: string, body: { content: string; result?: string; notes?: string; adjustedLogId?: string; adjustmentReason?: string }) =>
    request(`/work-orders/${id}/execution-logs`, { method: 'POST', body: JSON.stringify(body) }),
  createWorkOrder: (data: any) => request('/work-orders', { method: 'POST', body: JSON.stringify(data) }),
  updateWorkOrderStatus: (id: string, body: { status: string; expectedVersion?: number; failureCause?: string; solution?: string; technicianName?: string; workDone?: string; equipmentStatusAfter?: string; testResult?: string; conclusion?: string; recommendation?: string }) =>
    request(`/work-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  escalateWorkOrder: (id: string, body: { expectedVersion: number; reason: string }) =>
    request(`/work-orders/${id}/escalate`, { method: 'POST', body: JSON.stringify(body) }),
  classifyWorkOrder: (id: string, body: { expectedVersion: number; classificationResult: string; classificationNotes?: string }) =>
    request(`/work-orders/${id}/classify`, { method: 'POST', body: JSON.stringify(body) }),
  assignExecutor: (id: string, body: { expectedVersion: number; assignedTechnicianId: string; technicianName?: string }) =>
    request(`/work-orders/${id}/assign-executor`, { method: 'POST', body: JSON.stringify(body) }),
  submitHandover: (id: string, body: { expectedVersion: number; workDone: string; equipmentStatusAfter: string; testResult: string; conclusion: string; recommendation?: string }) =>
    request(`/work-orders/${id}/submit-handover`, { method: 'POST', body: JSON.stringify(body) }),
  acceptHandover: (id: string, body: { expectedVersion: number }) =>
    request(`/work-orders/${id}/accept-handover`, { method: 'POST', body: JSON.stringify(body) }),
  rejectHandover: (id: string, body: { expectedVersion: number; reason: string }) =>
    request(`/work-orders/${id}/reject-handover`, { method: 'POST', body: JSON.stringify(body) }),
  addWorkOrderItem: (id: string, item: { inventoryItemId: string; quantity: number }) =>
    request(`/work-orders/${id}/items`, { method: 'POST', body: JSON.stringify(item) }),
  deleteWorkOrder: (id: string) => request(`/work-orders/${id}`, { method: 'DELETE' }),

  // Schedules (Phase 3.7)
  getSchedules: (params?: any) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/maintenance-schedules${query ? `?${query}` : ''}`);
  },
  getScheduleById: (id: string) => request(`/maintenance-schedules/${id}`),
  createSchedule: (data: any) => request('/maintenance-schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (id: string, data: any) => request(`/maintenance-schedules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  activateSchedule: (id: string, body: any) => request(`/maintenance-schedules/${id}/activate`, { method: 'POST', body: JSON.stringify(body) }),
  pauseSchedule: (id: string, body: any) => request(`/maintenance-schedules/${id}/pause`, { method: 'POST', body: JSON.stringify(body) }),
  completeSchedule: (id: string, body: any) => request(`/maintenance-schedules/${id}/complete`, { method: 'POST', body: JSON.stringify(body) }),
  cancelSchedule: (id: string, body: any) => request(`/maintenance-schedules/${id}/cancel`, { method: 'POST', body: JSON.stringify(body) }),
  generateWorkOrderFromSchedule: (id: string, body: any) => request(`/maintenance-schedules/${id}/generate-work-order`, { method: 'POST', body: JSON.stringify(body) }),
  getScheduleHistory: (id: string) => request(`/maintenance-schedules/${id}/history`),
  deleteSchedule: (id: string) => request(`/maintenance-schedules/${id}`, { method: 'DELETE' }),

  // Inventory
  getInventory: (params?: { category?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/inventory${query ? `?${query}` : ''}`);
  },
  createInventory: (data: any) => request('/inventory', { method: 'POST', body: JSON.stringify(data) }),
  updateInventory: (id: string, data: any) => request(`/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  adjustInventoryStock: (id: string, changeQuantity: number) =>
    request(`/inventory/${id}/adjust`, { method: 'POST', body: JSON.stringify({ changeQuantity }) }),
  adjustIn: (itemId: string, body: any) =>
    request(`/inventory/${itemId}/adjust-in`, { method: 'POST', body: JSON.stringify(body) }),
  adjustOut: (itemId: string, body: any) =>
    request(`/inventory/${itemId}/adjust-out`, { method: 'POST', body: JSON.stringify(body) }),
  getInventoryTransactions: (itemId: string, query?: any) => {
    const q = new URLSearchParams(query as any).toString();
    return request(`/inventory/${itemId}/transactions${q ? `?${q}` : ''}`);
  },
  deleteInventory: (id: string) => request(`/inventory/${id}`, { method: 'DELETE' }),

  returnWorkOrderMaterial: (workOrderId: string, body: any) =>
    request(`/work-orders/${workOrderId}/material-returns`, { method: 'POST', body: JSON.stringify(body) }),
  getWorkOrderInventoryTransactions: (workOrderId: string) =>
    request(`/work-orders/${workOrderId}/inventory-transactions`),

  // Users & Technicians
  getUsers: (params?: { role?: string; includeInactive?: boolean }) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/users${query ? `?${query}` : ''}`);
  },
  getUserById: (id: string) => request(`/users/${id}`),
  getDepartments: () => request('/users/departments'),
  updateUserTechnicalProfile: (id: string, body: { specialty?: string; isActive?: boolean; expectedVersion: number }) =>
    request(`/users/${id}/technical-profile`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateUserAvailability: (id: string, body: { status: string; expectedVersion: number }) =>
    request(`/users/${id}/availability`, { method: 'PATCH', body: JSON.stringify(body) }),

  // Attachments
  getAttachments: (entityType: string, entityId: string) =>
    request(`/attachments?entityType=${entityType}&entityId=${entityId}`),
  deleteAttachment: (id: string) =>
    request(`/attachments/${id}`, { method: 'DELETE' }),
  uploadAttachment: (formData: FormData) => {
    return fetch(`${API_BASE}/attachments`, {
      method: 'POST',
      headers: {
        'x-user-id': DEMO_USER_ID,
        'x-test-user-id': DEMO_USER_ID,
      },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || 'Upload failed');
      }
      return res.json();
    });
  },

  // Checklist Executions
  createChecklistExecution: (workOrderId: string, body: any) =>
    request(`/work-orders/${workOrderId}/checklist-executions`, { method: 'POST', body: JSON.stringify(body) }),
  getChecklistExecutions: (workOrderId: string) =>
    request(`/work-orders/${workOrderId}/checklist-executions`),
  getChecklistExecutionById: (executionId: string) =>
    request(`/checklist-executions/${executionId}`),
  updateChecklistItem: (executionId: string, body: any) =>
    request(`/checklist-executions/${executionId}/items`, { method: 'PATCH', body: JSON.stringify(body) }),
  completeChecklistExecution: (executionId: string, body: any) =>
    request(`/checklist-executions/${executionId}/complete`, { method: 'POST', body: JSON.stringify(body) }),
  cancelChecklistExecution: (executionId: string, body: any) =>
    request(`/checklist-executions/${executionId}/cancel`, { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PATCH' }),

  // Operation Logs & Parameters
  getEquipmentParameters: (equipmentId: string) => request(`/equipment/${equipmentId}/parameters`),
  createEquipmentParameter: (equipmentId: string, body: any) => request(`/equipment/${equipmentId}/parameters`, { method: 'POST', body: JSON.stringify(body) }),
  updateEquipmentParameter: (equipmentId: string, paramId: string, body: any) => request(`/equipment/${equipmentId}/parameters/${paramId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteEquipmentParameter: (equipmentId: string, paramId: string) => request(`/equipment/${equipmentId}/parameters/${paramId}`, { method: 'DELETE' }),
  getOperationLogs: (equipmentId: string) => request(`/equipment/${equipmentId}/operation-logs`),
  // Lấy lịch sử sổ vận hành theo thiết bị
  getEquipmentLogs: async (equipmentId: string) => {
    return request(`/equipment/${equipmentId}/operation-logs`);
  },

  submitOperationLogs: (equipmentId: string, logs: any) => request(`/equipment/${equipmentId}/operation-logs`, { method: 'POST', body: JSON.stringify({ logs }) }),
  getAllOperationLogs: () => request('/operation-logs'),
  getOperationLogsReport: () => request('/analytics/operation-logs-report'),

  // Standard Parameters
  getStandardParameters: () => request('/standard-parameters'),
  createStandardParameter: (data: any) => request('/standard-parameters', { method: 'POST', body: JSON.stringify(data) }),
  updateStandardParameter: (id: string, data: any) => request(`/standard-parameters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStandardParameter: (id: string) => request(`/standard-parameters/${id}`, { method: 'DELETE' }),

  // ==========================================
  // ROLES & PERMISSIONS
  // ==========================================
  getRoles: () => request('/roles'),
  getRole: (id: string) => request(`/roles/${id}`),
  createRole: (role: any) => request('/roles', { method: 'POST', body: JSON.stringify(role) }),
  updateRole: (id: string, role: any) => request(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(role) }),
  deleteRole: (id: string) => request(`/roles/${id}`, { method: 'DELETE' }),

  updateUserRole: (userId: string, roleId: string | null) => request(`/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ roleId }) }),

  // ==========================================
  // CHECKLIST TEMPLATES & LIBRARY
  // ==========================================
  getChecklistLibrary: () => request('/checklist-library'),
  createChecklistLibraryItem: (data: any) => request('/checklist-library', { method: 'POST', body: JSON.stringify(data) }),
  updateChecklistLibraryItem: (id: string, data: any) => request(`/checklist-library/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChecklistLibraryItem: (id: string) => request(`/checklist-library/${id}`, { method: 'DELETE' }),

  getChecklistTemplates: () => request('/checklist-templates'),
  getChecklistTemplate: (id: string) => request(`/checklist-templates/${id}`),
  createChecklistTemplate: (data: any) => request('/checklist-templates', { method: 'POST', body: JSON.stringify(data) }),
  updateChecklistTemplate: (id: string, data: any) => request(`/checklist-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChecklistTemplate: (id: string) => request(`/checklist-templates/${id}`, { method: 'DELETE' }),

  addChecklistTemplateItems: (templateId: string, items: any[]) => request(`/checklist-templates/${templateId}/items`, { method: 'POST', body: JSON.stringify(items) }),
  deleteChecklistTemplateItem: (templateId: string, itemId: string) => request(`/checklist-templates/${templateId}/items/${itemId}`, { method: 'DELETE' }),
  reorderChecklistTemplateItems: (templateId: string, items: any[]) => request(`/checklist-templates/${templateId}/items/reorder`, { method: 'PUT', body: JSON.stringify(items) }),
};
