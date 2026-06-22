import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { LoaderService } from '../../../Services/loader.service';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { MatIconModule } from '@angular/material/icon';
import { NgxEchartsModule } from 'ngx-echarts';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

type FeeDetailRow = {
  feeCategoryName: string;
  totalAmount: number;
  paidAmount: number;
  discount: number;
  installment: number;
  dueAmount: number;
  fine: number;
};

type AttendanceDetailRow = {
  attendanceDate: string;
  attendanceDateTime: string;
  session: string;
  status: 'Present' | 'Absent';
  remark: string;
  lateMinutes: number;
};

type TransportDetailView = {
  routeName: string;
  stopName: string;
  busName: string;
  fareName: string;
  startDate: string;
};

@Component({
  selector: 'app-students-report',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, FormsModule, DashboardTopNavComponent, MatIconModule, NgxEchartsModule],
  templateUrl: './students-report.component.html',
  styleUrl: './students-report.component.css'
})
export class StudentsReportComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Student Report';

  // ── session helpers ──────────────────────────────────────────────────────────
  public ss(key: string) {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
  }

  // Dynamic Role Getters based on Names
  get currentRoleName(): string { return (this.ss('roleName') || this.ss('RoleName') || this.ss('rollName') || this.ss('RollName') || '').trim(); }
  get currentRollID(): string { return (this.ss('RollID') || this.ss('rollID') || this.ss('menuRoleId') || this.ss('RoleID') || '').trim(); }

  protected override get isAdmin(): boolean { return this.currentRollID === '1'; }

  // In this project, School Admin/Principal is '2' or '8'.
  get isSchoolAdmin(): boolean {
    const r = this.currentRoleName.toLowerCase();
    const id = this.currentRollID;
    return !this.isAdmin && (id === '2' || id === '8' || r.includes('admin') || r.includes('principal') || r.includes('management'));
  }

  get isTeacher(): boolean {
    const r = this.currentRoleName.toLowerCase();
    const id = this.currentRollID;
    return id === '3' || r.includes('teacher') || r.includes('teaching');
  }

  get isParent(): boolean {
    const r = this.currentRoleName.toLowerCase();
    return this.currentRollID === '6' || r.includes('parent');
  }

  get isStaff(): boolean {
    const r = this.currentRoleName.toLowerCase();
    const id = this.currentRollID;
    return !this.isAdmin && !this.isSchoolAdmin && !this.isParent && (id === '3' || id === '4' || id === '7' || r.includes('staff') || r.includes('driver') || r.includes('accountant') || r.includes('maid'));
  }

  public get resolvedSchoolId(): string {
    const keys = ['SchoolID', 'schoolId', 'schoolID', 'SchoolId', 'sId', 'sid', 'SID', 'SId', 'school_id', 'School_Id', 'user_school_id'];
    for (const k of keys) {
      const val = this.ss(k);
      if (val && val !== '0' && val !== 'null' && val !== 'undefined' && !isNaN(Number(val))) {
        return val.toString().trim();
      }
    }
    return this.selectedSchoolID || '';
  }

  // List
  Math = Math;
  resolvedStaffId: string = '';
  teacherAssignedClassID: string = '';
  teacherAssignedDivisionID: string = '';

  private get sessionApplicantId(): string {
    const keys = ['StaffID', 'staffId', 'StaffId', 'UserID', 'userId', 'UserId', 'user_id', 'id', 'ID'];
    for (const k of keys) {
      const val = this.ss(k);
      if (val && val !== '0' && val !== 'null' && val !== 'undefined' && !isNaN(Number(val))) {
        return val.toString().trim();
      }
    }
    return '';
  }

  get currentUserId(): string {
    return this.resolvedStaffId || this.sessionApplicantId || this.ss('StaffID') || this.ss('UserID');
  }

  public resolveStaffIdentity(onDone?: () => void): void {
    const schoolId = this.getCurrentSchoolId();
    const email = (this.ss('email') || this.ss('Email') || '').toString().trim().toLowerCase();

    if (!schoolId || !email) {
      onDone?.();
      return;
    }

    this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId
    }).subscribe({
      next: (res: any) => {
        const list = res?.data || [];
        const match = list.find((s: any) => (s.email || s.Email || '').toLowerCase() === email);
        if (match) {
          this.resolvedStaffId = String(match.id || match.ID);
          console.log('[STUDENT REPORT] Resolved Teacher StaffID:', this.resolvedStaffId);
        }
      },
      complete: () => {
        if (this.isTeacher) {
          this.syncTeacherClassDivisionFromAllocation(onDone);
        } else {
          onDone?.();
        }
      },
      error: () => onDone?.()
    });
  }

  public syncTeacherClassDivisionFromAllocation(onDone?: () => void): void {
    if (!this.isTeacher) {
      onDone?.();
      return;
    }

    const AcademicYearIdSelected = this.selectedAcademicYear || sessionStorage.getItem('ActiveAcademicYearID') || '';
    const schoolId = this.getCurrentSchoolId();
    const staffId = this.currentUserId || '';

    if (!schoolId || !AcademicYearIdSelected || !staffId) {
      onDone?.();
      return;
    }

    this.apiurl.post<any>('Tbl_AllotClassTeacher_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: AcademicYearIdSelected,
      ClassTeacher: staffId
    }).subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const currentStaff = String(staffId).trim();
        const match = rows.find((x: any) =>
          String(x?.classTeacher ?? x?.ClassTeacher).trim() === currentStaff
        ) || rows[0];

        if (!match) return;

        const classId = String(match?.class ?? match?.Class).trim();
        const divisionId = String(match?.division ?? match?.Division).trim();

        if (classId) {
          this.teacherAssignedClassID = classId;
          this.selectedClass = classId;
        }

        if (divisionId) {
          this.teacherAssignedDivisionID = divisionId;
          this.selectedDivision = divisionId;
        }
      },
      complete: () => onDone?.(),
      error: () => onDone?.()
    });
  }

  // List
  studentsList: any[] = [];
  totalCount = 0;
  searchQuery = '';
  private searchTimer: any;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  visiblePageCount = 3;

  // Sort
  sortColumn = 'AdmissionNo';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Filters
  schoolList: any[] = [];
  academicYearList: any[] = [];
  ClassList: any[] = [];
  DivisionList: any[] = [];
  selectedSchoolID = '';
  selectedAcademicYear = '';
  selectedClass = '';
  selectedDivision = '';

  // Parent children list
  parentChildren: Array<{ ID: string; AdmissionNo: string; Name: string; Class: string; Division: string; SchoolID: string }> = [];

  // Detail view
  selectedStudent: any = null;
  parentDetails: any = null;
  addressDetails: any = null;
  transportDetails: any = null;
  feeDetails: FeeDetailRow[] = [];
  attendanceDetails: AttendanceDetailRow[] = [];
  attendanceSummary = {
    workingDays: 0,
    present: 0,
    absent: 0,
    presentPercentage: 0,
    absentPercentage: 0
  };
  attendanceChartOptions: any = null;
  isDetailView = false;

  readonly bloodGroups: Record<string, string> = { '1': 'A+', '2': 'A-', '3': 'B+', '4': 'B-', '5': 'O+', '6': 'O-', '7': 'AB+', '8': 'AB-' };
  readonly genderMap: Record<string, string> = { '1': 'Male', '2': 'Female', '3': 'Others' };
  readonly religionMap: Record<string, string> = { '1': 'Hindu', '2': 'Muslim', '3': 'Christian' };

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

    if (this.isAdmin) {
      this.fetchSchoolsList();
    } else {
      // Robust school ID resolution from all possible session/local keys for non-admin users
      const possibleKeys = ['SchoolID', 'schoolId', 'schoolID', 'SchoolId', 'sId', 'sid', 'SID', 'SId', 'school_id', 'user_school_id'];
      let resolvedId = '';

      for (const key of possibleKeys) {
        const val = this.ss(key)?.toString().trim();
        if (val && val !== '0' && val !== 'null' && val !== 'undefined' && !isNaN(Number(val))) {
          resolvedId = val;
          break;
        }
      }

      this.selectedSchoolID = resolvedId;

      // Fallback: If we have a name but no numeric ID, fetch schools to match
      const sName = (this.ss('schoolName') || this.ss('schoolname') || this.ss('SchoolName') || '').toString().trim();
      if (!this.selectedSchoolID && sName) {
        this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe(res => {
          const list = res?.data || [];
          const match = list.find((s: any) =>
            (s.name && s.name.toLowerCase() === sName.toLowerCase()) ||
            (s.Name && s.Name.toLowerCase() === sName.toLowerCase())
          );
          if (match) {
            this.selectedSchoolID = String(match.id || match.ID);
            if (this.selectedSchoolID && this.selectedSchoolID !== '0') {
              this.fetchAcademicYearsList();
              this.fetchClassList();
              if (this.isTeacher) {
                this.selectedAcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
                this.resolveStaffIdentity(() => {
                  this.fetchStudents();
                });
              } else {
                this.fetchStudents();
              }
            }
          }
        });
      }
    }

    this.fetchAcademicYearsList();
    this.fetchClassList();

    if (this.isTeacher) {
      this.selectedAcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
      this.resolveStaffIdentity(() => {
        this.fetchStudents();
      });
    } else if (this.isParent) {
      this.fetchParentChildren();
    } else {
      this.fetchStudents();
    }
  }

  private getCurrentSchoolId(): string {
    if (this.isAdmin) {
      return this.selectedSchoolID || '';
    }
    return this.resolvedSchoolId;
  }

  private safePost<T = any>(endpoint: string, payload: any) {
    return this.apiurl.post<T>(endpoint, payload).pipe(
      catchError(() => of({ data: [] } as T))
    );
  }

  fetchSchoolsList() {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (res: any) => {
        this.schoolList = (res?.data || []).map((item: any) => ({ ID: item.id, Name: item.name }));
      }
    });
  }

  onSchoolChange() {
    this.selectedAcademicYear = '';
    this.selectedClass = '';
    this.selectedDivision = '';
    this.academicYearList = [];
    this.ClassList = [];
    this.DivisionList = [];
    this.fetchAcademicYearsList();
    this.resetPagination();
    this.fetchStudents();
  }

  fetchAcademicYearsList() {
    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: this.selectedSchoolID || '', Flag: '2' }).subscribe({
      next: (res: any) => {
        this.academicYearList = (res?.data || []).map((item: any) => ({ ID: item.id, Name: item.name }));
      }
    });
  }

  onAcademicYearChange() {
    this.selectedClass = '';
    this.selectedDivision = '';
    this.ClassList = [];
    this.DivisionList = [];
    this.fetchClassList();
    this.resetPagination();

    // Fetch parent children when academic year changes
    if (this.isTeacher) {
      this.syncTeacherClassDivisionFromAllocation(() => {
        this.fetchStudents();
      });
    } else if (this.isParent && this.selectedAcademicYear) {
      this.fetchParentChildren();
    } else {
      this.fetchStudents();
    }
  }

  fetchClassList() {
    this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', { Flag: '9' }).subscribe({
      next: (res: any) => {
        this.ClassList = (res?.data || []).map((item: any) => ({
          ID: item.sNo?.toString(),
          Name: item.syllabusClassName
        }));
      }
    });
  }

  onClassChange() {
    this.selectedDivision = '';
    this.DivisionList = [];
    if (this.selectedClass) {
      this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', { Class: this.selectedClass, Flag: '11' }).subscribe({
        next: (res: any) => {
          this.DivisionList = (res?.data || []).map((item: any) => ({ ID: item.id, Name: item.name }));
        }
      });
    }
    this.resetPagination();
    this.fetchStudents();
  }

  onDivisionChange() {
    this.resetPagination();
    this.fetchStudents();
  }

  onSearchChange() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.resetPagination();
      this.fetchStudents();
    }, 300);
  }

  allStudentsList: any[] = [];

  private resetPagination() {
    this.currentPage = 1;
  }

  fetchStudents(extra: any = {}) {
    // For parents, wait for parentChildren to be loaded before fetching students
    if (this.isParent && this.parentChildren.length === 0) {
      return; // Will be called after fetchParentChildren completes
    }

    this.loader.show();

    // For parents, filter to only show their children
    if (this.isParent && this.parentChildren.length > 0) {
      const childrenAdmissionNos = this.parentChildren.map(c => c.AdmissionNo);
      const payload: any = {
        Flag: '7',
        AdmissionNo: childrenAdmissionNos.join(','),
        Limit: 10000,
        Offset: 0
      };

      this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', payload).subscribe({
        next: (res: any) => {
          const data = res?.data || [];
          this.processStudentData(data);
          this.loader.hide();
        },
        error: () => { this.handleFetchError(); }
      });
      return;
    }

    // For non-admin users, always use their resolved school ID
    const schoolIdToUse = this.isAdmin ? this.selectedSchoolID : this.resolvedSchoolId;

    const payload: any = {
      Flag: this.searchQuery?.trim() ? '7' : '2',
      Limit: 10000,
      Offset: 0,
      ...extra
    };
    if (schoolIdToUse) payload.SchoolID = schoolIdToUse;
    if (this.selectedAcademicYear) payload.AcademicYear = this.selectedAcademicYear;
    
    if (this.isTeacher) {
      payload.Class = this.teacherAssignedClassID || this.selectedClass;
      payload.Division = this.teacherAssignedDivisionID || this.selectedDivision;
    } else {
      if (this.selectedClass) payload.Class = this.selectedClass;
      if (this.selectedDivision) payload.Division = this.selectedDivision;
    }
    
    if (this.searchQuery?.trim()) payload.AdmissionNo = this.searchQuery.trim();

    this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', payload).subscribe({
      next: (res: any) => {
        const data = res?.data || [];
        this.processStudentData(data);
        this.loader.hide();
      },
      error: () => { this.handleFetchError(); }
    });
  }

  private processStudentData(data: any[]) {
    let filtered = data;
    if (this.isTeacher) {
      const assignedClass = (this.teacherAssignedClassID || this.selectedClass || '').trim();
      const assignedDivision = (this.teacherAssignedDivisionID || this.selectedDivision || '').trim();
      filtered = data.filter((item: any) => {
        const itemClass = String(item.class ?? '').trim();
        const itemDivision = String(item.division ?? '').trim();
        return (!assignedClass || itemClass === assignedClass) && (!assignedDivision || itemDivision === assignedDivision);
      });
    }

    this.allStudentsList = filtered.map((item: any) => ({
      ID: item.id,
      AdmissionNo: item.admissionNo,
      Name: `${item.firstName ?? ''} ${item.middleName ?? ''} ${item.lastName ?? ''}`.replace(/\s+/g, ' ').trim(),
      SchoolName: item.schoolName,
      AcademicYearName: item.academicYearName,
      ClassName: item.className,
      Division: item.division,
      MobileNo: item.mobileNo,
      Email: item.emailID,
      Gender: this.genderMap[item.gender] || '',
      DOB: item.dob,
      BloodGroup: this.bloodGroups[item.bloodGroup] || '',
      Religion: this.religionMap[item.religion] || '',
      Caste: item.caste,
      AadharNo: item.aadharNo,
      JoinDate: item.joinDate,
      RollNo: item.rollNo,
      createdDate: item.createdDate
    }));
    
    this.sortData(); // Apply initial sorting
  }

  private handleFetchError() {
    this.allStudentsList = [];
    this.studentsList = [];
    this.totalCount = 0;
    this.loader.hide();
  }

  private updatePaginatedStudents() {
    this.totalCount = this.allStudentsList.length;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.studentsList = this.allStudentsList.slice(startIndex, endIndex);
  }

  // Pagination
  totalPages() { return Math.ceil(this.totalCount / this.pageSize); }

  getVisiblePageNumbers() {
    const total = this.totalPages();
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, total);
    if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  goToPage(page: number) {
    const total = this.totalPages();
    if (page < 1) page = 1;
    if (page > total && total > 0) page = total;
    this.currentPage = page;
    this.updatePaginatedStudents();
  }

  previousPage() { if (this.currentPage > 1) this.goToPage(this.currentPage - 1); }
  nextPage() { if (this.currentPage < this.totalPages()) this.goToPage(this.currentPage + 1); }
  firstPage() { this.goToPage(1); }
  lastPage() { this.goToPage(this.totalPages()); }

  onPageSizeChange() {
    this.currentPage = 1;
    this.updatePaginatedStudents();
  }

  sort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.sortData();
  }

  private sortData() {
    if (this.sortColumn) {
      this.allStudentsList.sort((a, b) => {
        let valA = a[this.sortColumn] ? a[this.sortColumn].toString().toLowerCase() : '';
        let valB = b[this.sortColumn] ? b[this.sortColumn].toString().toLowerCase() : '';
        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    this.resetPagination();
    this.updatePaginatedStudents();
  }

  // Detail view
  viewStudent(admissionNo: string) {
    this.loader.show();
    this.isDetailView = true;
    this.resetDetailView();

    this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', { AdmissionNo: admissionNo, Flag: '4' }).subscribe({
      next: (res: any) => {
        const item = res?.data?.[0];
        if (!item) {
          this.isDetailView = false;
          this.loader.hide();
          return;
        }
        this.selectedStudent = {
          ID: item.id,
          SchoolID: item.schoolID?.toString() ?? '',
          AcademicYearID: item.academicYear?.toString() ?? '',
          ClassID: item.class?.toString() ?? '',
          DivisionID: item.division?.toString() ?? '',
          AdmissionNo: item.admissionNo,
          Name: `${item.firstName ?? ''} ${item.middleName ?? ''} ${item.lastName ?? ''}`.replace(/\s+/g, ' ').trim(),
          FirstName: item.firstName ?? '',
          MiddleName: item.middleName ?? '',
          LastName: item.lastName ?? '',
          SchoolName: item.schoolName ?? '',
          ClassName: item.className,
          ClassDivisionName: item.classDivisionName,
          Division: item.division,
          DOB: this.formatDate(item.dob),
          BloodGroup: this.bloodGroups[item.bloodGroup] || '',
          Gender: this.genderMap[item.gender] || '',
          Religion: this.religionMap[item.religion] || '',
          Caste: item.caste,
          AadharNo: item.aadharNo,
          MobileNo: item.mobileNo,
          Email: item.emailID,
          JoinDate: this.formatDate(item.joinDate),
          RollNo: item.rollNo,
          AcademicYearName: item.academicYearName,
          Nationality: item.nationalityName ?? item.nationality ?? ''
        };

        const schoolID = this.selectedStudent.SchoolID || this.getCurrentSchoolId();
        const academicYearID = this.selectedStudent.AcademicYearID || this.selectedAcademicYear || '';
        const classID = this.selectedStudent.ClassID || this.selectedClass || '';
        const divisionID = this.selectedStudent.DivisionID || this.selectedDivision || '';

        forkJoin({
          parent: this.safePost<any>('Tbl_StudentParentDetails_CRUD_Operations', { AdmissionID: admissionNo, Flag: '4' }),
          address: this.safePost<any>('Tbl_StudentAddressDetails_CRUD_Operations', { AdmissionID: admissionNo, Flag: '4' }),
          transport: this.safePost<any>('Tbl_StudentTransportationDetails_CRUD_Operations', { AdmissionID: admissionNo, Flag: '4' }),
          sessions: schoolID && academicYearID
            ? this.safePost<any>('Tbl_Session_CRUD_Operations', { SchoolID: schoolID, AcademicYear: academicYearID, Flag: '2' })
            : of({ data: [] }),
          attendance: schoolID && academicYearID && classID && divisionID
            ? this.safePost<any>('Tbl_StudentAttendance_CRUD_Operations', {
                Flag: '2',
                SchoolID: schoolID,
                AcademicYear: academicYearID,
                Class: classID,
                Division: divisionID,
                Limit: '10000'
              })
            : of({ data: [] }),
          attendanceByAdmission: schoolID && academicYearID
            ? this.safePost<any>('Tbl_StudentAttendance_CRUD_Operations', {
                Flag: '2',
                SchoolID: schoolID,
                AcademicYear: academicYearID,
                AdmissionID: admissionNo,
                Limit: '10000'
              })
            : of({ data: [] }),
          feeCategories: schoolID && academicYearID && classID && divisionID
            ? this.safePost<any>('Tbl_FeeDiscount_CRUD_Operations', {
                SchoolID: schoolID,
                AcademicYear: academicYearID,
                Class: classID,
                Division: divisionID,
                Student: admissionNo,
                Flag: '11'
              })
            : of({ data: [] })
        }).subscribe({
          next: ({ parent, address, transport, sessions, attendance, attendanceByAdmission, feeCategories }: any) => {
            this.parentDetails = parent?.data?.[0] || null;
            this.addressDetails = address?.data?.[0] || null;
            this.transportDetails = this.normalizeTransportDetails(transport?.data?.[0] || null);

            const sessionList = Array.isArray(sessions?.data)
              ? sessions.data.map((session: any) => ({
                  ID: session.id?.toString() ?? '',
                  Name: session.session ?? session.name ?? session.id?.toString() ?? ''
                }))
              : [];
            const attendanceRows = [
              ...(Array.isArray(attendance?.data) ? attendance.data : []),
              ...(Array.isArray(attendanceByAdmission?.data) ? attendanceByAdmission.data : [])
            ];
            this.buildAttendanceReport(attendanceRows, admissionNo, sessionList);

            const feeCategoryIDs: string[] = Array.from(
              new Set(
                (Array.isArray(feeCategories?.data) ? feeCategories.data : [])
                  .map((feeCategory: any) => feeCategory.id?.toString?.() ?? '')
                  .filter((feeCategoryId: string) => !!feeCategoryId)
              )
            );

            this.fetchStudentFeeDetails(schoolID, academicYearID, classID, divisionID, admissionNo, feeCategoryIDs);
          },
          error: () => {
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.isDetailView = false;
        this.loader.hide();
      }
    });
  }

  backToList() {
    this.isDetailView = false;
    this.resetDetailView();
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  }

  private resetDetailView() {
    this.selectedStudent = null;
    this.parentDetails = null;
    this.addressDetails = null;
    this.transportDetails = null;
    this.feeDetails = [];
    this.attendanceDetails = [];
    this.attendanceSummary = {
      workingDays: 0,
      present: 0,
      absent: 0,
      presentPercentage: 0,
      absentPercentage: 0
    };
    this.attendanceChartOptions = null;
  }

  private fetchStudentFeeDetails(
    schoolID: string,
    academicYearID: string,
    classID: string,
    divisionID: string,
    admissionNo: string,
    feeCategoryIDs: string[]
  ) {
    const categoriesToLoad = feeCategoryIDs.length > 0 ? feeCategoryIDs : [''];
    const requests = categoriesToLoad.map((feeCategoryID) =>
      this.safePost<any>('Tbl_FeeDiscount_CRUD_Operations', {
        SchoolID: schoolID,
        AcademicYear: academicYearID,
        Class: classID,
        Division: divisionID,
        Student: admissionNo,
        FeeCategory: feeCategoryID,
        Flag: '10'
      })
    );

    forkJoin(requests).subscribe({
      next: (responses: any[]) => {
        const rows = responses.flatMap((response: any) => Array.isArray(response?.data) ? response.data : []);
        this.feeDetails = this.normalizeFeeDetails(rows);
        this.loader.hide();
      },
      error: () => {
        this.feeDetails = [];
        this.loader.hide();
      }
    });
  }

  private normalizeFeeDetails(items: any[]): FeeDetailRow[] {
    const mapped = items.map((item: any) => ({
      feeCategoryName: (item.feeCategoryName ?? item.FeeCategoryName ?? item.feeCategory ?? '').toString(),
      totalAmount: this.toNumber(item.totalFee ?? item.totalAmount),
      paidAmount: this.toNumber(item.totalPaid ?? item.totalFeePaid ?? item.feePaid ?? item.paidAmount),
      discount: this.toNumber(item.totalDiscount ?? item.discount ?? item.discountAmount),
      installment: this.toNumber(item.installment ?? item.installmentAmount),
      dueAmount: this.toNumber(item.remainingAmount ?? item.dueAmount ?? item.pendingAmount),
      fine: this.toNumber(item.fine ?? item.fineAmount)
    }));

    const uniqueRows = new Map<string, FeeDetailRow>();
    mapped.forEach((row) => {
      const key = (row.feeCategoryName || `${row.totalAmount}-${row.dueAmount}`).toLowerCase();
      if (!uniqueRows.has(key)) {
        uniqueRows.set(key, row);
      }
    });

    return Array.from(uniqueRows.values());
  }

  private normalizeTransportDetails(item: any): TransportDetailView | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const routeName = this.pickFirst(item, ['routeName', 'RouteName', 'route', 'Route']);
    const stopName = this.pickFirst(item, ['stopName', 'StopName', 'stop', 'Stop']);
    const busName = this.pickFirst(item, ['busName', 'BusName', 'bus', 'Bus']);
    const fareName = this.pickFirst(item, ['fareName', 'FareName', 'fare', 'Fare', 'amount', 'Amount']);
    const startDate = this.pickFirst(item, ['startDate', 'StartDate']);

    if (!routeName && !stopName && !busName && !fareName && !startDate) {
      return null;
    }

    return {
      routeName,
      stopName,
      busName,
      fareName,
      startDate
    };
  }

  private buildAttendanceReport(rows: any[], admissionNo: string, sessionList: Array<{ ID: string; Name: string }>) {
    const sessionMap = new Map(sessionList.map((session) => [session.ID, session.Name]));
    const normalizedRows = rows
      .filter((row: any) => this.matchesAdmission(row, admissionNo))
      .map((row: any) => ({
        attendanceDate: this.formatDate(
          this.pickFirst(row, ['attendanceDate', 'AttendanceDate', 'attendanceDateTime', 'AttendanceDateTime'])
        ) || '--',
        attendanceDateTime: this.pickFirst(row, ['attendanceDate', 'AttendanceDate', 'attendanceDateTime', 'AttendanceDateTime']),
        session: sessionMap.get(this.pickFirst(row, ['session', 'Session'])) ||
          this.pickFirst(row, ['sessionName', 'SessionName', 'session', 'Session']) ||
          '--',
        status: this.resolveAttendanceStatus(row),
        remark: this.pickFirst(row, ['remarks', 'Remarks', 'remark', 'Remark']),
        lateMinutes: this.toNumber(this.pickFirst(row, ['lateInMinutes', 'LateInMinutes']))
      }))
      .filter((row) => !!row.attendanceDateTime)
      .sort((left, right) => new Date(right.attendanceDateTime).getTime() - new Date(left.attendanceDateTime).getTime());

    const uniqueRows = new Map<string, AttendanceDetailRow>();
    normalizedRows.forEach((row) => {
      const key = `${row.attendanceDateTime}|${row.session}|${row.status}|${row.remark}`;
      if (!uniqueRows.has(key)) {
        uniqueRows.set(key, row);
      }
    });

    this.attendanceDetails = Array.from(uniqueRows.values());

    const present = this.attendanceDetails.filter((row) => row.status === 'Present').length;
    const absent = this.attendanceDetails.filter((row) => row.status === 'Absent').length;
    const totalMarked = present + absent;
    const workingDays = new Set(
      this.attendanceDetails
        .map((row) => {
          const date = new Date(row.attendanceDateTime);
          return Number.isNaN(date.getTime()) ? row.attendanceDateTime : date.toDateString();
        })
        .filter(Boolean)
    ).size;

    this.attendanceSummary = {
      workingDays: workingDays || totalMarked,
      present,
      absent,
      presentPercentage: totalMarked ? Math.round((present / totalMarked) * 100) : 0,
      absentPercentage: totalMarked ? Math.round((absent / totalMarked) * 100) : 0
    };

    this.attendanceChartOptions = totalMarked > 0
      ? {
          tooltip: {
            trigger: 'item'
          },
          legend: {
            top: 14,
            left: 'center',
            textStyle: {
              color: '#4b5563',
              fontSize: 13
            }
          },
          color: ['#8bc34a', '#ffc107'],
          series: [
            {
              type: 'pie',
              center: ['50%', '62%'],
              radius: ['40%', '62%'],
              avoidLabelOverlap: true,
              label: {
                show: false
              },
              labelLine: {
                show: false
              },
              data: [
                { value: present, name: 'Present %' },
                { value: absent, name: 'Absent %' }
              ]
            }
          ]
        }
      : null;
  }

  private matchesAdmission(row: any, admissionNo: string): boolean {
    const rowAdmission = this.pickFirst(row, [
      'admissionID',
      'admissionId',
      'AdmissionID',
      'AdmissionId',
      'admissionNo',
      'AdmissionNo'
    ]).toString().trim();

    return !!rowAdmission && rowAdmission === admissionNo.toString().trim();
  }

  private resolveAttendanceStatus(row: any): 'Present' | 'Absent' {
    const raw = this.pickFirst(row, ['attendance', 'Attendance', 'isPresent', 'IsPresent', 'status', 'Status'])
      .toString()
      .trim()
      .toLowerCase();

    return raw === '1' || raw === 'true' || raw === 'present' ? 'Present' : 'Absent';
  }

  private pickFirst(source: any, keys: string[]): string {
    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && value !== '') {
        return String(value);
      }
    }

    return '';
  }

  private toNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private fetchParentChildren(): void {
    const parentEmail = (this.ss('email') || '').toString().trim();
    if (!parentEmail) return;

    const payload = {
      Flag: '9',
      FatherEmail: parentEmail,
      MotherEmail: parentEmail,
      AcademicYear: this.selectedAcademicYear || ''
    };

    this.apiurl.post<any>('Tbl_StudentParentDetails_CRUD_Operations', payload).subscribe({
      next: (res: any) => {
        const list: any[] = res?.data || [];

        this.parentChildren = list.map((s: any) => {
          const admissionId = s.admissionID || s.AdmissionID || s.admissionno || s.AdmissionNo || '';
          const studentName = s.fatherName || s.name || s.Name || '';
          const classId = s.class || s.Class || s.classID || s.ClassID || '';
          const divisionId = s.division || s.Division || s.divisionID || s.DivisionID || '';
          const schoolId = s.schoolID || s.SchoolID || s.schoolId || s.SchoolId || '';

          return {
            ID: String(admissionId),
            AdmissionNo: String(admissionId),
            Name: `${admissionId} - ${studentName}`.trim(),
            Class: String(classId),
            Division: String(divisionId),
            SchoolID: String(schoolId)
          };
        }).filter(c => c.AdmissionNo && c.AdmissionNo !== '0');

        // If parent has children, automatically load their data
        if (this.parentChildren.length > 0) {
          this.fetchStudents();
        }
      },
      error: () => {
        this.parentChildren = [];
      }
    });
  }

  formatAmount(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '--';
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return String(value);
    }

    return parsed.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  getStudentInitials(name: string | null | undefined): string {
    const parts = (name || '')
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2);

    if (parts.length === 0) {
      return 'ST';
    }

    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  }

  get fullAddress(): string {
    const addressParts = [
      this.addressDetails?.permanentAddressLine1,
      this.addressDetails?.permanentAddressLine2,
      this.addressDetails?.permanentPlace,
      this.addressDetails?.permanentCity,
      this.addressDetails?.permanentDistrict,
      this.addressDetails?.permanentPinCode
    ]
      .map((part: any) => (part ?? '').toString().trim())
      .filter(Boolean);

    return addressParts.length > 0 ? addressParts.join(', ') : '--';
  }

  get feeTotals() {
    return this.feeDetails.reduce(
      (totals, row) => ({
        totalAmount: totals.totalAmount + row.totalAmount,
        paidAmount: totals.paidAmount + row.paidAmount,
        discount: totals.discount + row.discount,
        installment: totals.installment + row.installment,
        dueAmount: totals.dueAmount + row.dueAmount,
        fine: totals.fine + row.fine
      }),
      {
        totalAmount: 0,
        paidAmount: 0,
        discount: 0,
        installment: 0,
        dueAmount: 0,
        fine: 0
      }
    );
  }

  get recentAttendanceDetails(): AttendanceDetailRow[] {
    return this.attendanceDetails.slice(0, 12);
  }

  // Exports
  exportCSV() {
    const headers = ['#', 'School', 'Academic Year', 'Admission No', 'Name', 'Class', 'Division', 'Phone', 'Email', 'Gender'];
    const rows = this.studentsList.map((s, i) =>
      [i + 1, `"${s.SchoolName || ''}"`, `"${s.AcademicYearName || ''}"`, s.AdmissionNo, `"${s.Name}"`, `"${s.ClassName}"`, s.Division, s.MobileNo || '', s.Email || '', s.Gender].join(',')
    );
    this.downloadFile([headers.join(','), ...rows].join('\n'), 'students-report.csv', 'text/csv');
  }

  exportExcel() {
    const headers = ['#', 'School', 'Academic Year', 'Admission No', 'Name', 'Class', 'Division', 'Phone', 'Email', 'Gender'];
    const rows = this.studentsList.map((s, i) =>
      `<tr><td>${i + 1}</td><td>${s.SchoolName || ''}</td><td>${s.AcademicYearName || ''}</td><td>${s.AdmissionNo}</td><td>${s.Name}</td><td>${s.ClassName}</td><td>${s.Division}</td><td>${s.MobileNo || ''}</td><td>${s.Email || ''}</td><td>${s.Gender}</td></tr>`
    );
    const html = `<table><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${rows.join('')}</table>`;
    this.downloadFile(html, 'students-report.xls', 'application/vnd.ms-excel');
  }

  copyToClipboard() {
    const text = this.studentsList.map((s, i) =>
      `${i + 1}\t${s.SchoolName || ''}\t${s.AcademicYearName || ''}\t${s.AdmissionNo}\t${s.Name}\t${s.ClassName}\t${s.Division}\t${s.MobileNo || ''}\t${s.Email || ''}\t${s.Gender}`
    ).join('\n');
    navigator.clipboard?.writeText(text);
  }

  printPage() {
    if (!this.isDetailView || !this.selectedStudent) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const printedOn = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const feeRows = this.feeDetails.length > 0
      ? this.feeDetails.map((fee, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${this.escapeHtml(fee.feeCategoryName || '--')}</td>
            <td>${this.escapeHtml(this.formatAmount(fee.totalAmount))}</td>
            <td>${this.escapeHtml(this.formatAmount(fee.paidAmount))}</td>
            <td>${this.escapeHtml(this.formatAmount(fee.discount))}</td>
            <td>${this.escapeHtml(this.formatAmount(fee.installment))}</td>
            <td>${this.escapeHtml(this.formatAmount(fee.dueAmount))}</td>
            <td>${this.escapeHtml(this.formatAmount(fee.fine))}</td>
          </tr>
        `).join('')
      : `
          <tr>
            <td colspan="8" class="empty-row">No fee details found.</td>
          </tr>
        `;

    const transportRow = this.transportDetails
      ? `
          <tr>
            <td>${this.escapeHtml(this.transportDetails.routeName || '--')}</td>
            <td>${this.escapeHtml(this.transportDetails.stopName || '--')}</td>
            <td>${this.escapeHtml(this.transportDetails.busName || '--')}</td>
            <td>${this.escapeHtml(this.transportDetails.fareName || '--')}</td>
            <td>${this.escapeHtml(this.transportDetails.startDate ? this.formatDate(this.transportDetails.startDate) : '--')}</td>
          </tr>
        `
      : `
          <tr>
            <td colspan="5" class="empty-row">No bus information found.</td>
          </tr>
        `;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Student Report - ${this.escapeHtml(this.selectedStudent.Name || 'Student')}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: "Segoe UI", Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
            }
            .page {
              padding: 28px 32px 36px;
            }
            .report-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 20px;
              padding-bottom: 18px;
              border-bottom: 3px solid #1d4ed8;
              margin-bottom: 24px;
            }
            .report-title {
              margin: 0;
              font-size: 28px;
              font-weight: 800;
              color: #0f3d75;
            }
            .report-subtitle {
              margin: 6px 0 0;
              font-size: 13px;
              color: #475569;
            }
            .report-meta {
              text-align: right;
              font-size: 13px;
              color: #334155;
            }
            .section {
              margin-bottom: 22px;
              border: 1px solid #dbe7f3;
              border-radius: 14px;
              overflow: hidden;
              break-inside: avoid;
            }
            .section-header {
              padding: 12px 18px;
              background: #edf6ff;
              color: #17447a;
              font-size: 20px;
              font-weight: 700;
              border-bottom: 1px solid #dbe7f3;
            }
            .section-body {
              padding: 16px 18px 18px;
            }
            .details-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px 24px;
            }
            .detail-row {
              display: grid;
              grid-template-columns: 180px 1fr;
              gap: 10px;
              padding: 7px 0;
              border-bottom: 1px solid #eef2f7;
            }
            .detail-row.full {
              grid-column: 1 / -1;
            }
            .detail-label {
              font-weight: 700;
              color: #334155;
            }
            .detail-value {
              color: #111827;
              word-break: break-word;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #d6e1ee;
              padding: 9px 10px;
              font-size: 13px;
              text-align: center;
              vertical-align: middle;
            }
            th {
              background: #eef5ff;
              color: #17447a;
              font-weight: 700;
            }
            td.text-left {
              text-align: left;
            }
            .total-row td {
              font-weight: 800;
              background: #f8fbff;
            }
            .empty-row {
              color: #64748b;
              padding: 18px 10px;
            }
            .summary-strip {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 14px;
            }
            .summary-card {
              border: 1px solid #dbe7f3;
              border-radius: 12px;
              padding: 12px 14px;
              background: #fbfdff;
            }
            .summary-label {
              font-size: 12px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }
            .summary-value {
              margin-top: 6px;
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
            }
            @page {
              size: A4;
              margin: 12mm;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .page { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="report-header">
              <div>
                <h1 class="report-title">Student Detailed Report</h1>
                <p class="report-subtitle">${this.escapeHtml(this.selectedStudent.SchoolName || 'School ERP')}</p>
              </div>
              <div class="report-meta">
                <div><strong>Student:</strong> ${this.escapeHtml(this.selectedStudent.Name || '--')}</div>
                <div><strong>Admission No:</strong> ${this.escapeHtml(this.selectedStudent.AdmissionNo || '--')}</div>
                <div><strong>Printed On:</strong> ${this.escapeHtml(printedOn)}</div>
              </div>
            </div>

            <section class="section">
              <div class="section-header">Personal Details</div>
              <div class="section-body">
                <div class="details-grid">
                  ${this.buildPrintDetailRow('Academic Year', this.selectedStudent.AcademicYearName || '--')}
                  ${this.buildPrintDetailRow('Class', this.selectedStudent.ClassName || '--')}
                  ${this.buildPrintDetailRow('Division', this.selectedStudent.ClassDivisionName || '--')}
                  <!-- ${this.buildPrintDetailRow('Roll Number', this.selectedStudent.RollNo || '--')} -->
                  ${this.buildPrintDetailRow('Date of Birth', this.selectedStudent.DOB || '--')}
                  ${this.buildPrintDetailRow('Gender', this.selectedStudent.Gender || '--')}
                  ${this.buildPrintDetailRow('Blood Group', this.selectedStudent.BloodGroup || '--')}
                  ${this.buildPrintDetailRow('Phone Number', this.selectedStudent.MobileNo || '--')}
                  ${this.buildPrintDetailRow('Email', this.selectedStudent.Email || '--')}
                  ${this.buildPrintDetailRow('Father', this.parentDetails?.fatherName || '--')}
                  ${this.buildPrintDetailRow('Mother', this.parentDetails?.motherName || '--')}
                  ${this.buildPrintDetailRow('Aadhaar Number', this.selectedStudent.AadharNo || '--')}
                  ${this.buildPrintDetailRow('Address', this.fullAddress, true)}
                </div>
              </div>
            </section>

            <section class="section">
              <div class="section-header">Fee Details</div>
              <div class="section-body">
                <table>
                  <thead>
                    <tr>
                      <th>SI.NO</th>
                      <th>Fee Category</th>
                      <th>Total Amount</th>
                      <th>Paid Amount</th>
                      <th>Discount</th>
                      <th>Installment</th>
                      <th>Due Amount</th>
                      <th>Fine</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${feeRows}
                    <tr class="total-row">
                      <td colspan="2">Total</td>
                      <td>${this.escapeHtml(this.formatAmount(this.feeTotals.totalAmount))}</td>
                      <td>${this.escapeHtml(this.formatAmount(this.feeTotals.paidAmount))}</td>
                      <td>${this.escapeHtml(this.formatAmount(this.feeTotals.discount))}</td>
                      <td>${this.escapeHtml(this.formatAmount(this.feeTotals.installment))}</td>
                      <td>${this.escapeHtml(this.formatAmount(this.feeTotals.dueAmount))}</td>
                      <td>${this.escapeHtml(this.formatAmount(this.feeTotals.fine))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="section">
              <div class="section-header">Attendance Summary</div>
              <div class="section-body">
                <div class="summary-strip">
                  <div class="summary-card">
                    <div class="summary-label">Working Days</div>
                    <div class="summary-value">${this.attendanceSummary.workingDays}</div>
                  </div>
                  <div class="summary-card">
                    <div class="summary-label">Present</div>
                    <div class="summary-value">${this.attendanceSummary.present}</div>
                  </div>
                  <div class="summary-card">
                    <div class="summary-label">Absent</div>
                    <div class="summary-value">${this.attendanceSummary.absent}</div>
                  </div>
                  <div class="summary-card">
                    <div class="summary-label">Present %</div>
                    <div class="summary-value">${this.attendanceSummary.presentPercentage}%</div>
                  </div>
                </div>
              </div>
            </section>

            <section class="section">
              <div class="section-header">Bus Information</div>
              <div class="section-body">
                <table>
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Stop</th>
                      <th>Bus</th>
                      <th>Amount</th>
                      <th>Start Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${transportRow}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }

  private buildPrintDetailRow(label: string, value: string, fullWidth = false): string {
    return `
      <div class="detail-row${fullWidth ? ' full' : ''}">
        <div class="detail-label">${this.escapeHtml(label)}</div>
        <div class="detail-value">${this.escapeHtml(value || '--')}</div>
      </div>
    `;
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
