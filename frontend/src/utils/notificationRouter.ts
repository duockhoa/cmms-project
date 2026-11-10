export interface NotificationLike {
  id?: string;
  title?: string;
  message?: string;
  link?: string;
  actionPath?: string;
  [key: string]: any;
}

/**
 * Resolves target URL route from notification data (explicit link or parsing title/message)
 */
export function resolveNotificationDestination(n?: NotificationLike | null): string {
  if (!n) return '';

  // 1. Explicit link or actionPath provided directly
  if (n.link && typeof n.link === 'string' && n.link.trim()) {
    return n.link.trim();
  }
  if (n.actionPath && typeof n.actionPath === 'string' && n.actionPath.trim()) {
    return n.actionPath.trim();
  }

  const title = (n.title || '').trim();
  const message = (n.message || '').trim();
  const fullText = `${title} ${message}`;

  // 2. Work Order codes (e.g. WO-202611-0001, WO-0001)
  const woInTitle = title.match(/\b(WO-[A-Za-z0-9-]+)\b/i);
  const woMatch = woInTitle || fullText.match(/\b(WO-[A-Za-z0-9-]+)\b/i);
  if (woMatch) {
    const code = woMatch[1].toUpperCase();
    return `/work-orders?id=${encodeURIComponent(code)}&search=${encodeURIComponent(code)}`;
  }

  // 3. Maintenance Request / Incident codes (e.g. MR-202611-0001, SC-0001)
  const reqInTitle = title.match(/\b((?:MR|SC|REQ|YC)-[A-Za-z0-9-]+)\b/i);
  const reqMatch = reqInTitle || fullText.match(/\b((?:MR|SC|REQ|YC)-[A-Za-z0-9-]+)\b/i);
  if (reqMatch) {
    const code = reqMatch[1].toUpperCase();
    return `/requests?id=${encodeURIComponent(code)}&search=${encodeURIComponent(code)}`;
  }

  // 4. Fabrication Order codes (e.g. FAB-202611-0001, GC-0001)
  const fabInTitle = title.match(/\b((?:FAB|GC)-[A-Za-z0-9-]+)\b/i);
  const fabMatch = fabInTitle || fullText.match(/\b((?:FAB|GC)-[A-Za-z0-9-]+)\b/i);
  if (fabMatch) {
    const code = fabMatch[1].toUpperCase();
    return `/fabrication/${encodeURIComponent(code)}`;
  }

  // 5. Spare parts codes (e.g. SP-001, VT-001)
  const spMatch = fullText.match(/\b((?:SP|VT|PT)-[A-Za-z0-9-]+)\b/i);
  if (spMatch) {
    const code = spMatch[1].toUpperCase();
    return `/spare-parts?search=${encodeURIComponent(code)}`;
  }

  // 6. Equipment codes (e.g. EQ-001, TB-001)
  const eqMatch = fullText.match(/\b((?:EQ|TB)-[A-Za-z0-9-]+)\b/i);
  if (eqMatch) {
    const code = eqMatch[1].toUpperCase();
    return `/equipment?search=${encodeURIComponent(code)}`;
  }

  // 7. Contextual keywords fallback
  const lower = fullText.toLowerCase();
  if (
    lower.includes('phiếu bảo trì') ||
    lower.includes('phiếu sửa chữa') ||
    lower.includes('work order') ||
    lower.includes('nghiệm thu') ||
    lower.includes('phân công kỹ thuật')
  ) {
    return '/work-orders';
  }

  if (
    lower.includes('sự cố') ||
    lower.includes('yêu cầu sửa chữa') ||
    lower.includes('báo sự cố') ||
    lower.includes('yêu cầu')
  ) {
    return '/requests';
  }

  if (
    lower.includes('gia công') ||
    lower.includes('chế tạo') ||
    lower.includes('fabrication')
  ) {
    return '/fabrication';
  }

  if (
    lower.includes('định kỳ') ||
    lower.includes('kế hoạch bảo trì') ||
    lower.includes('bảo dưỡng')
  ) {
    return '/maintenance';
  }

  if (
    lower.includes('phụ tùng') ||
    lower.includes('vật tư') ||
    lower.includes('tồn kho') ||
    lower.includes('hết hàng')
  ) {
    return '/spare-parts';
  }

  if (
    lower.includes('thiết bị') ||
    lower.includes('kiểm định') ||
    lower.includes('hiệu chuẩn')
  ) {
    return '/equipment';
  }

  return '';
}
