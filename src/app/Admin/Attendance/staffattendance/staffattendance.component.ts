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
  selector: 'app-staffattendance',
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './staffattendance.component.html',
  styleUrl: './staffattendance.component.css'
})
export class StaffattendanceComponent extends BasePermissionComponent {
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
    if (this.isAdmin) {
      this.FetchRoleList();
    } else {
      this.AdminselectedSchoolID = sessionStorage.getItem('SchoolID')?.toString() || '';
      this.FetchAcademicYearsList();
      this.FetchRoleListBySchoolID();
    }

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
  SessionList: any[] = [];
  isModalOpen = false;
  isViewMode = false;
  viewSyllabus: any = null;
  AminityInsStatus: any = '';
  statusModalTitle = 'Application Status';
  isViewModalOpen = false;
  Submitbuttonclicks = false;
  SyllabusCount: number = 0;
  ActiveUserId: string = localStorage.getItem('email')?.toString() || '';
  roleId = localStorage.getItem('RollID');

  maxMarks: number = 0;
  passmarks: number = 0;
  sortColumn: string = 'Name';
  sortDirection: 'asc' | 'desc' = 'desc';
  editclicked: boolean = false;
  schoolList: any[] = [];
  selectedSchoolID: string = '';
  SchoolSelectionChange: boolean = false;
  isTableModalOpen = false;
  academicYearList: any[] = [];
  classLists: any[] = [];
  examLists: any[] = [];
  divisionsList: any[] = [];
  examslist: any[] = [];
  studentsList: any[] = []
  StaffTypeList: any[] = [];
  StaffTypeListBySchoolId: any[] = [];
  AdminselectedSchoolID: string = '';
  AdminselectedAcademivYearID: string = '';
  AdminselectedClassID: string = '';
  AdminselectedDiviosnID: string = '';
  AdminselecteExamID: string = '';
  AdminSelectedSessionID: string = '';
  selectedExamIDForAttendance!: number;
  selectedSubjectID!: number;
  attendanceMode: 'add' | 'view' = 'add';

  // Staff type dropdown properties
  selectedStaffCategories: string[] = [];
  staffTypeDropdownOpen: boolean = false;
  fullStaffList: any[] = []; // Store complete dataset for filtering

  SyllabusForm: any = new FormGroup({
    ID: new FormControl(''),
    SchoolID: new FormControl(''),
    AdmissionID: new FormControl(true),
    Marks: new FormControl(true),
    Divisions: new FormControl(0),
    Class: new FormControl(0),
    ExamType: new FormControl(''),
    StartTime: new FormControl(''),
    EndTime: new FormControl(''),
    Session: new FormControl(0, [Validators.required, Validators.min(1)]),
    leaveType: new FormControl(''),
    School: new FormControl(0, [Validators.required, Validators.min(1)]),
    AcademicYear: new FormControl(0, [Validators.required, Validators.min(1)]),
    AttendanceDateTime: new FormControl('', [Validators.required]),
    LateInMinutes: new FormControl(''),
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

    return this.AdminselectedSchoolID || sessionStorage.getItem('SchoolID')?.toString() || '';
  }

  public getAvailableStaffTypes(): any[] {
    return this.StaffTypeListBySchoolId.length > 0 ? this.StaffTypeListBySchoolId : this.StaffTypeList;
  }

  private getStaffTypeNames(staffTypeValue: string): string {
    const staffTypes = staffTypeValue
      ? staffTypeValue.split(',').map((id: string) => id.trim()).filter(Boolean)
      : [];

    const availableTypes = this.getAvailableStaffTypes();

    return staffTypes
      .map((id: string) => availableTypes.find((type: any) => String(type.ID) === String(id))?.Name || id)
      .join(', ');
  }

  FetchRoleList() {
    const requestData = {
      SchoolID: this.getCurrentSchoolId(),
      Flag: '2'
    };

    this.apiurl.post<any>('Tbl_Roles_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.StaffTypeList = response.data.map((item: any) => ({
              ID: item.id,
              Name: item.roleName,
              IsActive: item.isActive === "1" ? "Active" : "InActive"
            }));
          } else {
            this.StaffTypeList = [];
          }
        },
        () => {
          this.StaffTypeList = [];
        }
      );
  }

  FetchRoleListBySchoolID() {
    const requestData = {
      SchoolID: this.getCurrentSchoolId(),
      Flag: '2'
    };

    this.apiurl.post<any>('Tbl_Roles_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.StaffTypeListBySchoolId = response.data.map((item: any) => ({
              ID: item.id,
              Name: item.roleName,
              IsActive: item.isActive === "1" ? "Active" : "InActive"
            }));
          } else {
            this.StaffTypeListBySchoolId = [];
          }
        },
        () => {
          this.StaffTypeListBySchoolId = [];
        }
      );
  }

  FetchAcademicYearsList() {
    const requestData = {
      SchoolID: this.getCurrentSchoolId(),
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
      ExamType: this.AdminselecteExamID || '',
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
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: this.AdminselectedAcademivYearID || '',
      Class: this.AdminselectedClassID || '',
      Divisions: this.AdminselectedDiviosnID,
      ExamType: this.selectedExamIDForAttendance.toString(),
      Subjects: this.selectedSubjectID.toString(),
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
                School: item.schoolID,
                AcademicYear: item.academicYear,
                AdmissionNo: item.admissionNo,
                Class: item.className,
                Division: item.divisions,
                FirstName: item.firstName,
                MiddleName: item.middleName,
                LastName: item.lastName,
                SchoolName: item.schoolName,
                AcademicYearName: item.academicYearName,
                ClassName: item.className,
                Name: `${item.admissionNo ?? ''} - ${item.firstName ?? ''} ${item.middleName ?? ''} ${item.lastName ?? ''}`.replace(/\s+/g, ' ').trim(),
                ClassDivisionName: item.classDivisionName,
                AttendanceMarked: item.attendanceMarked,
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

  FetchClassStudentsListAfterAttendance() {
    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: this.AdminselectedAcademivYearID || '',
      // Class:this.AdminselectedClassID || '',
      // Division:this.AdminselectedDiviosnID,
      ExamID: this.selectedExamIDForAttendance.toString(),
      SubjectID: this.selectedSubjectID.toString(),
      Flag: '9'
    };

    this.apiurl.post<any>('Tbl_ExamMarks_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.studentsList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";

              return {
                ID: item.id,
                School: item.schoolID,
                AcademicYear: item.academicYear,
                AdmissionNo: item.admissionID,
                FirstName: item.studentName,
                Class: item.className,
                SchoolName: item.schoolName,
                AcademicYearName: item.academicYearName,
                Division: item.divisionName,
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
    const payload: any = {
      Flag: isSearch ? '8' : '6',
      SchoolID: this.getCurrentSchoolId(),
      Name: isSearch ? this.searchQuery.trim() : null
    };
    
    return this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', payload);
  }
  private resetPaginationAndFetch() {
    this.SyllabusList = [];       // Clear old table immediately
    this.FetchInitialData();
  }

  FetchInitialData(extra: any = {}) {
    const isSearch = !!this.searchQuery?.trim();
    const flag = isSearch ? '7' : '2';

    this.loader.show();

    this.FetchAcademicYearCount(isSearch).subscribe({
      next: (countResp: any) => {
        this.SyllabusCount = countResp?.data?.[0]?.totalCount ?? 0;

        const payload: any = {
          Flag: flag,
          SortColumn: this.sortColumn,
          SortDirection: this.sortDirection,
          SchoolID: this.getCurrentSchoolId(),
          ...extra
        };

        if (isSearch) payload.Name = this.searchQuery.trim();

        this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', payload).subscribe({
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
    // Store the complete dataset
    this.fullStaffList = (response.data || []).map((item: any) => {
      const isActiveString = item.isActive === "1" ? "Active" : "InActive";
      return {
        ID: item.id,
        School: item.schoolID,
        AcademicYear: item.academicYear,
        StaffType: item.staffType,
        StaffTypeNames: this.getStaffTypeNames(item.staffType),
        FirstName: item.firstName,
        MiddleName: item.middleName,
        LastName: item.lastName,
        MobileNumber: item.mobileNumber,
        Email: item.email,
        Qualification: item.qualification,
        SchoolName: item.schoolName,
        AcademicYearName: item.academicYearName,
        Name: `${item.firstName ?? ''} ${item.middleName ?? ''} ${item.lastName ?? ''}`.replace(/\s+/g, ' ').trim(),
        IsActive: isActiveString,
        IsPresent: true,
        StartTime: '',
        EndTime: '',
        leavetype: '0',
        Remarks: ''
      };
    });
    
    this.applySelectedSessionTimes();

    // Apply staff type filter if any is selected
    this.applyStaffTypeFilter();
    
    console.log('this.SyllabusList', this.SyllabusList)
  }

  formatDateYYYYMMDD(dateStr: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }

  formatDateDDMMYYYY(dateStr: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
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

    // ✅ Reset leave type when Present
    if (student.IsPresent) {
      student.leavetype = '0';
      student.Remarks = '';
    } else {
      student.LateInMinutes = '';
    }

    this.statusModalTitle = 'Attendance Status';
    this.AminityInsStatus = `${studentName} status is ${status}.`;
    this.isModalOpen = true;
  }

  private isAttendanceFilterReady(): boolean {
    return !!this.getCurrentSchoolId() && !!this.AdminselectedAcademivYearID;
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
    this.selectedSubjectID = Number(examRow.SubjectID);
    this.maxMarks = Number(examRow.MaxMarks);   // ✅ store max marks to restrict the marks entering more than max marks
    this.passmarks = Number(examRow.PassMarks);   // ✅ store max marks to restrict the marks entering more than max marks


    this.FetchClassStudentsList();
    this.IsAddNewClicked = true;
  }

  openViewAttendance(examRow: any) {
    this.attendanceMode = 'view';   // ✅ UPDATE MODE

    this.selectedExam = examRow;
    this.selectedExamIDForAttendance = Number(examRow.ID);
    this.selectedSubjectID = Number(examRow.SubjectID);
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

  const invalidTime = this.SyllabusList.find(s => !s.StartTime || !s.EndTime);
  if (invalidTime) {
    this.AminityInsStatus = '⚠️ Start Time and End Time must be set. Please select Session.';
    this.statusModalTitle = 'Validation Warning';
    this.isModalOpen = true;
    return;
  }

  const invalidLeave = this.SyllabusList.find(
    s => !s.IsPresent && (!s.leavetype || s.leavetype === '0')
  );
  if (invalidLeave) {
    this.AminityInsStatus = `⚠️ Please select leave type for ${invalidLeave.Name || invalidLeave.FirstName} (Absent).`;
    this.statusModalTitle = 'Validation Warning';
    this.isModalOpen = true;
    return;
  }

  const missingRemark = this.SyllabusList.find(
    s => !s.IsPresent && !s.Remarks?.trim()
  );
  if (missingRemark) {
    this.AminityInsStatus = `⚠️ Please enter a remark for ${missingRemark.Name || missingRemark.FirstName} (Absent).`;
    this.statusModalTitle = 'Validation Warning';
    this.isModalOpen = true;
    return;
  }

  const currentUserId = sessionStorage.getItem('UserID') || localStorage.getItem('UserID') || '0';

  // ✅ Single API call — all staff in one Students[]
  const body = {
    Flag: '1',
    SchoolID: this.AdminselectedSchoolID,
    AcademicYear: this.AdminselectedAcademivYearID,
    AttendanceDate: attendanceDate,
    Session: this.AdminSelectedSessionID,
    IsActive: '1',
    CreatedBy: currentUserId,
    Students: this.SyllabusList.map(staff => ({
      StaffID:       staff.ID.toString(),
      Attendance:    staff.IsPresent ? '1' : '0',
      LateInMinutes: (staff.LateInMinutes ?? 0).toString(),
      leavetype:     staff.leavetype ?? '0',
      Remarks:       staff.IsPresent ? '' : (staff.Remarks ?? '').trim()
    }))
  };

  this.loader.show();
  this.apiurl.post('Tbl_StaffAttendance_CRUD_Operations', body).subscribe({
    next: (response: any) => {
      this.loader.hide();
      // Duplicate message flows from DB → backend → frontend
      if (!response.success) {
        this.AminityInsStatus = response.message || 'Some staff already have attendance.';
        this.statusModalTitle = 'Warning';
        this.isModalOpen = true;
        return;
      }
      this.AminityInsStatus = response.message || 'Attendance Saved Successfully';
      this.statusModalTitle = 'Success';
      this.isModalOpen = true;
      this.isAttendanceSubmitted = true;
      this.IsAddNewClicked = false;
      this.isTableModalOpen = false;
      this.resetPaginationAndFetch();
      this.resetTable();
    },
    error: (err) => {
      this.loader.hide();
      // Duplicate message from backend 400 response
      this.AminityInsStatus = err?.error?.message || 'Error saving Attendance';
      this.statusModalTitle = err?.error?.statusCode === 400 ? 'Already Exists' : 'Error';
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

        this.AminityInsStatus = 'Marks updated Successfully';
        this.statusModalTitle = 'Application Status';
        this.isModalOpen = true;

        this.isAttendanceSubmitted = true;
        this.IsAddNewClicked = false;
        this.resetPaginationAndFetch();
      })
      .catch(err => {
        console.error(err);
        this.AminityInsStatus = 'Error Updating marks';
        this.statusModalTitle = 'Application Status';
        this.isModalOpen = true;

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
    this.AdminSelectedSessionID = selectedSessionId === '0' ? '' : selectedSessionId;
    this.applySelectedSessionTimes();
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
                SessionName: `${item.session}-${item.startTime.substring(0, 5)}-${item.endTime.substring(0, 5)}`
              };
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

    this.selectedStaffCategories = [];
    this.staffTypeDropdownOpen = false;
    this.fullStaffList = [];

    this.FetchClassList();
    this.FetchSessionsList();
    const today = new Date().toISOString().split('T')[0];
    this.SyllabusForm.get('AttendanceDateTime')?.setValue(today);
  }

  //   onAdminClasschange(event: Event) {
  //    const classId = (event.target as HTMLSelectElement).value;
  //    this.AdminselectedClassID = classId === "0" ? "" : classId;
  //    this.resetFilters('class');  
  //    this.FetchDivisionsList();
  //  }

  //   onAdminDivisionsChange(event: Event) {
  //     const divisionId = (event.target as HTMLSelectElement).value;
  //     this.AdminselectedDiviosnID = divisionId === "0" ? "" : divisionId;
  //     this.resetTable();  // only table reset needed
  //     this.loadAttendanceTableIfReady();
  //     const today = new Date().toISOString().split('T')[0];
  //   this.SyllabusForm.get('AttendanceDateTime')?.setValue(today);

  //   }


  resetFilters(level: 'school' | 'academic' | 'class' | 'submit') {

    if (level === 'school') {
      this.AdminselectedAcademivYearID = '';
      this.AdminselectedClassID = '';
      this.AdminselectedDiviosnID = '';
      this.AdminselecteExamID = '';
      this.AdminSelectedSessionID = ''; // ✅ FIX: reset session ID

      this.academicYearList = [];
      this.classLists = [];
      this.divisionsList = [];
      this.examLists = [];

      this.SyllabusForm.patchValue({
        AcademicYear: '0',
        Class: '0',
        Divisions: '0',
        Session: '0',
      });
    }
    if (level === 'submit') {
      this.AdminselectedAcademivYearID = '';
      this.AdminselectedClassID = '';
      this.AdminselectedDiviosnID = '';
      this.AdminselecteExamID = '';
      this.AdminselectedSchoolID = '';
      this.AdminSelectedSessionID = ''; // ✅ FIX: reset session ID

      this.academicYearList = [];
      this.classLists = [];
      this.divisionsList = [];
      this.examLists = [];
      this.schoolList = [];

      this.SyllabusForm.patchValue({
        School: '0',
        AcademicYear: '0',
        Class: '0',
        Divisions: '0',
        Session: '0',
        AttendanceDateTime: ''
      });
    }

    if (level === 'academic') {
      this.AdminselectedClassID = '';
      this.AdminselectedDiviosnID = '';
      this.AdminselecteExamID = '';
      this.AdminSelectedSessionID = ''; // ✅ FIX: reset session ID

      this.classLists = [];
      this.divisionsList = [];
      this.examLists = [];

      this.SyllabusForm.patchValue({
        Class: '0',
        Divisions: '0',
        Session: '0',
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
    // this.pageCursors = [];
    this.isTableModalOpen = false;
  }

  // Staff type dropdown methods
  toggleStaffTypeSelection(value: string) {
    const index = this.selectedStaffCategories.indexOf(value);
    if (index > -1) {
      this.selectedStaffCategories.splice(index, 1); // remove if already selected
    } else {
      this.selectedStaffCategories.push(value); // add if not selected
    }
    // Apply filter to current data
    this.applyStaffTypeFilter();
  }

  closeStaffTypeDropdown() {
    this.staffTypeDropdownOpen = false;
  }

  onStaffTypeFilterChange() {
    // Apply filter when selection changes
    this.applyStaffTypeFilter();
  }

  applyStaffTypeFilter() {
    if (!this.fullStaffList || this.fullStaffList.length === 0) {
      this.SyllabusList = [];
      this.SyllabusCount = 0;
      return;
    }

    if (!this.selectedStaffCategories || this.selectedStaffCategories.length === 0) {
      // If no filter selected, show all staff
      this.SyllabusList = [...this.fullStaffList];
      this.SyllabusCount = this.fullStaffList.length;
      return;
    }

    // Filter the full dataset based on selected staff types
    this.SyllabusList = this.fullStaffList.filter(staff => {
      if (!staff.StaffType) return false;
      
      const staffTypeArray = staff.StaffType.split(',').map((id: string) => id.trim());
      
      // Check if any of the staff's types match the selected categories
      return staffTypeArray.some((staffTypeId: string) => 
        this.selectedStaffCategories.includes(staffTypeId)
      );
    });
    
    // Update the count to reflect filtered results
    this.SyllabusCount = this.SyllabusList.length;
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

    this.fullStaffList.forEach((staff: any) => {
      staff.StartTime = start;
      staff.EndTime = end;
      staff.LateInMinutes = null;
    });

    this.SyllabusList.forEach((staff: any) => {
      staff.StartTime = start;
      staff.EndTime = end;
      staff.LateInMinutes = null;
    });
  }

}
