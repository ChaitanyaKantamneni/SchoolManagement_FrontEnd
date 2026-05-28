import { Component, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf, NgStyle, CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { LoaderService } from '../../../Services/loader.service';
import { OutPassService } from './out-pass.service';
import { OutPass } from './out-pass.model';
import { RoomAllotmentService } from '../room-allotment/room-allotment.service';

@Component({
  selector: 'app-out-pass',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './out-pass.component.html',
  styleUrls: ['./out-pass.component.css']
})
export class OutPassComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Outpass';

  // -- UI state --
  IsAddNewClicked = false;
  isStatusModalOpen = false;
  statusMessage = '';
  isViewModalOpen = false;
  viewRecord: any = null;

  // -- Table data --
  outPassList: any[] = [];
  totalCount = 0;

  // -- Stats --
  currentlyOutCount = 0;
  pendingCount = 0;
  expectedTodayCount = 0;

  Math = Math;

  // -- Pagination --
  currentPage = 1;
  pageSize = 10;
  visiblePageCount = 3;

  // -- Search --
  searchQuery = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;

  // -- Dropdowns --
  schoolList: any[] = [];
  academicYearList: any[] = [];
  studentList: any[] = [];
  studentMap: Record<string, string> = {};

  // -- Filters --
  filterSchoolID = '';
  filterAcademicYear = '';

  // -- Session --
  ActiveUserId = sessionStorage.getItem('email')?.toString() || '';

  // -- Form --
  OutPassForm = new FormGroup({
    ID: new FormControl('0'),
    School: new FormControl('0', [Validators.required, Validators.pattern(/^(?!0$).*$/)]),
    AcademicYear: new FormControl('0', [Validators.required, Validators.pattern(/^(?!0$).*$/)]),
    StudentID: new FormControl('0', [Validators.required, Validators.pattern(/^(?!0$).*$/)]),
    HostelID: new FormControl('0'),
    RoomID: new FormControl('0'),
    OutDateTime: new FormControl('', [Validators.required]),
    ExpectedReturnDateTime: new FormControl('', [Validators.required]),
    Destination: new FormControl('', [Validators.required, Validators.maxLength(500)]),
    Reason: new FormControl('', [Validators.required]),
    Remarks: new FormControl(''),
    Status: new FormControl('Pending')
  });

  constructor(
    router: Router,
    public loader: LoaderService,
    private apiurl: ApiServiceService,
    private outPassService: OutPassService,
    private roomAllotmentService: RoomAllotmentService,
    menuService: MenuServiceService
  ) {
    super(menuService, router);
  }

  ngOnInit(): void {
    this.checkViewPermission();
    this.FetchSchoolsList();
    this.FetchOutPassList();

    const schoolId = sessionStorage.getItem('SchoolID') || '';
    if (schoolId) {
      this.FetchAcademicYearsList(schoolId);
      this.FetchStudentDetailsForMap(schoolId, true);
    }
  }

  FetchStudentDetailsForMap(schoolId: string, fetchStudentList = false) {
    if (!schoolId) return;
    this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', { SchoolID: schoolId, Flag: '2', Limit: 9999, Offset: 0 }).subscribe({
      next: (res: any) => {
        if (res?.data && Array.isArray(res.data)) {
          res.data.forEach((i: any) => {
            const adminNo = i.admissionNo || i.AdmissionNo || '';
            const firstName = i.firstName || i.FirstName || '';
            const lastName = i.lastName || i.LastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            if (adminNo) {
              this.studentMap[adminNo] = fullName;
            }
          });
          
          this.mapOutPassListNames();
          
          if (fetchStudentList && schoolId) {
            const yearID = this.OutPassForm.get('AcademicYear')?.value || this.filterAcademicYear;
            this.FetchStudentList(schoolId, yearID);
          }
        }
      }
    });
  }

  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  // ------------------------------------------------------------
  // DATA FETCHING
  // ------------------------------------------------------------

  onFilterChange() {
    this.currentPage = 1;
    this.FetchOutPassList();
    if (this.filterSchoolID) {
      this.FetchAcademicYearsList(this.filterSchoolID);
      this.FetchStudentDetailsForMap(this.filterSchoolID, true);
    }
  }

  FetchSchoolsList() {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (res: any) => {
        this.schoolList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({ ID: i.id || i.ID, Name: i.name || i.Name }))
          : [];
      }
    });
  }

  FetchAcademicYearsList(schoolId: string) {
    if (!schoolId) return;
    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: schoolId, Flag: '2' }).subscribe({
      next: (res: any) => {
        this.academicYearList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({ ID: i.id || i.ID, Name: i.name || i.Name }))
          : [];
      }
    });
  }

  FetchStudentList(schoolId: string, academicYearId?: string) {
    this.studentList = [];
    if (!schoolId) return;

    const payload: any = { 
      SchoolID: schoolId, 
      Flag: '2', // Fetch All Room Allotments
      Limit: 9999, 
      Offset: 0 
    };
    if (academicYearId && academicYearId !== '0') payload.AcademicYear = academicYearId;

    this.roomAllotmentService.crudOperations(payload).subscribe({
      next: (res: any) => {
        if (res?.data && Array.isArray(res.data)) {
          this.studentList = res.data.map((i: any) => {
            const studentID = i.studentID || i.StudentID || '';
            const firstName = i.firstName || i.FirstName || '';
            const lastName = i.lastName || i.LastName || '';
            const joinedName = i.studentName || i.StudentName || '';
            const studentName = joinedName || this.studentMap[studentID] || `${firstName} ${lastName}`.trim() || 'N/A';
            
            const hostelName = i.hostelName || i.HostelName || '';
            const roomNo = i.roomNumber || i.RoomNumber || '';
            const hostelID = i.hostelID || i.HostelID || '';
            const roomID = i.roomID || i.RoomID || '';
            
            const display = `${studentName} (${studentID}) - ${hostelName} (Room: ${roomNo})`;
            
            return { 
              ID: studentID, 
              Name: display, 
              HostelID: hostelID,
              RoomID: roomID
            };
          });
        }
      }
    });
  }

  FetchOutPassList() {
    this.loader.show();
    const payload: any = {
      Flag: this.searchQuery.trim() ? '7' : '2',
      SchoolID: this.filterSchoolID || null,
      AcademicYear: this.filterAcademicYear || null,
      Destination: this.searchQuery.trim() || null, 
      Limit: this.pageSize,
      Offset: (this.currentPage - 1) * this.pageSize
    };

    this.outPassService.crudOperations(payload).subscribe({
      next: (res: any) => {
        const rawData = res?.data || [];
        this.outPassList = rawData;
        this.totalCount = this.outPassList.length > 0 && this.outPassList[0].totalcount 
          ? Number(this.outPassList[0].totalcount) 
          : this.outPassList.length;
        
        // Dynamically extract all unique school IDs present in outpass list and fetch student details for name mapping
        const uniqueSchoolIDs = new Set<string>();
        this.outPassList.forEach(item => {
          const schoolID = item.schoolID || item.SchoolID;
          if (schoolID && schoolID !== '0') {
            uniqueSchoolIDs.add(String(schoolID));
          }
        });

        if (uniqueSchoolIDs.size > 0) {
          uniqueSchoolIDs.forEach(schoolID => {
            this.FetchStudentDetailsForMap(schoolID, false);
          });
        } else {
          this.mapOutPassListNames();
        }

        this.UpdateStats();
        this.loader.hide();
      },
      error: () => {
        this.outPassList = [];
        this.totalCount = 0;
        this.loader.hide();
      }
    });
  }

  mapOutPassListNames() {
    if (this.outPassList && this.outPassList.length > 0) {
      this.outPassList.forEach(item => {
        const studentID = item.studentID || item.StudentID || '';
        const joinedName = item.studentName || item.StudentName || '';
        item.studentName = joinedName || this.studentMap[studentID] || '';
      });
    }
  }

  UpdateStats() {
    this.currentlyOutCount = this.outPassList.filter(o => (o.outPassStatus || o.status) === 'Approved').length;
    this.pendingCount = this.outPassList.filter(o => (o.outPassStatus || o.status) === 'Pending').length;
    
    const today = new Date().toISOString().split('T')[0];
    this.expectedTodayCount = this.outPassList.filter(o => {
      const returnDate = o.expectedReturnDateTime?.split(' ')[0];
      return returnDate === today;
    }).length;
  }

  // ------------------------------------------------------------
  // ACTIONS
  // ------------------------------------------------------------

  onModalSchoolChange() {
    const schoolID = this.OutPassForm.get('School')?.value;
    this.OutPassForm.patchValue({ AcademicYear: '0', StudentID: '0' });
    this.studentList = [];
    if (schoolID && schoolID !== '0') {
      this.FetchAcademicYearsList(schoolID);
      this.FetchStudentDetailsForMap(schoolID, true);
    }
  }

  onModalYearChange() {
    const schoolID = this.isAdmin ? this.OutPassForm.get('School')?.value : sessionStorage.getItem('SchoolID');
    const academicYearID = this.OutPassForm.get('AcademicYear')?.value;
    this.OutPassForm.patchValue({ StudentID: '0' });
    if (schoolID && schoolID !== '0' && academicYearID && academicYearID !== '0') {
      this.FetchStudentList(schoolID, academicYearID);
    }
  }

  AddNewClicked() {
    this.OutPassForm.reset();
    const schoolId = sessionStorage.getItem('SchoolID') || '0';
    const yearId = sessionStorage.getItem('AcademicYear') || '0';

    this.OutPassForm.patchValue({
      ID: '0',
      School: schoolId,
      AcademicYear: yearId,
      StudentID: '0',
      Status: 'Pending',
      OutDateTime: ''
    });

    if (this.isAdmin) {
      this.OutPassForm.get('School')?.setValidators([Validators.required, Validators.pattern(/^(?!0$).*$/)]);
    } else {
      this.OutPassForm.get('School')?.clearValidators();
    }
    this.OutPassForm.get('School')?.updateValueAndValidity();

    if (schoolId !== '0') {
      this.FetchAcademicYearsList(schoolId);
      this.FetchStudentDetailsForMap(schoolId, true);
    }

    this.IsAddNewClicked = true;
  }

  onStudentChange(event: Event) {
    const studentID = (event.target as HTMLSelectElement).value;
    const selectedStudent = this.studentList.find(s => s.ID === studentID);
    if (selectedStudent) {
      this.OutPassForm.patchValue({
        HostelID: selectedStudent.HostelID,
        RoomID: selectedStudent.RoomID
      });
    }
  }

  SubmitOutPass() {
    if (this.OutPassForm.invalid || this.OutPassForm.value.StudentID === '0') {
      this.OutPassForm.markAllAsTouched();
      this.statusMessage = 'Please fill all required fields correctly.';
      this.isStatusModalOpen = true;
      return;
    }

    const fv = this.OutPassForm.getRawValue();
    const isUpdate = fv.ID !== '0';

    const payload: any = {
      Flag: isUpdate ? '5' : '1',
      ID: isUpdate ? fv.ID : '0',
      SchoolID: fv.School,
      AcademicYear: fv.AcademicYear,
      StudentID: fv.StudentID,
      HostelID: fv.HostelID,
      RoomID: fv.RoomID,
      OutDateTime: fv.OutDateTime,
      ExpectedReturnDateTime: fv.ExpectedReturnDateTime,
      ActualReturnDateTime: null,
      Destination: fv.Destination,
      Reason: fv.Reason,
      OutPassStatus: fv.Status || 'Pending',
      ApprovedBy: null,
      ApprovedDate: null,
      Remarks: fv.Remarks || '',
      IsActive: '1',
      CreatedBy: this.ActiveUserId,
      CreatedIp: '127.0.0.1',
      ModifiedBy: isUpdate ? this.ActiveUserId : null,
      ModifiedIp: isUpdate ? '127.0.0.1' : null
    };

    this.loader.show();
    this.outPassService.crudOperations(payload).subscribe({
      next: (res: any) => {
        this.loader.hide();
        if (res?.success || res?.statusCode === 200) {
          this.IsAddNewClicked = false;
          this.statusMessage = res?.message || 'Application submitted successfully!';
          this.isStatusModalOpen = true;
          this.FetchOutPassList();
        } else {
          this.statusMessage = res?.message || 'Failed to submit application.';
          this.isStatusModalOpen = true;
        }
      },
      error: (err) => {
        this.loader.hide();
        this.statusMessage = err?.error?.message || 'Error occurred. Please try again.';
        this.isStatusModalOpen = true;
      }
    });
  }

  updateStatus(item: any, newStatus: string) {
    const payload: any = {
      Flag: '5',
      ID: item.id || item.ID,
      OutPassStatus: newStatus,
      ApprovedBy: newStatus === 'Approved' ? this.ActiveUserId : null,
      ApprovedDate: newStatus === 'Approved' ? new Date().toISOString() : null,
      ActualReturnDateTime: newStatus === 'Returned' ? new Date().toISOString() : null,
      Remarks: item.remarks || item.Remarks || '',
      IsActive: '1',
      ModifiedBy: this.ActiveUserId,
      ModifiedIp: '127.0.0.1'
    };

    this.loader.show();
    this.outPassService.crudOperations(payload).subscribe({
      next: (res: any) => {
        this.loader.hide();
        this.FetchOutPassList();
      },
      error: () => this.loader.hide()
    });
  }

  viewRecordDetails(record: any) {
    this.viewRecord = record;
    this.isViewModalOpen = true;
  }

  // ------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------

  onSearchChange() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.currentPage = 1;
      this.FetchOutPassList();
    }, this.SEARCH_DEBOUNCE);
  }

  getStatusBackground(status: string | null | undefined): string {
    switch (status?.toLowerCase()) {
      case 'pending': return 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
      case 'approved': return 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)';
      case 'returned': return 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
      case 'rejected': return 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)';
      default: return 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
    }
  }

  getStatusColor(status: string | null | undefined): string {
    switch (status?.toLowerCase()) {
      case 'pending': return '#b45309';
      case 'approved': return '#0369a1';
      case 'returned': return '#166534';
      case 'rejected': return '#9f1239';
      default: return '#475569';
    }
  }

  getStatusBorderColor(status: string | null | undefined): string {
    switch (status?.toLowerCase()) {
      case 'pending': return '#fde047';
      case 'approved': return '#7dd3fc';
      case 'returned': return '#86efac';
      case 'rejected': return '#fda4af';
      default: return '#cbd5e1';
    }
  }

  formatDateTime(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  goToPage(page: number) {
    const total = this.totalPages();
    if (page < 1) page = 1;
    if (page > total) page = total;
    this.currentPage = page;
    this.FetchOutPassList();
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages()) {
      this.goToPage(this.currentPage + 1);
    }
  }

  getVisiblePageNumbers(): number[] {
    const total = this.totalPages();
    const pages: number[] = [];
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, total);
    if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  closeForm() { 
    this.IsAddNewClicked = false; 
  }

  closeStatusModal() { 
    this.isStatusModalOpen = false; 
  }

  closeViewModal() {
    this.isViewModalOpen = false;
    this.viewRecord = null;
  }

  handleOk() {
    this.isStatusModalOpen = false;
    this.FetchOutPassList();
  }
}
