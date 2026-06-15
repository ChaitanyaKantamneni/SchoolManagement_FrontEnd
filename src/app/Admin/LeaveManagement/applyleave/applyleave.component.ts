import { NgClass, NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { LoaderService } from '../../../Services/loader.service';
import { FileService } from '../../../Services/file.service';

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
  attachmentURL?: string;
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
  staffRoleLookup: Map<string, string> = new Map<string, string>();
  leavePoliciesData: LeavePolicyData[] = [];
  leaveBalances: BalanceItem[] = [];
  leaveTypes: string[] = [];
  leaveHistory: LeaveHistoryItem[] = [];
  filteredHistory: LeaveHistoryItem[] = [];
  paginatedHistory: LeaveHistoryItem[] = [];
  historyTotalCount = 0;
  historyCurrentPage = 1;
  historyPageSize = 5;
  historyVisiblePageCount = 3;
  selectedStatusFilter: 'All' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' = 'All';

  selectedUserType: 'Staff' | 'Student' | 'Admin' | '' = '';
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

  // Extended file upload state (mirrors assign-homework)
  isUploading: boolean = false;
  uploadProgress: number = 0;
  uploadedFileUrl: string = '';          // URL returned from server or loaded from DB
  filePreviewUrl: string | null = null;
  filePreviewType: 'image' | 'document' | null = null;
  isPreviewVisible: boolean = false;

  leaveForm = new FormGroup({
    staffId: new FormControl(''),
    fromDate: new FormControl(this.today, [Validators.required]),
    toDate: new FormControl(this.today, [Validators.required]),
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
  
  // Pagination getters
  get historyTotalPages(): number { return Math.ceil(this.historyTotalCount / this.historyPageSize); }
  get historyVisiblePages(): number[] {
    const total = this.historyTotalPages;
    const pages: number[] = [];
    let start = Math.max(this.historyCurrentPage - Math.floor(this.historyVisiblePageCount / 2), 1);
    let end = Math.min(start + this.historyVisiblePageCount - 1, total);
    if (end - start < this.historyVisiblePageCount - 1) start = Math.max(end - this.historyVisiblePageCount + 1, 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }
  get selectedLeaveType() { return this.leaveForm.get('leaveType')?.value || '—'; }

  constructor(menu: MenuServiceService, router: Router, private api: ApiServiceService, public loader: LoaderService, public fileService: FileService, private cdr: ChangeDetectorRef) {
    super(menu, router);
  }

  ngOnInit(): void {
    this.selectedAcademicYearId = sessionStorage.getItem('ActiveAcademicYearID') || '';
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

        // Load role lookup data after school ID is resolved
        if (this.selectedSchoolId && this.isSchoolAdmin) {
          console.log('[APPLY LEAVE] Loading role lookup data for school:', this.selectedSchoolId);
          this.fetchStaffRoleLookup();
          this.fetchRoleList();
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
        // Role lookup will be called after school ID is resolved
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
    this.selectedAcademicYearId = this.isAdmin ? '' : (sessionStorage.getItem('ActiveAcademicYearID') || '');
    this.selectedStaffId = '';
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

    // Parent-specific validation
    if (this.isParent) {
      if (!this.selectedAcademicYearId) {
        this.openModal('Please select academic year first.');
        return;
      }
      if (!this.selectedStaffId) {
        this.openModal('Please select a child first.');
        return;
      }
    }

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

    // ── Branch: upload file first if selected, then submit ───────────────────
    if (this.selectedFile) {
      this.isSubmitting = true;
      this.isUploading = true;
      this.loader.show();

      const formData = new FormData();
      formData.append('File', this.selectedFile);
      formData.append('SchoolId', this.selectedSchoolId || this.resolvedSchoolId);
      formData.append('LeaveId', 'temp');

      this.fileService.uploadLeaveDoc(formData).subscribe({
        next: (uploadRes: any) => {
          console.log('[LEAVE] File uploaded to temp:', uploadRes);
          this.isUploading = false;
          this.uploadedFileUrl = uploadRes.url;
          payload.AttachmentURL = uploadRes.url; // backend moves to final on Flag=1
          this.doSubmit(payload);
        },
        error: (err) => {
          this.isUploading = false;
          this.isSubmitting = false;
          this.loader.hide();
          this.openModal(err?.error?.message || 'File upload failed. Please try again.');
        }
      });
    } else {
      this.doSubmit(payload);
    }
  }

  private doSubmit(payload: any): void {
    this.isSubmitting = true;
    this.loader.show();
    this.api.post<any>('Tbl_LeaveApplication_Operations', payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.loader.hide();

        const status = res?.Message || res?.message || '';
        const data = res?.Data || res?.data || [];
        const hasId = data.length > 0 && (data[0].id || data[0].ID);
        const sc = res?.statusCode ?? res?.StatusCode;
        // Some API responses don't include statusCode; treat valid data/ID as success
        const isSuccess = (sc === 200 || sc === '200') || (!sc && hasId);

        console.log('[APPLY LEAVE] doSubmit response:', { statusCode: res?.statusCode, StatusCode: res?.StatusCode, hasId, data, isSuccess });

        if (isSuccess) {
          this.closeDetail();
          this.resetForm();
          this.fetchHistory();
          this.loadBalances();
          this.openModal(hasId ? 'Leave applied successfully.' : status || 'Leave applied successfully.');
        } else {
          // If we uploaded a file but the DB didn't save the record (validation error),
          // we must delete the orphaned file from the server's temp folder.
          if (this.uploadedFileUrl) {
            this.deleteTempFileOnFailure();
          }
          this.openModal(status || 'Failed to apply leave. Please check validation.');
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.loader.hide();
        if (this.uploadedFileUrl) {
          this.deleteTempFileOnFailure();
        }
        this.openModal(err?.error?.message || err?.error?.Message || 'Error applying leave.');
      }
    });
  }

  private deleteTempFileOnFailure(): void {
    const schoolId = this.selectedSchoolId || this.resolvedSchoolId;
    const fileName = this.uploadedFileUrl.split('/').pop() || '';
    if (schoolId && fileName) {
      console.log('[LEAVE] Deleting orphaned temp file due to application failure:', fileName);
      this.fileService.deleteLeaveFile({
        SchoolId: schoolId,
        LeaveId: 'temp',
        FileName: fileName,
        ModifiedBy: this.ss('email') || 'System'
      }).subscribe({
        next: () => {
          this.uploadedFileUrl = '';
          console.log('[LEAVE] Orphaned file cleaned up.');
        },
        error: (e) => console.warn('[LEAVE] Cleanup failed:', e)
      });
    }
  }


  resetForm(): void {
    console.log('Resetting form...');

    // Use Angular's built-in reset for reliable form clearing
    this.leaveForm.reset({
      staffId: '',
      fromDate: this.today,
      toDate: this.today,
      leaveType: '',
      reason: ''
    });

    // Reset ngModel-bound dropdowns (not part of leaveForm)
    // Only clear class/division if NOT in student mode — preserve student selection context
    if (!this.isActuallyStudent && !this.isParent) {
      this.selectedClassId = '';
      this.selectedDivisionId = '';
    }
    this.leaveTypes = [];
    this.leaveBalances = [];
    this.leavePoliciesData = [];

    if (this.isAdmin) {
      // Admin: only clear the form input fields, keep all context selections intact
      this.leaveForm.get('leaveType')?.patchValue('');
    } else if (this.isSchoolAdmin) {
      // School Admin: keep school, year, userType, staff/student lists & selection — only clear form fields
      this.leaveForm.get('leaveType')?.patchValue('');
    } else if (this.isParent) {
      // Parent: keep year, clear child/form data
      this.selectedChildIndex = -1;
      this.parentChildren = [];
    } else {
      // Teacher / Staff: keep school, year & self context, just clear form data
      this.selectedStaffId = this.sessionApplicantId;
      this.selectedStaffName = this.sessionApplicantName;
    }

    // Clear all file-related state explicitly
    this.uploadedFileUrl = '';
    this.selectedFile = null;
    this.selectedFileName = '';
    this.uploadProgress = 0;
    this.isUploading = false;
    this.isPreviewVisible = false;
    this.filePreviewUrl = null;
    this.filePreviewType = null;
    this.isSubmitting = false;

    // Reset file input elements in the DOM
    setTimeout(() => {
      ['documentUpload', 'documentUploadReplace'].forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el) { el.value = ''; }
      });
    }, 0);

    // Force change detection after reset
    this.cdr.detectChanges();
    setTimeout(() => this.cdr.detectChanges(), 0);

    console.log('Form reset complete');
  }

  // ── File Handling (mirrors assign-homework) ───────────────────────────────────
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    if (file.size > this.maxFileSize) {
      this.openModal('File size exceeds 5MB limit. Please choose a smaller file.');
      input.value = ''; return;
    }
    const allowedTypes = [
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/jpg', 'image/png'
    ];
    if (!allowedTypes.includes(file.type)) {
      this.openModal('Invalid file type. Allowed: PDF, DOC, DOCX, JPG, JPEG, PNG.');
      input.value = ''; return;
    }

    this.selectedFile = file;
    this.selectedFileName = file.name;
    this.generateFilePreview(file);
  }

  generateFilePreview(file: File): void {
    this.isPreviewVisible = true;
    if (file.type.startsWith('image/')) {
      this.filePreviewType = 'image';
      const reader = new FileReader();
      reader.onload = (e: any) => { this.filePreviewUrl = e.target?.result || null; };
      reader.readAsDataURL(file);
    } else {
      this.filePreviewType = 'document';
      this.filePreviewUrl = null;
    }
  }

  clearFileSelection(): void {
    this.selectedFile = null;
    this.selectedFileName = '';
    this.uploadProgress = 0;
    this.isUploading = false;
    this.isPreviewVisible = false;
    this.filePreviewUrl = null;
    this.filePreviewType = null;

    // Reset all file input elements in the DOM - use setTimeout to ensure DOM is ready
    setTimeout(() => {
      ['documentUpload', 'documentUploadReplace'].forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el) {
          el.value = '';
          console.log(`Cleared file input: ${id}`);
        } else {
          console.warn(`File input not found: ${id}`);
        }
      });
    }, 0);
  }

  removeFile(): void {
    // If the file is already uploaded to server, delete it
    if (this.uploadedFileUrl) {
      const schoolId = this.selectedSchoolId || this.resolvedSchoolId;
      const fileName = this.uploadedFileUrl.split('/').pop() || '';
      if (schoolId && fileName) {
        this.fileService.deleteLeaveFile({
          SchoolId: schoolId,
          LeaveId: 'temp',
          FileName: fileName,
          ModifiedBy: this.ss('email') || ''
        }).subscribe({
          next: () => console.log('[LEAVE] Temp file deleted from server'),
          error: (e) => console.warn('[LEAVE] Could not delete temp file:', e)
        });
      }
      this.uploadedFileUrl = '';
    }
    this.clearFileSelection();
  }

  // ── File View Helpers ─────────────────────────────────────────────────────────
  getFileViewUrl(): string {
    const url = this.uploadedFileUrl;
    if (!url) return '';
    return this.fileService.getFullFileUrl(url);
  }

  isImageFile(): boolean {
    return this.fileService.isImageFile(this.uploadedFileUrl || this.selectedFileName);
  }

  isPdfFile(path?: string): boolean {
    return this.fileService.isPdfFile(path || this.uploadedFileUrl || this.selectedFileName);
  }

  getFileIcon(): string {
    return this.fileService.getFileIcon(this.uploadedFileUrl || this.selectedFileName);
  }

  downloadAttachment(): void {
    if (this.uploadedFileUrl) {
      const filename = this.uploadedFileUrl.split('/').pop() || 'download';
      this.fileService.downloadFile(this.uploadedFileUrl, filename);
    }
  }

  downloadHistoryAttachment(url: string): void {
    if (url) {
      const filename = url.split('/').pop() || 'download';
      this.fileService.downloadFile(url, filename);
    }
  }

  getFileName(url?: string): string {
    if (!url) return '';
    return url.split('/').pop() || '';
  }

  removeHistoryAttachment(l: LeaveHistoryItem): void {
    if (!confirm('Are you sure you want to remove this attachment?')) return;

    this.loader.show();
    // 1. Delete file from server
    const schoolId = this.selectedSchoolId || this.resolvedSchoolId;
    const fileName = l.attachmentURL?.split('/').pop() || '';
    
    this.fileService.deleteLeaveFile({
      SchoolId: schoolId,
      LeaveId: l.id,
      FileName: fileName,
      ModifiedBy: this.ss('email') || ''
    }).subscribe({
      next: () => {
        // 2. Update DB record (Clear AttachmentURL)
        this.api.post<any>('Tbl_LeaveApplication_Operations', {
          Flag: '5',
          ID: l.id,
          AttachmentURL: '',
          ModifiedBy: this.ss('email') || ''
        }).subscribe({
          next: (res) => {
            this.loader.hide();
            if (res?.statusCode === 200 || res?.StatusCode === 200) {
              // Update the local selectedLeave object if it's the same record
              if (this.selectedLeave && this.selectedLeave.id === l.id) {
                this.selectedLeave.attachmentURL = '';
              }
              this.fetchHistory();
              this.openModal('Attachment removed successfully.');
            }
          },
          error: () => { this.loader.hide(); this.openModal('Database update failed.'); }
        });
      },
      error: () => { this.loader.hide(); this.openModal('File deletion failed.'); }
    });
  }

  onHistoryFileChange(event: Event, l: LeaveHistoryItem): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    if (file.size > this.maxFileSize) {
      this.openModal('File size exceeds 5MB limit.');
      return;
    }

    this.loader.show();
    const formData = new FormData();
    formData.append('File', file);
    formData.append('SchoolId', this.selectedSchoolId || this.resolvedSchoolId);
    formData.append('LeaveId', l.id);

    this.fileService.uploadLeaveDoc(formData).subscribe({
      next: (uploadRes: any) => {
        // ✅ Update selectedLeave immediately so modal reflects the new file right away
        l.attachmentURL = uploadRes.url;
        if (this.selectedLeave && this.selectedLeave.id === l.id) {
          this.selectedLeave = { ...this.selectedLeave, attachmentURL: uploadRes.url };
        }
        this.cdr.detectChanges();

        // Persist to DB
        this.api.post<any>('Tbl_LeaveApplication_Operations', {
          Flag: '5',
          ID: l.id,
          AttachmentURL: uploadRes.url,
          ModifiedBy: this.ss('email') || ''
        }).subscribe({
          next: (res) => {
            this.loader.hide();
            const sc = res?.statusCode ?? res?.StatusCode;
            const hasData = (res?.data?.length > 0) || (res?.Data?.length > 0);
            if (sc === 200 || sc === '200' || hasData || !sc) {
              this.fetchHistory();
            } else {
              this.openModal('File saved but database update may have failed.');
            }
          },
          error: () => { this.loader.hide(); this.openModal('Database update failed.'); }
        });
      },
      error: () => { this.loader.hide(); this.openModal('File upload failed.'); }
    });
  }

  // ── modal helpers ─────────────────────────────────────────────────────────────
  openModal(msg: string) {
    this.AminityInsStatus = msg;
    this.isModalOpen = true;
  }
  handleOk() {
    this.isModalOpen = false;
    this.fetchHistory();
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
    this.selectedLeave = null;
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
    
    const payload: any = {
      Flag: '5',
      ID: this.selectedLeave.id,
      ApprovedBy: String(this.ss('StaffID') || this.ss('UserID') || '1'),
      ApplicationStatus: status,
      AdminRemarks: this.actionRemarks.trim() || `${status} by ${approverDisplayName}`,
      ApprovedByName: approverDisplayName
    };

    // Preserve attachment URL on status update (including cancel)
    if (this.selectedLeave.attachmentURL) {
      payload.AttachmentURL = this.selectedLeave.attachmentURL;
    }

    this.proceedWithStatusUpdate(payload, status);
  }

  private proceedWithStatusUpdate(payload: any, status: string): void {
    this.api.post<any>('Tbl_LeaveApplication_Operations', payload).subscribe({
      next: (res) => {
        this.isSubmittingAction = false;
        this.loader.hide();
        this.closeDetail();
        const sc = res?.statusCode ?? res?.StatusCode;
        if (sc === 200 || sc === '200') {
          this.openModal(`Leave ${status} successfully.`);
          this.fetchHistory();
        } else {
          this.openModal(res?.message || 'Update failed.');
        }
      },
      error: () => {
        this.isSubmittingAction = false;
        this.loader.hide();
        this.closeDetail();
        this.openModal('Error updating status.');
      }
    });
  }

  getStatusClass(s: string) { return s?.toLowerCase() || 'pending'; }
  trackById(_: number, l: LeaveHistoryItem) { return l.id; }
  
  // Pagination methods
  onStatusFilterChange(): void {
    this.historyCurrentPage = 1;
    this.fetchHistory();
  }
  
  historyGoToPage(page: number): void {
    if (page < 1) page = 1;
    if (page > this.historyTotalPages) page = this.historyTotalPages;
    this.historyCurrentPage = page;
    this.fetchHistory();
  }
  
  historyPreviousPage(): void {
    if (this.historyCurrentPage > 1) {
      this.historyGoToPage(this.historyCurrentPage - 1);
    }
  }
  
  historyNextPage(): void {
    if (this.historyCurrentPage < this.historyTotalPages) {
      this.historyGoToPage(this.historyCurrentPage + 1);
    }
  }
  
  historyFirstPage(): void {
    this.historyGoToPage(1);
  }
  
  historyLastPage(): void {
    this.historyGoToPage(this.historyTotalPages);
  }

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
    Limit: this.historyPageSize,
    Offset: (this.historyCurrentPage - 1) * this.historyPageSize,
    ApplicationStatus: this.selectedStatusFilter === 'All' ? null : this.selectedStatusFilter,
    IsActive: "1"
  };

  if (this.isParent || this.isActuallyStudent) {
    payload.AdmissionNo = id;
  } else {
    payload.StaffID = id;
  }

  this.loader.show();

  // Fetch both count and data in parallel
  const countPayload = { ...payload, Flag: '6' };
  
  this.api.post<any>('Tbl_LeaveApplication_Operations', countPayload).subscribe({
    next: (countRes: any) => {
      this.historyTotalCount = countRes?.data?.[0]?.totalcount || 0;
      
      // Then fetch paginated data
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
          status: (item.applicationStatus || item.ApplicationStatus || 'Pending').toString().trim(),
          approvalRemarks: remarks,
          approvedByName: item.approvedByName || item.ApprovedByName || extractedName,
          approvedById: approvedByEmail,
          admissionNo: item.admissionNo || item.AdmissionNo || '',
          applicantName: item.applicantName || item.ApplicantName || '',
          className: item.className || item.ClassName || '',
          divisionName: item.divisionName || item.DivisionName || '',
          attachmentURL: item.attachmentURL || item.AttachmentURL || ''
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
    },
    error: () => {
      this.loader.hide();
      this.historyTotalCount = 0;
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

          const activeYearId = sessionStorage.getItem('ActiveAcademicYearID') || '';
          const matchedYear = this.academicYears.find(y => y.ID === activeYearId);
          if (matchedYear) {
            this.selectedAcademicYearId = matchedYear.ID;
            this.selectedAcademicYear = matchedYear.Name;
          } else if (this.academicYears.length > 0 && !this.selectedAcademicYearId) {
            this.selectedAcademicYearId = this.academicYears[0].ID;
            this.selectedAcademicYear = this.academicYears[0].Name;
          }
          this.checkAndLoad();  this.fetchHistory();
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
    // Also fetch role lookup data
    this.fetchStaffRoleLookup();
    this.fetchRoleList();
  }

  // Fetch staff role lookup (like viewstaffattendance)
  private fetchStaffRoleLookup(): void {
    console.log('[APPLY LEAVE] Fetching staff role lookup for school:', this.selectedSchoolId);
    this.api.post<any>('Tbl_Staff_CRUD_Operations', {
      SchoolID: this.selectedSchoolId,
      Flag: '2'
    }).subscribe(
      (response: any) => {
        console.log('[APPLY LEAVE] Staff role lookup API response:', response);
        const lookup = new Map<string, string>();

        if (Array.isArray(response?.data)) {
          response.data.forEach((item: any) => {
            console.log('[APPLY LEAVE] Processing staff item:', item);
            const staffId = String(item.id ?? item.ID ?? '').trim();
            if (!staffId) return;
            
            // Log all possible role-related fields
            console.log('[APPLY LEAVE] Staff role fields for', staffId, ':', {
              staffType: item.staffType,
              StaffType: item.StaffType,
              roleName: item.roleName,
              RoleName: item.RoleName,
              staffTypeName: item.staffTypeName,
              staffTypeNames: item.staffTypeNames,
              role: item.role,
              Role: item.Role,
              roleId: item.roleId,
              RoleId: item.RoleId
            });
            
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
        console.log('[APPLY LEAVE] Processed staffRoleLookup:', Array.from(this.staffRoleLookup.entries()));
      },
      () => {
        console.log('[APPLY LEAVE] Staff role lookup API error');
        this.staffRoleLookup = new Map<string, string>();
      }
    );
  }

  // Fetch role list (like leave approval component)
  private fetchRoleList(): void {
    this.api.post<any>('Tbl_Roles_CRUD_Operations', { Flag: '2' }).subscribe(
      (response: any) => {
        console.log('[APPLY LEAVE] Role list API response:', response);
        this.rolesList = Array.isArray(response?.data) ? response.data.map((role: any) => ({
          ID: String(role.id ?? role.ID),
          Name: String(role.roleName ?? role.RoleName ?? role.name ?? role.Name)
        })) : [];
        console.log('[APPLY LEAVE] Processed rolesList:', this.rolesList);
      },
      () => {
        console.log('[APPLY LEAVE] Role list API error');
        this.rolesList = [];
      }
    );
  }

  // Get staff role name (like leave approval component)
  getStaffRoleName(staff: any): string {
    // Debug: Log the staff object and lookup process
    console.log('[APPLY LEAVE] getStaffRoleName debug:', {
      staff: staff,
      staffId: String(staff.ID || '').trim(),
      staffRoleLookup: Array.from(this.staffRoleLookup.entries()),
      rolesList: this.rolesList
    });

    // First try to use already resolved role from staff data
    if (staff.RoleID && staff.RoleID !== '-' && !/^\d+$/.test(String(staff.RoleID).trim())) {
      return String(staff.RoleID).trim();
    }

    // Use staffRoleLookup to get role name
    const staffId = String(staff.ID || '').trim();
    if (!staffId) return '-';
    
    const roleFromLookup = this.staffRoleLookup.get(staffId);
    console.log('[APPLY LEAVE] roleFromLookup for staffId', staffId, ':', roleFromLookup);
    
    if (roleFromLookup) {
      // If it's a numeric role ID, try to resolve it using roleList
      if (/^\d+$/.test(roleFromLookup.trim())) {
        const roleMatch = this.rolesList.find(role => String(role.ID) === roleFromLookup.trim());
        console.log('[APPLY LEAVE] roleMatch for numeric role', roleFromLookup, ':', roleMatch);
        return roleMatch ? roleMatch.Name : roleFromLookup;
      }
      return roleFromLookup;
    }

    return '-';
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

        // Reset selection to show placeholder
        this.selectedStaffId = '';
        this.selectedStaffName = '';
        this.selectedChildIndex = 0;

        // Auto-select first child
        if (this.parentChildren.length > 0) {
          this.selectChild(0);
        }

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

  selectedChildIndex: number = 0;

  selectChild(index: number): void {
    this.selectedChildIndex = index;
    const child = this.parentChildren[index];
    if (!child) return;
    this.selectedStaffId = child.ID;
    this.selectedStaffName = child.Name;
    this.selectedClassId = child.Class;
    this.selectedDivisionId = child.Division;
    this.fetchHistory();
  }

  private loadStudentsByAdmissionIds(_admissionIds: string[]): void {
    // No longer used — replaced by server-side Flag 9
  }
}
