import { NgClass, NgFor, NgIf, NgStyle, SlicePipe } from '@angular/common';
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
  selector: 'app-examattendence',
 standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, SlicePipe, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule],  templateUrl: './examattendence.component.html',
  styleUrl: './examattendence.component.css'
})
export class ExamattendenceComponent  extends BasePermissionComponent{
   pageName = 'Exam Attendance';

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
    this.FetchSchoolsList();
    if (!this.isAdmin) {
      this.AdminselectedSchoolID =
        sessionStorage.getItem('SchoolID')?.toString() ||
        sessionStorage.getItem('schoolId')?.toString() ||
        '';
      this.SyllabusForm.patchValue({ School: this.AdminselectedSchoolID });
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
  isAttendanceSubmitted: boolean = false;
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
  Submitbuttonclicks = false;
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
  SchoolSelectionChange: boolean = false;
  isTableModalOpen = false;
  academicYearList :any[]= [];
  classLists:any[] = [];
  examLists:any[]=[];
  divisionsList:any[] = [];
  examslist:any[] =[];
  studentsList:any[]=[]
  AdminselectedSchoolID: string = '';
  AdminselectedAcademivYearID: string = '';
  AdminselectedClassID:string ='';
  AdminselectedDiviosnID:string = '';
  AdminselecteExamID:string = '';
  selectedExamIDForAttendance!: number;
  selectedSubjectID!: number;
  attendanceMode: 'add' | 'view' = 'add';

  SyllabusForm :any= new FormGroup({
    ID: new FormControl(''),
    SchoolID:new FormControl(''),
    AdmissionID: new FormControl(true), // ✅ Default Present
    Attendance: new FormControl(true), 
    Divisions: new FormControl(0,[Validators.required,Validators.min(1)]),
    Class: new FormControl(0,[Validators.required,Validators.min(1)]),
    ExamType: new FormControl(0,[Validators.required,Validators.min(1)]),
    School: new FormControl(0,[Validators.required,Validators.min(1)]),
    AcademicYear: new FormControl(0,[Validators.required,Validators.min(1)])
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

  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

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
  
  FetchAcademicYearsList() {
    const requestData = { 
      SchoolID:this.getCurrentSchoolId(),
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
    SchoolID: this.getCurrentSchoolId(),
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
    SchoolID: this.getCurrentSchoolId(),
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
        } else {
          this.examLists = [];
        }},
      (error) => {
        this.examLists = [];
      }
    );
}

FetchDivisionsList() {
  const requestData = {
    SchoolID: this.getCurrentSchoolId(),
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
    SchoolID: this.getCurrentSchoolId(),
    AcademicYear: this.AdminselectedAcademivYearID || '',
    Class :this.AdminselectedClassID || '',
    Division :this.AdminselectedDiviosnID || '',
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
                            // this.checkAttendanceStatusForExams();


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
              SubjectID: item.subjectID,
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
               isAttendanceSubmitted: false
            };

          });
            // ✅ CALL ONLY AFTER examslist is fully ready
          this.checkAttendanceStatusForExams();

        } else {
          this.examslist = [];
        }

      },
      (error) => {
        this.examslist = [];
      }
    );
}
checkAttendanceStatusForExams() {

  const body = {
    Flag: '2',
    SchoolID: this.getCurrentSchoolId(),
    AcademicYear: this.AdminselectedAcademivYearID,
    Class: this.AdminselectedClassID,
  Division: this.AdminselectedDiviosnID
  };

  this.apiurl.post('Tbl_ExamAttendence_CRUD_Operations', body)
    .subscribe((response: any) => {

      if (!response?.data) return;

      this.examslist.forEach(exam => {

   const hasAttendance = response.data.some((x: any) =>
  x.examID == exam.ID &&
  x.subjectID == exam.SubjectID &&
    x.division == this.AdminselectedDiviosnID   // ✅ ADD THIS

);

        exam.isAttendanceSubmitted = hasAttendance;

      });

    });
}
  FetchClassStudentsList() {
    const requestData = { 
            SchoolID:this.getCurrentSchoolId(),
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
                ID: item.id,
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
                IsPresent: true   // ✅ default present

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

  FetchClassStudentsListAfterAttendance(){
    const requestData = { 
      SchoolID:this.getCurrentSchoolId(),
            AcademicYear:this.AdminselectedAcademivYearID || '',            
            Class:this.AdminselectedClassID || '',
            Division:this.AdminselectedDiviosnID,
            ExamType:this.selectedExamIDForAttendance.toString(),
            SubjectID:this.selectedSubjectID.toString(),
            Flag: '9' };

    this.apiurl.post<any>('Tbl_ExamAttendence_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.studentsList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";

              return {
                ID: item.id,
                School:item.schoolID,
                AcademicYear: item.academicYear,
                AdmissionNo:item.admissionID,
                FirstName: item.studentName,
                Class: item.className,
                SchoolName:item.schoolName,
                AcademicYearName:item.academicYearName,
                Division:item.divisionName,
                IsPresent: item.attendance === "1",
                originalIsPresent: item.attendance === "1",
                Remark: item.remarks ?? '',
                originalRemark: item.remarks ?? '',
                showRemark: false,
                showFullRemark: false
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
  }

  FetchAcademicYearCount(isSearch: boolean) {
    let SchoolIdSelected = '';

    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    return this.apiurl.post<any>('Tbl_SetExam_CRUD_Operations', {
      Flag: isSearch ? '8' : '6',
       SchoolID: this.getCurrentSchoolId(),
      AcademicYear: this.AdminselectedAcademivYearID || '',
      Class: this.AdminselectedClassID || '',
      Division: this.AdminselectedDiviosnID || '',
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
        SchoolID: this.getCurrentSchoolId(),
        AcademicYear: this.AdminselectedAcademivYearID || '',
        Class: this.AdminselectedClassID || '',
        Division: this.AdminselectedDiviosnID || '',
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
      SubjectExamDateAndTime: formattedSubjectExamDate,
      AttendanceMarked:item.attendanceMarked,
      ExamAttendancAndMarksMarked:item.examAttendancAndMarksMarked
    };
  });
  console.log('this.SyllabusList',this.SyllabusList)
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

  onSubmit() {
    if (this.SyllabusForm.invalid) {
      this.SyllabusForm.markAllAsTouched();
      return;
    }
    this.resetPaginationAndFetch();
  }


  selectedExam: any;
  openAttendance(examRow: any) {
    this.attendanceMode = 'add';   
    this.selectedExam = examRow;
    this.AdminselectedSchoolID = examRow?.SchoolID?.toString() || this.getCurrentSchoolId();
    this.SyllabusForm.patchValue({ School: this.AdminselectedSchoolID });
    this.selectedExamIDForAttendance = Number(examRow.ID);
    this.selectedSubjectID=Number(examRow.SubjectID);
    this.FetchClassStudentsList();
    this.IsAddNewClicked = true;
  }

  openViewAttendance(examRow: any) {
    this.attendanceMode = 'view';   
    this.selectedExam = examRow;
    this.AdminselectedSchoolID = examRow?.SchoolID?.toString() || this.getCurrentSchoolId();
    this.SyllabusForm.patchValue({ School: this.AdminselectedSchoolID });
    this.selectedExamIDForAttendance = Number(examRow.ID);
    this.selectedSubjectID=Number(examRow.SubjectID);
    this.FetchClassStudentsListAfterAttendance();
    this.IsAddNewClicked = true;
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
                const subjectsArr = item.subjects ? item.subjects.split(',') : [];
                const divisionsArr = item.divisions ? item.divisionName.split(',') : [];
                const finalDivisionDisplay = divisionsArr.map((group: string) => group.split('|').join(',')).join(' | ');
                this.isViewMode = true;
                this.viewSyllabus = {
                ID: item.id,
                SchoolID: item.schoolID,
                Syllabus: item.syllabus,
                // Class: this.getClassNames(item.className),
                Class: item.className,
                Divisions: finalDivisionDisplay,
                ExamType: displayExamType,
                Subjects: item.subjectName,
                SchoolName: item.schoolName,
                MaxMarks: item.maxMarks,
                PassMarks: item.passMarks,
                ExamDateAndTime: formattedExamDate,
                Duration: item.duration,
                NoOfQuestion: item.noOfQuestion,
                Instructions: item.instructions,
                AcademicYearName: item.academicYearName,
                IsActive: item.isActive === "True" || item.isActive === "1"
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

isSubmittingAttendance = false;

submitAttendance() {
  if (this.isSubmittingAttendance) return;
  this.isSubmittingAttendance = true;

  const body = {
    Flag: '1',
    SchoolID: this.getCurrentSchoolId(),
    AcademicYear: this.AdminselectedAcademivYearID,
    ExamID: this.selectedExamIDForAttendance.toString(),
    SubjectID: this.selectedSubjectID.toString(),
    Class: this.AdminselectedClassID,
    Division: this.AdminselectedDiviosnID,
    Students: this.studentsList.map(student => ({
      AdmissionID: student.AdmissionNo,
      Attendance: student.IsPresent ? '1' : '0',
            Remarks: student.Remark ?? ''

    }))
  };

  this.apiurl.post('Tbl_ExamAttendence_CRUD_Operations', body).subscribe({
    next: () => {
      this.AminityInsStatus = 'Attendance Saved Successfully';
      this.isModalOpen = true;
      this.isAttendanceSubmitted = true;
      this.IsAddNewClicked = false;
      this.resetPaginationAndFetch();
      this.isSubmittingAttendance = false;
    },
    error: () => {
      this.AminityInsStatus = 'Error saving attendance';
      this.isModalOpen = true;
      this.isSubmittingAttendance = false;
    }
  });
}

  onViewModeToggleChange(student: any) {
    const changed = student.IsPresent !== student.originalIsPresent;
    if (changed) {
      student.showRemark = true;
      student.Remark = ''; // clear remark for fresh input
    } else {
      // toggled back to original — restore original remark, hide input
      student.showRemark = false;
      student.Remark = student.originalRemark ?? '';
    }
  }

 UpdateAttendance() {
  const updatedStudents = this.studentsList.filter(student =>
    student.IsPresent !== student.originalIsPresent ||
    (student.Remark ?? '') !== (student.originalRemark ?? '')
  );

  if (updatedStudents.length === 0) {
    this.AminityInsStatus = 'No changes detected';
    this.isModalOpen = true;
    return;
  }

  const missingRemark = updatedStudents.find(
    s => s.IsPresent !== s.originalIsPresent && !s.Remark?.trim()
  );

  if (missingRemark) {
    const direction = missingRemark.IsPresent ? 'Absent → Present' : 'Present → Absent';
    this.AminityInsStatus = `⚠️ Please enter a remark for ${missingRemark.FirstName} (${direction}).`;
    this.isModalOpen = true;
    return;
  }

  // Build ONE payload with only changed students
  const body = {
    Flag: '5',
    SchoolID: this.getCurrentSchoolId(),
    AcademicYear: this.AdminselectedAcademivYearID,
    ExamID: this.selectedExamIDForAttendance.toString(),
    SubjectID: this.selectedSubjectID.toString(),
    Class: this.AdminselectedClassID,
    Division: this.AdminselectedDiviosnID,
    Students: updatedStudents.map(s => ({
      AdmissionID: s.AdmissionNo,
      Attendance: s.IsPresent ? '1' : '0',
      Remarks: s.Remark ?? ''
    }))
  };

  this.apiurl.post('Tbl_ExamAttendence_CRUD_Operations', body).subscribe({
    next: () => {
      this.AminityInsStatus = 'Attendance Updated Successfully';
      this.isModalOpen = true;
      this.IsAddNewClicked = false;
      this.resetPaginationAndFetch();
    },
    error: (err) => {
      console.error(err);
      this.AminityInsStatus = 'Error Updating attendance';
      this.isModalOpen = true;
    }
  });
}

  AddNewClicked() {
     
    this.IsAddNewClicked = !this.IsAddNewClicked;
    this.IsActiveStatus = true;
    this.ViewSyllabusClicked = false;
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

  totalPages() {
    return Math.ceil(this.SyllabusCount / this.pageSize);
  };

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

  viewReview(SyllabusID: string): void {
    this.FetchSyllabusDetByID(SyllabusID, 'view');
    this.isViewModalOpen = true;
  };

 onAdminSchoolChange(event: Event) {
  const schoolID = (event.target as HTMLSelectElement).value;
  this.AdminselectedSchoolID = schoolID === "0" ? "" : schoolID;
  this.resetFilters('school');  
  this.FetchAcademicYearsList();
 }

 onAdminAcademicYearchange(event: Event) {
  const academicyearId = (event.target as HTMLSelectElement).value;
  this.AdminselectedAcademivYearID = academicyearId === "0" ? "" : academicyearId;
  this.resetFilters('academic');  
  this.FetchExamsList();
  this.FetchClassList();
 }
  
  onAdminClasschange(event: Event) {
   const classId = (event.target as HTMLSelectElement).value;
   this.AdminselectedClassID = classId === "0" ? "" : classId;
   this.resetFilters('class');  
   this.FetchDivisionsList();
 }

  onAdminDivisionsChange(event: Event) {
    const divisionId = (event.target as HTMLSelectElement).value;
    this.AdminselectedDiviosnID = divisionId === "0" ? "" : divisionId;
    this.resetTable();  // only table reset needed
  }

  onAdminExamtypeChange(event: Event) {
   const examId = (event.target as HTMLSelectElement).value;
   this.AdminselecteExamID = examId === "0" ? "" : examId;
   this.resetTable();  // only table reset 
  }
 resetFilters(level: 'school' | 'academic' | 'class') {

  if (level === 'school') {
    // Reset everything below school
    this.AdminselectedAcademivYearID = '';
    this.AdminselectedClassID = '';
    this.AdminselectedDiviosnID = '';
    this.AdminselecteExamID = '';

    this.academicYearList = [];
    this.classLists = [];
    this.divisionsList = [];
    this.examLists = [];

    this.SyllabusForm.patchValue({
      AcademicYear: '0',
      Class: '0',
      Divisions: '0',
      ExamType: '0'
    });
  }

  if (level === 'academic') {
    // Reset only below academic
    this.AdminselectedClassID = '';
    this.AdminselectedDiviosnID = '';
    this.AdminselecteExamID = '';

    this.classLists = [];
    this.divisionsList = [];
    this.examLists = [];

    this.SyllabusForm.patchValue({
      Class: '0',
      Divisions: '0',
      ExamType: '0'
    });
  }

  if (level === 'class') {
    // Reset only division
    this.AdminselectedDiviosnID = '';
    this.divisionsList = [];
    this.SyllabusForm.patchValue({
      Divisions: '0'
    });
  }

  // ✅ Always reset table (this is correct)
  this.resetTable();
}
resetTable() {
  this.SyllabusList = [];
  this.SyllabusCount = 0;
  this.currentPage = 1;
  this.pageCursors = [];
  this.isTableModalOpen = false;
}
}
