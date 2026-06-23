import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
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
  selector: 'app-viewexams',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './viewexams.component.html',
  styleUrl: './viewexams.component.css'
})
/**
 * Class Responsibility: Handles view logic and user interactions for ViewexamsComponent.
 */
export class ViewexamsComponent  extends BasePermissionComponent{
  pageName = 'View Exams';

  /**
   * Executes the operation: getExamWorkflowStatus
   * Parameters: item: any
   * Rationale: Standard operational controller for the active view.
   */
  getExamWorkflowStatus(item: any): string {
    const attendanceMarked = String(item?.attendanceMarked ?? item?.AttendanceMarked ?? '0');
    const examAttendanceAndMarksMarked = String(item?.examAttendancAndMarksMarked ?? item?.ExamAttendancAndMarksMarked ?? '0');

    if (attendanceMarked === '1' && examAttendanceAndMarksMarked === '1') {
      return 'Published';
    }

    if (attendanceMarked === '1' && examAttendanceAndMarksMarked === '0') {
      return 'Attendance Marked';
    }

    if (attendanceMarked === '0' && examAttendanceAndMarksMarked === '0') {
      return 'Scheduled';
    }

    return item?.isActive === "True" || item?.isActive === "1" ? 'Active' : 'InActive';
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
    this.SchoolSelectionChange = false;
    this.FetchSchoolsList();
    this.AdminSelectedActiveAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';
    // this.FetchAcademicYearsList();
    if (this.isAdmin) {
      this.SyllabusForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
      this.SyllabusForm.get('School').patchValue('0');
      this.SyllabusForm.get('AcademicYear').patchValue('0');
    } else {
      this.SyllabusForm.get('School')?.clearValidators();
      this.SyllabusForm.get('AcademicYear')?.disable({ emitEvent: false });
    }

    if(this.AdminselectedSchoolID==''){
      this.FetchAcademicYearsList();
      if(!this.isAdmin){
        this.SyllabusForm.get('AcademicYear').patchValue(this.AdminSelectedActiveAcademicYearID);
        this.FetchExamsList();
        this.FetchClassList();
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


  AdminselectedSchoolID: string = '';
  AdminselectedAcademivYearID: string = '';
  AdminselectedClassID:string ='';
  AdminselectedDiviosnID:string = '';
  AdminselecteExamID:string = '';
  AdminSelectedActiveAcademicYearID:string = sessionStorage.getItem('ActiveAcademicYearID') || '';


  SyllabusForm :any= new FormGroup({
    ID: new FormControl(''),
    SchoolID:new FormControl(''),
    Divisions: new FormControl(0,[Validators.required,Validators.min(1)]),
    Class: new FormControl(0,[Validators.required,Validators.min(1)]),
    ExamType: new FormControl(0,[Validators.required,Validators.min(1)]),
    School: new FormControl(0),
    AcademicYear: new FormControl(0,[Validators.required,Validators.min(1)])
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

  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
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
};

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
      
  const requestData = {
    SchoolID: this.AdminselectedSchoolID || '',
    AcademicYear: AcademicYearIdSelected || '',
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
};

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
    AcademicYear: AcademicYearIdSelected || '',
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
};

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
    AcademicYear: AcademicYearIdSelected || '',
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
              IsActive: this.getExamWorkflowStatus(item),
              AcademicYearName: item.academicYearName,
              AttendanceMarked: item.attendanceMarked,
              ExamAttendancAndMarksMarked: item.examAttendancAndMarksMarked
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
      IsActive: this.getExamWorkflowStatus(item),
      AcademicYearName: item.academicYearName,
      RowID: item.rowID,
      SubjectIndex: item.subjectIndex,
      SubjectID: item.subjectID,
      IndividualSubjectName:item.individualSubjectName,
      SubjectExamDateAndTime: formattedSubjectExamDate,
      AttendanceMarked: item.attendanceMarked,
      ExamAttendancAndMarksMarked: item.examAttendancAndMarksMarked
    };
  });
}

  /**
   * Handles form submission: Validates input fields and transmits data payloads.
   */
onSubmit() {
  if (this.SyllabusForm.invalid) {
    this.SyllabusForm.markAllAsTouched();
    return;
  }
  this.resetPaginationAndFetch();
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
    return Math.ceil(this.SyllabusCount / this.pageSize);
  };

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
   * Parameters: SyllabusID: string
   * Rationale: Standard operational controller for the active view.
   */
  viewReview(SyllabusID: string): void {
    this.FetchSyllabusDetByID(SyllabusID, 'view');
    this.isViewModalOpen = true;
  };
  /**
   * Executes the operation: onAdminSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
    onAdminSchoolChange(event: Event) {
    this.academicYearList=[];
    this.SyllabusForm.get('AcademicYear').patchValue('0');
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
    // this.resetPaginationAndFetch();
  };

  /**
   * Executes the operation: onAdminAcademicYearchange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
   onAdminAcademicYearchange(event: Event){
    this.examLists =[];
    
    this.SyllabusForm.get('ExamType').patchValue('0');
    this.SyllabusForm.get('Class').patchValue('0');
    this.SyllabusForm.get('Divisions').patchValue('0');

    const target = event.target as HTMLSelectElement;
    const academicyearId = target.value;
    if(academicyearId=="0"){
      this.AdminselectedAcademivYearID="";
    }else{
      this.AdminselectedAcademivYearID = academicyearId;
    }
    this.classLists=[];
    this.isTableModalOpen = false;


    // this.tableRows = [];   
    this.FetchExamsList();
    this.FetchClassList();
    // this.resetPaginationAndFetch();
  };
  
  /**
   * Executes the operation: onAdminClasschange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
    onAdminClasschange(event: Event){
    this.divisionsList =[];
    this.SyllabusForm.get('Divisions').patchValue('0');
    const target = event.target as HTMLSelectElement;

    const classId = target.value;

    if (classId.length === 0) {
      this.AdminselectedClassID = "";
    } else {
      this.AdminselectedClassID = classId; // if API expects comma separated
    }
    this.FetchDivisionsList();
    // this.resetPaginationAndFetch();
  };

  /**
   * Executes the operation: onAdminDivisionsChange
   * Parameters: event:Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminDivisionsChange(event:Event){
    const target = event.target as HTMLSelectElement;

    const diviosnId = target.value;

    if (diviosnId.length === 0) {
      this.AdminselectedDiviosnID = "";
    } else {
      this.AdminselectedDiviosnID = diviosnId; // if API expects comma separated
    }
    // this.resetPaginationAndFetch();

  }
  /**
   * Executes the operation: onAdminExamtypeChange
   * Parameters: event:Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminExamtypeChange(event:Event){
    const target = event.target as HTMLSelectElement;
    const examId = target.value;
    if (examId.length === 0) {
      this.AdminselecteExamID = "";
    } else {
      this.AdminselecteExamID = examId; 
    }
    // this.resetPaginationAndFetch();
  }
  
}
