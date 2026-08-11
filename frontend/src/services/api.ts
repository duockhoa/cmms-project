const API_BASE = 'http://localhost:3001/api/v1';

export const fetchWithAuth = async (url: string | URL, options: RequestInit = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': 'tech-demo-id',
    'x-test-user-id': 'tech-demo-id',
    ...options.headers
  };
  return fetch(url, { ...options, headers });
};


async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'tech-demo-id',
      'x-test-user-id': 'tech-demo-id',
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
  createWorkOrder: (data: any) => request('/work-orders', { method: 'POST', body: JSON.stringify(data) }),
  updateWorkOrderStatus: (id: string, body: { status: string; expectedVersion?: number; failureCause?: string; solution?: string; technicianName?: string }) =>
    request(`/work-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
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
        'x-user-id': 'tech-demo-id',
        'x-test-user-id': 'tech-demo-id',
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
};
