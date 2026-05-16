import { DatePipe, NgClass, NgFor, NgIf, NgStyle, DecimalPipe } from '@angular/common';
import { Component, ChangeDetectorRef } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { LoaderService } from '../../../Services/loader.service';
import { HttpClient } from '@angular/common/http';
import { RoleDetectionService } from '../../../Services/role-detection.service';
import { SlicePipe } from '../../../pipes/slice.pipe';
import { HomeworkSubmissionService, HomeworkSubmission } from '../../../Services/homework-submission.service';
import { FileService } from '../../../Services/file.service';
@Component({
  selector: 'app-homework',
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule, DatePipe, SlicePipe, DecimalPipe],
  templateUrl: './homework.component.html',
  styleUrl: './homework.component.css'
})
export class HomeworkComponent extends BasePermissionComponent {
  pageName = 'HomeWork';

  constructor(
    private http: HttpClient,
    router: Router,
    public loader: LoaderService,
    private apiurl: ApiServiceService,
    menuService: MenuServiceService,
    private roleDetectionService: RoleDetectionService,
    private homeworkSubmissionService: HomeworkSubmissionService,
    private cdr: ChangeDetectorRef,
    private fileService: FileService
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
  
  // Teacher-specific properties (from assign-homework component)
  teacherAssignedClassID: string = '';
  teacherAssignedDivisionID: string = '';
  
  homeworkList: any[] = [];
  totalCount: number = 0;
  totalPagesCount: number = 0;

  // ── Homework Submission Properties ───────────────────────────────────────
  homeworkSubmissions: HomeworkSubmission[] = [];
  submissionTotalCount: number = 0;
  submissionTotalPages: number = 0;
  isSubmissionModalOpen: boolean = false;
  selectedSubmission: HomeworkSubmission | null = null;
  selectedHomework: any = null;
  selectedFile: File | null = null;
  isSubmitting: boolean = false;

  // ── File Upload Properties ───────────────────────────────────────────────
  filePreviewUrl: string | null = null;
  filePreviewType: 'image' | 'document' | null = null;
  uploadedFileName: string = '';
  uploadedFileUrl: string = '';
  isPreviewVisible: boolean = false;
  submissionForm: FormGroup = new FormGroup({
    ID: new FormControl(''),
    HomeworkID: new FormControl('', [Validators.required]),
    StudentAdmissionNo: new FormControl('', [Validators.required]),
    SubmissionText: new FormControl(''),
    AttachmentURL: new FormControl(''),
    SubmissionStatus: new FormControl('Submitted'),
    MarksObtained: new FormControl(''),
    Remarks: new FormControl(''),
    IsActive: new FormControl(true)
  });
  
  // Parent submission tracking
  submissionStatusMap: Map<number, any> = new Map();
  
  // Submission mode for parent modal
  submissionMode: 'submit' | 'edit' = 'submit';


  // ── session helpers ──────────────────────────────────────────────────
  private ss(key: string) { return sessionStorage.getItem(key) || localStorage.getItem(key) || ''; }
  
  // Dynamic Role Getters based on Names
  get currentRoleName(): string { return (this.ss('roleName') || this.ss('RoleName') || this.ss('rollName') || this.ss('RollName') || '').trim(); }
  get currentRollID(): string { return (this.ss('RollID') || this.ss('rollID') || this.ss('menuRoleId') || this.ss('RoleID') || '').trim(); }

  get isParent(): boolean {
    const r = this.currentRoleName.toLowerCase();
    return this.currentRollID === '6' || r.includes('parent');
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

  // ── Role-Based UI Properties ───────────────────────────────────────────────────────
  currentRoleUI: 'teacher' | 'admin' | 'school_admin' | 'student' | 'parent' = 'student';
  currentRoleInfo: any = null;
  isRoleInitialized: boolean = false;

  // ── Parent-Specific Properties ───────────────────────────────────────────────────────
  parentChildren: Array<{ ID: string; AdmissionNo: string; Name: string; Class: string; Division: string; SchoolID: string }> = [];
  selectedChildId: string = '';
  selectedChildIndex: number = 0;
  teacherStudentList: any[] = [];

  // ── School Admin Specific Properties ─────────────────────────────────────────────────
  schoolAdminStudentList: any[] = [];
  selectedSchoolAdminStudentId: string = '';

  // ── Lifecycle Methods ───────────────────────────────────────────────────────
  ngOnInit(): void {
    console.log('[HOMEWORK] ngOnInit - Initializing role-based UI');
    
    this.checkViewPermission();
    this.SchoolSelectionChange = false;
    
    // Initialize role detection
    this.initializeRoleBasedUI();
  }

  // Initialize role-based UI - Dynamic synchronous detection
  initializeRoleBasedUI(): void {
    console.log('[HOMEWORK] Initializing dynamic role-based UI');
    
    // Dynamic role detection based on session data
    this.currentRoleUI = this.getDynamicRoleUIType();
    this.currentRoleInfo = {
      roleId: this.currentRollID,
      roleName: this.currentRoleName,
      userId: this.currentUserId,
      schoolId: this.resolvedSchoolId
    };
    this.isRoleInitialized = true;
    
    console.log('[HOMEWORK] Dynamic role-based UI initialized:', {
      currentRoleInfo: this.currentRoleInfo,
      currentRoleUI: this.currentRoleUI,
      isParent: this.isParent
    });

    // Initialize data based on role
    this.initializeDataBasedOnRole();
  }

  // Dynamic role detection without async dependency
  private getDynamicRoleUIType(): 'teacher' | 'admin' | 'school_admin' | 'student' | 'parent' {
    const roleId = this.currentRollID;
    const roleName = this.currentRoleName.toLowerCase();

    // Role mapping: 1: Super Admin, 2: School Admin, 8: Principal -> admin UI
    // 3: Teaching Staff -> teacher UI  
    // 5: Student -> student UI
    // 6: Parent -> parent UI
    // 4: Driver, 7: Maid -> student UI (or limited UI)

    if (roleId === '1' || roleName.includes('super')) {
      return 'admin';
    }
    
    if (roleId === '2' || roleId === '8' || 
        roleName.includes('admin') || roleName.includes('principal') || roleName.includes('management')) {
      return 'school_admin';
    }
    
    if (roleId === '3' || roleName.includes('teaching') || roleName.includes('teacher')) {
      return 'teacher';
    }
    
    if (roleId === '6' || roleName.includes('parent')) {
      return 'parent';
    }
    
    // Default to student UI for other roles
    return 'student';
  }

  // Initialize data based on user role - Dynamic synchronous
  initializeDataBasedOnRole(): void {
    console.log('[HOMEWORK] Initializing data for role:', this.currentRoleUI);
    
    if (this.currentRoleUI === 'teacher') {
      this.selectedSchoolID = this.resolvedSchoolId || this.schoolId;
      this.AdminselectedSchoolID = this.resolvedSchoolId || this.schoolId;
      // Resolve staff identity first, which will trigger allocation sync and subject fetch
      this.resolveStaffIdentity();
      this.FetchAcademicYearsList();
    } else if (this.currentRoleUI === 'school_admin') {
      this.selectedSchoolID = this.resolvedSchoolId || this.schoolId;
      this.AdminselectedSchoolID = this.resolvedSchoolId || this.schoolId;
      this.FetchAcademicYearsList();
    } else if (this.currentRoleUI === 'admin') {
      // Super Admin - fetch all schools first, then behave like school admin
      this.FetchSchoolsList();
      this.selectedSchoolID = this.resolvedSchoolId || this.schoolId;
      this.AdminselectedSchoolID = this.resolvedSchoolId || this.schoolId;
      this.FetchAcademicYearsList();
    } else if (this.currentRoleUI === 'parent') {
      // Parent-specific initialization - only fetch academic years, no homework data yet
      this.selectedSchoolID = this.resolvedSchoolId || this.schoolId;
      this.FetchAcademicYearsList();
      // Children will be fetched after academic year is selected
      // Do NOT fetch homework data automatically
    } else {
      // Student and other roles
      this.FetchSchoolsList();
      this.FetchAcademicYearsList();
    }
    
    // Only fetch initial data for non-parent, non-teacher, and non-school_admin roles
    // These roles need to select filters first
    if (this.currentRoleUI !== 'parent' && this.currentRoleUI !== 'teacher' && this.currentRoleUI !== 'school_admin') {
      this.FetchInitialData();
    }
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



  // ── Data Fetching Methods ─────────────────────────────────────────────────────
  FetchInitialData(extra: any = {}, forceFresh: boolean = false) {
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
            const data = response?.data || [];
            
            
            this.mapHomeworkData(response);

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
      Class: this.getIntValue(this.AdminselectedClassID) || null,
      Division: this.getIntValue(this.AdminselectedDivisionID) || null,
      SubjectID: this.getSubjectIdValue(this.AdminselectedSubjectID),
      HomeworkTitle: isSearch ? this.searchQuery.trim() : null
    };

    console.log('Count Payload:', countPayload);

    return this.apiurl.post<any>('Tbl_Homework_CRUD_Operations', countPayload);
  }

  mapHomeworkData(response: any) {
    this.homeworkList = (response.data || []).map((item: any) => ({
      id: parseInt(item.id), // Convert to number for consistent matching with submissions
      schoolID: item.schoolID,
      academicYear: item.academicYear,
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
      createdDate: item.createdDate
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
    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: this.AdminselectedAcademivYearID || '',
      Class: this.AdminselectedClassID || '',
      Flag: '3'
    };

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
    this.isLoading = true;
    this.loader.show();

    const isSearching = this.searchQuery.trim().length > 0;
    
    // Determine flags based on user role
    let dataFlag: string;
    let countFlag: string;
    let payload: any;

if (this.currentRoleUI === 'admin') {
      dataFlag = isSearching ? '7' : '2';
      countFlag = isSearching ? '8' : '6';
      
      payload = {
        Flag: dataFlag,
        SchoolID: this.AdminselectedSchoolID || '',
        AcademicYear: this.AdminselectedAcademivYearID || '',
        Class: this.getIntValue(this.AdminselectedClassID),
        Division: this.getIntValue(this.AdminselectedDivisionID),
        SubjectID: this.getSubjectIdValue(this.AdminselectedSubjectID),
        Limit: this.pageSize,
        Offset: (this.currentPage - 1) * this.pageSize,
        SortColumn: 'CreatedDate',
        SortDirection: 'DESC'
      };
    } else if (this.currentRoleUI === 'school_admin') {
      // School Admin - Similar to parent but can see all students in the school
      dataFlag = isSearching ? '7' : '2';
      countFlag = isSearching ? '8' : '6';
      
      payload = {
        Flag: dataFlag,
        SchoolID: this.AdminselectedSchoolID || '',
        AcademicYear: this.AdminselectedAcademivYearID || '',
        Class: this.getIntValue(this.AdminselectedClassID),
        Division: this.getIntValue(this.AdminselectedDivisionID),
        SubjectID: this.getSubjectIdValue(this.AdminselectedSubjectID),
        // Add student filter if a specific student is selected
        StudentAdmissionNo: this.selectedSchoolAdminStudentId || null,
        Limit: this.pageSize,
        Offset: (this.currentPage - 1) * this.pageSize,
        SortColumn: 'CreatedDate',
        SortDirection: 'DESC'
      };
      
      console.log(`[HOMEWORK] School Admin FetchHomeworkList payload:`, payload);
      console.log(`[HOMEWORK] School Admin FetchHomeworkList - selectedStudent:`, this.selectedSchoolAdminStudentId);
    } else if (this.currentRoleUI === 'teacher' || this.currentRoleUI === 'parent') {
      // Teacher/Parent - Fetch homework for selected child/student's class and division (FLAG 2)
      dataFlag = isSearching ? '7' : '2';
      countFlag = isSearching ? '8' : '6';
      
      payload = {
        Flag: dataFlag,
        SchoolID: this.selectedSchoolID || this.schoolId,
        AcademicYear: this.AdminselectedAcademivYearID || '',
        Class: this.getIntValue(this.AdminselectedClassID),
        Division: this.getIntValue(this.AdminselectedDivisionID),
        SubjectID: this.getSubjectIdValue(this.AdminselectedSubjectID),
        Limit: this.pageSize,
        Offset: (this.currentPage - 1) * this.pageSize,
        SortColumn: 'CreatedDate',
        SortDirection: 'DESC'
      };
      
      console.log(`[HOMEWORK] ${this.currentRoleUI} FetchHomeworkList payload:`, payload);
      console.log(`[HOMEWORK] ${this.currentRoleUI} FetchHomeworkList - AdminselectedSubjectID:`, this.AdminselectedSubjectID);
      console.log(`[HOMEWORK] ${this.currentRoleUI} FetchHomeworkList - SubjectID value:`, payload.SubjectID);
    } else if (this.currentRoleUI === 'student') {
      // Student - Fetch homework assigned to them (FLAG 4)
      dataFlag = isSearching ? '7' : '4';
      countFlag = isSearching ? '8' : '6';
      
      payload = {
        Flag: dataFlag,
        StudentAdmissionNo: this.currentUserId,
        SchoolID: this.selectedSchoolID || this.schoolId,
        AcademicYear: this.AdminselectedAcademivYearID || '',
        Class: this.getIntValue(this.AdminselectedClassID),
        Division: this.getIntValue(this.AdminselectedDivisionID),
        Limit: this.pageSize,
        Offset: (this.currentPage - 1) * this.pageSize,
        SortColumn: 'CreatedDate',
        SortDirection: 'DESC'
      };
    } else {
      // Default fallback
      dataFlag = isSearching ? '7' : '2';
      countFlag = isSearching ? '8' : '6';
      
      payload = {
        Flag: dataFlag,
        SchoolID: this.AdminselectedSchoolID || '',
        AcademicYear: this.AdminselectedAcademivYearID || '',
        Class: this.getIntValue(this.AdminselectedClassID),
        Division: this.getIntValue(this.AdminselectedDivisionID),
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
        // Handle both uppercase and lowercase totalCount fields
        this.totalCount = countRes?.data?.[0]?.totalCount || countRes?.data?.[0]?.totalcount || 0;
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
    this.FetchHomeworkList();
  }

  // ── Search Methods ───────────────────────────────────────────────────────────────
  onSearchChange(): void {
    this.currentPage = 1;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.FetchHomeworkList();
    }, this.SEARCH_DEBOUNCE);
  }

  // ── Modal Methods ───────────────────────────────────────────────────────
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

  // Check if existing attachment is image
  isExistingAttachmentImage(): boolean {
    const url = this.selectedSubmission?.AttachmentURL;
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.png') || lowerUrl.endsWith('.gif') || lowerUrl.endsWith('.webp');
  }

  // Check if existing attachment is PDF
  isExistingAttachmentPdf(): boolean {
    const url = this.selectedSubmission?.AttachmentURL;
    if (!url) return false;
    return url.toLowerCase().endsWith('.pdf');
  }

  // Get icon for existing attachment
  getExistingAttachmentIcon(): string {
    const url = this.selectedSubmission?.AttachmentURL;
    if (!url) return 'insert_drive_file';
    if (this.isExistingAttachmentPdf()) return 'picture_as_pdf';
    if (url.toLowerCase().includes('.doc')) return 'description';
    if (url.toLowerCase().endsWith('.txt')) return 'text_snippet';
    return 'insert_drive_file';
  }

  // Get file name from URL
  getAttachmentFileName(): string {
    const url = this.selectedSubmission?.AttachmentURL;
    if (!url) return 'Attachment';
    return url.split('/').pop() || 'Attachment';
  }

  // Get full URL for submission attachment
  getSubmissionAttachmentUrl(): string {
    const url = this.selectedSubmission?.AttachmentURL || '';
    return this.fileService.getFullFileUrl(url);
  }

  // Check if homework attachment is image
  isHomeworkAttachmentImage(): boolean {
    const url = this.selectedHomework?.attachmentURL;
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.png') || lowerUrl.endsWith('.gif') || lowerUrl.endsWith('.webp');
  }

  // Check if homework attachment is PDF
  isHomeworkAttachmentPdf(): boolean {
    const url = this.selectedHomework?.attachmentURL;
    if (!url) return false;
    return url.toLowerCase().endsWith('.pdf');
  }

  // Get icon for homework attachment
  getHomeworkAttachmentIcon(): string {
    const url = this.selectedHomework?.attachmentURL;
    if (!url) return 'insert_drive_file';
    if (this.isHomeworkAttachmentPdf()) return 'picture_as_pdf';
    if (url.toLowerCase().includes('.doc')) return 'description';
    if (url.toLowerCase().endsWith('.txt')) return 'text_snippet';
    return 'insert_drive_file';
  }

  // Get homework attachment file name
  getHomeworkAttachmentFileName(): string {
    const url = this.selectedHomework?.attachmentURL;
    if (!url) return 'Attachment';
    return url.split('/').pop() || 'Attachment';
  }

  // Get full URL for homework attachment (handles relative paths)
  getHomeworkAttachmentUrl(): string {
    const url = this.selectedHomework?.attachmentURL;
    return this.fileService.getFullFileUrl(url);
  }

  // Download homework attachment
  downloadHomeworkAttachment(): void {
    const url = this.selectedHomework?.attachmentURL;
    if (url) {
      this.fileService.downloadFile(url, this.getHomeworkAttachmentFileName());
    }
  }

  // Download submission attachment
  downloadSubmissionAttachment(): void {
    const url = this.selectedSubmission?.AttachmentURL;
    if (url) {
      this.fileService.downloadFile(url, this.getAttachmentFileName());
    }
  }

  // ── Existing Submission Attachment Helpers (for Edit Modal) ──────────────────

  // Check if existing submission attachment (in form) is image
  isExistingSubmissionAttachmentImage(): boolean {
    const url = this.submissionForm.get('AttachmentURL')?.value;
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.png') || lowerUrl.endsWith('.gif') || lowerUrl.endsWith('.webp');
  }

  // Check if existing submission attachment (in form) is PDF
  isExistingSubmissionAttachmentPdf(): boolean {
    const url = this.submissionForm.get('AttachmentURL')?.value;
    if (!url) return false;
    return url.toLowerCase().endsWith('.pdf');
  }

  // Get icon for existing submission attachment (in form)
  getExistingSubmissionAttachmentIcon(): string {
    const url = this.submissionForm.get('AttachmentURL')?.value;
    if (!url) return 'insert_drive_file';
    if (this.isExistingSubmissionAttachmentPdf()) return 'picture_as_pdf';
    if (url.toLowerCase().includes('.doc')) return 'description';
    if (url.toLowerCase().endsWith('.txt')) return 'text_snippet';
    return 'insert_drive_file';
  }

  // Get file name from URL (existing submission attachment in form)
  getExistingSubmissionAttachmentFileName(): string {
    const url = this.submissionForm.get('AttachmentURL')?.value;
    if (!url) return 'Attachment';
    return url.split('/').pop() || 'Attachment';
  }

  // Get full URL for existing submission attachment (in form)
  getExistingSubmissionAttachmentUrl(): string {
    const url = this.submissionForm.get('AttachmentURL')?.value || '';
    return this.fileService.getFullFileUrl(url);
  }

  // Download existing submission attachment (from form)
  downloadExistingSubmissionAttachment(): void {
    const url = this.submissionForm.get('AttachmentURL')?.value;
    if (url) {
      this.fileService.downloadFile(url, this.getExistingSubmissionAttachmentFileName());
    }
  }

  // Remove existing submission attachment (delete from server and update database)
  removeExistingSubmissionAttachment(): void {
    const url = this.submissionForm.get('AttachmentURL')?.value;
    if (url) {
      const submissionId = this.submissionForm.get('ID')?.value || 'temp';
      const schoolId = this.selectedSchoolID || this.AdminselectedSchoolID || '';
      
      // Extract filename from URL
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      if (fileName && schoolId && submissionId && submissionId !== 'temp') {
        const deletePayload = {
          SchoolId: schoolId,
          SubmissionId: submissionId,
          FileName: fileName,
          ModifiedBy: this.ActiveUserId,
          ModifiedIp: ''
        };

        this.fileService.deleteHomeworkSubmissionFile(deletePayload).subscribe({
          next: (res) => {
            console.log('[HOMEWORK] Attachment deleted successfully:', res);
            // Clear from form
            this.submissionForm.patchValue({ AttachmentURL: '' });
            this.AminityInsStatus = 'Attachment removed successfully.';
            this.isModalOpen = true;
            
            // Refresh the submission data to reflect the change
            this.refreshSubmissionData();
          },
          error: (err) => {
            console.error('[HOMEWORK] Failed to delete attachment:', err);
            // Still clear from form even if server deletion failed
            this.submissionForm.patchValue({ AttachmentURL: '' });
            this.AminityInsStatus = 'Attachment removed from form. Server deletion may have failed.';
            this.isModalOpen = true;
          }
        });
      } else {
        // Just clear from form if no valid filename or temp submission
        this.submissionForm.patchValue({ AttachmentURL: '' });
        this.AminityInsStatus = 'Attachment removed. Submit to save changes.';
        this.isModalOpen = true;
      }
    }
  }

  // Refresh submission data after attachment removal
  private refreshSubmissionData(): void {
    const homeworkId = this.submissionForm.get('HomeworkID')?.value;
    const studentAdmissionNo = this.selectedChildId;
    
    if (homeworkId && studentAdmissionNo) {
      // Re-fetch the submission data to update the UI
      this.fetchHomeworkSubmissions();
    }
  }

  closeSubmissionModal(): void {
    this.isSubmissionModalOpen = false;
    this.submissionForm.reset();
  }

  openSubmissionModal(homeworkId?: number): void {
    if (homeworkId) {
      this.submissionForm.patchValue({ HomeworkID: homeworkId });
    }
    this.isSubmissionModalOpen = true;
  }

  submitHomework(): void {
    if (this.submissionForm.invalid) {
      this.submissionForm.markAllAsTouched();
      return;
    }

    const submissionData: HomeworkSubmission = {
      ...this.submissionForm.value,
      SchoolID: this.selectedSchoolID || this.schoolId,
      AcademicYear: this.AdminselectedAcademivYearID,
      Class: this.getIntValue(this.AdminselectedClassID),
      Division: this.getIntValue(this.AdminselectedDivisionID),
      CreatedBy: this.currentUserId,
      CreatedIp: ''
    };

    this.homeworkSubmissionService.submitHomework(submissionData).subscribe({
      next: (response: any) => {
        if (response.statusCode === 200) {
          this.AminityInsStatus = 'Homework submitted successfully!';
          this.submissionForm.reset();
          this.isSubmissionModalOpen = false;
          this.fetchHomeworkSubmissions();
        } else {
          this.AminityInsStatus = response.message || 'Error submitting homework';
        }
        this.isModalOpen = true;
      },
      error: (err: any) => {
        this.AminityInsStatus = 'Error submitting homework';
        this.isModalOpen = true;
      }
    });
  }

  fetchHomeworkSubmissions(): void {
    if (this.currentRoleUI === 'student' || this.currentRoleUI === 'parent') {
      // Students/parents fetch homework assigned to them
      const params: any = {
        StudentAdmissionNo: this.currentUserId, // Filter by student's admission number
        SchoolID: this.selectedSchoolID || this.schoolId,
        AcademicYear: this.AdminselectedAcademivYearID,
        Class: this.getIntValue(this.AdminselectedClassID) || undefined,
        Division: this.getIntValue(this.AdminselectedDivisionID) || undefined,
        Limit: this.pageSize,
        Offset: (this.currentPage - 1) * this.pageSize,
        SortColumn: this.sortColumn,
        SortDirection: this.sortDirection
      };

      this.homeworkSubmissionService.getAllSubmissions(params).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.homeworkSubmissions = response.data || [];
            this.submissionTotalCount = response.totalCount || 0;
            this.submissionTotalPages = Math.ceil(this.submissionTotalCount / this.pageSize);
          }
        },
        error: (err: any) => {
          console.error('Error fetching assigned homework:', err);
        }
      });
    } else if (this.currentRoleUI === 'teacher') {
      // Teachers fetch submissions for their assigned homework
      const params: any = {
        TeacherID: this.currentUserId,
        SchoolID: this.selectedSchoolID || this.schoolId,
        AcademicYear: this.AdminselectedAcademivYearID,
        Class: this.getIntValue(this.AdminselectedClassID) || undefined,
        Division: this.getIntValue(this.AdminselectedDivisionID) || undefined,
        Limit: this.pageSize,
        Offset: (this.currentPage - 1) * this.pageSize,
        SortColumn: this.sortColumn,
        SortDirection: this.sortDirection
      };

      this.homeworkSubmissionService.getAllSubmissions(params).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.homeworkSubmissions = response.data || [];
            this.submissionTotalCount = response.totalCount || 0;
            this.submissionTotalPages = Math.ceil(this.submissionTotalCount / this.pageSize);
          }
        },
        error: (err: any) => {
          console.error('Error fetching teacher submissions:', err);
        }
      });
    } else if (this.currentRoleUI === 'school_admin') {
      // School Admins fetch submissions for selected student (like parent/teacher)
      const params: any = {
        SchoolID: this.selectedSchoolID || this.schoolId,
        AcademicYear: this.AdminselectedAcademivYearID,
        Class: this.getIntValue(this.AdminselectedClassID) || undefined,
        Division: this.getIntValue(this.AdminselectedDivisionID) || undefined,
        // Filter by selected student if one is selected
        StudentAdmissionNo: this.selectedSchoolAdminStudentId || undefined,
        Limit: this.pageSize,
        Offset: (this.currentPage - 1) * this.pageSize,
        SortColumn: this.sortColumn,
        SortDirection: this.sortDirection
      };

      this.homeworkSubmissionService.getAllSubmissions(params).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.homeworkSubmissions = response.data || [];
            this.submissionTotalCount = response.totalCount || 0;
            this.submissionTotalPages = Math.ceil(this.submissionTotalCount / this.pageSize);
          }
        },
        error: (err: any) => {
          console.error('Error fetching school admin submissions:', err);
        }
      });
    } else {
      // Default submission fetching for other roles
      const params: any = {
        SchoolID: this.selectedSchoolID || this.schoolId,
        AcademicYear: this.AdminselectedAcademivYearID,
        Class: this.getIntValue(this.AdminselectedClassID) || undefined,
        Division: this.getIntValue(this.AdminselectedDivisionID) || undefined,
        Limit: this.pageSize,
        Offset: (this.currentPage - 1) * this.pageSize,
        SortColumn: this.sortColumn,
        SortDirection: this.sortDirection
      };

      this.homeworkSubmissionService.getAllSubmissions(params).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.homeworkSubmissions = response.data || [];
            this.submissionTotalCount = response.totalCount || 0;
            this.submissionTotalPages = Math.ceil(this.submissionTotalCount / this.pageSize);
          }
        },
        error: (err: any) => {
          console.error('Error fetching submissions:', err);
        }
      });
    }
  }



  // ── Event Handlers ───────────────────────────────────────────────────────────────

  onSchoolChange(event: Event) {
    this.selectedSchoolID = (event.target as HTMLSelectElement).value;
    this.SchoolSelectionChange = true;
    this.currentPage = 1;
    this.FetchInitialData();
  }


  onSubjectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const subjectID = target.value;
    
    console.log('[HOMEWORK] Subject change - subjectID:', subjectID);
    console.log('[HOMEWORK] Subject change - currentRoleUI:', this.currentRoleUI);
    console.log('[HOMEWORK] Subject change - AdminselectedSubjectID before:', this.AdminselectedSubjectID);
    
    if (subjectID == "0") {
      this.AdminselectedSubjectID = "";
    } else {
      this.AdminselectedSubjectID = subjectID;
    }
    
    console.log('[HOMEWORK] Subject change - AdminselectedSubjectID after:', this.AdminselectedSubjectID);
    console.log('[HOMEWORK] Subject change - getSubjectIdValue result:', this.getSubjectIdValue(this.AdminselectedSubjectID));
    
    // For parent, teacher, school_admin, and admin view, refetch homework list when subject changes
    if (this.currentRoleUI === 'parent' || this.currentRoleUI === 'teacher' || this.currentRoleUI === 'school_admin' || this.currentRoleUI === 'admin') {
      console.log('[HOMEWORK] Subject change - triggering FetchHomeworkList for:', this.currentRoleUI);
      this.currentPage = 1;
      this.FetchHomeworkList();
      
      // Also reload submissions if a student is selected
      if (this.selectedChildId || this.selectedSchoolAdminStudentId) {
        this.loadChildSubmissions();
      }
    }
  }

  // ── Parent-Specific Methods ───────────────────────────────────────────────────────
  fetchParentChildren(): void {
    const parentEmail = (this.ss('email') || '').toString().trim();
    if (!parentEmail) {
      console.warn('[HOMEWORK] Parent email not found in session');
      return;
    }

    const payload = {
      Flag: '9',
      FatherEmail: parentEmail,
      MotherEmail: parentEmail,
      AcademicYear: this.AdminselectedAcademivYearID || ''
    };

    console.log('[HOMEWORK] Fetching parent children:', payload);

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
            ID:           String(admissionId),
            AdmissionNo:  String(admissionId),
            Name:         `${admissionId} - ${studentName}`.trim(),
            Class:        String(classId),
            Division:     String(divisionId),
            SchoolID:     String(schoolId)
          };
        }).filter(c => c.ID && c.AdmissionNo);

        console.log('[HOMEWORK] Parent children mapped:', this.parentChildren);

        // Don't auto-select - let parent choose manually
        this.selectedChildId = '';
        this.AdminselectedClassID = '';
        this.AdminselectedDivisionID = '';
        

        // Auto-select first child if available
        if (this.parentChildren.length > 0) {
          this.selectChild(0);
        }
      },
      error: (err) => {
        console.error('[HOMEWORK] Error fetching parent children:', err);
        this.parentChildren = [];
      }
    });
  }

  selectChild(index: number): void {
    this.selectedChildIndex = index;
    const child = this.parentChildren[index];
    if (!child) return;
    
    this.selectedChildId = child.ID;
    this.AdminselectedClassID = child.Class;
    this.AdminselectedDivisionID = child.Division;
    
    console.log('[HOMEWORK] Child selected:', child);


    // Clear submission status map when child changes
    this.submissionStatusMap.clear();

    // Fetch homework for selected child
    this.currentPage = 1;
    
    // Optimize: Run API calls in parallel for better performance
    this.loader.show();
    
    // Fetch subjects and homework in parallel
    const subjectsCall = this.FetchSubjectsList();
    const homeworkCall = this.FetchHomeworkList();
    const submissionsCall = this.loadChildSubmissions();
    
    // All calls will run in parallel
    console.log('[HOMEWORK] Child selection - fetching data in parallel');
    
    // Hide loader when all calls complete (handled by individual methods)
  }

  onChildChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const childId = target.value;
    this.selectedChildId = childId || '';
    
    const selectedChild = this.parentChildren.find(c => c.ID === childId);
    if (selectedChild) {
      this.AdminselectedClassID = selectedChild.Class;
      this.AdminselectedDivisionID = selectedChild.Division;
      
      
      // Fetch homework for selected child
      this.currentPage = 1;
      this.FetchHomeworkList();
    } else {
      // Reset if no child selected
      this.AdminselectedClassID = '';
      this.AdminselectedDivisionID = '';
      
      
      this.homeworkList = [];
      this.totalCount = 0;
    }
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

    // Fetch the staff list for the school to find the matching StaffID
    this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId
    }).subscribe({
      next: (res: any) => {
        const list = res?.data || [];
        const match = list.find((s: any) => (s.email || s.Email || '').toLowerCase() === email);
        if (match) {
          this.resolvedStaffId = String(match.id || match.ID);
          console.log('[HOMEWORK] Resolved Teacher StaffID:', this.resolvedStaffId);
          // Sync teacher allocation after resolving staff identity
          this.syncTeacherClassDivisionFromAllocation();
        }
      }
    });
  }

  // Teacher allocation sync (from assign-homework component)
  private syncTeacherClassDivisionFromAllocation(onDone?: () => void): void {
    // Only sync for teachers
    const roleId = this.currentRollID;
    const roleName = this.currentRoleName.toLowerCase();
    const isTeacher = roleId === '3' || roleName.includes('teaching') || roleName.includes('teacher');
    
    if (!isTeacher) {
      onDone?.();
      return;
    }

    if (!this.currentUserId) {
      console.log('[HOMEWORK] Cannot sync teacher allocation - missing user ID');
      onDone?.();
      return;
    }

    const requestData = {
      SchoolID: this.AdminselectedSchoolID || this.ss('SchoolID') || '',
      ClassTeacher: this.currentUserId, // Use teacher ID
      Flag: '9' // Fetch by School + ClassTeacher (no academic year needed)
    };

    console.log('[HOMEWORK] Calling teacher allocation API:', requestData);
    this.apiurl.post<any>('Tbl_AllotClassTeacher_CRUD_Operations', requestData).subscribe({
      next: (response: any) => {
        console.log('[HOMEWORK] Teacher allocation API response:', response);
        const allocation = response?.data?.[0];
        if (allocation) {
          const classId = allocation.classID || allocation.Class || allocation.class;
          const divisionId = allocation.divisionID || allocation.Division || allocation.division;
          const academicYearId = allocation.academicYear || allocation.AcademicYear;
          const className = allocation.className || allocation.ClassName || '';
          const divisionName = allocation.divisionName || allocation.DivisionName || '';

          // Note: Academic year is NOT auto-selected - teacher must manually select it
          // This ensures subjects are fetched for the correct academic year

          if (classId) {
            this.teacherAssignedClassID = classId;
            this.AdminselectedClassID = classId;
            this.classList = [{
              ID: classId,
              Name: className || `Class ${classId}`,
              Division: classId
            }];
            console.log('[HOMEWORK] Set teacher assigned class:', classId);
          }

          if (divisionId) {
            this.teacherAssignedDivisionID = divisionId;
            this.AdminselectedDivisionID = divisionId;
            this.divisionList = [{
              ID: divisionId,
              Name: divisionName || `Division ${divisionId}`
            }];
            console.log('[HOMEWORK] Set teacher assigned division:', divisionId);
          }

          console.log('[HOMEWORK] Teacher allocation synced:', {
            academicYearId,
            classId,
            divisionId,
            className,
            divisionName
          });

          // Only fetch subjects and homework if academic year is already selected
          // Otherwise, wait for teacher to manually select academic year
          if (this.AdminselectedAcademivYearID) {
            console.log('[HOMEWORK] Teacher allocation synced - Academic year selected, fetching subjects');
            this.FetchSubjectsList();
            
            // If this is automatic sync (not from academic year change), fetch homework data
            if (!onDone) {
              console.log('[HOMEWORK] Automatic teacher allocation complete - Fetching homework data');
              this.FetchHomeworkList();
            }
          } else {
            console.log('[HOMEWORK] Teacher allocation synced - Waiting for academic year selection');
          }
        }
        onDone?.();
      },
      error: (error) => {
        console.error('[HOMEWORK] Error syncing teacher allocation:', error);
        onDone?.();
      }
    });
  }

  // ── Parent Homework Submission Methods ───────────────────────────────────
  
  // Get submission status for homework
  getSubmissionStatus(homeworkId: number | string): string {
    const hwId = parseInt(String(homeworkId));
    const submission = this.submissionStatusMap.get(hwId);
    // Handle both camelCase (from API) and PascalCase
    const status = submission?.submissionStatus || submission?.SubmissionStatus;
    return status || 'Not Submitted';
  }

  // Get submission status class for styling
  getSubmissionStatusClass(homeworkId: number): string {
    const status = this.getSubmissionStatus(homeworkId);
    switch (status) {
      case 'Submitted': return 'bg-primary';
      case 'Reviewed': return 'bg-success';
      case 'Pending': return 'bg-warning';
      case 'Rejected': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  // Get submission date
  getSubmissionDate(homeworkId: number | string): Date | null {
    const hwId = parseInt(String(homeworkId));
    const submission = this.submissionStatusMap.get(hwId);
    const date = submission?.submissionDate || submission?.SubmissionDate;
    if (!date) return null;
    // Parse UTC date string and convert to local timezone
    const utcDate = new Date(date + 'Z'); // Append 'Z' to ensure UTC parsing
    return isNaN(utcDate.getTime()) ? new Date(date) : utcDate;
  }

  // Get marks obtained for homework
  getMarksObtained(homeworkId: number | string): string | null {
    const hwId = parseInt(String(homeworkId));
    const submission = this.submissionStatusMap.get(hwId);
    return submission?.marksObtained || submission?.MarksObtained || null;
  }

  
  // Open parent submission modal
  openParentSubmissionModal(homework: any, mode: 'submit' | 'edit' = 'submit'): void {
    this.selectedHomework = homework;
    this.submissionMode = mode;
    this.isSubmissionModalOpen = true;
    
    if (mode === 'submit') {
      // Reset form for new submission
      this.submissionForm.reset({
        ID: '',
        HomeworkID: homework.id,
        StudentAdmissionNo: this.selectedChildId,
        SubmissionText: '',
        AttachmentURL: '',
        SubmissionStatus: 'Submitted',
        IsActive: true
      });
      this.selectedFile = null;
    } else if (mode === 'edit') {
      // Load existing submission data for editing
      const hwId = parseInt(String(homework.id));
      const existingSubmission = this.submissionStatusMap.get(hwId);
      if (existingSubmission) {
        const attachmentUrl = existingSubmission.attachmentURL || existingSubmission.AttachmentURL || '';
        this.submissionForm.patchValue({
          ID: existingSubmission.id || existingSubmission.ID || '',
          HomeworkID: homework.id,
          StudentAdmissionNo: this.selectedChildId,
          SubmissionText: existingSubmission.submissionText || existingSubmission.SubmissionText || '',
          AttachmentURL: attachmentUrl,
          SubmissionStatus: existingSubmission.submissionStatus || existingSubmission.SubmissionStatus || 'Submitted',
          MarksObtained: existingSubmission.marksObtained || existingSubmission.MarksObtained || '',
          Remarks: existingSubmission.remarks || existingSubmission.Remarks || '',
          IsActive: existingSubmission.isActive !== false && existingSubmission.IsActive !== false
        });

        // Populate file preview for existing attachment
        if (attachmentUrl) {
          this.uploadedFileName = attachmentUrl.split('/').pop() || 'attachment';
          const lowerUrl = attachmentUrl.toLowerCase();
          if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.png') || lowerUrl.endsWith('.gif')) {
            this.filePreviewType = 'image';
            this.filePreviewUrl = this.fileService.getFullFileUrl(attachmentUrl);
          } else {
            this.filePreviewType = 'document';
            this.filePreviewUrl = null;
          }
        } else {
          this.clearParentSelectedFile();
        }

        this.selectedFile = null;
      }
    }
  }

  // Close parent submission modal
  closeParentSubmissionModal(): void {
    this.isSubmissionModalOpen = false;
    this.selectedHomework = null;
    this.selectedFile = null;
    this.submissionForm.reset();
  }

  // Handle parent file selection
  onParentFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB) - same as assign-homework
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.AminityInsStatus = 'File size exceeds 5MB limit.';
      this.isModalOpen = true;
      this.clearParentSelectedFile();
      return;
    }

    // Validate file type - same as assign-homework
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'text/plain'
    ];
    if (!allowedTypes.includes(file.type)) {
      this.AminityInsStatus = 'Invalid file type. Allowed: PDF, DOC, DOCX, JPG, JPEG, PNG, TXT';
      this.isModalOpen = true;
      this.clearParentSelectedFile();
      return;
    }

    this.selectedFile = file;
    this.uploadedFileName = file.name;
    console.log('[HOMEWORK] File selected:', file.name);

    // Generate preview
    this.generateFilePreview(file);
  }

  // Generate file preview
  generateFilePreview(file: File): void {
    const fileType = file.type;

    if (fileType.startsWith('image/')) {
      // For images, create data URL
      this.filePreviewType = 'image';
      const reader = new FileReader();
      reader.onload = (e) => {
        this.filePreviewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // For documents (PDF, DOC, TXT, etc.)
      this.filePreviewType = 'document';
      this.filePreviewUrl = null;
    }
  }

  // Check if file is image
  isImageFile(): boolean {
    return this.filePreviewType === 'image';
  }

  // Check if file is PDF
  isPdfFile(): boolean {
    return this.selectedFile?.type === 'application/pdf';
  }

  // Get file icon based on type
  getFileIcon(): string {
    if (!this.selectedFile) return 'insert_drive_file';

    const type = this.selectedFile.type;
    if (type === 'application/pdf') return 'picture_as_pdf';
    if (type.includes('word')) return 'description';
    if (type === 'text/plain') return 'text_snippet';
    return 'insert_drive_file';
  }

  // Clear selected file
  clearParentSelectedFile(): void {
    this.selectedFile = null;
    this.filePreviewUrl = null;
    this.filePreviewType = null;
    this.uploadedFileName = '';
    const fileInput = document.getElementById('attachment') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Submit homework as parent
  submitParentHomework(): void {
    
    
    if (this.submissionForm.invalid || (!this.selectedFile && !this.submissionForm.get('SubmissionText')?.value)) {
      console.log('[HOMEWORK] VALIDATION FAILED - Form invalid or no content');
      this.AminityInsStatus = 'Please provide either submission text or an attachment';
      this.isModalOpen = true;
      return;
    }

    // Validate required data before submission
    if (!this.selectedChildId || !this.AdminselectedAcademivYearID || !this.AdminselectedClassID || !this.AdminselectedDivisionID) {
      console.log('[HOMEWORK] VALIDATION FAILED - Missing required data');
      this.AminityInsStatus = 'Missing required information. Please select a child and try again.';
      this.isModalOpen = true;
      return;
    }
    
    console.log('[HOMEWORK] VALIDATION PASSED - Proceeding with submission');

    this.isSubmitting = true;
    this.loader.show();

    const formData = this.submissionForm.value;
    const child = this.parentChildren.find(c => c.ID === this.selectedChildId);
    
    const isEdit = this.submissionMode === 'edit';
    const existingSubmission = isEdit ? this.submissionStatusMap.get(parseInt(String(formData.HomeworkID))) : null;

    const submissionData: any = {
      ID: isEdit ? (existingSubmission?.id || existingSubmission?.ID || null) : null,
      SchoolID: child?.SchoolID || this.selectedSchoolID,
      AcademicYear: this.AdminselectedAcademivYearID,
      HomeworkID: formData.HomeworkID,
      StudentAdmissionNo: this.selectedChildId,
      Class: parseInt(child?.Class || '0'),
      Division: parseInt(child?.Division || '0'),
      SubmissionText: formData.SubmissionText || '',
      AttachmentURL: '', // Will be set after file upload if needed
      SubmissionStatus: formData.SubmissionStatus || 'Submitted',
      IsActive: "1",
      CreatedBy: this.ActiveUserId,
      CreatedIp: '',
      ModifiedBy: isEdit ? this.ActiveUserId : '',
      ModifiedIP: isEdit ? '' : '',
      Flag: isEdit ? "5" : "1", // Flag 5 for UPDATE, Flag 1 for INSERT
      // Add pagination fields with null values (required by DAL)
      Limit: null,
      LastCreatedDate: null,
      LastID: null,
      SortColumn: null,
      SortDirection: null,
      Offset: null
    };

    // Check if already submitted using the submission status map (no API call needed)
    // Skip this check in edit mode since we're updating an existing submission
    if (!isEdit) {
      const duplicateCheck = this.submissionStatusMap.get(parseInt(String(formData.HomeworkID)));
      if (duplicateCheck && (duplicateCheck.submissionStatus || duplicateCheck.SubmissionStatus) === 'Submitted') {
        this.isSubmitting = false;
        this.loader.hide();
        this.AminityInsStatus = 'Homework already submitted by this student';
        this.isModalOpen = true;
        return;
      }
    }

    // Handle file operations based on mode and file selection
    if (isEdit && this.selectedFile) {
      // Edit mode with new file selected - delete old file first
      const oldAttachmentUrl = this.submissionForm.get('AttachmentURL')?.value;
      if (oldAttachmentUrl) {
        console.log('[HOMEWORK] Edit mode: Deleting old file before uploading new one...');
        this.deleteOldSubmissionFileThenUpload(submissionData, formData, child, oldAttachmentUrl);
      } else {
        console.log('[HOMEWORK] Edit mode: No old file, uploading new file...');
        this.uploadSubmissionFileThenSubmit(submissionData, formData, child);
      }
    } else if (this.selectedFile) {
      // Submit mode with new file
      console.log('[HOMEWORK] Submit mode: Uploading file...');
      this.uploadSubmissionFileThenSubmit(submissionData, formData, child);
    } else {
      // No file selected - keep existing AttachmentURL if in edit mode
      if (isEdit) {
        submissionData.AttachmentURL = this.submissionForm.get('AttachmentURL')?.value || '';
      }
      console.log('[HOMEWORK] No file, submitting directly...');
      this.proceedWithSubmission(submissionData, formData, child);
    }
  }

  // Delete old submission file then upload new one
  deleteOldSubmissionFileThenUpload(submissionData: any, formData: any, child: any, oldAttachmentUrl: string): void {
    const schoolId = child?.SchoolID || this.selectedSchoolID || this.AdminselectedSchoolID || '';
    const submissionId = formData.ID || 'temp';
    
    // Extract filename from old URL
    const urlParts = oldAttachmentUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    
    if (fileName && schoolId) {
      const deletePayload = {
        SchoolId: schoolId,
        SubmissionId: submissionId,
        FileName: fileName,
        ModifiedBy: this.ActiveUserId,
        ModifiedIp: ''
      };

      this.fileService.deleteHomeworkSubmissionFile(deletePayload).subscribe({
        next: (res) => {
          console.log('[HOMEWORK] Old file deleted successfully:', res);
          // Now upload the new file
          this.uploadSubmissionFileThenSubmit(submissionData, formData, child);
        },
        error: (err) => {
          console.error('[HOMEWORK] Failed to delete old file, proceeding with upload:', err);
          // Still proceed with upload even if deletion failed
          this.uploadSubmissionFileThenSubmit(submissionData, formData, child);
        }
      });
    } else {
      // No valid filename, proceed with upload
      this.uploadSubmissionFileThenSubmit(submissionData, formData, child);
    }
  }

  // Upload file then submit
  uploadSubmissionFileThenSubmit(submissionData: any, formData: any, child: any): void {
    const schoolId = child?.SchoolID || this.selectedSchoolID || this.AdminselectedSchoolID || '';
    const submissionId = formData.ID || 'temp';

    const uploadFormData = new FormData();
    uploadFormData.append('File', this.selectedFile!);
    uploadFormData.append('SchoolId', schoolId);
    uploadFormData.append('SubmissionId', submissionId);

    this.fileService.uploadHomeworkSubmissionDoc(uploadFormData).subscribe({
      next: (response: any) => {
        console.log('[HOMEWORK] File uploaded:', response);
        submissionData.AttachmentURL = response.url;
        this.proceedWithSubmission(submissionData, formData, child);
      },
      error: (err) => {
        console.error('[HOMEWORK] File upload failed:', err);
        this.isSubmitting = false;
        this.loader.hide();
        this.AminityInsStatus = 'File upload failed. Please try again.';
        this.isModalOpen = true;
      }
    });
  }

  // Proceed with submission after validation
  proceedWithSubmission(submissionData: any, formData: any, child: any): void {
    // Test foreign key references before attempting INSERT
    this.validateForeignKeys(formData.HomeworkID, this.selectedChildId, child?.SchoolID || this.selectedSchoolID, this.AdminselectedAcademivYearID).then(
      (validationResult) => {
        if (!validationResult.valid) {
          this.isSubmitting = false;
          this.loader.hide();
          this.AminityInsStatus = validationResult.message || 'Data validation failed. Please check your selections.';
          this.isModalOpen = true;
          return;
        }

        // If validation passes, proceed with submission
        this.performSubmission(submissionData, formData);

        // Also test with minimal data to isolate the issue
        console.log('[HOMEWORK] === TESTING MINIMAL INSERT ===');
        this.testMinimalInsert(formData.HomeworkID);

        // Test if HomeworkID exists in database (foreign key validation)
        console.log('[HOMEWORK] === TESTING HOMEWORK EXISTENCE ===');
        this.testHomeworkExistence(formData.HomeworkID);

        // Test table structure by fetching existing submissions
        console.log('[HOMEWORK] === TESTING TABLE STRUCTURE ===');
        this.testTableStructure();
      },
      (error) => {
        console.error('[HOMEWORK] Foreign key validation error:', error);
        // Proceed with submission anyway if validation fails
        this.performSubmission(submissionData, formData);
      }
    );
  }

  // Validate foreign key references before submission
  private validateForeignKeys(homeworkId: any, studentAdmissionNo: any, schoolId: any, academicYear: any): Promise<{valid: boolean, message?: string}> {
    return new Promise((resolve) => {
      console.log('[HOMEWORK] Validating foreign keys...');
      console.log('[HOMEWORK] - HomeworkID:', homeworkId);
      console.log('[HOMEWORK] - StudentAdmissionNo:', studentAdmissionNo);
      console.log('[HOMEWORK] - SchoolID:', schoolId);
      console.log('[HOMEWORK] - AcademicYear:', academicYear);
      
      // For now, just do basic validation
      // In a real implementation, you would check if these exist in the database
      const isValid = homeworkId && homeworkId !== '0' && 
                     studentAdmissionNo && studentAdmissionNo !== '0' &&
                     schoolId && schoolId !== '0' &&
                     academicYear && academicYear !== '0';
      
      if (isValid) {
        resolve({valid: true});
      } else {
        resolve({valid: false, message: 'Invalid data references. Please ensure all selections are valid.'});
      }
    });
  }

  // Perform the actual submission
  private performSubmission(submissionData: any, formData: any): void {

    console.log('[HOMEWORK] === PERFORMING SUBMISSION ===');
    console.log('[HOMEWORK] Payload being sent to API:', JSON.stringify(submissionData, null, 2));

    // Submit homework using direct API call
    this.apiurl.post<any>('Tbl_HomeworkSubmission_CRUD_Operations', submissionData).subscribe({
      next: (response: any) => {
        console.log('[HOMEWORK] === API RESPONSE ===');
        console.log('[HOMEWORK] Full response:', JSON.stringify(response, null, 2));
        console.log('[HOMEWORK] statusCode:', response?.statusCode);
        console.log('[HOMEWORK] success:', response?.success);
        console.log('[HOMEWORK] message:', response?.message);
        console.log('[HOMEWORK] data:', response?.data);

        this.isSubmitting = false;
        this.loader.hide();
        
        if (response?.statusCode === 200) {
          if (response?.success === true && response?.data && response?.data?.length > 0) {
            // Successful INSERT with returned data
            this.AminityInsStatus = 'Homework submitted successfully!';
            this.handleSuccessfulSubmission(formData.HomeworkID);
          } else if (response?.success === false && response?.message === 'No data returned from database.') {
            // INSERT succeeded but no data returned (common for INSERT operations)
            console.log('[HOMEWORK] INSERT succeeded but no data returned - treating as success');
            this.AminityInsStatus = 'Homework submitted successfully!';
            this.handleSuccessfulSubmission(formData.HomeworkID);
          } else if (response?.success === false && response?.message === 'Homework already submitted by this student') {
            // Already submitted - this is actually a valid response
            console.log('[HOMEWORK] Homework already submitted - updating UI');
            this.AminityInsStatus = 'This homework has already been submitted.';
            this.isModalOpen = true;
            
            // Update UI to show as submitted
            this.submissionStatusMap.set(parseInt(formData.HomeworkID), {
              SubmissionStatus: 'Submitted',
              SubmissionDate: new Date(),
              MarksObtained: null,
              Remarks: null
            });
            
            // Close submission modal
            this.closeParentSubmissionModal();
            return;
          } else if (response?.success === false) {
            // INSERT FAILED - backend returned success: false
            console.error('[HOMEWORK] INSERT operation failed:', response?.message);
            this.AminityInsStatus = 'Failed to submit homework. Database error occurred. Please try again.';
            this.isModalOpen = true;
            return; // Don't proceed with success handling
          } else {
            // Unknown response format
            this.AminityInsStatus = response?.message || 'Unexpected response from server.';
            this.isModalOpen = true;
            return;
          }
          
          this.isModalOpen = true;
          
          // Update submission status map immediately
          this.submissionStatusMap.set(formData.HomeworkID, {
            SubmissionStatus: 'Submitted',
            SubmissionDate: new Date(),
            MarksObtained: null,
            Remarks: null
          });
          
          // Close submission modal
          this.closeParentSubmissionModal();
          
          // Refresh submissions list to get the complete data
          this.loadChildSubmissions();
        } else if (response?.statusCode === 500) {
          // Handle the "Sequence contains no elements" error specifically
          this.AminityInsStatus = 'Database error occurred. Please check if all data is valid and try again.';
          this.isModalOpen = true;
          console.error('[HOMEWORK] Database error details:', response);
        } else {
          this.AminityInsStatus = response?.message || response?.error || 'Error submitting homework';
          this.isModalOpen = true;
        }
      },
      error: (err: any) => {
        console.error('[HOMEWORK] Submission error:', err);
        console.error('[HOMEWORK] Error details:', err?.error);
        console.error('[HOMEWORK] Error status:', err?.status);
        console.error('[HOMEWORK] Error message:', err?.message);
        
        this.isSubmitting = false;
        this.loader.hide();
        
        if (err?.status === 500 && err?.error?.includes('Sequence contains no elements')) {
          this.AminityInsStatus = 'Database processing error. The homework assignment or student data may not exist. Please contact support.';
        } else {
          this.AminityInsStatus = 'Error submitting homework. Please try again.';
        }
        this.isModalOpen = true;
      }
    });
  }

  // Handle successful submission
  private handleSuccessfulSubmission(homeworkId: string): void {
    console.log('[HOMEWORK] Handling successful submission for homeworkId:', homeworkId);

    // Update submission status map immediately
    this.submissionStatusMap.set(parseInt(homeworkId), {
      SubmissionStatus: 'Submitted',
      SubmissionDate: new Date(),
      MarksObtained: null,
      Remarks: null
    });

    console.log('[HOMEWORK] Updated submission status map for homeworkId:', parseInt(homeworkId));
    console.log('[HOMEWORK] Current map size:', this.submissionStatusMap.size);

    // Close submission modal
    this.closeParentSubmissionModal();

    // Refresh submissions list to get complete data from database
    this.loadChildSubmissions();
  }

  // Test INSERT with minimal required fields to isolate the issue
  private testMinimalInsert(homeworkId: any): void {
    console.log('[HOMEWORK] Testing minimal INSERT for HomeworkID:', homeworkId);
    
    const minimalData = {
      obj: {
        ID: "",
        SchoolID: "2", // Hardcoded for testing
        AcademicYear: "3", // Hardcoded for testing
        HomeworkID: homeworkId,
        StudentAdmissionNo: "RE-2026-0000001", // Hardcoded for testing
        Class: 4, // Hardcoded for testing
        Division: 3, // Hardcoded for testing
        SubmissionText: "Test submission",
        AttachmentURL: "",
        SubmissionStatus: "Submitted",
        IsActive: "1",
        CreatedBy: "test@example.com",
        CreatedIp: "127.0.0.1",
        ModifiedBy: null,
        ModifiedIp: null,
        Flag: "1",
        Limit: null,
        LastCreatedDate: null,
        LastID: null,
        SortColumn: null,
        SortDirection: null,
        Offset: null
      }
    };
    
    
    // Test the minimal insert
    this.apiurl.post<any>('Tbl_HomeworkSubmission_CRUD_Operations', minimalData).subscribe({
      next: (response: any) => {
       
      },
      error: (err: any) => {
      }
    });
  }

  // Test if HomeworkID exists in database (foreign key validation)
  private testHomeworkExistence(homeworkId: any): void {
    console.log('[HOMEWORK] Testing if HomeworkID exists:', homeworkId);
    
    // Use the homework service to check if this homework exists
    const payload = {
      Flag: '4', // FETCH BY ID
      ID: homeworkId
    };
    
    this.apiurl.post<any>('Tbl_Homework_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        console.log('[HOMEWORK] Homework existence check response:', response);
        console.log('[HOMEWORK] Homework exists:', response?.data && response?.data?.length > 0);
        
        if (response?.data && response?.data?.length > 0) {
          console.log('[HOMEWORK] HomeworkID', homeworkId, 'exists in database');
          console.log('[HOMEWORK] Homework details:', response.data[0]);
        } else {
          console.error('[HOMEWORK] HomeworkID', homeworkId, 'does NOT exist in database');
          console.error('[HOMEWORK] This is likely causing the INSERT to fail due to foreign key constraint');
        }
      },
      error: (err: any) => {
        console.error('[HOMEWORK] Error checking homework existence:', err);
      }
    });
  }

  // Test table structure by fetching existing submissions to see what fields are required
  private testTableStructure(): void {
    console.log('[HOMEWORK] Testing table structure by fetching existing submissions...');
    
    // Try to fetch all submissions to see the table structure
    const payload = {
      Flag: '2', // FETCH ALL
      SchoolID: "2",
      AcademicYear: "3",
      Class: 4,
      Division: 3,
      StudentAdmissionNo: null, // Get all submissions to see structure
      Limit: 5,
      Offset: 0
    };
    
    this.apiurl.post<any>('Tbl_HomeworkSubmission_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        console.log('[HOMEWORK] Table structure test response:', response);
        console.log('[HOMEWORK] Existing submissions count:', response?.data?.length || 0);
        
        if (response?.data && response?.data?.length > 0) {
          console.log('[HOMEWORK] Found existing submissions - table structure analysis:');
          console.log('[HOMEWORK] Sample submission record:', response.data[0]);
          console.log('[HOMEWORK] All fields in existing record:', Object.keys(response.data[0]));
          
          // Compare with our INSERT data
          const existingRecord = response.data[0];
          console.log('[HOMEWORK] === COMPARISON ANALYSIS ===');
          console.log('[HOMEWORK] Existing record fields:', Object.keys(existingRecord));
          console.log('[HOMEWORK] Our INSERT fields:', ['SchoolID', 'AcademicYear', 'HomeworkID', 'StudentAdmissionNo', 'Class', 'Division', 'SubmissionText', 'AttachmentURL', 'SubmissionDate', 'SubmissionStatus', 'IsActive', 'CreatedBy', 'CreatedIp', 'CreatedDate']);
          
          // Check for missing fields
          const ourFields = ['SchoolID', 'AcademicYear', 'HomeworkID', 'StudentAdmissionNo', 'Class', 'Division', 'SubmissionText', 'AttachmentURL', 'SubmissionDate', 'SubmissionStatus', 'IsActive', 'CreatedBy', 'CreatedIp', 'CreatedDate'];
          const missingFields = ourFields.filter(field => !(field in existingRecord));
          const extraFields = Object.keys(existingRecord).filter(field => !ourFields.includes(field));
          
          if (missingFields.length > 0) {
            console.warn('[HOMEWORK] Missing fields in our INSERT:', missingFields);
          }
          if (extraFields.length > 0) {
            console.warn('[HOMEWORK] Extra fields in table that we are not providing:', extraFields);
          }
        } else {
          console.log('[HOMEWORK] No existing submissions found - table might be empty or structure issue');
          console.log('[HOMEWORK] This could indicate the table has different requirements');
        }
      },
      error: (err: any) => {
        console.error('[HOMEWORK] Error testing table structure:', err);
      }
    });
  }

  // View submission details for parent
  viewParentSubmissionDetails(homeworkId: number | string): void {
    const hwId = parseInt(String(homeworkId));
    const submission = this.submissionStatusMap.get(hwId);

    // Find the homework item from the homework list - check both number and string match
    this.selectedHomework = this.homeworkList.find((hw: any) => hw.id === hwId || hw.id === homeworkId || String(hw.id) === String(homeworkId)) || null;

    

    if (submission) {
      // Convert UTC date to local timezone
      const dateStr = submission.submissionDate || submission.SubmissionDate;
      const localDate = dateStr ? new Date(dateStr + 'Z') : undefined;

      // Normalize field names for the view modal
      this.selectedSubmission = {
        ID: submission.id || submission.ID,
        SubmissionText: submission.submissionText || submission.SubmissionText,
        AttachmentURL: submission.attachmentURL || submission.AttachmentURL,
        SubmissionStatus: submission.submissionStatus || submission.SubmissionStatus,
        SubmissionDate: localDate && !isNaN(localDate.getTime()) ? localDate : (dateStr ? new Date(dateStr) : undefined),
        MarksObtained: submission.marksObtained || submission.MarksObtained,
        Remarks: submission.remarks || submission.Remarks,
        StudentName: submission.studentName || submission.StudentName || '',
        Class: submission.class || submission.Class || '',
        Division: submission.division || submission.Division || ''
      };
    } else {
      this.selectedSubmission = {
        ID: '',
        SubmissionText: '',
        AttachmentURL: '',
        SubmissionStatus: 'Not Submitted',
        SubmissionDate: undefined,
        MarksObtained: '',
        Remarks: '',
        StudentName: '',
        Class: undefined,
        Division: undefined
      };
    }
    this.isViewModalOpen = true;
  }

  // Load all submissions for current child (optimized - single bulk API call)
  private loadChildSubmissions(): void {
    // Determine which student ID to use based on role
    let studentId = '';
    if (this.isParent) {
      studentId = this.selectedChildId;
    } else if (this.currentRoleUI === 'teacher') {
      studentId = this.selectedChildId;
    } else if (this.currentRoleUI === 'school_admin' || this.currentRoleUI === 'admin') {
      studentId = this.selectedSchoolAdminStudentId;
    }

    if (!(this.isParent || this.currentRoleUI === 'teacher' || this.currentRoleUI === 'school_admin' || this.currentRoleUI === 'admin') || !studentId) {
      console.log('[HOMEWORK] Skipping loadChildSubmissions - no valid role or student selected');
      return;
    }

    console.log('[HOMEWORK] Loading submissions for child/student:', studentId, 'Role:', this.currentRoleUI);

    const payload = {
      SchoolID: this.selectedSchoolID || this.schoolId,
      AcademicYear: this.AdminselectedAcademivYearID || '',
      Class: parseInt(this.AdminselectedClassID || '0'),
      Division: parseInt(this.AdminselectedDivisionID || '0'),
      StudentAdmissionNo: studentId, // Add specific student filter
      Limit: 100, // Get all submissions for the child
      Offset: 0
    };

    this.homeworkSubmissionService.getAllSubmissions(payload).subscribe({
      next: (res: any) => {
        const submissions = res?.data || [];
       

        // Check if we have any submissions at all
        if (submissions.length === 0) {
          console.log('[HOMEWORK] No submissions found for this child');
        }

        // Clear existing map and repopulate
        this.submissionStatusMap.clear();

        // Map all submissions by HomeworkID for quick lookup
        submissions.forEach((submission: any) => {
          // Handle both camelCase and PascalCase field names
          const hwId = parseInt(submission.homeworkID || submission.HomeworkID);
          console.log('[HOMEWORK] Mapping submission for HomeworkID:', hwId, 'SubmissionStatus:', submission.submissionStatus || submission.SubmissionStatus);
          this.submissionStatusMap.set(hwId, submission);
        });

        console.log('[HOMEWORK] Submission status map populated with', this.submissionStatusMap.size, 'entries');
        console.log('[HOMEWORK] Map keys:', Array.from(this.submissionStatusMap.keys()));

        // Trigger change detection to update UI
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.log('[HOMEWORK] Error loading child submissions:', err);
        this.submissionStatusMap.clear();
        this.cdr.detectChanges();
      }
    });
  }
    onAcademicYearChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;

  this.AdminselectedAcademivYearID = value === '0' ? '' : value;

  // Reset dependent filters
  this.AdminselectedClassID = '';
  this.AdminselectedDivisionID = '';
  this.AdminselectedSubjectID = '';
  this.selectedChildId = '';
  
  // Reset school admin specific data
  if (this.currentRoleUI === 'school_admin') {
    this.schoolAdminStudentList = [];
    this.selectedSchoolAdminStudentId = '';
  }

  if (this.currentRoleUI === 'teacher') {
    // For teachers, sync allocation to get class/division and then fetch subjects
    console.log('[HOMEWORK] Academic year changed - Triggering teacher allocation sync');
    this.syncTeacherClassDivisionFromAllocation(() => {
      console.log('[HOMEWORK] Academic year changed - Allocation synced, fetching teacher students');
      this.fetchTeacherStudents();
    });
  } else if (this.currentRoleUI === 'school_admin') {
    // For school admin, just fetch classes (students will be fetched after class/division selection)
    console.log('[HOMEWORK] Academic year changed - School Admin fetching classes');
    this.FetchClassList();
  } else {
    // Fetch dependent data for non-teachers
    this.FetchClassList();
    this.FetchSubjectsList();

    if (this.currentRoleUI === 'parent') {
      this.fetchParentChildren();
    } else {
      this.currentPage = 1;
      this.FetchHomeworkList();
    }
  }
}

  fetchTeacherStudents(): void {
    if (this.currentRoleUI !== 'teacher' || !this.AdminselectedAcademivYearID) return;
    
    // Ensure teacher has class/division assigned from allocation
    if (!this.teacherAssignedClassID || !this.teacherAssignedDivisionID) {
      console.warn('[HOMEWORK] Teacher class/division not available from allocation');
      return;
    }

    this.loader.show();
    const payload = {
      Flag: '3',
      SchoolID: this.selectedSchoolID || this.schoolId,
      AcademicYear: this.AdminselectedAcademivYearID,
      Class: this.teacherAssignedClassID,
      Division: this.teacherAssignedDivisionID,
      SortColumn: 'AdmissionNo',
      SortDirection: 'asc'
    };

    console.log('[HOMEWORK] Fetching teacher students with Class/Division:', payload);

    this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', payload).subscribe({
      next: (res: any) => {
        if (res?.data && res.data.length > 0) {
          this.teacherStudentList = res.data.map((item: any) => ({
            AdmissionNo: item.admissionNo,
            Name: `${item.firstName || ''} ${item.lastName || ''}`.trim(),
            Class: item.class,
            Division: item.division
          }));
          // Class/division already set from teacher allocation, just log for confirmation
          console.log('[HOMEWORK] Teacher students loaded:', this.teacherStudentList.length);
        } else {
          this.teacherStudentList = [];
          console.log('[HOMEWORK] No students found for teacher class/division');
        }
        this.loader.hide();
      },
      error: () => {
        this.teacherStudentList = [];
        this.loader.hide();
      }
    });
  }

  onTeacherStudentChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedChildId = value;
    
    const student = this.teacherStudentList.find(s => s.AdmissionNo === value);
    if (student) {
      this.AdminselectedClassID = student.Class;
      this.AdminselectedDivisionID = student.Division;
    }

    if (value) {
      this.currentPage = 1;
      this.FetchHomeworkList();
      this.loadChildSubmissions();
    } else {
      this.homeworkList = [];
      this.totalCount = 0;
      this.totalPagesCount = 0;
    }
  }

  // ── School Admin Specific Methods ────────────────────────────────────────────────────

  fetchSchoolAdminStudents(): void {
    // Allow both school_admin and admin (superadmin) roles
    if (!(this.currentRoleUI === 'school_admin' || this.currentRoleUI === 'admin') || !this.AdminselectedAcademivYearID) return;
    if (!this.AdminselectedClassID || !this.AdminselectedDivisionID) return;

    this.loader.show();
    const payload = {
      Flag: '2', // Get all students for class/division
      SchoolID: this.selectedSchoolID || this.schoolId,
      AcademicYear: this.AdminselectedAcademivYearID,
      Class: this.AdminselectedClassID,
      Division: this.AdminselectedDivisionID,
      SortColumn: 'AdmissionNo',
      SortDirection: 'asc'
    };

    console.log('[HOMEWORK] School Admin fetching students:', payload);

    this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', payload).subscribe({
      next: (res: any) => {
        if (res?.data && res.data.length > 0) {
          this.schoolAdminStudentList = res.data.map((item: any) => ({
            AdmissionNo: item.admissionNo,
            Name: `${item.firstName || ''} ${item.lastName || ''}`.trim(),
            Class: item.class,
            Division: item.division
          }));
          console.log('[HOMEWORK] School Admin students loaded:', this.schoolAdminStudentList.length);
        } else {
          this.schoolAdminStudentList = [];
        }
        this.loader.hide();
      },
      error: () => {
        this.schoolAdminStudentList = [];
        this.loader.hide();
      }
    });
  }

  onSchoolAdminStudentChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedSchoolAdminStudentId = value;

    console.log('[HOMEWORK] School Admin student selected:', value);

    // Clear old submission statuses when changing student
    this.submissionStatusMap.clear();

    // Reset or set student-specific filters
    if (value) {
      this.currentPage = 1;
      this.FetchHomeworkList();
      this.loadChildSubmissions();
    } else {
      // If no student selected, still fetch homework for the class/division
      this.currentPage = 1;
      this.FetchHomeworkList();
    }
  }

  // Admin school change handler
  onAdminSchoolChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const schoolId = target.value;
    
    if (schoolId == "0") {
      this.AdminselectedSchoolID = "";
    } else {
      this.AdminselectedSchoolID = schoolId;
    }
    
    // Reset dependent filters when school changes
    this.AdminselectedAcademivYearID = "";
    this.AdminselectedClassID = "";
    this.AdminselectedDivisionID = "";
    this.AdminselectedSubjectID = "";
    this.schoolAdminStudentList = [];
    this.selectedSchoolAdminStudentId = "";
    this.submissionStatusMap.clear();
    
    // Fetch academic years for the selected school
    this.FetchAcademicYearsList();
    
    // Reset pagination and fetch homework
    this.currentPage = 1;
    this.FetchHomeworkList();
  }

  // Admin class change handler
  onAdminClassChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const classId = target.value;
    
    if (classId == "0") {
      this.AdminselectedClassID = "";
    } else {
      this.AdminselectedClassID = classId;
    }
    
    // Reset division and subject when class changes
    this.AdminselectedDivisionID = "";
    this.AdminselectedSubjectID = "";
    
    // Fetch divisions for the selected class
    this.FetchDivisionsList();
    
    // Fetch subjects for the selected class
    this.FetchSubjectsList();

    // For school admin and admin, fetch students when class is selected
    if (this.currentRoleUI === 'school_admin' || this.currentRoleUI === 'admin') {
      this.schoolAdminStudentList = [];
      this.selectedSchoolAdminStudentId = '';
      this.submissionStatusMap.clear(); // Clear old submission statuses
    }
    
    // Reset pagination and fetch homework
    this.currentPage = 1;
    this.FetchHomeworkList();
  }

  // Admin division change handler
  onAdminDivisionChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const divisionId = target.value;
    
    if (divisionId == "0") {
      this.AdminselectedDivisionID = "";
    } else {
      this.AdminselectedDivisionID = divisionId;
    }
    
    // Reset subject when division changes
    this.AdminselectedSubjectID = "";
    
    // Fetch subjects for the selected class/division
    this.FetchSubjectsList();

    // For school admin and admin, fetch students for the selected class/division
    if (this.currentRoleUI === 'school_admin' || this.currentRoleUI === 'admin') {
      this.fetchSchoolAdminStudents();
      this.submissionStatusMap.clear(); // Clear old submission statuses
    }
    
    // Reset pagination and fetch homework
    this.currentPage = 1;
    this.FetchHomeworkList();
  }
}

