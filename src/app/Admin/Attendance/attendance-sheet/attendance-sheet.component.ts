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
  selector: 'app-attendance-sheet',
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './attendance-sheet.component.html',
  styleUrl: './attendance-sheet.component.css'
})
export class AttendanceSheetComponent extends BasePermissionComponent{
  pageName = 'AttendanceSheet';

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

  onLateMinutesInput(row: any) {
    if (!row?.IsPresent) {
      row.LateInMinutes = '';
      return;
    }

    row.LateInMinutes = (row.LateInMinutes ?? '')
      .toString()
      .replace(/\D/g, '')
      .slice(0, 3);
  }
  IsAddNewClicked: boolean = false;
  isAttendanceSubmitted: boolean = false;
  IsActiveStatus: boolean = false;
  ViewSyllabusClicked: boolean = false;
  searchQuery: string = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;
  SyllabusList: any[] = [];
  SessionList:any[]=[];
  isModalOpen=false;
  isViewMode = false;
  viewSyllabus: any = null;
  AminityInsStatus: any = '';
  statusModalTitle = 'Application Status';
  isViewModalOpen = false;
  Submitbuttonclicks = false;
  SyllabusCount: number = 0;
  ActiveUserId: string = localStorage.getItem('email')?.toString() || '';
  roleId = localStorage.getItem('RollID');

  lastCreatedDate: string | null = null;
  lastID: number | null = null;
  maxMarks: number = 0;
  passmarks: number = 0;
  sortColumn: string = 'AdmissionNo';
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
  AdminSelectedSessionID:string='';
  AdminselecteExamID:string = '';
  selectedExamIDForAttendance!: number;
  selectedSubjectID!: number;
  attendanceMode: 'add' | 'view' = 'add';

  SyllabusForm :any= new FormGroup({
    ID: new FormControl(''),
    SchoolID:new FormControl(''),
    AdmissionID: new FormControl(true), 
    Marks: new FormControl(true), 
    Attendance: new FormControl(true), 
    Divisions: new FormControl(0,[Validators.required,Validators.min(1)]),
    Class: new FormControl(0,[Validators.required,Validators.min(1)]),
    ExamType: new FormControl(''),
    School: new FormControl(0,[Validators.required,Validators.min(1)]),
    AcademicYear: new FormControl(0,[Validators.required,Validators.min(1)]),
    AttendanceDateTime: new FormControl('', [Validators.required]),
    Session:new FormControl(0,[Validators.required,Validators.min(1)]),
    LateInMinutes: new FormControl(''),
    StartTime: new FormControl(''),
    EndTime: new FormControl(''),
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
 FetchSessionsList() {
      const requestData = { 
         SchoolID: this.AdminselectedSchoolID || '',
         AcademicYear: this.AdminselectedAcademivYearID || '',
         Flag: '2'
       };
  
      this.apiurl.post<any>('Tbl_Session_CRUD_Operations', requestData)
        .subscribe(
          (response: any) => {
            if (response && Array.isArray(response.data)) {
              this.SessionList = response.data.map((item: any) => {
                const isActiveString = item.isActive === "1" ? "Active" : "InActive";
                return {
                  ID: item.id,
                  Name: item.session,
                  StartTime: item.startTime,
                  EndTime: item.endTime, 
                  SessionName: `${item.session}-${item.startTime.substring(0,5)}-${item.endTime.substring(0,5)}`                };
              });
              this.applySelectedSessionTimes();
            } else {
              this.SessionList = [];
            }
          },
          (error) => {
            this.SessionList = [];
          }
        );
    };

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
    // Class :this.AdminselectedClassID || '',
    // Divisions :this.AdminselectedDiviosnID || '',
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
                            this.checkAttendanceStatusForExams();


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
               isAttendanceSubmitted: false,

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

  const missingRemark = this.SyllabusList.find(s => !s.IsPresent && !s.Remarks?.trim());
  if (missingRemark) {
    this.AminityInsStatus = `⚠️ Please enter a remark for ${missingRemark.Name || missingRemark.FirstName} (Absent).`;
    this.statusModalTitle = 'Validation Warning';
    this.isModalOpen = true;
    return;
  }

  const body = {
    Flag: '2',
    SchoolID: this.AdminselectedSchoolID,
    AcademicYear: this.AdminselectedAcademivYearID
  };

  this.apiurl.post('Tbl_ExamMarks_CRUD_Operations', body)
    .subscribe((response: any) => {

      if (!response?.data) return;

      this.examslist.forEach(exam => {

        const hasAttendance = response.data.some((x: any) =>
          x.examType == exam.ID
        );

        exam.isAttendanceSubmitted = hasAttendance;

      });

    });
}
  FetchClassStudentsList() {
    const requestData = { 
            SchoolID:this.AdminselectedSchoolID || '',
            AcademicYear:this.AdminselectedAcademivYearID || '',
            Class:this.AdminselectedClassID || '',
            Divisions:this.AdminselectedDiviosnID,
            ExamType:this.selectedExamIDForAttendance.toString(),    
            Subjects:this.selectedSubjectID.toString(),
            Flag: '11'
           };

    this.apiurl.post<any>('Tbl_SetExam_CRUD_Operations', requestData)
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
                Division: item.divisions,
                FirstName: item.firstName,
                MiddleName: item.middleName,
                LastName: item.lastName,                
                SchoolName:item.schoolName,
                AcademicYearName:item.academicYearName,
                ClassName: item.className,
                Name: `${item.admissionNo ?? ''} - ${item.firstName ?? ''} ${item.middleName ?? ''} ${item.lastName ?? ''}`.replace(/\s+/g, ' ').trim(),
                ClassDivisionName:item.classDivisionName,
                AttendanceMarked:item.attendanceMarked,
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

  FetchClassStudentsListAfterAttendance(){
    const requestData = { 
      SchoolID:this.AdminselectedSchoolID || '',
            AcademicYear:this.AdminselectedAcademivYearID || '',            
            // Class:this.AdminselectedClassID || '',
            // Division:this.AdminselectedDiviosnID,
            ExamID:this.selectedExamIDForAttendance.toString(),
            SubjectID:this.selectedSubjectID.toString(),
            Flag: '9' };

    this.apiurl.post<any>('Tbl_ExamMarks_CRUD_Operations', requestData)
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
   // ✅ FINAL FIX
              AttendanceMarked: item.attendance != null 
                ? item.attendance.toString() 
                : (item.marks ? '1' : '0'),

              // ✅ ensure safe value
              Marks: item.marks ?? ''

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

    return this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', {
      Flag: isSearch ? '8' : '6',
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: this.AdminselectedAcademivYearID || '',
      Class: this.AdminselectedClassID || '',
      Divisions: this.AdminselectedDiviosnID || '',
      AdmissionNo: isSearch ? this.searchQuery.trim() : null
    });
  }
private resetPaginationAndFetch() {
  this.SyllabusList = [];       // Clear old table immediately
  this.FetchInitialData();
}

  FetchInitialData() {
  const isSearch = !!this.searchQuery?.trim();
  const flag = isSearch ? '7' : '3';

  this.loader.show();

    this.FetchAcademicYearCount(isSearch).subscribe({
    next: (countResp: any) => {
      this.SyllabusCount = countResp?.data?.[0]?.totalcount ?? 0;   // ← Now correct count!

      const payload: any = {
        Flag: flag,
        SortColumn: this.sortColumn,
        SortDirection: this.sortDirection,
        SchoolID:this.AdminselectedSchoolID || '',
        AcademicYear:this.AdminselectedAcademivYearID || '',
        Class:this.AdminselectedClassID || '',
        Division:this.AdminselectedDiviosnID
      };

      if (isSearch) payload.AdmissionNo = this.searchQuery.trim();

      this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', payload).subscribe({
        next: (response: any) => {
          this.mapAcademicYears(response);
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
                AcademicYearName:item.academicYearName,//${item.admissionNo ?? ''}
                Name: `${item.firstName ?? ''} ${item.middleName ?? ''} ${item.lastName ?? ''}`.replace(/\s+/g, ' ').trim(),
                ClassDivisionName:item.classDivisionName,
                IsActive: isActiveString,
                IsPresent: true,
                Marks: '',
                Remarks: '',
                StartTime: '',
                EndTime: ''

              };
  });
  this.applySelectedSessionTimes();
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
    this.loadAttendanceTableIfReady();
  }

  cancelAttendanceTable() {
    this.resetAttendanceTableState();
  }

  onAttendanceToggleChange(student: any) {
    const studentName = student.Name || student.FirstName || student.AdmissionNo;
    const status = student.IsPresent ? 'Present' : 'Absent';
    if (!student.IsPresent) {
      student.LateInMinutes = '';
    } else {
      student.Remarks = '';
    }
    this.statusModalTitle = 'Attendance Status';
    this.AminityInsStatus = `${studentName} status is ${status}.`;
    this.isModalOpen = true;
  }

  private isAttendanceFilterReady(): boolean {
    const hasSchool = !this.isAdmin || !!this.AdminselectedSchoolID;
    return hasSchool &&
      !!this.AdminselectedAcademivYearID &&
      !!this.AdminselectedClassID &&
      !!this.AdminselectedDiviosnID;
  }

  private resetAttendanceTableState() {
    this.isTableModalOpen = false;
    this.SyllabusList = [];
    this.SyllabusCount = 0;
  }

  private loadAttendanceTableIfReady() {
    if (!this.isAttendanceFilterReady()) {
      this.resetAttendanceTableState();
      return;
    }

    this.isTableModalOpen = true;
    this.resetPaginationAndFetch();
  }


  selectedExam: any;
  openAttendance(examRow: any) {
      this.attendanceMode = 'add';   


    this.selectedExam = examRow;
    this.selectedExamIDForAttendance = Number(examRow.ID);
    this.selectedSubjectID=Number(examRow.SubjectID);
    this.maxMarks = Number(examRow.MaxMarks);   // ✅ store max marks to restrict the marks entering more than max marks
    this.passmarks = Number(examRow.PassMarks);   // ✅ store max marks to restrict the marks entering more than max marks


    this.FetchClassStudentsList();
    this.IsAddNewClicked = true;
  }

  openViewAttendance(examRow: any) {
    this.attendanceMode = 'view';   // ✅ UPDATE MODE

    this.selectedExam = examRow;
    this.selectedExamIDForAttendance = Number(examRow.ID);
    this.selectedSubjectID=Number(examRow.SubjectID);
    this.maxMarks = Number(examRow.MaxMarks);   // ✅ important
    this.passmarks = Number(examRow.PassMarks);   // ✅ store max marks to restrict the marks entering more than max marks


    this.FetchClassStudentsListAfterAttendance();
    this.IsAddNewClicked = true;
  }
 validateMarks(student: any) {

  if (student.Marks && Number(student.Marks) > this.maxMarks) {

    alert("Marks cannot be greater than " + this.maxMarks);

    student.Marks = this.maxMarks;   // or "" if you want empty
  }

  if (student.Marks < 0) {
    student.Marks = 0;
  }

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



submitAttendance() {
  const session = this.SyllabusForm.get('Session')?.value;
  if (!session || session === 0 || session === '0') {
    this.AminityInsStatus = '⚠️ Please select Session before submitting.';
    this.statusModalTitle = 'Validation Warning';
    this.isModalOpen = true;
    return;
  }

  const attendanceDate = this.SyllabusForm.get('AttendanceDateTime')?.value;
  if (!attendanceDate) {
    this.AminityInsStatus = '⚠️ Please select Attendance Date.';
    this.statusModalTitle = 'Validation Warning';
    this.isModalOpen = true;
    return;
  }

  const invalidTimeStudent = this.SyllabusList.find(s => !s.StartTime || !s.EndTime);
  if (invalidTimeStudent) {
    this.AminityInsStatus = '⚠️ Start Time and End Time must be set. Please select Session.';
    this.statusModalTitle = 'Validation Warning';
    this.isModalOpen = true;
    return;
  }

  const invalidLate = this.SyllabusList.find(
    s => s.LateInMinutes !== null && Number(s.LateInMinutes) < 0
  );
  if (invalidLate) {
    this.AminityInsStatus = '⚠️ Late minutes cannot be negative.';
    this.statusModalTitle = 'Validation Warning';
    this.isModalOpen = true;
    return;
  }

  const body = {
    Flag: '1',
    SchoolID: this.AdminselectedSchoolID,
    AcademicYear: this.AdminselectedAcademivYearID,
    Class: this.AdminselectedClassID,
    Division: this.AdminselectedDiviosnID,
    AttendanceDate: attendanceDate,
    Session: this.AdminSelectedSessionID,
    Students: this.SyllabusList.map(student => ({
      AdmissionID: student.AdmissionNo,
      Attendance: student.IsPresent ? '1' : '0',
      LateInMinutes: (student.LateInMinutes ?? 0).toString(),
      Remarks: student.IsPresent ? '' : (student.Remarks ?? '').trim()
    }))
  };

  this.apiurl.post('Tbl_StudentAttendance_CRUD_Operations', body).subscribe({
      next: () => {
      this.AminityInsStatus = 'Attendance Saved Successfully';
      this.statusModalTitle = 'Application Status';
      this.isModalOpen = true;
      this.isAttendanceSubmitted = true;
      this.IsAddNewClicked = false;
      this.isTableModalOpen = false;
      this.resetPaginationAndFetch();
      this.resetTable();
    },
    error: (err) => {
      if (err.status === 400) {
        this.AminityInsStatus = err.error?.Message || 'Attendance already exists for this session.';
        this.statusModalTitle = 'Duplicate Entry';
      } else {
        this.AminityInsStatus = 'Error saving Attendance';
        this.statusModalTitle = 'Application Status';
      }
      this.isModalOpen = true;
    }
  });
}

  UpdateAttendance() {
   const invalidStudent = this.studentsList.find(student =>
  student.AttendanceMarked === '1' && (
    student.Marks === undefined ||
    student.Marks === null ||
    student.Marks === '' ||
    Number(student.Marks) > this.maxMarks ||
    Number(student.Marks) < 0
  )
);

  if (invalidStudent) {
    this.AminityInsStatus = "Please enter valid marks Can't exceed more than (" + this.maxMarks + ") for all students.";
    this.statusModalTitle = 'Application Status';
    this.isModalOpen = true;
    return;
  }
  const requests: any[] = [];

  this.studentsList.forEach(student => {

    const body = {
      Flag: '5',
      SchoolID: this.AdminselectedSchoolID,   
        AcademicYear: this.AdminselectedAcademivYearID, 
        ExamID: this.selectedExamIDForAttendance.toString(), 
        SubjectID: this.selectedSubjectID.toString(), 
        AdmissionID: student.AdmissionNo,       
        Marks: (student.Marks ?? '0').toString()
    };

    requests.push(this.apiurl.post('Tbl_ExamMarks_CRUD_Operations', body));
  });

  Promise.all(requests.map(req => req.toPromise()))
    .then(() => {
      
      this.AminityInsStatus ='Marks updated Successfully';
      this.statusModalTitle = 'Application Status';
      this.isModalOpen=true;

      this.isAttendanceSubmitted=true;
      this.IsAddNewClicked = false;
      this.resetPaginationAndFetch();
    })
    .catch(err => {
      console.error(err);
      this.AminityInsStatus ='Error Updating marks';
      this.statusModalTitle = 'Application Status';
      this.isModalOpen=true;

    });

  }

  AddNewClicked() {
     
    this.IsAddNewClicked = !this.IsAddNewClicked;
    this.IsActiveStatus = true;
    this.ViewSyllabusClicked = false;
  };

  onSearchChange() {
    clearTimeout(this.searchTimer);

    this.searchTimer = setTimeout(() => {
      const value = this.searchQuery?.trim() || '';

      if (value.length === 0) {
        this.FetchInitialData();
        return;
      }

      if (value.length < this.SEARCH_MIN_LENGTH) {
        return;
      }

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
      this.statusModalTitle = 'Application Status';
    }
  };

  handleOk() {
    this.isModalOpen = false;
    this.statusModalTitle = 'Application Status';
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
    this.FetchInitialData();
  };

  viewReview(SyllabusID: string): void {
    this.FetchSyllabusDetByID(SyllabusID, 'view');
    this.isViewModalOpen = true;
  };
 
onSessionChange(event: any) {
  const selectedSessionId = event.target.value;
   if (selectedSessionId.length === 0) {
      this.AdminSelectedSessionID = "";
    } else {
      this.AdminSelectedSessionID = selectedSessionId; 
    }

  this.applySelectedSessionTimes();
}
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
  this.FetchClassList();
  this.FetchSessionsList();
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
    this.resetTable();
    const today = new Date().toISOString().split('T')[0];
    this.SyllabusForm.get('AttendanceDateTime')?.setValue(today);
  }


  resetFilters(level: 'school' | 'academic' | 'class'|'submit') {

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
      Session:'0',
      
    });
  }
  if (level === 'submit') {
    // Reset everything below school
    this.AdminselectedAcademivYearID = '';
    this.AdminselectedClassID = '';
    this.AdminselectedDiviosnID = '';
    this.AdminselecteExamID = '';
    this.AdminselectedSchoolID='';

    this.academicYearList = [];
    this.classLists = [];
    this.divisionsList = [];
    this.examLists = [];
    this.schoolList=[];

    this.SyllabusForm.patchValue({
      School:'0',
      AcademicYear: '0',
      Class: '0',
      Divisions: '0',
      Session:'0',
      AttendanceDateTime:'0'
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
      Session:'0'

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
  this.resetTable();
}
  resetTable() {
    this.SyllabusList = [];
    this.SyllabusCount = 0;
    this.isTableModalOpen = false;
  }

private getSelectedSessionTimes(): { start: string; end: string } {
  const selectedSession = this.SessionList.find(
    (s: any) => String(s.ID) === String(this.AdminSelectedSessionID)
  );

  return {
    start: selectedSession?.StartTime ? selectedSession.StartTime.substring(0, 5) : '',
    end: selectedSession?.EndTime ? selectedSession.EndTime.substring(0, 5) : ''
  };
}

private applySelectedSessionTimes() {
  const { start, end } = this.getSelectedSessionTimes();

  this.SyllabusList.forEach((student: any) => {
    student.StartTime = start;
    student.EndTime = end;
    student.LateInMinutes = null;
  });
}

}
