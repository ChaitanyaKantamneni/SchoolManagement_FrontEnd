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
  
    ngOnInit(): void {
      this.checkViewPermission();
      this.SchoolSelectionChange = false;
      
      // Initialize parent role detection
      this.initializeUserRole();
      
      if (this.isAdmin) {
        this.FetchSchoolsList();
      }
      this.FetchAcademicYearsList();
    };
  
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
    SchoolSelectionChange: boolean = false;
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

  private initializeUserRole(): void {
    if (this.isParent) {
      // Auto-set school ID from session for parents
      this.AdminselectedSchoolID = this.resolvedSchoolId;
      // Don't fetch children immediately - wait for academic year to be selected
    }
  }

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
            SchoolID:     String(schoolId)
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
      },
      error: () => { this.parentChildren = []; }
    });
  }

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

        
    FetchAcademicYearsList() {
      const requestData = { 
        SchoolID:this.AdminselectedSchoolID||'',
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
            } else {
              this.academicYearList = [];
            }
          },
          (error) => {
            this.academicYearList = [];
          }
        );
    };
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
            console.log(response);
  
  
            this.classLists = response.data.map((item: any) => {
                              console.log(this.classLists)
  
  
              const isActiveString =
                item.isActive === "1" || item.isActive === "True"
                  ? "Active"
                  : "InActive";
  
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

  FetchExamsList() {
    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: this.AdminselectedAcademivYearID || '',
      Flag: '3'
    };
   
    this.apiurl.post<any>('Tbl_Examtype_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
  
          if (response && Array.isArray(response.data)) {
            console.log(response);
  
  
            this.examLists = response.data.map((item: any) => {
                              console.log(this.examLists)
  
  
  
              const isActiveString =
                item.isActive === "1" || item.isActive === "True"
                  ? "Active"
                  : "InActive";

  
              return {
               ID: item.id,
               Name: item.examType,
               Priority:item.priority,
               MaxMark :item.maxMark,
               PassMarks:item.passMarks,
               ExamDuration:item.examDuration,
               NoofQuestion:item.noofQuestion,
               Instructions:item.instructions
              };
  
            });
            //  this.listenExamTypeChanges();   // 👈 call here
  
  
          } else {
            this.examLists = [];
          }
  
        },
        (error) => {
          this.examLists = [];
        }
      );
  }
    FetchMarkDetailReport() {
    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: this.AdminselectedAcademivYearID || '',
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

  FetchDivisionsList() {
    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: this.AdminselectedAcademivYearID || '',
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
  
  FetchExamsbyclassanddivisionList() {
    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: this.AdminselectedAcademivYearID || '',
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
    FetchClassStudentsList() {
    const requestData = { 
            SchoolID:this.AdminselectedSchoolID || '',
            AcademicYear:this.AdminselectedAcademivYearID || '',
            Class:this.AdminselectedClassID || '',
            Division:this.AdminselectedDiviosnID,
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
  private resetPaginationAndFetch() {
   this.currentPage = 1;
    this.pageCursors = [];        // ← Critical: clears old cursors
    this.SyllabusList = [];       // Clear old table immediately
    this.FetchInitialData();
  }
  
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
  
  onSubmit() {
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
    const academicYear = this.AdminselectedAcademivYearID;
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

  FetchExamResultsList() {
    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: this.AdminselectedAcademivYearID || '',
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
            const recordsByAdmission = response.data.reduce((acc: any, item: any) => {
              const key = item.admissionID;
              if (!acc[key]) {
                acc[key] = [];
              }
              acc[key].push(item);
              return acc;
            }, {});

            const seen = new Set();
            this.examResultsList = response.data
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
            if (this.currentPage > this.totalPages()) {
              this.currentPage = 1;
            }
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
  
  formatDateYYYYMMDD(dateStr: string | null) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    }
  
    formatDateDDMMYYYY(dateStr: string | null) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
    }
   
  
  
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
  
  
  
    previousPage() {
      if (this.currentPage > 1) {
        this.goToPage(this.currentPage - 1);
      }
    };
  
    nextPage() {
      if (this.currentPage < this.totalPages()) {
        this.goToPage(this.currentPage + 1);
      }
    };
  
    firstPage() {
      this.goToPage(1);
    };
  
    lastPage() {
      this.goToPage(this.totalPages());
    };
  
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
  
    totalPages() {
      return Math.ceil(this.SyllabusCount / this.pageSize);
    };

    get pagedExamResults() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.examResultsList.slice(start, start + this.pageSize);
    }
  
    getVisiblePageNumbers() {
      const totalPages = this.totalPages();
      const pages = [];
      let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
      let end = Math.min(start + this.visiblePageCount - 1, totalPages);
      if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    };
  
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
  
    handleOk() {
      this.isModalOpen = false;
      this.FetchInitialData();
    };
  
    editreview(SyllabusID: string): void {
      this.editclicked = true;
      this.FetchSyllabusDetByID(SyllabusID, 'edit');
      this.ViewSyllabusClicked = true;
    };
  
    toggleChange() {
      this.IsActiveStatus = !this.IsActiveStatus;
    };
  
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
  
    viewReview(studentId: string): void {
      this.AdminselectedStudentID = studentId;
      this.FetchMarkDetailReport();
    }
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
        this.FetchClassList();
      }
      this.resetResultView();
      // this.resetPaginationAndFetch();
    };
    
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

    onAdminStudentChange(event:Event){
      const target = event.target as HTMLSelectElement;
      const admissionId = target.value;
      this.AdminselectedStudentID = admissionId;
      this.resetResultView();
    }

    onAdminExamtypeChange(event:Event){
      const target = event.target as HTMLSelectElement;
      const examId = target.value;
      this.AdminselecteExamID = examId === '0' ? '' : examId;
      this.examResultsList = [];
      this.resetResultView();
    }

private resetResultView() {
  this.hasSubmittedSearch = false;
  this.examResultsList = [];
  this.SyllabusCount = 0;
  this.currentPage = 1;
}

getFinalResultForRecords(records: any[]): string {
  return this.calculateFinalResult(records);
}

calculateFinalResult(records: any[]): string {
  return records?.every(
    (item: any) => {
      const subjectResult = item.SubjectResult ?? item.subjectResult;
      const subjectMarks = item.SubjectMarks ?? item.subjectMarks;
      return subjectResult === 'PASS' && !!subjectMarks;
    }
  ) ? 'PASS' : 'FAIL';
}

getFinalResult(): string {
  return this.calculateFinalResult(this.studentReport);
}
}
