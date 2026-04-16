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
    lines: Array<{ payHead: string; type: string; amount: number; isAdvance?: boolean }>;
    gross: number;
    deduction: number;
    net: number;
  } | null = null;
  advanceSalaryInfo: Array<{
    id: number;
    amount: number;
    tenureMonths: number;
    advanceDate: string;
    monthlyDeduction: number;
    monthsElapsed: number;
    remainingMonths: number;
    deductionForCurrentMonth: number;
  }> | null = null;
  statusMessage = '';
  isModalOpen = false;
  isSubmitting = false;
  isPageLoading = false;
  formSubmitAttempted = false;
  todayDate: string = '';
  private pendingRequests = 0;
  private payrollHeadTypeById = new Map<string, string>();
  private payrollHeadTypeByName = new Map<string, string>();

  get totalAdvanceDeduction(): number {
    return this.advanceSalaryInfo?.reduce((sum, a) => sum + a.deductionForCurrentMonth, 0) ?? 0;
  }

  get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  ngOnInit(): void {
    this.setTodayDate();

    if (this.isAdmin) {
      this.FetchSchoolsList();
    } else {
      this.selectedSchoolID = this.resolveNonAdminSchoolId();
      this.FetchAcademicYearsList();
      this.FetchPaymentModes();
    }
  }

  setTodayDate() {
  const today = new Date();
  this.todayDate = today.toISOString().split('T')[0];
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
          const data = (response?.Data || response?.data) as any[];
          this.academicYearList = Array.isArray(data)
            ? data
                .map((item: any) => {
                  const id = `${this.pick(item, ['id', 'ID', 'AcademicYearID', 'academicYearId', 'academicYearID']) ?? ''}`.trim();
                  const name = `${this.pick(item, ['name', 'Name', 'AcademicYearName', 'academicYearName']) ?? ''}`.trim();
                  return { ID: id, Name: name || id };
                })
                .filter((row: { ID: string; Name: string }) => !!row.ID)
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
    this.advanceSalaryInfo = null;
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
    this.advanceSalaryInfo = null;
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
          this.fetchAdvanceSalaryForStaff([]);
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

        this.fetchAdvanceSalaryForStaff(lines);
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

  private readonly advanceSalaryEndpoints = [
    'Tbl_AdvanceSalary_CRUD_Operations',
    'Tbl_AdvanceSalary_CRUD_Operation',
    'Proc_Tbl_AdvanceSalary'
  ];

  private fetchAdvanceSalaryForStaff(baseLines: Array<{ payHead: string; type: string; amount: number }>): void {
    const payMonth = this.normalizeToMonthStart(this.form.startDate);
    if (!payMonth || !this.selectedStaffID || !this.selectedSchoolID) {
      this.buildSalaryDetails(baseLines, null);
      return;
    }
    const advPayload = {
      Flag: '9',
      SchoolID: this.toNumber(this.selectedSchoolID),
      StaffID: this.toNumber(this.selectedStaffID),
      PayMonth: payMonth
    };
    console.log('[AdvanceSalary] calling with payload:', advPayload);
    this.startLoading();
    this.tryAdvanceSalaryEndpoints(advPayload, 0, baseLines);
  }

  private tryAdvanceSalaryEndpoints(
    payload: any,
    index: number,
    baseLines: Array<{ payHead: string; type: string; amount: number }>
  ): void {
    if (index >= this.advanceSalaryEndpoints.length) {
      this.stopLoading();
      this.advanceSalaryInfo = null;
      this.buildSalaryDetails(baseLines, null);
      return;
    }
    this.apiurl.post<any>(this.advanceSalaryEndpoints[index], payload).subscribe({
      next: (response: any) => {
        this.stopLoading();
        console.log('[AdvanceSalary] endpoint:', this.advanceSalaryEndpoints[index], '| response:', response);
        const data = (response?.Data || response?.data || []) as any[];
        const activeRows = Array.isArray(data)
          ? data.filter((r: any) => Number(r?.deductionForCurrentMonth ?? r?.DeductionForCurrentMonth ?? 0) > 0)
          : [];
        if (activeRows.length > 0) {
          this.advanceSalaryInfo = activeRows.map((row: any) => ({
            id: Number(row?.id ?? row?.ID ?? 0),
            amount: Number(row?.amount ?? row?.Amount ?? 0),
            tenureMonths: Number(row?.tenureMonths ?? row?.TenureMonths ?? 0),
            advanceDate: `${row?.advanceDate ?? row?.AdvanceDate ?? ''}`,
            monthlyDeduction: Number(row?.monthlyDeduction ?? row?.MonthlyDeduction ?? 0),
            monthsElapsed: Number(row?.monthsElapsed ?? row?.MonthsElapsed ?? 0),
            remainingMonths: Number(row?.remainingMonths ?? row?.RemainingMonths ?? 0),
            deductionForCurrentMonth: Number(row?.deductionForCurrentMonth ?? row?.DeductionForCurrentMonth ?? 0)
          }));
        } else {
          this.advanceSalaryInfo = null;
        }
        this.buildSalaryDetails(baseLines, this.advanceSalaryInfo);
      },
      error: (err: any) => {
        console.log('[AdvanceSalary] error from endpoint:', this.advanceSalaryEndpoints[index], '| status:', err?.status, '| err:', err);
        if (err?.status === 404) {
          this.tryAdvanceSalaryEndpoints(payload, index + 1, baseLines);
        } else {
          this.stopLoading();
          this.advanceSalaryInfo = null;
          this.buildSalaryDetails(baseLines, null);
        }
      }
    });
  }

  private buildSalaryDetails(
    baseLines: Array<{ payHead: string; type: string; amount: number }>,
    advance: typeof this.advanceSalaryInfo
  ): void {
    const lines: Array<{ payHead: string; type: string; amount: number; isAdvance?: boolean }> = [...baseLines];
    if (advance && advance.length > 0) {
      advance.forEach((adv, i) => {
        lines.push({
          payHead: advance.length > 1 ? `Advance Recovery #${i + 1}` : 'Advance Salary Recovery',
          type: 'Deduction',
          isAdvance: true,
          amount: adv.deductionForCurrentMonth
        });
      });
    }
    const gross = lines.filter((x) => x.type === 'Addition').reduce((sum, x) => sum + x.amount, 0);
    const deduction = lines.filter((x) => x.type === 'Deduction').reduce((sum, x) => sum + x.amount, 0);
    const net = gross - deduction;
    this.salaryDetails = { lines, gross, deduction, net };
    this.statusMessage = lines.length ? '' : 'No enabled pay heads found in salary settings.';
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

  /** Same key order as legacy pages; also checks localStorage (e.g. leave modules). */
  private readStoredSchoolIdFromBrowserStorage(): string {
    const keys = ['SchoolID', 'schoolID', 'schoolId'] as const;
    for (const key of keys) {
      const v = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (v?.trim()) {
        return v.trim();
      }
    }
    return '';
  }

  /**
   * OTP login currently persists tokens + schoolName but not always school id in storage.
   * Read common claim names from JWT payload when storage has no school id.
   */
  private tryReadSchoolIdFromAccessToken(): string {
    const token =
      sessionStorage.getItem('accessToken') ||
      localStorage.getItem('accessToken') ||
      '';
    const parts = token.split('.');
    if (parts.length < 2) {
      return '';
    }
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded));
      const raw = this.pick(payload, ['SchoolID', 'schoolID', 'schoolId', 'SchoolId']);
      if (raw === undefined || raw === null) {
        return '';
      }
      const s = `${raw}`.trim();
      return s;
    } catch {
      return '';
    }
  }

  private resolveNonAdminSchoolId(): string {
    return this.readStoredSchoolIdFromBrowserStorage() || this.tryReadSchoolIdFromAccessToken();
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
