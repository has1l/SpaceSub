import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private from: string = '';

  constructor(private config: ConfigService) {
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST', 'smtp.yandex.ru'),
        port: this.config.get<number>('SMTP_PORT', 465),
        secure: true,
        auth: { user, pass },
      });
      this.from = this.config.get<string>('SMTP_FROM', `SpaceSub <${user}>`);
      this.logger.log(`Email service enabled, from: ${this.from}`);
    } else {
      this.logger.warn('Email service disabled — SMTP_USER/SMTP_PASS not set');
    }
  }

  isEnabled(): boolean {
    return this.transporter !== null;
  }

  async sendNotificationEmail(
    to: string,
    title: string,
    message: string,
  ): Promise<void> {
    if (!this.transporter) return;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: `SpaceSub: ${title}`,
        html: this.buildTemplate(title, message),
      });
      this.logger.log(`Email sent to ${to}: ${title}`);
    } catch (error) {
      this.logger.error(
        `Email failed to ${to}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private buildTemplate(title: string, message: string): string {
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5174',
    );

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#050510;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050510;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-size:22px;font-weight:700;letter-spacing:1px;background:linear-gradient(135deg,#00D4AA,#0EA5E9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
            SpaceSub
          </span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:rgba(15,15,36,0.95);border:1px solid rgba(0,212,170,0.15);border-radius:16px;padding:32px;">

          <!-- Icon -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding-bottom:20px;">
              <div style="width:48px;height:48px;border-radius:50%;background:rgba(0,212,170,0.12);line-height:48px;text-align:center;font-size:22px;">
                &#128276;
              </div>
            </td></tr>
          </table>

          <!-- Title -->
          <h1 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#E8EDF2;text-align:center;">
            ${this.escapeHtml(title)}
          </h1>

          <!-- Message -->
          <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:rgba(200,214,229,0.7);text-align:center;">
            ${this.escapeHtml(message)}
          </p>

          <!-- Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${frontendUrl}/notifications"
                 style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#00D4AA,#0EA5E9);color:#050510;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
                Открыть SpaceSub
              </a>
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:24px;">
          <p style="margin:0;font-size:11px;color:rgba(200,214,229,0.25);">
            SpaceSub — управление подписками
          </p>
          <p style="margin:4px 0 0;font-size:11px;color:rgba(200,214,229,0.15);">
            Вы получили это письмо, потому что включены email-уведомления.
            Отключить можно в настройках приложения.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
