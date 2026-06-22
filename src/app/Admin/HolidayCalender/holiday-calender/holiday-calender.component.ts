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
  selector: 'app-holiday-calender',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule, DatePipe],
  templateUrl: './holiday-calender.component.html',
  styleUrl: './holiday-calender.component.css'
})
export class HolidayCalenderComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Holiday Calendar';

  constructor(
    router: Router,
    public loader: LoaderService,
    private apiurl: ApiServiceService,
    menuService: MenuServiceService
  ) {
    super(menuService, router);
  }

  ngOnInit(): void {
    this.checkViewPermission();
    this.fetchSchoolsList();
    this.fetchAcademicYearsList();
    if (!this.isAdmin) {
      this.holidayForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
    this.fetchData();
  }

  protected override get isAdmin(): boolean {
    return sessionStorage.getItem('RollID') === '1' || localStorage.getItem('RollID') === '1';
  }

  // ── State ──────────────────────────────────────────────────────────────────
  isFormOpen = false;
  isEditMode = false;
  isViewModalOpen = false;
  isStatusModalOpen = false;
  viewItem: any = null;
  statusMessage = '';
  IsActiveStatus = true;

  // ── View toggle ────────────────────────────────────────────────────────────
  viewMode: 'table' | 'calendar' = 'table';
  showInactive = false;

  // ── Calendar ───────────────────────────────────────────────────────────────
  calendarYear = new Date().getFullYear();
  calendarMonth = new Date().getMonth(); // 0-based
  readonly MONTH_NAMES = ['January','February','March','April','May','June',
                          'July','August','September','October','November','December'];
  readonly DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // ── Lists ──────────────────────────────────────────────────────────────────
  holidayList: any[] = [];
  holidayCount = 0;
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
  sortColumn = 'HolidayName';
  sortDirection: 'asc' | 'desc' = 'desc';

  // ── Filter ─────────────────────────────────────────────────────────────────
  filterSchoolID = '';
  filterAcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';

  // ── Session ────────────────────────────────────────────────────────────────
  activeUserId = sessionStorage.getItem('email') || '';

  // ── Form ───────────────────────────────────────────────────────────────────
  holidayForm = new FormGroup({
    ID:           new FormControl<string | null>(null),
    HolidayName:  new FormControl('', Validators.required),
    FromDate:     new FormControl('', Validators.required),
    ToDate:       new FormControl('', Validators.required),
    HolidayType:  new FormControl('0', [Validators.required, Validators.min(1)]),
    Description:  new FormControl(''),
    School:       new FormControl('0'),
    AcademicYear: new FormControl(sessionStorage.getItem('ActiveAcademicYearID') || '0', [Validators.required, Validators.min(1)])
  });

  readonly HOLIDAY_TYPES = ['Public Holiday', 'School Holiday', 'National Holiday', 'Religious Holiday', 'Other'];

  // ── Schools ────────────────────────────────────────────────────────────────
  fetchSchoolsList() {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (res: any) => {
        this.schoolList = (res?.data || []).map((s: any) => ({ ID: s.id, Name: s.name }));
      }
    });
  }

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
    if (isSearch) payload.HolidayName = this.searchQuery.trim();
    return this.apiurl.post<any>('Tbl_HolidayCalendar_CRUD_Operations', payload);
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  fetchData(extra: any = {}) {
    const isSearch = !!this.searchQuery?.trim();
    const flag = isSearch ? '7' : '2';

    const cursor = !extra.offset && this.currentPage > 1
      ? this.pageCursors[this.currentPage - 2] || null : null;

    this.loader.show();

    this.fetchCount(isSearch).subscribe({
      next: (countRes: any) => {
        this.holidayCount = countRes?.data?.[0]?.totalcount ?? 0;

        const payload: any = {
          Flag: flag,
          Limit: this.pageSize,
          SortColumn: this.sortColumn,
          SortDirection: this.sortDirection,
          LastCreatedDate: cursor?.lastCreatedDate ?? null,
          LastID: cursor?.lastID ?? null,
          SchoolID: this.filterSchoolID || null,
          AcademicYear: this.filterAcademicYear || null,
          ...extra
        };
        if (isSearch) payload.HolidayName = this.searchQuery.trim();

        this.apiurl.post<any>('Tbl_HolidayCalendar_CRUD_Operations', payload).subscribe({
          next: (res: any) => {
            this.mapHolidays(res);
            const data = res?.data || [];
            if (data.length > 0 && !this.pageCursors[this.currentPage - 1]) {
              const last = data[data.length - 1];
              this.pageCursors[this.currentPage - 1] = {
                lastCreatedDate: last.createdDate,
                lastID: Number(last.id)
              };
            }
            this.loader.hide();
          },
          error: (err: any) => {
            this.loader.hide();
            this.statusMessage = err?.error?.message || err?.error?.Message || 'Failed to load holidays.';
            // this.isStatusModalOpen = true;
            this.holidayList = [];
          }
        });
      },
      error: () => { this.holidayCount = 0; this.loader.hide(); }
    });
  }

  private mapHolidays(res: any) {
    this.holidayList = (res?.data || []).map((item: any) => ({
      ID:               item.id,
      SchoolID:         item.schoolID,
      AcademicYear:     item.academicYear,
      HolidayName:      item.holidayName,
      FromDate:         item.fromDate,
      ToDate:           item.toDate,
      HolidayType:      item.holidayType,
      Description:      item.description,
      IsActive:         item.isActive === '1' || item.isActive === 1 || item.isActive === true || item.isActive === 'True',
      SchoolName:       item.schoolName,
      AcademicYearName: item.academicYearName,
      CreatedDate:      item.createdDate
    }));
  }

  // ── Add / Edit form ────────────────────────────────────────────────────────
  openAddForm() {
    this.isEditMode = false;
    this.IsActiveStatus = true;
    this.holidayForm.reset();
    this.holidayForm.patchValue({ HolidayType: '0', School: '0', AcademicYear: sessionStorage.getItem('ActiveAcademicYearID') || '0' });
    if (this.isAdmin) {
      this.holidayForm.get('School')?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      this.holidayForm.get('School')?.clearValidators();
      this.holidayForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
    this.holidayForm.get('School')?.updateValueAndValidity();
    this.isFormOpen = true;
  }

  closeForm() {
    this.isFormOpen = false;
    this.holidayForm.reset();
  }

  // ── Submit (Insert) ────────────────────────────────────────────────────────
  submitHoliday() {
    if (this.holidayForm.invalid) { this.holidayForm.markAllAsTouched(); return; }

    const v = this.holidayForm.value;
    const payload: any = {
      Flag: '1',
      HolidayName:  v.HolidayName,
      FromDate:     v.FromDate,
      ToDate:       v.ToDate,
      HolidayType:  v.HolidayType,
      Description:  v.Description || null,
      SchoolID:     v.School || null,
      AcademicYear: v.AcademicYear,
      IsActive:     this.IsActiveStatus ? '1' : '0',
      CreatedBy:    this.activeUserId
    };

    if (!this.isAdmin) {
      payload.AcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
    }

    this.loader.show();
    this.apiurl.post<any>('Tbl_HolidayCalendar_CRUD_Operations', payload).subscribe({
      next: (res: any) => {
        this.loader.hide();
        this.statusMessage = res?.message || 'Holiday added successfully!';
        this.isStatusModalOpen = true;
        this.isFormOpen = false;
        this.holidayForm.reset();
        this.holidayForm.patchValue({ AcademicYear: sessionStorage.getItem('ActiveAcademicYearID') || '0' });
      },
      error: (err: any) => {
        this.loader.hide();
        this.statusMessage = err?.error?.message || err?.error?.Message || 'An error occurred.';
        this.isStatusModalOpen = true;
      }
    });
  }

  // ── Fetch by ID ────────────────────────────────────────────────────────────
  fetchByID(id: string, mode: 'view' | 'edit') {
    this.apiurl.post<any>('Tbl_HolidayCalendar_CRUD_Operations', { Flag: '4', ID: id }).subscribe({
      next: (res: any) => {
        const item = res?.data?.[0];
        if (!item) return;

        const isActive = item.isActive === '1' || item.isActive === 1 || item.isActive === true || item.isActive === 'True';

        if (mode === 'view') {
          this.viewItem = {
            HolidayName:      item.holidayName,
            FromDate:         item.fromDate,
            ToDate:           item.toDate,
            HolidayType:      item.holidayType,
            Description:      item.description,
            SchoolName:       item.schoolName,
            AcademicYearName: item.academicYearName,
            IsActive:         isActive
          };
          this.isViewModalOpen = true;
        }

        if (mode === 'edit') {
          this.isEditMode = true;
          this.IsActiveStatus = isActive;
          if (this.isAdmin) {
            this.fetchAcademicYearsList(item.schoolID);
            this.holidayForm.get('School')?.setValidators([Validators.required, Validators.min(1)]);
          } else {
            this.holidayForm.get('School')?.clearValidators();
            this.holidayForm.get('AcademicYear')?.disable({ emitEvent: false });
          }
          this.holidayForm.get('School')?.updateValueAndValidity();
          this.holidayForm.patchValue({
            ID:           item.id,
            HolidayName:  item.holidayName,
            FromDate:     this.toInputDate(item.fromDate),
            ToDate:       this.toInputDate(item.toDate),
            HolidayType:  item.holidayType,
            Description:  item.description,
            School:       item.schoolID,
            AcademicYear: item.academicYear
          });
          this.isFormOpen = true;
        }
      }
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  updateHoliday() {
    if (this.holidayForm.invalid) { this.holidayForm.markAllAsTouched(); return; }

    const v = this.holidayForm.value;
    const payload: any = {
      Flag:         '5',
      ID:           v.ID,
      HolidayName:  v.HolidayName,
      FromDate:     v.FromDate,
      ToDate:       v.ToDate,
      HolidayType:  v.HolidayType,
      Description:  v.Description || null,
      SchoolID:     v.School || null,
      AcademicYear: v.AcademicYear,
      IsActive:     this.IsActiveStatus ? '1' : '0',
      ModifiedBy:   this.activeUserId
    };

    if (!this.isAdmin) {
      payload.AcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
    }

    this.loader.show();
    this.apiurl.post<any>('Tbl_HolidayCalendar_CRUD_Operations', payload).subscribe({
      next: (res: any) => {
        this.loader.hide();
        this.statusMessage = res?.message || 'Holiday updated successfully!';
        this.isStatusModalOpen = true;
        this.isFormOpen = false;
        this.holidayForm.reset();
        this.holidayForm.patchValue({ AcademicYear: sessionStorage.getItem('ActiveAcademicYearID') || '0' });
      },
      error: (err: any) => {
        this.loader.hide();
        this.statusMessage = err?.error?.message || err?.error?.Message || 'An error occurred.';
        this.isStatusModalOpen = true;
      }
    });
  }

  // ── Soft Delete ────────────────────────────────────────────────────────────
  deleteHoliday(id: string) {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    const payload = {
      Flag: '5', ID: id, IsActive: '0', ModifiedBy: this.activeUserId
    };
    this.loader.show();
    this.apiurl.post<any>('Tbl_HolidayCalendar_CRUD_Operations', payload).subscribe({
      next: () => { this.loader.hide(); this.fetchData(); },
      error: () => this.loader.hide()
    });
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  totalPages() { return Math.ceil(this.holidayCount / this.pageSize); }

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

  previousPage() { if (this.currentPage > 1) this.goToPage(this.currentPage - 1); }
  nextPage() { if (this.currentPage < this.totalPages()) this.goToPage(this.currentPage + 1); }

  getVisiblePageNumbers() {
    const total = this.totalPages();
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, total);
    if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  pageStartIndex(): number {
    return this.holidayCount === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
  }

  pageEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.holidayCount);
  }

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

  onAcademicYearFilterChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.filterAcademicYear = val === '0' ? '' : val;
    this.currentPage = 1;
    this.pageCursors = [];
    this.fetchData();
  }

  onAdminSchoolFormChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.holidayForm.get('AcademicYear')?.patchValue(sessionStorage.getItem('ActiveAcademicYearID') || '0');
    this.fetchAcademicYearsList(val === '0' ? '' : val);
  }

  // ── Calendar helpers ───────────────────────────────────────────────────────
  prevMonth() {
    if (this.calendarMonth === 0) { this.calendarMonth = 11; this.calendarYear--; }
    else this.calendarMonth--;
  }

  nextMonth() {
    if (this.calendarMonth === 11) { this.calendarMonth = 0; this.calendarYear++; }
    else this.calendarMonth++;
  }

  getCalendarDays(): (Date | null)[] {
    const firstDay = new Date(this.calendarYear, this.calendarMonth, 1).getDay();
    const daysInMonth = new Date(this.calendarYear, this.calendarMonth + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(this.calendarYear, this.calendarMonth, d));
    return cells;
  }

  getHolidaysForDay(date: Date): any[] {
    return this.holidayList.filter(h => {
      if (!h.FromDate || !h.ToDate) return false;
      if (!h.IsActive && !this.showInactive) return false;
      const from = new Date(h.FromDate); from.setHours(0,0,0,0);
      const to   = new Date(h.ToDate);   to.setHours(23,59,59,999);
      const d    = new Date(date);       d.setHours(12,0,0,0);
      return d >= from && d <= to;
    });
  }

  isToday(date: Date): boolean {
    const t = new Date();
    return date.getDate() === t.getDate() &&
           date.getMonth() === t.getMonth() &&
           date.getFullYear() === t.getFullYear();
  }

  // ── Modals ─────────────────────────────────────────────────────────────────
  closeViewModal()   { this.isViewModalOpen = false; this.viewItem = null; }
  handleStatusOk()   { this.isStatusModalOpen = false; this.fetchData(); }
  closeStatusModal() { this.isStatusModalOpen = false; }

  toggleActive() { this.IsActiveStatus = !this.IsActiveStatus; }

  // ── Helpers ────────────────────────────────────────────────────────────────
  toInputDate(val: any): string {
    if (!val) return '';
    const d = new Date(val);
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
  }

  formatDate(val: any): string {
    if (!val) return '';
    const d = new Date(val);
    return `${d.getDate().toString().padStart(2,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
  }
}
