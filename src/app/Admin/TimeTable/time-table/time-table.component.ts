import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule,Validators  } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { tap } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent  } from '../../../shared/base-crud.component';
import { SchoolCacheService } from '../../../Services/school-cache.service';
import { LoaderService } from '../../../Services/loader.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-time-table',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './time-table.component.html',
  styleUrls: ['./time-table.component.css']
})
/**
 * Class Responsibility: Handles view logic and user interactions for TimeTableComponent.
 */
export class TimeTableComponent extends BasePermissionComponent {
  pageName = 'Time Table';

  resolvedStaffId: string = '';
  teacherAssignedClassID: string = '';
  teacherAssignedDivisionID: string = '';

  // ── session helpers ──────────────────────────────────────────────────────────
  public ss(key: string) {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
  }

  // Dynamic Role Getters based on Names
  get currentRoleName(): string { return (this.ss('roleName') || this.ss('RoleName') || this.ss('rollName') || this.ss('RollName') || '').trim(); }
  get currentRollID(): string { return (this.ss('RollID') || this.ss('rollID') || this.ss('menuRoleId') || this.ss('RoleID') || '').trim(); }

  get isTeacher(): boolean {
    const r = this.currentRoleName.toLowerCase();
    const id = this.currentRollID;
    return id === '3' || r.includes('teacher') || r.includes('teaching');
  }

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

  /**
   * Executes the operation: getCurrentSchoolId
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private getCurrentSchoolId(): string {
    return (
      this.AdminselectedSchoolID ||
      sessionStorage.getItem('SchoolID')?.toString() ||
      sessionStorage.getItem('schoolId')?.toString() ||
      ''
    );
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
          console.log('[TIMETABLE] Resolved Teacher StaffID:', this.resolvedStaffId);
        }
      },
      complete: () => {
        if (this.isTeacher && this.AdminSelectedActiveAcademicYearID) {
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

    const AcademicYearIdSelected = this.AdminSelectedActiveAcademicYearID || '';
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
          this.AdminselectedClassID = classId;
        }

        if (divisionId) {
          this.teacherAssignedDivisionID = divisionId;
          this.AdminselectedClassDivisionID = divisionId;
        }

        this.ClassDivisionForm.patchValue({
          Class: this.AdminselectedClassID || '0',
          Division: this.AdminselectedClassDivisionID || '0'
        });

        this.autoLoadTeacherTimetable(schoolId, AcademicYearIdSelected, classId, divisionId);
      },
      complete: () => onDone?.(),
      error: () => onDone?.()
    });
  }

  /**
   * Executes the operation: autoLoadTeacherTimetable
   * Parameters: schoolId: string, academicYearId: string, classId: string, divisionId: string
   * Rationale: Standard operational controller for the active view.
   */
  autoLoadTeacherTimetable(schoolId: string, academicYearId: string, classId: string, divisionId: string) {
    this.AdminselectedSchoolID = schoolId;
    this.AdminselectedAcademivYearID = academicYearId;
    this.AdminselectedClassID = classId;
    this.AdminselectedClassDivisionID = divisionId;

    this.FetchClassList();
    this.FetchDivisionsList();

    const payload = {
      SchoolID: schoolId,
      AcademicYear: academicYearId,
      ClassID: classId,
      DivisionID: divisionId,
      Flag: '2'
    };

    this.apiurl.post<any>('Tbl_TimeTable_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        const data = response?.data || [];
        if (data.length > 0) {
          const timetableId = data[0].id;
          this.FetchTimeTableByID(timetableId, 'view');
        }
      },
      error: (err) => {
        console.error('[TIMETABLE] Error auto-loading teacher timetable:', err);
      }
    });
  }
  
    constructor(
      private http: HttpClient,
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
      this.SchoolSelectionChange=false;
      this.ClassDivisionForm.reset();
      if (this.isAdmin) {
          this.ClassDivisionForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
          this.ClassDivisionForm.get('School').patchValue('0');
          this.ClassDivisionForm.get('AcademicYear').patchValue('0');
        } else {
          this.ClassDivisionForm.get('School')?.clearValidators();
          this.ClassDivisionForm.get('AcademicYear')?.disable({ emitEvent: false });
        }
      if(this.AdminselectedSchoolID==''){
          this.FetchAcademicYearsList();
          if(!this.isAdmin){
            this.ClassDivisionForm.get('AcademicYear').patchValue(this.AdminSelectedActiveAcademicYearID);
            if (this.isTeacher) {
              this.resolveStaffIdentity();
            } else {
              this.FetchClassList();
            }
            this.FetchWorkingdaysList();
            this.FetchSessionsList();
          }      
        }  
      this.AdminSelectedActiveAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';
      this.ClassDivisionForm.get('School').patchValue('0');
      this.ClassDivisionForm.get('Class').patchValue('0');
      this.ClassDivisionForm.get('Division').patchValue('0');
      this.FetchSchoolsList();
    };
  
    IsAddNewClicked:boolean=false;
    IsFliterClicked:boolean=false;
    IsActiveStatus:boolean=false;
    isEditModeLoading:boolean=false;
    ViewClassDivisionClicked:boolean=false;
    currentPage = 1;
    pageSize = 10;
    visiblePageCount: number = 3;
    searchQuery: string = '';
    private searchTimer: any;
    private readonly SEARCH_MIN_LENGTH = 1;
    private readonly SEARCH_DEBOUNCE = 300;
    ClassDivisionList: any[] =[];
    ClassDivisionCount: number = 0;
    SyllabusList: any[] =[];
    StudentsList: any[] =[];
    Workingdays: any[] =[];
    selectedStudents: any[] = [];
    SessionList: any[] =[];
    SubjectsList: any[] =[];
    StaffLists: any[] =[];
    isViewMode = false;
    viewSyllabus: any = null;
    AminityInsStatus: any = '';
    isModalOpen = false;
    isViewModalOpen= false;  
    ActiveUserId:string=sessionStorage.getItem('email')?.toString() || '';
    roleId = sessionStorage.getItem('RollID');
  
    pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
    lastCreatedDate: string | null = null;
    lastID: number | null = null;
  
    sortColumn: string = 'Name'; 
    sortDirection: 'asc' | 'desc' = 'desc';
    editclicked:boolean=false;
    schoolList: any[] = [];
    selectedSchoolID: string = '';
    SchoolSelectionChange:boolean=false;
    academicYearList:any[] = [];
    DivisionsList:any[] = [];
    TransitionDivisionsList:any[] = [];
    ClassTeachersList:any[] = [];
    StaffList:any[] = [];
    AdminselectedSchoolID:string = '';
    AdminselectedAcademivYearID:string = '';
    AdminselectedClassID:string = '';
    AdminselectedClassDivisionID:string = '';
    SelectedTransitionID:string = '';
    AdminSelectedActiveAcademicYearID:string = sessionStorage.getItem('ActiveAcademicYearID') || '';
  
    ClassDivisionForm: any = new FormGroup({
      ID: new FormControl(),
      Class: new FormControl(0,[Validators.required,Validators.min(1)]),
      Division: new FormControl(0,[Validators.required,Validators.min(1)]),      
      School: new FormControl(),
      AcademicYear: new FormControl(0,[Validators.required,Validators.min(1)]),
      DateFrom: new FormControl('',Validators.required),
      DateTo: new FormControl('',Validators.required),
      NoOfPeriods: new FormControl(0, Validators.min(1)),
      Timetable: new FormArray([])
    });
  
  /**
   * Executes the operation: allowOnlyNumbers
   * Parameters: event: KeyboardEvent
   * Rationale: Standard operational controller for the active view.
   */
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
  
  /**
   * Executes the operation: FetchSchoolsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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
    };
  
  /**
   * Executes the operation: FetchAcademicYearsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    FetchAcademicYearsList() {
      const schoolId =
    this.SchoolSelectionChange
      ? this.selectedSchoolID?.trim()
      : this.AdminselectedSchoolID || '';

      const requestData = { SchoolID:schoolId,Flag: '3' };
  
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
    };
  
    protected override get isAdmin(): boolean {
      const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
      return role === '1';
    } 

  /**
   * Executes the operation: FetchClassList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    FetchClassList() {
      const AcademicYearIdSelected =
    this.isAdmin
      ? this.AdminselectedAcademivYearID?.trim()
      : this.AdminSelectedActiveAcademicYearID || '';

      const requestData = { 
        SchoolID:this.AdminselectedSchoolID,
        AcademicYear:AcademicYearIdSelected,
        Flag: '9' };
  
      this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', requestData)
        .subscribe(
          (response: any) => {
            if (response && Array.isArray(response.data)) {
              this.SyllabusList = response.data.map((item: any) => {
                const isActiveString = item.isActive === "1" ? "Active" : "InActive";
                return {
                  ID: item.sNo,
                  Name: item.syllabusClassName
                };
              });
            } else {
              this.SyllabusList = [];
            }
          },
          (error) => {
            this.SyllabusList = [];
          }
        );
    };
  
  /**
   * Executes the operation: FetchDivisionsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    FetchDivisionsList() {
      const AcademicYearIdSelected =
    this.isAdmin
      ? this.AdminselectedAcademivYearID?.trim()
      : this.AdminSelectedActiveAcademicYearID || '';

      if(this.SelectedTransitionID){
        const requestData = { 
        SchoolID:this.AdminselectedSchoolID,
        AcademicYear:AcademicYearIdSelected,
        Class:this.AdminselectedClassID,
        Flag: '3' };
  
      this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', requestData)
        .subscribe(
          (response: any) => {
            if (response && Array.isArray(response.data)) {
              this.TransitionDivisionsList = response.data.map((item: any) => {
                const isActiveString = item.isActive === "1" ? "Active" : "InActive";
                return {
                  ID: item.id,
                  Name: item.name
                };
              });
            } else {
              this.TransitionDivisionsList = [];
            }
          },
          (error) => {
            this.TransitionDivisionsList = [];
          }
        );
      }
      else{
        const requestData = { 
        SchoolID:this.AdminselectedSchoolID,
        AcademicYear:AcademicYearIdSelected,
        Class:this.AdminselectedClassID,
        Flag: '3' };
  
      this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', requestData)
        .subscribe(
          (response: any) => {
            if (response && Array.isArray(response.data)) {
              this.DivisionsList = response.data.map((item: any) => {
                const isActiveString = item.isActive === "1" ? "Active" : "InActive";
                return {
                  ID: item.id,
                  Name: item.name
                };
              });
            } else {
              this.DivisionsList = [];
            }
          },
          (error) => {
            this.DivisionsList = [];
          }
        );
      }
    };

  /**
   * Executes the operation: FetchWorkingdaysList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    FetchWorkingdaysList() {
      const AcademicYearIdSelected =
    this.isAdmin
      ? this.AdminselectedAcademivYearID?.trim()
      : this.AdminSelectedActiveAcademicYearID || '';

      const requestData = { 
        SchoolID:this.AdminselectedSchoolID,
        AcademicYear:AcademicYearIdSelected,
        Flag: '3' };
  
      this.apiurl.post<any>('Tbl_WorkingDays_CRUD_Operations', requestData)
        .subscribe(
          (response: any) => {
            if (response && Array.isArray(response.data)) {
              this.Workingdays = response.data.map((item: any) => {
                const isActiveString = item.isActive === "1" ? "Active" : "InActive";
                return {
                  ID: item.id,
                  Day: item.day
                };
              });
              if (!this.isEditModeLoading) {
                const periodCount = this.ClassDivisionForm.get('NoOfPeriods')?.value;
                if (periodCount > 0) {
                  this.generateTimetable(periodCount);
                }
              }              
            } else {
              this.Workingdays = [];
            }
          },
          (error) => {
            this.Workingdays = [];
          }
        );
    };

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
      
      const requestData = { 
        SchoolID:this.AdminselectedSchoolID,
        AcademicYear:AcademicYearIdSelected,
        Flag: '3' };
  
      this.apiurl.post<any>('Tbl_Session_CRUD_Operations', requestData)
        .subscribe(
          (response: any) => {
            if (response && Array.isArray(response.data)) {
              this.SessionList = response.data.map((item: any) => {
                const isActiveString = item.isActive === "1" ? "Active" : "InActive";
                return {
                  ID: item.id,
                  Session: item.session
                };
              });
            } else {
              this.SessionList = [];
            }
          },
          (error) => {
            this.SessionList = [];
          }
        );
    };

  /**
   * Executes the operation: FetchSubjectsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    FetchSubjectsList() {
      const AcademicYearIdSelected =
    this.isAdmin
      ? this.AdminselectedAcademivYearID?.trim()
      : this.AdminSelectedActiveAcademicYearID || '';
      
      const requestData = { 
        SchoolID:this.AdminselectedSchoolID,
        AcademicYear:AcademicYearIdSelected,
        Class:this.AdminselectedClassID,
        Flag: '3' };
  
      this.apiurl.post<any>('Tbl_Subject_CRUD_Operations', requestData)
        .subscribe(
          (response: any) => {
            if (response && Array.isArray(response.data)) {
              this.SubjectsList = response.data.map((item: any) => {
                const isActiveString = item.isActive === "1" ? "Active" : "InActive";
                return {
                  ID: item.id,
                  Class:item.class,
                  Name: item.name,
                  Description: item.description,
                  Topics: item.topics,
                  ClassName: item.className,
                  SchoolName:item.schoolName,
                  AcademicYearName:item.academicYearName,
                  IsActive: isActiveString
                };
              });
            } else {
              this.SubjectsList = [];
            }
          },
          (error) => {
            this.SubjectsList = [];
          }
        );
    };

    // FetchStaffList(subjectID: string, classID: string) {
    //   const requestData = { 
    //     SchoolID:this.AdminselectedSchoolID,
    //     AcademicYear:this.AdminselectedAcademivYearID,
    //     SubjectID: subjectID,
    //     ClassID: classID,
    //     Flag: '12'};
  
    //   this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', requestData)
    //     .subscribe(
    //       (response: any) => {
    //         if (response && Array.isArray(response.data)) {
    //           this.StaffLists = response.data.map((item: any) => {
    //             const isActiveString = item.isActive === "1" ? "Active" : "InActive";
    //             return {
    //               ID: item.id,
    //               Name: item.firstName,
    //               MobileNumber: item.mobileNumber,
    //               Email: item.email
    //             };
    //           });
    //         } else {
    //           this.StaffLists = [];
    //         }
    //       },
    //       (error) => {
    //         this.StaffLists = [];
    //       }
    //     );
    // };
  
  /**
   * Executes the operation: previousPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    previousPage() {
      if (this.currentPage > 1) {
        this.goToPage(this.currentPage - 1);
      }
    };
  
  /**
   * Executes the operation: nextPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    nextPage() {
      if (this.currentPage < this.totalPages()) {
        this.goToPage(this.currentPage + 1);
      }
    };
  
  /**
   * Executes the operation: firstPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    firstPage() {
      this.goToPage(1);
    };
  
  /**
   * Executes the operation: lastPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    lastPage() {
      this.goToPage(this.totalPages());
    };
  
  /**
   * Executes the operation: goToPage
   * Parameters: pageNumber: number
   * Rationale: Standard operational controller for the active view.
   */
    goToPage(pageNumber: number) {
      const total = this.totalPages();
  
      if (pageNumber < 1) pageNumber = 1;
      if (pageNumber > total) pageNumber = total;
  
      this.currentPage = pageNumber;
  
      const isBoundaryPage =
        pageNumber === 1 ||
        pageNumber === total ||
        !this.pageCursors[pageNumber - 2];
  
      if (isBoundaryPage) {
        const offset = (pageNumber - 1) * this.pageSize;
        this.FetchInitialData({ offset });
      } else {
        this.FetchInitialData();
      }
    };
  
  /**
   * Executes the operation: totalPages
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    totalPages() {
      return Math.ceil(this.ClassDivisionCount / this.pageSize);
    };
  
  /**
   * Executes the operation: getVisiblePageNumbers
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    getVisiblePageNumbers() {
      const totalPages = this.totalPages();
      const pages = [];
      let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount/2), 1);
      let end = Math.min(start + this.visiblePageCount - 1, totalPages);
      if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
      for (let i=start; i<=end; i++) pages.push(i);
      return pages;
    };
  
  /**
   * Executes the operation: onSearchChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    onSearchChange() {
      clearTimeout(this.searchTimer);
  
      this.searchTimer = setTimeout(() => {
        const value = this.searchQuery?.trim() || '';
  
        if (value.length === 0) {
          this.currentPage = 1;
          this.pageSize=5;
          this.visiblePageCount=3;
          this.FetchInitialData();
          return;
        }
  
        if (value.length < this.SEARCH_MIN_LENGTH) {
          return;
        }
        
        this.currentPage = 1;
        this.pageSize=5;
        this.visiblePageCount=3;
        this.FetchInitialData();
  
      }, this.SEARCH_DEBOUNCE);
    };
  
  /**
   * Executes the operation: formatDateYYYYMMDD
   * Parameters: dateStr: string | null
   * Rationale: Standard operational controller for the active view.
   */
    formatDateYYYYMMDD(dateStr: string | null) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    };
  
  /**
   * Executes the operation: formatDateDDMMYYYY
   * Parameters: dateStr: string | null
   * Rationale: Standard operational controller for the active view.
   */
    formatDateDDMMYYYY(dateStr: string | null) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
    };
  
  /**
   * Executes the operation: closeModal
   * Parameters: type: 'view' | 'status'
   * Rationale: Standard operational controller for the active view.
   */
    closeModal(type: 'view' | 'status') {
      console.log('type',type);
      if (type === 'view') {
        this.isViewModalOpen = false;
        this.viewSyllabus = null;
      }
  
      if (type === 'status') {
        this.isModalOpen = false;
      }
    };

    // this.IsAddNewClicked=false;
    //   this.ClassDivisionForm.reset();
    //   if (this.isAdmin) {
    //     this.ClassDivisionForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
    //   } else {
    //     this.ClassDivisionForm.get('School')?.clearValidators();
    //   }
    //   this.ClassDivisionForm.get('School').patchValue('0');
    //   this.ClassDivisionForm.get('AcademicYear').patchValue('0');
    //   this.ClassDivisionForm.get('Class').patchValue('0');
    //   this.ClassDivisionForm.get('Division').patchValue('0');
    //   this.IsFliterClicked=false;
  
  /**
   * Executes the operation: handleOk
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    handleOk() {
      if(this.AminityInsStatus=="TimeTable already exists for this Class & Division" || this.AminityInsStatus=="Staff already allocated for this time slot"){
        this.isModalOpen = false;
        return;
      }
      else{
        this.IsAddNewClicked=false;
        this.ClassDivisionForm.reset();
        this.isModalOpen = false;
        if (this.isAdmin) {
          this.ClassDivisionForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
          this.ClassDivisionForm.get('School').patchValue('0');
          this.ClassDivisionForm.get('AcademicYear').patchValue('0');
        } else {
          this.ClassDivisionForm.get('School')?.clearValidators();
          this.ClassDivisionForm.get('AcademicYear')?.disable({ emitEvent: false });
        }
        if(this.AdminselectedSchoolID==''){
          this.FetchAcademicYearsList();
          if(!this.isAdmin){
            this.ClassDivisionForm.get('AcademicYear').patchValue(this.AdminSelectedActiveAcademicYearID);
            this.FetchClassList();
            this.FetchWorkingdaysList();
            this.FetchSessionsList();
          }      
        }  
        this.ClassDivisionForm.get('School').patchValue('0');
        this.ClassDivisionForm.get('Class').patchValue('0');
        this.ClassDivisionForm.get('Division').patchValue('0');
        this.IsFliterClicked=false;
        this.isViewModalOpen=false;
      }
            
    };
  
  /**
   * Executes the operation: editreview
   * Parameters: SyllabusID: string
   * Rationale: Standard operational controller for the active view.
   */
    editreview(SyllabusID: string): void {
      if (this.isAdmin) {
        this.ClassDivisionForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
      } else {
        this.ClassDivisionForm.get('School')?.clearValidators();
      }
      this.editclicked=true;
      this.FetchTimeTableByID(SyllabusID,'edit');
      this.ViewClassDivisionClicked=true;
    };
  
  /**
   * Executes the operation: toggleChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    toggleChange(){
      this.IsActiveStatus = !this.IsActiveStatus;
    };
  
  /**
   * Executes the operation: sort
   * Parameters: column: string
   * Rationale: Standard operational controller for the active view.
   */
    sort(column: string) {
      if (this.sortColumn === column) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortColumn = column;
        this.sortDirection = 'asc';
      }
      this.currentPage = 1;
      this.pageCursors = [];
      this.FetchInitialData();
    };
  
  /**
   * Executes the operation: onSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
    onSchoolChange(event: Event) {
      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      if(schoolID=="0"){
        this.selectedSchoolID="";
      }else{
        this.selectedSchoolID = schoolID;
      }    
      this.SchoolSelectionChange = true;
      this.FetchInitialData();
    };
  
  /**
   * Executes the operation: viewReview
   * Parameters: SyllabusID: string
   * Rationale: Standard operational controller for the active view.
   */
    viewReview(SyllabusID: string): void {
      this.FetchTimeTableByID(SyllabusID,'view');
    };
  
  /**
   * Executes the operation: onAdminSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
    onAdminSchoolChange(event: Event) {
      this.academicYearList=[];
      this.SyllabusList = [];
      this.ClassDivisionForm.get('Class').patchValue('0');
      this.ClassDivisionForm.get('AcademicYear').patchValue('0');
      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      if(schoolID=="0"){
        this.AdminselectedSchoolID="";
      }else{
        this.AdminselectedSchoolID = schoolID;
      }  
      console.log('this.AdminselectedSchoolID',this.AdminselectedSchoolID);  
      this.FetchAcademicYearsList();
    };
  
  /**
   * Executes the operation: onAdminAcademicYearChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
    onAdminAcademicYearChange(event: Event) {
      this.SyllabusList = [];   
      this.Workingdays = []; 
      this.SessionList=[];
      this.ClassDivisionForm.get('Class').patchValue('0');
      this.ClassDivisionForm.get('NoOfPeriods').patchValue('0');
      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      if(schoolID=="0"){
        this.AdminselectedAcademivYearID="";
      }else{
        this.AdminselectedAcademivYearID = schoolID;
      }    
      this.FetchClassList();
      this.FetchWorkingdaysList();
      this.FetchSessionsList();
    };
  
  /**
   * Executes the operation: onAdminClassChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
    onAdminClassChange(event: Event) {          
      if(this.SelectedTransitionID){
        this.TransitionDivisionsList=[];
        this.ClassDivisionForm.get('TransitionDivision').patchValue('0');
      }
      else{
        this.DivisionsList = [];
        this.ClassDivisionForm.get('Division').patchValue('0');
      }     
      this.SubjectsList=[]; 
      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      if(schoolID=="0"){
        this.AdminselectedClassID="";
      }else{
        this.AdminselectedClassID = schoolID;
      }    
      this.FetchDivisionsList();
      this.FetchSubjectsList();
    };

  /**
   * Executes the operation: onAdminDivisionChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
    onAdminDivisionChange(event: Event) {
      this.IsFliterClicked=false;
      this.StudentsList = [];  
      this.selectedStudents = [];
      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      if(schoolID=="0"){
        this.AdminselectedClassDivisionID="";
      }else{
        this.AdminselectedClassDivisionID = schoolID;
      }    
      // this.FetchInitialData();
    };

  /**
   * Executes the operation: submitSelection
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    submitSelection() {
      this.selectedStudents = this.StudentsList
        .filter(student => student.isSelected);
      this.isViewModalOpen=false;
    }

  /**
   * Executes the operation: editSelection
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    editSelection(){
      this.isViewModalOpen=true;
    }

  /**
   * Executes the operation: cancelSelectedlist
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    cancelSelectedlist(){
      if(this.isViewModalOpen){
        this.isViewModalOpen=false;
      }
      else{
        const confirmClear = confirm(
          'Are you sure you want to clear the selected students list?'
        );

        if (confirmClear) {
          this.selectedStudents = [];
        }
      }      
    }

  /**
   * Executes the operation: AddNewClicked
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    AddNewClicked(){       
      if(this.IsAddNewClicked){
        this.ClassDivisionForm.reset();
        this.Workingdays=[];
        this.timetableArray.clear();
        this.IsAddNewClicked=!this.IsAddNewClicked;
        if (this.isAdmin) {
          this.ClassDivisionForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
          this.ClassDivisionForm.get('School').patchValue('0');
          this.ClassDivisionForm.get('AcademicYear').patchValue('0');
        } else {
          this.ClassDivisionForm.get('School')?.clearValidators();
          this.ClassDivisionForm.get('AcademicYear')?.disable({ emitEvent: false });
        }
        if(this.AdminselectedSchoolID==''){
          this.FetchAcademicYearsList();
          if(!this.isAdmin){
            this.ClassDivisionForm.get('AcademicYear').patchValue(this.AdminSelectedActiveAcademicYearID);
            this.FetchClassList();
            this.FetchWorkingdaysList();
            this.FetchSessionsList();
          }      
        }  
        this.ClassDivisionForm.get('School').patchValue('0');
        this.ClassDivisionForm.get('Class').patchValue('0');
        this.ClassDivisionForm.get('Division').patchValue('0');
        this.ClassDivisionForm.get('NoOfPeriods').patchValue("0");
        this.IsFliterClicked=false;
      }
      else{
        this.IsAddNewClicked=!this.IsAddNewClicked;
      }
    };

    // onNoOfPeriodsChange(event: Event) {
    //   const target = event.target as HTMLSelectElement;
    //   const periodCount = Number(target.value);

    //   if (periodCount > 0 && this.Workingdays.length > 0) {
    //     this.generateTimetable(periodCount);
    //   }
    // };

    private originalPeriodsBackup: {
      [dayID: string]: any[]
    } = {};

  /**
   * Executes the operation: onNoOfPeriodsChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
    onNoOfPeriodsChange(event: Event) {
      const target = event.target as HTMLSelectElement;
      const newCount = Number(target.value);

      if (!newCount || newCount <= 0) return;

      if (!this.ClassDivisionForm.get('ID')?.value) {
        if (this.Workingdays.length > 0) {
          this.generateTimetable(newCount);
        }
        return;
      }

      this.timetableArray.controls.forEach(control => {

        const dayGroup = control as FormGroup;
        const dayID = dayGroup.get('DayID')?.value;
        const periodsArray = dayGroup.get('Periods') as FormArray;

        const currentValues = periodsArray.value;
        const classID = this.ClassDivisionForm.get('Class')?.value;

        periodsArray.clear();

        for (let i = 0; i < newCount; i++) {

          const existing =
            currentValues[i] ||
            this.originalPeriodsBackup[dayID]?.[i];

          if (existing) {

            const periodGroup = new FormGroup({
              Session: new FormControl(existing.Session || ''),
              StartTime: new FormControl(existing.StartTime || ''),
              EndTime: new FormControl(existing.EndTime || ''),
              Subject: new FormControl(existing.Subject || '0'),
              Staff: new FormControl(existing.Staff || '0'),
              StaffList: new FormControl([])
            });

            periodsArray.push(periodGroup);

            if (existing.Subject && existing.Subject !== '0') {

              this.FetchStaffList(existing.Subject, classID)
                .subscribe((response: any) => {

                  const staffData = (response?.data || []).map((item: any) => ({
                    id: item.id,
                    name: item.staffName || item.firstName,
                    mobileNumber: item.mobileNumber,
                    email: item.email
                  }));

                  periodGroup.get('StaffList')?.setValue(staffData);

                  periodGroup.patchValue({
                    Staff: existing.Staff || '0'
                  });

                });

            }

          } else {

            periodsArray.push(new FormGroup({
              Session: new FormControl(''),
              StartTime: new FormControl(''),
              EndTime: new FormControl(''),
              Subject: new FormControl('0'),
              Staff: new FormControl('0'),
              StaffList: new FormControl([])
            }));

          }

        }

      });

      this.generatePeriodHeaders();
    }

  /**
   * Executes the operation: generateTimetable
   * Parameters: periodCount: number
   * Rationale: Standard operational controller for the active view.
   */
    generateTimetable(periodCount: number) {

      const timetableArray = this.ClassDivisionForm.get('Timetable') as FormArray;
      timetableArray.clear();

      this.Workingdays.forEach(day => {

        const dayGroup = new FormGroup({
          DayID: new FormControl(day.ID),
          Day: new FormControl(day.Day),
          Periods: new FormArray([])
        });

        const periodsArray = dayGroup.get('Periods') as FormArray;

        for (let i = 0; i < periodCount; i++) {

          periodsArray.push(
            new FormGroup({
              Session: new FormControl(''),
              StartTime: new FormControl(''),
              EndTime: new FormControl(''),
              Subject: new FormControl(0),
              Staff: new FormControl(0),
              StaffList: new FormControl([]) // 🔥 required
            })
          );
        }

        timetableArray.push(dayGroup);
      });
    }

    get timetableArray(): FormArray {
      return this.ClassDivisionForm.get('Timetable') as FormArray;
    }

  /**
   * Executes the operation: getPeriods
   * Parameters: index: number
   * Rationale: Standard operational controller for the active view.
   */
    getPeriods(index: number): FormArray {
      return this.timetableArray.at(index).get('Periods') as FormArray;
    }

  /**
   * Executes the operation: SubmitFilterList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    SubmitFilterList(){
      const controlsToValidate = ['Class', 'Division', 'School', 'AcademicYear'];
      let isInvalid = false;

      controlsToValidate.forEach(ctrlName => {
        const ctrl = this.ClassDivisionForm.get(ctrlName);
        if (ctrl) {
          ctrl.markAsTouched();
          if (ctrl.invalid) isInvalid = true;
        }
      });

      if (isInvalid) {
        return;
      }

      this.IsFliterClicked=true;
      this.StudentsList=[];
      this.FetchInitialData();
    }

  /**
   * Executes the operation: SubmitTimeTable
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    SubmitTimeTable() {
      if (this.ClassDivisionForm.invalid) {
        this.ClassDivisionForm.markAllAsTouched();
        return;
      }

      const timetableArray = this.ClassDivisionForm.value.Timetable;

      const transformed = timetableArray.map((day: any) => ({
        DayID: day.DayID,
        Periods: day.Periods.map((p: any, index: number) => ({
          DayID: day.DayID,
          PeriodNo: index + 1,
          Session: p.Session,
          StartTime: p.StartTime,
          EndTime: p.EndTime,
          Subject: p.Subject,
          Staff: p.Staff
        }))
      }));

      const AcademicYearIdSelected =
    this.isAdmin
      ? this.AdminselectedAcademivYearID?.trim()
      : this.AdminSelectedActiveAcademicYearID || '';

      const payload = {
        ID: this.ClassDivisionForm.get('ID')?.value || null,
        SchoolID: this.AdminselectedSchoolID,
        AcademicYear: AcademicYearIdSelected,
        ClassID: this.AdminselectedClassID,
        DivisionID: this.AdminselectedClassDivisionID,
        DateFrom: this.ClassDivisionForm.get('DateFrom')?.value,
        DateTo: this.ClassDivisionForm.get('DateTo')?.value,
        NoOfPeriods: this.ClassDivisionForm.get('NoOfPeriods')?.value,
        IsActive: "1",
        TimetableJSON: JSON.stringify(transformed),
        Flag: this.ClassDivisionForm.get('ID')?.value ? '5' : '1'
      };

      this.apiurl.post('Tbl_TimeTable_CRUD_Operations', payload)
        .subscribe({
          next: (res: any) => {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            this.ClassDivisionForm.reset();

            this.AminityInsStatus = res.message;
            this.isModalOpen = true;
          },
          error: (err:any) => {
            if (err.status === 400 && err.error?.message) {
              this.AminityInsStatus = err.error.message;  // School Name Already Exists!
            } else if (err.status === 500 && err.error?.Message) {
              this.AminityInsStatus = err.error.Message;  // Database or internal error
            } else {
              this.AminityInsStatus = "Unexpected error occurred.";
            }
            this.isModalOpen = true;
          },
          complete: () => {
          }
        });
    }

  /**
   * Executes the operation: FetchAcademicYearCount
   * Parameters: isSearch: boolean
   * Rationale: Standard operational controller for the active view.
   */
    FetchAcademicYearCount(isSearch: boolean) {
      let SchoolIdSelected = '';
  
      if (this.SchoolSelectionChange) {
        SchoolIdSelected = this.selectedSchoolID.trim();
      }
  
      return this.apiurl.post<any>('Tbl_TimeTable_CRUD_Operations', {
        Flag: isSearch ? '8' : '6',
        SchoolID:SchoolIdSelected,
        Class: isSearch ? this.searchQuery.trim() : null
      });
    }
  
  /**
   * Executes the operation: FetchInitialData
   * Parameters: extra: any = {}
   * Rationale: Standard operational controller for the active view.
   */
    FetchInitialData(extra: any = {}) {
      const isSearch = !!this.searchQuery?.trim();
      const flag = isSearch ? '7' : '2';
  
      let SchoolIdSelected = '';
  
      if (this.SchoolSelectionChange) {
        SchoolIdSelected = this.selectedSchoolID.trim();
      }
  
      const cursor =
        !extra.offset && this.currentPage > 1
          ? this.pageCursors[this.currentPage - 2] || null
          : null;
  
      this.loader.show();
  
      this.FetchAcademicYearCount(isSearch).subscribe({
        next: (countResp: any) => {
          this.ClassDivisionCount = countResp?.data?.[0]?.totalcount ?? 0;
  
          const requestClassID = this.isTeacher ? this.teacherAssignedClassID : this.AdminselectedClassID;
          const requestDivisionID = this.isTeacher ? this.teacherAssignedDivisionID : this.AdminselectedClassDivisionID;

          const payload: any = {
            SchoolID:this.AdminselectedSchoolID,
            AcademicYear:this.AdminselectedAcademivYearID,
            ClassID:requestClassID,
            DivisionID:requestDivisionID,
            Flag: flag,
            ...extra
          };
  
          if (isSearch) payload.Class = this.searchQuery.trim();
  
          this.apiurl.post<any>('Tbl_TimeTable_CRUD_Operations', payload).subscribe({
            next: (response: any) => {
              const data = response?.data || [];
              this.mapAcademicYears(response);
  
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
              this.ClassDivisionList = [];
              this.loader.hide();
            }
          });
        },
        error: () => {
          this.ClassDivisionList = [];
          this.ClassDivisionCount = 0;
          this.loader.hide();
        }
      });
    };
  
  /**
   * Executes the operation: mapAcademicYears
   * Parameters: response: any
   * Rationale: Standard operational controller for the active view.
   */
    mapAcademicYears(response: any) {
      this.StudentsList = (response.data || []).map((item: any) => ({
        ID: item.id,
        DateFrom:this.formatDateDDMMYYYY(item.dateFrom),
        DateTo:this.formatDateDDMMYYYY(item.dateTo),
        SchoolName:item.schoolName,
        AcademicYearName:item.academicYearName,
        IsActive: item.isActive === '1' ? 'Active' : 'InActive' 
      }));
    };
  
  /**
   * Executes the operation: FetchTimeTableByID
   * Parameters: id: string, mode: 'view' | 'edit'
   * Rationale: Standard operational controller for the active view.
   */
    FetchTimeTableByID(id: string, mode: 'view' | 'edit') {
      const payload = {
        ID: id,
        Flag: "4"
      };

      this.apiurl.post<any>("Tbl_TimeTable_CRUD_Operations", payload)
        .subscribe((response: any) => {

          const data = response?.data?.[0];
          if (!data) {
            this.ClassDivisionForm.reset();
            return;
          }

          this.ClassDivisionForm.patchValue({
            ID: data.id,
            School: data.schoolID,
            AcademicYear: data.academicYear,
            Class: data.classID,
            Division: data.divisionID,
            DateFrom: this.formatDateYYYYMMDD(data.dateFrom),
            DateTo: this.formatDateYYYYMMDD(data.dateTo),
            NoOfPeriods: data.noOfPeriods
          });

          this.AdminselectedSchoolID = data.schoolID;
          this.AdminselectedAcademivYearID = data.academicYear;
          this.AdminselectedClassID = data.classID;
          this.AdminselectedClassDivisionID = data.divisionID;

          this.IsActiveStatus = data.isActive === 'True';

          // this.loadAllDropdowns().then(() => {

          //   this.buildTimetableFromDetails(data.timeTableDetails);

          //   if (mode === 'view') {
          //     this.generatePeriodHeaders();
          //     this.isViewMode = true;
          //     this.isViewModalOpen = true;
          //   }

          //   if (mode === 'edit') {
          //     this.isViewMode = false;
          //     this.IsAddNewClicked = true;
          //   }

          // });

          this.loadAllDropdowns().then(() => {
            this.buildTimetableFromDetails(data.timeTableDetails);
            this.generatePeriodHeaders();

            if (mode === 'view') {
              setTimeout(() => {
                this.isViewMode = true;
                if (!this.isTeacher) {
                  this.isViewModalOpen = true;
                }
              }, 0);
            }

            if (mode === 'edit') {
              this.isViewMode = false;
              this.IsAddNewClicked = true;
            }

          });
        }, error => {
          console.error(error);
        });
    }

    // loadAllDropdowns(): Promise<void> {
    //   return new Promise((resolve) => {

    //     this.FetchAcademicYearsList();
    //     this.FetchClassList();
    //     this.FetchDivisionsList();
    //     this.FetchSubjectsList();

    //     const requestData = { 
    //       SchoolID: this.AdminselectedSchoolID,
    //       AcademicYear: this.AdminselectedAcademivYearID,
    //       Flag: '3'
    //     };

    //     this.apiurl.post<any>('Tbl_WorkingDays_CRUD_Operations', requestData)
    //       .subscribe((response: any) => {

    //         if (response && Array.isArray(response.data)) {
    //           this.Workingdays = response.data.map((item: any) => ({
    //             ID: item.id,
    //             Day: item.day
    //           }));
    //         } else {
    //           this.Workingdays = [];
    //         }

    //         resolve();

    //       });
    //   });
    // }

  /**
   * Executes the operation: loadAllDropdowns
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    loadAllDropdowns(): Promise<void> {
      return new Promise((resolve) => {
        this.FetchSubjectsList();

        const requestData = { 
          SchoolID: this.AdminselectedSchoolID,
          AcademicYear: this.AdminselectedAcademivYearID,
          Flag: '3'
        };

        this.apiurl.post<any>('Tbl_WorkingDays_CRUD_Operations', requestData)
          .subscribe((response: any) => {

            if (response && Array.isArray(response.data)) {
              this.Workingdays = response.data.map((item: any) => ({
                ID: item.id,
                Day: item.day
              }));
            } else {
              this.Workingdays = [];
            }

            resolve();
          });
      });
    }

  /**
   * Executes the operation: buildTimetableFromDetails
   * Parameters: details: any[]
   * Rationale: Standard operational controller for the active view.
   */
    buildTimetableFromDetails(details: any[]) {
      const timetableArray = this.timetableArray;
      timetableArray.clear();

      const grouped: any = {};
      if (details && details.length > 0) {
        details.forEach(d => {
          const dayId = d.dayID?.toString();
          if (!grouped[dayId]) grouped[dayId] = [];
          grouped[dayId].push(d);
        });
      }

      const periodCount = Number(this.ClassDivisionForm.get('NoOfPeriods')?.value) || 6;

      this.Workingdays.forEach(workingDay => {
        const dayID = workingDay.ID.toString();
        const dayName = workingDay.Day;

        const dayGroup = new FormGroup({
          DayID: new FormControl(dayID),
          Day: new FormControl(dayName),
          Periods: new FormArray([])
        });

        const periodsArray = dayGroup.get('Periods') as FormArray;
        const existingPeriods = grouped[dayID] || [];

        existingPeriods.sort((a: any, b: any) => a.periodNo - b.periodNo);

        for (let i = 0; i < periodCount; i++) {
          const p = existingPeriods[i];
          if (p) {
            const periodGroup = new FormGroup({
              Session: new FormControl(p.sessionID || ''),
              StartTime: new FormControl(p.startTime ? p.startTime.substring(0, 5) : ''),
              EndTime: new FormControl(p.endTime ? p.endTime.substring(0, 5) : ''),
              Subject: new FormControl(p.subjectID ? p.subjectID.toString() : 0),
              Staff: new FormControl(p.staffID ? p.staffID.toString() : 0),
              StaffList: new FormControl([])
            });

            const subjectID = p.subjectID ? p.subjectID.toString() : 0;
            const classID = this.ClassDivisionForm.get('Class')?.value;

            if (subjectID && subjectID != 0) {
              const payload = {
                SchoolID: this.AdminselectedSchoolID,
                AcademicYear: this.AdminselectedAcademivYearID,
                SubjectID: subjectID,
                ClassID: classID,
                Flag: '12'
              };

              this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', payload)
                .subscribe(res => {
                  const staffData = (res?.data || []).map((item: any) => ({
                    id: item.id,
                    name: item.staffName || item.firstName,
                    mobileNumber: item.mobileNumber,
                    email: item.email
                  }));
                  periodGroup.get('StaffList')?.setValue(staffData);
                  periodGroup.patchValue({
                    Staff: p.staffID ? p.staffID.toString() : 0
                  });
                });
            }
            periodsArray.push(periodGroup);
          } else {
            periodsArray.push(new FormGroup({
              Session: new FormControl(''),
              StartTime: new FormControl(''),
              EndTime: new FormControl(''),
              Subject: new FormControl(0),
              Staff: new FormControl(0),
              StaffList: new FormControl([])
            }));
          }
        }

        timetableArray.push(dayGroup);
      });

      this.originalPeriodsBackup = {};
      this.timetableArray.controls.forEach(control => {
        const dayGroup = control as FormGroup;
        const dayID = dayGroup.get('DayID')?.value;
        const periodsArray = dayGroup.get('Periods') as FormArray;

        this.originalPeriodsBackup[dayID] =
          periodsArray.value.map((p:any) => ({ ...p }));
      });
    }

  /**
   * Executes the operation: getDayNameFromID
   * Parameters: dayID: string
   * Rationale: Standard operational controller for the active view.
   */
    getDayNameFromID(dayID: string): string {
      const map: any = {
        "1": "Monday",
        "2": "Tuesday",
        "3": "Wednesday",
        "4": "Thursday",
        "5": "Friday",
        "6": "Saturday",
        "7": "Sunday"
      };
      return map[dayID] || dayID;
    }

  /**
   * Executes the operation: FetchStaffList
   * Parameters: subjectID: string, classID: string
   * Rationale: Standard operational controller for the active view.
   */
    FetchStaffList(subjectID: string, classID: string) {

      const AcademicYearIdSelected =
    this.isAdmin
      ? this.AdminselectedAcademivYearID?.trim()
      : this.AdminSelectedActiveAcademicYearID || '';

      const requestData = { 
        SchoolID: this.AdminselectedSchoolID,
        AcademicYear: AcademicYearIdSelected,
        SubjectID: subjectID,
        ClassID: classID,
        Flag: '12'
      };

      return this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', requestData);
    }

  /**
   * Executes the operation: onSubjectChange
   * Parameters: subjectID: string, dayIndex: number, periodIndex: number
   * Rationale: Standard operational controller for the active view.
   */
    onSubjectChange(subjectID: string, dayIndex: number, periodIndex: number) {

      const periodsArray = this.getPeriods(dayIndex);
      const periodGroup = periodsArray.at(periodIndex) as FormGroup;

      if (!subjectID || subjectID == '0') {
        periodGroup.patchValue({ Staff: 0 });
        periodGroup.get('StaffList')?.setValue([]);
        return;
      }

      const classID = this.ClassDivisionForm.get('Class')?.value;

      this.FetchStaffList(subjectID, classID)
        .subscribe((response: any) => {

          const staffData = (response?.data || []).map((item: any) => ({
            id: item.id,
            name: item.staffName || item.firstName,
            mobileNumber: item.mobileNumber,
            email: item.email
          }));

          periodGroup.get('StaffList')?.setValue(staffData);
          periodGroup.patchValue({ Staff: 0 });

        });
    }
  
  /**
   * Executes the operation: UpdateTimeTable
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    UpdateTimeTable(){
      if (this.ClassDivisionForm.invalid) {
        this.ClassDivisionForm.markAllAsTouched();
        return;
      }

      const timetableArray = this.ClassDivisionForm.value.Timetable;

      const transformed = timetableArray.map((day: any) => ({
        DayID: day.DayID,
        Periods: day.Periods.map((p: any, index: number) => ({
          DayID: day.DayID,
          PeriodNo: index + 1,
          Session: p.Session,
          StartTime: p.StartTime,
          EndTime: p.EndTime,
          Subject: p.Subject,
          Staff: p.Staff
        }))
      }));

      const payload = {
        ID: this.ClassDivisionForm.get('ID')?.value || null,
        SchoolID: this.AdminselectedSchoolID,
        AcademicYear: this.AdminselectedAcademivYearID,
        ClassID: this.AdminselectedClassID,
        DivisionID: this.AdminselectedClassDivisionID,
        DateFrom: this.ClassDivisionForm.get('DateFrom')?.value,
        DateTo: this.ClassDivisionForm.get('DateTo')?.value,
        NoOfPeriods: this.ClassDivisionForm.get('NoOfPeriods')?.value,
        IsActive: "1",
        TimetableJSON: JSON.stringify(transformed),
        Flag: this.ClassDivisionForm.get('ID')?.value ? '5' : '1'
      };

      this.apiurl.post('Tbl_TimeTable_CRUD_Operations', payload)
        .subscribe({
          next: (res: any) => {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            this.AminityInsStatus = res.message;
            this.isModalOpen = true;
            this.ClassDivisionForm.reset();
          },
          error: (err:any) => {
            if (err.status === 400 && err.error?.message) {
              this.AminityInsStatus = err.error.message;  // School Name Already Exists!
            } else if (err.status === 500 && err.error?.Message) {
              this.AminityInsStatus = err.error.Message;  // Database or internal error
            } else {
              this.AminityInsStatus = "Unexpected error occurred.";
            }
            this.isModalOpen = true;
          },
          complete: () => {
          }
        });
    };

    periodHeaders: string[] = [];

  /**
   * Executes the operation: generatePeriodHeaders
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    generatePeriodHeaders() {
      const noOfPeriods = Number(this.ClassDivisionForm.get('NoOfPeriods')?.value) || 6;
      this.periodHeaders = Array.from({ length: noOfPeriods }, (_, i) => `Period ${i + 1}`);
    }

  /**
   * Executes the operation: getPeriodsControls
   * Parameters: dayGroup: any
   * Rationale: Standard operational controller for the active view.
   */
    getPeriodsControls(dayGroup: any): FormGroup[] {
      const periods = dayGroup.get('Periods') as FormArray;
      return periods ? periods.controls as FormGroup[] : [];
    }

    // Highlight current period based on dayID and period number
    isCurrentPeriod(dayID: string, periodNo: number): boolean {
      if (!dayID || !periodNo) return false;

      const today = new Date();
      const currentDayName = today.toLocaleDateString('en-US', { weekday: 'long' });

      // Find the working day that matches today
      const day = this.Workingdays.find(d => d.ID.toString() === dayID);

      if (!day) return false;

      // Only highlight if day matches today
      if (day.Day !== currentDayName) return false;

      const currentHour = today.getHours();
      const currentMinutes = today.getMinutes();

      // Check if current time is within the period time
      const dayGroup = this.timetableArray.controls.find(dg => dg.get('DayID')?.value === dayID);
      if (!dayGroup) return false;

      const periodsArray = (dayGroup.get('Periods') as FormArray).controls;
      const period = periodsArray[periodNo - 1]; // periodNo starts from 1

      if (!period) return false;

      const startTime = period.get('StartTime')?.value; // e.g., "09:00"
      const endTime = period.get('EndTime')?.value;     // e.g., "09:45"

      if (!startTime || !endTime) return false;

      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const start = new Date();
      start.setHours(startHour, startMin, 0, 0);

      const end = new Date();
      end.setHours(endHour, endMin, 0, 0);

      return today >= start && today <= end;
    }

    getSubjectName(subjectID: string): string | null {
      if (!subjectID || subjectID === '0') return null;
      const subject = this.SubjectsList?.find(s => s.ID === subjectID);
      return subject ? subject.Name : null;
    }

    getStaffName(staffID: string, staffList: any[]): string | null {
      if (!staffID || staffID === '0' || !staffList) return null;
      const staff = staffList.find(s => s.id === staffID);
      return staff ? staff.name : null;
    }

  /**
   * Executes the operation: getClassName
   * Parameters: classID: string
   * Rationale: Standard operational controller for the active view.
   */
    getClassName(classID: string): string {
      const cls = this.SyllabusList?.find(x => x.ID == classID);
      return cls ? cls.Name : '';
    }

  /**
   * Executes the operation: getDivisionName
   * Parameters: divisionID: string
   * Rationale: Standard operational controller for the active view.
   */
    getDivisionName(divisionID: string): string {
      const div = this.DivisionsList?.find(x => x.ID == divisionID);
      return div ? div.Name : '';
    }

  /**
   * Executes the operation: printTimetable
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    printTimetable() {
      const printContents = document.getElementById('printTimetable')?.innerHTML;

      const classID = this.ClassDivisionForm.get('Class')?.value;
      const divisionID = this.ClassDivisionForm.get('Division')?.value;

      const className = this.getClassName(classID);
      const divisionName = this.getDivisionName(divisionID);

      const popup = window.open('', '_blank', 'width=1200,height=800');

      if (!popup) return;

      popup.document.open();

      popup.document.write(`
      <html>
      <head>

        <title>Time Table - Class ${className} (${divisionName})</title>

        <style>

          body{
            font-family: Arial, sans-serif;
            padding:20px;
          }

          .header{
            text-align:center;
            margin-bottom:20px;
          }

          .header h2{
            margin:0;
          }

          .header h4{
            margin:5px 0 15px 0;
            font-weight:normal;
          }

          table{
            width:100%;
            border-collapse:collapse;
          }

          th, td{
            border:1px solid #999;
            text-align:center;
            padding:10px;
            vertical-align:middle;
          }

          th{
            background:#eee;
          }

          .subject-name{
            font-weight:bold;
          }

          .time-range{
            font-size:13px;
          }

          .staff-name{
            font-size:13px;
          }

        </style>

      </head>

      <body>

        <div class="header">
          <h2>Time Table</h2>
          <h4>Class: ${className} &nbsp;&nbsp; | &nbsp;&nbsp; Division: ${divisionName}</h4>
        </div>

        ${printContents}

      </body>

      </html>
      `);

      popup.document.close();
      popup.print();

    }
}
