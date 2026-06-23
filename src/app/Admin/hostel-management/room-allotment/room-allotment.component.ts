import { Component, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { LoaderService } from '../../../Services/loader.service';
import { RoomAllotmentService } from './room-allotment.service';
import { RoomAllotment } from './room-allotment.model';

@Component({
  selector: 'app-room-allotment',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './room-allotment.component.html',
  styleUrls: ['./room-allotment.component.css']
})
/**
 * Class Responsibility: Handles view logic and user interactions for RoomAllotmentComponent.
 */
export class RoomAllotmentComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Room Allotment';

  // ── UI state ────────────────────────────────────────────────
  // ── UI state ────────────────────────────────────────────────
  IsAddNewClicked = false;
  ViewRoomClicked = false;
  isViewModalOpen = false;
  isStatusModalOpen = false;

  // ── Table data ──────────────────────────────────────────────
  AllotmentList: any[] = [];
  AllotmentCount = 0;

  // ── Stats ───────────────────────────────────────────────────
  TotalAllotments = 0;
  ActiveAllotments = 0;

  // ── Pagination ──────────────────────────────────────────────
  currentPage = 1;
  pageSize = 10;
  visiblePageCount = 3;

  // ── Filter / search ─────────────────────────────────────────
  searchQuery = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;

  // ── Status message ───────────────────────────────────────────
  statusMessage = '';

  // ── View record ─────────────────────────────────────────────
  viewRecord: any = null;

  // ── Dropdowns ────────────────────────────────────────────────
  schoolList: any[] = [];
  academicYearList: any[] = [];
  hostelList: any[] = [];
  roomList: any[] = [];
  studentList: any[] = [];
  // Maps StudentID → display name for table column lookup
  studentMap: Record<string, string> = {};

  // ── Filter / search ─────────────────────────────────────────
  filterSchoolID = '';
  filterAcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
  SchoolSelectionChange = false;

  // ── Session ──────────────────────────────────────────────────
  ActiveUserId = sessionStorage.getItem('email')?.toString() || '';

  // ── Form ─────────────────────────────────────────────────────
  AllotmentForm = new FormGroup({
    ID: new FormControl(0),
    School: new FormControl('0'),
    AcademicYear: new FormControl(sessionStorage.getItem('ActiveAcademicYearID') || '0', [Validators.required, Validators.pattern(/^(?!0$).*$/)]),
    HostelID: new FormControl('0', [Validators.required, Validators.pattern(/^(?!0$).*$/)]),
    RoomID: new FormControl('0', [Validators.required, Validators.pattern(/^(?!0$).*$/)]),
    StudentID: new FormControl('0', [Validators.required, Validators.pattern(/^(?!0$).*$/)]),
    AllotmentDate: new FormControl('', [Validators.required]),
    Remarks: new FormControl(''),
    IsActive: new FormControl(true)
  });

  constructor(
    router: Router,
    public loader: LoaderService,
    private apiurl: ApiServiceService,
    private allotmentService: RoomAllotmentService,
    menuService: MenuServiceService
  ) {
    super(menuService, router);
  }

  /**
   * Lifecycle hook: Initializes component parameters and loads default page datasets.
   */
  ngOnInit(): void {
    this.checkViewPermission();
    this.FetchSchoolsList();
    this.FetchAllotments();

    // Fetch hostels & students for non-admin automatically
    if (!this.isAdmin) {
      const schoolId = sessionStorage.getItem('SchoolID') || '';
      const activeYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
      this.FetchHostelsList(schoolId, activeYear);
      this.FetchAcademicYearsList(schoolId);
      this.FetchStudentList(schoolId, activeYear);
      this.AllotmentForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
  }

  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  // ══════════════════════════════════════════════════════════
  //  DATA FETCH HELPERS
  // ══════════════════════════════════════════════════════════

  /**
   * Executes the operation: FetchSchoolsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchSchoolsList() {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (res: any) => {
        this.schoolList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({ ID: i.id || i.ID, Name: i.name || i.Name }))
          : [];
      },
      error: () => { this.schoolList = []; }
    });
  }

  /**
   * Executes the operation: FetchAcademicYearsList
   * Parameters: schoolId: string
   * Rationale: Standard operational controller for the active view.
   */
  FetchAcademicYearsList(schoolId: string) {
    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: schoolId, Flag: '2' }).subscribe({
      next: (res: any) => {
        this.academicYearList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({ ID: i.id || i.ID, Name: i.name || i.Name }))
          : [];
      },
      error: () => { this.academicYearList = []; }
    });
  }

  /**
   * Executes the operation: FetchHostelsList
   * Parameters: schoolId: string, academicYearId?: string
   * Rationale: Standard operational controller for the active view.
   */
  FetchHostelsList(schoolId: string, academicYearId?: string) {
    this.hostelList = [];
    this.roomList = [];
    this.AllotmentForm.get('HostelID')?.patchValue('0');
    this.AllotmentForm.get('RoomID')?.patchValue('0');

    const requestData: any = { SchoolID: schoolId, Flag: '3' };
    if (academicYearId && academicYearId !== '0') {
      requestData.AcademicYear = academicYearId;
    }

    this.apiurl.post<any>('Tbl_HostelMaster_CRUD_Operations', requestData).subscribe({
      next: (res: any) => {
        this.hostelList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({ ID: i.id || i.ID, HostelName: i.hostelName || i.HostelName }))
          : [];
      },
      error: () => { this.hostelList = []; }
    });
  }

  /**
   * Executes the operation: FetchRoomsList
   * Parameters: hostelId: string, isEdit: boolean = false
   * Rationale: Standard operational controller for the active view.
   */
  FetchRoomsList(hostelId: string, isEdit: boolean = false) {
    this.roomList = [];
    if (!isEdit) this.AllotmentForm.get('RoomID')?.patchValue('0');

    if (!hostelId || hostelId === '0') return;

    this.apiurl.post<any>('Tbl_RoomMaster_CRUD_Operations', { HostelID: hostelId, Flag: '3' }).subscribe({
      next: (res: any) => {
        this.roomList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({
            ID: i.id || i.ID,
            RoomNumber: i.roomNumber || i.RoomNumber,
            BedCapacity: i.bedCapacity || i.BedCapacity || 0,
            AvailableBeds: i.availableBeds ?? i.AvailableBeds ?? 0
          }))
          : [];
      },
      error: () => { this.roomList = []; }
    });
  }

  /**
   * Executes the operation: FetchStudentList
   * Parameters: schoolId: string, academicYearId?: string
   * Rationale: Standard operational controller for the active view.
   */
  FetchStudentList(schoolId: string, academicYearId?: string) {
    this.studentList = [];
    if (!schoolId) return;

    const payload: any = {
      SchoolID: schoolId,
      Flag: '2',
      Limit: 9999,
      Offset: 0
    };

    if (academicYearId && academicYearId !== '0') {
      payload.AcademicYear = academicYearId;
    }

    this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', payload).subscribe({
      next: (res: any) => {
        if (res?.data && Array.isArray(res.data)) {
          this.studentList = res.data.map((i: any) => {
            const adminNo = i.admissionNo || i.AdmissionNo || '';
            const intID = i.id || i.ID || '';
            const firstName = i.firstName ?? i.FirstName ?? '';
            const lastName = i.lastName ?? i.LastName ?? '';
            const fullName = `${firstName} ${lastName}`.trim();
            const display = `${fullName} (${adminNo})`;
            return { ID: adminNo, IntID: intID, Name: display, FullName: fullName };
          });
          this.studentMap = {};
          for (const s of this.studentList) {
            if (s.ID) this.studentMap[s.ID] = s.Name;
          }
        }
      },
      error: () => { this.studentList = []; this.studentMap = {}; }
    });
  }

  /**
   * Executes the operation: FetchAllotments
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchAllotments() {
    this.loader.show();
    const payload: any = {
      Flag: this.searchQuery.trim() ? '7' : '2',
      SchoolID: this.filterSchoolID || null,
      AcademicYear: this.filterAcademicYear || null,
      Limit: this.pageSize,
      Offset: (this.currentPage - 1) * this.pageSize
    };
    if (this.searchQuery.trim()) {
      payload.SearchQuery = this.searchQuery.trim();
    }
    this.allotmentService.crudOperations(payload).subscribe({
      next: (res: any) => {
        const data: any[] = res?.data || [];
        this.mapAllotments(data);
        this.loader.hide();
      },
      error: () => {
        this.AllotmentList = [];
        this.AllotmentCount = 0;
        this.loader.hide();
      }
    });
  }

  /**
   * Executes the operation: mapAllotments
   * Parameters: data: any[]
   * Rationale: Standard operational controller for the active view.
   */
  mapAllotments(data: any[]) {
    this.ActiveAllotments = 0;
    this.AllotmentList = data.map((item: any) => {
      const isActive = ['1', 1, true, 'True', 'true', 'Active'].includes(item.isActive ?? item.IsActive);
      if (isActive) this.ActiveAllotments++;
      const studentID = item.studentID || item.StudentID || '';
      const joinedName = item.studentName || item.StudentName || '';
      const resolvedName = joinedName || this.studentMap[studentID] || '';
      return {
        ID: item.id || item.ID,
        SchoolID: item.schoolID || item.SchoolID,
        AcademicYear: item.academicYear || item.AcademicYear,
        HostelID: item.hostelID || item.HostelID,
        RoomID: item.roomID || item.RoomID,
        StudentID: studentID,
        AllotmentDate: item.allotmentDate || item.AllotmentDate,
        Remarks: item.remarks || item.Remarks,
        IsActive: isActive ? 'Active' : 'Inactive',
        HostelName: item.hostelName || item.HostelName,
        RoomNumber: item.roomNumber || item.RoomNumber,
        BedCapacity: item.bedCapacity || item.BedCapacity,
        OccupiedBeds: item.occupiedBeds || item.OccupiedBeds,
        AvailableBeds: item.availableBeds || item.AvailableBeds,
        SchoolName: item.schoolName || item.SchoolName,
        AcademicYearName: item.academicYearName || item.AcademicYearName,
        StudentName: item.studentName || item.StudentName || '',
        AdmissionNo: studentID,
        DisplayStudent: (item.studentName || item.StudentName || resolvedName) + ' (' + studentID + ')'
      };
    });
    this.AllotmentCount = data.length > 0 && data[0]?.totalCount
      ? Number(data[0].totalCount)
      : data.length < this.pageSize
        ? (this.currentPage - 1) * this.pageSize + data.length
        : this.AllotmentCount || data.length;
    this.TotalAllotments = this.AllotmentCount;
  }

  /**
   * Executes the operation: AddNewClicked
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  AddNewClicked() {
    this.AllotmentForm.reset();
    this.AllotmentForm.patchValue({
      ID: 0,
      School: '0',
      AcademicYear: sessionStorage.getItem('ActiveAcademicYearID') || '0',
      HostelID: '0',
      RoomID: '0',
      StudentID: '0',
      AllotmentDate: new Date().toISOString().split('T')[0],
      IsActive: true
    });
    if (!this.isAdmin) {
      this.AllotmentForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
    this.roomList = [];
    this.hostelList = [];
    if (this.isAdmin) {
      this.AllotmentForm.get('School')?.setValidators([Validators.required]);
    } else {
      this.AllotmentForm.get('School')?.clearValidators();
      const schoolId = sessionStorage.getItem('SchoolID') || '';
      const activeYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
      this.FetchHostelsList(schoolId, activeYear);
      this.FetchStudentList(schoolId, activeYear);
    }
    this.AllotmentForm.get('School')?.updateValueAndValidity();

    this.IsAddNewClicked = !this.IsAddNewClicked;
    this.ViewRoomClicked = false;
  }

  /**
   * Executes the operation: editRecord
   * Parameters: record: any
   * Rationale: Standard operational controller for the active view.
   */
  editRecord(record: any) {
    this.AllotmentForm.reset();
    const schoolId = record.SchoolID || record.schoolID;
    const academicYearId = record.AcademicYear || record.academicYear;
    this.FetchAcademicYearsList(schoolId);
    this.FetchHostelsList(schoolId, academicYearId);
    this.FetchStudentList(schoolId, academicYearId);
    this.FetchRoomsList(record.HostelID || record.hostelID, true);
    this.AllotmentForm.patchValue({
      ID: record.ID || record.id,
      School: schoolId,
      AcademicYear: record.AcademicYear || record.academicYear,
      HostelID: record.HostelID || record.hostelID,
      RoomID: record.RoomID || record.roomID,
      StudentID: record.StudentID || record.studentID,
      AllotmentDate: this.getRawDate(record.AllotmentDate || record.allotmentDate),
      Remarks: record.Remarks || record.remarks,
      IsActive: ['Active', '1', 1, true].includes(record.IsActive || record.isActive)
    });
    if (!this.isAdmin) {
      this.AllotmentForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
    if (this.isAdmin) {
      this.AllotmentForm.get('School')?.setValidators([Validators.required]);
    } else {
      this.AllotmentForm.get('School')?.clearValidators();
    }
    this.AllotmentForm.get('School')?.updateValueAndValidity();

    this.IsAddNewClicked = true;
    this.ViewRoomClicked = true;
  }

  /**
   * Executes the operation: onAdminSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminSchoolChange(event: Event) {
    const schoolId = (event.target as HTMLSelectElement).value;
    this.studentList = [];
    this.studentMap = {};
    this.AllotmentForm.get('AcademicYear')?.patchValue(sessionStorage.getItem('ActiveAcademicYearID') || '0');
    this.AllotmentForm.get('StudentID')?.patchValue('0');
    this.AllotmentForm.get('HostelID')?.patchValue('0');
    this.AllotmentForm.get('RoomID')?.patchValue('0');
    if (schoolId && schoolId !== '0') {
      const activeYear = sessionStorage.getItem('ActiveAcademicYearID') || '0';
      this.FetchAcademicYearsList(schoolId);
      this.FetchHostelsList(schoolId, activeYear);
      this.FetchStudentList(schoolId, activeYear);
    }
  }

  /**
   * Executes the operation: onAcademicYearChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAcademicYearChange(event: Event) {
    const yearId = (event.target as HTMLSelectElement).value;
    const schoolId = this.isAdmin
      ? this.AllotmentForm.get('School')?.value
      : sessionStorage.getItem('SchoolID');
    this.AllotmentForm.get('StudentID')?.patchValue('0');
    this.AllotmentForm.get('HostelID')?.patchValue('0');
    this.AllotmentForm.get('RoomID')?.patchValue('0');
    if (schoolId && schoolId !== '0' && yearId && yearId !== '0') {
      this.FetchHostelsList(schoolId, yearId);
      this.FetchStudentList(schoolId, yearId);
    } else {
      this.hostelList = [];
      this.studentList = [];
    }
  }

  /**
   * Executes the operation: onHostelChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onHostelChange(event: Event) {
    const hostelId = (event.target as HTMLSelectElement).value;
    this.FetchRoomsList(hostelId);
  }

  /**
   * Executes the operation: SubmitAllotment
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  SubmitAllotment() {
    const fv = this.AllotmentForm.getRawValue();
    const isInvalid = this.AllotmentForm.invalid ||
      fv.AcademicYear === '0' ||
      fv.HostelID === '0' ||
      fv.RoomID === '0' ||
      fv.StudentID === '0' ||
      (this.isAdmin && fv.School === '0');
    if (isInvalid) {
      this.AllotmentForm.markAllAsTouched();
      this.statusMessage = 'Please fill all required fields.';
      this.isStatusModalOpen = true;
      return;
    }
    const isUpdate = fv.ID && fv.ID !== 0;
    const schoolId = this.isAdmin ? (fv.School || '') : (sessionStorage.getItem('SchoolID') || '');

    // Format Date as YYYY-MM-DD
    const allotmentDate = this.getRawDate(fv.AllotmentDate);

    const payload: any = {
      Flag: isUpdate ? '5' : '1',
      ID: isUpdate ? String(fv.ID) : undefined,
      SchoolID: schoolId,
      AcademicYear: fv.AcademicYear || '',
      HostelID: fv.HostelID || '',
      RoomID: fv.RoomID || '',
      StudentID: fv.StudentID || '',
      AllotmentDate: allotmentDate,
      Remarks: fv.Remarks || '',
      IsActive: fv.IsActive ? '1' : '0',
      CreatedBy: isUpdate ? undefined : this.ActiveUserId,
      ModifiedBy: isUpdate ? this.ActiveUserId : undefined
    };

    if (!this.isAdmin) {
      payload.AcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
    }

    this.loader.show();
    this.allotmentService.crudOperations(payload).subscribe({
      next: (res: any) => {
        this.loader.hide();
        if (res?.success || res?.statusCode === 200 || (res?.message && !res.message.toLowerCase().includes('fail'))) {
          this.IsAddNewClicked = false;
          const successMsg = isUpdate ? 'Room Allotment updated successfully!' : 'Room Allotment saved successfully!';
          this.statusMessage = (res?.message && res.message !== 'No data found.') ? res.message : successMsg;
          this.isStatusModalOpen = true;
          this.currentPage = 1;
          this.FetchAllotments();
        } else {
          this.statusMessage = res?.message || 'Failed to save allotment.';
          this.isStatusModalOpen = true;
        }
      },
      error: (err: any) => {
        this.loader.hide();
        this.statusMessage = err?.error?.message || 'Unexpected error. Please try again.';
        this.isStatusModalOpen = true;
      }
    });
  }

  /**
   * Executes the operation: toggleStatus
   * Parameters: item: any
   * Rationale: Standard operational controller for the active view.
   */
  toggleStatus(item: any) {
    const isCurrentlyActive = ['Active', '1', 1, true].includes(item.IsActive);
    const payload: any = {
      Flag: '5',
      ID: String(item.ID),
      SchoolID: item.SchoolID,
      AcademicYear: item.AcademicYear,
      HostelID: item.HostelID,
      RoomID: item.RoomID,
      StudentID: item.StudentID,
      AllotmentDate: this.getRawDate(item.AllotmentDate),
      Remarks: item.Remarks || '',
      IsActive: isCurrentlyActive ? '0' : '1',
      ModifiedBy: this.ActiveUserId
    };
    this.loader.show();
    this.allotmentService.crudOperations(payload).subscribe({
      next: (res: any) => {
        this.loader.hide();
        this.FetchAllotments();
      },
      error: () => { this.loader.hide(); }
    });
  }

  /**
   * Executes the operation: viewRecord_
   * Parameters: record: any
   * Rationale: Standard operational controller for the active view.
   */
  viewRecord_(record: any) {
    this.viewRecord = record;
    this.isViewModalOpen = true;
  }

  /**
   * Executes the operation: onFilterSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onFilterSchoolChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.filterSchoolID = val === '0' ? '' : val;
    this.SchoolSelectionChange = true;
    if (this.filterSchoolID) {
      this.FetchAcademicYearsList(this.filterSchoolID);
      this.FetchStudentList(this.filterSchoolID);
    } else {
      this.academicYearList = [];
      this.studentList = [];
      this.studentMap = {};
    }
    this.filterAcademicYear = '';
    this.currentPage = 1;
    this.FetchAllotments();
  }

  /**
   * Executes the operation: onFilterYearChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onFilterYearChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.filterAcademicYear = val === '0' ? '' : val;
    this.currentPage = 1;
    this.FetchAllotments();
  }

  /**
   * Executes the operation: onSearchChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  onSearchChange() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      const value = this.searchQuery?.trim() || '';
      if (value.length === 0) {
        this.currentPage = 1;
        this.FetchAllotments();
        return;
      }
      if (value.length < this.SEARCH_MIN_LENGTH) return;
      this.currentPage = 1;
      this.FetchAllotments();
    }, this.SEARCH_DEBOUNCE);
  }

  /**
   * Executes the operation: totalPages
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  totalPages(): number {
    return Math.max(1, Math.ceil(this.AllotmentCount / this.pageSize));
  }

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
    this.FetchAllotments();
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
  getVisiblePageNumbers(): number[] {
    const total = this.totalPages();
    const pages: number[] = [];
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, total);
    if (end - start < this.visiblePageCount - 1) {
      start = Math.max(end - this.visiblePageCount + 1, 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  /**
   * Executes the operation: pageStartIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageStartIndex(): number { return this.AllotmentCount === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  /**
   * Executes the operation: pageEndIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageEndIndex(): number { return Math.min(this.currentPage * this.pageSize, this.AllotmentCount); }

  /**
   * Executes the operation: onRowsCountChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  onRowsCountChange() {
    this.currentPage = 1;
    this.FetchAllotments();
  }

  /**
   * Executes the operation: closeFormModal
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  closeFormModal() { this.IsAddNewClicked = false; }
  /**
   * Executes the operation: closeViewModal
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  closeViewModal() { this.isViewModalOpen = false; this.viewRecord = null; }
  /**
   * Executes the operation: closeStatusModal
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  closeStatusModal() { this.isStatusModalOpen = false; }
  /**
   * Executes the operation: handleOk
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  handleOk() { this.isStatusModalOpen = false; this.FetchAllotments(); }

  /**
   * Executes the operation: formatDate
   * Parameters: dateStr: string | null | undefined
   * Rationale: Standard operational controller for the active view.
   */
  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    const raw = this.getRawDate(dateStr);
    if (!raw) return dateStr;
    try {
      const [y, m, d] = raw.split('-');
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  }

  /**
   * Executes the operation: getRawDate
   * Parameters: dateStr: any
   * Rationale: Standard operational controller for the active view.
   */
  getRawDate(dateStr: any): string {
    if (!dateStr) return '';
    try {
      let d: Date;
      if (typeof dateStr === 'string') {
        const parts = dateStr.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 2 && parts[2].length === 4) {
            d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else { d = new Date(dateStr); }
        } else { d = new Date(dateStr); }
      } else { d = new Date(dateStr); }
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch { return ''; }
  }
}
