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

type StaffAttendanceDetail = {
  attendanceDateTime: string;
  session: string;
  sessionID: string;
  status: AttendanceStatus;
  originalStatus: AttendanceStatus;
  isPresent: boolean;
  lateMinutes: number;
  leaveType: string;
  Remark: string;
  originalRemark: string;
  showRemark: boolean;
  showFullRemark: boolean;
};

type DayGroup = {
  date: string;
  sessions: StaffAttendanceDetail[];
};

type StaffAttendanceSummary = {
  staffID: string;
  staffName: string;
  role: string;
  totalDays: number;
  presentCount: number;
  absentCount: number;
  notMarkedCount: number;
  lateCount: number;
  totalLateMinutes: number;
  attendancePercentage: number;
  lastDaySessions: { session: string; status: AttendanceStatus }[];
  details: StaffAttendanceDetail[];
  dayGroups: DayGroup[];
};

@Component({
  selector: 'app-viewstaffattendance',
  imports: [NgIf, NgFor, NgClass, DatePipe, SlicePipe, FormsModule, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule],
  templateUrl: './viewstaffattendance.component.html',
  styleUrl: './viewstaffattendance.component.css'
})
/**
 * Class Responsibility: Handles view logic and user interactions for ViewstaffattendanceComponent.
 */
export class ViewstaffattendanceComponent extends BasePermissionComponent {
  pageName = 'ViewStaffAttendance';

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
    this.AdminSelectedActiveAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';
    
    // Set From Date and To Date to current date for all login types
    const today = new Date().toISOString().split('T')[0];
    this.SyllabusForm.patchValue({
      FromDateTime: today,
      ToDateTime: today
    });
    
    const schoolFromSession = sessionStorage.getItem('SchoolID') || localStorage.getItem('SchoolID') || '';
    if (!this.AdminselectedSchoolID) {
      this.AdminselectedSchoolID = schoolFromSession;
    }

    if (this.isAdmin) {
      this.SyllabusForm.get('AcademicYear')?.enable({ emitEvent: false });
    } else {
      this.SyllabusForm.get('AcademicYear')?.disable({ emitEvent: false });
    }

    this.SyllabusForm.get('School').patchValue(this.isAdmin ? 0 : this.AdminselectedSchoolID);
    this.SyllabusForm.get('AcademicYear').patchValue(this.AdminSelectedActiveAcademicYearID);
    this.AdminselectedAcademivYearID = this.AdminSelectedActiveAcademicYearID;
    this.FetchSessionsList();
    if (!this.isAdmin) {
      // fetch roles first, then academic years — no FetchAcademicYearsList duplicate
      this.FetchRoleList();
      this.FetchStaffRoleLookup();
      this.FetchAcademicYearsList();
    } else {
      this.FetchSchoolsList();
      this.FetchAcademicYearsList();
    }
  }

  schoolList: any[] = [];
  academicYearList: any[] = [];
  sessionList: any[] = [];
  roleList: any[] = [];
  private staffRoleLookup = new Map<string, string>();
  private paginationLoaderTimer: any;

  AdminselectedSchoolID = '';
  AdminselectedAcademivYearID = '';
  AdminSelectedActiveAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';
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
  selectedStaff: StaffAttendanceSummary | null = null;
  staffSummaries: StaffAttendanceSummary[] = [];
  private rawData: any[] = [];

  statusModalTitle = 'Status';
  statusMessage = '';
  isStatusModalOpen = false;

  summaryCards = {
    totalStaff: 0,
    totalDays: 0,
    totalSessionCount: 0,
    lastDateLabel: '',
    lastDatePresent: 0,
    lastDateAbsent: 0,
    lastDateLate: 0
  };

  SyllabusForm: any = new FormGroup({
    School: new FormControl(0, [Validators.required, Validators.min(1)]),
    AcademicYear: new FormControl(0, [Validators.required, Validators.min(1)]),
    Session: new FormControl(0),
    FromDateTime: new FormControl('', [Validators.required]),
    ToDateTime: new FormControl('', [Validators.required])
  });

  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  /**
   * Executes the operation: getCurrentSchoolId
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private getCurrentSchoolId(): string {
    if (this.isAdmin) {
      return this.AdminselectedSchoolID || '';
    }

    return (
      this.AdminselectedSchoolID ||
      sessionStorage.getItem('SchoolID')?.toString() ||
      localStorage.getItem('SchoolID')?.toString() ||
      sessionStorage.getItem('schoolId')?.toString() ||
      localStorage.getItem('schoolId')?.toString() ||
      ''
    );
  }

  /**
   * Executes the operation: mapRoleItem
   * Parameters: item: any
   * Rationale: Standard operational controller for the active view.
   */
  private mapRoleItem(item: any) {
    const rawId = item?.id ?? item?.ID ?? item?.roleId ?? item?.roleID ?? '';
    const rawName =
      item?.roleName ??
      item?.RoleName ??
      item?.name ??
      item?.Name ??
      item?.role ??
      item?.Role ??
      item?.staffTypeName ??
      item?.title ??
      item?.label ??
      item?.description ??
      rawId;

    return {
      ID: String(rawId).trim(),
      Name: String(rawName).trim() || String(rawId).trim()
    };
  }

  /**
   * Executes the operation: FetchSchoolsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: FetchAcademicYearsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: FetchRoleList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchRoleList() {
    this.apiurl.post<any>('Tbl_Roles_CRUD_Operations', {
      SchoolID: '',
      Flag: '2'
    }).subscribe(
      (response: any) => {
        this.roleList = Array.isArray(response?.data)
          ? response.data.map((item: any) => this.mapRoleItem(item))
          : [];

        // re-process data now that roles are loaded (fixes school-wise login race condition)
        if (this.isTableVisible && this.rawData.length > 0) {
          this.processData(this.rawData);
        }
      },
      () => { this.roleList = []; }
    );
  }

  /**
   * Executes the operation: FetchStaffRoleLookup
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchStaffRoleLookup() {
    this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', {
      SchoolID: this.getCurrentSchoolId(),
      Flag: '2'
    }).subscribe(
      (response: any) => {
        const lookup = new Map<string, string>();

        if (Array.isArray(response?.data)) {
          response.data.forEach((item: any) => {
            const staffId = String(item.id ?? item.ID ?? '').trim();
            if (!staffId) return;
            // Store raw staffType value — resolve lazily in getResolvedRole once roleList is ready
            const rawStaffType = String(
              item.staffType ??
              item.StaffType ??
              item.roleName ??
              item.RoleName ??
              item.staffTypeName ??
              item.staffTypeNames ??
              item.role ??
              item.Role ??
              ''
            ).trim();
            if (rawStaffType) lookup.set(staffId, rawStaffType);
          });
        }

        this.staffRoleLookup = lookup;

        // re-process data now that staff lookup is ready (fixes school-wise login race condition)
        if (this.isTableVisible && this.rawData.length > 0) {
          this.processData(this.rawData);
        }
      },
      () => {
        this.staffRoleLookup = new Map<string, string>();
      }
    );
  }

  /**
   * Executes the operation: FetchSessionsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchSessionsList() {
    const AcademicYearIdSelected =
    this.isAdmin
      ? this.AdminselectedAcademivYearID?.trim()
      : this.AdminSelectedActiveAcademicYearID || '';

    this.apiurl.post<any>('Tbl_Session_CRUD_Operations', {
      SchoolID: this.getCurrentSchoolId(),
      AcademicYear: AcademicYearIdSelected,
      Flag: '2'
    }).subscribe(
      (response: any) => {
        this.sessionList = Array.isArray(response?.data)
          ? response.data.map((item: any) => ({ ID: item.id, Name: `${item.session}-${item.startTime.substring(0, 5)}-${item.endTime.substring(0, 5)}` }))
          : [];
      },
      () => { this.sessionList = []; }
    );
  }

  /**
   * Executes the operation: onAdminSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminSchoolChange(event: Event) {
    const v = (event.target as HTMLSelectElement).value;
    this.AdminselectedSchoolID = v === '0' ? '' : v;
    this.academicYearList = []; this.sessionList = [];
    this.roleList = [];
    this.staffRoleLookup = new Map<string, string>();
    this.SyllabusForm.patchValue({ AcademicYear: 0, Session: 0 });
    this.AdminselectedAcademivYearID = ''; this.AdminSelectedSessionID = '';
    this.resetAttendanceView();
    if (this.AdminselectedSchoolID) this.FetchAcademicYearsList();
    if (this.AdminselectedSchoolID) this.FetchRoleList();
    if (this.AdminselectedSchoolID) this.FetchStaffRoleLookup();
  }

  /**
   * Executes the operation: onAdminAcademicYearchange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminAcademicYearchange(event: Event) {
    const v = (event.target as HTMLSelectElement).value;
    this.AdminselectedAcademivYearID = v === '0' ? '' : v;
    this.sessionList = [];
    this.SyllabusForm.patchValue({ Session: 0 });
    this.AdminSelectedSessionID = '';
    this.resetAttendanceView();
    if (this.AdminselectedAcademivYearID) {
      this.FetchSessionsList();
      // for school-wise login, refresh role lookup when academic year changes
      if (!this.isAdmin) {
        this.FetchRoleList();
        this.FetchStaffRoleLookup();
      }
    }
  }

  /**
   * Executes the operation: onSessionChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onSessionChange(event: Event) {
    const v = (event.target as HTMLSelectElement).value;
    this.AdminSelectedSessionID = v === '0' ? '' : v;
    if (this.isTableVisible && this.rawData.length > 0) {
      this.processData(this.rawData);
    } else {
      this.resetAttendanceView();
    }
  }

  /**
   * Executes the operation: onDateRangeChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  onDateRangeChange() { this.resetAttendanceView(); }

  /**
   * Executes the operation: openStaffDetails
   * Parameters: staff: StaffAttendanceSummary
   * Rationale: Standard operational controller for the active view.
   */
  openStaffDetails(staff: StaffAttendanceSummary) {
    this.selectedStaff = staff;
    this.isDetailModalOpen = true;
  }

  /**
   * Executes the operation: closeStaffDetails
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  closeStaffDetails() {
    this.isDetailModalOpen = false;
    this.selectedStaff = null;
  }

  /**
   * Executes the operation: onDetailToggleChange
   * Parameters: detail: StaffAttendanceDetail
   * Rationale: Standard operational controller for the active view.
   */
  onDetailToggleChange(detail: StaffAttendanceDetail) {
    const changed = detail.isPresent !== (detail.originalStatus === 'Present');
    if (changed) {
      detail.showRemark = true;
      detail.Remark = '';
    } else {
      detail.showRemark = false;
      detail.Remark = detail.originalRemark;
    }
  }

  /**
   * Executes the operation: updateStaffAttendance
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  updateStaffAttendance() {
    if (!this.selectedStaff) return;

    const changedRows = this.selectedStaff.dayGroups
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

    const students = changedRows.map(s => {
      const rawDate = new Date(s.attendanceDateTime);
      const yyyy = rawDate.getFullYear();
      const mm = String(rawDate.getMonth() + 1).padStart(2, '0');
      const dd = String(rawDate.getDate()).padStart(2, '0');
      const dateISO = `${yyyy}-${mm}-${dd} 00:00:00`;

      return {
        StaffID: this.selectedStaff!.staffID,
        AttendanceDate: dateISO,
        Session: (s.sessionID ?? '').toString(),
        Attendance: s.isPresent ? '1' : '0',
        LateInMinutes: (s.lateMinutes ?? 0).toString(),
        leavetype: s.leaveType ?? '0',
        Remarks: s.Remark.trim()
      };
    });

    this.apiurl.post('Tbl_StaffAttendance_CRUD_Operations', {
      Flag: '5',
      SchoolID: schoolId,
      AcademicYear: this.AdminselectedAcademivYearID,
      Students: students
    }).subscribe({
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

  /**
   * Executes the operation: loadAttendance
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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
      // Limit: '100'
    };

    if (this.AdminSelectedSessionID) body.Session = this.AdminSelectedSessionID;

    this.apiurl.post<any>('Tbl_StaffAttendance_CRUD_Operations', body).subscribe(
      (response: any) => {
        this.rawData = Array.isArray(response?.data) ? response.data : [];
        this.processData(this.rawData);
        this.loader.hide();
      },
      () => {
        this.rawData = [];
        this.staffSummaries = [];
        this.SyllabusCount = 0;
        this.isTableVisible = true;
        this.loader.hide();
      }
    );
  }

  /**
   * Executes the operation: processData
   * Parameters: rawData: any[]
   * Rationale: Standard operational controller for the active view.
   */
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

    this.staffSummaries = this.buildSummaries(data, uniqueDates);
    this.SyllabusCount = this.staffSummaries.length;
    this.isTableVisible = true;
    this.buildSummaryCards();
  }

  /**
   * Executes the operation: getSessionName
   * Parameters: sessionId: string
   * Rationale: Standard operational controller for the active view.
   */
  private getSessionName(sessionId: string): string {
    return this.sessionList.find((s: any) => s.ID == sessionId)?.Name ?? sessionId ?? '';
  }

  /**
   * Executes the operation: normalizeRoleIds
   * Parameters: roleValue: any
   * Rationale: Standard operational controller for the active view.
   */
  private normalizeRoleIds(roleValue: any): string[] {
    if (Array.isArray(roleValue)) {
      return roleValue.map((value: any) => String(value).trim()).filter(Boolean);
    }

    if (roleValue === null || roleValue === undefined) {
      return [];
    }

    return String(roleValue)
      .split(',')
      .map((id: string) => id.trim())
      .filter(Boolean);
  }

  /**
   * Executes the operation: getRoleDisplay
   * Parameters: roleValue: any
   * Rationale: Standard operational controller for the active view.
   */
  private getRoleDisplay(roleValue: any): string {
    const roleTokens = this.normalizeRoleIds(roleValue);

    if (roleTokens.length === 0) {
      return '-';
    }

    return roleTokens
      .map((token: string) => {
        const normalizedToken = String(token).trim().toLowerCase();
        const match = this.roleList.find((role: any) => {
          const roleId = String(role.ID ?? '').trim();
          const roleName = String(role.Name ?? '').trim().toLowerCase();
          return roleId === token || (roleName !== '' && roleName === normalizedToken);
        });
        return match?.Name || token;
      })
      .join(', ');
  }

  /**
   * Executes the operation: getRoleFromStaffLookup
   * Parameters: staffId: any
   * Rationale: Standard operational controller for the active view.
   */
  private getRoleFromStaffLookup(staffId: any): string {
    const key = String(staffId ?? '').trim();
    const rawValue = this.staffRoleLookup.get(key);
    if (!rawValue) return '-';
    // Resolve lazily now that roleList should be populated
    const resolved = this.getRoleDisplay(rawValue);
    return (resolved && resolved !== '-') ? resolved : rawValue;
  }

  /**
   * Executes the operation: getResolvedRole
   * Parameters: row: any
   * Rationale: Standard operational controller for the active view.
   */
  private getResolvedRole(row: any): string {
    // SP returns role name directly — use it if it's not a pure number
    const directRoleValue =
      row.role ??
      row.Role ??
      row.roleName ??
      row.RoleName ??
      row.staffTypeName ??
      row.staffTypeNames ??
      '';
    if (directRoleValue && !/^\d+$/.test(String(directRoleValue).trim())) {
      return String(directRoleValue).trim();
    }

    // If it's a numeric ID, resolve via roleList
    if (directRoleValue) {
      const resolved = this.getRoleDisplay(directRoleValue);
      if (resolved && resolved !== '-') return resolved;
    }

    // Fallback: resolve via staffType from staffRoleLookup
    const staffType = row.staffType ?? row.StaffType ?? '';
    if (staffType) {
      const resolved = this.getRoleDisplay(staffType);
      if (resolved && resolved !== '-') return resolved;
    }

    return this.getRoleFromStaffLookup(row.staffID ?? row.staffId);
  }

  /**
   * Executes the operation: buildSummaries
   * Parameters: data: any[], uniqueDates: string[]
   * Rationale: Standard operational controller for the active view.
   */
  private buildSummaries(data: any[], uniqueDates: string[]): StaffAttendanceSummary[] {
    const map = new Map<string, StaffAttendanceSummary>();
    const staffDateSessions = new Map<string, Map<string, StaffAttendanceDetail[]>>();

    data.forEach(row => {
      const key = row.staffID ?? row.staffId ?? '';
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          staffID: key,
          staffName: row.staffName ?? '',
          role: this.getResolvedRole(row),
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
        staffDateSessions.set(key, new Map());
      }

      const summary = map.get(key)!;
      // update role/name if not yet set (in case first row had null)
      if ((!summary.role || summary.role === '-') && (row.role || row.Role || row.roleName || row.RoleName || row.staffType || row.StaffType || row.staffID || row.staffId)) {
        summary.role = this.getResolvedRole(row);
      }
      if (!summary.staffName && row.staffName) summary.staffName = row.staffName;
      const dateSessionMap = staffDateSessions.get(key)!;
      const isPresent = row.attendance?.toString() === '1';
      const lateMin = parseInt(row.lateInMinutes ?? '0', 10) || 0;
      const status: AttendanceStatus = isPresent ? 'Present' : 'Absent';
      const dateKey = new Date(row.attendanceDate).toDateString();
      const sessionName = this.getSessionName(row.session);
      const remark = row.remarks ?? '';

      if (!dateSessionMap.has(dateKey)) dateSessionMap.set(dateKey, []);

      const detail: StaffAttendanceDetail = {
        attendanceDateTime: row.attendanceDate ?? '',
        session: sessionName,
        sessionID: row.session ?? '',
        status,
        originalStatus: status,
        isPresent,
        lateMinutes: lateMin,
        leaveType: row.leaveType ?? row.leavetype ?? '',
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
      const dateSessionMap = staffDateSessions.get(key)!;

      uniqueDates.forEach(dateStr => {
        if (!dateSessionMap.has(dateStr)) {
          summary.notMarkedCount++;
          const nmDetail: StaffAttendanceDetail = {
            attendanceDateTime: new Date(dateStr).toISOString(),
            session: '-',
            sessionID: '',
            status: 'Not Marked',
            originalStatus: 'Not Marked',
            isPresent: false,
            lateMinutes: 0,
            leaveType: '',
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

  /**
   * Executes the operation: buildSummaryCards
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private buildSummaryCards() {
    const lastDate = this.lastAttendanceDate;
    let lastDatePresent = 0, lastDateAbsent = 0, lastDateLate = 0, lastDateSessionCount = 0;

    if (this.staffSummaries.length > 0) {
      lastDateSessionCount = Math.max(
        ...this.staffSummaries.map(s => {
          const g = s.dayGroups.find(d => new Date(d.date).toDateString() === lastDate);
          return g ? g.sessions.filter(x => x.status !== 'Not Marked').length : 0;
        })
      );
    }

    this.staffSummaries.forEach(s => {
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

    const totalSessionCount = this.staffSummaries.length > 0
      ? this.staffSummaries[0].dayGroups.reduce((sum, g) =>
          sum + g.sessions.filter(x => x.status !== 'Not Marked').length, 0)
      : 0;

    this.summaryCards = {
      totalStaff: this.staffSummaries.length,
      totalDays: this.totalAttendanceDays,
      totalSessionCount,
      lastDateLabel: labelDate,
      lastDatePresent,
      lastDateAbsent,
      lastDateLate
    };
  }

  /**
   * Executes the operation: isFilterReady
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private isFilterReady(): boolean {
    const formValue = this.SyllabusForm.getRawValue();
    const hasSchool = !this.isAdmin || Number(formValue.School) > 0;
    return hasSchool &&
      Number(formValue.AcademicYear) > 0 &&
      !!formValue.FromDateTime &&
      !!formValue.ToDateTime;
  }

  /**
   * Executes the operation: resetAttendanceView
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private resetAttendanceView() {
    this.staffSummaries = [];
    this.rawData = [];
    this.SyllabusCount = 0;
    this.totalAttendanceDays = 0;
    this.lastAttendanceDate = '';
    this.isTableVisible = false;
    this.closeStaffDetails();
    this.summaryCards = { totalStaff: 0, totalDays: 0, totalSessionCount: 0, lastDateLabel: '', lastDatePresent: 0, lastDateAbsent: 0, lastDateLate: 0 };
    this.currentPage = 1;
  }

  get pagedStaffSummaries() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.staffSummaries.slice(start, start + this.pageSize);
  }

  /**
   * Executes the operation: previousPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  /**
   * Executes the operation: nextPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  nextPage() {
    if (this.currentPage < this.totalPages()) {
      this.goToPage(this.currentPage + 1);
    }
  }

  /**
   * Executes the operation: firstPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  firstPage() {
    this.goToPage(1);
  }

  /**
   * Executes the operation: lastPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  lastPage() {
    this.goToPage(this.totalPages());
  }

  /**
   * Executes the operation: goToPage
   * Parameters: pageNumber: number
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: totalPages
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  totalPages() {
    return Math.ceil(this.SyllabusCount / this.pageSize);
  }

  /**
   * Executes the operation: getVisiblePageNumbers
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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
