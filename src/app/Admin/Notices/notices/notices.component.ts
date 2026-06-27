import { NgClass, NgFor, NgIf, NgStyle, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiServiceService } from '../../../Services/api-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { LoaderService } from '../../../Services/loader.service';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';

@Component({
  selector: 'app-notices',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule, DatePipe],
  templateUrl: './notices.component.html',
  styleUrl: './notices.component.css'
})
/**
 * Class Responsibility: Handles view logic and user interactions for NoticesComponent.
 */
export class NoticesComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Notices';

  constructor(
    router: Router,
    public loader: LoaderService,
    private apiurl: ApiServiceService,
    menuService: MenuServiceService
  ) {
    super(menuService, router);
  }

  /**
   * Lifecycle hook: Initializes component parameters and loads default page datasets.
   */
  ngOnInit(): void {
    this.checkViewPermission();
    this.fetchSchoolsList();
    if (!this.isAdmin) {
      this.filterSchoolID = sessionStorage.getItem('SchoolID') || sessionStorage.getItem('schoolId') || '';
      this.filterAcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || sessionStorage.getItem('AcademicYearID') || sessionStorage.getItem('AcademicYear') || '';
      this.noticesForm.get('School')?.patchValue(this.filterSchoolID);
      this.noticesForm.get('AcademicYear')?.patchValue(this.filterAcademicYear);
      this.noticesForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
    this.fetchAcademicYearsList(this.filterSchoolID);
    this.fetchData();
  }

  protected override get isAdmin(): boolean {
    return sessionStorage.getItem('RollID') === '1' || localStorage.getItem('RollID') === '1';
  }

  /**
   * Executes the operation: ss
   * Parameters: key: string
   * Rationale: Standard operational controller for the active view.
   */
  public ss(key: string) {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
  }

  get currentRoleName(): string { return (this.ss('roleName') || this.ss('RoleName') || this.ss('rollName') || this.ss('RollName') || '').trim(); }
  get currentRollID(): string { return (this.ss('RollID') || this.ss('rollID') || this.ss('menuRoleId') || this.ss('RoleID') || '').trim(); }

  get isTeacher(): boolean {
    const r = this.currentRoleName.toLowerCase();
    const id = this.currentRollID;
    return id === '3' || r.includes('teacher') || r.includes('teaching');
  }

  // ── State ──────────────────────────────────────────────────────────────────
  isFormOpen = false;
  isEditMode = false;
  isViewModalOpen = false;
  isStatusModalOpen = false;
  viewItem: any = null;
  statusMessage = '';
  IsActiveStatus = true;

  // ── Lists ──────────────────────────────────────────────────────────────────
  noticesList: any[] = [];
  noticesCount = 0;
  schoolList: any[] = [];
  academicYearList: any[] = [];

  // ── Pagination ─────────────────────────────────────────────────────────────
  currentPage = 1;
  pageSize = 5;
  visiblePageCount = 3;
  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];

  // ── Search / Sort ──────────────────────────────────────────────────────────
  searchQuery = '';
  private searchTimer: any;
  private readonly SEARCH_MIN = 3;
  private readonly SEARCH_DEBOUNCE = 300;
  sortColumn = 'Title';
  sortDirection: 'asc' | 'desc' = 'desc';

  // ── Filter ─────────────────────────────────────────────────────────────────
  filterSchoolID = '';
  filterAcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
  filterNoticeType = '';
  filterAudience = '';

  // ── Session ────────────────────────────────────────────────────────────────
  activeUserId = sessionStorage.getItem('UserID') || sessionStorage.getItem('userId') || '';

  // ── Form ───────────────────────────────────────────────────────────────────
  noticesForm = new FormGroup({
    NoticeId:      new FormControl<number | null>(null),
    Title:         new FormControl('', Validators.required),
    Description:   new FormControl(''),
    NoticeType:    new FormControl('General', Validators.required),
    Audience:      new FormControl('All', Validators.required),
    StartDate:     new FormControl('', Validators.required),
    EndDate:       new FormControl('', Validators.required),
    School:        new FormControl('0'),
    AcademicYear:  new FormControl(sessionStorage.getItem('ActiveAcademicYearID') || '0', [Validators.required, Validators.min(1)])
  });


  readonly NOTICE_TYPES = ['General', 'Exam', 'Holiday', 'Urgent'];
  readonly AUDIENCE_TYPES = ['All', 'Student', 'Staff'];

  // ── Schools ────────────────────────────────────────────────────────────────
  fetchSchoolsList() {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (res: any) => {
        this.schoolList = (res?.data || []).map((s: any) => ({ ID: s.id, Name: s.name }));
      }
    });
  }

  /**
   * Executes the operation: fetchAcademicYearsList
   * Parameters: schoolID?: string
   * Rationale: Standard operational controller for the active view.
   */
  fetchAcademicYearsList(schoolID?: string) {
    const sid = schoolID || this.filterSchoolID || '';
    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: sid || null, Flag: '2' }).subscribe({
      next: (res: any) => {
        this.academicYearList = (res?.data || []).map((a: any) => ({ ID: a.id, Name: a.name }));
      }
    });
  }

  // ── Count ──────────────────────────────────────────────────────────────────
  private fetchCount(isSearch: boolean) {
    const payload: any = {
      Flag: isSearch ? '8' : '6',
      SchoolID: this.filterSchoolID || null,
      AcademicYear: this.filterAcademicYear || null
    };
    if (isSearch) payload.Title = this.searchQuery.trim();
    if (this.filterNoticeType && this.filterNoticeType !== '0') payload.NoticeType = this.filterNoticeType;
    if (this.isTeacher) {
      payload.Audience = null;
    } else {
      if (this.filterAudience && this.filterAudience !== '0') payload.Audience = this.filterAudience;
    }
    return this.apiurl.post<any>('Tbl_Notices_CRUD_Operations', payload);
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  fetchData(extra: any = {}) {
    const isSearch = !!this.searchQuery?.trim();
    const hasFilter = !!(this.filterNoticeType && this.filterNoticeType !== '0') || !!(this.filterAudience && this.filterAudience !== '0');
    const flag = (isSearch || hasFilter) ? '7' : '2';

    const cursor = !extra.offset && this.currentPage > 1
      ? this.pageCursors[this.currentPage - 2] || null : null;

    this.loader.show();

    this.fetchCount(isSearch || hasFilter).subscribe({
      next: (countRes: any) => {
        this.noticesCount = countRes?.data?.[0]?.totalCount ?? 0;

        const payload: any = {
          Flag: flag,
          Limit: this.pageSize,
          SortDirection: this.sortDirection,
          LastCreatedDate: cursor?.lastCreatedDate ?? null,
          LastID: cursor?.lastID ?? null,
          SchoolID: this.filterSchoolID || null,
          AcademicYear: this.filterAcademicYear || null,
          ...extra
        };
        if (isSearch) payload.Title = this.searchQuery.trim();
        if (this.filterNoticeType && this.filterNoticeType !== '0') payload.NoticeType = this.filterNoticeType;
        if (this.isTeacher) {
          payload.Audience = null;
        } else {
          if (this.filterAudience && this.filterAudience !== '0') payload.Audience = this.filterAudience;
        }

        this.apiurl.post<any>('Tbl_Notices_CRUD_Operations', payload).subscribe({
          next: (res: any) => {
            this.mapNotices(res);
            const data = res?.data || [];
            if (data.length > 0 && !this.pageCursors[this.currentPage - 1]) {
              const last = data[data.length - 1];
              this.pageCursors[this.currentPage - 1] = {
                lastCreatedDate: last.createdAt,
                lastID: Number(last.noticeId)
              };
            }
            this.loader.hide();
          },
          error: (err: any) => {
            this.loader.hide();
            this.statusMessage = err?.error?.message || err?.error?.Message || 'Failed to load notices.';
            this.isStatusModalOpen = true;
            this.noticesList = [];
          }
        });
      },
      error: () => { this.noticesCount = 0; this.loader.hide(); }
    });
  }

  /**
   * Executes the operation: mapNotices
   * Parameters: res: any
   * Rationale: Standard operational controller for the active view.
   */
  private mapNotices(res: any) {
    let data = res?.data || [];
    if (this.isTeacher) {
      data = data.filter((item: any) => {
        const aud = (item.audience || '').trim().toLowerCase();
        return aud === 'staff' || aud === 'all';
      });
    }
    this.noticesList = data.map((item: any) => ({
      NoticeId:         item.noticeId,
      SchoolID:         item.schoolID,
      AcademicYear:     item.academicYear,
      Title:            item.title,
      Description:      item.description,
      NoticeType:       item.noticeType,
      Audience:         item.audience,
      StartDate:        item.startDate,
      EndDate:          item.endDate,
      AttachmentPath:   item.attachmentPath,
      IsActive:         item.isActive === 1 || item.isActive === true || item.isActive === 'True',
      SchoolName:       item.schoolName,
      AcademicYearName: item.academicYearName,
      CreatedAt:        item.createdAt,
      CreatedBy:        item.createdBy
    }));
  }

  // ── Add / Edit form ────────────────────────────────────────────────────────
  openAddForm() {
    this.isEditMode = false;
    this.IsActiveStatus = true;
    this.noticesForm.reset();
    this.noticesForm.patchValue({ NoticeType: 'General', Audience: 'All', School: '0', AcademicYear: sessionStorage.getItem('ActiveAcademicYearID') || '0' });
    if (this.isAdmin) {
      this.noticesForm.get('School')?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      this.noticesForm.get('School')?.clearValidators();
      this.noticesForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
    this.noticesForm.get('School')?.updateValueAndValidity();
    this.isFormOpen = true;
  }

  /**
   * Executes the operation: closeForm
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  closeForm() {
    this.isFormOpen = false;
    this.noticesForm.reset();
  }

  // ── Submit (Insert) ────────────────────────────────────────────────────────
  submitNotice() {
    if (this.noticesForm.invalid) { this.noticesForm.markAllAsTouched(); return; }

    const v = this.noticesForm.value;
    const payload: any = {
      Flag: '1',
      Title:          v.Title,
      Description:    v.Description || null,
      NoticeType:     v.NoticeType,
      Audience:       v.Audience,
      StartDate:      v.StartDate || null,
      EndDate:        v.EndDate || null,
      SchoolID:       v.School || null,
      AcademicYear:   v.AcademicYear,
      IsActive:       this.IsActiveStatus ? 1 : 0,
      CreatedBy:      Number(this.activeUserId) || null
    };

    if (!this.isAdmin) {
      payload.AcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
    }

    this.loader.show();
    this.apiurl.post<any>('Tbl_Notices_CRUD_Operations', payload).subscribe({
      next: (res: any) => {
        this.loader.hide();
        this.statusMessage = res?.message || 'Notice added successfully!';
        this.isStatusModalOpen = true;
        this.isFormOpen = false;
        this.noticesForm.reset();
        this.noticesForm.patchValue({ AcademicYear: sessionStorage.getItem('ActiveAcademicYearID') || '0' });
      },
      error: (err: any) => {
        this.loader.hide();
        this.statusMessage = err?.error?.message || err?.error?.Message || 'An error occurred.';
        this.isStatusModalOpen = true;
      }
    });
  }

  // ── Fetch by ID ────────────────────────────────────────────────────────────
  fetchByID(id: number, mode: 'view' | 'edit') {
    this.apiurl.post<any>('Tbl_Notices_CRUD_Operations', { Flag: '4', NoticeId: id }).subscribe({
      next: (res: any) => {
        const item = res?.data?.[0];
        if (!item) return;

        const isActive = item.isActive === 1 || item.isActive === true || item.isActive === 'True';

        if (mode === 'view') {
          this.viewItem = {
            Title:            item.title,
            Description:      item.description,
            NoticeType:       item.noticeType,
            Audience:         item.audience,
            ClassIds:         item.classIds,
            StartDate:        item.startDate,
            EndDate:          item.endDate,
            SchoolName:       item.schoolName,
            AcademicYearName: item.academicYearName,
            IsActive:         isActive,
            CreatedAt:        item.createdAt
          };
          this.isViewModalOpen = true;
        }

        if (mode === 'edit') {
          this.isEditMode = true;
          this.IsActiveStatus = isActive;
          if (this.isAdmin) {
            this.fetchAcademicYearsList(item.schoolID);
            this.noticesForm.get('School')?.setValidators([Validators.required, Validators.min(1)]);
          } else {
            this.noticesForm.get('School')?.clearValidators();
            this.noticesForm.get('AcademicYear')?.disable({ emitEvent: false });
          }
          this.noticesForm.get('School')?.updateValueAndValidity();
          this.noticesForm.patchValue({
            NoticeId:      item.noticeId,
            Title:         item.title,
            Description:   item.description,
            NoticeType:    item.noticeType,
            Audience:      item.audience,
            StartDate:     this.toInputDate(item.startDate),
            EndDate:       this.toInputDate(item.endDate),
            School:        item.schoolID,
            AcademicYear:  item.academicYear
          });
          this.isFormOpen = true;
        }
      }
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  updateNotice() {
    if (this.noticesForm.invalid) { this.noticesForm.markAllAsTouched(); return; }

    const v = this.noticesForm.value;
    const payload: any = {
      Flag:           '5',
      NoticeId:       v.NoticeId,
      Title:          v.Title,
      Description:    v.Description || null,
      NoticeType:     v.NoticeType,
      Audience:       v.Audience,
      StartDate:      v.StartDate || null,
      EndDate:        v.EndDate || null,
      SchoolID:       v.School || null,
      AcademicYear:   v.AcademicYear,
      IsActive:       this.IsActiveStatus ? 1 : 0,
      ModifiedBy:     Number(this.activeUserId) || null
    };

    if (!this.isAdmin) {
      payload.AcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
    }

    this.loader.show();
    this.apiurl.post<any>('Tbl_Notices_CRUD_Operations', payload).subscribe({
      next: (res: any) => {
        this.loader.hide();
        this.statusMessage = res?.message || 'Notice updated successfully!';
        this.isStatusModalOpen = true;
        this.isFormOpen = false;
        this.noticesForm.reset();
        this.noticesForm.patchValue({ AcademicYear: sessionStorage.getItem('ActiveAcademicYearID') || '0' });
      },
      error: (err: any) => {
        this.loader.hide();
        this.statusMessage = err?.error?.message || err?.error?.Message || 'An error occurred.';
        this.isStatusModalOpen = true;
      }
    });
  }

  // ── Soft Delete ────────────────────────────────────────────────────────────
  deleteNotice(id: number) {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    const payload = {
      Flag: '5', NoticeId: id, IsActive: 0, ModifiedBy: this.activeUserId
    };
    this.loader.show();
    this.apiurl.post<any>('Tbl_Notices_CRUD_Operations', payload).subscribe({
      next: () => { this.loader.hide(); this.fetchData(); },
      error: () => this.loader.hide()
    });
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  totalPages() { return Math.ceil(this.noticesCount / this.pageSize); }

  /**
   * Executes the operation: goToPage
   * Parameters: page: number
   * Rationale: Standard operational controller for the active view.
   */
  goToPage(page: number) {
    const total = this.totalPages();
    if (page < 1) page = 1;
    if (page > total) page = total;
    this.currentPage = page;
    const isBoundary = page === 1 || page === total || !this.pageCursors[page - 2];
    if (isBoundary) {
      this.fetchData({ offset: (page - 1) * this.pageSize });
    } else {
      this.fetchData();
    }
  }

  /**
   * Executes the operation: previousPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  previousPage() { if (this.currentPage > 1) this.goToPage(this.currentPage - 1); }
  /**
   * Executes the operation: nextPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  nextPage() { if (this.currentPage < this.totalPages()) this.goToPage(this.currentPage + 1); }

  /**
   * Executes the operation: getVisiblePageNumbers
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  getVisiblePageNumbers() {
    const total = this.totalPages();
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, total);
    if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  /**
   * Executes the operation: pageStartIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageStartIndex(): number {
    return this.noticesCount === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
  }

  /**
   * Executes the operation: pageEndIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.noticesCount);
  }

  /**
   * Executes the operation: onRowsCountChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  onRowsCountChange() {
    this.currentPage = 1;
    this.pageCursors = [];
    this.fetchData();
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  onSearchChange() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      const v = this.searchQuery?.trim() || '';
      if (v.length === 0 || v.length >= this.SEARCH_MIN) {
        this.currentPage = 1;
        this.pageCursors = [];
        this.fetchData();
      }
    }, this.SEARCH_DEBOUNCE);
  }

  // ── Sort ───────────────────────────────────────────────────────────────────
  sort(col: string) {
    this.sortDirection = this.sortColumn === col && this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortColumn = col;
    this.currentPage = 1;
    this.pageCursors = [];
    this.fetchData();
  }

  // ── Filter ─────────────────────────────────────────────────────────────────
  onSchoolFilterChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.filterSchoolID = (val === '0' || val === 'all') ? '' : val;
    this.filterAcademicYear = '';
    this.currentPage = 1;
    this.pageCursors = [];
    this.fetchAcademicYearsList(this.filterSchoolID || '');
    this.fetchData();
  }

  /**
   * Executes the operation: onAcademicYearFilterChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAcademicYearFilterChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.filterAcademicYear = val === '0' ? '' : val;
    this.currentPage = 1;
    this.pageCursors = [];
    this.fetchData();
  }

  /**
   * Executes the operation: onNoticeTypeFilterChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onNoticeTypeFilterChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.filterNoticeType = val === '0' ? '' : val;
    this.currentPage = 1;
    this.pageCursors = [];
    this.fetchData();
  }

  /**
   * Executes the operation: onAudienceFilterChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAudienceFilterChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.filterAudience = val === '0' ? '' : val;
    this.currentPage = 1;
    this.pageCursors = [];
    this.fetchData();
  }

  /**
   * Executes the operation: onAdminSchoolFormChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminSchoolFormChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.noticesForm.get('AcademicYear')?.patchValue(sessionStorage.getItem('ActiveAcademicYearID') || '0');
    this.fetchAcademicYearsList(val === '0' ? '' : val);
  }

  // ── Modals ─────────────────────────────────────────────────────────────────
  closeViewModal()   { this.isViewModalOpen = false; this.viewItem = null; }
  /**
   * Executes the operation: handleStatusOk
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  handleStatusOk()   { this.isStatusModalOpen = false; this.fetchData(); }
  /**
   * Executes the operation: closeStatusModal
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  closeStatusModal() { this.isStatusModalOpen = false; }

  /**
   * Executes the operation: toggleActive
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  toggleActive() { this.IsActiveStatus = !this.IsActiveStatus; }

  // ── Helpers ────────────────────────────────────────────────────────────────
  // ── Date Validation ───────────────────────────────────────────────────────
  getMinDate(): string {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-${today.getDate().toString().padStart(2,'0')}`;
  }

  /**
   * Executes the operation: toInputDate
   * Parameters: val: any
   * Rationale: Standard operational controller for the active view.
   */
  toInputDate(val: any): string {
    if (!val) return '';
    const d = new Date(val);
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
  }

  /**
   * Executes the operation: formatDate
   * Parameters: val: any
   * Rationale: Standard operational controller for the active view.
   */
  formatDate(val: any): string {
    if (!val) return '';
    const d = new Date(val);
    return `${d.getDate().toString().padStart(2,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
  }

  /**
   * Executes the operation: formatDateTime
   * Parameters: val: any
   * Rationale: Standard operational controller for the active view.
   */
  formatDateTime(val: any): string {
    if (!val) return '';
    const d = new Date(val);
    return `${d.getDate().toString().padStart(2,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  }
}
