import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly serviceId: string;
  private readonly templateId: string;
  private readonly publicKey: string;
  private readonly privateKey: string;

  constructor(private config: ConfigService) {
    this.serviceId = this.config.get<string>('EMAILJS_SERVICE_ID', '');
    this.templateId = this.config.get<string>('EMAILJS_TEMPLATE_ID', '');
    this.publicKey = this.config.get<string>('EMAILJS_PUBLIC_KEY', '');
    this.privateKey = this.config.get<string>('EMAILJS_PRIVATE_KEY', '');

    if (this.isEnabled()) {
      this.logger.log('Email service enabled (EmailJS)');
    } else {
      this.logger.warn('Email service disabled — EMAILJS env vars not set');
    }
  }

  isEnabled(): boolean {
    return !!(this.serviceId && this.templateId && this.publicKey);
  }

  async sendNotificationEmail(
    to: string,
    title: string,
    message: string,
  ): Promise<void> {
    if (!this.isEnabled()) return;

    await axios.post(
      'https://api.emailjs.com/api/v1.0/email/send',
      {
        service_id: this.serviceId,
        template_id: this.templateId,
        user_id: this.publicKey,
        accessToken: this.privateKey,
        template_params: {
          to_email: to,
          title,
          message,
        },
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      },
    );

    this.logger.log(`Email sent to ${to}: ${title}`);
  }
}
