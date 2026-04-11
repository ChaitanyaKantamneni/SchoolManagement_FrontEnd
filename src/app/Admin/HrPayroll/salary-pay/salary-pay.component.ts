import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { LoaderService } from '../../../Services/loader.service';

@Component({
  selector: 'app-salary-pay',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './salary-pay.component.html',
  styleUrl: './salary-pay.component.css'
})
export class SalaryPayComponent implements OnInit {
  constructor(private apiurl: ApiServiceService, public loader: LoaderService) {}

  staffList: Array<{ ID: string; Name: string }> = [];
  paymentModes: Array<{ Name: string }> = [];
  schoolList: any[] = [];
  academicYearList: any[] = [];
  selectedSchoolID = '';
  selectedAcademicYearID = '';
  selectedStaffID = '';

  form = {
    paymentMode: '',
    startDate: '',
    endDate: '',
    referenceNo: ''
  };

  salaryDetails: {
    lines: Array<{ payHead: string; type: string; amount: number }>;
    gross: number;
    deduction: number;
    net: number;
  } | null = null;
  statusMessage = '';
  isModalOpen = false;
  isSubmitting = false;
  isPageLoading = false;
  formSubmitAttempted = false;
  private pendingRequests = 0;
  private payrollHeadTypeById = new Map<string, string>();
  private payrollHeadTypeByName = new Map<string, string>();

  get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  ngOnInit(): void {
    if (this.isAdmin) {
      this.FetchSchoolsList();
    } else {
      this.selectedSchoolID =
        sessionStorage.getItem('SchoolID') ||
        sessionStorage.getItem('schoolID') ||
        sessionStorage.getItem('schoolId') ||
        '';
      this.FetchAcademicYearsList();
      this.FetchPaymentModes();
    }
  }

  FetchSchoolsList() {
    this.startLoading();
    this.apiurl
      .post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' })
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
      next: (response: any) => {
        this.schoolList = Array.isArray(response?.data)
          ? response.data.map((item: any) => ({ ID: item.id, Name: item.name }))
          : [];
      },
      error: () => {
        this.schoolList = [];
      }
      });
  }

  FetchAcademicYearsList() {
    if (!this.selectedSchoolID) {
      this.academicYearList = [];
      return;
    }
    this.startLoading();
    this.apiurl
      .post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: this.selectedSchoolID || '', Flag: '2' })
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
        next: (response: any) => {
          this.academicYearList = Array.isArray(response?.data)
            ? response.data.map((item: any) => ({ ID: item.id, Name: item.name }))
            : [];
        },
        error: () => {
          this.academicYearList = [];
        }
      });
  }

  onAdminSchoolChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedSchoolID = target.value === '0' ? '' : target.value;
    this.selectedAcademicYearID = '';
    this.selectedStaffID = '';
    this.form.paymentMode = '';
    this.form.startDate = '';
    this.form.endDate = '';
    this.form.referenceNo = '';
    this.staffList = [];
    this.paymentModes = [];
    this.salaryDetails = null;
    this.statusMessage = '';
    this.FetchAcademicYearsList();
    this.FetchPaymentModes();
  }

  onAcademicYearChange(): void {
    this.selectedStaffID = '';
    this.form.paymentMode = '';
    this.form.startDate = '';
    this.form.endDate = '';
    this.form.referenceNo = '';
    this.salaryDetails = null;
    this.statusMessage = '';
    if (!this.selectedAcademicYearID) {
      this.staffList = [];
      this.payrollHeadTypeById.clear();
      this.payrollHeadTypeByName.clear();
      return;
    }
    this.FetchStaffList();
    this.FetchPayrollHeadTypes();
  }

  onStaffChange(): void {
    this.form.paymentMode = '';
    this.form.startDate = '';
    this.form.endDate = '';
    this.form.referenceNo = '';
    this.salaryDetails = null;
    this.statusMessage = '';
  }

  onPaymentModeChange(): void {
    this.form.startDate = '';
    this.form.endDate = '';
    this.form.referenceNo = '';
    this.salaryDetails = null;
    this.statusMessage = '';
    if (!this.isReferenceNoRequired()) {
      this.form.referenceNo = '';
    }
  }

  onStartDateChange(): void {
    this.form.endDate = '';
    this.form.referenceNo = '';
    this.salaryDetails = null;
    this.statusMessage = '';
  }

  onEndDateChange(): void {
    this.form.referenceNo = '';
    this.salaryDetails = null;
    this.statusMessage = '';
  }

  FetchStaffList() {
    if (!this.selectedSchoolID || !this.selectedAcademicYearID) {
      this.staffList = [];
      return;
    }
    const payload: any = {
      Flag: '9',
      SchoolID: this.selectedSchoolID || '',
      AcademicYear: this.selectedAcademicYearID || ''
    };
    this.startLoading();
    this.apiurl
      .post<any>('Tbl_Staff_CRUD_Operations', payload)
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
      next: (response: any) => {
        const data = (response?.Data || response?.data || []) as any[];
        this.staffList = Array.isArray(data)
          ? data
              .map((item: any) => ({
                ID: `${this.pick(item, ['ID', 'id', 'StaffID', 'staffID', 'staffId']) ?? ''}`,
                Name: this.getStaffDisplayName(item)
              }))
              .filter((s: any) => !!s.ID && !!s.Name)
          : [];
      },
      error: () => {
        this.staffList = [];
      }
      });
  }

  FetchPaymentModes(): void {
    if (!this.selectedSchoolID) {
      this.paymentModes = [];
      return;
    }
    const payload: any = {
      Flag: '2',
      SchoolID: this.toNumber(this.selectedSchoolID),
      AcademicYear: null,
      Limit: 500,
      Offset: 0
    };
    this.startLoading();
    this.apiurl
      .post<any>('Tbl_PaymentMode_CRUD_Operations', payload)
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
      next: (response: any) => {
        const data = (response?.Data || response?.data || []) as any[];
        this.paymentModes = Array.isArray(data)
          ? data
              .map((row: any) => ({
                Name: `${this.pick(row, ['PaymentMode', 'paymentMode', 'PaymentModeName', 'paymentModeName']) || ''}`.trim()
              }))
              .filter((m: any) => !!m.Name)
          : [];
      },
      error: () => {
        this.paymentModes = [];
      }
      });
  }

  FetchPayrollHeadTypes(): void {
    if (!this.selectedSchoolID || !this.selectedAcademicYearID) {
      this.payrollHeadTypeById.clear();
      this.payrollHeadTypeByName.clear();
      return;
    }
    const payload: any = {
      Flag: '2',
      SchoolID: this.toNumber(this.selectedSchoolID),
      AcademicYear: this.toNumber(this.selectedAcademicYearID),
      Limit: 500,
      Offset: 0
    };
    this.startLoading();
    this.apiurl
      .post<any>('Tbl_PayrollHead_CRUD_Operations', payload)
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
      next: (response: any) => {
        this.payrollHeadTypeById.clear();
        this.payrollHeadTypeByName.clear();
        const data = (response?.Data || response?.data || []) as any[];
        if (!Array.isArray(data)) {
          return;
        }
        for (const row of data) {
          const id = `${this.pick(row, ['ID', 'id']) ?? ''}`.trim();
          const name = `${this.pick(row, ['PayHeadName', 'payHeadName']) ?? ''}`.trim().toLowerCase();
          const rawType = `${this.pick(row, ['HeadType', 'headType']) || ''}`.toLowerCase();
          const type = rawType.includes('deduct') ? 'Deduction' : 'Addition';
          if (id) {
            this.payrollHeadTypeById.set(id, type);
          }
          if (name) {
            this.payrollHeadTypeByName.set(name, type);
          }
        }
      },
      error: () => {
        this.payrollHeadTypeById.clear();
        this.payrollHeadTypeByName.clear();
      }
      });
  }

  getSalaryDetails(): void {
    this.formSubmitAttempted = true;
    if (!this.validateMandatoryFields()) {
      this.salaryDetails = null;
      return;
    }

    if ((this.isAdmin && !this.selectedSchoolID) || !this.selectedAcademicYearID) {
      this.salaryDetails = null;
      return;
    }
    if (
      !this.selectedStaffID ||
      !this.form.paymentMode ||
      !this.form.startDate ||
      !this.form.endDate
    ) {
      this.salaryDetails = null;
      return;
    }
    if (this.isReferenceNoRequired() && !this.form.referenceNo?.trim()) {
      this.salaryDetails = null;
      this.statusMessage = 'Reference No is required for non-cash payment modes.';
      return;
    }

    const payload: any = {
      Flag: '2',
      SchoolID: this.toNumber(this.selectedSchoolID),
      AcademicYear: this.toNumber(this.selectedAcademicYearID),
      Limit: 500,
      Offset: 0
    };

    this.startLoading();
    this.apiurl
      .post<any>('Tbl_SalarySettings_CRUD_Operations', payload)
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
      next: (response: any) => {
        const data = (response?.Data || response?.data || []) as any[];
        const match = Array.isArray(data)
          ? data.find((row: any) => `${this.pick(row, ['StaffID', 'staffID', 'staffId']) || ''}` === `${this.selectedStaffID}`)
          : null;

        if (!match) {
          this.salaryDetails = null;
          this.statusMessage = 'Salary settings not found for selected staff.';
          return;
        }

        const parsedHeads = this.parsePayHeads(this.pick(match, ['PayHeadJson', 'payHeadJson']) || '[]');
        const lines = parsedHeads
          .filter((h: any) => `${h?.IsEnabled ?? 0}` === '1')
          .map((h: any) => {
            const type = this.resolveHeadType(h);
            return {
              payHead: `${h?.PayHeadName || '-'}`,
              type,
              amount: Number(h?.Amount ?? 0)
            };
          });

        const gross = lines.filter((x) => x.type === 'Addition').reduce((sum, x) => sum + x.amount, 0);
        const deduction = lines.filter((x) => x.type === 'Deduction').reduce((sum, x) => sum + x.amount, 0);
        const net = gross - deduction;

        this.salaryDetails = { lines, gross, deduction, net };
        this.statusMessage = lines.length ? '' : 'No enabled pay heads found in salary settings.';
      },
      error: () => {
        this.salaryDetails = null;
        this.statusMessage = 'Unable to fetch salary details. Please try again.';
      }
      });
  }

  paySalary(): void {
    this.formSubmitAttempted = true;
    if (!this.validateMandatoryFields()) {
      this.isModalOpen = true;
      return;
    }
    if (!this.salaryDetails || this.isSubmitting) return;
    if (this.isReferenceNoRequired() && !this.form.referenceNo?.trim()) {
      this.statusMessage = 'Reference No is required for non-cash payment modes.';
      this.isModalOpen = true;
      return;
    }

    const userIdRaw =
      sessionStorage.getItem('UserID') ||
      sessionStorage.getItem('userID') ||
      sessionStorage.getItem('userid') ||
      '';
    const userId = this.toNumber(userIdRaw);

    const payload: any = {
      ID: null,
      SchoolID: this.toNumber(this.selectedSchoolID),
      AcademicYear: this.toNumber(this.selectedAcademicYearID),
      StaffID: this.toNumber(this.selectedStaffID),
      PayMonth: this.normalizeToMonthStart(this.form.startDate),
      PaymentMode: this.form.paymentMode || null,
      ReferenceNo: this.form.referenceNo?.trim() || null,
      PayHeadJson: JSON.stringify(
        this.salaryDetails.lines.map((x) => ({
          PayHeadName: x.payHead,
          HeadType: x.type,
          Amount: x.amount
        }))
      ),
      GrossAmount: this.salaryDetails.gross,
      DeductionAmount: this.salaryDetails.deduction,
      NetAmount: this.salaryDetails.net,
      Description: this.form.endDate
        ? `Salary period: ${this.form.startDate} to ${this.form.endDate}`
        : `Salary period: ${this.form.startDate}`,
      IsActive: 1,
      CreatedBy: userId,
      CreatedIp: null,
      ModifiedBy: null,
      ModifiedIp: null,
      Flag: '1'
    };

    this.isSubmitting = true;
    this.startLoading();
    this.apiurl
      .post<any>('Tbl_SalaryPay_CRUD_Operations', payload)
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        const message = this.extractApiMessage(response).toLowerCase();
        if (message.includes('already paid')) {
          this.statusMessage = 'Salary already paid for this staff and month.';
          this.isModalOpen = true;
          return;
        }
        this.statusMessage = 'Salary paid successfully.';
        this.isModalOpen = true;
        this.formSubmitAttempted = false;
      },
      error: (error: any) => {
        this.isSubmitting = false;
        const apiMessage =
          error?.error?.Message ||
          error?.error?.message ||
          error?.error?.title ||
          error?.message ||
          '';
        this.statusMessage = apiMessage
          ? `Unable to pay salary. ${apiMessage}`
          : 'Unable to pay salary. Please try again.';
        this.isModalOpen = true;
      }
      });
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  private parsePayHeads(raw: any): any[] {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private pick(obj: any, keys: string[]): any {
    for (const key of keys) {
      if (obj && obj[key] !== undefined && obj[key] !== null) {
        return obj[key];
      }
    }
    return null;
  }

  private toNumber(value: any): number | null {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private getStaffDisplayName(item: any): string {
    const directName = `${this.pick(item, ['Name', 'name', 'StaffName', 'staffName']) || ''}`.trim();
    if (directName) {
      return directName;
    }
    const first = `${this.pick(item, ['FirstName', 'firstName']) || ''}`.trim();
    const middle = `${this.pick(item, ['MiddleName', 'middleName']) || ''}`.trim();
    const last = `${this.pick(item, ['LastName', 'lastName']) || ''}`.trim();
    return [first, middle, last].filter(Boolean).join(' ').trim();
  }

  private extractApiMessage(response: any): string {
    const rootMessage = response?.Message || response?.message;
    if (rootMessage) {
      return `${rootMessage}`;
    }
    const list = response?.Data || response?.data;
    if (Array.isArray(list) && list.length) {
      const rowMessage = list[0]?.Status || list[0]?.status || list[0]?.Message || list[0]?.message;
      if (rowMessage) {
        return `${rowMessage}`;
      }
    }
    return '';
  }

  isReferenceNoRequired(): boolean {
    const mode = (this.form.paymentMode || '').trim().toLowerCase();
    return !!mode && mode !== 'cash';
  }

  private validateMandatoryFields(): boolean {
    const schoolValid = !this.isAdmin || !!this.selectedSchoolID;
    const yearValid = !!this.selectedAcademicYearID;
    const staffValid = !!this.selectedStaffID;
    const paymentValid = !!this.form.paymentMode;
    const startDateValid = !!this.form.startDate;
    const endDateValid = !!this.form.endDate;

    const ok = schoolValid && yearValid && staffValid && paymentValid && startDateValid && endDateValid;
    if (!ok) {
      this.statusMessage = 'Please fill all mandatory fields.';
    }
    return ok;
  }

  private normalizeToMonthStart(dateText: string): string | null {
    if (!dateText) return null;
    const parts = dateText.split('-');
    if (parts.length !== 3) return null;
    const [year, month] = parts;
    if (!year || !month) return null;
    return `${year}-${month}-01`;
  }

  private resolveHeadType(payHeadRow: any): string {
    const directType = `${payHeadRow?.HeadType || payHeadRow?.Type || ''}`.toLowerCase().trim();
    if (directType) {
      return directType.includes('deduct') ? 'Deduction' : 'Addition';
    }
    const id = `${payHeadRow?.PayHeadID ?? ''}`.trim();
    if (id && this.payrollHeadTypeById.has(id)) {
      return this.payrollHeadTypeById.get(id) || 'Addition';
    }
    const name = `${payHeadRow?.PayHeadName ?? ''}`.trim().toLowerCase();
    if (name && this.payrollHeadTypeByName.has(name)) {
      return this.payrollHeadTypeByName.get(name) || 'Addition';
    }
    return 'Addition';
  }

  private startLoading(): void {
    this.pendingRequests += 1;
    if (this.pendingRequests === 1) {
      this.isPageLoading = true;
      this.loader.show();
    }
  }

  private stopLoading(): void {
    if (this.pendingRequests > 0) {
      this.pendingRequests -= 1;
    }
    if (this.pendingRequests === 0) {
      this.isPageLoading = false;
      this.loader.hide();
    }
  }
}
