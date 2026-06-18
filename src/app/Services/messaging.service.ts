import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface MessageTemplate {
  id: string;
  title: string;
  body: string;
  channel: 'SMS' | 'WhatsApp' | 'Both';
  category: 'Attendance' | 'Homework' | 'Fee Alert' | 'Exam' | 'Notice' | 'Custom';
  isDefault?: boolean;
}

export interface DeliveryLog {
  id: string;
  timestamp: string;
  channel: 'SMS' | 'WhatsApp';
  recipientType: 'Parent' | 'Staff';
  recipientCount: number;
  messageSnippet: string;
  status: 'Sent' | 'Failed';
  academicYear: string;
}

export interface GatewayConfig {
  smsProvider: string;
  smsApiKey: string;
  smsSenderId: string;
  waProvider: string;
  waApiKey: string;
  waFromNumber: string;
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private defaultTemplates: MessageTemplate[] = [
    {
      id: 'd1',
      title: 'Student Absence Alert',
      body: 'Dear {ParentName}, your ward {StudentName} was marked ABSENT today, {Date}. Please contact the school office if you need details. - {SchoolName}',
      channel: 'Both',
      category: 'Attendance',
      isDefault: true
    },
    {
      id: 'd2',
      title: 'Fee Reminder Notice',
      body: 'Dear {ParentName}, this is a gentle reminder that the term fee of {Amount} for {StudentName} is due by {DueDate}. Kindly ignore if already paid. - {SchoolName}',
      channel: 'Both',
      category: 'Fee Alert',
      isDefault: true
    },
    {
      id: 'd3',
      title: 'Homework Assigned Notification',
      body: 'Dear {ParentName}, a new homework for subject {Subject} has been assigned for class {Class} on {Date}. Due date: {DueDate}. - {SchoolName}',
      channel: 'SMS',
      category: 'Homework',
      isDefault: true
    },
    {
      id: 'd4',
      title: 'Exam Results Published',
      body: 'Dear {ParentName}, the results for {ExamName} have been published. {StudentName} scored {Percentage}%. Please check the portal. - {SchoolName}',
      channel: 'Both',
      category: 'Exam',
      isDefault: true
    },
    {
      id: 'd5',
      title: 'General Staff Meeting Notice',
      body: 'Dear {StaffName}, a general staff meeting has been scheduled for {Date} at {Time} in the conference hall. Attendance is mandatory. - {SchoolName}',
      channel: 'Both',
      category: 'Notice',
      isDefault: true
    }
  ];

  constructor() {}

  // Scoped Storage Helpers
  private getStorageKey(schoolId: string, key: string): string {
    return `school_${schoolId}_messaging_${key}`;
  }

  // Gateway Credentials Configuration
  getGatewayConfig(schoolId: string): GatewayConfig {
    const data = localStorage.getItem(this.getStorageKey(schoolId, 'config'));
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        // Fallback
      }
    }
    return {
      smsProvider: 'Twilio Demo Gateway',
      smsApiKey: 'demo_sms_api_key_xyz_789456',
      smsSenderId: 'SCHERP',
      waProvider: 'Meta WhatsApp Cloud Demo',
      waApiKey: 'demo_wa_api_key_abc_123456',
      waFromNumber: '+14155552671'
    };
  }

  saveGatewayConfig(schoolId: string, config: GatewayConfig): void {
    localStorage.setItem(this.getStorageKey(schoolId, 'config'), JSON.stringify(config));
  }

  // Templates Management (Default + Custom)
  getTemplates(schoolId: string): MessageTemplate[] {
    const customData = localStorage.getItem(this.getStorageKey(schoolId, 'templates'));
    let customTemplates: MessageTemplate[] = [];
    if (customData) {
      try {
        customTemplates = JSON.parse(customData);
      } catch (e) {
        // Fallback
      }
    }
    return [...this.defaultTemplates, ...customTemplates];
  }

  saveCustomTemplate(schoolId: string, template: Omit<MessageTemplate, 'isDefault'>): void {
    const customData = localStorage.getItem(this.getStorageKey(schoolId, 'templates'));
    let customTemplates: MessageTemplate[] = [];
    if (customData) {
      try {
        customTemplates = JSON.parse(customData);
      } catch (e) {}
    }

    if (template.id) {
      const idx = customTemplates.findIndex(t => t.id === template.id);
      if (idx > -1) {
        customTemplates[idx] = template as MessageTemplate;
      } else {
        customTemplates.push(template as MessageTemplate);
      }
    } else {
      const newTemplate: MessageTemplate = {
        ...template,
        id: 'c_' + Math.random().toString(36).substr(2, 9),
        isDefault: false
      };
      customTemplates.push(newTemplate);
    }

    localStorage.setItem(this.getStorageKey(schoolId, 'templates'), JSON.stringify(customTemplates));
  }

  deleteCustomTemplate(schoolId: string, templateId: string): void {
    const customData = localStorage.getItem(this.getStorageKey(schoolId, 'templates'));
    if (customData) {
      try {
        let customTemplates: MessageTemplate[] = JSON.parse(customData);
        customTemplates = customTemplates.filter(t => t.id !== templateId);
        localStorage.setItem(this.getStorageKey(schoolId, 'templates'), JSON.stringify(customTemplates));
      } catch (e) {}
    }
  }

  // History / Logs Scoped by SchoolID
  getDeliveryLogs(schoolId: string): DeliveryLog[] {
    const data = localStorage.getItem(this.getStorageKey(schoolId, 'logs'));
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {}
    }
    return [];
  }

  // Simulated messaging transmission
  sendSimulatedMessages(
    schoolId: string,
    academicYear: string,
    channel: 'SMS' | 'WhatsApp',
    recipientType: 'Parent' | 'Staff',
    recipients: any[],
    messageBody: string
  ): Observable<boolean> {
    // Simulate API delay
    return new Observable<boolean>(subscriber => {
      setTimeout(() => {
        const logs = this.getDeliveryLogs(schoolId);
        const newLog: DeliveryLog = {
          id: 'log_' + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          channel,
          recipientType,
          recipientCount: recipients.length,
          messageSnippet: messageBody.length > 60 ? messageBody.substring(0, 60) + '...' : messageBody,
          status: 'Sent',
          academicYear
        };

        logs.unshift(newLog);
        localStorage.setItem(this.getStorageKey(schoolId, 'logs'), JSON.stringify(logs));

        subscriber.next(true);
        subscriber.complete();
      }, 1500);
    });
  }
}
