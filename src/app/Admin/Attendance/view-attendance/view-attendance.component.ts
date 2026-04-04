import { DatePipe, NgClass, NgFor, NgIf, SlicePipe } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { LoaderService } from '../../../Services/loader.service';

type AttendanceStatus = 'Present' | 'Absent' | 'Not Marked';

type StudentAttendanceDetail = {
  attendanceDateTime: string;
  session: string;
  sessionID: string;          // raw session ID for API call
  status: AttendanceStatus;
  originalStatus: AttendanceStatus; // track original for change detection
  isPresent: boolean;         // bound to toggle
  lateMinutes: number;
  Remark: string;
  originalRemark: string;
  showRemark: boolean;
  showFullRemark: boolean;
};

type DayGroup = {
  date: string;
  sessions: StudentAttendanceDetail[];
};

type StudentAttendanceSummary = {
  admissionNo: string;
  studentName: string;
  className: string;
  divisionName: string;
  totalDays: number;
  presentCount: number;
  absentCount: number;
  notMarkedCount: number;
  lateCount: number;
  totalLateMinutes: number;
  attendancePercentage: number;
  lastDaySessions: { session: string; status: AttendanceStatus }[];
  details: StudentAttendanceDetail[];
  dayGroups: DayGroup[];
};

@Component({
  selector: 'app-view-attendance',
  imports: [NgIf, NgFor, NgClass, DatePipe, SlicePipe, FormsModule, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule],
  templateUrl: './view-attendance.component.html',
  styleUrl: './view-attendance.component.css'
})
export class ViewAttendanceComponent extends BasePermissionComponent {
  pageName = 'ViewAttendance';

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
    if (!this.isAdmin) {
      this.AdminselectedSchoolID =
        sessionStorage.getItem('SchoolID')?.toString() ||
        sessionStorage.getItem('schoolId')?.toString() ||
        '';
      this.SyllabusForm.patchValue({ School: this.AdminselectedSchoolID || '0' });
    }
    this.FetchSchoolsList();
    this.FetchAcademicYearsList();
  }

  schoolList: any[] = [];
  academicYearList: any[] = [];
  classLists: any[] = [];
  divisionsList: any[] = [];
  sessionList: any[] = [];
  private paginationLoaderTimer: any;

  AdminselectedSchoolID = '';
  AdminselectedAcademivYearID = '';
  AdminselectedClassID = '';
  AdminselectedDiviosnID = '';
  AdminSelectedSessionID = '';

  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;

  SyllabusCount = 0;
  totalAttendanceDays = 0;
  lastAttendanceDate = '';
  isTableVisible = false;
  isDetailModalOpen = false;
  isUpdating = false;
  selectedStudent: StudentAttendanceSummary | null = null;
  studentSummaries: StudentAttendanceSummary[] = [];
  private rawData: any[] = [];

  // status modal
  statusModalTitle = 'Status';
  statusMessage = '';
  isStatusModalOpen = false;

  summaryCards = {
    totalStudents: 0,
    totalDays: 0,
    totalSessionCount: 0,
    lastDateLabel: '',
    lastDateSessionCount: 0,
    lastDatePresent: 0,
    lastDateAbsent: 0,
    lastDateLate: 0,
    lateCount: 0
  };

  SyllabusForm: any = new FormGroup({
    School: new FormControl(0, [Validators.required, Validators.min(1)]),
    AcademicYear: new FormControl(0, [Validators.required, Validators.min(1)]),
    Class: new FormControl(0, [Validators.required, Validators.min(1)]),
    Divisions: new FormControl(0, [Validators.required, Validators.min(1)]),
    Session: new FormControl(0),
    FromDateTime: new FormControl('', [Validators.required]),
    ToDateTime: new FormControl('', [Validators.required])
  });

  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  private getCurrentSchoolId(): string {
    if (this.isAdmin) {
      return this.AdminselectedSchoolID || '';
    }

    return (
      this.AdminselectedSchoolID ||
      sessionStorage.getItem('SchoolID')?.toString() ||
      sessionStorage.getItem('schoolId')?.toString() ||
      ''
    );
  }

  FetchSchoolsList() {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe(
      (response: any) => {
        this.schoolList = Array.isArray(response?.data)
          ? response.data.map((item: any) => ({ ID: item.id, Name: item.name }))
          : [];
      },
      () => { this.schoolList = []; }
    );
  }

  FetchAcademicYearsList() {
    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: this.getCurrentSchoolId(), Flag: '2' }).subscribe(
      (response: any) => {
        this.academicYearList = Array.isArray(response?.data)
          ? response.data.map((item: any) => ({ ID: item.id, Name: item.name }))
          : [];
      },
      () => { this.academicYearList = []; }
    );
  }

  FetchClassList() {
    this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', {
      SchoolID: this.getCurrentSchoolId(),
      AcademicYear: this.AdminselectedAcademivYearID,
      Flag: '9'
    }).subscribe(
      (response: any) => {
        this.classLists = Array.isArray(response?.data)
          ? response.data.map((item: any) => ({ ID: item.sNo.toString(), Name: item.syllabusClassName }))
          : [];
      },
      () => { this.classLists = []; }
    );
  }

  FetchDivisionsList() {
    this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', {
      SchoolID: this.getCurrentSchoolId(),
      AcademicYear: this.AdminselectedAcademivYearID,
      Class: this.AdminselectedClassID,
      Flag: '3'
    }).subscribe(
      (response: any) => {
        this.divisionsList = Array.isArray(response?.data)
          ? response.data.map((item: any) => ({ ID: item.id, Name: item.name }))
          : [];
      },
      () => { this.divisionsList = []; }
    );
  }

  FetchSessionsList() {
    this.apiurl.post<any>('Tbl_Session_CRUD_Operations', {
      SchoolID: this.getCurrentSchoolId(),
      AcademicYear: this.AdminselectedAcademivYearID,
      Flag: '2'
    }).subscribe(
      (response: any) => {
        this.sessionList = Array.isArray(response?.data)
          ? response.data.map((item: any) => ({ ID: item.id, Name: item.session }))
          : [];
      },
      () => { this.sessionList = []; }
    );
  }

  onAdminSchoolChange(event: Event) {
    const v = (event.target as HTMLSelectElement).value;
    this.AdminselectedSchoolID = v === '0' ? '' : v;
    this.academicYearList = []; this.classLists = []; this.divisionsList = []; this.sessionList = [];
    this.SyllabusForm.patchValue({ AcademicYear: 0, Class: 0, Divisions: 0, Session: 0 });
    this.AdminselectedAcademivYearID = ''; this.AdminselectedClassID = ''; this.AdminselectedDiviosnID = ''; this.AdminSelectedSessionID = '';
    this.resetAttendanceView();
    if (this.AdminselectedSchoolID) this.FetchAcademicYearsList();
  }

  onAdminAcademicYearchange(event: Event) {
    const v = (event.target as HTMLSelectElement).value;
    this.AdminselectedAcademivYearID = v === '0' ? '' : v;
    this.classLists = []; this.divisionsList = []; this.sessionList = [];
    this.SyllabusForm.patchValue({ Class: 0, Divisions: 0, Session: 0 });
    this.AdminselectedClassID = ''; this.AdminselectedDiviosnID = ''; this.AdminSelectedSessionID = '';
    this.resetAttendanceView();
    if (this.AdminselectedAcademivYearID) { this.FetchClassList(); this.FetchSessionsList(); }
  }

  onAdminClasschange(event: Event) {
    const v = (event.target as HTMLSelectElement).value;
    this.AdminselectedClassID = v === '0' ? '' : v;
    this.divisionsList = [];
    this.SyllabusForm.patchValue({ Divisions: 0 });
    this.AdminselectedDiviosnID = '';
    this.resetAttendanceView();
    if (this.AdminselectedClassID) this.FetchDivisionsList();
  }

  onAdminDivisionsChange(event: Event) {
    const v = (event.target as HTMLSelectElement).value;
    this.AdminselectedDiviosnID = v === '0' ? '' : v;
    this.resetAttendanceView();
  }

  onSessionChange(event: Event) {
    const v = (event.target as HTMLSelectElement).value;
    this.AdminSelectedSessionID = v === '0' ? '' : v;
    if (this.isTableVisible && this.rawData.length > 0) {
      this.processData(this.rawData);
    } else {
      this.resetAttendanceView();
    }
  }

  onDateRangeChange() { this.resetAttendanceView(); }

  openStudentDetails(student: StudentAttendanceSummary) {
    this.selectedStudent = student;
    this.isDetailModalOpen = true;
  }

  closeStudentDetails() {
    this.isDetailModalOpen = false;
    this.selectedStudent = null;
  }

  // called when toggle changes in detail modal
  onDetailToggleChange(detail: StudentAttendanceDetail) {
    const changed = detail.isPresent !== (detail.originalStatus === 'Present');
    if (changed) {
      detail.showRemark = true;
      detail.Remark = '';
    } else {
      detail.showRemark = false;
      detail.Remark = detail.originalRemark;
    }
  }

  private toMysqlDateTime(value: string): string {
    if (!value) return '';

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const yyyy = parsed.getFullYear();
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const dd = String(parsed.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} 00:00:00`;
    }

    const datePart = value.includes('T')
      ? value.split('T')[0]
      : value.split(' ')[0];

    const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(datePart);
    return isoMatch ? `${datePart} 00:00:00` : '';
  }

updateStudentAttendance() {
  if (!this.selectedStudent) return;

  const changedRows = this.selectedStudent.dayGroups
    .flatMap(d => d.sessions)
    .filter(s => s.originalStatus !== 'Not Marked' && s.isPresent !== (s.originalStatus === 'Present'));

  if (changedRows.length === 0) {
    this.statusMessage = 'No changes to update.';
    this.statusModalTitle = 'Info';
    this.isStatusModalOpen = true;
    return;
  }

  const missingRemark = changedRows.find(s => !s.Remark?.trim());
  if (missingRemark) {
    const direction = missingRemark.isPresent ? 'Absent → Present' : 'Present → Absent';
    this.statusMessage = `⚠️ Please enter a remark for ${missingRemark.session} on ${new Date(missingRemark.attendanceDateTime).toLocaleDateString('en-GB')} (${direction}).`;
    this.statusModalTitle = 'Validation';
    this.isStatusModalOpen = true;
    return;
  }

    this.isUpdating = true;
    const schoolId = this.getCurrentSchoolId();

    const body = {
      Flag: '5',
      SchoolID: schoolId,
      AcademicYear: this.AdminselectedAcademivYearID,
      Class: this.AdminselectedClassID,
      Division: this.AdminselectedDiviosnID,
    AdmissionID: this.selectedStudent.admissionNo,
    Students: changedRows.map(s => {
      return {
        AdmissionID: this.selectedStudent!.admissionNo,
        AttendanceDate: this.toMysqlDateTime(s.attendanceDateTime),
        Session: (s.sessionID ?? '').toString(),
        Attendance: s.isPresent ? '1' : '0',
        LateInMinutes: (s.lateMinutes ?? 0).toString(),
        Remarks: s.Remark.trim()
      };
    })
  };

  this.apiurl.post('Tbl_StudentAttendance_CRUD_Operations', body).subscribe({
    next: () => {
      changedRows.forEach(s => {
        s.originalStatus = s.isPresent ? 'Present' : 'Absent';
        s.originalRemark = s.Remark;
        s.showRemark = false;
      });
      this.statusMessage = 'Attendance updated successfully.';
      this.statusModalTitle = 'Success';
      this.isStatusModalOpen = true;
      this.isUpdating = false;
      this.loadAttendance();
    },
    error: () => {
      this.statusMessage = 'Error updating attendance.';
      this.statusModalTitle = 'Error';
      this.isStatusModalOpen = true;
      this.isUpdating = false;
    }
  });
}

  loadAttendance() {
    if (!this.isFilterReady()) return;

    const formValue = this.SyllabusForm.getRawValue();
    const fromDate = formValue.FromDateTime;
    const toDate = formValue.ToDateTime;

    if (new Date(fromDate) > new Date(toDate)) {
      alert('From Date cannot be greater than To Date.');
      return;
    }

    this.loader.show();

    const body: any = {
      Flag: '2',
      SchoolID: this.getCurrentSchoolId(),
      AcademicYear: this.AdminselectedAcademivYearID,
      Class: this.AdminselectedClassID,
      Division: this.AdminselectedDiviosnID,
      Limit: '10000'
    };

    if (this.AdminSelectedSessionID) body.Session = this.AdminSelectedSessionID;

    this.apiurl.post<any>('Tbl_StudentAttendance_CRUD_Operations', body).subscribe(
      (response: any) => {
        this.rawData = Array.isArray(response?.data) ? response.data : [];
        this.processData(this.rawData);
        this.loader.hide();
      },
      () => {
        this.rawData = [];
        this.studentSummaries = [];
        this.SyllabusCount = 0;
        this.isTableVisible = true;
        this.loader.hide();
      }
    );
  }

  private processData(rawData: any[]) {
    const formValue = this.SyllabusForm.getRawValue();
    const from = new Date(formValue.FromDateTime); from.setHours(0, 0, 0, 0);
    const to = new Date(formValue.ToDateTime); to.setHours(23, 59, 59, 999);

    const data = rawData.filter(row => {
      const d = new Date(row.attendanceDate);
      const sessionMatch = !this.AdminSelectedSessionID || row.session == this.AdminSelectedSessionID;
      return d >= from && d <= to && sessionMatch;
    });

    const uniqueDateSet = new Set(data.map(r => new Date(r.attendanceDate).toDateString()));
    const uniqueDates = Array.from(uniqueDateSet).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    this.totalAttendanceDays = uniqueDates.length;
    this.lastAttendanceDate = uniqueDates.length > 0 ? uniqueDates[uniqueDates.length - 1] : '';

    this.studentSummaries = this.buildSummaries(data, uniqueDates);
    this.SyllabusCount = this.studentSummaries.length;
    this.isTableVisible = true;
    this.buildSummaryCards();
    this.currentPage = 1;
  }

  private getSessionName(sessionId: string): string {
    return this.sessionList.find((s: any) => s.ID == sessionId)?.Name ?? sessionId ?? '';
  }

  private buildSummaries(data: any[], uniqueDates: string[]): StudentAttendanceSummary[] {
    const map = new Map<string, StudentAttendanceSummary>();
    const studentDateSessions = new Map<string, Map<string, StudentAttendanceDetail[]>>();

    data.forEach(row => {
      const key = row.admissionID ?? row.admissionId ?? '';
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          admissionNo: key,
          studentName: row.studentName ?? '',
          className: row.className ?? '',
          divisionName: row.divisionName ?? '',
          totalDays: uniqueDates.length,
          presentCount: 0,
          absentCount: 0,
          notMarkedCount: 0,
          lateCount: 0,
          totalLateMinutes: 0,
          attendancePercentage: 0,
          lastDaySessions: [],
          details: [],
          dayGroups: []
        });
        studentDateSessions.set(key, new Map());
      }

      const summary = map.get(key)!;
      const dateSessionMap = studentDateSessions.get(key)!;
      const isPresent = row.attendance?.toString() === '1';
      const lateMin = parseInt(row.lateInMinutes ?? '0', 10) || 0;
      const status: AttendanceStatus = isPresent ? 'Present' : 'Absent';
      const dateKey = new Date(row.attendanceDate).toDateString();
      const sessionName = this.getSessionName(row.session);
      const remark = row.remarks ?? '';

      if (!dateSessionMap.has(dateKey)) dateSessionMap.set(dateKey, []);

      const detail: StudentAttendanceDetail = {
        attendanceDateTime: row.attendanceDate ?? '',
        session: sessionName,
        sessionID: row.session ?? '',
        status,
        originalStatus: status,
        isPresent,
        lateMinutes: lateMin,
        Remark: remark,
        originalRemark: remark,
        showRemark: false,
        showFullRemark: false
      };

      dateSessionMap.get(dateKey)!.push(detail);
      summary.details.push(detail);

      if (isPresent) summary.presentCount++; else summary.absentCount++;
      if (lateMin > 0) { summary.lateCount++; summary.totalLateMinutes += lateMin; }
    });

    map.forEach((summary, key) => {
      const dateSessionMap = studentDateSessions.get(key)!;

      uniqueDates.forEach(dateStr => {
        if (!dateSessionMap.has(dateStr)) {
          summary.notMarkedCount++;
          const nmDetail: StudentAttendanceDetail = {
            attendanceDateTime: new Date(dateStr).toISOString(),
            session: '-',
            sessionID: '',
            status: 'Not Marked',
            originalStatus: 'Not Marked',
            isPresent: false,
            lateMinutes: 0,
            Remark: '',
            originalRemark: '',
            showRemark: false,
            showFullRemark: false
          };
          summary.details.push(nmDetail);
          dateSessionMap.set(dateStr, [nmDetail]);
        }
      });

      summary.dayGroups = uniqueDates.map(dateStr => ({
        date: new Date(dateStr).toISOString(),
        sessions: dateSessionMap.get(dateStr) ?? []
      }));

      if (this.lastAttendanceDate && dateSessionMap.has(this.lastAttendanceDate)) {
        summary.lastDaySessions = dateSessionMap.get(this.lastAttendanceDate)!.map(d => ({
          session: d.session,
          status: d.status
        }));
      } else {
        summary.lastDaySessions = [{ session: '-', status: 'Not Marked' }];
      }

      summary.attendancePercentage = uniqueDates.length > 0
        ? Math.round((summary.presentCount / (uniqueDates.length * (this.sessionList.length || 1))) * 100)
        : 0;
    });

    return Array.from(map.values());
  }

  private buildSummaryCards() {
    const lastDate = this.lastAttendanceDate;
    let lastDatePresent = 0, lastDateAbsent = 0, lastDateLate = 0, lastDateSessionCount = 0;

    if (this.studentSummaries.length > 0) {
      lastDateSessionCount = Math.max(
        ...this.studentSummaries.map(s => {
          const g = s.dayGroups.find(d => new Date(d.date).toDateString() === lastDate);
          return g ? g.sessions.filter(x => x.status !== 'Not Marked').length : 0;
        })
      );
    }

    this.studentSummaries.forEach(s => {
      const lastDayGroup = s.dayGroups.find(d => new Date(d.date).toDateString() === lastDate);
      const lastDaySessions = lastDayGroup?.sessions ?? [];
      const statuses = lastDaySessions.map(x => x.status);
      if (statuses.includes('Present')) lastDatePresent++;
      else if (statuses.length > 0 && statuses.every(x => x === 'Absent')) lastDateAbsent++;
      if (lastDaySessions.some(sess => sess.lateMinutes > 0)) lastDateLate++;
    });

    const labelDate = lastDate
      ? new Date(lastDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '';

    const totalSessionCount = this.studentSummaries.length > 0
      ? this.studentSummaries[0].dayGroups.reduce((sum, g) =>
          sum + g.sessions.filter(x => x.status !== 'Not Marked').length, 0)
      : 0;

    this.summaryCards = {
      totalStudents: this.studentSummaries.length,
      totalDays: this.totalAttendanceDays,
      totalSessionCount,
      lastDateLabel: labelDate,
      lastDateSessionCount,
      lastDatePresent,
      lastDateAbsent,
      lastDateLate,
      lateCount: this.studentSummaries.reduce((a, s) => a + s.lateCount, 0)
    };
  }

  private isFilterReady(): boolean {
    const formValue = this.SyllabusForm.getRawValue();
    const hasSchool = !this.isAdmin || Number(formValue.School) > 0;
    return hasSchool &&
      Number(formValue.AcademicYear) > 0 &&
      Number(formValue.Class) > 0 &&
      Number(formValue.Divisions) > 0 &&
      !!formValue.FromDateTime &&
      !!formValue.ToDateTime;
  }

  private resetAttendanceView() {
    this.studentSummaries = [];
    this.rawData = [];
    this.SyllabusCount = 0;
    this.totalAttendanceDays = 0;
    this.lastAttendanceDate = '';
    this.isTableVisible = false;
    this.closeStudentDetails();
    this.summaryCards = { totalStudents: 0, totalDays: 0, totalSessionCount: 0, lastDateLabel: '', lastDateSessionCount: 0, lastDatePresent: 0, lastDateAbsent: 0, lastDateLate: 0, lateCount: 0 };
    this.currentPage = 1;
  }

  get pagedStudentSummaries() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.studentSummaries.slice(start, start + this.pageSize);
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

  firstPage() {
    this.goToPage(1);
  }

  lastPage() {
    this.goToPage(this.totalPages());
  }

  goToPage(pageNumber: number) {
    const total = this.totalPages();
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > total) pageNumber = total;
    clearTimeout(this.paginationLoaderTimer);
    this.loader.show();
    this.currentPage = pageNumber;
    this.paginationLoaderTimer = setTimeout(() => {
      this.loader.hide();
    }, 150);
  }

  totalPages() {
    return Math.ceil(this.SyllabusCount / this.pageSize);
  }

  getVisiblePageNumbers() {
    const totalPages = this.totalPages();
    const pages = [];
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, totalPages);
    if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }
}
