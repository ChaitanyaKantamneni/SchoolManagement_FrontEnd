import { NgClass, NgFor, NgIf, SlicePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { MatIconModule } from '@angular/material/icon';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { LoaderService } from '../../../Services/loader.service';

interface LeaveRequest {
  id: string;
  applicantName: string;
  applicantId: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number | string;
  appliedOn: string;
  reason: string;
  status: string;
  approvalRemarks: string;
  approvedByName?: string;
  approvedById?: string;
  currentApproverID: string;
  admissionNo?: string;
  className?: string;
  divisionName?: string;
  role?: string;
}

@Component({
  selector: 'app-leaveapproval',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, FormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './leaveapproval.component.html',
  styleUrl: './leaveapproval.component.css'
})
export class LeaveapprovalComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Leave Approval';

  // ── session helpers ──────────────────────────────────────────────────
  private ss(key: string) { return sessionStorage.getItem(key) || localStorage.getItem(key) || ''; }
  
  // Role lookup for staff role names
  private staffRoleLookup = new Map<string, string>();
  roleList: Array<{ ID: string; Name: string }> = [];

  // Dynamic Role Getters based on Names
  get currentRoleName(): string { return (this.ss('roleName') || this.ss('RoleName') || this.ss('rollName') || this.ss('RollName') || '').trim(); }
  get currentRollID(): string { return (this.ss('RollID') || this.ss('rollID') || this.ss('menuRoleId') || this.ss('RoleID') || '').trim(); }

  protected override get isAdmin(): boolean { return this.currentRollID === '1'; }

  // In this project, School Admin/Principal is usually '2', '3', or '8'. 
  // We'll trust the RollID if it's '2', '8', or the string 'admin'/'principal'/'management'
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
    // Anyone else who isn't a child/student in this context
    return !this.isAdmin && !this.isSchoolAdmin && !this.isParent && (id === '3' || id === '5' || r.includes('staff') || r.includes('driver') || r.includes('accountant'));
  }

  public get resolvedSchoolId(): string {
    const keys = ['SchoolID', 'schoolId', 'schoolID', 'SchoolId', 'sId', 'sid', 'SID', 'SId', 'school_id', 'School_Id', 'user_school_id'];
    for (const k of keys) {
      const val = this.ss(k);
      if (val && val !== '0' && val !== 'null' && val !== 'undefined' && !isNaN(Number(val))) {
        return val.toString().trim();
      }
    }
    return this.selectedSchoolId || '';
  }

  readonly schoolId     = this.ss('SchoolID') || this.ss('schoolId');
  
  private get sessionApplicantId(): string {
    // Prefer numeric IDs from session for API compatibility
    const keys = ['StaffID', 'staffId', 'StaffId', 'UserID', 'userId', 'UserId', 'user_id', 'id', 'ID', 'RollID', 'rollID', 'menuRoleId'];
    for (const k of keys) {
      const val = this.ss(k);
      if (val && val !== '0' && val !== 'null' && val !== 'undefined' && !isNaN(Number(val))) {
        return val.toString().trim();
      }
    }
    // Fallback: use currentRollID if available
    const fallbackId = this.currentRollID;
    if (fallbackId && fallbackId !== '0' && !isNaN(Number(fallbackId))) {
      return fallbackId;
    }
    return '';
  }

  private resolvedStaffId: string = '';

  get currentUserId(): string {
    return this.resolvedStaffId || this.sessionApplicantId || this.ss('StaffID') || this.ss('UserID');
  }

  // ── state (Aligned with Buses structure) ─────────────────────────────────────
  schoolList:     Array<{ ID: string; Name: string }> = [];
  academicYears:  Array<{ ID: string; Name: string }> = [];
  staffList:      Array<{ ID: string; Name: string; RoleID: string; email?: string; Email?: string }> = [];
  
  RequestList:    LeaveRequest[] = [];
  filteredList:   LeaveRequest[] = [];
  paginatedList:  LeaveRequest[] = [];
  RequestCount:   number = 0;
  private rawData: any[] = [];

  selectedSchoolId      = '';
  selectedAcademicYearId = '';
  
  searchQuery   = '';
  statusFilter: 'All' | 'Pending' | 'Approved' | 'Rejected' = 'All';
  userTypeFilter: 'Staff' | 'Student' = 'Student';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  visiblePageCount = 3;

  isLoading      = false;
  isSubmitting   = false;
  
  isViewModalOpen = false; // Mimics viewReview modal in Buses
  selectedRequest: LeaveRequest | null = null;
  actionRemarks  = '';

  AminityInsStatus = ''; // Mimics modal status message in Buses
  isModalOpen      = false;

  constructor(menu: MenuServiceService, router: Router, private api: ApiServiceService, public loader: LoaderService) {
    super(menu, router);
  }

  ngOnInit(): void {
    console.log('[LEAVE APPROVAL] ngOnInit - Role detection:', {
      currentRoleName: this.currentRoleName,
      currentRollID: this.currentRollID,
      isAdmin: this.isAdmin,
      isSchoolAdmin: this.isSchoolAdmin,
      isTeacher: this.isTeacher,
      schoolId: this.schoolId,
      resolvedSchoolId: this.resolvedSchoolId
    });

    // Set default user type based on role
    if (this.isTeacher) {
      this.userTypeFilter = 'Student'; // Teachers can only see students
    } else if (this.isAdmin || this.isSchoolAdmin) {
      this.userTypeFilter = 'Student'; // Default to Student but can change
    }

    if (this.isAdmin) {
      this.selectedSchoolId = '0';
      this.selectedAcademicYearId = '';
      this.fetchSchools();
      this.fetchLeaveRequests(); // Auto-fetch on load
    } else if (this.isSchoolAdmin) {
      this.selectedSchoolId = this.resolvedSchoolId || this.schoolId;
      this.selectedAcademicYearId = '';
      console.log('[LEAVE APPROVAL] SchoolAdmin/Principal - selectedSchoolId:', this.selectedSchoolId);
      this.fetchAcademicYears();
      this.fetchLeaveRequests(); // Auto-fetch on load
    } else if (this.isTeacher) {
      this.selectedSchoolId = this.schoolId;
      this.selectedAcademicYearId = '';
      this.fetchAcademicYears();
      this.resolveStaffIdentity(); // Resolve StaffID before fetching leaves
      this.fetchLeaveRequests(); // Auto-fetch on load
    }
  }

  // ── context handlers ─────────────────────────────────────────────────────────
  onSchoolChange(e: Event): void {
    this.selectedSchoolId = (e.target as HTMLSelectElement).value;
    this.academicYears = []; 
    this.selectedAcademicYearId = ''; 
    this.RequestList = [];
    this.rawData = [];
    this.roleList = [];
    this.staffRoleLookup = new Map<string, string>();
    if (this.selectedSchoolId && this.selectedSchoolId !== '0') {
      this.fetchAcademicYears();
    } else {
      this.fetchLeaveRequests();
    }
  }

  onYearChange(e: Event): void {
    this.selectedAcademicYearId = (e.target as HTMLSelectElement).value;
    this.fetchLeaveRequests();
  }

  onUserTypeChange(): void {
    this.fetchLeaveRequests();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  // ── fetch ────────────────────────────────────────────────────────────
  fetchLeaveRequests(): void {
    this.isLoading = true;
    this.loader.show();

    // Fetch staff roles and role list for role lookup
    this.fetchStaffRoles();
    this.fetchRoleList();

    let flag = '2';

// 👉 If Teacher → use Flag 10
if (this.isTeacher) {
  flag = '10';
}

const payload: any = {
  Flag: flag,
  SchoolID: this.selectedSchoolId === '0' ? '' : (this.selectedSchoolId || ''),
  AcademicYear: this.selectedAcademicYearId === '0' ? '' : (this.selectedAcademicYearId || ''),
  Limit: 500,
  Offset: 0,
  UserType: this.userTypeFilter,

  // 👉 VERY IMPORTANT: pass StaffID for teacher filtering
  StaffID: this.isTeacher ? this.currentUserId : null
};

console.log('[LEAVE APPROVAL] Teacher payload - currentUserId:', this.currentUserId, 'isTeacher:', this.isTeacher, 'StaffID being sent:', payload.StaffID);

    // If School Admin (RollID '2') is viewing Staff leaves, exclude their own leaves
    if (this.userTypeFilter === 'Staff' && this.currentRollID === '2' && !this.isAdmin) {
      payload.ExcludeStaffID = this.currentUserId;
      console.log('[LEAVE APPROVAL] School Admin excluding own leaves - ExcludeStaffID:', payload.ExcludeStaffID);
    }

    this.api.post<any>('Tbl_LeaveApplication_Operations', payload).subscribe({
      next: (res) => {
        this.loader.hide();
        let list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.Data) ? res.Data : []);
        
        // Client-side filtering: School Admin should not see their own leaves
        if (this.userTypeFilter === 'Staff' && this.currentRollID === '2' && !this.isAdmin) {
          const originalCount = list.length;
          console.log('[LEAVE APPROVAL] Before filter - sample item:', list[0]);
          console.log('[LEAVE APPROVAL] Current RollID:', this.currentRollID);
          console.log('[LEAVE APPROVAL] staffRoleLookup:', this.staffRoleLookup);
          
          list = list.filter((item: any) => {
            const staffID = String(item.staffID || item.StaffID || '').trim();
            const roleID = this.staffRoleLookup.get(staffID);
            console.log('[LEAVE APPROVAL] Checking item:', item.applicantName, 'staffID:', staffID, 'roleID:', roleID, 'is School Admin?', roleID === '2');
            // Exclude leaves where staffID maps to role '2' (School Admin)
            return roleID !== '2';
          });
          console.log('[LEAVE APPROVAL] School Admin filtered out own leaves:', originalCount, '->', list.length);
        }
        
        this.rawData = list;
        this.RequestList = list.map((item: any) => {
          const f = item.fromDate || item.FromDate || '';
          const t = item.toDate   || item.ToDate   || '';
          const name = item.applicantName || item.ApplicantName || item.staffName || item.StaffName || item.studentName || item.StudentName || item.firstName || item.FirstName || 'Unknown';
          return {
            id:               String(item.id ?? item.ID ?? ''),
            applicantName:    name,
            applicantId:      item.admissionNo || item.AdmissionNo || item.applicantID || item.ApplicantID || item.staffID || item.StaffID || '—',
            leaveType:        item.leaveType      || item.LeaveType      || '—',
            fromDate:         f,
            toDate:           t,
            days:             item.noOfDays || item.NoOfDays || '—',
            appliedOn:        (item.createdDate || item.CreatedDate || '').split('T')[0],
            reason:           item.reason || item.Reason || '—',
            status:           item.applicationStatus || item.ApplicationStatus || 'Pending',
            approvalRemarks:  item.adminRemarks || item.AdminRemarks || '',
            approvedByName:   item.approvedByName || item.ApprovedByName || '',
            approvedById:     item.approvedBy || item.ApprovedBy || '',
            className:        item.className || item.ClassName || '',
            divisionName:     item.divisionName || item.DivisionName || '',
            admissionNo:      item.admissionNo || item.AdmissionNo || '',
            currentApproverID: '',
            role:             this.userTypeFilter === 'Staff' ? this.getResolvedRole(item) : undefined
          } as LeaveRequest;
        });
        this.RequestCount = this.RequestList.length;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => { this.loader.hide(); this.RequestList = []; this.RequestCount = 0; this.isLoading = false; }
    });
  }

  // ── filter / helpers ─────────────────────────────────────────────────────────
  applyFilters(): void {
    const term = this.searchQuery.trim().toLowerCase();
    this.filteredList = this.RequestList.filter(r => {
      const statusOk = this.statusFilter === 'All' || r.status === this.statusFilter;
      const searchOk = !term ||
        r.applicantName.toLowerCase().includes(term) ||
        r.applicantId.toLowerCase().includes(term) ||
        r.leaveType.toLowerCase().includes(term);
      return statusOk && searchOk;
    });
    this.currentPage = 1;
    this.updatePaginatedList();
  }

  updatePaginatedList(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedList = this.filteredList.slice(start, end);
  }

  getStatusClass(s: string) { return s?.toLowerCase() || 'pending'; }

  // ── pagination (Aligned with Exam-Type) ─────────────────────────────────────
  totalPages(): number {
    return Math.ceil(this.filteredList.length / this.pageSize);
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

  goToPage(page: number): void {
    const total = this.totalPages();
    if (page < 1) page = 1;
    if (page > total) page = total;
    this.currentPage = page;
    this.updatePaginatedList();
  }

  // ── modal actions (Aligned with Buses) ───────────────────────────────────────
  viewReview(req: LeaveRequest): void {
    this.selectedRequest = req;
    this.actionRemarks   = req.approvalRemarks || '';
    this.isViewModalOpen = true;
  }

  closeModal(type: 'view' | 'status'): void {
    if (type === 'view') {
      this.isViewModalOpen = false;
      this.selectedRequest = null;
      this.actionRemarks   = '';
    }
    if (type === 'status') {
      this.isModalOpen = false;
    }
  }

  handleOk() {
    this.isModalOpen = false;
    this.fetchLeaveRequests();
  }

  get remarks() { return this.actionRemarks; }
  set remarks(v: string) { this.actionRemarks = v; }

  // approve / reject 
  updateStatus(status: 'Approved' | 'Rejected'): void {
    const req = this.selectedRequest;
    if (!req || this.isSubmitting) return;
    this.isSubmitting = true;
    this.loader.show();

    // Determine approver display name for parent view
    let approverDisplayName = 'Admin';
    if (this.isTeacher) {
      // Try to get teacher name from session, fallback to email
      let teacherName = this.ss('StaffName') || this.ss('FullName') || this.ss('firstName');
      if (!teacherName) {
        const email = this.ss('email') || this.ss('Email') || '';
        if (email && email.includes('@')) {
          teacherName = email.split('@')[0];
        } else {
          teacherName = 'Teacher';
        }
      }
      approverDisplayName = teacherName;
    } else if (this.isSchoolAdmin) {
      approverDisplayName = this.ss('StaffName') || this.ss('FullName') || this.ss('firstName') || 'School Admin';
    } else if (this.isAdmin) {
      approverDisplayName = 'Admin'; // Super admin always shows as "Admin"
    }
    
    this.api.post<any>('Tbl_LeaveApplication_Operations', {
      Flag:    '5',
      ID:      String(req.id),
      ApprovedBy: String(this.currentUserId || this.ss('UserID') || '1'),
      ApplicationStatus:  status,
      AdminRemarks: this.actionRemarks.trim() || `${status} by ${approverDisplayName}`,
      ApprovedByName: approverDisplayName,
      fee: "0" 
    }).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.loader.hide();
        if (res?.statusCode === 200 || res?.StatusCode === 200) {
          this.isViewModalOpen = false;
          this.AminityInsStatus = `Leave ${status} successfully.`;
          this.isModalOpen = true;
        } else {
          this.AminityInsStatus = res?.message || 'Action failed.';
          this.isModalOpen = true;
        }
      },
      error: () => { this.isSubmitting = false; this.loader.hide(); this.AminityInsStatus = 'Error occurred.'; this.isModalOpen = true; }
    });
  }

  // ── private fetches ──────────────────────────────────────────────────────────
  private fetchSchools(): void {
    this.api.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (res: any) => {
        this.schoolList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({ ID: String(i.id ?? i.ID), Name: String(i.name ?? i.Name) })) : [];
      },
      error: () => { this.schoolList = []; }
    });
  }

  private fetchAcademicYears(): void {
    if (!this.selectedSchoolId) return;
    this.api.post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: this.selectedSchoolId, Flag: '2' }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.Data) ? res.Data : []);
        this.academicYears = list.map((i: any) => ({ ID: String(i.id ?? i.ID ?? ''), Name: String(i.name ?? i.Name ?? '') }));
        // Don't auto-select academic year - let user choose manually
      },
      error: () => { this.academicYears = []; }
    });
  }

  private resolveStaffIdentity(): void {
    const schoolId = this.resolvedSchoolId;
    const email = (this.ss('email') || this.ss('Email') || '').toString().trim().toLowerCase();

    if (!schoolId || !email) return;

    // Fetch the staff list for the school to find the matching StaffID
    this.api.post<any>('Tbl_Staff_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId
    }).subscribe({
      next: (res: any) => {
        const list = res?.data || [];
        const match = list.find((s: any) => (s.email || s.Email || '').toLowerCase() === email);
        if (match) {
          this.resolvedStaffId = String(match.id || match.ID);
          console.log('[LEAVE APPROVAL] Resolved Teacher StaffID:', this.resolvedStaffId);
          // Reload leaves now that we have the definitive ID
          this.fetchLeaveRequests();
        }
      }
    });
  }

  private fetchStaffRoles(): void {
    if (!this.selectedSchoolId || this.selectedSchoolId === '0') return;
    
    this.api.post<any>('Tbl_Staff_CRUD_Operations', { 
      SchoolID: this.selectedSchoolId, 
      Flag: '2' 
    }).subscribe({
      next: (response: any) => {
        if (Array.isArray(response?.data)) {
          response.data.forEach((item: any) => {
            const staffId = String(item.id ?? item.ID ?? '').trim();
            const role = String(item.roleName ?? item.RoleName ?? item.role ?? item.staffType ?? '').trim();
            if (staffId && role) {
              this.staffRoleLookup.set(staffId, role);
            }
          });
          console.log('Leave Approval - Staff roles loaded:', this.staffRoleLookup);
          
          // Re-process requests now that staff roles are loaded
          if (this.RequestList.length > 0) {
            this.reprocessRequestsWithRoles();
          }
        }
      },
      error: () => { console.error('Failed to fetch staff roles'); }
    });
  }

  private reprocessRequestsWithRoles(): void {
    this.RequestList = this.rawData.map((item: any) => {
      const f = item.fromDate || item.FromDate || '';
      const t = item.toDate   || item.ToDate   || '';
      const name = item.applicantName || item.ApplicantName || item.staffName || item.StaffName || item.studentName || item.StudentName || item.firstName || item.FirstName || 'Unknown';
      return {
        id:               String(item.id ?? item.ID ?? ''),
        applicantName:    name,
        applicantId:      item.admissionNo || item.AdmissionNo || item.applicantID || item.ApplicantID || item.staffID || item.StaffID || '—',
        leaveType:        item.leaveType      || item.LeaveType      || '—',
        fromDate:         f,
        toDate:           t,
        days:             item.noOfDays || item.NoOfDays || '—',
        appliedOn:        (item.createdDate || item.CreatedDate || '').split('T')[0],
        reason:           item.reason || item.Reason || '—',
        status:           item.applicationStatus || item.ApplicationStatus || 'Pending',
        approvalRemarks:  item.adminRemarks || item.AdminRemarks || '',
        approvedByName:   item.approvedByName || item.ApprovedByName || '',
        approvedById:     item.approvedBy || item.ApprovedBy || '',
        className:        item.className || item.ClassName || '',
        divisionName:     item.divisionName || item.DivisionName || '',
        admissionNo:      item.admissionNo || item.AdmissionNo || '',
        currentApproverID: '',
        role:             this.userTypeFilter === 'Staff' ? this.getResolvedRole(item) : undefined
      } as LeaveRequest;
    });
    this.applyFilters();
  }

  private fetchRoleList(): void {
    // Don't pass SchoolID - API expects empty or no SchoolID
    this.api.post<any>('Tbl_Roles_CRUD_Operations', {
      SchoolID: '',
      Flag: '2'
    }).subscribe(
      (response: any) => {
        this.roleList = Array.isArray(response?.data)
          ? response.data.map((item: any) => ({
              ID: String(item.id ?? item.ID ?? ''),
              Name: String(item.roleName ?? item.RoleName ?? item.name ?? item.Name ?? '').trim() || String(item.id ?? item.ID ?? '')
            }))
          : [];
        console.log('Leave Approval - Roles loaded:', this.roleList);
        
        // Re-process requests now that roles are loaded
        if (this.RequestList.length > 0) {
          this.reprocessRequestsWithRoles();
        }
      },
      () => { this.roleList = []; }
    );
  }

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

  private getRoleDisplay(roleValue: any): string {
    const roleTokens = this.normalizeRoleIds(roleValue);

    if (roleTokens.length === 0) {
      return '-';
    }

    return roleTokens
      .map((token: string) => {
        const match = this.roleList.find((role: any) => String(role.ID).trim() === token);
        return match?.Name || token;
      })
      .join(', ');
  }

  private getRoleFromStaffLookup(staffId: any): string {
    const key = String(staffId ?? '').trim();
    const rawValue = this.staffRoleLookup.get(key);
    if (!rawValue) return '-';
    const resolved = this.getRoleDisplay(rawValue);
    return (resolved && resolved !== '-') ? resolved : rawValue;
  }

  private getResolvedRole(row: any): string {
    console.log('[LEAVE APPROVAL] getResolvedRole row:', JSON.stringify({ role: row.role, roleName: row.roleName, staffType: row.staffType, applicantID: row.applicantID, applicantId: row.applicantId, staffID: row.staffID }));
    console.log('[LEAVE APPROVAL] roleList:', this.roleList);
    console.log('[LEAVE APPROVAL] staffRoleLookup:', this.staffRoleLookup);
    
    const directRoleValue = row.role ?? row.Role ?? row.roleName ?? row.RoleName ?? '';
    if (directRoleValue && !/^\d+$/.test(String(directRoleValue).trim())) {
      console.log('[LEAVE APPROVAL] Using direct role value:', directRoleValue);
      return String(directRoleValue).trim();
    }

    if (directRoleValue) {
      const resolved = this.getRoleDisplay(directRoleValue);
      console.log('[LEAVE APPROVAL] Resolved from directRoleValue:', resolved);
      if (resolved && resolved !== '-') return resolved;
    }

    const staffType = row.staffType ?? row.StaffType ?? '';
    if (staffType) {
      const resolved = this.getRoleDisplay(staffType);
      console.log('[LEAVE APPROVAL] Resolved from staffType:', resolved);
      if (resolved && resolved !== '-') return resolved;
    }

    const lookupResult = this.getRoleFromStaffLookup(row.applicantID ?? row.applicantId ?? row.staffID ?? row.StaffID);
    console.log('[LEAVE APPROVAL] Resolved from staffRoleLookup:', lookupResult);
    return lookupResult;
  }

  // ── role-based helpers ───────────────────────────────────────────────────────────
  get canViewStaff(): boolean {
    return this.isAdmin || this.isSchoolAdmin;
  }

  get canViewStudents(): boolean {
    return this.isAdmin || this.isSchoolAdmin || this.isTeacher;
  }

  get availableUserTypes(): Array<{ value: string; label: string }> {
    const types = [];
    if (this.canViewStudents) {
      types.push({ value: 'Student', label: 'Students' });
    }
    if (this.canViewStaff) {
      types.push({ value: 'Staff', label: 'Staff' });
    }
    return types;
  }

  // ── staff role name resolution (like viewstaffattendance) ─────────────────────
  getStaffRoleName(req: LeaveRequest): string {
    // First try to use already resolved role from request data
    if (req.role && req.role !== '-' && !/^\d+$/.test(String(req.role).trim())) {
      return String(req.role).trim();
    }

    // Use staffRoleLookup to get role name
    const staffId = String(req.applicantId || '').trim();
    if (!staffId) return '-';
    
    const roleFromLookup = this.staffRoleLookup.get(staffId);
    if (roleFromLookup) {
      // If it's a numeric role ID, try to resolve it using roleList
      if (/^\d+$/.test(roleFromLookup.trim())) {
        const roleMatch = this.roleList.find(role => String(role.ID) === roleFromLookup.trim());
        return roleMatch ? roleMatch.Name : roleFromLookup;
      }
      return roleFromLookup;
    }

    return '-';
  }
}
