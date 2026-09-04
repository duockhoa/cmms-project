import { getAccessToken, getRefreshToken, saveAuthTokens, clearAuthTokens } from '../utils/authStorage';

export const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_BASE = API_HOST + '/api/v1';
const HRM_ROOT_URL = import.meta.env.VITE_HRM_ROOT_URL || 'https://hrmserver.dkpharma.io.vn';

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${HRM_ROOT_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error(`Refresh token HTTP ${response.status}`);
      }

      const data = await response.json();
      const newAccessToken = data.accessToken || data.access_token || data.token;
      const newRefreshToken = data.refreshToken || data.refresh_token;

      if (!newAccessToken) {
        throw new Error('No access token returned from refresh endpoint');
      }

      saveAuthTokens(newAccessToken, newRefreshToken);
      return newAccessToken;
    } catch (error) {
      console.warn('Refresh token failed:', error);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function handleAuthFailure() {
  clearAuthTokens();
  if (window.location.pathname !== '/login') {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
  }
}

export const fetchWithAuth = async (url: string | URL, options: RequestInit = {}) => {
  let token = getAccessToken();
  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  let res = await fetch(url, { credentials: 'include', ...options, headers });
  
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { credentials: 'include', ...options, headers });
    } else {
      handleAuthFailure();
    }
  }
  
  return res;
};

async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  let token = getAccessToken();
  
  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    credentials: 'include',
    headers,
    ...options,
  };

  try {
    let res = await fetch(url, config);

    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(url, config);
      } else {
        handleAuthFailure();
        throw new Error('Unauthorized');
      }
    }

    if (res.status === 401) {
      handleAuthFailure();
      throw new Error('Unauthorized');
    }
    
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

function toQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'undefined') {
      searchParams.append(key, String(value));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

export const api = {
  // Analytics
  getDashboard: () => request('/analytics/dashboard'),
  getKpis: (params?: { timezone?: string; actedById?: string }) =>
    request(`/analytics/kpis${toQueryString(params)}`),

  // Equipment
  getEquipment: (params?: { search?: string; category?: string; status?: string; location?: string }) =>
    request(`/equipment${toQueryString(params)}`),
  getEquipmentById: (id: string) => request(`/equipment/${id}`),
  createEquipment: (data: any) => request('/equipment', { method: 'POST', body: JSON.stringify(data) }),
  updateEquipment: (id: string, data: any) => request(`/equipment/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEquipment: (id: string) => request(`/equipment/${id}`, { method: 'DELETE' }),

  // Maintenance Requests
  getRequests: (params?: { status?: string; priority?: string; search?: string }) =>
    request(`/requests${toQueryString(params)}`),
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
  getWorkOrders: (params?: { status?: string; priority?: string; search?: string; equipmentId?: string }) =>
    request(`/work-orders${toQueryString(params)}`),
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
  getSchedules: (params?: any) =>
    request(`/maintenance-schedules${toQueryString(params)}`),
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
    const token = getAccessToken();
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return fetch(`${API_BASE}/attachments`, {
      method: 'POST',
      credentials: 'include',
      headers,
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
  bulkAssignEquipmentParameters: (equipmentId: string, standardParameterIds: string[]) =>
    request(`/equipment/${equipmentId}/parameters/bulk-assign`, { method: 'POST', body: JSON.stringify({ standardParameterIds }) }),
  batchUpdateEquipmentParameters: (equipmentId: string, items: any[]) =>
    request(`/equipment/${equipmentId}/parameters/batch`, { method: 'PUT', body: JSON.stringify({ items }) }),
  getOperationLogs: (equipmentId: string) => request(`/equipment/${equipmentId}/operation-logs`),
  // Lấy lịch sử sổ vận hành theo thiết bị
  getEquipmentLogs: async (equipmentId: string) => {
    return request(`/equipment/${equipmentId}/operation-logs`);
  },

  submitOperationLogs: (equipmentId: string, logs: any) => request(`/equipment/${equipmentId}/operation-logs`, { method: 'POST', body: JSON.stringify({ logs }) }),
  getAllOperationLogs: () => request('/operation-logs'),
  getOperationLogsReport: () => request('/analytics/operation-logs-report'),

  // Standard Operating Parameters (Tham số vận hành theo dõi theo ca)
  getStandardParameters: () => request('/standard-parameters'),
  createStandardParameter: (data: any) => request('/standard-parameters', { method: 'POST', body: JSON.stringify(data) }),
  updateStandardParameter: (id: string, data: any) => request(`/standard-parameters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStandardParameter: (id: string) => request(`/standard-parameters/${id}`, { method: 'DELETE' }),

  // Standard Technical Specs (Thư viện thông số kỹ thuật chuẩn từ NSX)
  getStandardTechnicalSpecs: () => request('/standard-technical-specs'),
  createStandardTechnicalSpec: (data: any) => request('/standard-technical-specs', { method: 'POST', body: JSON.stringify(data) }),
  updateStandardTechnicalSpec: (id: string, data: any) => request(`/standard-technical-specs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStandardTechnicalSpec: (id: string) => request(`/standard-technical-specs/${id}`, { method: 'DELETE' }),

  // Equipment Technical Specs (Thông số kỹ thuật gán cho máy theo hồ sơ NSX)
  getEquipmentTechnicalSpecs: (equipmentId: string) => request(`/equipment/${equipmentId}/technical-specs`),
  createEquipmentTechnicalSpec: (equipmentId: string, data: any) => request(`/equipment/${equipmentId}/technical-specs`, { method: 'POST', body: JSON.stringify(data) }),
  updateEquipmentTechnicalSpec: (equipmentId: string, id: string, data: any) => request(`/equipment/${equipmentId}/technical-specs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEquipmentTechnicalSpec: (equipmentId: string, id: string) => request(`/equipment/${equipmentId}/technical-specs/${id}`, { method: 'DELETE' }),
  bulkAssignEquipmentTechnicalSpecs: (equipmentId: string, standardSpecIds: string[]) =>
    request(`/equipment/${equipmentId}/technical-specs/bulk-assign`, { method: 'POST', body: JSON.stringify({ standardSpecIds }) }),
  batchUpdateEquipmentTechnicalSpecs: (equipmentId: string, items: any[]) =>
    request(`/equipment/${equipmentId}/technical-specs/batch`, { method: 'PUT', body: JSON.stringify({ items }) }),
  syncEquipmentTechnicalSpecs: (equipmentId: string, items: any[]) =>
    request(`/equipment/${equipmentId}/technical-specs/sync`, { method: 'POST', body: JSON.stringify({ items }) }),
  syncEquipmentParameters: (equipmentId: string, items: any[]) =>
    request(`/equipment/${equipmentId}/parameters/sync`, { method: 'POST', body: JSON.stringify({ items }) }),

  // Equipment Categories
  getEquipmentCategories: () => request('/equipment-categories'),
  createEquipmentCategory: (data: any) => request('/equipment-categories', { method: 'POST', body: JSON.stringify(data) }),
  updateEquipmentCategory: (id: string, data: any) => request(`/equipment-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEquipmentCategory: (id: string) => request(`/equipment-categories/${id}`, { method: 'DELETE' }),

  // Locations / Workshops
  getLocations: () => request('/locations'),
  createLocation: (data: any) => request('/locations', { method: 'POST', body: JSON.stringify(data) }),
  updateLocation: (id: string, data: any) => request(`/locations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteLocation: (id: string) => request(`/locations/${id}`, { method: 'DELETE' }),

  // Production Lines
  getProductionLines: () => request('/production-lines'),
  createProductionLine: (data: any) => request('/production-lines', { method: 'POST', body: JSON.stringify(data) }),
  updateProductionLine: (id: string, data: any) => request(`/production-lines/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProductionLine: (id: string) => request(`/production-lines/${id}`, { method: 'DELETE' }),

  // System Settings
  getSystemSettings: () => request('/system-settings'),
  updateSystemSetting: (data: { key: string; value: string }) => request('/system-settings', { method: 'POST', body: JSON.stringify(data) }),

  // ==========================================
  // ROLES & PERMISSIONS
  // ==========================================
  getRoles: () => request('/roles'),
  getRole: (id: string) => request(`/roles/${id}`),
  createRole: (role: any) => request('/roles', { method: 'POST', body: JSON.stringify(role) }),
  updateRole: (id: string, role: any) => request(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(role) }),
  deleteRole: (id: string) => request(`/roles/${id}`, { method: 'DELETE' }),

  updateUserRole: async (id: string, roleId: string | null) => {
    return request(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ roleId }),
    });
  },

  createUser: (data: any) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id: string) => request(`/users/${id}`, { method: 'DELETE' }),

  syncHrmUsers: async () => {
    return request('/users/sync-hrm', {
      method: 'POST',
    });
  },

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

  // ==========================================
  // FEEDBACKS & BUG REPORTS
  // ==========================================
  getFeedbacks: (params?: { status?: string; type?: string; search?: string }) => {
    return request(`/feedbacks${toQueryString(params)}`);
  },
  getFeedbackById: (id: string) => request(`/feedbacks/${id}`),
  createFeedback: (data: any) => request('/feedbacks', { method: 'POST', body: JSON.stringify(data) }),
  updateFeedback: (id: string, data: any) => request(`/feedbacks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteFeedback: (id: string) => request(`/feedbacks/${id}`, { method: 'DELETE' }),

  // ==========================================
  // UTILITIES & ENERGY MONITORING (ĐIỆN, NƯỚC, HỆ THỐNG PHỤ TRỢ)
  // ==========================================
  getUtilityPoints: (params?: { type?: string; location?: string; search?: string; isActive?: boolean }) => {
    return request(`/utilities/points${toQueryString(params)}`);
  },
  getUtilityPointByIdOrCode: (idOrCode: string) => request(`/utilities/points/${idOrCode}`),
  createUtilityPoint: (data: any) => request('/utilities/points', { method: 'POST', body: JSON.stringify(data) }),
  updateUtilityPoint: (id: string, data: any) => request(`/utilities/points/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUtilityPoint: (id: string) => request(`/utilities/points/${id}`, { method: 'DELETE' }),

  recordUtilityReading: (data: {
    pointId?: string;
    code?: string;
    shift?: string;
    readingValue: number;
    normalValue?: number;
    peakValue?: number;
    offPeakValue?: number;
    powerKw?: number;
    powerFactorCosPhi?: number;
    imageUrl?: string;
    notes?: string;
  }) => request('/utilities/readings', { method: 'POST', body: JSON.stringify(data) }),

  getUtilityReadings: (params?: {
    pointId?: string;
    type?: string;
    shift?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    return request(`/utilities/readings${toQueryString(params)}`);
  },

  recordUtilitySystemStatus: (data: {
    pointId?: string;
    code?: string;
    status: 'RUNNING' | 'OFF' | 'STANDBY' | 'FAULT' | 'MAINTENANCE';
    runningHours?: number;
    reason?: string;
    parametersJson?: string;
  }) => request('/utilities/system-status', { method: 'POST', body: JSON.stringify(data) }),

  getUtilityStatusLogs: (params?: {
    pointId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    return request(`/utilities/system-status/history${toQueryString(params)}`);
  },

  getUtilityAnalytics: (params?: { days?: number }) => {
    return request(`/utilities/analytics${toQueryString(params)}`);
  },

  getCumulativeUtilityReport: (params?: {
    type?: 'ELECTRICITY' | 'WATER';
    month?: number;
    year?: number;
  }) => {
    return request(`/utilities/reports/cumulative${toQueryString(params)}`);
  },
};
