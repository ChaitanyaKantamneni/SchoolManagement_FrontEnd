import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { LoaderService } from '../../../Services/loader.service';

@Component({
  selector: 'app-payment-mode',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './payment-mode.component.html',
  styleUrl: './payment-mode.component.css'
})
export class PaymentModeComponent implements OnInit {
  constructor(private apiurl: ApiServiceService, public loader: LoaderService) {}

  IsAddNewClicked = false;
  isModalOpen = false;
  formSubmitAttempted = false;
  isViewModalOpen = false;
  searchQuery = '';
  private searchTimer: any;
  private readonly SEARCH_DEBOUNCE = 300;
  editModeId: number | null = null;
  editIndex: number | null = null;
  isSubmitting = false;
  AminityInsStatus: any = '';
  viewModeItem: any = null;
  schoolList: any[] = [];
  academicYearList: any[] = [];
  selectedSchoolID = '';
  selectedAcademicYearID = '';
  currentPage = 1;
  pageSize = 5;
  visiblePageCount = 3;
  modeCount = 0;

  accountTypes: string[] = ['Personal Account', 'Fees', 'Student', 'Store Sale', 'Staff Salary', 'Staff'];

  form = {
    schoolID: '',
    academicYearID: '',
    paymentModeName: '',
    description: '',
    accountType: '',
    isEnabled: true
  };

  paymentModes: Array<{
    id: number | null;
    paymentMode: string;
    account: string;
    paymentModeName: string;
    accountType: string;
    academicYearID: string;
    academicYearName: string;
    schoolID: string;
    schoolName: string;
    description: string;
    isEnabled: boolean;
  }> = [];

  get filteredModes(): typeof this.paymentModes {
    // Server-side search + pagination is active, so use API list directly.
    return this.paymentModes;
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
    this.fetchPaymentModes();
  }

  FetchSchoolsList() {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (response: any) => {
        this.schoolList = response && Array.isArray(response.data)
          ? response.data.map((item: any) => ({ ID: item.id, Name: item.name }))
          : [];
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
          this.academicYearList = response && Array.isArray(response.data)
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
    const selectedFormSchoolID = target.value === '0' ? '' : target.value;
    this.form.schoolID = selectedFormSchoolID;
    this.form.academicYearID = '0';
    this.FetchAcademicYearsList(this.form.schoolID);
  }

  onSchoolChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedSchoolID = target.value || '';
    this.currentPage = 1;
    this.fetchPaymentModes();
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.currentPage = 1;
      this.fetchPaymentModes();
    }, this.SEARCH_DEBOUNCE);
  }

  AddNewClicked(): void {
    this.IsAddNewClicked = !this.IsAddNewClicked;
    this.formSubmitAttempted = false;
    if (this.IsAddNewClicked) {
      this.editModeId = null;
      this.editIndex = null;
      this.form = {
        schoolID: '0',
        academicYearID: '0',
        paymentModeName: '',
        description: '',
        accountType: '',
        isEnabled: true
      };
    }
  }

  toggleEnable(): void {
    this.form.isEnabled = !this.form.isEnabled;
  }

  addPaymentMode(): void {
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
      ID: this.editModeId,
      SchoolID: this.toNumber(this.form.schoolID),
      AcademicYear: this.toNumber(this.form.academicYearID),
      academicYear: this.toNumber(this.form.academicYearID),
      PaymentMode: this.form.paymentModeName.trim(),
      paymentMode: this.form.paymentModeName.trim(),
      Account: this.form.accountType,
      account: this.form.accountType,
      Description: this.form.description.trim(),
      IsActive: this.form.isEnabled ? 1 : 0,
      CreatedBy: this.editModeId ? null : userId,
      CreatedIp: null,
      ModifiedBy: this.editModeId ? userId : null,
      ModifiedIp: null,
      Flag: this.editModeId ? '5' : '1'
    };

    this.apiurl.post<any>('Tbl_PaymentMode_CRUD_Operations', requestPayload).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.loader.hide();
        const wasEdit = this.editModeId !== null;
        const message = this.extractApiMessage(response).toLowerCase();
        if (message.includes('already exists')) {
          this.AminityInsStatus = 'Payment mode already exists';
          this.isModalOpen = true;
          return;
        }

        this.IsAddNewClicked = false;
        this.editModeId = null;
        this.editIndex = null;
        if (this.isAdmin) {
          this.selectedSchoolID = '';
        }
        this.form = {
          schoolID: this.selectedSchoolID || '0',
          academicYearID: this.selectedAcademicYearID || '0',
          paymentModeName: '',
          description: '',
          accountType: '',
          isEnabled: true
        };
        this.AminityInsStatus = wasEdit ? 'Payment mode updated successfully!' : 'Payment mode submitted successfully!';
        this.isModalOpen = true;
        this.fetchPaymentModes();
      },
      error: () => {
        this.isSubmitting = false;
        this.loader.hide();
        this.AminityInsStatus = 'Unable to save payment mode. Please try again.';
        this.isModalOpen = true;
      }
    });
  }

  private isFormValid(): boolean {
    const schoolValid = !this.isAdmin || (!!this.form.schoolID && this.form.schoolID !== '0');
    const yearValid = !!this.form.academicYearID && this.form.academicYearID !== '0';
    const modeValid = !!this.form.paymentModeName?.trim();
    const accountValid = !!this.form.accountType?.trim();
    return schoolValid && yearValid && modeValid && accountValid;
  }

  editReview(item: any, index?: number): void {
    this.editModeId = this.toNumber(item.id);
    this.editIndex = index ?? null;
    this.form = {
      schoolID: item.schoolID || this.selectedSchoolID,
      academicYearID: item.academicYearID || this.selectedAcademicYearID,
      paymentModeName: item.paymentModeName || item.paymentMode || '',
      description: item.description || '',
      accountType: item.accountType || item.account || '',
      isEnabled: !!item.isEnabled
    };
    if (this.form.schoolID) {
      this.FetchAcademicYearsList(this.form.schoolID);
    }
    this.IsAddNewClicked = true;
  }

  viewReview(item: any): void {
    this.viewModeItem = item;
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewModeItem = null;
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
    this.fetchPaymentModes();
  }

  private fetchPaymentModes(): void {
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
    this.apiurl.post<any>('Tbl_PaymentMode_CRUD_Operations', payloadCount).subscribe({
      next: (countResp: any) => {
        const countData = (countResp?.Data || countResp?.data || []) as any[];
        this.modeCount = Array.isArray(countData) && countData.length
          ? Number(this.pick(countData[0], ['totalCount', 'totalcount']) || 0)
          : 0;

        this.apiurl.post<any>('Tbl_PaymentMode_CRUD_Operations', payload).subscribe({
          next: (response: any) => {
            const data = (response?.Data || response?.data || []) as any[];
            this.paymentModes = Array.isArray(data) ? data.map((row) => this.mapPaymentMode(row)) : [];
            this.loader.hide();
          },
          error: () => {
            this.paymentModes = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.modeCount = 0;
        this.paymentModes = [];
        this.loader.hide();
      }
    });
  }

  private mapPaymentMode(row: any) {
    const schoolId = this.pick(row, ['SchoolID', 'schoolID', 'schoolId', 'SchoolId']);
    const yearId = this.pick(row, ['AcademicYear', 'academicYear', 'AcademicYearID', 'academicYearID']);
    const isActive = this.pick(row, ['IsActive', 'isActive']);
    const paymentMode = `${this.pick(row, ['PaymentMode', 'paymentMode', 'PaymentModeName', 'paymentModeName']) || ''}`;
    const account = `${this.pick(row, ['Account', 'account', 'AccountType', 'accountType']) || ''}`;
    return {
      id: this.toNumber(this.pick(row, ['ID', 'id'])),
      paymentMode,
      account,
      paymentModeName: paymentMode,
      accountType: account,
      academicYearID: yearId ? `${yearId}` : '',
      academicYearName: `${this.pick(row, ['AcademicYearName', 'academicYearName']) || '-'}`,
      schoolID: schoolId ? `${schoolId}` : '',
      schoolName: `${this.pick(row, ['SchoolName', 'schoolName']) || sessionStorage.getItem('schoolName') || '-'}`,
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

  totalPages(): number {
    return Math.ceil(this.modeCount / this.pageSize);
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
    this.fetchPaymentModes();
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
