import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
  selector: 'app-examresults',
 standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './examresults.component.html',
  styleUrl: './examresults.component.css'
})
/**
 * Class Responsibility: Handles view logic and user interactions for ExamresultsComponent.
 */
export class ExamresultsComponent extends BasePermissionComponent implements OnInit{
   pageName = 'Exam Results';

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
      this.SchoolSelectionChange = false;
      this.initializeUserRole();
      this.AdminSelectedActiveAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';
      if (this.isAdmin) {
        this.FetchSchoolsList();
        this.SyllabusForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
        this.SyllabusForm.get('School').patchValue('0');
        this.SyllabusForm.get('AcademicYear').patchValue('0');
      } else {
        this.SyllabusForm.get('School')?.clearValidators();
        this.SyllabusForm.get('AcademicYear')?.disable({ emitEvent: false });
      }

      if (this.isTeacher) {
        this.AdminselectedSchoolID = this.resolvedSchoolId || this.ss('SchoolID') || this.ss('schoolId');
        this.resolveStaffIdentity();
        this.FetchAcademicYearsList();
        
        // Lock selections for teacher
        this.SyllabusForm.get('School').clearValidators();
        this.SyllabusForm.get('School').updateValueAndValidity();
        this.SyllabusForm.get('Class').disable({ emitEvent: false });
        this.SyllabusForm.get('Divisions').disable({ emitEvent: false });
      } else {
        this.FetchSchoolsList();
        if(this.AdminselectedSchoolID==''){
          this.FetchAcademicYearsList();
          if(!this.isAdmin){
            this.SyllabusForm.get('AcademicYear').patchValue(this.AdminSelectedActiveAcademicYearID);
            this.FetchExamsList();
            this.FetchClassList();
          } 
        }
      }
    };
  
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
  
    IsAddNewClicked: boolean = false;
    IsActiveStatus: boolean = false;
    ViewSyllabusClicked: boolean = false;
    currentPage = 1;
    pageSize = 5;
    visiblePageCount: number = 3;
    searchQuery: string = '';
    private searchTimer: any;
    private readonly SEARCH_MIN_LENGTH = 3;
    private readonly SEARCH_DEBOUNCE = 300;
    SyllabusList: any[] = [];
    examResultsList: any[] = [];
    isViewMode = false;
    viewSyllabus: any = null;
    AminityInsStatus: any = '';
    isModalOpen = false;
    isViewModalOpen = false;
    SyllabusCount: number = 0;
    ActiveUserId: string = localStorage.getItem('email')?.toString() || '';
    roleId = localStorage.getItem('RollID');
  
    pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
    lastCreatedDate: string | null = null;
    lastID: number | null = null;
    private paginationLoaderTimer: any;
  
    sortColumn: string = 'ExamTypeName';
    sortDirection: 'asc' | 'desc' = 'desc';
    editclicked: boolean = false;
    schoolList: any[] = [];
    selectedSchoolID: string = '';
    selectedAcademicYearID: string = '';
    selectedClassID: string = '';
    SchoolSelectionChange:boolean=false;
    SchoolAcademicYearChange:boolean=false;
    SchoolClassChange:boolean=false;
    isTableModalOpen = false;
    academicYearList :any[]= [];
  
    classLists:any[] = [];
    examLists:any[]=[];
    divisionsList:any[] = [];
    examslist:any[] =[];
    studentsList:any[]=[];
    studentReport:any[]=[];
    hasSubmittedSearch: boolean = false;
  
  
    AdminselectedSchoolID: string = '';
    AdminselectedAcademivYearID: string = '';
    AdminselectedClassID:string ='';
    AdminselectedDiviosnID:string = '';
    AdminselecteExamID:string = '';
    AdminselectedStudentID:string='';
    teacherAssignedClassID: string = '';
    teacherAssignedDivisionID: string = '';
    resolvedStaffId: string = '';
    AdminSelectedActiveAcademicYearID:string = sessionStorage.getItem('ActiveAcademicYearID') || '';
  
  
    SyllabusForm :any= new FormGroup({
      ID: new FormControl(''),
      SchoolID:new FormControl(''),
      Student: new FormControl('0'),
      Divisions: new FormControl('0'),
      Class: new FormControl('0'),
      ExamType: new FormControl('0', [Validators.required, Validators.min(1)]),
      School: new FormControl('0'),
      AcademicYear: new FormControl('0', [Validators.required, Validators.min(1)])
    });
  
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
  
    // ── session helpers ──────────────────────────────────────────────────────────
  public ss(key: string) {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
  }

  // Dynamic Role Getters based on Names
  get currentRoleName(): string { return (this.ss('roleName') || this.ss('RoleName') || this.ss('rollName') || this.ss('RollName') || '').trim(); }
  get currentRollID(): string { return (this.ss('RollID') || this.ss('rollID') || this.ss('menuRoleId') || this.ss('RoleID') || '').trim(); }

  protected override get isAdmin(): boolean { return this.currentRollID === '1'; }

  // In this project, School Admin/Principal is '2' or '8'. 
  get isSchoolAdmin(): boolean {
    const r = this.currentRoleName.toLowerCase();
    const id = this.currentRollID;
    return !this.isAdmin && (id === '2' || id === '8' || r.includes('admin') || r.includes('principal') || r.includes('management'));
  }

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
    return this.AdminselectedSchoolID || '';
  }

  // Parent-specific properties
  parentChildren: Array<{ ID: string; AdmissionNo: string; Name: string; Class: string; Division: string; SchoolID: string }> = [];
  selectedChildId: string = '';
  selectedChildIndex: number = 0;

  /**
   * Executes the operation: selectChild
   * Parameters: index: number
   * Rationale: Standard operational controller for the active view.
   */
  selectChild(index: number): void {
    this.selectedChildIndex = index;
    const child = this.parentChildren[index];
    if (!child) return;
    this.selectedChildId = child.ID;
    this.AdminselectedStudentID = child.ID;
    this.AdminselectedClassID = child.Class;
    this.AdminselectedDiviosnID = child.Division;
    this.SyllabusForm.patchValue({
      Student: child.ID,
      Class: child.Class,
      Divisions: child.Division
    });
    this.resetResultView();
    if (this.AdminselecteExamID) {
      this.hasSubmittedSearch = true;
      this.FetchExamResultsList();
    }
  }

  /**
   * Executes the operation: initializeUserRole
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private initializeUserRole(): void {
    if (this.isParent) {
      // Auto-set school ID from session for parents
      this.AdminselectedSchoolID = this.resolvedSchoolId;
      // Don't fetch children immediately - wait for academic year to be selected
    }
  }

  /**
   * Executes the operation: fetchParentChildren
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private fetchParentChildren(): void {
    const parentEmail = (this.ss('email') || '').toString().trim();
    if (!parentEmail) return;

    const payload = {
      Flag: '9',
      FatherEmail: parentEmail,
      MotherEmail: parentEmail,
      AcademicYear: this.AdminselectedAcademivYearID || ''
    };

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
            SchoolID:     String(schoolId),
            StudentName:String(studentName),
          };
        }).filter(c => c.ID && c.AdmissionNo);

        // Don't auto-select - let parent choose manually
        // Reset selection to show placeholder
        this.selectedChildId = '';
        this.AdminselectedStudentID = '';
        this.AdminselectedClassID = '';
        this.AdminselectedDiviosnID = '';
        
        // Reset form values to show placeholders
        this.SyllabusForm.patchValue({
          Student: '',
          Class: '',
          Divisions: ''
        });

        // Auto-select first child
        if (this.parentChildren.length > 0) {
          this.selectChild(0);
        }
      },
      error: () => { this.parentChildren = []; }
    });
  }

  /**
   * Executes the operation: onChildChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onChildChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const childId = target.value;
    this.selectedChildId = childId || '';
    
    const selectedChild = this.parentChildren.find(c => c.ID === childId);
    if (selectedChild) {
      this.AdminselectedStudentID = selectedChild.ID;
      this.AdminselectedClassID = selectedChild.Class;
      this.AdminselectedDiviosnID = selectedChild.Division;
      
      // Update form values
      this.SyllabusForm.patchValue({
        Student: selectedChild.ID,
        Class: selectedChild.Class,
        Divisions: selectedChild.Division
      });
      
      // Reset results and fetch new ones
      this.resetResultView();
      this.FetchExamResultsList();
    } else {
      // Reset if no child selected
      this.AdminselectedStudentID = '';
      this.AdminselectedClassID = '';
      this.AdminselectedDiviosnID = '';
      
      this.SyllabusForm.patchValue({
        Student: '',
        Class: '',
        Divisions: ''
      });
      
      this.resetResultView();
    }
  }

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

  /**
   * Executes the operation: resolveStaffIdentity
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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
          console.log('[EXAM RESULTS] Resolved Teacher StaffID:', this.resolvedStaffId);
        }
      },
      complete: () => {
        if (this.isTeacher && !this.currentUserId) {
          console.warn('[EXAM RESULTS] Teacher StaffID could not be resolved from session/email mapping.');
        }
        if (this.isTeacher && this.AdminselectedAcademivYearID) {
          this.syncTeacherClassDivisionFromAllocation(() => {
            this.FetchExamsList();
            this.FetchClassStudentsList();
          });
        }
      }
    });
  }

  private syncTeacherClassDivisionFromAllocation(onDone?: () => void): void {
    if (!this.isTeacher) {
      onDone?.();
      return;
    }

    const AcademicYearIdSelected =
    this.isAdmin
      ? (
          this.SchoolAcademicYearChange
            ? this.selectedAcademicYearID?.trim()
            : this.AdminselectedAcademivYearID?.trim()
        )
      : this.AdminSelectedActiveAcademicYearID || '';

    const schoolId = this.getCurrentSchoolId();
    const academicYear = AcademicYearIdSelected || '';
    const staffId = this.currentUserId || '';

    if (!schoolId || !academicYear || !staffId) {
      onDone?.();
      return;
    }

    this.apiurl.post<any>('Tbl_AllotClassTeacher_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: academicYear,
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
        const className = String(match?.className ?? match?.ClassName ?? '').trim();
        const divisionName = String(match?.divisionName ?? match?.DivisionName ?? '').trim();

        if (classId) {
          this.teacherAssignedClassID = classId;
          this.AdminselectedClassID = classId;
          this.classLists = [{
            ID: classId,
            Name: className || `Class ${classId}`,
            Division: divisionName || ''
          }];
        }

        if (divisionId) {
          this.teacherAssignedDivisionID = divisionId;
          this.AdminselectedDiviosnID = divisionId;
          this.divisionsList = [{
            ID: divisionId,
            Name: divisionName || `Division ${divisionId}`
          }];
        }

        this.SyllabusForm.patchValue({
          Class: this.AdminselectedClassID || '0',
          Divisions: this.AdminselectedDiviosnID || '0'
        });
      },
      complete: () => onDone?.(),
      error: () => onDone?.()
    });
  }

        
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

      const requestData = { 
        SchoolID:schoolId,
        Flag: '2' 
      };
  
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

              // Auto-select active academic year for teachers
              if (this.isTeacher && this.AdminSelectedActiveAcademicYearID) {
                const match = this.academicYearList.find(
                  y => y.ID === this.AdminSelectedActiveAcademicYearID
                );
                if (match) {
                  this.AdminselectedAcademivYearID = match.ID;
                  this.SyllabusForm.get('AcademicYear')?.patchValue(match.ID);
                } else if (this.academicYearList.length > 0) {
                  this.AdminselectedAcademivYearID = this.academicYearList[0].ID;
                  this.SyllabusForm.get('AcademicYear')?.patchValue(this.academicYearList[0].ID);
                }
                // Now that year is set, sync allocation and fetch exams/students
                if (this.AdminselectedAcademivYearID && this.currentUserId) {
                  this.syncTeacherClassDivisionFromAllocation(() => {
                    this.FetchExamsList();
                    this.FetchClassStudentsList();
                  });
                }
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

  /**
   * Executes the operation: FetchClassList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchClassList() {
    const AcademicYearIdSelected =
    this.isAdmin
      ? (
          this.SchoolAcademicYearChange
            ? this.selectedAcademicYearID?.trim()
            : this.AdminselectedAcademivYearID?.trim()
        )
      : this.AdminSelectedActiveAcademicYearID || '';
      
    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: AcademicYearIdSelected || '',
      Flag: '9'
    };
    this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.classLists = response.data.map((item: any) => {
              return {
               ID: item.sNo.toString(),
               Name: item.syllabusClassName,
               Division: item.class
              };
            });
          } else {
            this.classLists = [];
          }
        },
        (error) => {
          this.classLists = [];
        }
      );
  }

  /**
   * Executes the operation: FetchExamsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchExamsList() {
    const AcademicYearIdSelected =
    this.isAdmin
      ? (
          this.SchoolAcademicYearChange
            ? this.selectedAcademicYearID?.trim()
            : this.AdminselectedAcademivYearID?.trim()
        )
      : this.AdminSelectedActiveAcademicYearID || '';

    if (this.isTeacher) {
      if (!this.AdminselectedAcademivYearID || !this.currentUserId) {
        this.examLists = [];
        return;
      }

      const teacherPayload: any = {
        SchoolID: this.AdminselectedSchoolID || '',
        AcademicYear: AcademicYearIdSelected || '',
        Divisions: this.teacherAssignedDivisionID || this.AdminselectedDiviosnID || '',
        StaffID: this.currentUserId || '-1',
        Flag: '12'
      };

      this.apiurl.post<any>('Tbl_SetExam_CRUD_Operations', teacherPayload)
        .subscribe(
          (response: any) => {
            const rows = Array.isArray(response?.data) ? response.data : [];
            const byId = new Map<string, any>();

            rows.forEach((item: any) => {
              const id = String(item?.examType ?? item?.ExamType ?? item?.examTypeID ?? item?.ExamTypeID ?? '').trim();
              const name = String(item?.examTypeName ?? item?.ExamTypeName ?? item?.examType ?? item?.ExamType ?? '').trim();
              if (!id) return;
              if (!byId.has(id)) {
                byId.set(id, { ID: id, Name: name || `Exam ${id}` });
              }
            });

            this.examLists = Array.from(byId.values());
            console.log('[EXAM RESULTS] Teacher exam list (Flag 12):', this.examLists);
          },
          () => {
            this.examLists = [];
          }
        );
      return;
    }

    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: AcademicYearIdSelected,
      Flag: '3'
    };
   
    this.apiurl.post<any>('Tbl_Examtype_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.examLists = response.data.map((item: any) => {
              return {
                ID: item.id,
                Name: item.examType,
                Priority: item.priority,
                MaxMark: item.maxMark,
                PassMarks: item.passMarks,
                ExamDuration: item.examDuration,
                NoofQuestion: item.noofQuestion,
                Instructions: item.instructions
              };
            });
          } else {
            this.examLists = [];
          }
        },
        (error) => {
          this.examLists = [];
        }
      );
  }

  /**
   * Executes the operation: FetchMarkDetailReport
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchMarkDetailReport() {
    const AcademicYearIdSelected =
    this.isAdmin
      ? (
          this.SchoolAcademicYearChange
            ? this.selectedAcademicYearID?.trim()
            : this.AdminselectedAcademivYearID?.trim()
        )
      : this.AdminSelectedActiveAcademicYearID || '';

    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: AcademicYearIdSelected,
      Class: this.AdminselectedClassID || '',
      Division: this.AdminselectedDiviosnID || '',
      ExamID: this.AdminselecteExamID || '',
      AdmissionID: this.AdminselectedStudentID || '',
      Flag: '10'
    };
   
    this.apiurl.post<any>('Tbl_ExamMarks_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
  
          if (response && Array.isArray(response.data)) {
            console.log(response);
  
  
            this.studentReport = response.data.map((item: any) => {
                              console.log(this.examLists)
  
  
  
              const isActiveString =
                item.isActive === "1" || item.isActive === "True"
                  ? "Active"
                  : "InActive";
                  
  
              return {
               ID: item.id,
               Name: item.studentName,
               AdmissionID:item.admissionID,
               SubjectName: item.subjectName,
               ExamType: item.examName || item.examType || item.examTypeName,

               SubjectResult: item.subjectResult,
               SubjectPercentage: item.subjectPercentage,
               TotalMarks:item.totalMarks,
               TotalMaxMarks :item.totalMaxMarks,
               TotalPercentage:item.totalPercentage,
               ExamDuration:item.examDuration,
               NoofQuestion:item.noofQuestion,
               Instructions:item.instructions,
               Class: item.className, 
               MaxMarks:item.maxMarks,         
               PassMarks:item.passMarks,
               Divisions: item.divisionName,
               SchoolName: item.schoolName,
               AcademicYearName: item.academicYearName,
               SubjectMarks:item.subjectMarks,
               
              };
            });
           this.viewSyllabus = this.studentReport[0];
                     this.isViewModalOpen = true;



        } else {
          this.studentReport = [];
        }
      },
      (error) => {
        this.studentReport = [];
      }
    );
  }

  /**
   * Executes the operation: FetchDivisionsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchDivisionsList() {
    const AcademicYearIdSelected =
    this.isAdmin
      ? (
          this.SchoolAcademicYearChange
            ? this.selectedAcademicYearID?.trim()
            : this.AdminselectedAcademivYearID?.trim()
        )
      : this.AdminSelectedActiveAcademicYearID || '';

    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: AcademicYearIdSelected,
      Class :this.AdminselectedClassID || '',
      Flag: '3'
    };
   
    this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
  
          if (response && Array.isArray(response.data)) {
            console.log(response);
  
  
            this.divisionsList = response.data.map((item: any) => {
                              console.log(this.divisionsList)
  
  
              const isActiveString =
                item.isActive === "1" || item.isActive === "True"
                  ? "Active"
                  : "InActive";
  
              return {
               ID: item.id,
               Name: item.name,
              };
  
            });
  
          } else {
            this.divisionsList = [];
          }
  
        },
        (error) => {
          this.divisionsList = [];
        }
      );
  }
  
  /**
   * Executes the operation: FetchExamsbyclassanddivisionList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchExamsbyclassanddivisionList() {
    const AcademicYearIdSelected =
    this.isAdmin
      ? (
          this.SchoolAcademicYearChange
            ? this.selectedAcademicYearID?.trim()
            : this.AdminselectedAcademivYearID?.trim()
        )
      : this.AdminSelectedActiveAcademicYearID || '';

    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: AcademicYearIdSelected,
      Class :this.AdminselectedClassID || '',
      Divisions :this.AdminselectedDiviosnID || '',
      ExamType :this.AdminselecteExamID || '',
      Flag: '3'
    };
   
    this.apiurl.post<any>('Tbl_SetExam_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
  
          if (response && Array.isArray(response.data)) {
            console.log(response);
  
  
            this.examslist = response.data.map((item: any) => {
                              console.log(this.examslist)
  
  
              const isActiveString =
                item.isActive === "1" || item.isActive === "True"
                  ? "Active"
                  : "InActive";
                    let displayExamType = item.examTypeName;
      
      
                  const formattedExamDate = item.examDateAndTime
                ? item.examDateAndTime
                    .split(',')
                    .map((d: string) =>
                      new Date(d).toLocaleString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })
                    )
                    .join(' | ')
                : '';
  
              return {
                ID: item.id,
                SchoolID: item.schoolID,
                Syllabus: item.syllabus,
                Class: item.className,          
                Divisions: item.divisionName,
                ExamType: displayExamType,
                ExamTypeID: item.examType,
                Subjects: item.subjectName,
                SchoolName: item.schoolName,
                MaxMarks: item.maxMarks,
                PassMarks: item.passMarks,
                ExamDateAndTime: formattedExamDate,
                Duration: item.duration,
                NoOfQuestion: item.noOfQuestion,
                Instructions: item.instructions,
                IsActive: item.isActive === "True" || item.isActive === "1" ? 'Active' : 'InActive',
                AcademicYearName: item.academicYearName
              };
  
            });
  
          } else {
            this.examslist = [];
          }
  
        },
        (error) => {
          this.examslist = [];
        }
      );
  }
  /**
   * Executes the operation: FetchClassStudentsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    FetchClassStudentsList() {
    const requestClass = this.isTeacher ? this.teacherAssignedClassID : (this.AdminselectedClassID || '');
    const requestDivision = this.isTeacher ? this.teacherAssignedDivisionID : (this.AdminselectedDiviosnID || '');

    const requestData = { 
            SchoolID:this.AdminselectedSchoolID || '',
            AcademicYear:this.AdminselectedAcademivYearID || '',
            Class:requestClass,
            Division:requestDivision,
            Flag: '3' };

    this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.studentsList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.admissionNo,
                School:item.schoolID,
                AcademicYear: item.academicYear,
                AdmissionNo:item.admissionNo,
                Class: item.className,
                Division: item.classDivisionName,
                FirstName: item.firstName,
                MiddleName: item.middleName,
                LastName: item.lastName,
                ClassName: item.className,
                SchoolName:item.schoolName,
                AcademicYearName:item.academicYearName,
                Name: `${item.admissionNo ?? ''} - ${item.firstName ?? ''} ${item.middleName ?? ''} ${item.lastName ?? ''}`.replace(/\s+/g, ' ').trim(),
                ClassDivisionName:item.classDivisionName,
                IsActive: isActiveString,
                IsPresent: true,
                Marks: ''   

              };
            });

          } else {
            this.studentsList = [];
          }
        },
        (error) => {
          this.studentsList = [];
        }
      );
  };
  
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
  
      return this.apiurl.post<any>('Tbl_SetExam_CRUD_Operations', {
        Flag: isSearch ? '8' : '6',
         SchoolID: this.AdminselectedSchoolID || '',
        AcademicYear: this.AdminselectedAcademivYearID || '',
        Class: this.AdminselectedClassID || '',
        Divisions: this.AdminselectedDiviosnID || '',
        ExamType: this.AdminselecteExamID || '',
        ExamTypeName: isSearch ? this.searchQuery.trim() : null
      });
    }
  /**
   * Executes the operation: resetPaginationAndFetch
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private resetPaginationAndFetch() {
   this.currentPage = 1;
    this.pageCursors = [];        // ← Critical: clears old cursors
    this.SyllabusList = [];       // Clear old table immediately
    this.FetchInitialData();
  }
  
  /**
   * Executes the operation: FetchInitialData
   * Parameters: extra: any = {}
   * Rationale: Standard operational controller for the active view.
   */
    FetchInitialData(extra: any = {}) {
    const isSearch = !!this.searchQuery?.trim();
    const flag = isSearch ? '7' : '10';
  
    this.loader.show();
  
    this.FetchAcademicYearCount(isSearch).subscribe({
      next: (countResp: any) => {
        this.SyllabusCount = countResp?.data?.[0]?.totalcount ?? 0;   // ← Now correct count!
  
        const cursor = this.currentPage > 1 && !extra.offset 
          ? this.pageCursors[this.currentPage - 2] || null 
          : null;
  
        const payload: any = {
          Flag: flag,
          Limit: this.pageSize,
          SortColumn: this.sortColumn,
          SortDirection: this.sortDirection,
          LastCreatedDate: cursor?.lastCreatedDate ?? null,
          LastID: cursor?.lastID ?? null,
  
          // ALL 5 filters always sent
          SchoolID: this.AdminselectedSchoolID || '',
          AcademicYear: this.AdminselectedAcademivYearID || '',
          Class: this.AdminselectedClassID || '',
          Divisions: this.AdminselectedDiviosnID || '',
          ExamType: this.AdminselecteExamID || '',
  
          ...extra
        };
  
        if (isSearch) payload.ExamTypeName = this.searchQuery.trim();
  
        this.apiurl.post<any>('Tbl_SetExam_CRUD_Operations', payload).subscribe({
          next: (response: any) => {
            this.mapAcademicYears(response);
  
            if (response.data?.length > 0 && !this.pageCursors[this.currentPage - 1]) {
              const lastRow = response.data[response.data.length - 1];
              this.pageCursors[this.currentPage - 1] = {
                lastCreatedDate: lastRow.createdDate,
                lastID: Number(lastRow.id)
              };
            }
            this.loader.hide();
          },
          error: () => {
            this.SyllabusList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.SyllabusList = [];
        this.SyllabusCount = 0;
        this.loader.hide();
      }
    });
  }
  
  /**
   * Executes the operation: mapAcademicYears
   * Parameters: response: any
   * Rationale: Standard operational controller for the active view.
   */
    mapAcademicYears(response: any) {
    this.SyllabusList = (response.data || []).map((item: any) => {
        
        let displayExamType = item.examTypeName;
      
      
      const formattedExamDate = item.examDateAndTime
    ? item.examDateAndTime
        .split(',')
        .map((d: string) =>
          new Date(d).toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        )
        .join(' | ')
    : '';
  
    const formattedSubjectExamDate = item.subjectExamDateAndTime
    ? new Date(item.subjectExamDateAndTime).toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : '';
  
      return {
        ID: item.id,
        SchoolID: item.schoolID,
        Syllabus: item.syllabus,
        Class: item.className,          // ← friendly for table
        Divisions: item.divisionName,
        ExamType: displayExamType,
        ExamTypeID: item.examType,
        Subjects: item.subjectName,
        SchoolName: item.schoolName,
        MaxMarks: item.maxMarks,
        PassMarks: item.passMarks,
        ExamDateAndTime: formattedExamDate,
        Duration: item.duration,
        NoOfQuestion: item.noOfQuestion,
        Instructions: item.instructions,
        IsActive: item.isActive === "True" || item.isActive === "1" ? 'Active' : 'InActive',
        AcademicYearName: item.academicYearName,
        RowID: item.rowID,
        SubjectIndex: item.subjectIndex,
        SubjectID: item.subjectID,
        IndividualSubjectName:item.individualSubjectName,
        SubjectExamDateAndTime: formattedSubjectExamDate
      };
    });
  }
  
  /**
   * Handles form submission: Validates input fields and transmits data payloads.
   */
  onSubmit() {
    const AcademicYearIdSelected =
    this.isAdmin
      ? (
          this.SchoolAcademicYearChange
            ? this.selectedAcademicYearID?.trim()
            : this.AdminselectedAcademivYearID?.trim()
        )
      : this.AdminSelectedActiveAcademicYearID || '';

    if (this.isParent) {
      // For parents, use form validation
      this.SyllabusForm.markAllAsTouched();
      
      // Check if form is valid
      if (this.SyllabusForm.invalid) {
        return;
      }

      this.hasSubmittedSearch = true;
      this.currentPage = 1;
      this.FetchExamResultsList();
      return;
    }

    // For admin/teacher/school admin, check if required fields are selected
    const academicYear = AcademicYearIdSelected;
    const classId = this.AdminselectedClassID;
    const divisionId = this.AdminselectedDiviosnID;
    const examId = this.AdminselecteExamID;

    if (!academicYear || academicYear === '0') {
      this.AminityInsStatus = 'Please select Academic Year';
      this.isModalOpen = true;
      return;
    }

    if (!classId || classId === '0') {
      this.AminityInsStatus = 'Please select Class';
      this.isModalOpen = true;
      return;
    }

    if (!divisionId || divisionId === '0') {
      this.AminityInsStatus = 'Please select Division';
      this.isModalOpen = true;
      return;
    }

    if (!examId || examId === '0') {
      this.AminityInsStatus = 'Please select Exam Type';
      this.isModalOpen = true;
      return;
    }

    this.hasSubmittedSearch = true;
    this.currentPage = 1;
    // Sync AdminselectedStudentID from form before fetching
    const formStudentVal = this.SyllabusForm.get('Student')?.value;
    this.AdminselectedStudentID = (formStudentVal && formStudentVal !== '0') ? formStudentVal : '';
    this.FetchExamResultsList();
  }

  /**
   * Executes the operation: FetchExamResultsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchExamResultsList() {
    const requestClass = this.isTeacher ? this.teacherAssignedClassID : (this.AdminselectedClassID || '');
    const requestDivision = this.isTeacher ? this.teacherAssignedDivisionID : (this.AdminselectedDiviosnID || '');

    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: this.AdminselectedAcademivYearID || '',
      Class: requestClass,
      Division: requestDivision,
      ExamID: this.AdminselecteExamID || '',
      AdmissionID: this.AdminselectedStudentID || '',
      Flag: '10'
    };
    this.apiurl.post<any>('Tbl_ExamMarks_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          const data = Array.isArray(response?.data) ? response.data : [];

          // Check for not-published warning from SP
          if (data.length === 1 && (
            data[0]?.message === 'Results are not published yet' ||
            data[0]?.status === 'Results are not published yet'
          )) {
            this.AminityInsStatus = 'Results are not published yet. Please contact your school administrator.';
            this.isModalOpen = true;
            this.examResultsList = [];
            this.SyllabusCount = 0;
            this.currentPage = 1;
            return;
          }

          if (data.length > 0) {
            const recordsByAdmission = data.reduce((acc: any, item: any) => {
              const key = item.admissionID;
              if (!acc[key]) acc[key] = [];
              acc[key].push(item);
              return acc;
            }, {});

            const seen = new Set();
            this.examResultsList = data
              .filter((item: any) => {
                if (seen.has(item.admissionID)) return false;
                seen.add(item.admissionID);
                return true;
              })
              .map((item: any) => ({
                AdmissionNo: item.admissionID,
                StudentName: item.studentName,
                ExamType: item.examName,
                Class: item.className,
                Division: item.divisionName,
                SchoolName: item.schoolName,
                AcademicYearName: item.academicYearName,
                MaxMarks: item.maxMarks,
                PassMarks: item.passMarks,
                Attendance: item.attendance,
                TotalMarks: item.totalMarks,
                TotalMaxMarks: item.totalMaxMarks,
                TotalPercentage: item.totalPercentage,
                Result: this.calculateFinalResult(recordsByAdmission[item.admissionID] || [])
              }));
            this.SyllabusCount = this.examResultsList.length;
            if (this.currentPage > this.totalPages()) this.currentPage = 1;
          } else {
            this.examResultsList = [];
            this.SyllabusCount = 0;
            this.currentPage = 1;
          }
        },
        () => {
          this.examResultsList = [];
          this.SyllabusCount = 0;
          this.currentPage = 1;
        }
      );
  }
  
  /**
   * Executes the operation: formatDateYYYYMMDD
   * Parameters: dateStr: string | null
   * Rationale: Standard operational controller for the active view.
   */
  formatDateYYYYMMDD(dateStr: string | null) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    }
  
  /**
   * Executes the operation: formatDateDDMMYYYY
   * Parameters: dateStr: string | null
   * Rationale: Standard operational controller for the active view.
   */
    formatDateDDMMYYYY(dateStr: string | null) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
    }
   
  
  
  /**
   * Executes the operation: FetchSyllabusDetByID
   * Parameters: SyllabusID: string, mode: 'view' | 'edit'
   * Rationale: Standard operational controller for the active view.
   */
    FetchSyllabusDetByID(SyllabusID: string, mode: 'view' | 'edit') {
      const data = {
        ID: SyllabusID,
        Flag: "4"
      };
  
      this.apiurl.post<any>("Tbl_SetExam_CRUD_Operations", data).subscribe(
        (response: any) => {
          console.log("View Response:", response);
          const item = response?.data?.[0];
          if (!item) {
            this.SyllabusForm.reset();
            this.viewSyllabus = null;
            return;
          }
  
          const isActive = item.isActive === "True";
  
             if (mode === 'view') {
  
          const formattedExamDate = item.examDateAndTime
            ? item.examDateAndTime
                .split(',')
                .map((d: string) =>
                  new Date(d).toLocaleString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })
                )
                .join(' | ')
            : '';
  
          const divisionsArr = item.divisions ? item.divisions.split('|') : [];
  
          const finalDivisionDisplay = divisionsArr
            .map((group: string) => group.split(',').join('|'))
            .join(' , ');
  
          this.isViewMode = true;
  
          this.viewSyllabus = {
            ID: item.id,
            SchoolID: item.schoolID,
            Syllabus: item.syllabus,
            Class: item.className,
            Divisions: finalDivisionDisplay,
            ExamType: item.examTypeName,
            Subjects: item.subjectName,
            SchoolName: item.schoolName,
            MaxMarks: item.maxMarks,
            PassMarks: item.passMarks,
            ExamDateAndTime: formattedExamDate,
            Duration: item.duration,
            NoOfQuestion: item.noOfQuestion,
            Instructions: item.instructions,
            AcademicYearName: item.academicYearName,
            DivisionName:item.divisionName,
            IsActive: isActive
          };
  
          this.isViewModalOpen = true;
        }
  
          if (mode === 'edit') {
            this.isViewMode = false;
            this.SyllabusForm.patchValue({
              ID: item.id,
              ExamTypeName: item.examTypeName,
              Priority: item.priority,
              ExamType: item.examType,
              MaxMark: item.maxMark,
              PassMarks: item.passMarks,
              ExamDuration: item.examDuration,
              NoofQuestion: item.noofQuestion,
              Instructions: item.instructions
            });
            this.IsActiveStatus = isActive;
            this.IsAddNewClicked = true;
          }
        },
        error => {
          console.error(error);
        }
      );
    };
  
  
  
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
  
      clearTimeout(this.paginationLoaderTimer);
      this.loader.show();
      this.currentPage = pageNumber;
      this.paginationLoaderTimer = setTimeout(() => {
        this.loader.hide();
      }, 150);
    };
  
  /**
   * Executes the operation: totalPages
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    totalPages() {
      return Math.ceil(this.SyllabusCount / this.pageSize);
    };

    get pagedExamResults() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.examResultsList.slice(start, start + this.pageSize);
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
          this.pageSize = 5;
          this.visiblePageCount = 3;
          this.FetchInitialData();
          return;
        }
  
        if (value.length < this.SEARCH_MIN_LENGTH) {
          return;
        }
  
        this.currentPage = 1;
        this.pageSize = 5;
        this.visiblePageCount = 3;
        this.FetchInitialData();
  
      }, this.SEARCH_DEBOUNCE);
    };
  
  /**
   * Executes the operation: closeModal
   * Parameters: type: 'view' | 'status'
   * Rationale: Standard operational controller for the active view.
   */
    closeModal(type: 'view' | 'status') {
      if (type === 'view') {
        this.isViewModalOpen = false;
        this.viewSyllabus = null;
        this.studentReport = [];
        // Restore AdminselectedStudentID from the form's current value
        const formStudentVal = this.SyllabusForm.get('Student')?.value;
        this.AdminselectedStudentID = (formStudentVal && formStudentVal !== '0') ? formStudentVal : '';
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
      this.isModalOpen = false;
      this.FetchInitialData();
    };
  
  /**
   * Executes the operation: editreview
   * Parameters: SyllabusID: string
   * Rationale: Standard operational controller for the active view.
   */
    editreview(SyllabusID: string): void {
      this.editclicked = true;
      this.FetchSyllabusDetByID(SyllabusID, 'edit');
      this.ViewSyllabusClicked = true;
    };
  
  /**
   * Executes the operation: toggleChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    toggleChange() {
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
      if (schoolID == "0") {
        this.selectedSchoolID = "";
      } else {
        this.selectedSchoolID = schoolID;
      }
      this.SchoolSelectionChange = true;
      this.FetchInitialData();
    };
  /**
   * Executes the operation: printMarksheet
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  printMarksheet() {
  const content = document.getElementById('marksheetContent')?.innerHTML;

  if (!content) return;

  const printWindow = window.open('', '', 'width=900,height=700');

  printWindow?.document.write(`
    <html>
      <head>
        // <title>Exam Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          h4, h5, h6 {
            text-align: center;
            margin: 5px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          table, th, td {
            border: 1px solid #000;
          }
          th, td {
            padding: 8px;
            text-align: center;
          }
          .text-start {
            text-align: left;
          }
          .text-center {
            text-align: center;
          }
          .fw-bold {
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `);

  printWindow?.document.close();
  printWindow?.focus();
  printWindow?.print();
}
  /**
   * Executes the operation: exportSyllabus
   * Parameters: type: 'pdf' | 'excel' | 'print'
   * Rationale: Standard operational controller for the active view.
   */
    exportSyllabus(type: 'pdf' | 'excel' | 'print') {
      const isSearch = !!this.searchQuery?.trim();
      const flag = isSearch ? '7' : '2';
      const payload: any = {
        Flag: flag,
        SchoolID: this.selectedSchoolID || null,
        ExamTypeName: isSearch ? this.searchQuery.trim() : null
      };
  
      this.loader.show();
  
      const url = `${this.apiurl.api_url}/ExportExamType?type=${type}`;
  
      this.http.post(url, payload, { responseType: 'blob' }).subscribe({
        next: (blob: Blob) => {
          const fileNameBase = `ExamType_${new Date().toISOString().replace(/[:.]/g, '')}`;
  
          if (type === 'pdf' || type === 'print') {
            const fileURL = URL.createObjectURL(blob);
  
            if (type === 'print') {
              const printWindow = window.open(fileURL);
              printWindow?.focus();
              printWindow?.print();
            } else {
              const a = document.createElement('a');
              a.href = fileURL;
              a.download = `${fileNameBase}.pdf`;
              a.click();
            }
  
            setTimeout(() => URL.revokeObjectURL(fileURL), 1000);
          }
          else if (type === 'excel') {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${fileNameBase}.xlsx`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          }
  
          this.loader.hide();
        },
        error: () => {
          alert(`${type.toUpperCase()} export failed. Please try again.`);
          this.loader.hide();
        }
      });
    };
  
  /**
   * Executes the operation: viewReview
   * Parameters: studentId: string
   * Rationale: Standard operational controller for the active view.
   */
    viewReview(studentId: string): void {
      this.AdminselectedStudentID = studentId;
      this.FetchMarkDetailReport();
    }
  /**
   * Executes the operation: onAdminSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
      onAdminSchoolChange(event: Event) {
      this.academicYearList=[];
      this.examLists =[];
      this.classLists=[];
      this.divisionsList =[];
      this.studentsList = [];
      this.SyllabusForm.get('AcademicYear').patchValue('0');
      this.SyllabusForm.get('ExamType').patchValue('0');
      this.SyllabusForm.get('Class').patchValue('0');
      this.SyllabusForm.get('Divisions').patchValue('0');
      this.SyllabusForm.get('Student').patchValue('0');
  

      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      this.classLists=[];
      this.isTableModalOpen = false;
  
      if(schoolID=="0"){
        this.AdminselectedSchoolID="";
      }else{
        this.AdminselectedSchoolID = schoolID;
      }   
      this.FetchAcademicYearsList();
      this.resetResultView();
      // this.resetPaginationAndFetch();
    };
  
  /**
   * Executes the operation: onAdminAcademicYearchange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
     onAdminAcademicYearchange(event: Event){
      this.examLists =[];
      this.classLists=[];
      this.divisionsList =[];
      this.studentsList = [];
      
      this.SyllabusForm.get('ExamType').patchValue('0');
      this.SyllabusForm.get('Class').patchValue('0');
      this.SyllabusForm.get('Divisions').patchValue('0');
      this.SyllabusForm.get('Student').patchValue('0');
  
      const target = event.target as HTMLSelectElement;
      const academicyearId = target.value;
      if(academicyearId=="0"){
        this.AdminselectedAcademivYearID="";
      }else{
        this.AdminselectedAcademivYearID = academicyearId;
      }
      this.isTableModalOpen = false;
  
      // For parents, fetch children when academic year changes
      if (this.isParent) {
        this.fetchParentChildren();
      }
      
      // this.tableRows = [];   
      this.FetchExamsList();
      if (!this.isParent) {
        if (this.isTeacher) {
          this.syncTeacherClassDivisionFromAllocation(() => {
            this.FetchClassStudentsList();
          });
        } else {
          this.FetchClassList();
        }
      }
      this.resetResultView();
      // this.resetPaginationAndFetch();
    };
    
  /**
   * Executes the operation: onAdminClasschange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
      onAdminClasschange(event: Event){
      this.divisionsList =[];
      this.studentsList = [];

      this.SyllabusForm.get('Divisions').patchValue('0');
      this.SyllabusForm.get('Student').patchValue('0');

      const target = event.target as HTMLSelectElement;
  
      const classId = target.value;
  
      if (classId.length === 0) {
        this.AdminselectedClassID = "";
      } else {
        this.AdminselectedClassID = classId; // if API expects comma separated
      }
      this.FetchDivisionsList();
      this.resetResultView();
      // this.resetPaginationAndFetch();
    };
  
  /**
   * Executes the operation: onAdminDivisionsChange
   * Parameters: event:Event
   * Rationale: Standard operational controller for the active view.
   */
    onAdminDivisionsChange(event:Event){
      const target = event.target as HTMLSelectElement;
      this.studentsList = [];
      this.SyllabusForm.get('Student').patchValue('0');

  
      const diviosnId = target.value;
  
      if (diviosnId.length === 0) {
        this.AdminselectedDiviosnID = "";
      } else {
        this.AdminselectedDiviosnID = diviosnId;
      }
      this.examResultsList = [];
      this.FetchClassStudentsList();
      this.resetResultView();
    }

  /**
   * Executes the operation: onAdminStudentChange
   * Parameters: event:Event
   * Rationale: Standard operational controller for the active view.
   */
    onAdminStudentChange(event:Event){
      const target = event.target as HTMLSelectElement;
      const admissionId = target.value;
      this.AdminselectedStudentID = admissionId;
      this.resetResultView();
    }

  /**
   * Executes the operation: onAdminExamtypeChange
   * Parameters: event:Event
   * Rationale: Standard operational controller for the active view.
   */
    onAdminExamtypeChange(event:Event){
      const target = event.target as HTMLSelectElement;
      const examId = target.value;
      this.AdminselecteExamID = examId === '0' ? '' : examId;
      this.examResultsList = [];
      this.resetResultView();
      if (this.isParent && this.selectedChildId && this.AdminselecteExamID) {
        this.hasSubmittedSearch = true;
        this.FetchExamResultsList();
      }
    }

  /**
   * Executes the operation: resetResultView
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
private resetResultView() {
  this.hasSubmittedSearch = false;
  this.examResultsList = [];
  this.SyllabusCount = 0;
  this.currentPage = 1;
}

  /**
   * Executes the operation: getFinalResultForRecords
   * Parameters: records: any[]
   * Rationale: Standard operational controller for the active view.
   */
getFinalResultForRecords(records: any[]): string {
  return this.calculateFinalResult(records);
}

  /**
   * Executes the operation: calculateFinalResult
   * Parameters: records: any[]
   * Rationale: Standard operational controller for the active view.
   */
calculateFinalResult(records: any[]): string {
  return records?.every(
    (item: any) => {
      const subjectResult = item.SubjectResult ?? item.subjectResult;
      const subjectMarks = item.SubjectMarks ?? item.subjectMarks;
      return subjectResult === 'PASS' && !!subjectMarks;
    }
  ) ? 'PASS' : 'FAIL';
}

  /**
   * Executes the operation: getFinalResult
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
getFinalResult(): string {
  return this.calculateFinalResult(this.studentReport);
}
}
