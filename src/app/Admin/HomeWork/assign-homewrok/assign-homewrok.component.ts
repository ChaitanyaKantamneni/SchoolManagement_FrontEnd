import { DatePipe, NgClass, NgFor, NgIf, NgStyle, SlicePipe } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { LoaderService } from '../../../Services/loader.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-assign-homewrok',
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule, DatePipe, SlicePipe],
  templateUrl: './assign-homewrok.component.html',
  styleUrl: './assign-homewrok.component.css'
})
export class AssignHomewrokComponent extends BasePermissionComponent {
  pageName = 'Assign Homework';

  constructor(
    private http: HttpClient,
    router: Router,
    public loader: LoaderService,
    private apiurl: ApiServiceService,
    menuService: MenuServiceService
  ) {
    super(menuService, router);
  }

  // ── Pagination & Search Properties ───────────────────────────────────────
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;

  // Pagination and sorting properties (matching examtype component)
  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
  lastCreatedDate: string | null = null;
  lastID: number | null = null;
  sortColumn: string = 'CreatedDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  // ── UI State Properties ───────────────────────────────────────────────────────
  IsAddNewClicked: boolean = false;
  IsActiveStatus: boolean = false;
  ViewSyllabusClicked: boolean = false;
  isViewMode = false;
  viewSyllabus: any = null;
  AminityInsStatus: any = '';
  isModalOpen = false;
  isViewModalOpen = false;
  editclicked: boolean = false;
  isLoading: boolean = false;

  // ── Data Lists ───────────────────────────────────────────────────────────────
  schoolList: any[] = [];
  selectedSchoolID: string = '';
  SchoolSelectionChange: boolean = false;
  academicYearList: any[] = [];
  AdminselectedSchoolID: string = '';
  AdminselectedAcademivYearID: string = '';
  
  // Homework specific properties
  classList: any[] = [];
  divisionList: any[] = [];
  subjectList: any[] = [];
  AdminselectedClassID: string = '';
  AdminselectedDivisionID: string = '';
  AdminselectedSubjectID: string = '';
  
  // Teacher-specific properties (like exammarks component)
  teacherAssignedClassID: string = '';
  teacherAssignedDivisionID: string = '';
  
  homeworkList: any[] = [];
  totalCount: number = 0;
  totalPagesCount: number = 0;

  // ── Submissions View ──────────────────────────────────────────────────────
  IsViewSubmissions: boolean = false;
  selectedHomeworkForSubmissions: any = null;
  submissionsList: any[] = [];
  submissionsCount: number = 0;
  submissionsPage: number = 1;
  submissionsPageSize: number = 5;
  submissionsTotalPages: number = 0;
  isEvaluateModalOpen: boolean = false;
  selectedSubmissionForEval: any = null;
  isSubmissionViewModalOpen: boolean = false;
  selectedSubmissionView: any = null;

  EvaluateForm: FormGroup = new FormGroup({
    ID: new FormControl(''),
    Remarks: new FormControl(''),
    SubmissionStatus: new FormControl('Reviewed', [Validators.required])
  });

  // ── Form Structure ───────────────────────────────────────────────────────────
  HomeworkForm: FormGroup = new FormGroup({
    ID: new FormControl(''),
    SchoolID: new FormControl(''),
    AcademicYear: new FormControl(0, [Validators.required, Validators.min(1)]),
    Class: new FormControl(0, [Validators.required, Validators.min(1)]),
    Division: new FormControl(0, [Validators.required, Validators.min(1)]),
    SubjectID: new FormControl(0, [Validators.required, Validators.min(1)]),
    TeacherID: new FormControl(''),
    HomeworkTitle: new FormControl('', [Validators.required, Validators.minLength(3)]),
    Description: new FormControl('', [Validators.required]),
    AssignedDate: new FormControl('', [Validators.required]),
    SubmissionDate: new FormControl('', [Validators.required]),
    AttachmentURL: new FormControl(''),
    IsActive: new FormControl(true),
    School: new FormControl(),
    CreatedBy: new FormControl(''),
    CreatedIP: new FormControl(''),
    ModifiedBy: new FormControl(''),
    ModifiedIP: new FormControl('')
  });

  // ── session helpers ──────────────────────────────────────────────────
  private ss(key: string) { return sessionStorage.getItem(key) || localStorage.getItem(key) || ''; }
  
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

  // Dynamic role detection properties (similar to homework component)
  currentRoleUI: 'admin' | 'school_admin' | 'teacher' | 'principal' = 'admin';
  currentRoleInfo: any = {};
  isRoleInitialized: boolean = false;

  // Dynamic role detection without async dependency
  private getDynamicRoleUIType(): 'admin' | 'school_admin' | 'teacher' | 'principal' {
    const roleId = this.currentRollID;
    const roleName = this.currentRoleName.toLowerCase();

    console.log('[ASSIGN HOMEWORK] getDynamicRoleUIType - Input values:', {
      roleId,
      roleName,
      rawSession: {
        menuRoleId: this.ss('menuRoleId'),
        RollID: this.ss('RollID'),
        rollID: this.ss('rollID'),
        roleName: this.ss('roleName'),
        RoleName: this.ss('RoleName')
      }
    });

    // Based on your role mapping:
    // 1: Super Admin -> admin UI
    // 2: School Admin, 8: Principal -> school_admin UI
    // 3: Teaching Staff -> teacher UI  

    if (roleId === '1' || roleName.includes('super')) {
      console.log('[ASSIGN HOMEWORK] getDynamicRoleUIType - Returning: admin');
      return 'admin';
    }
    
    if (roleId === '2' || roleId === '8' || 
        roleName.includes('admin') || roleName.includes('principal') || roleName.includes('management')) {
      console.log('[ASSIGN HOMEWORK] getDynamicRoleUIType - Returning: school_admin');
      return 'school_admin';
    }
    
    if (roleId === '3' || roleName.includes('teaching') || roleName.includes('teacher')) {
      console.log('[ASSIGN HOMEWORK] getDynamicRoleUIType - Returning: teacher');
      return 'teacher';
    }
    
    // Default to admin UI for other roles in assign-homework context
    console.log('[ASSIGN HOMEWORK] getDynamicRoleUIType - Returning: admin (default)');
    return 'admin';
  }

  initializeRoleBasedUI(): void {
    console.log('[ASSIGN HOMEWORK] Initializing dynamic role-based UI');
    
    // Dynamic role detection based on session data
    this.currentRoleUI = this.getDynamicRoleUIType();
    this.currentRoleInfo = {
      roleId: this.currentRollID,
      roleName: this.currentRoleName,
      userId: this.currentUserId,
      schoolId: this.resolvedSchoolId
    };
    this.isRoleInitialized = true;
    
    console.log('[ASSIGN HOMEWORK] Dynamic role-based UI initialized:', {
      currentRoleInfo: this.currentRoleInfo,
      currentRoleUI: this.currentRoleUI,
      isAdmin: this.isAdmin,
      isSchoolAdmin: this.isSchoolAdmin,
      isTeacher: this.isTeacher
    });

    // Initialize data based on role
    this.initializeDataBasedOnRole();
  }

  initializeDataBasedOnRole(): void {
    console.log('[ASSIGN HOMEWORK] Initializing data for role:', this.currentRoleUI);
    
    if (this.currentRoleUI === 'teacher') {
      this.selectedSchoolID = this.resolvedSchoolId || this.schoolId;
      this.AdminselectedSchoolID = this.resolvedSchoolId || this.schoolId;
      this.resolveStaffIdentity();
      this.FetchAcademicYearsList();
    } else if (this.currentRoleUI === 'school_admin' || this.currentRoleUI === 'principal') {
      this.selectedSchoolID = this.resolvedSchoolId || this.schoolId;
      this.AdminselectedSchoolID = this.resolvedSchoolId || this.schoolId;
      this.FetchAcademicYearsList();
    } else if (this.currentRoleUI === 'admin') {
      // Super Admin - fetch all schools for selection
      this.FetchSchoolsList();
      this.selectedSchoolID = this.resolvedSchoolId || this.schoolId;
      this.AdminselectedSchoolID = this.resolvedSchoolId || this.schoolId;
      this.FetchAcademicYearsList();
    } else {
      // Other roles
      this.FetchSchoolsList();
      this.FetchAcademicYearsList();
    }
    
    this.FetchInitialData();
  }

  // Teacher allocation sync (using new Flag='9' - no academic year required)
  private syncTeacherClassDivisionFromAllocation(onDone?: () => void): void {
    if (!this.isTeacher) {
      onDone?.();
      return;
    }

    if (!this.currentUserId) {
      console.log('[ASSIGN HOMEWORK] Cannot sync teacher allocation - missing user ID');
      onDone?.();
      return;
    }

    const requestData = {
      SchoolID: this.AdminselectedSchoolID || this.ss('SchoolID') || '',
      ClassTeacher: this.currentUserId, // Use teacher ID (29)
      Flag: '9' // New flag: Fetch by School + ClassTeacher (no academic year needed)
    };

    console.log('[ASSIGN HOMEWORK] Calling teacher allocation API:', requestData);
    this.apiurl.post<any>('Tbl_AllotClassTeacher_CRUD_Operations', requestData).subscribe({
      next: (response: any) => {
        console.log('[ASSIGN HOMEWORK] Teacher allocation API response:', response);
        const allocation = response?.data?.[0];
        if (allocation) {
          const classId = allocation.classID || allocation.Class || allocation.class;
          const divisionId = allocation.divisionID || allocation.Division || allocation.division;
          const academicYearId = allocation.academicYear || allocation.AcademicYear;
          const className = allocation.className || allocation.ClassName || '';
          const divisionName = allocation.divisionName || allocation.DivisionName || '';

          // Set academic year from allocation
          if (academicYearId && !this.AdminselectedAcademivYearID) {
            this.AdminselectedAcademivYearID = academicYearId.toString();
            this.HomeworkForm.get('AcademicYear')?.patchValue(academicYearId);
            console.log('[ASSIGN HOMEWORK] Set academic year from allocation:', academicYearId);
          }

          if (classId) {
            this.teacherAssignedClassID = classId;
            this.AdminselectedClassID = classId;
            this.classList = [{
              ID: classId,
              Name: className || `Class ${classId}`,
              Division: classId
            }];
            
            // Set form value for class
            this.HomeworkForm.get('Class')?.patchValue(classId);
            console.log('[ASSIGN HOMEWORK] Set class form value:', classId);
          }

          if (divisionId) {
            this.teacherAssignedDivisionID = divisionId;
            this.AdminselectedDivisionID = divisionId;
            this.divisionList = [{
              ID: divisionId,
              Name: divisionName || `Division ${divisionId}`
            }];
            
            // Set form value for division
            this.HomeworkForm.get('Division')?.patchValue(divisionId);
            console.log('[ASSIGN HOMEWORK] Set division form value:', divisionId);
          }

          console.log('[ASSIGN HOMEWORK] Teacher allocation synced:', {
            academicYearId,
            classId,
            divisionId,
            className,
            divisionName,
            formValues: {
              AcademicYear: this.HomeworkForm.get('AcademicYear')?.value,
              Class: this.HomeworkForm.get('Class')?.value,
              Division: this.HomeworkForm.get('Division')?.value
            }
          });

          // Fetch subjects now that we have class and division
          console.log('[ASSIGN HOMEWORK] Teacher allocation synced - About to fetch subjects');
          this.FetchSubjectsList();
          
          // If this is automatic sync (not from academic year change), fetch initial data
          if (!onDone) {
            console.log('[ASSIGN HOMEWORK] Automatic teacher allocation complete - Fetching initial homework data');
            this.FetchInitialData();
          }
        }
        onDone?.();
      },
      error: (error) => {
        console.error('[ASSIGN HOMEWORK] Error syncing teacher allocation:', error);
        onDone?.();
      }
    });
  }

  // Helper method to normalize IDs (from exammarks component)
  private normalizeId(id: any): string {
    if (!id) return '';
    const str = String(id).trim();
    return str === '0' || str === 'null' || str === 'undefined' ? '' : str;
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

  readonly schoolId = this.ss('SchoolID') || this.ss('schoolId');
  
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

  ActiveUserId: string = this.ss('email') || this.ss('Email') || '';
  roleId = this.currentRollID;

  // ── Lifecycle Methods ───────────────────────────────────────────────────────
  ngOnInit(): void {
    console.log('[ASSIGN HOMEWORK] ngOnInit - Role detection:', {
      currentRoleName: this.currentRoleName,
      currentRollID: this.currentRollID,
      isAdmin: this.isAdmin,
      isSchoolAdmin: this.isSchoolAdmin,
      isTeacher: this.isTeacher,
      schoolId: this.schoolId,
      resolvedSchoolId: this.resolvedSchoolId,
      sessionValues: {
        menuRoleId: this.ss('menuRoleId'),
        RollID: this.ss('RollID'),
        rollID: this.ss('rollID'),
        roleName: this.ss('roleName'),
        RoleName: this.ss('RoleName')
      }
    });

    this.checkViewPermission();
    this.SchoolSelectionChange = false;

    // Use dynamic role detection
    this.initializeRoleBasedUI();
  }

  // ── Form Helper Methods ───────────────────────────────────────────────────────
  allowOnlyNumbers(event: KeyboardEvent) {
    if (
      event.key === 'Backspace' ||
      event.key === 'Tab' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'Delete'
    ) {
      return;
    }

    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  AddNewClicked() {
    if (this.isAdmin) {
      this.HomeworkForm.get('School')?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      this.HomeworkForm.get('School')?.clearValidators();
    }
    if (this.AdminselectedSchoolID === '') {
      const schoolFromSession = this.ss('SchoolID') || '';
      this.AdminselectedSchoolID = schoolFromSession;
      this.FetchAcademicYearsList();
    }
    this.HomeworkForm.reset();
    this.HomeworkForm.get('School')?.patchValue('0');
    this.HomeworkForm.get('AcademicYear')?.patchValue('0');
    this.HomeworkForm.get('Class')?.patchValue('0');
    this.HomeworkForm.get('Division')?.patchValue('0');
    this.HomeworkForm.get('SubjectID')?.patchValue('0');
    // Set default values for homework
    this.HomeworkForm.get('AssignedDate')?.patchValue(new Date().toISOString().split('T')[0]);
    this.HomeworkForm.get('SubmissionDate')?.patchValue(new Date().toISOString().split('T')[0]);
    this.HomeworkForm.get('TeacherID')?.patchValue(this.currentUserId);
    
    // For teachers, only trigger allocation sync when academic year is manually selected
    if (this.isTeacher) {
      console.log('[ASSIGN HOMEWORK] AddNewClicked - Setting up teacher form');
      console.log('[ASSIGN HOMEWORK] Teacher form ready - waiting for academic year selection');
      // Don't auto-select academic year - wait for user to select it
      // Allocation sync will be triggered in onAcademicYearChange when user selects academic year
    }
    
    this.IsAddNewClicked = !this.IsAddNewClicked;
    this.IsActiveStatus = true;
    this.ViewSyllabusClicked = false; // Reset edit mode
  }

  // ── CRUD Operations ───────────────────────────────────────────────────────────
  SubmitHomework() {
    if (this.HomeworkForm.invalid) {
      this.HomeworkForm.markAllAsTouched();
      return;
    }

    const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
    const data = {
      SchoolID: this.HomeworkForm.get('School')?.value || this.AdminselectedSchoolID,
      AcademicYear: this.HomeworkForm.get('AcademicYear')?.value || this.AdminselectedAcademivYearID,
      Class: this.getIntValue(this.HomeworkForm.get('Class')?.value || this.AdminselectedClassID),
      Division: this.getIntValue(this.HomeworkForm.get('Division')?.value || this.AdminselectedDivisionID),
      SubjectID: this.getSubjectIdValue(this.HomeworkForm.get('SubjectID')?.value || this.AdminselectedSubjectID),
      TeacherID: this.getIntValue(this.HomeworkForm.get('TeacherID')?.value || this.currentUserId),
      HomeworkTitle: this.HomeworkForm.get('HomeworkTitle')?.value,
      Description: this.HomeworkForm.get('Description')?.value,
      AssignedDate: this.HomeworkForm.get('AssignedDate')?.value,
      SubmissionDate: this.HomeworkForm.get('SubmissionDate')?.value,
      AttachmentURL: this.HomeworkForm.get('AttachmentURL')?.value,
      IsActive: IsActiveStatusNumeric,
      CreatedBy: this.ActiveUserId,
      CreatedIP: '',
      ModifiedBy: this.ActiveUserId,
      ModifiedIP: '',
      Flag: '1'
    };

    console.log('Submitting data:', data);

    this.apiurl.post("Tbl_Homework_CRUD_Operations", data).subscribe({
      next: (response: any) => {
        console.log('Response:', response);
        if (response.statusCode === 200) {
          this.IsAddNewClicked = !this.IsAddNewClicked;
          this.isModalOpen = true;
          this.AminityInsStatus = "Homework Assigned Successfully!";
          this.HomeworkForm.reset();
          this.HomeworkForm.markAsPristine();
          
          // Reset pagination state to get fresh data
          this.currentPage = 1;
          this.pageCursors = [];
          this.lastCreatedDate = null;
          this.lastID = null;
          
          this.FetchInitialData({}, true);
        } else {
          this.AminityInsStatus = response.message || "Error Submitting Homework.";
          this.isModalOpen = true;
        }
      },
      error: (err: any) => {
        if (err.status === 400 && err.error?.message) {
          this.AminityInsStatus = err.error.message;
        } else if (err.status === 500 && err.error?.Message) {
          this.AminityInsStatus = err.error.Message;
        } else {
          this.AminityInsStatus = "Unexpected error occurred.";
        }
        this.isModalOpen = true;
      }
    });
  }

  UpdateHomework() {
    if (this.HomeworkForm.invalid) {
      this.HomeworkForm.markAllAsTouched();
      return;
    }
    const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
    const data = {
      ID: this.HomeworkForm.get('ID')?.value || '',
      SchoolID: this.HomeworkForm.get('School')?.value || this.AdminselectedSchoolID,
      AcademicYear: this.HomeworkForm.get('AcademicYear')?.value || this.AdminselectedAcademivYearID,
      Class: this.getIntValue(this.HomeworkForm.get('Class')?.value || this.AdminselectedClassID),
      Division: this.getIntValue(this.HomeworkForm.get('Division')?.value || this.AdminselectedDivisionID),
      SubjectID: this.getSubjectIdValue(this.HomeworkForm.get('SubjectID')?.value || this.AdminselectedSubjectID),
      TeacherID: this.getIntValue(this.HomeworkForm.get('TeacherID')?.value || this.currentUserId),
      HomeworkTitle: this.HomeworkForm.get('HomeworkTitle')?.value || '',
      Description: this.HomeworkForm.get('Description')?.value || '',
      AssignedDate: this.HomeworkForm.get('AssignedDate')?.value || '',
      SubmissionDate: this.HomeworkForm.get('SubmissionDate')?.value || '',
      AttachmentURL: this.HomeworkForm.get('AttachmentURL')?.value || '',
      IsActive: IsActiveStatusNumeric,
      ModifiedBy: this.ActiveUserId,
      ModifiedIP: '',
      Flag: '5'
    };

    this.apiurl.post("Tbl_Homework_CRUD_Operations", data).subscribe({
      next: (response: any) => {
        if (response.statusCode === 200) {
          this.IsAddNewClicked = !this.IsAddNewClicked;
          this.isModalOpen = true;
          this.AminityInsStatus = "Homework Updated Successfully!";
          this.HomeworkForm.reset();
          this.HomeworkForm.markAsPristine();
          
          // Reset pagination state to get fresh data
          this.currentPage = 1;
          this.pageCursors = [];
          this.lastCreatedDate = null;
          this.lastID = null;
          
          this.FetchInitialData({}, true);
        }
      },
      error: (err: any) => {
        if (err.status === 400 && err.error?.message) {
          this.AminityInsStatus = err.error.message;
        } else if (err.status === 500 && err.error?.Message) {
          this.AminityInsStatus = err.error.Message;
        } else {
          this.AminityInsStatus = "Unexpected error occurred.";
        }
        this.isModalOpen = true;
      }
    });
  }

  // ── Data Fetching Methods ─────────────────────────────────────────────────────
  FetchInitialData(extra: any = {}, forceFresh: boolean = false) {
    // For teachers, don't call API if class/division is not yet determined
    if (this.currentRoleUI === 'teacher') {
      const effectiveClass = this.teacherAssignedClassID || this.AdminselectedClassID;
      const effectiveDivision = this.teacherAssignedDivisionID || this.AdminselectedDivisionID;
      
      if (!effectiveClass || !effectiveDivision) {
        console.log('[ASSIGN HOMEWORK] FetchInitialData skipped - Teacher class/division not set yet');
        this.homeworkList = [];
        this.totalCount = 0;
        this.totalPagesCount = 0;
        return;
      }
    }

    const isSearch = !!this.searchQuery?.trim();
    const flag = isSearch ? '7' : '2';

    let SchoolIdSelected = '';

    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    // Reset cursor if forcing fresh data or on first page
    const cursor = (!forceFresh && !extra.offset && this.currentPage > 1)
      ? this.pageCursors[this.currentPage - 2] || null
      : null;

   

    this.loader.show();

    this.FetchHomeworkCount(isSearch).subscribe({
      next: (countRes: any) => {
        console.log('Count Response:', countRes);
        console.log('Count Data:', countRes?.data);
        console.log('Total Count Value:', countRes?.data?.[0]?.totalCount);
        
        // Handle different possible response structures
        let countValue = 0;
        if (countRes?.data?.[0]?.totalcount) {
          countValue = countRes.data[0].totalcount;
        } else if (countRes?.data?.[0]?.totalCount) {
          countValue = countRes.data[0].totalCount;
        } else if (countRes?.data?.totalcount) {
          countValue = countRes.data.totalcount;
        } else if (countRes?.data?.totalCount) {
          countValue = countRes.data.totalCount;
        } else if (countRes?.totalcount) {
          countValue = countRes.totalcount;
        } else if (countRes?.totalCount) {
          countValue = countRes.totalCount;
        } else if (Array.isArray(countRes?.data) && countRes.data.length > 0) {
          // Try to find any count field in the first object
          const firstItem = countRes.data[0];
          countValue = firstItem.totalcount || firstItem.totalCount || firstItem.count || firstItem.total || 0;
        }
        
        this.totalCount = countValue;
        this.totalPagesCount = Math.ceil(this.totalCount / this.pageSize);
        
        console.log('Final countValue:', countValue);
        console.log('Set totalCount:', this.totalCount);
        console.log('Set totalPagesCount:', this.totalPagesCount);

        const payload: any = {
          Flag: flag,
          Limit: this.pageSize,
          SortColumn: this.sortColumn || 'CreatedDate',
          SortDirection: this.sortDirection || 'DESC',
          LastCreatedDate: cursor?.lastCreatedDate ?? null,
          LastID: cursor?.lastID ?? null,
          SchoolID: SchoolIdSelected,
          AcademicYear: this.AdminselectedAcademivYearID || null,
          Class: this.getIntValue(this.AdminselectedClassID) || null,
          Division: this.getIntValue(this.AdminselectedDivisionID) || null,
          SubjectID: this.getSubjectIdValue(this.AdminselectedSubjectID),
          ...extra
        };

        if (isSearch) payload.HomeworkTitle = this.searchQuery.trim();

        console.log('Data Payload:', payload);

        this.apiurl.post<any>('Tbl_Homework_CRUD_Operations', payload).subscribe({
          next: (response: any) => {
            console.log('Data Response:', response);
            const data = response?.data || [];
            console.log('Data Length:', data.length);
            console.log('Data Array:', data);
            
            this.mapHomeworkData(response);
            console.log('Mapped homeworkList length:', this.homeworkList.length);

            if (data.length > 0 && !this.pageCursors[this.currentPage - 1]) {
              const lastRow = data[data.length - 1];
              this.pageCursors[this.currentPage - 1] = {
                lastCreatedDate: lastRow.createdDate,
                lastID: Number(lastRow.id)
              };
            }

            this.loader.hide();
          },
          error: () => {
            this.homeworkList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.homeworkList = [];
        this.totalCount = 0;
        this.totalPagesCount = 0;
        this.loader.hide();
      }
    });
  }

  FetchHomeworkCount(isSearch: boolean) {
    let SchoolIdSelected = '';

    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    const countPayload = {
      Flag: isSearch ? '8' : '6',
      SchoolID: SchoolIdSelected,
      AcademicYear: this.AdminselectedAcademivYearID || null,
      Class: this.getIntValue(this.currentRoleUI === 'teacher' ? this.teacherAssignedClassID : this.AdminselectedClassID) || null,
      Division: this.getIntValue(this.currentRoleUI === 'teacher' ? this.teacherAssignedDivisionID : this.AdminselectedDivisionID) || null,
      SubjectID: this.getSubjectIdValue(this.AdminselectedSubjectID),
      TeacherID: this.currentRoleUI === 'teacher' ? this.getIntValue(this.currentUserId) : null, // Add TeacherID filter for teachers
      HomeworkTitle: isSearch ? this.searchQuery.trim() : null
    };

    console.log('Count Payload:', countPayload);

    return this.apiurl.post<any>('Tbl_Homework_CRUD_Operations', countPayload);
  }

  mapHomeworkData(response: any) {
    this.homeworkList = (response.data || []).map((item: any) => ({
      id: item.id,
      schoolID: item.schoolID,
      schoolName: item.schoolName || item.SchoolName || '',
      academicYear: item.academicYear,
      academicYearName: item.academicYearName || item.AcademicYearName || '',
      class: item.class?.toString() || '0',
      className: item.className,
      division: item.division?.toString() || '0',
      divisionName: item.divisionName,
      subjectID: item.subjectID?.toString() || '0',
      subjectName: item.subjectName,
      teacherID: item.teacherID?.toString() || '0',
      homeworkTitle: item.homeworkTitle,
      description: item.description,
      assignedDate: item.assignedDate,
      submissionDate: item.submissionDate,
      attachmentURL: item.attachmentURL,
      isActive: item.isActive === "1" || item.isActive === 1 || item.isActive === true,
      createdDate: item.createdDate,
      
    }));
  }

  FetchSchoolsList() {
    const requestData = { Flag: '2' };

    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.schoolList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.name,
                IsActive: isActiveString
              };
            });
          } else {
            this.schoolList = [];
          }
        },
        (error) => {
          this.schoolList = [];
        }
      );
  }

  FetchAcademicYearsList() {
    const requestData = { SchoolID: this.AdminselectedSchoolID || '', Flag: '2' };

    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.academicYearList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.name,
                IsActive: isActiveString
              };
            });
          } else {
            this.academicYearList = [];
          }
        },
        (error) => {
          this.academicYearList = [];
        }
      );
  }

  FetchClassList() {
    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: this.AdminselectedAcademivYearID || '',
      Flag: '9'
    };

    this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.classList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" || item.isActive === "True" ? "Active" : "InActive";
              return {
                ID: item.sNo.toString(),
                Name: item.syllabusClassName,
                Division: item.class
              };
            });
          } else {
            this.classList = [];
          }
        },
        (error) => {
          this.classList = [];
        }
      );
  }

  FetchSubjectsList() {
    console.log('[ASSIGN HOMEWORK] FetchSubjectsList called with:', {
      AdminselectedSchoolID: this.AdminselectedSchoolID,
      AdminselectedAcademivYearID: this.AdminselectedAcademivYearID,
      AdminselectedClassID: this.AdminselectedClassID,
      AdminselectedDivisionID: this.AdminselectedDivisionID
    });

    // Require only class for subjects fetching (like setexam component)
    if (!this.AdminselectedClassID) {
      console.log('[ASSIGN HOMEWORK] Cannot fetch subjects - Class is required');
      this.subjectList = [];
      return;
    }

    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: this.AdminselectedAcademivYearID || '',
      Class: this.AdminselectedClassID || '',
      Flag: '3'
    };

    console.log('[ASSIGN HOMEWORK] FetchSubjectsList - API Request:', requestData);

    this.apiurl.post<any>('Tbl_Subject_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.subjectList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" || item.isActive === "True" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.name,
                IsActive: isActiveString
              };
            });
          } else {
            this.subjectList = [];
          }
        },
        (error) => {
          this.subjectList = [];
        }
      );
  }

  FetchHomeworkList(): void {
    console.log('[ASSIGN HOMEWORK] FetchHomeworkList called - Current values:', {
      currentRoleUI: this.currentRoleUI,
      AdminselectedAcademivYearID: this.AdminselectedAcademivYearID,
      teacherAssignedClassID: this.teacherAssignedClassID,
      teacherAssignedDivisionID: this.teacherAssignedDivisionID,
      AdminselectedClassID: this.AdminselectedClassID,
      AdminselectedDivisionID: this.AdminselectedDivisionID
    });
    
    this.isLoading = true;
    this.loader.show();

    const isSearching = this.searchQuery.trim().length > 0;
    
    // Use FLAG 2 for all roles with role-specific filtering
    let dataFlag: string = isSearching ? '7' : '2';
    let countFlag: string = isSearching ? '8' : '6';
    let payload: any;

    if (this.currentRoleUI === 'teacher') {
      // Teacher - Filter by school, academic year, class, division
      console.log('[ASSIGN HOMEWORK] Teacher payload debug:', {
        AdminselectedAcademivYearID: this.AdminselectedAcademivYearID,
        teacherAssignedClassID: this.teacherAssignedClassID,
        teacherAssignedDivisionID: this.teacherAssignedDivisionID,
        AdminselectedClassID: this.AdminselectedClassID,
        AdminselectedDivisionID: this.AdminselectedDivisionID
      });
      
      payload = {
        Flag: dataFlag,
        SchoolID: this.AdminselectedSchoolID || this.ss('SchoolID') || '',
        AcademicYear: this.AdminselectedAcademivYearID || '',
        Class: this.getIntValue(this.teacherAssignedClassID || this.AdminselectedClassID),
        Division: this.getIntValue(this.teacherAssignedDivisionID || this.AdminselectedDivisionID),
        SubjectID: this.getSubjectIdValue(this.AdminselectedSubjectID),
        TeacherID: this.getIntValue(this.currentUserId), // Add TeacherID filter for teacher 29
        Limit: this.pageSize,
        Offset: (this.currentPage - 1) * this.pageSize,
        SortColumn: 'CreatedDate',
        SortDirection: 'DESC'
      };
      
      console.log('[ASSIGN HOMEWORK] Final teacher payload:', payload);
    } else if (this.currentRoleUI === 'school_admin' || this.currentRoleUI === 'principal') {
      // School Admin/Principal - Filter by school and academic year only
      payload = {
        Flag: dataFlag,
        SchoolID: this.AdminselectedSchoolID || this.ss('SchoolID') || '',
        AcademicYear: this.AdminselectedAcademivYearID || '',
        Class: null,  // Don't filter by class
        Division: null,  // Don't filter by division
        SubjectID: this.getSubjectIdValue(this.AdminselectedSubjectID),
        Limit: this.pageSize,
        Offset: (this.currentPage - 1) * this.pageSize,
        SortColumn: 'CreatedDate',
        SortDirection: 'DESC'
      };
    } else {
      // Super Admin - Get all data (no school filtering)
      payload = {
        Flag: dataFlag,
        SchoolID: null,  // Get all schools
        AcademicYear: this.AdminselectedAcademivYearID || '',
        Class: null,
        Division: null,
        SubjectID: this.getSubjectIdValue(this.AdminselectedSubjectID),
        Limit: this.pageSize,
        Offset: (this.currentPage - 1) * this.pageSize,
        SortColumn: 'CreatedDate',
        SortDirection: 'DESC'
      };
    }

    // Add search term if searching
    if (isSearching) {
      payload.HomeworkTitle = this.searchQuery.trim();
    }

    // Fetch count first
    const countPayload = { ...payload, Flag: countFlag };

    this.apiurl.post<any>('Tbl_Homework_CRUD_Operations', countPayload).subscribe({
      next: (countRes: any) => {
        this.totalCount = countRes?.data?.[0]?.totalCount || 0;
        this.totalPagesCount = Math.ceil(this.totalCount / this.pageSize);

        // Then fetch paginated data
        this.apiurl.post<any>('Tbl_Homework_CRUD_Operations', payload).subscribe({
          next: (res) => {
            this.loader.hide();
            let list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.Data) ? res.Data : []);

            this.homeworkList = list.map((item: any) => ({
              id: item.id,
              schoolID: item.schoolID,
              academicYear: item.academicYear,
              class: item.class,
              className: item.className,
              division: item.division,
              divisionName: item.divisionName,
              subjectID: item.subjectID,
              subjectName: item.subjectName,
              teacherID: item.teacherID,
              homeworkTitle: item.homeworkTitle,
              description: item.description,
              assignedDate: item.assignedDate,
              submissionDate: item.submissionDate,
              attachmentURL: item.attachmentURL,
              isActive: item.isActive,
              createdDate: item.createdDate
            }));

            this.isLoading = false;
          },
          error: () => {
            this.loader.hide();
            this.homeworkList = [];
            this.totalCount = 0;
            this.totalPagesCount = 0;
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.loader.hide();
        this.homeworkList = [];
        this.totalCount = 0;
        this.totalPagesCount = 0;
        this.isLoading = false;
      }
    });
  }

  FetchHomeworkDetByID(homeworkID: string, mode: 'view' | 'edit'): void {
    const data = {
      ID: homeworkID,
      Flag: '4'
    };

    this.apiurl.post<any>('Tbl_Homework_CRUD_Operations', data).subscribe(
      (response: any) => {
        const item = response?.data?.[0];
        if (!item) {
          this.HomeworkForm.reset();
          this.viewSyllabus = null;
          return;
        }

        const isActive = item.isActive === "1";

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewSyllabus = {
            ID: item.id,
            SchoolID: item.schoolID,
            AcademicYear: item.academicYear,
            ClassName: item.className,
            DivisionName: item.divisionName,
            SubjectName: item.subjectName,
            HomeworkTitle: item.homeworkTitle,
            Description: item.description,
            AssignedDate: item.assignedDate,
            SubmissionDate: item.submissionDate,
            AttachmentURL: item.attachmentURL,
            IsActive: isActive
          };
          this.isViewModalOpen = true;
        }

        if (mode === 'edit') {
          this.isViewMode = false;
          this.ViewSyllabusClicked = true; // Set edit mode
          
          const formatDate = (dateStr: any) => {
            if (!dateStr) return '';
            if (typeof dateStr === 'string') {
              if (dateStr.includes('T')) return dateStr.split('T')[0];
              if (dateStr.includes(' ')) return dateStr.split(' ')[0];
            }
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              const year = d.getFullYear();
              return `${year}-${month}-${day}`;
            }
            return dateStr;
          };

          this.HomeworkForm.patchValue({
            ID: item.id,
            School: item.schoolID,
            AcademicYear: item.academicYear,
            Class: item.class?.toString() || '0',
            Division: item.division?.toString() || '0',
            SubjectID: item.subjectID?.toString() || '0',
            TeacherID: item.teacherID?.toString() || '0',
            HomeworkTitle: item.homeworkTitle,
            Description: item.description,
            AssignedDate: formatDate(item.assignedDate),
            SubmissionDate: formatDate(item.submissionDate),
            AttachmentURL: item.attachmentURL,
            IsActive: item.isActive === "1" || item.isActive === 1 || item.isActive === true
          });
          this.AdminselectedSchoolID = item.schoolID?.toString() || '';
          this.AdminselectedAcademivYearID = item.academicYear?.toString() || '';
          this.AdminselectedClassID = item.class?.toString() || '0';
          this.AdminselectedDivisionID = item.division?.toString() || '0';
          this.AdminselectedSubjectID = item.subjectID?.toString() || '0';
          this.IsActiveStatus = isActive;
          this.IsAddNewClicked = true;
          
          // Load dependent data for edit mode
          this.FetchAcademicYearsList();
          this.FetchClassList();
          this.FetchDivisionsList();
          this.FetchSubjectsList();
        }
      },
      error => {
        console.error(error);
      }
    );
  }

  // ── Pagination Methods ───────────────────────────────────────────────────────
  totalPages(): number {
    return this.totalPagesCount;
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
    this.FetchInitialData();
  }

  // ── Search Methods ───────────────────────────────────────────────────────────────
  onSearchChange(): void {
    this.currentPage = 1;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.FetchInitialData();
    }, this.SEARCH_DEBOUNCE);
  }

  // ── Modal Methods ───────────────────────────────────────────────────────────────
  closeModal(type: 'view' | 'status'): void {
    if (type === 'view') {
      this.isViewModalOpen = false;
    } else {
      this.isModalOpen = false;
    }
  }

  handleOk(): void {
    this.isModalOpen = false;
  }

  // ── Action Methods ───────────────────────────────────────────────────────────────
  editReview(homeworkID: string): void {
    this.FetchHomeworkDetByID(homeworkID, 'edit');
  }

  viewReview(homeworkID: string): void {
    this.FetchHomeworkDetByID(homeworkID, 'view');
    this.isViewModalOpen = true;
  }

  toggleChange() {
    this.IsActiveStatus = !this.IsActiveStatus;
  }

  // ── Event Handlers ───────────────────────────────────────────────────────────────
  onAdminSchoolChange(event: Event) {
    this.academicYearList = [];
    this.classList = [];
    this.divisionList = [];
    this.subjectList = [];
    this.HomeworkForm.get('AcademicYear')?.patchValue('0');
    this.HomeworkForm.get('Class')?.patchValue('0');
    this.HomeworkForm.get('Division')?.patchValue('0');
    this.HomeworkForm.get('SubjectID')?.patchValue('0');
    
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if (schoolID == "0") {
      this.AdminselectedSchoolID = "";
    } else {
      this.AdminselectedSchoolID = schoolID;
    }
    this.FetchAcademicYearsList();
  }

  onSchoolChange(event: Event) {
    const schoolID = (event.target as HTMLSelectElement).value;
    this.selectedSchoolID = schoolID;
    this.AdminselectedSchoolID = schoolID;
    this.SchoolSelectionChange = true;
    this.currentPage = 1;
    
    // For admin, fetch academic years when school changes
    if (this.isAdmin && schoolID) {
      this.FetchAcademicYearsList();
    }
    
    this.FetchInitialData();
  }

  onAcademicYearChange(event: Event) {
    this.classList = [];
    this.divisionList = [];
    this.subjectList = [];
    this.teacherAssignedClassID = '';
    this.teacherAssignedDivisionID = '';
    this.HomeworkForm.get('Class')?.patchValue('0');
    this.HomeworkForm.get('Division')?.patchValue('0');
    this.HomeworkForm.get('SubjectID')?.patchValue('0');
    
    const target = event.target as HTMLSelectElement;
    const academicYearID = target.value;
    if (academicYearID == "0") {
      this.AdminselectedAcademivYearID = "";
    } else {
      this.AdminselectedAcademivYearID = academicYearID;
    }
    
    if (this.isTeacher) {
      // For teachers, sync allocation instead of fetching all classes
      console.log('[ASSIGN HOMEWORK] Academic year changed - Triggering teacher allocation sync');
      this.syncTeacherClassDivisionFromAllocation(() => {
        // After teacher allocation is synced, fetch subjects (not homework list)
        console.log('[ASSIGN HOMEWORK] Academic year changed - Teacher allocation synced, fetching subjects');
        console.log('[ASSIGN HOMEWORK] Current values after sync:', {
          AdminselectedAcademivYearID: this.AdminselectedAcademivYearID,
          teacherAssignedClassID: this.teacherAssignedClassID,
          teacherAssignedDivisionID: this.teacherAssignedDivisionID
        });
        // Subjects are already fetched in the syncTeacherClassDivisionFromAllocation method
      });
    } else {
      // For admin/school admin, fetch all classes
      this.FetchClassList();
    }
  }

  onClassChange(event: Event) {
    this.divisionList = [];
    this.subjectList = [];
    this.HomeworkForm.get('Division')?.patchValue('0');
    this.HomeworkForm.get('SubjectID')?.patchValue('0');
    
    const target = event.target as HTMLSelectElement;
    const classID = target.value;
    if (classID == "0") {
      this.AdminselectedClassID = "";
    } else {
      this.AdminselectedClassID = classID;
    }
    this.FetchDivisionsList();
  }

  onDivisionChange(event: Event) {
    this.subjectList = [];
    this.HomeworkForm.get('SubjectID')?.patchValue('0');
    
    const target = event.target as HTMLSelectElement;
    const divisionID = target.value;
    if (divisionID == "0") {
      this.AdminselectedDivisionID = "";
    } else {
      this.AdminselectedDivisionID = divisionID;
    }
    this.FetchSubjectsList();
  }

  FetchDivisionsList() {
    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: this.AdminselectedAcademivYearID || '',
      Class: this.AdminselectedClassID || '',
      Flag: '3'
    };

    this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.divisionList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" || item.isActive === "True" ? "Active" : "InActive";
              return {
                ID: item.id?.toString() || item.ID?.toString(),
                Name: item.name || item.Name,
                IsActive: isActiveString
              };
            });
          } else {
            this.divisionList = [];
          }
        },
        (error) => {
          this.divisionList = [];
        }
      );
  }

  // ── Helper Methods ───────────────────────────────────────────────────────────────
  private getIntValue(value?: string): number | null {
    if (!value || value === '0' || value === '') {
      return null;
    }
    const numValue = parseInt(value, 10);
    return isNaN(numValue) ? null : numValue;
  }

  
  private getSubjectIdValue(value?: string): number | null {
    return this.getIntValue(value);
  }

  private resolveStaffIdentity(): void {
    const schoolId = this.resolvedSchoolId;
    const email = (this.ss('email') || this.ss('Email') || '').toString().trim().toLowerCase();

    if (!schoolId || !email) return;

    this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId
    }).subscribe({
      next: (res: any) => {
        const list = res?.data || [];
        const match = list.find((s: any) => (s.email || s.Email || '').toLowerCase() === email);
        if (match) {
          this.resolvedStaffId = String(match.id || match.ID);
          console.log('[ASSIGN HOMEWORK] Resolved Teacher StaffID:', this.resolvedStaffId);
          this.syncTeacherClassDivisionFromAllocation();
        }
      }
    });
  }

  // ── Submissions View Methods ────────────────────────────────────────────────
  viewSubmissions(homework: any): void {
    this.selectedHomeworkForSubmissions = homework;
    this.IsViewSubmissions = true;
    this.IsAddNewClicked = false;
    this.submissionsPage = 1;
    this.submissionsList = [];
    this.FetchSubmissions();
  }

  backToHomeworkList(): void {
    this.IsViewSubmissions = false;
    this.selectedHomeworkForSubmissions = null;
    this.submissionsList = [];
  }

  FetchSubmissions(): void {
    if (!this.selectedHomeworkForSubmissions) return;
    this.loader.show();

    const hw = this.selectedHomeworkForSubmissions;

    const countPayload = {
      Flag: '6',
      SchoolID: hw.schoolID,
      AcademicYear: hw.academicYear,
      Class: hw.class ? parseInt(hw.class) : null,
      Division: hw.division ? parseInt(hw.division) : null
    };

    this.apiurl.post<any>('Tbl_HomeworkSubmission_CRUD_Operations', countPayload).subscribe({
      next: (countRes: any) => {
        const c = countRes?.data?.[0];
        this.submissionsCount = c?.totalcount || c?.totalCount || 0;
        this.submissionsTotalPages = Math.ceil(this.submissionsCount / this.submissionsPageSize);

        const dataPayload = {
          Flag: '2',
          SchoolID: hw.schoolID,
          AcademicYear: hw.academicYear,
          HomeworkID: Number(hw.id),
          Class: hw.class ? parseInt(hw.class) : null,
          Division: hw.division ? parseInt(hw.division) : null,
          Limit: 200,
          Offset: 0
        };

        this.apiurl.post<any>('Tbl_HomeworkSubmission_CRUD_Operations', dataPayload).subscribe({
          next: (res: any) => {
            this.submissionsList = (res?.data || []).map((s: any) => {
              // Convert UTC date to local timezone
              const dateStr = s.submissionDate;
              const localDate = dateStr ? new Date(dateStr + 'Z') : undefined;
              return {
                id: s.id,
                homeworkID: s.homeworkID,
                studentAdmissionNo: s.studentAdmissionNo,
                studentName: s.studentName,
                submissionText: s.submissionText,
                attachmentURL: s.attachmentURL,
                submissionDate: localDate && !isNaN(localDate.getTime()) ? localDate : (dateStr ? new Date(dateStr) : undefined),
                submissionStatus: s.submissionStatus,
                marksObtained: s.marksObtained,
                remarks: s.remarks,
                isActive: s.isActive
              };
            });
            this.loader.hide();
          },
          error: () => { this.submissionsList = []; this.loader.hide(); }
        });
      },
      error: () => { this.submissionsCount = 0; this.loader.hide(); }
    });
  }

  submissionsGoToPage(page: number): void {
    if (page < 1 || page > this.submissionsTotalPages) return;
    this.submissionsPage = page;
    this.FetchSubmissions();
  }

  openEvaluateModal(submission: any): void {
    this.selectedSubmissionForEval = submission;
    this.EvaluateForm.reset({
      ID: submission.id,
      Remarks: submission.remarks || '',
      SubmissionStatus: submission.submissionStatus || 'Reviewed'
    });
    this.isEvaluateModalOpen = true;
  }

  closeEvaluateModal(): void {
    this.isEvaluateModalOpen = false;
    this.selectedSubmissionForEval = null;
    this.EvaluateForm.reset();
  }

  openSubmissionViewModal(submission: any): void {
    this.selectedSubmissionView = submission;
    this.isSubmissionViewModalOpen = true;
  }

  closeSubmissionViewModal(): void {
    this.isSubmissionViewModalOpen = false;
    this.selectedSubmissionView = null;
  }

  SubmitEvaluation(): void {
    if (this.EvaluateForm.invalid) {
      this.EvaluateForm.markAllAsTouched();
      return;
    }

    const payload = {
      Flag: '5',
      ID: String(this.EvaluateForm.get('ID')?.value),
      Remarks: this.EvaluateForm.get('Remarks')?.value || '',
      SubmissionStatus: this.EvaluateForm.get('SubmissionStatus')?.value,
      IsActive: '1',
      ModifiedBy: this.ActiveUserId,
      ModifiedIp: ''
    };

    this.apiurl.post<any>('Tbl_HomeworkSubmission_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        if (response?.statusCode === 200) {
          this.AminityInsStatus = 'Evaluation saved successfully!';
          this.closeEvaluateModal();
          this.FetchSubmissions();
        } else {
          this.AminityInsStatus = response?.message || 'Error saving evaluation.';
        }
        this.isModalOpen = true;
      },
      error: (err: any) => {
        this.AminityInsStatus = err?.error?.message || 'Error saving evaluation.';
        this.isModalOpen = true;
      }
    });
  }
}
