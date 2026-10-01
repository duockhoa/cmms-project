import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { buildDkPharmaEmailTemplate, BuildEmailOptions } from './templates/email-template';

export interface SendDkPharmaEmailDto extends Omit<BuildEmailOptions, 'actionUrl'> {
  to: string | string[];
  subject: string;
  actionPath?: string; // e.g. '/work-orders?id=xxx' or '/fabrication/xxx'
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;
  private readonly fromAddress: string;
  private readonly frontendUrl: string;

  constructor() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    const fromName = process.env.SMTP_FROM_NAME || 'DK Pharma - Quản Lý Thiết Bị';
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'cmms.dkpharma@gmail.com';

    this.fromAddress = `"${fromName}" <${fromEmail}>`;
    this.frontendUrl = (process.env.APP_FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: {
            user,
            pass,
          },
        });
        this.isConfigured = true;
        this.logger.log(`[MAIL] SMTP Transporter configured for host: ${host}:${port} (${user})`);
      } catch (err) {
        this.logger.error('[MAIL] Failed to initialize nodemailer transporter:', err);
      }
    } else {
      this.logger.warn('[MAIL] SMTP credentials not provided (SMTP_USER or SMTP_PASS is empty). MailService will operate in Simulation / Log Mode.');
    }
  }

  /**
   * Verify SMTP connection status
   */
  async verifyConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.transporter || !this.isConfigured) {
      return {
        success: false,
        message: 'SMTP chưa được cấu hình tài khoản (SMTP_USER hoặc SMTP_PASS trống trong .env)',
      };
    }
    try {
      await this.transporter.verify();
      return { success: true, message: 'Kết nối SMTP thành công' };
    } catch (err: any) {
      this.logger.error('[MAIL] SMTP verification failed:', err);
      return { success: false, message: `Lỗi kết nối SMTP: ${err.message}` };
    }
  }

  /**
   * Send basic email
   */
  async sendMail(options: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    const recipients = Array.isArray(options.to) ? options.to.filter(Boolean) : [options.to];
    if (recipients.length === 0) {
      this.logger.warn('[MAIL] No valid recipients provided. Skipped.');
      return false;
    }

    if (!this.transporter || !this.isConfigured) {
      this.logger.log(`[MAIL SIMULATION] To: ${recipients.join(', ')} | Subject: ${options.subject}`);
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: recipients,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(`[MAIL SENT] MessageId: ${info.messageId} to ${recipients.join(', ')}`);
      return true;
    } catch (err: any) {
      this.logger.error(`[MAIL ERROR] Failed to send email to ${recipients.join(', ')}:`, err);
      return false;
    }
  }

  /**
   * Send high-level DK Pharma branded email
   */
  async sendDkPharmaEmail(dto: SendDkPharmaEmailDto): Promise<boolean> {
    const actionUrl = dto.actionPath
      ? (dto.actionPath.startsWith('http') ? dto.actionPath : `${this.frontendUrl}${dto.actionPath.startsWith('/') ? '' : '/'}${dto.actionPath}`)
      : undefined;

    const html = buildDkPharmaEmailTemplate({
      recipientName: dto.recipientName,
      title: dto.title,
      badgeText: dto.badgeText,
      badgeColor: dto.badgeColor,
      summaryMessage: dto.summaryMessage,
      metadata: dto.metadata,
      notes: dto.notes,
      actionText: dto.actionText,
      actionUrl,
    });

    return this.sendMail({
      to: dto.to,
      subject: dto.subject,
      html,
    });
  }
}
