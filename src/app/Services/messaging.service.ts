import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiServiceService } from './api-service.service';

export interface MessageTemplate {
  id: string;
  schoolId: string;
  title: string;
  body: string;
  channel: 'SMS' | 'WhatsApp' | 'Both';
  category: 'Attendance' | 'Homework' | 'Fee Alert' | 'Exam' | 'Notice' | 'Custom';
  isDefault?: boolean;
}

export interface DeliveryLog {
  id: string;
  schoolId: string;
  timestamp: string;
  channel: 'SMS' | 'WhatsApp';
  recipientType: 'Parent' | 'Staff';
  recipientCount: number;
  messageSnippet: string;
  status: 'Sent' | 'Failed';
  academicYear: string;
}

export interface GatewayConfig {
  schoolId: string;
  smsActive: boolean;
  smsProvider: string;
  smsApiKey: string;
  smsSenderId: string;
  whatsAppActive: boolean;
  whatsAppProvider: string;
  whatsAppApiKey: string;
  whatsAppNumber: string;
}

@Injectable({
  providedIn: 'root'
})
/**
 * Class Responsibility: Interacts with the backend messaging endpoints for multi-tenant configurations, templates, and history.
 */
export class MessagingService {
  constructor(private api: ApiServiceService) {}

  // Gateway Credentials Configuration
  getGatewayConfig(schoolId: string): Observable<any> {
    return this.api.get<any>(`GetGatewayConfig?schoolId=${schoolId}`);
  }

  saveGatewayConfig(config: GatewayConfig): Observable<any> {
    return this.api.post<any>('SaveGatewayConfig', config);
  }

  // Templates Management (Default + Custom)
  getTemplates(schoolId: string): Observable<any> {
    return this.api.get<any>(`GetTemplates?schoolId=${schoolId}`);
  }

  saveCustomTemplate(template: Omit<MessageTemplate, 'isDefault'>): Observable<any> {
    return this.api.post<any>('SaveTemplate', template);
  }

  deleteCustomTemplate(schoolId: string, templateId: string): Observable<any> {
    return this.api.delete<any>(`DeleteTemplate?schoolId=${schoolId}&templateId=${templateId}`);
  }

  // History / Logs Scoped by SchoolID
  getDeliveryLogs(schoolId: string): Observable<any> {
    return this.api.get<any>(`GetDeliveryLogs?schoolId=${schoolId}`);
  }

  // External outbound messaging dispatch integration
  sendMessages(payload: {
    schoolId: string;
    academicYearId: string;
    channel: string;
    recipientType: string;
    messageBody: string;
    recipients: any[];
  }): Observable<any> {
    return this.api.post<any>('SendMessages', payload);
  }
}
