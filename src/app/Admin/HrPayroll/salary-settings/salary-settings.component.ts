import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { LoaderService } from '../../../Services/loader.service';

type SalaryHeadLine = {
  payHeadId: number | null;
  payHead: string;
  enabled: boolean;
  amount: number | null;
};

@Component({
  selector: 'app-salary-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './salary-settings.component.html',
  styleUrl: './salary-settings.component.css'
})
export class SalarySettingsComponent implements OnInit {
  constructor(private apiurl: ApiServiceService, public loader: LoaderService) {}

  IsAddNewClicked = false;
  isModalOpen = false;
  isViewModalOpen = false;
  formSubmitAttempted = false;
  isSubmitting = false;
  private searchTimer: any;
  private readonly SEARCH_DEBOUNCE = 300;
  private pendingEditPayHeadJson = '';
  statusMessage = '';
  searchQuery = '';
  editModeId: number | null = null;
  viewRow: any = null;
  viewPayHeads: Array<{ isEnabled: boolean; payHead: string; amount: number }> = [];
  schoolList: any[] = [];
  academicYearList: any[] = [];
  staffList: Array<{ ID: string; Name: string }> = [];
  selectedListSchoolID = '';
  selectedSchoolID = '';
  selectedAcademicYearID = '';
  selectedStaffID = '';

  salarySettings: Array<{
    id: number | null;
    schoolID: string;
    schoolName: string;
    academicYearID: string;
    academicYearName: string;
    staffID: string;
    staffName: string;
    payHeadJson: string;
    headsCount: number;
    isEnabled: boolean;
    description: string;
  }> = [];

  salaryHeads: SalaryHeadLine[] = [];

  get filteredSaved(): typeof this.salarySettings {
    return this.salarySettings;
  }

  AddNewClicked(): void {
    this.IsAddNewClicked = !this.IsAddNewClicked;
    this.formSubmitAttempted = false;
    if (this.IsAddNewClicked) {
      this.editModeId = null;
      this.pendingEditPayHeadJson = '';
      this.selectedStaffID = '';
      this.salaryHeads = [];
      if (this.selectedAcademicYearID) {
        this.FetchStaffList();
        this.FetchPayrollHeadsForSelection();
      } else {
        this.salaryHeads = [];
      }
    }
  }

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
      this.selectedListSchoolID = this.selectedSchoolID;
      this.FetchAcademicYearsList();
      this.FetchStaffList();
    }
    this.fetchSalarySettings();
  }

  FetchSchoolsList() {
    this.loader.show();
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (response: any) => {
        this.schoolList = Array.isArray(response?.data)
          ? response.data.map((item: any) => ({ ID: item.id, Name: item.name }))
          : [];
        this.loader.hide();
      },
      error: () => {
        this.schoolList = [];
        this.loader.hide();
      }
    });
  }

  FetchAcademicYearsList() {
    this.loader.show();
    this.apiurl
      .post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: this.selectedSchoolID || '', Flag: '2' })
      .subscribe({
        next: (response: any) => {
          this.academicYearList = Array.isArray(response?.data)
            ? response.data.map((item: any) => ({ ID: item.id, Name: item.name }))
            : [];
          if (!this.selectedAcademicYearID && this.academicYearList.length === 1) {
            this.selectedAcademicYearID = `${this.academicYearList[0].ID}`;
          }
          this.loader.hide();
        },
        error: () => {
          this.academicYearList = [];
          this.loader.hide();
        }
      });
  }

  FetchStaffList() {
    const payload: any = {
      Flag: '9',
      SchoolID: this.selectedSchoolID || '',
      AcademicYear: this.selectedAcademicYearID || ''
    };
    this.loader.show();
    this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        const data = (response?.Data || response?.data || []) as any[];
        this.staffList = Array.isArray(data)
          ? data.map((item: any) => ({
              ID: `${this.pick(item, ['ID', 'id', 'StaffID', 'staffID', 'staffId']) ?? ''}`,
              Name: this.getStaffDisplayName(item)
            })).filter((s: any) => !!s.ID && !!s.Name)
          : [];
        if (!this.staffList.some((s) => s.ID === this.selectedStaffID)) {
          this.selectedStaffID = '';
        }
        this.loader.hide();
      },
      error: () => {
        this.staffList = [];
        this.loader.hide();
      }
    });
  }

  FetchPayrollHeadsForSelection() {
    const payload: any = {
      Flag: '3',
      SchoolID: this.toNumber(this.selectedSchoolID),
      AcademicYear: this.toNumber(this.selectedAcademicYearID),
      Limit: 500,
      Offset: 0
    };
    this.loader.show();
    this.apiurl.post<any>('Tbl_PayrollHead_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        const data = (response?.Data || response?.data || []) as any[];
        const existing = new Map(
          this.salaryHeads.map((h) => [h.payHeadId ? `${h.payHeadId}` : `${h.payHead}`, h])
        );
        this.salaryHeads = Array.isArray(data)
          ? data.map((row: any) => {
              const payHeadId = this.toNumber(this.pick(row, ['ID', 'id']));
              const payHead = `${this.pick(row, ['PayHeadName', 'payHeadName']) || ''}`;
              const key = payHeadId ? `${payHeadId}` : payHead;
              const oldLine = existing.get(key);
              return {
                payHeadId,
                payHead,
                enabled: oldLine ? oldLine.enabled : true,
                amount: oldLine ? oldLine.amount : 0
              };
            })
          : [];
        if (this.pendingEditPayHeadJson) {
          this.applyPayHeadValues(this.pendingEditPayHeadJson);
          this.pendingEditPayHeadJson = '';
        }
        this.loader.hide();
      },
      error: () => {
        this.salaryHeads = [];
        this.loader.hide();
      }
    });
  }

  onAdminSchoolChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedSchoolID = target.value === '0' ? '' : target.value;
    this.selectedAcademicYearID = '';
    this.selectedStaffID = '';
    this.salaryHeads = [];
    this.FetchAcademicYearsList();
    this.fetchSalarySettings();
  }

  onAcademicYearChange() {
    this.selectedStaffID = '';
    this.salaryHeads = [];
    if (!this.selectedAcademicYearID) {
      this.staffList = [];
      return;
    }
    this.FetchStaffList();
    this.FetchPayrollHeadsForSelection();
    this.fetchSalarySettings();
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.fetchSalarySettings();
    }, this.SEARCH_DEBOUNCE);
  }

  onSchoolFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedListSchoolID = target.value || '';
    this.fetchSalarySettings();
  }

  saveSettings(): void {
    this.formSubmitAttempted = true;
    if (this.isSubmitting) {
      return;
    }
    if (!this.isFormValid()) {
      return;
    }

    const userIdRaw =
      sessionStorage.getItem('UserID') ||
      sessionStorage.getItem('userID') ||
      sessionStorage.getItem('userid') ||
      '';
    const userId = this.toNumber(userIdRaw);

    const lines = this.salaryHeads.map((line) => ({
      PayHeadID: line.payHeadId,
      PayHeadName: line.payHead,
      Amount: line.enabled ? Number(line.amount ?? 0) : 0,
      IsEnabled: line.enabled ? 1 : 0
    }));

    const schoolId = this.toNumber(this.selectedSchoolID);
    const academicYearId = this.toNumber(this.selectedAcademicYearID);
    const staffId = this.toNumber(this.selectedStaffID);
    const payHeadJson = JSON.stringify(lines);

    const payload: any = {
      ID: this.editModeId,
      SchoolID: schoolId,
      schoolID: schoolId,
      AcademicYear: academicYearId,
      academicYear: academicYearId,
      AcademicYearID: academicYearId,
      StaffID: staffId,
      staffID: staffId,
      Staff: staffId,
      PayHeadJson: payHeadJson,
      payHeadJson: payHeadJson,
      DetailsJson: payHeadJson,
      detailsJson: payHeadJson,
      Description: null,
      IsActive: 1,
      CreatedBy: this.editModeId ? null : userId,
      CreatedIp: null,
      CreatedIP: null,
      ModifiedBy: this.editModeId ? userId : null,
      ModifiedIp: null,
      ModifiedIP: null,
      Flag: this.editModeId ? '5' : '1'
    };

    this.isSubmitting = true;
    this.loader.show();
    this.apiurl.post<any>('Tbl_SalarySettings_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.loader.hide();
        const message = this.extractApiMessage(response).toLowerCase();
        if (message.includes('already exists')) {
          this.statusMessage = 'Salary setting already exists for this staff';
          this.isModalOpen = true;
          return;
        }
        this.statusMessage = this.editModeId ? 'Salary setting updated successfully!' : 'Salary setting submitted successfully!';
        this.isModalOpen = true;
        this.IsAddNewClicked = false;
        this.editModeId = null;
        this.formSubmitAttempted = false;
        this.fetchSalarySettings();
      },
      error: (error: any) => {
        this.isSubmitting = false;
        this.loader.hide();
        const apiMessage =
          error?.error?.Message ||
          error?.error?.message ||
          error?.error?.title ||
          error?.message ||
          '';
        this.statusMessage = apiMessage
          ? `Unable to save salary setting. ${apiMessage}`
          : 'Unable to save salary setting. Please try again.';
        this.isModalOpen = true;
      }
    });
  }

  onLineEnabledChange(line: SalaryHeadLine): void {
    if (!line.enabled) {
      line.amount = 0;
    } else if (line.amount === null) {
      line.amount = 0;
    }
  }

  editReview(row: any): void {
    this.editModeId = this.toNumber(row.id);
    this.selectedSchoolID = row.schoolID || this.selectedSchoolID;
    this.selectedAcademicYearID = row.academicYearID || this.selectedAcademicYearID;
    this.selectedStaffID = row.staffID || '';
    this.FetchAcademicYearsList();
    this.FetchStaffList();
    this.pendingEditPayHeadJson = row.payHeadJson || '';
    this.FetchPayrollHeadsForSelection();
    this.IsAddNewClicked = true;
  }

  viewReview(row: any): void {
    this.viewRow = row;
    const parsed = this.parsePayHeads(row?.payHeadJson || '[]');
    this.viewPayHeads = parsed.map((item: any) => ({
      isEnabled: `${item?.IsEnabled ?? 0}` === '1',
      payHead: `${item?.PayHeadName ?? '-'}`,
      amount: Number(item?.Amount ?? 0)
    }));
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewRow = null;
    this.viewPayHeads = [];
  }

  closeModal(type: 'view' | 'status') {
    if (type === 'view') {
      this.closeViewModal();
    }
    if (type === 'status') {
      this.isModalOpen = false;
    }
  }

  handleOk() {
    this.isModalOpen = false;
    this.fetchSalarySettings();
  }

  private isFormValid(): boolean {
    const schoolValid = !this.isAdmin || !!this.selectedSchoolID;
    const yearValid = !!this.selectedAcademicYearID;
    const staffValid = !!this.selectedStaffID;
    const hasLines = this.salaryHeads.length > 0;
    return schoolValid && yearValid && staffValid && hasLines;
  }

  private fetchSalarySettings() {
    const isSearch = !!this.searchQuery?.trim();
    const schoolFilter = this.isAdmin ? this.selectedListSchoolID : this.selectedSchoolID;
    const payload: any = {
      Flag: isSearch ? '7' : '2',
      SchoolID: this.toNumber(schoolFilter),
      AcademicYear: null,
      SearchName: isSearch ? this.searchQuery.trim() : null,
      Limit: 100,
      Offset: 0
    };
    this.loader.show();
    this.apiurl.post<any>('Tbl_SalarySettings_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        const data = (response?.Data || response?.data || []) as any[];
        this.salarySettings = Array.isArray(data)
          ? data.map((row: any) => this.mapSalarySetting(row))
          : [];
        this.loader.hide();
      },
      error: () => {
        this.salarySettings = [];
        this.loader.hide();
      }
    });
  }

  private mapSalarySetting(row: any) {
    const schoolId = this.pick(row, ['SchoolID', 'schoolID', 'schoolId']);
    const yearId = this.pick(row, ['AcademicYear', 'academicYear']);
    const staffId = this.pick(row, ['StaffID', 'staffID', 'staffId']);
    const isActive = this.pick(row, ['IsActive', 'isActive']);
    const payHeadJson = `${this.pick(row, ['PayHeadJson', 'payHeadJson']) || '[]'}`;
    const parsed = this.parsePayHeads(payHeadJson);
    const headsCount = parsed.filter((p: any) => `${p?.IsEnabled ?? 0}` === '1').length;
    return {
      id: this.toNumber(this.pick(row, ['ID', 'id'])),
      schoolID: schoolId ? `${schoolId}` : '',
      schoolName: `${this.pick(row, ['SchoolName', 'schoolName']) || '-'}`,
      academicYearID: yearId ? `${yearId}` : '',
      academicYearName: `${this.pick(row, ['AcademicYearName', 'academicYearName']) || '-'}`,
      staffID: staffId ? `${staffId}` : '',
      staffName: `${this.pick(row, ['StaffName', 'staffName', 'Name', 'name']) || ''}`,
      payHeadJson,
      headsCount,
      isEnabled: `${isActive ?? '1'}` === '1',
      description: `${this.pick(row, ['Description', 'description']) || ''}`
    };
  }

  private parsePayHeads(raw: any): any[] {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private applyPayHeadValues(payHeadJson: string): void {
    const parsed = this.parsePayHeads(payHeadJson);
    if (!parsed.length) {
      return;
    }
    const byId = new Map(parsed.map((x: any) => [`${x.PayHeadID ?? ''}`, x]));
    const byName = new Map(parsed.map((x: any) => [`${x.PayHeadName ?? ''}`, x]));
    this.salaryHeads = this.salaryHeads.map((line) => {
      const matchById = line.payHeadId ? byId.get(`${line.payHeadId}`) : null;
      const matchByName = byName.get(line.payHead);
      const match = matchById || matchByName;
      return {
        ...line,
        enabled: `${match?.IsEnabled ?? 0}` === '1',
        amount: match ? Number(match.Amount ?? 0) : 0
      };
    });
  }

  private pick(obj: any, keys: string[]): any {
    for (const key of keys) {
      if (obj && obj[key] !== undefined && obj[key] !== null) {
        return obj[key];
      }
    }
    return null;
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

  private toNumber(value: any): number | null {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
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
}
