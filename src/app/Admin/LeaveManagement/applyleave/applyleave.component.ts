import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { ApiServiceService } from '../../../Services/api-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';

type LeaveStatus = 'Approved' | 'Pending' | 'Rejected';

interface LeaveHistoryItem {
  id: string;
  appliedOn: string;
  fromDate: string;
  toDate: string;
  leaveType: string;
  reason: string;
  status: LeaveStatus;
  approvalRemarks?: string;
}

@Component({
  selector: 'app-applyleave',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, ReactiveFormsModule, FormsModule, DashboardTopNavComponent],
  templateUrl: './applyleave.component.html',
  styleUrl: './applyleave.component.css'
})
export class ApplyleaveComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Apply Leave';

  readonly today = new Date().toISOString().split('T')[0];
  readonly schoolId =
    sessionStorage.getItem('SchoolID') || sessionStorage.getItem('schoolId') ||
    localStorage.getItem('SchoolID') || localStorage.getItem('schoolId') || '';

  protected override get isAdmin(): boolean {
    const roleId = sessionStorage.getItem('RollID') || localStorage.getItem('RollID') || '0';
    return roleId === '1';
  }

  private get applicantRoleId(): string {
    return sessionStorage.getItem('RollID') || localStorage.getItem('RollID') || '0';
  }

  get isStudent(): boolean {
    return this.applicantRoleId === '5';
  }

  private get applicantId(): string {
    if (this.isStudent) {
      return sessionStorage.getItem('AdmissionNo') || localStorage.getItem('AdmissionNo') || '';
    }
    return sessionStorage.getItem('StaffID') || sessionStorage.getItem('UserID') ||
           localStorage.getItem('StaffID') || localStorage.getItem('UserID') || '';
  }

  private get applicantName(): string {
    return sessionStorage.getItem('ApplicantName') ||
           sessionStorage.getItem('email')?.split('@')[0] || 'Unknown';
  }

  private get classId(): string {
    return sessionStorage.getItem('ClassID') || localStorage.getItem('ClassID') || '';
  }

  private get divisionId(): string {
    return sessionStorage.getItem('DivisionID') || localStorage.getItem('DivisionID') || '';
  }

  leaveTypes: string[] = [];
  leaveHistory: LeaveHistoryItem[] = [];

  selectedAcademicYear = '';
  selectedAcademicYearId = '';
  availableAcademicYears: Array<{ ID: string; Name: string }> = [];

  schoolList: Array<{ ID: string; Name: string }> = [];
  staffList: Array<{ ID: string; Name: string }> = [];
  selectedSchoolId = '';
  selectedStaffId = '';
  selectedStaffName = '';
  selectedStaffRoleId = '';

  private dataLoadTracker = { yearsLoaded: false, staffLoaded: false };

  isModalOpen = false;
  isLeaveDetailsModalOpen = false;
  applicationMessage = '';
  activeTab: 'apply' | 'list' = 'apply';
  selectedLeave: LeaveHistoryItem | null = null;
  isLoadingLeaves = false;

  leaveForm = new FormGroup(
    {
      fromDate: new FormControl(this.today, Validators.required),
      toDate: new FormControl(this.today, Validators.required),
      leaveType: new FormControl(''),
      reason: new FormControl('', [Validators.required, Validators.minLength(10)])
    },
    { validators: [this.dateRangeValidator] }
  );

  get requestedDays(): number {
    const from = this.leaveForm.get('fromDate')?.value;
    const to = this.leaveForm.get('toDate')?.value;
    if (!from || !to) return 0;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || toDate < fromDate) return 0;
    return Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
  }

  get selectedLeaveType(): string { return this.leaveForm.get('leaveType')?.value || 'Not selected'; }
  get leaveSummaryTitle(): string { return this.activeTab === 'apply' ? 'Request Summary' : 'Leave Overview'; }
  get leaveSummarySubtitle(): string { return this.activeTab === 'apply' ? 'Quick preview before submit' : 'Snapshot of your applied leave records'; }
  get approvedLeavesCount(): number { return this.leaveHistory.filter(i => i.status === 'Approved').length; }
  get pendingLeavesCount(): number { return this.leaveHistory.filter(i => i.status === 'Pending').length; }
  get rejectedLeavesCount(): number { return this.leaveHistory.filter(i => i.status === 'Rejected').length; }

  constructor(menuService: MenuServiceService, router: Router, private apiurl: ApiServiceService) {
    super(menuService, router);
  }

  ngOnInit(): void {
    if (!this.isStudent) {
      this.leaveForm.get('leaveType')?.addValidators(Validators.required);
      this.leaveForm.get('leaveType')?.updateValueAndValidity();
    }

    if (this.isAdmin) {
      this.fetchSchoolsList();
    } else {
      this.selectedSchoolId = this.schoolId;
      this.selectedStaffId = this.applicantId;
      this.selectedStaffRoleId = this.applicantRoleId;
      this.selectedStaffName = this.applicantName;
      this.fetchAcademicYears();
    }
  }

  setActiveTab(tab: 'apply' | 'list'): void {
    this.activeTab = tab;
    if (tab === 'list') this.fetchLeaveHistory();
  }

  onAcademicYearChange(event: Event): void {
    this.selectedAcademicYearId = (event.target as HTMLSelectElement).value;
    this.selectedAcademicYear = this.availableAcademicYears.find(i => i.ID === this.selectedAcademicYearId)?.Name || '';
    this.loadLeaveTypes();
    this.leaveHistory = [];
    if (this.activeTab === 'list') this.fetchLeaveHistory();
  }

  onAdminSchoolChange(event: Event): void {
    this.selectedSchoolId = (event.target as HTMLSelectElement).value;
    this.availableAcademicYears = [];
    this.staffList = [];
    this.selectedAcademicYearId = '';
    this.selectedStaffId = '';
    this.selectedStaffName = '';
    this.selectedStaffRoleId = '';
    this.leaveTypes = [];
    this.leaveHistory = [];
    this.dataLoadTracker = { yearsLoaded: false, staffLoaded: false };
    if (this.selectedSchoolId) {
      this.fetchAcademicYears();
      this.fetchStaffList();
    }
  }

  onAdminStaffChange(event: Event): void {
    const staffId = (event.target as HTMLSelectElement).value;
    const staff = this.staffList.find(s => s.ID === staffId);
    this.selectedStaffId = staffId;
    this.selectedStaffName = staff?.Name || '';
    this.leaveHistory = [];
    if (this.activeTab === 'list') this.fetchLeaveHistory();
  }

  submitLeave(): void {
    if (this.leaveForm.invalid) {
      this.leaveForm.markAllAsTouched();
      return;
    }

    const isAdminPickingStaff = this.isAdmin && !!this.selectedStaffId;
    const resolvedApplicantId = isAdminPickingStaff ? this.selectedStaffId : this.applicantId;
    const resolvedApplicantName = isAdminPickingStaff ? this.selectedStaffName : this.applicantName;
    const resolvedRoleId = isAdminPickingStaff ? Number(this.selectedStaffRoleId) : Number(this.applicantRoleId);

    const payload: any = {
      Flag: '1',
      SchoolID: this.selectedSchoolId,
      AcademicYear: this.selectedAcademicYearId,
      ApplicantID: resolvedApplicantId,
      ApplicantRoleID: resolvedRoleId,
      ApplicantName: resolvedApplicantName,
      FromDate: this.leaveForm.get('fromDate')?.value,
      ToDate: this.leaveForm.get('toDate')?.value,
      Reason: this.leaveForm.get('reason')?.value
    };

    if (!this.isStudent) {
      payload.LeaveType = this.leaveForm.get('leaveType')?.value;
    } else {
      payload.ClassID = this.classId;
      payload.DivisionID = this.divisionId;
    }

    this.apiurl.post<any>('LeaveManagement', payload).subscribe({
      next: (res) => {
        if (res.statusCode === 200 || res.StatusCode === 200) {
          this.showModal('Leave applied successfully.');
          this.resetForm();
          this.fetchLeaveHistory();
        } else {
          this.showModal(res.message || res.Message || 'Failed to apply leave.');
        }
      },
      error: (err) => {
        this.showModal(err?.error?.message || err?.error?.Message || 'Error occurred while applying for leave.');
      }
    });
  }

  resetForm(): void {
    this.leaveForm.reset({ fromDate: this.today, toDate: this.today, leaveType: '', reason: '' });
  }

  showModal(msg: string): void { this.applicationMessage = msg; this.isModalOpen = true; }
  closeModal(): void { this.isModalOpen = false; }
  selectLeave(leave: LeaveHistoryItem): void { this.selectedLeave = leave; this.isLeaveDetailsModalOpen = true; }
  closeLeaveDetailsModal(): void { this.isLeaveDetailsModalOpen = false; }
  getStatusClass(status: LeaveStatus): string { return status?.toLowerCase() || 'pending'; }
  trackByLeaveId(_: number, leave: LeaveHistoryItem): string { return leave.id; }

  private dateRangeValidator(control: AbstractControl) {
    const group = control as FormGroup;
    const from = group.get('fromDate')?.value;
    const to = group.get('toDate')?.value;
    if (!from || !to) return null;
    return new Date(to) < new Date(from) ? { invalidDateRange: true } : null;
  }

  private checkAndLoad(): void {
    if (this.isAdmin) {
      if (this.dataLoadTracker.yearsLoaded && this.dataLoadTracker.staffLoaded && this.selectedAcademicYearId) {
        this.loadLeaveTypes();
      }
    } else {
      if (this.dataLoadTracker.yearsLoaded) {
        this.loadLeaveTypes();
        this.fetchLeaveHistory();
      }
    }
  }

  private loadLeaveTypes(): void {
    if (!this.selectedSchoolId || !this.selectedAcademicYearId || this.isStudent) return;
    this.apiurl.post<any>('Tbl_leavePolicy_CRUD_Operations', {
      Flag: '2', SchoolID: this.selectedSchoolId, AcademicYear: this.selectedAcademicYearId
    }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.Data) ? res.Data : []);
        const active = list.filter((i: any) => String(i.isActive ?? i.IsActive ?? '0') === '1' || i.isActive === true);
        this.leaveTypes = Array.from(new Set(
          active.map((i: any) => String(i.leaveType ?? i.LeaveType ?? '')).filter(Boolean)
        )) as string[];
        if (!this.leaveTypes.includes(this.leaveForm.get('leaveType')?.value || '')) {
          this.leaveForm.get('leaveType')?.patchValue('');
        }
      },
      error: () => { this.leaveTypes = []; }
    });
  }

  private fetchLeaveHistory(): void {
    const applicantId = this.isAdmin ? this.selectedStaffId : this.applicantId;
    if (!applicantId) { this.leaveHistory = []; return; }
    this.isLoadingLeaves = true;
    this.apiurl.post<any>('LeaveManagement', {
      Flag: '3',
      ApplicantID: applicantId,
      SchoolID: this.selectedSchoolId,
      AcademicYear: this.selectedAcademicYearId,
      Limit: 100,
      Offset: 0
    }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.Data) ? res.Data : []);
        this.leaveHistory = list.map((item: any) => ({
          id: String(item.id ?? item.ID ?? ''),
          appliedOn: (item.createdDate || item.CreatedDate || '').split('T')[0],
          fromDate: item.fromDate || item.FromDate,
          toDate: item.toDate || item.ToDate,
          leaveType: item.leaveType || item.LeaveType || '-',
          reason: item.reason || item.Reason || '-',
          status: item.status || item.Status || 'Pending',
          approvalRemarks: item.approvalRemarks || item.ApprovalRemarks || ''
        }));
        this.isLoadingLeaves = false;
      },
      error: () => { this.leaveHistory = []; this.isLoadingLeaves = false; }
    });
  }

  private fetchAcademicYears(): void {
    if (!this.selectedSchoolId) return;
    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: this.selectedSchoolId, Flag: '2' }).subscribe({
      next: (res: any) => {
        const years = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.Data) ? res.Data : []);
        this.availableAcademicYears = years.map((i: any) => ({
          ID: String(i.id ?? i.ID ?? ''),
          Name: String(i.name ?? i.Name ?? '')
        }));
        if (this.availableAcademicYears.length > 0) {
          this.selectedAcademicYearId = this.availableAcademicYears[0].ID;
          this.selectedAcademicYear = this.availableAcademicYears[0].Name;
        }
        this.dataLoadTracker.yearsLoaded = true;
        this.checkAndLoad();
      },
      error: () => { this.availableAcademicYears = []; this.dataLoadTracker.yearsLoaded = true; this.checkAndLoad(); }
    });
  }

  private fetchSchoolsList(): void {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (res: any) => {
        this.schoolList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({ ID: String(i.id ?? i.ID), Name: String(i.name ?? i.Name) })) : [];
      },
      error: () => { this.schoolList = []; }
    });
  }

  private fetchStaffList(): void {
    if (!this.selectedSchoolId) return;
    this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', { SchoolID: this.selectedSchoolId, Flag: '2' }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.Data) ? res.Data : []);
        this.staffList = list.map((i: any) => ({
          ID: String(i.id ?? i.ID),
          Name: String(i.firstName ?? i.FirstName ?? i.name ?? 'Unknown'),
          RoleID: String(i.roleId ?? i.RoleID ?? i.rollId ?? '0')
        }));
        if (this.staffList.length > 0) {
          this.selectedStaffId = this.staffList[0].ID;
          this.selectedStaffName = this.staffList[0].Name;
          this.selectedStaffRoleId = (this.staffList[0] as any).RoleID || '0';
        }
        this.dataLoadTracker.staffLoaded = true;
        this.checkAndLoad();
      },
      error: () => { this.staffList = []; this.dataLoadTracker.staffLoaded = true; this.checkAndLoad(); }
    });
  }
}
