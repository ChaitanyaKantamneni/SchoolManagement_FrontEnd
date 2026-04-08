import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { LoaderService } from '../../../Services/loader.service';

@Component({
  selector: 'app-payroll-head',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './payroll-head.component.html',
  styleUrl: './payroll-head.component.css'
})
export class PayrollHeadComponent implements OnInit {
  constructor(private apiurl: ApiServiceService, public loader: LoaderService) {}

  IsAddNewClicked = false;
  isModalOpen = false;
  isViewModalOpen = false;
  searchQuery = '';
  formSubmitAttempted = false;
  private searchTimer: any;
  private readonly SEARCH_DEBOUNCE = 300;
  editHeadId: number | null = null;
  isSubmitting = false;
  AminityInsStatus: any = '';
  viewHead: any = null;
  schoolList: any[] = [];
  academicYearList: any[] = [];
  selectedSchoolID = '';
  selectedAcademicYearID = '';
  currentPage = 1;
  pageSize = 5;
  visiblePageCount = 3;
  headCount = 0;

  form = {
    schoolID: '',
    academicYearID: '',
    payHeadName: '',
    description: '',
    headType: 'Addition',
    isEnabled: true
  };

  headTypes: string[] = ['Addition', 'Deduction'];

  payrollHeads: Array<{
    id: number | null;
    schoolID: string;
    schoolName: string;
    academicYearID: string;
    academicYearName: string;
    payHeadName: string;
    headType: string;
    description: string;
    isEnabled: boolean;
  }> = [];

  get filteredHeads(): typeof this.payrollHeads {
    // Server-side search + pagination is active, so use API list directly.
    return this.payrollHeads;
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
      this.form.schoolID = this.selectedSchoolID;
      this.FetchAcademicYearsList();
    }
    this.fetchPayrollHeads();
  }

  FetchSchoolsList() {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (response: any) => {
        if (response && Array.isArray(response.data)) {
          this.schoolList = response.data.map((item: any) => ({
            ID: item.id,
            Name: item.name
          }));
        } else {
          this.schoolList = [];
        }
      },
      error: () => {
        this.schoolList = [];
      }
    });
  }

  FetchAcademicYearsList(schoolID?: string) {
    const targetSchoolID = schoolID ?? this.selectedSchoolID;
    this.apiurl
      .post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: targetSchoolID || '', Flag: '2' })
      .subscribe({
        next: (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.academicYearList = response.data.map((item: any) => ({
              ID: item.id,
              Name: item.name
            }));
          } else {
            this.academicYearList = [];
          }
        },
        error: () => {
          this.academicYearList = [];
        }
      });
  }

  onSchoolChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedSchoolID = target.value || '';
    this.currentPage = 1;
    this.fetchPayrollHeads();
  };

  onSearchChange(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.currentPage = 1;
      this.fetchPayrollHeads();
    }, this.SEARCH_DEBOUNCE);
  }

  onAdminSchoolChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedFormSchoolID = target.value === '0' ? '' : target.value;
    this.form.schoolID = selectedFormSchoolID;
    this.form.academicYearID = '0';
    this.FetchAcademicYearsList(this.form.schoolID);
  }

  AddNewClicked(): void {
    this.IsAddNewClicked = !this.IsAddNewClicked;
    this.formSubmitAttempted = false;
    if (this.IsAddNewClicked) {
      this.editHeadId = null;
      this.form = {
        schoolID:'0' ,
        academicYearID: '0',
        payHeadName: '',
        description: '',
        headType: 'Addition',
        isEnabled: true
      };
    }
  }

  toggleEnable(): void {
    this.form.isEnabled = !this.form.isEnabled;
  }

  addHead(): void {
    this.formSubmitAttempted = true;
    if (this.isSubmitting) {
      return;
    }
    if (!this.isFormValid()) {
      return;
    }

    this.isSubmitting = true;
    this.loader.show();
    const userIdRaw =
      sessionStorage.getItem('UserID') ||
      sessionStorage.getItem('userID') ||
      sessionStorage.getItem('userid') ||
      '';
    const userId = this.toNumber(userIdRaw);
    const requestPayload: any = {
      ID: this.editHeadId,
      SchoolID: this.toNumber(this.form.schoolID),
      AcademicYear: this.toNumber(this.form.academicYearID),
      PayHeadName: this.form.payHeadName.trim(),
      HeadType: this.form.headType,
      Description: this.form.description.trim(),
      IsActive: this.form.isEnabled ? 1 : 0,
      CreatedBy: this.editHeadId ? null : userId,
      CreatedIp: null,
      ModifiedBy: this.editHeadId ? userId : null,
      ModifiedIp: null,
      Flag: this.editHeadId ? '5' : '1'
    };

    this.apiurl.post<any>('Tbl_PayrollHead_CRUD_Operations', requestPayload).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.loader.hide();
        const wasEdit = this.editHeadId !== null;
        const message = this.extractApiMessage(response).toLowerCase();
        if (message.includes('already exists')) {
          this.AminityInsStatus = 'Payroll head already exists';
          this.isModalOpen = true;
          return;
        }

        this.IsAddNewClicked = false;
        this.editHeadId = null;
        if (this.isAdmin) {
          // After save, list should show all schools by default.
          this.selectedSchoolID = '';
        }
        this.form = {
          schoolID: this.selectedSchoolID,
          academicYearID: this.selectedAcademicYearID,
          payHeadName: '',
          description: '',
          headType: 'Addition',
          isEnabled: true
        };
        this.AminityInsStatus = wasEdit ? 'Payroll head updated successfully!' : 'Payroll head submitted successfully!';
        this.isModalOpen = true;
        this.fetchPayrollHeads();
      },
      error: () => {
        this.isSubmitting = false;
        this.loader.hide();
        this.AminityInsStatus = 'Unable to save payroll head. Please try again.';
        this.isModalOpen = true;
      }
    });
  }

  private isFormValid(): boolean {
    const schoolValid = !this.isAdmin || (!!this.form.schoolID && this.form.schoolID !== '0');
    const yearValid = !!this.form.academicYearID && this.form.academicYearID !== '0';
    const payHeadValid = !!this.form.payHeadName?.trim();
    const typeValid = !!this.form.headType?.trim();
    return schoolValid && yearValid && payHeadValid && typeValid;
  }

  editReview(item: any): void {
    this.editHeadId = this.toNumber(item.id);
    this.form = {
      schoolID: item.schoolID || this.selectedSchoolID,
      academicYearID: item.academicYearID || this.selectedAcademicYearID,
      payHeadName: item.payHeadName,
      description: item.description || '',
      headType: item.headType,
      isEnabled: !!item.isEnabled
    };

    if (this.form.schoolID) {
      this.FetchAcademicYearsList(this.form.schoolID);
    }
    this.IsAddNewClicked = true;
  }

  viewReview(item: any): void {
    this.viewHead = item;
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewHead = null;
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
    this.fetchPayrollHeads();
  }

  private fetchPayrollHeads(): void {
    const isSearch = !!this.searchQuery?.trim();
    const countFlag = isSearch ? '8' : '6';
    const listFlag = isSearch ? '7' : '2';
    const payloadCount: any = {
      Flag: countFlag,
      SchoolID: this.toNumber(this.selectedSchoolID),
      SearchName: isSearch ? this.searchQuery.trim() : null
    };
    const payload: any = {
      Flag: listFlag,
      SchoolID: this.toNumber(this.selectedSchoolID),
      AcademicYear: null,
      SearchName: isSearch ? this.searchQuery.trim() : null,
      Limit: this.pageSize,
      Offset: (this.currentPage - 1) * this.pageSize
    };

    this.loader.show();
    this.apiurl.post<any>('Tbl_PayrollHead_CRUD_Operations', payloadCount).subscribe({
      next: (countResp: any) => {
        const countData = (countResp?.Data || countResp?.data || []) as any[];
        this.headCount = Array.isArray(countData) && countData.length
          ? Number(this.pick(countData[0], ['totalCount', 'totalcount']) || 0)
          : 0;

        this.apiurl.post<any>('Tbl_PayrollHead_CRUD_Operations', payload).subscribe({
          next: (response: any) => {
            const data = (response?.Data || response?.data || []) as any[];
            this.payrollHeads = Array.isArray(data) ? data.map((row) => this.mapPayrollHead(row)) : [];
            this.loader.hide();
          },
          error: () => {
            this.payrollHeads = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.headCount = 0;
        this.payrollHeads = [];
        this.loader.hide();
      }
    });
  }

  private mapPayrollHead(row: any) {
    const schoolId = this.pick(row, ['SchoolID', 'schoolID', 'schoolId', 'SchoolId']);
    const yearId = this.pick(row, ['AcademicYear', 'academicYear', 'AcademicYearID', 'academicYearID']);
    const isActive = this.pick(row, ['IsActive', 'isActive']);
    return {
      id: this.toNumber(this.pick(row, ['ID', 'id'])),
      schoolID: schoolId ? `${schoolId}` : '',
      schoolName: `${this.pick(row, ['SchoolName', 'schoolName']) || sessionStorage.getItem('schoolName') || '-'}`,
      academicYearID: yearId ? `${yearId}` : '',
      academicYearName: `${this.pick(row, ['AcademicYearName', 'academicYearName']) || '-'}`,
      payHeadName: `${this.pick(row, ['PayHeadName', 'payHeadName']) || ''}`,
      headType: `${this.pick(row, ['HeadType', 'headType']) || ''}`,
      description: `${this.pick(row, ['Description', 'description']) || ''}`,
      isEnabled: `${isActive ?? '1'}` === '1'
    };
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

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages()) {
      this.goToPage(this.currentPage + 1);
    }
  }

  goToPage(pageNumber: number): void {
    const total = this.totalPages();
    if (total <= 0) {
      this.currentPage = 1;
      return;
    }
    this.currentPage = Math.max(1, Math.min(pageNumber, total));
    this.fetchPayrollHeads();
  }

  totalPages(): number {
    return Math.ceil(this.headCount / this.pageSize);
  }

  getVisiblePageNumbers(): number[] {
    const totalPages = this.totalPages();
    const pages: number[] = [];
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, totalPages);
    if (end - start < this.visiblePageCount - 1) {
      start = Math.max(end - this.visiblePageCount + 1, 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
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
