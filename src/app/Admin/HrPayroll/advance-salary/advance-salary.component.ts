import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { LoaderService } from '../../../Services/loader.service';

@Component({
  selector: 'app-advance-salary',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './advance-salary.component.html',
  styleUrl: './advance-salary.component.css'
})
/**
 * Class Responsibility: Handles view logic and user interactions for AdvanceSalaryComponent.
 */
export class AdvanceSalaryComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Advance Salary';

  constructor(
    private apiurl: ApiServiceService,
    public loader: LoaderService,
    router: Router,
    menuService: MenuServiceService
  ) {
    super(menuService, router);
  }
  private readonly advanceSalaryEndpoints = [
    'Tbl_AdvanceSalary_CRUD_Operations',
    'Tbl_AdvanceSalary_CRUD_Operation',
    'Proc_Tbl_AdvanceSalary'
  ];

  IsAddNewClicked = false;
  isModalOpen = false;
  isViewModalOpen = false;
  statusMessage = '';
  isSubmitting = false;
  searchQuery = '';
  editIndex: number | null = null;
  viewRow: any = null;
  schoolList: any[] = [];
  academicYearList: any[] = [];
  selectedSchoolID = '';
  selectedAcademicYearID = '';
  formSubmitAttempted = false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount = 3;

  staffList: Array<{ ID: string; Name: string }> = [];

  form = {
    staffID: '',
    amount: null as number | null,
    date: '',
    tenure: ''
  };

  records: Array<{
    id: number;
    schoolID: string;
    schoolName: string;
    academicYearID: string;
    academicYearName: string;
    staffID: string;
    staffName: string;
    amount: number;
    date: string;
    tenure: string;
  }> = [];

  get filteredRecords(): typeof this.records {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.records;
    return this.records.filter((r) =>
      r.staffName.toLowerCase().includes(q) ||
      r.schoolName.toLowerCase().includes(q) ||
      r.academicYearName.toLowerCase().includes(q)
    );
  }

  get pagedFilteredRecords(): typeof this.records {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRecords.slice(start, start + this.pageSize);
  }

  /**
   * Executes the operation: AddNewClicked
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
AddNewClicked(): void {
  this.IsAddNewClicked = !this.IsAddNewClicked;

  if (!this.IsAddNewClicked) return;

  // 🔥 STEP 1: RESET FIRST
  this.editIndex = null;
  this.formSubmitAttempted = false;
  this.selectedSchoolID= this.isAdmin ? '' : this.resolveNonAdminSchoolId();
  this.form = {
    staffID: '',
    amount: null,
    date: '',
    tenure: ''
  };

  this.staffList = [];
  this.academicYearList = [];
  this.selectedAcademicYearID = '';

  // 🔥 STEP 2: SET DEFAULT VALUE
  this.selectedAcademicYearID = this.isAdmin
    ? ''
    : (sessionStorage.getItem('ActiveAcademicYearID') || '');

  // 🔥 STEP 3: LOAD MASTER DATA
  this.FetchAcademicYearsList();

  // 🔥 STEP 4: LOAD DEPENDENT DATA (only for non-admin)
  if (!this.isAdmin && this.selectedAcademicYearID) {
    this.FetchStaffList();
  }
}

  // AddNewClicked(): void {
  //   this.IsAddNewClicked = !this.IsAddNewClicked;
  
  //   if (this.IsAddNewClicked) {
  //     this.editIndex = null;
  //     this.formSubmitAttempted = false;
  
  //     // ✅ Reset form
  //     this.form = { staffID: '', amount: null, date: '', tenure: '' };
  
  //     // 🔥 FIX: Reset dropdowns
  //     this.selectedAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';
  //     this.staffList = [];
  
  //     // Optional (if you want full reset)
  //     // this.selectedSchoolID = '';
  
  //     // Reload dependent data
  //     this.FetchAcademicYearsList();
  //   }
  // }

  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  /**
   * Lifecycle hook: Initializes component parameters and loads default page datasets.
   */
  ngOnInit(): void {
    this.checkViewPermission();
    this.selectedAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';
    if (this.isAdmin) {
      this.FetchSchoolsList();
    } else {
      this.selectedSchoolID = this.resolveNonAdminSchoolId();
      this.FetchAcademicYearsList();
    }
    this.fetchAdvanceSalaryList();
  }

  /**
   * Executes the operation: FetchSchoolsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: FetchAcademicYearsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchAcademicYearsList() {
    if (!this.selectedSchoolID) {
      this.academicYearList = [];
      this.staffList = [];
      this.selectedAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';
      return;
    }
    this.loader.show();
    this.apiurl
      .post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: this.selectedSchoolID || '', Flag: '2' })
      .subscribe({
        next: (response: any) => {
          const data = response?.Data || response?.data || [];
          this.academicYearList = Array.isArray(data)
            ? data.map((item: any) => ({ ID: `${item.id ?? item.ID ?? ''}`, Name: `${item.name ?? item.Name ?? ''}` }))
            : [];

          const hasSelectedYear = this.academicYearList.some((year: any) => `${year.ID}` === `${this.selectedAcademicYearID}`);
          if (!hasSelectedYear) {
            this.selectedAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';
          }

          if (!this.selectedAcademicYearID && this.academicYearList.length === 1) {
            this.selectedAcademicYearID = `${this.academicYearList[0].ID}`;
          }

          if (!this.selectedAcademicYearID) {
            this.staffList = [];
          } else {
            this.FetchStaffList();
          }
          this.loader.hide();
        },
        error: () => {
          this.academicYearList = [];
          this.staffList = [];
          this.loader.hide();
        }
      });
  }

  /**
   * Executes the operation: onAdminSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminSchoolChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedSchoolID = target.value === '0' ? '' : target.value;
    this.selectedAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';
    this.staffList = [];
    this.form.staffID = '';
    this.FetchAcademicYearsList();
    this.fetchAdvanceSalaryList();
  }

  /**
   * Executes the operation: onAcademicYearChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  onAcademicYearChange(): void {
    this.form.staffID = '';
    this.currentPage = 1;
    this.FetchStaffList();
    this.fetchAdvanceSalaryList();
  }

  /**
   * Executes the operation: FetchStaffList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchStaffList(): void {
    if (!this.selectedSchoolID || !this.selectedAcademicYearID) {
      this.staffList = [];
      return;
    }
    const payload: any = {
      Flag: '9',
      SchoolID: this.selectedSchoolID,
      AcademicYear: this.selectedAcademicYearID
    };
    this.loader.show();
    this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        const data = response?.Data || response?.data || [];
        this.staffList = Array.isArray(data)
          ? data
              .map((item: any) => ({
                ID: `${item.ID ?? item.id ?? item.StaffID ?? item.staffID ?? ''}`,
                Name: this.getStaffDisplayName(item)
              }))
              .filter((s: any) => !!s.ID && !!s.Name)
          : [];
        this.loader.hide();
      },
      error: () => {
        this.staffList = [];
        this.loader.hide();
      }
    });
  }

  /**
   * Executes the operation: getStaffDisplayName
   * Parameters: item: any
   * Rationale: Standard operational controller for the active view.
   */
  private getStaffDisplayName(item: any): string {
    const directName = `${item?.Name ?? item?.name ?? item?.StaffName ?? item?.staffName ?? ''}`.trim();
    if (directName) return directName;
    const first = `${item?.FirstName ?? item?.firstName ?? ''}`.trim();
    const middle = `${item?.MiddleName ?? item?.middleName ?? ''}`.trim();
    const last = `${item?.LastName ?? item?.lastName ?? ''}`.trim();
    return [first, middle, last].filter(Boolean).join(' ').trim();
  }

  /**
   * Executes the operation: fetchAdvanceSalaryList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  fetchAdvanceSalaryList(): void {
    const payload: any = {
      Flag: '2',
      SchoolID: this.selectedSchoolID || null,
      AcademicYear: this.selectedAcademicYearID || null,
      Limit: 500,
      Offset: 0
    };
    this.loader.show();
    this.postAdvanceSalaryApi(payload).subscribe({
      next: (response: any) => {
        const data = response?.Data || response?.data || [];
        this.records = Array.isArray(data)
          ? data.map((row: any) => ({
              id: Number(row?.ID ?? row?.id ?? 0),
              schoolID: `${row?.SchoolID ?? row?.schoolID ?? row?.schoolId ?? ''}`,
              schoolName: `${row?.SchoolName ?? row?.schoolName ?? row?.School ?? row?.school ?? '-'}`,
              academicYearID: `${row?.AcademicYearID ?? row?.academicYearID ?? row?.AcademicYear ?? row?.academicYear ?? ''}`,
              academicYearName: `${row?.AcademicYearName ?? row?.academicYearName ?? row?.AcademicYear ?? row?.academicYear ?? '-'}`,
              staffID: `${row?.StaffID ?? row?.staffID ?? ''}`,
              staffName: `${row?.StaffName ?? row?.staffName ?? '-'}`,
              amount: Number(row?.Amount ?? row?.amount ?? 0),
              date: `${row?.AdvanceDate ?? row?.advanceDate ?? row?.Date ?? row?.date ?? ''}`,
              tenure: `${row?.TenureMonths ?? row?.tenureMonths ?? row?.tenure ?? ''}`
            }))
          : [];
        this.clampCurrentPage();
        this.loader.hide();
      },
      error: () => {
        this.records = [];
        this.loader.hide();
      }
    });
  }

  /**
   * Executes the operation: addAdvanceSalary
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  addAdvanceSalary(): void {
    this.formSubmitAttempted = true;
    if (this.isSubmitting) return;
    const schoolId = this.toNumber(this.selectedSchoolID);
    const academicYearId = this.toNumber(this.selectedAcademicYearID);
    const staffId = this.toNumber(this.form.staffID);
    if (!schoolId || !academicYearId) return;
    if (!staffId || !this.form.amount || !this.form.date || !this.form.tenure.trim()) return;
    if (!this.isTenureValid(this.form.tenure)) return;
    if (this.isDuplicateAdvanceSalary()) {
      this.statusMessage = 'Advance Salary Already Exists.';
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
      ID: this.editIndex ?? 0,
      SchoolID: schoolId,
      schoolID: schoolId,
      AcademicYear: academicYearId,
      academicYear: academicYearId,
      AcademicYearID: academicYearId,
      StaffID: staffId,
      staffID: staffId,
      Amount: Number(this.form.amount),
      AdvanceDate: this.form.date,
      advanceDate: this.form.date,
      TenureMonths: Number(this.form.tenure),
      tenureMonths: Number(this.form.tenure),
      Description: null,
      IsActive: 1,
      CreatedBy: this.editIndex !== null ? null : userId,
      CreatedIp: null,
      CreatedIP: null,
      ModifiedBy: this.editIndex !== null ? userId : null,
      ModifiedIp: null,
      ModifiedIP: null,
      Flag: this.editIndex !== null ? '5' : '1'
    };
    this.isSubmitting = true;
    this.loader.show();
    this.postAdvanceSalaryApi(payload).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        const message = this.extractApiMessage(response).toLowerCase();
        if (message.includes('already exists')) {
          this.loader.hide();
          this.statusMessage = 'Advance Salary Already Exists.';
          this.isModalOpen = true;
          return;
        }
        if (this.editIndex === null) {
          this.addRecordToTop();
        }
        this.statusMessage = this.editIndex !== null ? 'Advance salary updated successfully!' : 'Advance salary submitted successfully!';
        this.isModalOpen = true;
        this.resetAdvanceSalaryFormState();
        this.fetchAdvanceSalaryList();
      },
      error: (error: any) => {
        this.isSubmitting = false;
        const apiErrorMessage = this.extractErrorMessage(error).toLowerCase();

        if (apiErrorMessage.includes('already exists')) {
          this.loader.hide();
          this.statusMessage = 'Advance Salary Already Exists.';
          this.isModalOpen = true;
          return;
        }

        if (apiErrorMessage.includes('success') || apiErrorMessage.includes('updated') || apiErrorMessage.includes('saved')) {
          this.statusMessage = this.editIndex !== null ? 'Advance salary updated successfully!' : 'Advance salary submitted successfully!';
          this.isModalOpen = true;
          this.resetAdvanceSalaryFormState();
          this.fetchAdvanceSalaryList();
          return;
        }

        if (this.isPostWriteProjectionError(apiErrorMessage)) {
          this.statusMessage = this.editIndex !== null ? 'Advance salary updated successfully!' : 'Advance salary submitted successfully!';
          this.isModalOpen = true;
          this.resetAdvanceSalaryFormState();
          this.fetchAdvanceSalaryList();
          return;
        }

        this.loader.hide();
        this.statusMessage = 'Unable to save advance salary. Please verify School, Academic Year and Staff, then try again.';
        this.isModalOpen = true;
      }
    });
  }

  /**
   * Executes the operation: postAdvanceSalaryApi
   * Parameters: payload: any, endpointIndex = 0
   * Rationale: Standard operational controller for the active view.
   */
  private postAdvanceSalaryApi(payload: any, endpointIndex = 0): any {
    const endpoint = this.advanceSalaryEndpoints[endpointIndex];
    return new Observable((observer) => {
      this.apiurl.post<any>(endpoint, payload).subscribe({
        next: (response: any) => {
          observer.next(response);
          observer.complete();
        },
        error: (error: any) => {
          if (error?.status === 404 && endpointIndex < this.advanceSalaryEndpoints.length - 1) {
            this.postAdvanceSalaryApi(payload, endpointIndex + 1).subscribe({
              next: (response: any) => {
                observer.next(response);
                observer.complete();
              },
              error: (retryError: any) => observer.error(retryError)
            });
            return;
          }
          observer.error(error);
        }
      });
    });
  }

  /**
   * Executes the operation: resetAdvanceSalaryFormState
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private resetAdvanceSalaryFormState(): void {
    this.IsAddNewClicked = false;
    this.editIndex = null;
    this.formSubmitAttempted = false;
    this.form = { staffID: '', amount: null, date: '', tenure: '' };
    this.selectedAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';
    this.staffList = [];
  }

  /**
   * Executes the operation: editReview
   * Parameters: row: any
   * Rationale: Standard operational controller for the active view.
   */
  editReview(row: any): void {
    this.editIndex = row.id ?? null;
    this.selectedSchoolID = `${row.schoolID || this.selectedSchoolID || ''}`;
    this.selectedAcademicYearID = `${row.academicYearID || this.selectedAcademicYearID || ''}`;
    this.form = {
      staffID: row.staffID || '',
      amount: row.amount,
      date: this.toDateInputValue(row.date),
      tenure: row.tenure || ''
    };
    this.FetchAcademicYearsList();
    this.FetchStaffList();
    this.formSubmitAttempted = false;
    this.IsAddNewClicked = true;
  }

  /**
   * Executes the operation: viewReview
   * Parameters: row: any
   * Rationale: Standard operational controller for the active view.
   */
  viewReview(row: any): void {
    this.viewRow = row;
    this.isViewModalOpen = true;
  }

  /**
   * Executes the operation: closeViewModal
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewRow = null;
  }

  /**
   * Executes the operation: closeModal
   * Parameters: type: 'view' | 'status'
   * Rationale: Standard operational controller for the active view.
   */
  closeModal(type: 'view' | 'status') {
    if (type === 'view') {
      this.closeViewModal();
    }
    if (type === 'status') {
      this.isModalOpen = false;
    }
  }

  /**
   * Executes the operation: handleOk
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  handleOk() {
    this.isModalOpen = false;
    this.fetchAdvanceSalaryList();
  }

  /**
   * Executes the operation: onTenureChange
   * Parameters: value: string
   * Rationale: Standard operational controller for the active view.
   */
  onTenureChange(value: string): void {
    this.form.tenure = value.replace(/\D/g, '').slice(0, 2);
  }

  /**
   * Executes the operation: isTenureValid
   * Parameters: value: string
   * Rationale: Standard operational controller for the active view.
   */
  isTenureValid(value: string): boolean {
    return /^(0[1-9]|1[0-9]|2[0-4])$/.test((value || '').trim());
  }

  /**
   * Executes the operation: isDuplicateAdvanceSalary
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private isDuplicateAdvanceSalary(): boolean {
    const formDate = this.toDateOnly(this.form.date);
    const targetAmount = Number(this.form.amount);
    const targetTenure = (this.form.tenure || '').trim();
    const targetSchoolID = `${this.selectedSchoolID || ''}`.trim();
    const targetAcademicYearID = `${this.selectedAcademicYearID || ''}`.trim();

    return this.records.some((record) => {
      const sameRecordWhenEditing = this.editIndex !== null && record.id === this.editIndex;
      if (sameRecordWhenEditing) return false;

      return (
        (record.schoolID || '').trim() === targetSchoolID &&
        (record.academicYearID || '').trim() === targetAcademicYearID &&
        (record.staffID || '').trim() === (this.form.staffID || '').trim() &&
        Number(record.amount) === targetAmount &&
        (record.tenure || '').trim() === targetTenure &&
        this.toDateOnly(record.date) === formDate
      );
    });
  }

  /**
   * Executes the operation: addRecordToTop
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private addRecordToTop(): void {
    const selectedSchool = this.schoolList.find((school: any) => `${school.ID}` === `${this.selectedSchoolID}`);
    const selectedAcademicYear = this.academicYearList.find((year: any) => `${year.ID}` === `${this.selectedAcademicYearID}`);
    const selectedStaff = this.staffList.find((staff: any) => `${staff.ID}` === `${this.form.staffID}`);

    const optimisticRecord = {
      id: Date.now(),
      schoolID: `${this.selectedSchoolID}`,
      schoolName: selectedSchool?.Name || '-',
      academicYearID: `${this.selectedAcademicYearID}`,
      academicYearName: selectedAcademicYear?.Name || '-',
      staffID: `${this.form.staffID}`,
      staffName: selectedStaff?.Name || '-',
      amount: Number(this.form.amount),
      date: `${this.form.date}`,
      tenure: `${this.form.tenure}`
    };

    this.records = [optimisticRecord, ...this.records];
  }

  /**
   * Executes the operation: toDateOnly
   * Parameters: value: string
   * Rationale: Standard operational controller for the active view.
   */
  private toDateOnly(value: string): string {
    const raw = `${value || ''}`.trim();
    if (!raw) return '';
    return raw.includes('T') ? raw.split('T')[0] : raw.split(' ')[0];
  }

  /**
   * Executes the operation: toDateInputValue
   * Parameters: value: string
   * Rationale: Standard operational controller for the active view.
   */
  private toDateInputValue(value: string): string {
    const dateOnly = this.toDateOnly(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return dateOnly;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const yyyy = parsed.getFullYear();
    const mm = `${parsed.getMonth() + 1}`.padStart(2, '0');
    const dd = `${parsed.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Executes the operation: previousPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  /**
   * Executes the operation: nextPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages()) {
      this.goToPage(this.currentPage + 1);
    }
  }

  /**
   * Executes the operation: goToPage
   * Parameters: pageNumber: number
   * Rationale: Standard operational controller for the active view.
   */
  goToPage(pageNumber: number): void {
    const total = this.totalPages();
    if (total <= 0) {
      this.currentPage = 1;
      return;
    }
    this.currentPage = Math.max(1, Math.min(pageNumber, total));
  }

  /**
   * Executes the operation: pageStartIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageStartIndex(): number {
    return this.filteredRecords.length === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
  }

  /**
   * Executes the operation: pageEndIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredRecords.length);
  }

  /**
   * Executes the operation: onRowsCountChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  onRowsCountChange() {
    this.currentPage = 1;
  }

  /**
   * Executes the operation: totalPages
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  totalPages(): number {
    return Math.ceil(this.filteredRecords.length / this.pageSize);
  }

  /**
   * Executes the operation: getVisiblePageNumbers
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: clampCurrentPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private clampCurrentPage(): void {
    const total = this.totalPages();
    this.currentPage = total > 0 ? Math.min(this.currentPage, total) : 1;
  }

  /**
   * Executes the operation: extractApiMessage
   * Parameters: response: any
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: extractErrorMessage
   * Parameters: error: any
   * Rationale: Standard operational controller for the active view.
   */
  private extractErrorMessage(error: any): string {
    const direct =
      error?.error?.Message ||
      error?.error?.message ||
      error?.error?.title ||
      error?.message ||
      '';
    if (direct) {
      return `${direct}`;
    }

    const list = error?.error?.Data || error?.error?.data;
    if (Array.isArray(list) && list.length) {
      const rowMessage = list[0]?.Status || list[0]?.status || list[0]?.Message || list[0]?.message;
      if (rowMessage) {
        return `${rowMessage}`;
      }
    }

    return '';
  }

  /**
   * Executes the operation: isPostWriteProjectionError
   * Parameters: message: string
   * Rationale: Standard operational controller for the active view.
   */
  private isPostWriteProjectionError(message: string): boolean {
    if (!message) return false;
    const hasProjectionColumnError =
      message.includes('could not find specified column') ||
      message.includes('unknown column') ||
      message.includes('schoolname') ||
      message.includes('academicyearname') ||
      message.includes('staffname');
    const hasDalErrorPrefix = message.includes('error:');
    return hasProjectionColumnError && hasDalErrorPrefix;
  }

  /**
   * Executes the operation: readStoredSchoolIdFromBrowserStorage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private readStoredSchoolIdFromBrowserStorage(): string {
    const keys = ['SchoolID', 'schoolID', 'schoolId'] as const;
    for (const key of keys) {
      const value = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (value?.trim()) {
        return value.trim();
      }
    }
    return '';
  }

  /**
   * Executes the operation: tryReadSchoolIdFromAccessToken
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private tryReadSchoolIdFromAccessToken(): string {
    const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken') || '';
    const parts = token.split('.');
    if (parts.length < 2) return '';

    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded));
      const schoolId = payload?.SchoolID ?? payload?.schoolID ?? payload?.schoolId ?? payload?.SchoolId ?? '';
      return `${schoolId}`.trim();
    } catch {
      return '';
    }
  }

  /**
   * Executes the operation: resolveNonAdminSchoolId
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private resolveNonAdminSchoolId(): string {
    return this.readStoredSchoolIdFromBrowserStorage() || this.tryReadSchoolIdFromAccessToken();
  }

  private toNumber(value: any): number | null {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
}
