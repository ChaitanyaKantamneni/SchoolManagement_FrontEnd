import { Component, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf, NgStyle, DatePipe } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiServiceService } from '../../../Services/api-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { LoaderService } from '../../../Services/loader.service';
import { MessagingService, MessageTemplate, DeliveryLog } from '../../../Services/messaging.service';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';

@Component({
  selector: 'app-messaging-dashboard',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, ReactiveFormsModule, FormsModule, DatePipe, DashboardTopNavComponent],
  templateUrl: './messaging-dashboard.component.html',
  styleUrl: './messaging-dashboard.component.css',
  providers: [DatePipe]
})
export class MessagingDashboardComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Messaging';

  activeTab: 'broadcast' | 'bulk' | 'whatsapp' | 'sms' | 'history' = 'broadcast';

  // Multi-tenancy State
  schoolList: any[] = [];
  academicYearList: any[] = [];
  AdminselectedSchoolID: string = '';
  AdminselectedAcademivYearID: string = '';
  AdminSelectedActiveAcademicYearID: string = '';
  SchoolSelectionChange = false;
  SchoolAcademicYearChange = false;

  // Broadcast Hub State
  channelType: 'SMS' | 'WhatsApp' = 'SMS';
  recipientGroup: 'Parents' | 'Staff' = 'Parents';
  
  // Recipients Filter
  classList: any[] = [];
  divisionList: any[] = [];
  selectedClassID = '';
  selectedDivisionID = '';
  recipientsList: any[] = [];
  selectedRecipientIds: Set<string> = new Set();
  
  roleList: any[] = [];
  selectedRoleID = '';

  // Broadcast Message Form
  messageForm = new FormGroup({
    templateId: new FormControl(''),
    messageBody: new FormControl('', [Validators.required, Validators.maxLength(1000)])
  });

  // Templates Management State
  templatesList: MessageTemplate[] = [];
  showTemplateModal = false;
  isEditingTemplate = false;
  templateForm = new FormGroup({
    id: new FormControl(''),
    title: new FormControl('', Validators.required),
    category: new FormControl('Custom', Validators.required),
    channel: new FormControl('Both', Validators.required),
    body: new FormControl('', Validators.required)
  });

  // History State
  historyLogs: DeliveryLog[] = [];
  filteredLogs: DeliveryLog[] = [];
  historySearchQuery = '';
  historyChannelFilter = 'All';

  // Settings State - WhatsApp (Msg91)
  whatsappActive = true;
  whatsappNumber = 'India2026@gmail.com';
  whatsappAuthKey = 'key_wa_demo_12345';
  whatsappEncryptionSecret = '';
  whatsappWebhookSecret = '';
  whatsappTemplatesSynced: any[] = [];
  whatsappTestPhone = '';
  whatsappTestMode: 'FREE TEXT' | 'TEMPLATE' = 'FREE TEXT';
  whatsappTestBody = '';

  // Settings State - SMS (Msg91)
  smsActive = true;
  smsSenderId = 'SCHERP';
  smsAuthKey = 'key_sms_demo_67890';
  smsEncryptionSecret = '';
  smsWebhookSecret = '';
  smsTemplatesSynced: any[] = [];
  smsTestPhone = '';
  smsTestMode: 'FREE TEXT' | 'TEMPLATE' = 'FREE TEXT';
  smsTestBody = '';

  // UI Alerts
  statusModalOpen = false;
  statusModalMessage = '';
  previewModalOpen = false;
  previewMessageText = '';

  // Custom Placeholders State
  customPlaceholderValues = {
    Date: new Date().toISOString().split('T')[0],
    Time: '10:00',
    Amount: '₹ 5,200',
    DueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  };

  Math = Math;

  constructor(
    router: Router,
    public loader: LoaderService,
    private apiurl: ApiServiceService,
    menuService: MenuServiceService,
    private messagingService: MessagingService,
    public datePipe: DatePipe
  ) {
    super(menuService, router);
  }

  ngOnInit(): void {
    this.checkViewPermission();
    
    // Resolve session identities
    this.AdminSelectedActiveAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';
    const schoolFromSession = sessionStorage.getItem('SchoolID') || localStorage.getItem('SchoolID') || '';
    this.AdminselectedSchoolID = schoolFromSession;
    this.AdminselectedAcademivYearID = this.AdminSelectedActiveAcademicYearID;

    this.FetchSchoolsList();
    this.FetchAcademicYearsList();
    this.loadDependentDropdowns();
    this.loadTemplates();
    this.loadHistory();
    this.loadConfigs();
  }

  getFormattedTime(): string {
    return this.datePipe.transform(new Date(), 'hh:mm a') || '';
  }

  loadConfigs() {
    const config = this.messagingService.getGatewayConfig(this.AdminselectedSchoolID);
    this.smsSenderId = config.smsSenderId;
    this.smsAuthKey = config.smsApiKey;
    this.whatsappNumber = config.waFromNumber;
    this.whatsappAuthKey = config.waApiKey;
  }

  saveConfigs() {
    this.loader.show();
    const config = {
      smsProvider: 'Msg91 API',
      smsApiKey: this.smsAuthKey,
      smsSenderId: this.smsSenderId,
      waProvider: 'Msg91 API',
      waApiKey: this.whatsappAuthKey,
      waFromNumber: this.whatsappNumber
    };
    this.messagingService.saveGatewayConfig(this.AdminselectedSchoolID, config);
    setTimeout(() => {
      this.loader.hide();
      this.showStatusModal('Configuration saved successfully for this tenant!');
    }, 800);
  }

  // Multi-Tenant Fetch Helpers
  FetchSchoolsList() {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' })
      .subscribe(res => {
        if (res && Array.isArray(res.data)) {
          this.schoolList = res.data.map((item: any) => ({
            ID: item.id,
            Name: item.name
          }));
        }
      });
  }

  FetchAcademicYearsList() {
    const schoolId = this.AdminselectedSchoolID;
    if (!schoolId) return;
    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: schoolId, Flag: '2' })
      .subscribe(res => {
        if (res && Array.isArray(res.data)) {
          this.academicYearList = res.data.map((item: any) => ({
            ID: item.id,
            Name: item.name
          }));
        }
      });
  }

  onSchoolChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.AdminselectedSchoolID = target.value;
    this.SchoolSelectionChange = true;
    this.FetchAcademicYearsList();
    this.loadDependentDropdowns();
    this.loadTemplates();
    this.loadHistory();
    this.loadConfigs();
    this.recipientsList = [];
    this.selectedRecipientIds.clear();
  }

  onAcademicYearChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.AdminselectedAcademivYearID = target.value;
    this.SchoolAcademicYearChange = true;
    this.loadDependentDropdowns();
    this.recipientsList = [];
    this.selectedRecipientIds.clear();
  }

  loadDependentDropdowns() {
    this.FetchClassList();
    this.FetchRolesList();
  }

  FetchClassList() {
    if (!this.AdminselectedSchoolID) return;
    const req = {
      SchoolID: this.AdminselectedSchoolID,
      AcademicYear: this.AdminselectedAcademivYearID,
      Flag: '9'
    };
    this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', req).subscribe(res => {
      if (res && Array.isArray(res.data)) {
        this.classList = res.data.map((item: any) => ({
          ID: item.sNo.toString(),
          Name: item.syllabusClassName
        }));
      } else {
        this.classList = [];
      }
    });
  }

  FetchDivisionList() {
    if (!this.AdminselectedSchoolID || !this.selectedClassID) return;
    const req = {
      SchoolID: this.AdminselectedSchoolID,
      AcademicYear: this.AdminselectedAcademivYearID,
      Class: this.selectedClassID,
      Flag: '11'
    };
    this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', req).subscribe(res => {
      if (res && Array.isArray(res.data)) {
        this.divisionList = res.data.map((item: any) => ({
          ID: item.id,
          Name: item.name
        }));
      } else {
        this.divisionList = [];
      }
    });
  }

  FetchRolesList() {
    this.apiurl.post<any>('Tbl_Roles_CRUD_Operations', { Flag: '2' }).subscribe(res => {
      if (res && Array.isArray(res.data)) {
        let roles = res.data;
        if (sessionStorage.getItem('RollID') !== '1') {
          roles = roles.filter((item: any) => item.id !== '1' && item.id !== '10');
        } else {
          roles = roles.filter((item: any) => item.id !== '10');
        }
        this.roleList = roles.map((item: any) => ({
          ID: item.id,
          Name: item.roleName
        }));
      }
    });
  }

  onClassChange() {
    this.selectedDivisionID = '';
    this.divisionList = [];
    this.recipientsList = [];
    this.selectedRecipientIds.clear();
    this.FetchDivisionList();
  }

  onDivisionChange() {
    this.recipientsList = [];
    this.selectedRecipientIds.clear();
  }

  onRoleChange() {
    this.recipientsList = [];
    this.selectedRecipientIds.clear();
  }

  // Load parent or staff list
  loadRecipients() {
    const selectedSchoolObj = this.schoolList.find(s => s.ID.toString() === this.AdminselectedSchoolID.toString());
    const currentSchoolName = selectedSchoolObj ? selectedSchoolObj.Name : (sessionStorage.getItem('schoolName') || 'Our School');

    if (this.recipientGroup === 'Parents') {
      if (!this.selectedClassID || !this.selectedDivisionID) {
        this.showStatusModal('Please select Class and Division first.');
        return;
      }
      this.loader.show();
      const payload = {
        Flag: '3',
        SchoolID: this.AdminselectedSchoolID,
        AcademicYear: this.AdminselectedAcademivYearID,
        Class: this.selectedClassID,
        Division: this.selectedDivisionID
      };
      this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', payload).subscribe({
        next: (res: any) => {
          const raw = res?.data || [];
          this.recipientsList = raw.map((item: any) => ({
            id: item.id,
            name: `${item.firstName} ${item.lastName}`.trim(),
            contactName: item.fatherName || 'Parent',
            mobile: item.mobileNo || item.fatherContact || '',
            email: item.emailID || item.fatherEmail || '',
            extraData: {
              StudentName: `${item.firstName} ${item.lastName}`.trim(),
              ParentName: item.fatherName || 'Parent',
              SchoolName: currentSchoolName,
              Date: this.datePipe.transform(new Date(), 'dd-MM-yyyy') || '',
              Time: this.datePipe.transform(new Date(), 'hh:mm a') || '',
              Amount: '₹ 5,200',
              DueDate: '30-06-2026',
              Subject: 'Mathematics',
              ExamName: 'Quarterly Examination',
              Percentage: '88%'
            }
          }));
          this.selectedRecipientIds.clear();
          this.loader.hide();
        },
        error: () => {
          this.loader.hide();
          this.showStatusModal('Failed to load students list.');
        }
      });
    } else {
      if (!this.selectedRoleID) {
        this.showStatusModal('Please select a Role first.');
        return;
      }
      this.loader.show();
      const payload = {
        Flag: '2',
        SchoolID: this.AdminselectedSchoolID,
        AcademicYear: this.AdminselectedAcademivYearID
      };
      this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', payload).subscribe({
        next: (res: any) => {
          const raw = res?.data || [];
          this.recipientsList = raw.filter((s: any) => {
            const types = s.staffType ? s.staffType.split(',').map((t: string) => t.trim()) : [];
            return types.includes(this.selectedRoleID);
          }).map((item: any) => ({
            id: item.id,
            name: `${item.firstName} ${item.lastName}`.trim(),
            contactName: `${item.firstName} ${item.lastName}`.trim(),
            mobile: item.mobileNumber || '',
            email: item.email || '',
            extraData: {
              StaffName: `${item.firstName} ${item.lastName}`.trim(),
              SchoolName: currentSchoolName,
              Date: this.datePipe.transform(new Date(), 'dd-MM-yyyy') || '',
              Time: this.datePipe.transform(new Date(), 'hh:mm a') || ''
            }
          }));
          this.selectedRecipientIds.clear();
          this.loader.hide();
        },
        error: () => {
          this.loader.hide();
          this.showStatusModal('Failed to load staff list.');
        }
      });
    }
  }

  // Recipient Selection Logic
  toggleRecipient(id: string) {
    if (this.selectedRecipientIds.has(id)) {
      this.selectedRecipientIds.delete(id);
    } else {
      this.selectedRecipientIds.add(id);
    }
  }

  toggleAllRecipients(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.recipientsList.forEach(r => this.selectedRecipientIds.add(r.id));
    } else {
      this.selectedRecipientIds.clear();
    }
  }

  isRecipientSelected(id: string): boolean {
    return this.selectedRecipientIds.has(id);
  }

  areAllRecipientsSelected(): boolean {
    return this.recipientsList.length > 0 && this.selectedRecipientIds.size === this.recipientsList.length;
  }

  // Template Loader
  onTemplateChange() {
    const tId = this.messageForm.get('templateId')?.value;
    if (!tId) return;
    const match = this.templatesList.find(t => t.id === tId);
    if (match) {
      this.messageForm.patchValue({
        messageBody: match.body
      });
    }
  }

  insertPlaceholder(placeholder: string) {
    const current = this.messageForm.get('messageBody')?.value || '';
    this.messageForm.patchValue({
      messageBody: current + placeholder
    });
  }

  formatDateString(val: string): string {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // dd-MM-yyyy
    }
    return val;
  }

  formatTime12Hr(timeStr: string): string {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      let hour = parseInt(parts[0], 10);
      const min = parts[1];
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12;
      hour = hour ? hour : 12;
      return `${hour}:${min} ${ampm}`;
    }
    return timeStr;
  }

  messageBodyContains(str: string): boolean {
    const currentText = this.messageForm.get('messageBody')?.value || '';
    return currentText.toLowerCase().includes(str.toLowerCase());
  }

  hasPlaceholders(): boolean {
    return this.messageBodyContains('{Date}') || 
           this.messageBodyContains('{Time}') || 
           this.messageBodyContains('{Amount}') || 
           this.messageBodyContains('{DueDate}');
  }

  checkSchoolAndPlaceholderValidation(rawBody: string): boolean {
    if (!this.AdminselectedSchoolID || this.AdminselectedSchoolID === '0') {
      this.showStatusModal('Please select a School from the top toolbar first.');
      return false;
    }
    if (!rawBody.toLowerCase().includes('{schoolname}')) {
      this.showStatusModal('The {SchoolName} placeholder is mandatory. Please insert {SchoolName} into your message content.');
      return false;
    }
    return true;
  }

  resolvePlaceholders(body: string, data: any): string {
    let resolved = body;
    
    // Always resolve SchoolName dynamically from active selection
    const selectedSchoolObj = this.schoolList.find(s => s.ID.toString() === this.AdminselectedSchoolID.toString());
    const currentSchoolName = selectedSchoolObj ? selectedSchoolObj.Name : (sessionStorage.getItem('schoolName') || 'Our School');

    // Use customized placeholders if they exist in the UI, else fall back to recipient properties
    const customDate = this.customPlaceholderValues.Date ? this.formatDateString(this.customPlaceholderValues.Date) : data.Date;
    const customTime = this.customPlaceholderValues.Time ? this.formatTime12Hr(this.customPlaceholderValues.Time) : data.Time;
    const customAmount = this.customPlaceholderValues.Amount || data.Amount;
    const customDueDate = this.customPlaceholderValues.DueDate ? this.formatDateString(this.customPlaceholderValues.DueDate) : data.DueDate;

    const placeholderMap: any = {
      StudentName: data.StudentName || '',
      ParentName: data.ParentName || '',
      StaffName: data.StaffName || '',
      SchoolName: currentSchoolName,
      Date: customDate,
      Time: customTime,
      Amount: customAmount,
      DueDate: customDueDate,
      Subject: data.Subject || 'Mathematics',
      ExamName: data.ExamName || 'Quarterly Examination',
      Percentage: data.Percentage || '88%'
    };

    Object.keys(placeholderMap).forEach(key => {
      resolved = resolved.replace(new RegExp(`{${key}}`, 'gi'), placeholderMap[key]);
    });
    return resolved;
  }

  // Preview logic
  openPreview() {
    const rawBody = this.messageForm.get('messageBody')?.value || '';
    if (!rawBody) {
      this.showStatusModal('Please compose a message first.');
      return;
    }
    if (!this.checkSchoolAndPlaceholderValidation(rawBody)) {
      return;
    }
    if (this.recipientsList.length === 0) {
      this.showStatusModal('Please load and select recipients first.');
      return;
    }
    const sample = this.recipientsList[0];
    this.previewMessageText = this.resolvePlaceholders(rawBody, sample.extraData);
    this.previewModalOpen = true;
  }

  // Send Logic
  sendMessage() {
    if (this.messageForm.invalid) {
      this.messageForm.markAllAsTouched();
      return;
    }
    const rawBody = this.messageForm.get('messageBody')?.value || '';
    if (!this.checkSchoolAndPlaceholderValidation(rawBody)) {
      return;
    }
    if (this.selectedRecipientIds.size === 0) {
      this.showStatusModal('Please select at least one recipient.');
      return;
    }

    const selectedRecipients = this.recipientsList.filter(r => this.selectedRecipientIds.has(r.id));

    this.loader.show();
    this.messagingService.sendSimulatedMessages(
      this.AdminselectedSchoolID,
      this.AdminselectedAcademivYearID,
      this.channelType,
      this.recipientGroup === 'Parents' ? 'Parent' : 'Staff',
      selectedRecipients,
      rawBody
    ).subscribe({
      next: () => {
        this.loader.hide();
        this.showStatusModal(`Successfully sent ${this.channelType} messages to ${selectedRecipients.length} recipients!`);
        this.messageForm.reset();
        this.selectedRecipientIds.clear();
        this.loadHistory();
      },
      error: () => {
        this.loader.hide();
        this.showStatusModal('Failed to send messages through gateway.');
      }
    });
  }

  // Template CRUD Operations
  loadTemplates() {
    this.templatesList = this.messagingService.getTemplates(this.AdminselectedSchoolID);
  }

  openNewTemplate() {
    this.templateForm.reset({ id: '', category: 'Custom', channel: 'Both' });
    this.isEditingTemplate = false;
    this.showTemplateModal = true;
  }

  openEditTemplate(t: MessageTemplate) {
    this.templateForm.patchValue({
      id: t.id,
      title: t.title,
      category: t.category,
      channel: t.channel,
      body: t.body
    });
    this.isEditingTemplate = true;
    this.showTemplateModal = true;
  }

  saveTemplate() {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }
    const val = this.templateForm.value;
    const payload = {
      id: val.id || '',
      title: val.title!,
      category: val.category! as any,
      channel: val.channel! as any,
      body: val.body!
    };
    this.messagingService.saveCustomTemplate(this.AdminselectedSchoolID, payload);
    this.showTemplateModal = false;
    this.loadTemplates();
    this.showStatusModal('Template saved successfully!');
  }

  deleteTemplate(tId: string) {
    if (confirm('Are you sure you want to delete this custom template?')) {
      this.messagingService.deleteCustomTemplate(this.AdminselectedSchoolID, tId);
      this.loadTemplates();
      this.showStatusModal('Template deleted successfully!');
    }
  }

  // Log Filtering
  loadHistory() {
    this.historyLogs = this.messagingService.getDeliveryLogs(this.AdminselectedSchoolID);
    this.applyHistoryFilters();
  }

  applyHistoryFilters() {
    this.filteredLogs = this.historyLogs.filter(log => {
      const matchSearch = log.messageSnippet.toLowerCase().includes(this.historySearchQuery.toLowerCase()) || 
                          log.recipientType.toLowerCase().includes(this.historySearchQuery.toLowerCase());
      const matchChannel = this.historyChannelFilter === 'All' || log.channel === this.historyChannelFilter;
      return matchSearch && matchChannel;
    });
  }

  // Msg91 Simulated Actions
  testConnection(type: 'sms' | 'whatsapp') {
    this.loader.show();
    setTimeout(() => {
      this.loader.hide();
      this.showStatusModal(`Connection to Msg91 ${type.toUpperCase()} gateway established successfully! API response status: 200 OK.`);
    }, 1000);
  }

  syncTemplatesFromMsg91(type: 'sms' | 'whatsapp') {
    this.loader.show();
    setTimeout(() => {
      this.loader.hide();
      const loaded = [
        { id: 'm1', title: 'System OTP Verification', category: 'Notice', channel: type.toUpperCase(), body: 'Your verification OTP is {OTP}. Please do not share this code. - {SchoolName}' },
        { id: 'm2', title: 'Absent Alert Msg91', category: 'Attendance', channel: type.toUpperCase(), body: 'Dear Parent, {StudentName} was absent today. Please justify. - {SchoolName}' }
      ];
      if (type === 'whatsapp') {
        this.whatsappTemplatesSynced = loaded;
      } else {
        this.smsTemplatesSynced = loaded;
      }
      this.showStatusModal(`Successfully pulled and synced approved templates from Msg91 account.`);
    }, 1200);
  }

  sendTestMessage(type: 'sms' | 'whatsapp') {
    const phone = type === 'whatsapp' ? this.whatsappTestPhone : this.smsTestPhone;
    const body = type === 'whatsapp' ? this.whatsappTestBody : this.smsTestBody;
    
    if (!phone) {
      this.showStatusModal('Please enter a test phone number first.');
      return;
    }
    if (!body) {
      this.showStatusModal('Please compose a test message first.');
      return;
    }

    this.loader.show();
    setTimeout(() => {
      this.loader.hide();
      this.showStatusModal(`Test ${type.toUpperCase()} message successfully dispatched to ${phone}. Transaction ID: msg91_test_${Math.floor(Math.random()*900000+100000)}.`);
    }, 1200);
  }

  // Helper alerts
  showStatusModal(msg: string) {
    this.statusModalMessage = msg;
    this.statusModalOpen = true;
  }

  closeStatusModal() {
    this.statusModalOpen = false;
  }
}
