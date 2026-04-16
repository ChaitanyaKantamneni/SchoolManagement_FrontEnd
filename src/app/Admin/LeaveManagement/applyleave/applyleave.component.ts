import { NgClass, NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { LoaderService } from '../../../Services/loader.service';

type LeaveStatus = 'Approved' | 'Pending' | 'Rejected' | 'Cancelled';

interface LeaveHistoryItem {
  id: string;
  appliedOn: string;
  fromDate: string;
  toDate: string;
  days: number;
  leaveType: string;
  reason: string;
  status: LeaveStatus;
  approvalRemarks: string;
  approvedByName?: string;
  approvedById?: string;
  admissionNo?: string;
  applicantName?: string;
  className?: string;
  divisionName?: string;
}

interface LeavePolicyData {
  leavePolicyID?: string;
  LeavePolicyID?: string;
  leaveType?: string;
  LeaveType?: string;
  maxDays?: string;
  MaxDays?: string;
  usedOrPendingDays?: string;
  UsedOrPendingDays?: string;
  remainingDays?: string;
  RemainingDays?: string;
}

interface BalanceItem {
  label: string;
  count: number;
  max: number;
  icon: string;
  colorCode: string;
  lightColor: string;
}

@Component({
  selector: 'app-applyleave',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, UpperCasePipe, ReactiveFormsModule, FormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './applyleave.component.html',
  styleUrl: './applyleave.component.css'
})
export class ApplyleaveComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Apply Leave';

  readonly today = new Date().toISOString().split('T')[0];

  // ── session helpers ──────────────────────────────────────────────────────────
  public ss(key: string) {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
  }

  // Dynamic Role Getters based on Names
  get currentRoleName(): string { return (this.ss('roleName') || this.ss('RoleName') || this.ss('rollName') || this.ss('RollName') || '').trim(); }
  get currentRollID(): string { return (this.ss('RollID') || this.ss('rollID') || this.ss('menuRoleId') || this.ss('RoleID') || '').trim(); }

  protected override get isAdmin(): boolean { return this.currentRollID === '1'; }

  // In this project, School Admin/Principal is '2' or '8'. 
  // We'll trust the RollID if it's '2' or '8', or the string 'admin'/'principal'/'management'
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
    return this.selectedSchoolId || '';
  }

  public get sessionSchoolId() { return this.resolvedSchoolId; }
  private get sessionApplicantId(): string {
    if (this.isParent || this.isActuallyStudent) {
      return (this.ss('AdmissionNo') || this.ss('admissionNo') || this.ss('StudentId') || '').toString().trim();
    }
    // Prefer numeric IDs from session for API compatibility
    const keys = ['StaffID', 'staffId', 'StaffId', 'UserID', 'userId', 'UserId', 'user_id', 'id', 'ID', 'RollID', 'rollID', 'menuRoleId'];
    console.log('sessionApplicantId Debug - Checking keys:', {
      currentRollID: this.currentRollID,
      isStaff: this.isStaff,
      allSessionValues: keys.map(k => ({ key: k, value: this.ss(k) }))
    });
    for (const k of keys) {
      const val = this.ss(k);
      if (val && val !== '0' && val !== 'null' && val !== 'undefined' && !isNaN(Number(val))) {
        console.log('sessionApplicantId Debug - Found:', { key: k, value: val });
        return val.toString().trim();
      }
    }
    console.log('sessionApplicantId Debug - No valid ID found, using fallback');
    // Fallback: use currentRollID if available
    const fallbackId = this.currentRollID;
    if (fallbackId && fallbackId !== '0' && !isNaN(Number(fallbackId))) {
      console.log('sessionApplicantId Debug - Using fallback RollID:', fallbackId);
      return fallbackId;
    }
    return '';
  }

  private get sessionApplicantName(): string {
    const keys = ['StaffName', 'staffName', 'FullName', 'firstName', 'ApplicantName', 'email'];
    for (const k of keys) {
      const val = this.ss(k);
      if (val) return val.toString().trim().split('@')[0];
    }
    return 'User';
  }
  private get sessionClassId() { return this.ss('ClassID'); }
  private get sessionDivisionId() { return this.ss('DivisionID'); }

  // ── state ────────────────────────────────────────────────────────────────────
  schoolList: Array<{ ID: string; Name: string }> = [];
  staffList: Array<{ ID: string; Name: string; RoleID: string }> = [];
  academicYears: Array<{ ID: string; Name: string }> = [];
  rolesList: Array<{ ID: string; Name: string }> = [];
  leavePoliciesData: LeavePolicyData[] = [];
  leaveBalances: BalanceItem[] = [];
  leaveTypes: string[] = [];
  leaveHistory: LeaveHistoryItem[] = [];

  selectedUserType: 'Staff' | 'Student' | 'Admin' = 'Staff';
  selectedSchoolId = '';
  selectedAcademicYearId = '';
  selectedStaffId = '';
  selectedStaffName = '';
  selectedStaffRoleId = '';
  selectedClassId = '';
  selectedDivisionId = '';
  selectedAcademicYear = '';

  classLists: any[] = [];
  divisionsList: any[] = [];
  studentList: Array<{ ID: string; Name: string; Class: string; Division: string; AdmissionNo: string }> = [];
  parentChildren: Array<{ ID: string; AdmissionNo: string; Name: string; Class: string; Division: string; SchoolID: string }> = []; // List of children for parent login

  activeTab: 'apply' | 'list' = 'apply';
  isLoadingLeaves = false;
  isSubmitting = false;
  AminityInsStatus = '';
  isModalOpen = false;
  selectedLeave: LeaveHistoryItem | null = null;
  isDetailOpen = false;
  showCancelRemarks = false;
  cancelRemarks = '';

  private rolesLoaded = false;
  private yearsLoaded = false;
  private staffLoaded = false;
  isSubmittingAction = false;
  actionRemarks = '';

  // Document upload properties
  selectedFileName: string = '';
  selectedFile: File | null = null;
  maxFileSize = 5 * 1024 * 1024; // 5MB

  leaveForm = new FormGroup({
    staffId: new FormControl(''),
    fromDate: new FormControl(this.today, Validators.required),
    toDate: new FormControl(this.today, Validators.required),
    leaveType: new FormControl(''),
    reason: new FormControl('', [Validators.required, Validators.minLength(5)])
  }, { validators: this.dateRangeValidator });

  // ── computed ─────────────────────────────────────────────────────────────────
  get isActuallyStudent(): boolean {
    return (this.isAdmin || this.isSchoolAdmin || this.isTeacher) && this.selectedUserType === 'Student';
  }

  get requestedDays(): number {
    const f = this.leaveForm.get('fromDate')?.value;
    const t = this.leaveForm.get('toDate')?.value;
    if (!f || !t) return 0;
    const diff = new Date(t).getTime() - new Date(f).getTime();
    return diff < 0 ? 0 : Math.floor(diff / 86400000) + 1;
  }

  get isDocumentRequiredButMissing(): boolean {
    return this.requestedDays >= 3 && !this.selectedFile;
  }
  get approvedCount() { return this.leaveHistory.filter(i => i.status === 'Approved').length; }
  get pendingCount() { return this.leaveHistory.filter(i => i.status === 'Pending').length; }
  get rejectedCount() { return this.leaveHistory.filter(i => i.status === 'Rejected').length; }
  get cancelledCount() { return this.leaveHistory.filter(i => i.status === 'Cancelled').length; }
  get selectedLeaveType() { return this.leaveForm.get('leaveType')?.value || '—'; }

  constructor(menu: MenuServiceService, router: Router, private api: ApiServiceService, public loader: LoaderService) {
    super(menu, router);
  }

  ngOnInit(): void {
    this.fetchRoles();
    this.applyValidators();

    if (this.isAdmin) {
      this.fetchSchools();
    } else {
      // Robust school ID resolution from all possible session/local keys
      const possibleKeys = ['SchoolID', 'schoolId', 'schoolID', 'SchoolId', 'sId', 'sid', 'SID', 'SId', 'school_id', 'user_school_id'];
      let resolvedId = '';

      for (const key of possibleKeys) {
        const val = this.ss(key)?.toString().trim();
        if (val && val !== '0' && val !== 'null' && val !== 'undefined' && !isNaN(Number(val))) {
          resolvedId = val;
          break;
        }
      }

      this.selectedSchoolId = resolvedId;

      // Fallback: If we have a name but no numeric ID, fetch schools to match
      const sName = (this.ss('schoolName') || this.ss('schoolname') || this.ss('SchoolName') || '').toString().trim();
      if (!this.selectedSchoolId && sName) {
        this.api.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe(res => {
          const list = res?.data || [];
          const match = list.find((s: any) =>
            (s.name && s.name.toLowerCase() === sName.toLowerCase()) ||
            (s.Name && s.Name.toLowerCase() === sName.toLowerCase())
          );
          if (match) {
            this.selectedSchoolId = String(match.id || match.ID);
            if (this.selectedSchoolId && this.selectedSchoolId !== '0') {
              this.fetchAcademicYears();
            }
          }
        });
      }

      if (this.selectedSchoolId && this.selectedSchoolId !== '0') {
        this.fetchAcademicYears();
      }

      // Auto-set staff context for individual logins (Teacher, Staff, Accountant, etc)
      if (!this.isAdmin) {
        // We use numeric IDs for API as per correct project requirement
        this.selectedStaffId = this.sessionApplicantId;
        this.selectedStaffName = this.sessionApplicantName;
        this.selectedStaffRoleId = this.currentRollID;
        
        console.log('ngOnInit Debug - Staff Setup:', {
          currentRollID: this.currentRollID,
          isTeacher: this.isTeacher,
          isStaff: this.isStaff,
          sessionApplicantId: this.sessionApplicantId,
          selectedStaffId: this.selectedStaffId,
          sessionKeys: {
            StaffID: this.ss('StaffID'),
            UserID: this.ss('UserID'),
            userId: this.ss('userId'),
            id: this.ss('ID')
          }
        });

        // If not a parent and not explicitly student, default to Staff context
     if (!this.isParent && !this.isActuallyStudent && !this.isSchoolAdmin) {
  this.selectedUserType = 'Staff';
}

        // Ensure selectedSchoolId is set from session
        if (!this.selectedSchoolId) {
          this.selectedSchoolId = this.resolvedSchoolId;
        }

        // Proactively resolve Teacher/Staff numeric identity if possible
        if (this.selectedSchoolId && !this.isParent && !this.isActuallyStudent) {
          this.resolveStaffIdentity();
        }
      }

      if (this.isParent) {
        this.selectedUserType = 'Student';
        // this.fetchParentChildren();
      } else if (this.isSchoolAdmin) {
        this.fetchStaff();
        this.fetchClassList();
      } else if (this.isTeacher || this.isStaff) {
        // Teachers and all other staff (Driver, Accountant, Maid, etc.) only see their own history/balance by default
        this.loadBalances();
        this.fetchHistory();
      }
    }
  }

  private applyValidators(): void {
    const leaveTypeCtrl = this.leaveForm.get('leaveType');
if (!this.isActuallyStudent && !this.isParent) {
        leaveTypeCtrl?.addValidators(Validators.required);
    } else {
      leaveTypeCtrl?.clearValidators();
    }
    leaveTypeCtrl?.updateValueAndValidity();
  }

  // ── tab ──────────────────────────────────────────────────────────────────────
  setTab(tab: 'apply' | 'list'): void {
    this.activeTab = tab;
    if (tab === 'list') this.fetchHistory();
  }

  onSchoolChange(e: Event): void {
    this.selectedSchoolId = (e.target as HTMLSelectElement).value;
    this.academicYears = []; this.staffList = []; this.studentList = [];
    this.selectedAcademicYearId = ''; this.selectedStaffId = '';
    this.selectedStaffName = ''; this.selectedStaffRoleId = '';
    this.leaveTypes = []; this.leaveHistory = [];
    this.yearsLoaded = false; this.staffLoaded = false;

    if (this.selectedSchoolId) {
      this.fetchAcademicYears();
      if (this.selectedUserType === 'Student') {
        this.fetchClassList();
        this.fetchStudents();
      }
      else this.fetchStaff();
    }
  }

  onClassChange(e: Event): void {
    this.selectedClassId = (e.target as HTMLSelectElement).value;
    this.selectedDivisionId = '';
    this.divisionsList = []; this.studentList = [];
    if (this.selectedClassId) {
      this.fetchDivisionsList();
      this.fetchStudents();
    }
  }

  onDivisionChange(e: Event): void {
    this.selectedDivisionId = (e.target as HTMLSelectElement).value;
    this.studentList = [];
    this.fetchStudents();
  }

  onUserTypeChange(): void {
    this.staffList = [];
    this.studentList = [];
    this.selectedStaffId = '';
    this.selectedStaffName = '';
    this.selectedClassId = '';
    this.selectedDivisionId = '';
    this.leaveHistory = [];
    this.leaveBalances = [];
    this.leaveTypes = [];

    if (this.selectedSchoolId) {
      if (this.selectedUserType === 'Student') {
        this.fetchClassList();
        this.fetchStudents();
      }
      else if (this.selectedUserType === 'Admin') {
        // For School Admin applying leave for themselves, load their own data
        console.log('School Admin Admin Leave Selected:', {
          isSchoolAdmin: this.isSchoolAdmin,
          selectedUserType: this.selectedUserType,
          sessionApplicantId: this.sessionApplicantId,
          selectedSchoolId: this.selectedSchoolId,
          selectedAcademicYearId: this.selectedAcademicYearId
        });
        this.loadBalances();
        this.fetchHistory();
      }
      else this.fetchStaff();
    }
    this.applyValidators();
  }

  onYearChange(e: Event): void {
    const val = (e.target as HTMLSelectElement).value;
    const yearObj = this.academicYears.find(y => y.ID === val);
    this.selectedAcademicYearId = val;
    this.selectedAcademicYear = yearObj?.Name || '';
    this.leaveTypes = [];
    this.leaveBalances = [];
    this.leavePoliciesData = [];
    
    // Fetch parent children when academic year changes
    if (this.isParent) {
      this.fetchParentChildren();
    }
    
    this.checkAndLoad();
    // this.fetchHistory();
  }

 onStaffChange(e: Event): void {
  const id = (e.target as HTMLSelectElement).value;

  if (this.isParent || this.selectedUserType === 'Student') {
    const s = this.isParent 
      ? this.parentChildren.find(x => x.ID === id) 
      : this.studentList.find(x => x.ID === id);

    this.selectedStaffId = id;
    this.selectedStaffName = s?.Name || '';

    if (s) {
      this.selectedClassId = s.Class;
      this.selectedDivisionId = s.Division;
    }

    // ✅ ONLY fetch history for student
    this.fetchHistory();

  } else {
    const s = this.staffList.find(x => x.ID === id);

    this.selectedStaffId = id;
    this.selectedStaffName = s?.Name || '';
    this.selectedStaffRoleId = s?.RoleID || '0';

    // ✅ Staff only
    this.loadBalances();
    this.fetchHistory();
  }
}

  // ── submit ───────────────────────────────────────────────────────────────────
  submitLeave(): void {
    if (this.leaveForm.invalid) { this.leaveForm.markAllAsTouched(); return; }
    if (this.isSubmitting) return;

    const formValues = this.leaveForm.value;
    let staffIdFromForm = formValues.staffId || this.selectedStaffId;
    
    // For School Admin applying leave for themselves
    if (this.isSchoolAdmin && this.selectedUserType === 'Admin') {
      staffIdFromForm = this.sessionApplicantId;
    }

    if (this.isAdmin && !staffIdFromForm && this.selectedUserType !== 'Admin') {
      this.openModal('Please select a staff member first.');
      return;
    }

    // Logic to find policy ID for staff
    let policyId: string | undefined;

if (!this.isActuallyStudent && !this.isParent) {
        const selectedType = this.leaveForm.get('leaveType')?.value;
      const policy = this.leavePoliciesData.find(p => (p.leaveType || p.LeaveType || '') === selectedType);
      if (!policy) {
        this.openModal('Invalid Leave Type selected.');
        return;
      }
      policyId = policy.leavePolicyID || policy.LeavePolicyID;
    }

    const payload: any = {
      Flag: '1',
      SchoolID: this.selectedSchoolId,
      AcademicYear: this.selectedAcademicYearId,
      UserType: (this.isParent || this.isActuallyStudent) ? 'Student' : 'Staff',
      FromDate: this.leaveForm.get('fromDate')?.value,
      ToDate: this.leaveForm.get('toDate')?.value,
      NoOfDays: this.requestedDays.toString(),
      Reason: this.leaveForm.get('reason')?.value,
      IsActive: '1',
      CreatedBy: this.sessionApplicantName
    };

  if (this.isParent || this.isActuallyStudent) {
  payload.AdmissionNo = staffIdFromForm;

  payload.Class = this.selectedClassId || '0';
  payload.Division = this.selectedDivisionId || '0';
}else {
      payload.StaffID = (this.isAdmin || this.isSchoolAdmin || this.isTeacher || this.isStaff) ? staffIdFromForm : this.sessionApplicantId;
      payload.LeavePolicyID = policyId;
    }

    this.isSubmitting = true;
    this.loader.show();
    this.api.post<any>('Tbl_LeaveApplication_Operations', payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.loader.hide();
        if (res?.statusCode === 200 || res?.StatusCode === 200) {
          this.openModal('Leave applied successfully.');
          this.resetForm();
          this.fetchHistory();
          this.loadBalances();
        } else {
          this.openModal(res?.message || res?.Message || 'Failed to apply leave.');
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.loader.hide();
        this.openModal(err?.error?.message || err?.error?.Message || 'Error applying leave.');
      }
    });
  }

  resetForm(): void {
    this.leaveForm.reset({ fromDate: this.today, toDate: this.today, leaveType: '', reason: '' });
    this.selectedFileName = '';
    this.selectedFile = null;
  }

  // File handling methods
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file size
      if (file.size > this.maxFileSize) {
        this.openModal('File size exceeds 5MB limit. Please choose a smaller file.');
        input.value = '';
        return;
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        this.openModal('Invalid file type. Please upload PDF, DOC, DOCX, JPG, JPEG, or PNG files only.');
        input.value = '';
        return;
      }
      
      this.selectedFile = file;
      this.selectedFileName = file.name;
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.selectedFileName = '';
    // Clear the file input
    const fileInput = document.getElementById('documentUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // ── modal helpers ─────────────────────────────────────────────────────────────
  openModal(msg: string) {
    this.AminityInsStatus = msg;
    this.isModalOpen = true;
  }
  handleOk() {
    this.isModalOpen = false;
  }
  closeModal() {
    this.isModalOpen = false;
  }
  viewLeave(l: LeaveHistoryItem) {
    this.selectedLeave = l;
    this.isDetailOpen = true;
  }
  closeDetail() {
    this.isDetailOpen = false;
    this.actionRemarks = '';
    this.showCancelRemarks = false;
    this.cancelRemarks = '';
  }

  approveLeave(): void { this.updateStatus('Approved'); }
  rejectLeave(): void { this.updateStatus('Rejected'); }
  
  confirmCancelLeave(): void {
    this.actionRemarks = this.cancelRemarks.trim() || 'Cancelled by applicant';
    this.updateStatus('Cancelled');
  }

  private updateStatus(status: 'Approved' | 'Rejected' | 'Cancelled'): void {
    if (!this.selectedLeave || this.isSubmittingAction) return;
    this.isSubmittingAction = true;
    this.loader.show();

    // Determine approver display name for parent view
    let approverDisplayName = 'Admin';
    if (this.isTeacher) {
      // Try to get teacher name from session, fallback to email
      let teacherName = this.sessionApplicantName;
      if (!teacherName || teacherName === 'User') {
        const email = this.ss('email') || this.ss('Email') || '';
        if (email && email.includes('@')) {
          teacherName = email.split('@')[0];
        } else {
          teacherName = 'Teacher';
        }
      }
      approverDisplayName = teacherName;
    } else if (this.isSchoolAdmin) {
      approverDisplayName = this.sessionApplicantName || 'School Admin';
    } else if (this.isAdmin) {
      approverDisplayName = 'Admin'; // Super admin always shows as "Admin"
    }
    
    const payload = {
      Flag: '5',
      ID: this.selectedLeave.id,
      ApprovedBy: String(this.ss('StaffID') || this.ss('UserID') || '1'),
      ApplicationStatus: status,
      AdminRemarks: this.actionRemarks.trim() || `${status} by ${approverDisplayName}`,
      ApprovedByName: approverDisplayName
    };

    this.api.post<any>('Tbl_LeaveApplication_Operations', payload).subscribe({
      next: (res) => {
        this.isSubmittingAction = false;
        this.loader.hide();
        if (res?.statusCode === 200 || res?.StatusCode === 200) {
          this.isDetailOpen = false;
          this.openModal(`Leave ${status} successfully.`);
          this.fetchHistory();
        } else {
          this.openModal(res?.message || 'Update failed.');
        }
      },
      error: () => {
        this.isSubmittingAction = false;
        this.loader.hide();
        this.openModal('Error updating status.');
      }
    });
  }

  getStatusClass(s: string) { return s?.toLowerCase() || 'pending'; }
  trackById(_: number, l: LeaveHistoryItem) { return l.id; }

  // ── private ───────────────────────────────────────────────────────────────────
  private dateRangeValidator(c: AbstractControl) {
    const g = c as FormGroup;
    const f = g.get('fromDate')?.value, t = g.get('toDate')?.value;
    return f && t && new Date(t) < new Date(f) ? { invalidDateRange: true } : null;
  }

private checkAndLoad(): void {
  const hasContext = this.selectedSchoolId && this.selectedAcademicYearId;
  if (!hasContext) return;

  if (this.isAdmin) {
    if (this.selectedStaffId) this.loadBalances();
  } 
  else if (!this.isParent && !this.isActuallyStudent) {
    // ✅ ONLY STAFF
    this.loadBalances();
  }

  // ✅ History should always load
  this.fetchHistory();
}

  private loadBalances(): void {
    const schoolId = this.resolvedSchoolId;
    console.log('loadBalances Prerequisites Check:', {
      schoolId,
      selectedAcademicYearId: this.selectedAcademicYearId,
      isActuallyStudent: this.isActuallyStudent,
      isParent: this.isParent,
      shouldProceed: !(!schoolId || !this.selectedAcademicYearId || this.isActuallyStudent || this.isParent)
    });
    if (!schoolId || !this.selectedAcademicYearId || this.isActuallyStudent || this.isParent) {
      console.warn('loadBalances: Missing prerequisites', { schoolId, year: this.selectedAcademicYearId });
      return;
    }

    // For School Admin applying leave for themselves, use their own ID
    let applicantId: string;
    if (this.isSchoolAdmin && this.selectedUserType === 'Admin') {
      applicantId = this.sessionApplicantId;
    } else if (this.isAdmin || this.isSchoolAdmin || this.isTeacher || this.isStaff) {
      applicantId = this.selectedStaffId;
    } else {
      applicantId = this.sessionApplicantId;
    }
    console.log('loadBalances Debug:', { 
      isAdmin: this.isAdmin, 
      isSchoolAdmin: this.isSchoolAdmin, 
      isTeacher: this.isTeacher, 
      isStaff: this.isStaff,
      selectedStaffId: this.selectedStaffId,
      sessionApplicantId: this.sessionApplicantId,
      applicantId: applicantId
    });
    if (!applicantId) {
      console.warn('loadBalances: No applicantId found');
      return;
    }

    this.loader.show();
    this.api.post<any>('Tbl_LeaveApplication_Operations', {
      Flag: '9',
      SchoolID: schoolId,
      AcademicYear: this.selectedAcademicYearId,
      UserType: 'Staff',
      StaffID: applicantId
    }).subscribe({
      next: (res: any) => {
        this.loader.hide();
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.Data) ? res.Data : []);
        this.leavePoliciesData = list;
        this.leaveTypes = [...new Set(
          list.map((i: any) => String(i.leaveType ?? i.LeaveType ?? ''))
            .filter(Boolean)
        )] as string[];

        this.leaveBalances = list.map((i: any, idx: number) => {
          const colors = [
            { main: '#00b25b', light: '#00E676', icon: 'event_available' },
            { main: '#81338e', light: '#AB47BC', icon: 'schedule' },
            { main: '#008ece', light: '#00B0FF', icon: 'person' },
            { main: '#d33068', light: '#FF4081', icon: 'hotel' }
          ];
          const color = colors[idx % colors.length];
          return {
            label: String(i.leaveType ?? i.LeaveType ?? ''),
            count: Number(i.remainingDays ?? i.RemainingDays ?? 0),
            max: Number(i.maxDays ?? i.MaxDays ?? 1),
            icon: color.icon,
            colorCode: color.main,
            lightColor: color.light
          };
        });

        this.ensureLeaveTypeIsValid();
      },
      error: () => { this.loader.hide(); this.leaveTypes = []; this.leaveBalances = []; }
    });
  }

  private ensureLeaveTypeIsValid(): void {
    if (!this.leaveTypes.includes(String(this.leaveForm.get('leaveType')?.value || ''))) {
      this.leaveForm.get('leaveType')?.patchValue('');
    }
  }

  private fetchHistory(): void {
  const schoolId = this.resolvedSchoolId;

  let id = '';
  if (this.isParent || this.isActuallyStudent) {
    id = this.selectedStaffId;
  } else if (this.isSchoolAdmin && this.selectedUserType === 'Admin') {
    id = this.sessionApplicantId;
  } else {
    id = this.selectedStaffId || this.sessionApplicantId;
  }

  if (!schoolId || !id || !this.selectedAcademicYearId) {
    this.leaveHistory = [];
    return;
  }

  this.isLoadingLeaves = true;

  const payload: any = {
    Flag: '2',
    SchoolID: schoolId,
    AcademicYear: this.selectedAcademicYearId,
    UserType: (this.isParent || this.isActuallyStudent) ? 'Student' : 'Staff',
    Limit: 100,
    Offset: 0
  };

  if (this.isParent || this.isActuallyStudent) {
    payload.AdmissionNo = id;
  } else {
    payload.StaffID = id;
  }

  this.loader.show();

  this.api.post<any>('Tbl_LeaveApplication_Operations', payload).subscribe({
    next: (res: any) => {
      this.loader.hide();
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.Data) ? res.Data : []);
      this.leaveHistory = list.map((item: any) => {
        // Extract approver name from AdminRemarks as fallback since backend doesn't return approvedByName
        const remarks = item.adminRemarks || item.AdminRemarks || '';
        const approvedByEmail = item.approvedBy || item.ApprovedBy || '';
        let extractedName = '';
        
        // First try to extract from AdminRemarks with "by [Name]" pattern
        if (remarks && remarks.includes('by ')) {
          const match = remarks.match(/by\s+(.+?)(?:\.|$)/);
          if (match && match[1]) {
            extractedName = match[1].trim();
          }
        }
        
        // If no name found and we have an email, use email username as fallback
        if (!extractedName && approvedByEmail && approvedByEmail.includes('@')) {
          // Extract email username (before @) for parent display
          const emailUsername = approvedByEmail.split('@')[0];
          extractedName = emailUsername;
        }
        
        return {
          id: String(item.id ?? item.ID ?? ''),
          appliedOn: (item.createdDate || item.CreatedDate || '').split('T')[0],
          fromDate: item.fromDate || item.FromDate || '',
          toDate: item.toDate || item.ToDate || '',
          days: Number(item.noOfDays || item.NoOfDays || 0),
          leaveType: item.leaveType || item.LeaveType || '—',
          reason: item.reason || item.Reason || '—',
          status: item.applicationStatus || item.ApplicationStatus || 'Pending',
          approvalRemarks: remarks,
          approvedByName: item.approvedByName || item.ApprovedByName || extractedName,
          approvedById: approvedByEmail,
          admissionNo: item.admissionNo || item.AdmissionNo || '',
          applicantName: item.applicantName || item.ApplicantName || '',
          className: item.className || item.ClassName || '',
          divisionName: item.divisionName || item.DivisionName || ''
        };
      });
      this.isLoadingLeaves = false;
    },
    error: () => {
      this.loader.hide();
      this.leaveHistory = [];
      this.isLoadingLeaves = false;
    }
  });
}

  private fetchAcademicYears(): void {
    if (!this.selectedSchoolId || this.selectedSchoolId === '0' || !this.selectedSchoolId.trim()) return;

    // Some endpoints prefer Flag 2, others Flag 3 for year lists. 
    const tryFetch = (flag: string) => {
      this.api.post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: this.selectedSchoolId, Flag: flag }).subscribe({
        next: (res: any) => {
          const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.Data) ? res.Data : []);
          if (list.length === 0 && flag === '2') {
            tryFetch('3'); // Try fallback flag
            return;
          }

          this.academicYears = list.map((i: any) => ({
            ID: String(i.id ?? i.ID ?? i.sNo ?? i.sno ?? ''),
            Name: String(i.name ?? i.Name ?? i.academicYear ?? '')
          })).filter((y: any) => y.ID && y.Name);

if (
  this.academicYears.length &&
  !this.selectedAcademicYearId &&
  (this.isAdmin)
) {
  this.selectedAcademicYearId = this.academicYears[0].ID;
  this.selectedAcademicYear = this.academicYears[0].Name;
  this.checkAndLoad();
  this.fetchHistory();
}
          this.yearsLoaded = true;
        },
        error: () => {
          if (flag === '2') tryFetch('3');
          else { this.academicYears = []; this.yearsLoaded = true; }
        }
      });
    };

    tryFetch('2');
  }

  private fetchSchools(): void {
    this.api.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (res: any) => {
        this.schoolList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({ ID: String(i.id ?? i.ID), Name: String(i.name ?? i.Name) })) : [];
      },
      error: () => { this.schoolList = []; }
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
          this.selectedStaffId = String(match.id || match.ID);
          console.log('Resolved Teacher StaffID:', this.selectedStaffId);
          // Reload balances now that we have the definitive ID
          this.checkAndLoad();
        }
      }
    });
  }

  private fetchStaff(): void {
    if (!this.selectedSchoolId) return;
    this.api.post<any>('Tbl_Staff_CRUD_Operations', { SchoolID: this.selectedSchoolId, Flag: '2' }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.Data) ? res.Data : []);
        this.staffList = list.map((i: any) => ({
          ID: String(i.id ?? i.ID),
          Name: String(i.firstName ?? i.FirstName ?? i.name ?? 'Unknown'),
          RoleID: String(i.roleId ?? i.RoleID ?? i.rollId ?? '0')
        }));
        this.staffLoaded = true;
        this.checkAndLoad();
      },
      error: () => { this.staffList = []; this.staffLoaded = true; this.checkAndLoad(); }
    });
  }

  private fetchStudents(): void {
    if (!this.selectedSchoolId) return;

    // Choose flag: 3 for class/division filter, 2 for school-level
    const useFiltered = !!(this.selectedClassId || this.selectedDivisionId);
    const payload: any = {
      SchoolID: this.selectedSchoolId,
      Flag: useFiltered ? '3' : '2'
    };

    if (this.selectedClassId) payload.Class = this.selectedClassId;
    if (this.selectedDivisionId) payload.Division = this.selectedDivisionId;

    this.api.post<any>('Tbl_StudentDetails_CRUD_Operations', payload).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.Data) ? res.Data : []);
        this.studentList = list.map((i: any) => {
          // Normalize fields based on common API patterns in the project
          return {
            ID: String(i.admissionNo || i.id || i.ID),
            Name: String(`${i.firstName || i.FirstName || ''} ${i.lastName || i.LastName || ''}`).trim() || i.name || i.Name || 'Unknown student',
            Class: String(i.class || i.Class || i.classID || '0'),
            Division: String(i.division || i.Division || i.divisionID || '0')
          };
        });
        this.staffLoaded = true;
        this.checkAndLoad();
      },
      error: () => { this.studentList = []; this.staffLoaded = true; this.checkAndLoad(); }
    });
  }

  private fetchClassList(): void {
    if (!this.selectedSchoolId || !this.selectedAcademicYearId) return;
    const req = { SchoolID: this.selectedSchoolId, AcademicYear: this.selectedAcademicYearId, Flag: '9' };
    this.api.post<any>('Tbl_ClassDivision_CRUD_Operations', req).subscribe(res => {
      this.classLists = (res.data || []).map((item: any) => ({
        ID: item.sNo.toString(),
        Name: item.syllabusClassName
      }));
    });
  }

  private fetchDivisionsList(): void {
    if (!this.selectedSchoolId || !this.selectedAcademicYearId || !this.selectedClassId) return;
    const req = { SchoolID: this.selectedSchoolId, AcademicYear: this.selectedAcademicYearId, Class: this.selectedClassId, Flag: '3' };
    this.api.post<any>('Tbl_ClassDivision_CRUD_Operations', req).subscribe(res => {
      this.divisionsList = (res.data || []).map((item: any) => ({
        ID: item.id,
        Name: item.name
      }));
    });
  }
  private fetchRoles(): void {
    this.api.post<any>('Tbl_Roles_CRUD_Operations', { Flag: '2', SchoolID: this.selectedSchoolId || '' }).subscribe({
      next: (res) => {
        const list = res?.data || [];
        this.rolesList = list.map((i: any) => ({ ID: String(i.id || i.ID), Name: String(i.roleName || i.RoleName) }));
        this.rolesLoaded = true;
      }
    });
  }

  private fetchParentChildren(): void {
    const parentEmail = (this.ss('email') || '').toString().trim();
    if (!parentEmail) return;

    const payload = {
      Flag: '9',
      FatherEmail: parentEmail,
      MotherEmail: parentEmail,
      AcademicYear: this.selectedAcademicYearId || ''
    };

    this.api.post<any>('Tbl_StudentParentDetails_CRUD_Operations', payload).subscribe({
      next: (res: any) => {
        const list: any[] = res?.data || [];
        
        this.parentChildren = list.map((s: any) => {
          // Handle multiple possible field name variations
          const admissionId = s.admissionID || s.AdmissionID || s.admissionno || s.AdmissionNo || '';
          const studentName = s.fatherName || s.name || s.Name || '';
          const classId = s.class || s.Class || s.classID || s.ClassID || '';
          const divisionId = s.division || s.Division || s.divisionID || s.DivisionID || '';
          const schoolId = s.schoolID || s.SchoolID || s.schoolId || s.SchoolId || '';
          
          return {
            ID:           String(admissionId),
            AdmissionNo:  String(admissionId),
            Name:         `${admissionId} - ${studentName}`.trim(),
            Class:        String(classId),
            Division:     String(divisionId),
            SchoolID:     String(schoolId)
          };
        }).filter(c => c.ID && c.AdmissionNo);

        // if (this.parentChildren.length > 0) {
        //   const first = this.parentChildren[0];
        //   this.selectedSchoolId    = first.SchoolID || this.selectedSchoolId;
        //   this.selectedStaffId     = first.ID;
        //   this.selectedStaffName   = first.Name;
        //   this.selectedClassId     = first.Class;
        //   this.selectedDivisionId  = first.Division;
        //   if (this.selectedSchoolId) this.fetchAcademicYears();
        // }
      },
      error: () => { this.parentChildren = []; }
    });
  }

  private loadStudentsByAdmissionIds(_admissionIds: string[]): void {
    // No longer used — replaced by server-side Flag 9
  }
}
