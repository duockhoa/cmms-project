export interface EmailMetadataItem {
  label: string;
  value: string;
  isHighlight?: boolean;
}

export interface BuildEmailOptions {
  recipientName?: string;
  title: string;
  badgeText?: string;
  badgeColor?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray';
  summaryMessage: string;
  metadata?: EmailMetadataItem[];
  notes?: string;
  actionText?: string;
  actionUrl?: string;
}

export function buildDkPharmaEmailTemplate(options: BuildEmailOptions): string {
  const {
    recipientName = 'Quý đồng nghiệp',
    title,
    badgeText,
    badgeColor = 'blue',
    summaryMessage,
    metadata = [],
    notes,
    actionText = 'Xem chi tiết & Xử lý trên hệ thống',
    actionUrl,
  } = options;

  const badgeStyles: Record<string, { bg: string; color: string; border: string }> = {
    blue: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    green: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    amber: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    red: { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
    purple: { bg: '#fdf4ff', color: '#7e22ce', border: '#f5d0fe' },
    gray: { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
  };

  const badgeStyle = badgeStyles[badgeColor] || badgeStyles.blue;

  const metadataHtml = metadata.length > 0 ? `
    <table style="width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; font-size: 14px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
      <tbody>
        ${metadata.map((item, idx) => `
          <tr style="border-bottom: ${idx === metadata.length - 1 ? 'none' : '1px solid #e2e8f0'};">
            <td style="padding: 10px 14px; width: 35%; color: #64748b; font-weight: 500;">${item.label}</td>
            <td style="padding: 10px 14px; width: 65%; color: ${item.isHighlight ? '#1d4ed8' : '#1e293b'}; font-weight: ${item.isHighlight ? '700' : '600'};">${item.value}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  const notesHtml = notes ? `
    <div style="margin-top: 16px; margin-bottom: 20px; padding: 12px 16px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; font-size: 13.5px; color: #92400e; line-height: 1.5;">
      <strong>Ghi chú / Chỉ dẫn:</strong><br/>
      ${notes.replace(/\n/g, '<br/>')}
    </div>
  ` : '';

  const buttonHtml = actionUrl ? `
    <div style="text-align: center; margin-top: 28px; margin-bottom: 28px;">
      <a href="${actionUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);">
        ${actionText} &rarr;
      </a>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 24px 30px; text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 11.5px; text-transform: uppercase; letter-spacing: 1px; color: #93c5fd; font-weight: 700; margin-bottom: 4px;">
                      CÔNG TY CỔ PHẦN DƯỢC KHOA (DK PHARMA)
                    </div>
                    <div style="font-size: 18px; font-weight: 800; color: #ffffff;">
                      HỆ THỐNG QUẢN LÝ THIẾT BỊ & CƠ ĐIỆN (CMMS)
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 28px 30px;">
              
              <!-- Greeting & Badge -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
                <tr>
                  <td align="left" style="font-size: 14px; color: #64748b;">
                    Xin chào <strong>${recipientName}</strong>,
                  </td>
                  ${badgeText ? `
                    <td align="right">
                      <span style="display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 700; border-radius: 9999px; background-color: ${badgeStyle.bg}; color: ${badgeStyle.color}; border: 1px solid ${badgeStyle.border};">
                        ${badgeText}
                      </span>
                    </td>
                  ` : ''}
                </tr>
              </table>

              <!-- Title -->
              <h2 style="margin: 0 0 14px 0; font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.4;">
                ${title}
              </h2>

              <!-- Summary Message -->
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                ${summaryMessage}
              </p>

              <!-- Metadata Table -->
              ${metadataHtml}

              <!-- Notes Box -->
              ${notesHtml}

              <!-- Action Button -->
              ${buttonHtml}

              <div style="border-top: 1px dashed #cbd5e1; margin-top: 24px; padding-top: 14px; font-size: 12.5px; color: #64748b; line-height: 1.5;">
                Nếu nút bấm trên không mở được, bạn có thể copy và dán liên kết sau vào trình duyệt:<br/>
                <a href="${actionUrl || '#'}" style="color: #2563eb; word-break: break-all;">${actionUrl || '---'}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
              <div>Đây là email tự động gửi từ <strong>Hệ thống CMMS Dược Khoa</strong>. Vui lòng không trả lời (reply) trực tiếp vào email này.</div>
              <div style="margin-top: 6px;">
                Phòng Cơ điện & Quản trị Hệ thống | Hotline hỗ trợ kỹ thuật nội bộ
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
