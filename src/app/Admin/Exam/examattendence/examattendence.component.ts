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

    if (this.isTeacher) {
      this.AdminselectedSchoolID = this.resolvedSchoolId || this.ss('SchoolID') || this.ss('schoolId');
      this.resolveStaffIdentity();
      this.FetchAcademicYearsList();

      // For teachers, remove validators from School, Class, Divisions (auto-resolved)
      this.SyllabusForm.get('School').clearValidators();
      this.SyllabusForm.get('School').updateValueAndValidity();
      this.SyllabusForm.get('Class').clearValidators();
      this.SyllabusForm.get('Class').updateValueAndValidity();
      this.SyllabusForm.get('Divisions').clearValidators();
      this.SyllabusForm.get('Divisions').updateValueAndValidity();
    } else {
      this.FetchSchoolsList();
      if (!this.isAdmin) {
        this.AdminselectedSchoolID =
          sessionStorage.getItem('SchoolID')?.toString() ||
          sessionStorage.getItem('schoolId')?.toString() ||
          '';
        this.SyllabusForm.patchValue({ School: this.AdminselectedSchoolID });

        // For SchoolAdmin, remove School validator (auto-resolved from session)
        this.SyllabusForm.get('School').clearValidators();
        this.SyllabusForm.get('School').updateValueAndValidity();

        // Add validators for Class and Divisions for SchoolAdmin
        this.SyllabusForm.get('Class').setValidators([Validators.required, Validators.min(1)]);
        this.SyllabusForm.get('Class').updateValueAndValidity();
        this.SyllabusForm.get('Divisions').setValidators([Validators.required, Validators.min(1)]);
        this.SyllabusForm.get('Divisions').updateValueAndValidity();
      } else {
        // For SuperAdmin, add validators for School, Class, Divisions
        this.SyllabusForm.get('School').setValidators([Validators.required, Validators.min(1)]);
        this.SyllabusForm.get('School').updateValueAndValidity();
        this.SyllabusForm.get('Class').setValidators([Validators.required, Validators.min(1)]);
        this.SyllabusForm.get('Class').updateValueAndValidity();
        this.SyllabusForm.get('Divisions').setValidators([Validators.required, Validators.min(1)]);
        this.SyllabusForm.get('Divisions').updateValueAndValidity();
      }
      this.FetchAcademicYearsList();
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
  teacherAssignedClassID: string = '';
  teacherAssignedDivisionID: string = '';
  AdminselecteExamID:string = '';
  selectedExamIDForAttendance!: number;
  selectedSubjectID!: number;
  attendanceMode: 'add' | 'view' = 'add';

  SyllabusForm :any= new FormGroup({
    ID: new FormControl(''),
    SchoolID:new FormControl(''),
    AdmissionID: new FormControl(true),
    Attendance: new FormControl(true),
    Divisions: new FormControl(0),
    Class: new FormControl(0),
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

  private get currentRollID(): string {
    return sessionStorage.getItem('RollID') || localStorage.getItem('RollID') || '';
  }

  private get currentRoleName(): string {
    return sessionStorage.getItem('role') || localStorage.getItem('role') || '';
  }

  get isTeacher(): boolean {
    const r = this.currentRoleName.toLowerCase();
    const id = this.currentRollID;
    return id === '3' || r.includes('teacher') || r.includes('teaching');
  }

  get isSchoolAdmin(): boolean {
    const r = this.currentRoleName.toLowerCase();
    const id = this.currentRollID;
    return !this.isAdmin && (id === '2' || id === '8' || r.includes('admin') || r.includes('principal') || r.includes('management'));
  }

  private get resolvedSchoolId(): string {
    const keys = ['SchoolID', 'schoolId', 'schoolID', 'SchoolId', 'sId', 'sid', 'SID', 'SId', 'school_id', 'School_Id', 'user_school_id'];
    for (const k of keys) {
      const val = this.ss(k);
      if (val && val !== '0' && val !== 'null' && val !== 'undefined' && !isNaN(Number(val))) {
        return val.toString().trim();
      }
    }
    return this.AdminselectedSchoolID || '';
  }

  private ss(key: string): string {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
  }

  private get sessionApplicantId(): string {
    // Do not use role identifiers as staff identifiers.
    const keys = ['StaffID', 'staffId', 'StaffId', 'UserID', 'userId', 'UserId', 'user_id', 'id', 'ID'];
    for (const k of keys) {
      const val = this.ss(k);
      if (val && val !== '0' && val !== 'null' && val !== 'undefined' && !isNaN(Number(val))) {
        return val.toString().trim();
      }
    }
    return '';
  }

  private resolvedStaffId: string = '';

  get currentUserId(): string {
    return this.resolvedStaffId || this.sessionApplicantId || this.ss('StaffID') || this.ss('UserID');
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
          console.log('[EXAM ATTENDANCE] Resolved Teacher StaffID:', this.resolvedStaffId);
        }
      },
      complete: () => {
        if (this.isTeacher && !this.currentUserId) {
          console.warn('[EXAM ATTENDANCE] Teacher StaffID could not be resolved from session/email mapping.');
        }
        if (this.isTeacher && this.AdminselectedAcademivYearID) {
          this.syncTeacherClassDivisionFromAllocation(() => this.FetchExamsList());
        }
      }
    });
  }

  private normalizeId(value: any): string {
    const normalized = String(value ?? '').trim();
    return normalized === '0' || normalized.toLowerCase() === 'null' || normalized.toLowerCase() === 'undefined'
      ? ''
      : normalized;
  }

  private tokenizeDivisionIds(raw: any): string[] {
    return String(raw ?? '')
      .split(/[|,]/)
      .map(v => this.normalizeId(v))
      .filter(Boolean);
  }

  private rowContainsTeacherDivision(row: any): boolean {
    if (!this.teacherAssignedDivisionID) return true;
    const fromDivisionList = this.tokenizeDivisionIds(row?.divisionList ?? row?.DivisionList);
    const fromDivisions = this.tokenizeDivisionIds(row?.divisions ?? row?.Divisions);
    const fromTeacherDivision = this.tokenizeDivisionIds(row?.teacherDivisionID ?? row?.TeacherDivisionID ?? row?.teacherDivision ?? row?.TeacherDivision);
    const candidateIds = new Set<string>([...fromDivisionList, ...fromDivisions, ...fromTeacherDivision]);
    return candidateIds.size === 0 || candidateIds.has(this.teacherAssignedDivisionID);
  }

  private syncTeacherClassDivisionFromAllocation(onDone?: () => void): void {
    if (!this.isTeacher) {
      onDone?.();
      return;
    }

    const schoolId = this.getCurrentSchoolId();
    const academicYear = this.AdminselectedAcademivYearID || '';
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
        const currentStaff = this.normalizeId(staffId);
        const match = rows.find((x: any) =>
          this.normalizeId(x?.classTeacher ?? x?.ClassTeacher) === currentStaff
        ) || rows[0];

        if (!match) return;

        const classId = this.normalizeId(match?.class ?? match?.Class);
        const divisionId = this.normalizeId(match?.division ?? match?.Division);
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

  private getSelectedExamTypeId(): string {
    const formExam = String(this.SyllabusForm?.get('ExamType')?.value ?? '').trim();
    if (formExam && formExam !== '0') return formExam;
    return (this.AdminselecteExamID || '').toString().trim();
  }

  private matchesSelectedExamType(item: any, selectedExamTypeId: string): boolean {
    const candidateIds = [
      item?.examType,
      item?.ExamType,
      item?.examTypeID,
      item?.ExamTypeID,
      item?.examTypeId
    ]
      .map((v: any) => String(v ?? '').trim())
      .filter(Boolean);

    return candidateIds.includes(selectedExamTypeId);
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
  if (this.isTeacher) {
    if (!this.AdminselectedAcademivYearID || !this.currentUserId) {
      this.examLists = [];
      return;
    }

    const teacherPayload: any = {
      SchoolID: this.getCurrentSchoolId(),
      AcademicYear: this.AdminselectedAcademivYearID || '',
      Divisions: this.teacherAssignedDivisionID || this.AdminselectedDiviosnID || '',
      StaffID: this.currentUserId || '-1',
      Flag: '12'
    };

    this.apiurl.post<any>('Tbl_SetExam_CRUD_Operations', teacherPayload)
      .subscribe(
        (response: any) => {
          const rows = (Array.isArray(response?.data) ? response.data : [])
            .filter((row: any) => this.rowContainsTeacherDivision(row));
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
          console.log('[EXAM ATTENDANCE] Teacher exam list (Flag 12):', this.examLists);
        },
        () => {
          this.examLists = [];
        }
      );
    return;
  }

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

    const payload: any = {
      SchoolID: this.getCurrentSchoolId(),
      AcademicYear: this.AdminselectedAcademivYearID || '',
      Class: this.AdminselectedClassID || '',
      Divisions: this.AdminselectedDiviosnID || '',
      ExamType: this.AdminselecteExamID || '',
      ExamTypeName: isSearch ? this.searchQuery.trim() : null
    };

    // For teachers, use StaffID in FLAG 12
    if (this.isTeacher) {
      payload.StaffID = this.currentUserId || '-1';
      payload.Divisions = this.teacherAssignedDivisionID || this.AdminselectedDiviosnID || '';
      payload.Flag = '12';
    } else {
      payload.Flag = isSearch ? '8' : '6';
    }

    return this.apiurl.post<any>('Tbl_SetExam_CRUD_Operations', payload);
  }
private resetPaginationAndFetch() {
 this.currentPage = 1;
  this.pageCursors = [];        // ← Critical: clears old cursors
  this.SyllabusList = [];       // Clear old table immediately
  this.FetchInitialData();
}

  FetchInitialData(extra: any = {}) {
  const isSearch = !!this.searchQuery?.trim();
  let flag = isSearch ? '7' : '10';

  // For teachers, use FLAG 12
  if (this.isTeacher) {
    flag = '12';
  }

  this.loader.show();

  this.FetchAcademicYearCount(isSearch).subscribe({
    next: (countResp: any) => {
      this.SyllabusCount = countResp?.data?.[0]?.totalcount ?? 0;

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

        // ALL filters always sent
        SchoolID: this.getCurrentSchoolId(),
        AcademicYear: this.AdminselectedAcademivYearID || '',
        Class: this.AdminselectedClassID || '',
        Divisions: this.AdminselectedDiviosnID || '',
        ExamType: this.AdminselecteExamID || '',

        ...extra
      };

      // For teachers, pass StaffID
      if (this.isTeacher) {
        payload.StaffID = this.currentUserId || '-1';
        payload.Divisions = this.teacherAssignedDivisionID || this.AdminselectedDiviosnID || '';
        console.log('[EXAM ATTENDANCE] Teacher payload - currentUserId:', this.currentUserId, 'Flag:', flag);
      }

      if (isSearch) payload.ExamTypeName = this.searchQuery.trim();

      this.apiurl.post<any>('Tbl_SetExam_CRUD_Operations', payload).subscribe({
        next: (response: any) => {
          let responseData = Array.isArray(response?.data) ? response.data : [];
          const selectedExamTypeId = this.getSelectedExamTypeId();

          if (this.isTeacher) {
            responseData = responseData.filter((row: any) => this.rowContainsTeacherDivision(row));
          }

          // Safety net: if FLAG 12 ignores ExamType on backend, filter on client by selected exam id.
          if (this.isTeacher && selectedExamTypeId) {
            const before = responseData.length;
            responseData = responseData.filter((row: any) => this.matchesSelectedExamType(row, selectedExamTypeId));
            console.log('[EXAM ATTENDANCE] Teacher exam filter:', {
              selectedExamTypeId,
              before,
              after: responseData.length
            });
          }

          // For teachers with FLAG 12, auto-populate class/division and handle response
          if (this.isTeacher && flag === '12' && responseData.length > 0 && !this.AdminselectedClassID) {
            const firstExam = responseData[0];
            const classId = this.normalizeId(firstExam.classID || firstExam.class || firstExam.Class);
            const divisionId = this.normalizeId(
              firstExam.TeacherDivisionID ||
              firstExam.teacherDivisionID ||
              firstExam.TeacherDivision ||
              firstExam.teacherDivision ||
              firstExam.divisionList ||
              firstExam.DivisionList
            );
            const className = firstExam.ClassName;
            const divisionName = firstExam.TeacherDivisionName || firstExam.DivisionName;

            if (classId && divisionId) {
              this.AdminselectedClassID = String(classId);
              this.AdminselectedDiviosnID = String(divisionId);
              console.log('[EXAM ATTENDANCE] Teacher class/division from FLAG 12:', {
                classId: this.AdminselectedClassID,
                divisionId: this.AdminselectedDiviosnID,
                className,
                divisionName
              });

              // Populate class list with the assigned class
              this.classLists = [{
                ID: String(classId),
                Name: className || `Class ${classId}`,
                Division: divisionName || `Division ${divisionId}`
              }];

              // Populate division list with the assigned division
              this.divisionsList = [{
                ID: String(divisionId),
                Name: divisionName || `Division ${divisionId}`
              }];

              // Update form values
              this.SyllabusForm.patchValue({
                Class: String(classId),
                Divisions: String(divisionId)
              });
            }
          }

          this.mapAcademicYears({ ...response, data: responseData });
          if (this.isTeacher) {
            this.SyllabusCount = responseData.length;
          }

          if (responseData.length > 0 && !this.pageCursors[this.currentPage - 1]) {
            const lastRow = responseData[responseData.length - 1];
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
      
      let displayExamType = item.examTypeName || item.examType || item.ExamType || '-';
      const divisionDisplay =
        String(
          item.divisionName ??
          item.classDivisionName ??
          item.divisionList ??
          item.divisions ??
          item.Division ??
          '-'
        ).trim() || '-';
    
    
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
      Divisions: divisionDisplay,
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
    // Keep selected exam filter synced even if change-event timing varies.
    const examFromForm = this.getSelectedExamTypeId();
    this.AdminselecteExamID = examFromForm && examFromForm !== '0' ? examFromForm : '';

    if (this.isTeacher && this.teacherAssignedClassID && this.teacherAssignedDivisionID) {
      this.AdminselectedClassID = this.teacherAssignedClassID;
      this.AdminselectedDiviosnID = this.teacherAssignedDivisionID;
    }

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
  this.teacherAssignedClassID = '';
  this.teacherAssignedDivisionID = '';
  this.resetFilters('academic');  
  if (this.isTeacher) {
    this.syncTeacherClassDivisionFromAllocation(() => this.FetchExamsList());
  } else {
    this.FetchExamsList();
    this.FetchClassList();
  }
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
