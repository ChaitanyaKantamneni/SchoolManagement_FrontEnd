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
  selector: 'app-teachers-time-table',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './teachers-time-table.component.html',
  styleUrl: './teachers-time-table.component.css'
})
/**
 * Class Responsibility: Handles view logic and user interactions for TeachersTimeTableComponent.
 */
export class TeachersTimeTableComponent extends BasePermissionComponent {
  pageName = 'Teachers Time Table';

  resolvedStaffId: string = '';

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
          console.log('[TEACHER TIMETABLE] Resolved Teacher StaffID:', this.resolvedStaffId);
          this.AdminselectedClassID = this.resolvedStaffId;
          this.ClassDivisionForm.patchValue({
            Class: this.resolvedStaffId
          });
        }
      },
      complete: () => {
        if (this.isTeacher && this.AdminSelectedActiveAcademicYearID) {
          this.autoLoadTeacherTimetable();
        }
        onDone?.();
      },
      error: () => onDone?.()
    });
  }

  /**
   * Executes the operation: autoLoadTeacherTimetable
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  autoLoadTeacherTimetable() {
    this.AdminselectedSchoolID = this.getCurrentSchoolId();
    this.AdminselectedAcademivYearID = this.AdminSelectedActiveAcademicYearID || '';
    this.FetchInitialData();
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
      this.AdminSelectedActiveAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';
      if (!this.AdminselectedSchoolID) {
        this.AdminselectedSchoolID = sessionStorage.getItem('SchoolID') || sessionStorage.getItem('schoolId') || '';
      }
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
              this.FetchStaffBySchoolAcademicYearList(); 
            }
            this.FetchWorkingdaysList();
            this.FetchSessionsList();
          }      
        } else {
          this.FetchAcademicYearsList();
          if(!this.isAdmin){
            this.ClassDivisionForm.get('AcademicYear').patchValue(this.AdminSelectedActiveAcademicYearID);
            if (this.isTeacher) {
              this.resolveStaffIdentity();
            } else {
              this.FetchStaffBySchoolAcademicYearList(); 
            }
            this.FetchWorkingdaysList();
            this.FetchSessionsList();
          }
        }
      this.ClassDivisionForm.get('School').patchValue('0');
      this.ClassDivisionForm.get('Class').patchValue('0');
      this.ClassDivisionForm.get('Division').patchValue('0');
      this.ClassDivisionForm.get('WorkingDay').patchValue('0');
      this.ClassDivisionForm.get('TimeSlot').patchValue('0');
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
    StaffTimeTableListList: any[] =[];
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
    FreeStaffList:any[] = [];
    WorkingDaysList:any[] = [];
    TimeSlotList:any[] = [];
    FreeStaffListByTimeSlot:any[] = [];
    AdminselectedSchoolID:string = '';
    AdminselectedAcademivYearID:string = '';
    AdminselectedWorkingDayID:string = '';
    AdminselectedClassID:string = '';
    selectedStartTime: string = '';
    selectedEndTime: string = '';
    AdminselectedClassDivisionID:string = '';
    SelectedTransitionID:string = '';
    AdminSelectedActiveAcademicYearID:string = sessionStorage.getItem('ActiveAcademicYearID') || '';
  
    ClassDivisionForm: any = new FormGroup({
      ID: new FormControl(),
      Class: new FormControl(0,[Validators.required,Validators.min(1)]),
      WorkingDay: new FormControl(),
      TimeSlot: new FormControl(),
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

              if (!this.AdminSelectedActiveAcademicYearID && this.academicYearList.length > 0) {
                const activeYear = this.academicYearList.find(y => y.IsActive === "Active") || this.academicYearList[0];
                this.AdminSelectedActiveAcademicYearID = activeYear.ID;
                sessionStorage.setItem('ActiveAcademicYearID', activeYear.ID);
              }

              if (!this.isAdmin) {
                this.ClassDivisionForm.get('AcademicYear').patchValue(this.AdminSelectedActiveAcademicYearID);
              }
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
            this.FetchStaffBySchoolAcademicYearList(); 
            this.FetchWorkingdaysList();
            this.FetchSessionsList();
          }      
        }  
        this.ClassDivisionForm.get('School').patchValue('0');
        this.ClassDivisionForm.get('Class').patchValue('0');
        this.ClassDivisionForm.get('Division').patchValue('0');
        this.ClassDivisionForm.get('WorkingDay').patchValue('0');
        this.ClassDivisionForm.get('TimeSlot').patchValue('0');
        this.IsFliterClicked=false;
        this.isViewModalOpen=false;
      }            
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
      this.StaffList=[];     
      this.Workingdays=[];  
      this.ClassDivisionForm.get('Class').patchValue('0');
      this.ClassDivisionForm.get('WorkingDay').patchValue('0');
      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      if(schoolID=="0"){
        this.AdminselectedAcademivYearID="";
      }else{
        this.AdminselectedAcademivYearID = schoolID;
      }    
      this.FetchStaffBySchoolAcademicYearList(); 
      this.FetchWorkingdaysList();     
    };

  /**
   * Executes the operation: onAdminWorkingDayChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
    onAdminWorkingDayChange(event: Event) { 
      this.TimeSlotList=[];
      this.ClassDivisionForm.get('TimeSlot').patchValue('0');
      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      if(schoolID=="0"){
        this.AdminselectedWorkingDayID="";
      }else{
        this.AdminselectedWorkingDayID = schoolID;
      }    
      this.FetchTimeSlotsBySchoolAcademicYearList();  
    };

  /**
   * Executes the operation: FetchStaffBySchoolAcademicYearList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    FetchStaffBySchoolAcademicYearList() {
      const AcademicYearIdSelected =
    this.isAdmin
      ? this.AdminselectedAcademivYearID?.trim()
      : this.AdminSelectedActiveAcademicYearID || '';

      const requestData = { 
        SchoolID: this.AdminselectedSchoolID,
        AcademicYear: AcademicYearIdSelected,
        Flag: '9'
      };

      this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', requestData)
        .subscribe(
          (response: any) => {
            if (response && Array.isArray(response.data)) {
              this.StaffList = response.data.map((item: any) => {
                const isActiveString = item.isActive === "1" ? "Active" : "InActive";
                return {
                  ID: item.id,
                  Name: `${item.firstName} ${item.middleName ?? ''} ${item.lastName ?? ''} - ${item.email}`,
                  Email:item.email,
                  SchoolName:item.schoolName,
                  AcademicYearName:item.academicYearName
                };
              });
            } else {
              this.StaffList = [];
            }
          },
          (error) => {
            this.StaffList = [];
          }
        );
    }

  /**
   * Executes the operation: FetchTimeSlotsBySchoolAcademicYearList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    FetchTimeSlotsBySchoolAcademicYearList() {
      const AcademicYearIdSelected =
    this.isAdmin
      ? this.AdminselectedAcademivYearID?.trim()
      : this.AdminSelectedActiveAcademicYearID || '';

      const requestData = { 
        SchoolID: this.AdminselectedSchoolID,
        AcademicYear: AcademicYearIdSelected,
        DayID: this.AdminselectedWorkingDayID,
        Flag: '10'
      };

      this.apiurl.post<any>('Tbl_TimeTable_CRUD_Operations', requestData)
        .subscribe(
          (response: any) => {
            if (response && Array.isArray(response.data)) {
              this.TimeSlotList = response.data.map((item: any) => {
                const isActiveString = item.isActive === "1" ? "Active" : "InActive";
                return {
                  StartTime: item.startTime,
                  EndTime:item.endTime,
                  TimeSlot:item.timeSlot
                };
              });
            } else {
              this.TimeSlotList = [];
            }
          },
          (error) => {
            this.TimeSlotList = [];
          }
        );
    }    
  
  /**
   * Executes the operation: onAdminClassChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
    onAdminClassChange(event: Event) { 
      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      if(schoolID=="0"){
        this.AdminselectedClassID="";
      }else{
        this.AdminselectedClassID = schoolID;
      }      
    };

  /**
   * Executes the operation: onAdminTimeSlotChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
    onAdminTimeSlotChange(event: Event) { 
      const target = event.target as HTMLSelectElement;
      const value = target.value;

      if (value === 'ALL') {
        this.selectedStartTime = '';
        this.selectedEndTime = '';
        return;
      }

      const parts = value.split('|');

      this.selectedStartTime = parts[0];
      this.selectedEndTime = parts[1];
    };

  /**
   * Executes the operation: FetchFreeStaff
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    FetchFreeStaff() {
      const AcademicYearIdSelected =
    this.isAdmin
      ? this.AdminselectedAcademivYearID?.trim()
      : this.AdminSelectedActiveAcademicYearID || '';

      const requestData = { 
        SchoolID: this.AdminselectedSchoolID,
        AcademicYear: AcademicYearIdSelected,
        StartTime: this.selectedStartTime,
        EndTime: this.selectedEndTime,
        DayID: this.AdminselectedWorkingDayID,
        Flag: '11'
      };

      this.apiurl.post<any>('Tbl_TimeTable_CRUD_Operations', requestData)
        .subscribe(
          (response: any) => {
            if (response && Array.isArray(response.data)) {
              this.FreeStaffList = response.data.map((item: any) => {
                const isActiveString = item.isActive === "1" ? "Active" : "InActive";
                return {
                  ID: item.staffID,
                  Name:item.staffName,
                  Email:item.staffEmail
                };
              });
            } else {
              this.FreeStaffList = [];
            }
          },
          (error) => {
            this.FreeStaffList = [];
          }
        );
    }

    private originalPeriodsBackup: {
      [dayID: string]: any[]
    } = {};

  /**
   * Executes the operation: generateTimetable
   * Parameters: periodCount: number
   * Rationale: Standard operational controller for the active view.
   */
    generateTimetable(periodCount: number) {

      const timetableArray = this.ClassDivisionForm.get('Timetable') as FormArray;
      //timetableArray.clear();

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
      this.IsFliterClicked=false;
      if(this.AdminselectedClassID && this.AdminselectedClassID!="1" && !this.selectedStartTime && !this.selectedEndTime){
        const controlsToValidate = ['Class', 'School', 'AcademicYear'];
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

        this.StudentsList=[];
        this.FetchInitialData();
      }
      else if(this.selectedStartTime && this.selectedEndTime){
        if(this.AdminselectedClassID && this.AdminselectedClassID!="1"){
          const controlsToValidate = ['Class', 'School', 'AcademicYear'];
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

          this.StudentsList=[];
          this.FetchStaffInitialData();
        }
        else{
          const controlsToValidate = ['TimeSlot', 'School', 'AcademicYear'];
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
          this.FreeStaffList=[];
          this.FetchFreeStaff();
        }         
      }
      else{
        const controlsToValidate = ['School', 'AcademicYear'];
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
        this.StaffList=[];
        this.FetchStaffBySchoolAcademicYearList();
      }
    }

  /**
   * Executes the operation: viewReview
   * Parameters: ID: string
   * Rationale: Standard operational controller for the active view.
   */
    viewReview(ID: string): void {
      this.FetchInitialData({ ID });
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
      const flag = isSearch ? '7' : '9';
  
      let SchoolIdSelected = '';
  
      if (this.SchoolSelectionChange) {
        SchoolIdSelected = this.selectedSchoolID.trim();
      }
  
      const cursor =
        !extra.offset && this.currentPage > 1
          ? this.pageCursors[this.currentPage - 2] || null
          : null;

      const AcademicYearIdSelected =
    this.isAdmin
      ? this.AdminselectedAcademivYearID?.trim()
      : this.AdminSelectedActiveAcademicYearID || '';
  
      this.loader.show();
  
      this.FetchAcademicYearCount(isSearch).subscribe({
        next: (countResp: any) => {
          this.ClassDivisionCount = countResp?.data?.[0]?.totalcount ?? 0;
  
          const payload: any = {
            SchoolID:this.AdminselectedSchoolID,
            AcademicYear:AcademicYearIdSelected,
            Flag: flag,
            ...extra
          };

          if (!extra.ID) {
            payload.ID = this.isTeacher ? this.currentUserId : this.AdminselectedClassID;
          }
  
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
      const data = response?.data || [];

      this.StudentsList = data;

      this.buildStaffTimetable(data);

      this.generatePeriodHeaders();

      if (!this.isTeacher) {
        this.isViewModalOpen = true;
      }

      console.log('this.StudentsList',this.StudentsList);
    };

  /**
   * Executes the operation: FetchStaffInitialData
   * Parameters: extra: any = {}
   * Rationale: Standard operational controller for the active view.
   */
    FetchStaffInitialData(extra: any = {}) {
      const isSearch = !!this.searchQuery?.trim();
      const flag = isSearch ? '7' : '12';
  
      let SchoolIdSelected = '';
  
      if (this.SchoolSelectionChange) {
        SchoolIdSelected = this.selectedSchoolID.trim();
      }
  
      const cursor =
        !extra.offset && this.currentPage > 1
          ? this.pageCursors[this.currentPage - 2] || null
          : null;

      const AcademicYearIdSelected =
    this.isAdmin
      ? this.AdminselectedAcademivYearID?.trim()
      : this.AdminSelectedActiveAcademicYearID || '';
  
      this.loader.show();
  
      this.FetchAcademicYearCount(isSearch).subscribe({
        next: (countResp: any) => {
          this.ClassDivisionCount = countResp?.data?.[0]?.totalcount ?? 0;
  
          const payload: any = {
            SchoolID:this.AdminselectedSchoolID,
            AcademicYear:AcademicYearIdSelected,
            StartTime: this.selectedStartTime,
            EndTime: this.selectedEndTime,
            DayID: this.AdminselectedWorkingDayID,
            Flag: flag,
            ...extra
          };

          if (!extra.ID) {
            payload.ID = this.isTeacher ? this.currentUserId : this.AdminselectedClassID;
          }
  
          if (isSearch) payload.Class = this.searchQuery.trim();
  
          this.apiurl.post<any>('Tbl_TimeTable_CRUD_Operations', payload).subscribe({
            next: (response: any) => {
              const data = response?.data || [];
              this.mapStaffAcademicYears(response);
  
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
   * Executes the operation: mapStaffAcademicYears
   * Parameters: response: any
   * Rationale: Standard operational controller for the active view.
   */
    mapStaffAcademicYears(response: any) {
      const data = response?.data || [];

      this.StudentsList = data;

      this.buildStaffTimetable(data);

      this.generatePeriodHeaders();

      if (!this.isTeacher) {
        this.isViewModalOpen = true;
      }

      console.log('this.StudentsList',this.StudentsList);
    };

  /**
   * Executes the operation: generatePeriodHeaders
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    generatePeriodHeaders() {
      const timetableArray = this.timetableArray;

      if (!timetableArray || timetableArray.length === 0) {
        this.periodHeaders = [];
        return;
      }

      const periodCount = (timetableArray.at(0).get('Periods') as FormArray).length;

      this.periodHeaders = [];

      for (let i = 0; i < periodCount; i++) {

        let startTime = '';
        let endTime = '';

        // search all days for this period
        for (let day = 0; day < timetableArray.length; day++) {

          const periods = timetableArray.at(day).get('Periods') as FormArray;
          const period = periods.at(i);

          const start = period?.get('StartTime')?.value;
          const end = period?.get('EndTime')?.value;

          if (start && end) {
            startTime = start;
            endTime = end;
            break;
          }
        }

        if (startTime && endTime) {
          this.periodHeaders.push(`Period ${i + 1}\n${startTime} - ${endTime}`);
        } else {
          this.periodHeaders.push(`Period ${i + 1}`);
        }
      }
    };

  /**
   * Executes the operation: buildStaffTimetable
   * Parameters: details: any[]
   * Rationale: Standard operational controller for the active view.
   */
    buildStaffTimetable(details: any[]) {
      const timetableArray = this.timetableArray;
      timetableArray.clear();

      const grouped: any = {};
      let maxPeriod = 8;

      if (details && details.length > 0) {
        details.forEach(d => {
          const dayId = d.dayID?.toString();
          if (!grouped[dayId]) {
            grouped[dayId] = [];
          }
          grouped[dayId].push(d);
          const pNo = Number(d.periodNo || 0);
          if (pNo > maxPeriod) {
            maxPeriod = pNo;
          }
        });
      }

      const allPeriods: number[] = [];
      for (let i = 1; i <= maxPeriod; i++) {
        allPeriods.push(i);
      }

      this.Workingdays.forEach(workingDay => {
        const dayID = workingDay.ID.toString();
        const dayName = workingDay.Day;

        const dayGroup = new FormGroup({
          DayID: new FormControl(dayID),
          Day: new FormControl(dayName),
          Periods: new FormArray([])
        });

        const periodsArray = dayGroup.get('Periods') as FormArray;
        const dayPeriods = grouped[dayID] || [];

        allPeriods.forEach(periodNo => {
          const p = dayPeriods.find((x:any)=>Number(x.periodNo) === periodNo);

          periodsArray.push(
            new FormGroup({
              Session: new FormControl(p?.sessionID || ''),
              StartTime: new FormControl(p?.startTime?.substring(0,5) || ''),
              EndTime: new FormControl(p?.endTime?.substring(0,5) || ''),
              Subject: new FormControl(p?.subjectName || ''),
              Staff: new FormControl(p?.staffID || ''),
              ClassName: new FormControl(p?.className || ''),
              DivisionName: new FormControl(p?.divisionName || ''),
              StaffList: new FormControl([])
            })
          );
        });

        timetableArray.push(dayGroup);
      });
    }
  
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


          this.loadAllDropdowns().then(() => {
            this.buildTimetableFromDetails(data.timeTableDetails);
            this.generatePeriodHeaders();

            if (mode === 'view') {
              setTimeout(() => {
                this.isViewMode = true;
                this.isViewModalOpen = true;
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

  /**
   * Executes the operation: loadAllDropdowns
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    loadAllDropdowns(): Promise<void> {
      return new Promise((resolve) => {

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

      if (!details || details.length === 0) return;

      const grouped: any = {};

      details.forEach(d => {
        const dayId = d.dayID?.toString();
        if (!grouped[dayId]) grouped[dayId] = [];
        grouped[dayId].push(d);
      });

      Object.keys(grouped).forEach(dayID => {

        const workingDay = this.Workingdays.find(
          x => x.ID.toString() === dayID
        );

        const dayName = workingDay ? workingDay.Day : dayID;

        const dayGroup = new FormGroup({
          DayID: new FormControl(dayID),
          Day: new FormControl(dayName),
          Periods: new FormArray([])
        });

        const periodsArray = dayGroup.get('Periods') as FormArray;

        grouped[dayID]
          .sort((a: any, b: any) => a.periodNo - b.periodNo)
          .forEach((p: any) => {

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

            // 🔥 Load staff list if subject already exists (EDIT MODE)
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

                  // 🔥 Re-set existing staff AFTER list loads
                  periodGroup.patchValue({
                    Staff: p.staffID ? p.staffID.toString() : 0
                  });

                });

            }

            periodsArray.push(periodGroup);
          });

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

      const requestData = { 
        SchoolID: this.AdminselectedSchoolID,
        AcademicYear: this.AdminselectedAcademivYearID,
        SubjectID: subjectID,
        ClassID: classID,
        Flag: '12'
      };

      return this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', requestData);
    }

    periodHeaders: string[] = [];

    

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

        <title>Time Table</title>

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
        </div>

        ${printContents}

      </body>

      </html>
      `);

      popup.document.close();
      popup.print();

    }
}
