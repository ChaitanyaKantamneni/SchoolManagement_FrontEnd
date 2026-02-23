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
  selector: 'app-setexam',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule], 
  templateUrl: './setexam.component.html',
  styleUrl: './setexam.component.css'
})
export class SetexamComponent extends BasePermissionComponent{
   pageName = 'Set Exam';

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
  const now = new Date();
  now.setSeconds(0, 0); // remove seconds & milliseconds

  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);

  this.today = local.toISOString().slice(0, 16); 

    this.checkViewPermission();
    this.SchoolSelectionChange = false;
    this.FetchSchoolsList();
    this.FetchInitialData();

    //  ADD THIS BLOCK HERE
    
  };
public testClick(): void {
  console.log("Test button clicked");
}

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

  today:string='';
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

  // isModalOpen = false;
  
  isStatusModalOpen = false;   // Application Status popup
  isTableModalOpen = false;    // Generate Table popup
  isViewModalOpen = false;     // View popup (keep as it is)  
  
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
  academicYearList:any[] = [];
  AdminselectedSchoolID:string = '';
  AdminselectedAcademivYearID:string = '';
  AdminselectedClassID:string ='';

  SyllabusForm :any= new FormGroup({
    ID: new FormControl(''),
    SchoolID:new FormControl(''),
    Class: new FormControl([], Validators.required),
    Syllabus: new FormControl(''),
    Divisions: new FormControl(''),
    ExamType: new FormControl(''),
    // ExamTypeName: new FormControl('', Validators.required),
    Subjects: new FormControl(''),
    MaxMarks: new FormControl(''),
    PassMarks: new FormControl(''),
    ExamDateAndTime: new FormControl(''),
    Duration: new FormControl(''),
    NoOfQuestion: new FormControl(''),
    Instructions: new FormControl(''),

School: new FormControl('0'),
    AcademicYear: new FormControl(0,[Validators.required,Validators.min(1)])
  });

  noPastDateTimeValidator(control: any) {
  if (!control.value) return null;

  const selected = new Date(control.value);
  const now = new Date();

  return selected < now ? { pastDateTime: true } : null;
}


classLists:any[]=[];
examLists:any[]=[];


subjectDropdownOpen = false;
selectedSubjects: string[] = [];
toggleSubjectSelection(value: string) {
  const index = this.selectedSubjects.indexOf(value);

  if (index > -1) {
    this.selectedSubjects.splice(index, 1);
  } else {
    this.selectedSubjects.push(value);
  }

  this.SyllabusForm.get('Subjects')?.setValue(this.selectedSubjects);
  //  this.onAdminClasschange();
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
           this.listenExamTypeChanges();   // 👈 call here


        } else {
          this.examLists = [];
        }

      },
      (error) => {
        this.examLists = [];
      }
    );
}
listenExamTypeChanges() {

  this.SyllabusForm.get('ExamType')?.valueChanges.subscribe((value: any) => {

    if (!value || value == '0') {
      this.SyllabusForm.patchValue({
        MaxMarks: '',
        PassMarks: '',
        Duration: '',
        NoOfQuestion: '',
        Instructions: ''
      });
      return;
    }

    const selectedExam = this.examLists.find(e => String(e.ID) === String(value));

    if (selectedExam) {
      this.SyllabusForm.patchValue({
        MaxMarks: selectedExam.MaxMark,
        PassMarks: selectedExam.PassMarks,
        Duration: selectedExam.ExamDuration,
        NoOfQuestion: selectedExam.NoofQuestion,
        Instructions: selectedExam.Instructions
      });
    }

  });

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


subjectsLists:any[]=[]
FetchSubjectsList() {
  const requestData = {
    SchoolID: this.AdminselectedSchoolID || '',
    AcademicYear: this.AdminselectedAcademivYearID || '',
    Class :this.AdminselectedClassID || '',
    Flag: '3'
  };
 
  this.apiurl.post<any>('Tbl_Subject_CRUD_Operations', requestData)
    .subscribe(
      (response: any) => {

        if (response && Array.isArray(response.data)) {
          console.log(response);


          this.subjectsLists = response.data.map((item: any) => {
                            console.log(this.subjectsLists)


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
          this.subjectsLists = [];
        }

      },
      (error) => {
        this.subjectsLists = [];
      }
    );
}


divisionsList:any[] = []
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

  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  FetchAcademicYearCount(isSearch: boolean) {
    let SchoolIdSelected = '';

    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    return this.apiurl.post<any>('Tbl_SetExam_CRUD_Operations', {
      Flag: isSearch ? '8' : '6',
      SchoolID: SchoolIdSelected,
      ExamTypeName: isSearch ? this.searchQuery.trim() : null
    });
  }

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
        this.SyllabusCount = countResp?.data?.[0]?.totalcount ?? 0;

        const payload: any = {
          Flag: flag,
          Limit: this.pageSize,
          SortColumn: this.sortColumn,
          SortDirection: this.sortDirection,
          LastCreatedDate: cursor?.lastCreatedDate ?? null,
          LastID: cursor?.lastID ?? null,
          SchoolID: SchoolIdSelected,
          ...extra
        };

        if (isSearch) payload.ExamType = this.searchQuery.trim();

        this.apiurl.post<any>('Tbl_SetExam_CRUD_Operations', payload).subscribe({
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
  };

   mapAcademicYears(response: any) {
  this.SyllabusList = (response.data || []).map((item: any) => {
    
    let displayExamType = item.examType;
    
    // if (!isNaN(Number(item.examType)) && this.examTypeList.length > 0) {
    //   const matched = this.examTypeList.find(et => et.ID === item.examType);
    //   if (matched) {
    //     displayExamType = matched.Name;
    //   }
    // }
    
    return {
      ID: item.id,
      SchoolID: item.schoolID,
      Syllabus: item.syllabus,
      Class: this.getClassNames(item.class),          // ← friendly for table
      Divisions: item.divisions,
      ExamType: displayExamType,
      ExamTypeID: item.examType,
      Subjects: item.subjects,
      SchoolName: item.schoolName,
      MaxMarks: item.maxMarks,
      PassMarks: item.passMarks,
      ExamDateAndTime: item.examDateAndTime,
      Duration: item.duration,
      NoOfQuestion: item.noOfQuestion,
      Instructions: item.instructions,
      IsActive: item.isActive === "True" || item.isActive === "1" ? 'Active' : 'InActive',
      AcademicYearName: item.academicYearName
    };
  });
}


  AddNewClicked() {
      if (this.isAdmin) {
      this.SyllabusForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
    } else {
      this.SyllabusForm.get('School')?.clearValidators();
    }
    if(this.AdminselectedSchoolID==''){
      this.FetchAcademicYearsList();
    }
    this.SyllabusForm.reset();
    this.SyllabusForm.get('Class').patchValue([]);
    this.classLists=[];
    this.SyllabusForm.get('School').patchValue('0');
    this.SyllabusForm.get('AcademicYear').patchValue('0');
    this.IsAddNewClicked = !this.IsAddNewClicked;
    this.IsActiveStatus = true;
    this.ViewSyllabusClicked = false;
    this.isTableModalOpen = false;

  };

  SubmitSyllabus() {
    if (this.SyllabusForm.invalid) {
      this.SyllabusForm.markAllAsTouched();
      return;
    }

    const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
    const classValue = this.SyllabusForm.get('Class')?.value || [];

    const data = {
      SchoolID: this.SyllabusForm.get('School')?.value,
      AcademicYear: this.SyllabusForm.get('AcademicYear')?.value,
      Class: Array.isArray(classValue) ? classValue.join(',') : classValue,
      Syllabus: this.SyllabusForm.get('Syllabus')?.value || '',
      Divisions: this.SyllabusForm.get('Divisions')?.value || '',
      ExamType: this.SyllabusForm.get('ExamType')?.value || '',
      Subjects: this.SyllabusForm.get('Subjects')?.value || '',
      MaxMarks: this.SyllabusForm.get('MaxMarks')?.value || '',
      PassMarks: this.SyllabusForm.get('PassMarks')?.value || '',
      ExamDateAndTime: this.SyllabusForm.get('ExamDateAndTime')?.value || '',
      Duration: this.SyllabusForm.get('Duration')?.value || '',
      NoOfQuestion: this.SyllabusForm.get('NoOfQuestion')?.value || '',
      Instructions: this.SyllabusForm.get('Instructions')?.value || '',
      IsActive: IsActiveStatusNumeric,
      Flag: '1'

    };

    console.log('Submitting data:', data);

    this.apiurl.post("Tbl_SetExam_CRUD_Operations", data).subscribe({
      next: (response: any) => {
        console.log('Response:', response);
        if (response.statusCode === 200) {
          this.IsAddNewClicked = !this.IsAddNewClicked;
          this.isStatusModalOpen  = true;
          this.AminityInsStatus = "Exam Details Submitted!";
          this.SyllabusForm.reset();
          this.SyllabusForm.markAsPristine();
          this.FetchInitialData();
        } else {
          this.AminityInsStatus = response.message || "Error Setting Exam.";
          this.isStatusModalOpen  = true;
        }
      },
      error: (error) => {
        console.error('Error:', error);
        this.AminityInsStatus = error?.error?.message || "Error Setting Exam.";
        this.isStatusModalOpen  = true;
      }
    });
  };

  FetchSyllabusDetByID(SyllabusID: string, mode: 'view' | 'edit') {
    const data = {
      ID: SyllabusID,
      Flag: "4"
    };

    this.apiurl.post<any>("Tbl_SetExam_CRUD_Operations", data).subscribe(
      (response: any) => {
        const item = response?.data?.[0];
        if (!item) {
          this.SyllabusForm.reset();
          this.viewSyllabus = null;
          return;
        }

        const isActive =item.isActive === "True" ||item.isActive === "1" ||item.isActive === 1 ||item.isActive === true;
        if (mode === 'view') {
           let displayExamType = item.examType;
                // if (!isNaN(Number(item.examType)) && this.examTypeList.length > 0) {
                //   const matched = this.examTypeList.find(et => et.ID === item.examType);
                //   if (matched) {
                //     displayExamType = matched.Name;
                //   }
                // }
                this.isViewMode = true;
                this.viewSyllabus = {
                ID: item.id,
                SchoolID: item.schoolID,
                Syllabus: item.syllabus,
                Class: this.getClassNames(item.class),
                Divisions: item.divisions,
                ExamType: displayExamType,
                Subjects: item.subjects,
                SchoolName: item.schoolName,
                MaxMarks: item.maxMarks,
                PassMarks: item.passMarks,
                ExamDateAndTime: item.examDateAndTime,
                Duration: item.duration,
                NoOfQuestion: item.noOfQuestion,
                Instructions: item.instructions,
                AcademicYearName: item.academicYearName,
                IsActive: item.isActive === "True" || item.isActive === "1"

          };
          this.isViewModalOpen = true;
        }
        const classArray = item.class ? item.class.split(',') : [];
        const subjectArray = item.subjects ? item.subjects.split(',') : [];
       if (mode === 'edit') {

  this.selectedSubjects = subjectArray;
  this.isViewMode = false;

  this.SyllabusForm.patchValue({
    ID: item.id,
    Syllabus: item.syllabus,
    Class: item.class,
    Divisions: item.divisions,
    ExamType: item.examType,
    Subjects: subjectArray,
    SchoolName: item.schoolName,
    MaxMarks: item.maxMarks,
    PassMarks: item.passMarks,
    ExamDateAndTime: item.examDateAndTime,
    Duration: item.duration,
    NoOfQuestion: item.noOfQuestion,
    Instructions: item.instructions,
    School: item.schoolID,
    AcademicYear: item.academicYear
  });

  this.AdminselectedSchoolID = item.schoolID;
  this.AdminselectedAcademivYearID = item.academicYear;

  this.FetchAcademicYearsList();
  this.FetchExamsList();
  this.FetchClassList();

  this.AdminselectedClassID = item.class;

  // ✅ load subjects + divisions first
  this.FetchSubjectsList();
  this.FetchDivisionsList();

  this.IsActiveStatus = isActive;
  this.IsAddNewClicked = true;

  // ✅ IMPORTANT — wait for API lists then create rows
setTimeout(() => {
  const subjectsArr = item.subjects ? item.subjects.split(',') : [];
  const divisionsArr = item.divisions ? item.divisions.split(',') : [];

  const subjectMap: any = {};

  subjectsArr.forEach((sub: any, i: number) => {
    const subjectID = String(sub).trim();
    const divisionsForThisSubject = divisionsArr[i] ? String(divisionsArr[i]).split('|').map(d => d.trim()) : [];

    if (!subjectMap[subjectID]) {
      subjectMap[subjectID] = {
        subjectID: subjectID,
        selectedDivisions: []
      };
    }

    // Push **all divisions individually**
    subjectMap[subjectID].selectedDivisions.push(...divisionsForThisSubject);
  });
  const examDates = item.examDateAndTime ? item.examDateAndTime.split(',') : [];


this.tableRows = Object.values(subjectMap).map((entry: any, index: number) => {
  const subjectObj = this.subjectsLists.find(s => String(s.ID) === String(entry.subjectID));

    return {
      subjectID: String(entry.subjectID),
      subjectName: subjectObj?.Name || '',
      divisions: [...this.divisionsList],
      selectedDivisions: [...entry.selectedDivisions],
      divisionDropdownOpen: false,
      maxMarks: item.maxMarks,
      passMarks: item.passMarks,
    examDateAndTime: examDates[index] || '', // ✅ assign per subject
      duration: item.duration,
      noOfQuestions: item.noOfQuestion,
      instructions: item.instructions,
      isActive: true
    };
  });

  console.log("EDIT MODE TABLE ROWS", this.tableRows);
  this.isTableModalOpen = true;

}, 500);

}
      },
      error => {
        console.error(error);
      }
    );
  };
  getClassNames(classIds: string): string {
    if (!classIds || classIds.trim() === '') return 'N/A';
    
    const ids = classIds.split(',').map(id => id.trim());
    const names = ids.map(id => {
      const classItem = this.classLists.find(c => c.ID === id);
      return classItem ? `${classItem.Name}-${classItem.Division}` : id;
    });
    
    return names.join(', ');
  }

  UpdateSyllabus() {
    if (this.SyllabusForm.invalid) {
      this.SyllabusForm.markAllAsTouched();
      return;
    }
else{
    const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
    const selectedRows = this.tableRows
  .filter(row =>
    row.isActive === true &&
    row.selectedDivisions &&
    row.selectedDivisions.length > 0
  );

if (selectedRows.length === 0) {
  this.AminityInsStatus = "Please select at least one subject with division(s).";
  this.isStatusModalOpen = true;
  return;
}

const subjects: any[] = [];
const divisions: any[] = [];

selectedRows.forEach(row => {

  row.selectedDivisions.forEach((div: any) => {
    subjects.push(row.subjectID);
    divisions.push(div);
  });

});
    const classValue = this.SyllabusForm.get('Class')?.value || [];
    const subjectValue = this.SyllabusForm.get('Subjects')?.value || [];
    const data = {
      ID: this.SyllabusForm.get('ID')?.value || '',
      SchoolID: this.SyllabusForm.get('School')?.value || '',
      AcademicYear: this.SyllabusForm.get('AcademicYear')?.value || '',
      Class: Array.isArray(classValue) ? classValue.join(',') : classValue,
      Syllabus: this.SyllabusForm.get('Syllabus')?.value || '',
      Divisions: divisions.join(','),
      ExamType: this.SyllabusForm.get('ExamType')?.value || '',
      Subjects: subjects.join(','),
      MaxMarks: this.SyllabusForm.get('MaxMarks')?.value || '',
      PassMarks: this.SyllabusForm.get('PassMarks')?.value || '',
      ExamDateAndTime: this.SyllabusForm.get('ExamDateAndTime')?.value || null,
      Duration: this.SyllabusForm.get('Duration')?.value || '',
      NoOfQuestion: this.SyllabusForm.get('NoOfQuestion')?.value || '',
      Instructions: this.SyllabusForm.get('Instructions')?.value || '',
      IsActive: IsActiveStatusNumeric,
      Flag: '5'

    };

    this.apiurl.post("Tbl_SetExam_CRUD_Operations", data).subscribe({
      next: (response: any) => {
        if (response.statusCode === 200) {
          this.IsAddNewClicked = !this.IsAddNewClicked;
          this.isStatusModalOpen  = true;
          this.AminityInsStatus = "Exam Type Details Updated!";
          this.SyllabusForm.reset();
          this.SyllabusForm.markAsPristine();
        }
      },
      error: (error) => {
        this.AminityInsStatus = "Error Updating Exam Type.";
        this.isStatusModalOpen  = true;
      }
    });
  }
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

  closeModal(type: 'view' | 'status'| 'table') {
    if (type === 'view') {
    this.isViewModalOpen = false;
  }

  if (type === 'status') {
    this.isStatusModalOpen = false;
  }

  if (type === 'table') {
    this.isTableModalOpen = false;
  }
  }

  handleOk() {
    this.isStatusModalOpen = false;
    // Refresh list only when NOT in Add mode
    if (!this.IsAddNewClicked) {
    this.FetchInitialData();
  }
  };

  editreview(SyllabusID: string): void {
    this.editclicked = true;
    this.FetchSyllabusDetByID(SyllabusID, 'edit');
    this.ViewSyllabusClicked = true;
    this.isTableModalOpen = true;

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

  viewReview(SyllabusID: string): void {
    this.FetchSyllabusDetByID(SyllabusID, 'view');
    this.isViewModalOpen = true;
  };
  onAdminSchoolChange(event: Event) {
    this.academicYearList=[];
    this.SyllabusForm.get('AcademicYear').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    this.classLists=[];
    this.isTableModalOpen = false;

    this.tableRows = [];   
    if(schoolID=="0"){
      this.AdminselectedSchoolID="";
    }else{
      this.AdminselectedSchoolID = schoolID;
    }   
    this.FetchAcademicYearsList();
  };
  onAdminAcademicYearchange(event: Event){
    this.examLists =[];
    
    this.SyllabusForm.get('ExamType').patchValue('0');
    this.SyllabusForm.get('Class').patchValue('0');

    const target = event.target as HTMLSelectElement;
    const academicyearId = target.value;
    if(academicyearId=="0"){
      this.AdminselectedAcademivYearID="";
    }else{
      this.AdminselectedAcademivYearID = academicyearId;
    }
    this.classLists=[];
    this.isTableModalOpen = false;


    this.tableRows = [];   
    this.FetchExamsList();
    this.FetchClassList();
  };

    onAdminClasschange(event: Event){
    this.subjectsLists =[];
    this.divisionsList =[];
    this.SyllabusForm.get('Subjects').patchValue('0');
    this.SyllabusForm.get('Divisions').patchValue('0');
    const target = event.target as HTMLSelectElement;

    const classId = target.value;

  if (classId.length === 0) {
    this.AdminselectedClassID = "";
  } else {
    this.AdminselectedClassID = classId; // if API expects comma separated
  }
    this.FetchSubjectsList();
    this.FetchDivisionsList();

    // this.FetchClassList();
  };
  

tableRows: any[] = []; // Each object = 1 subject row

  GenerateModalTable() {
  if (this.SyllabusForm.invalid) {
    this.SyllabusForm.markAllAsTouched();
    return;
  }
  console.log("button works")

  if (this.subjectsLists.length === 0 || this.divisionsList.length === 0) {
    alert('Please select class and wait for subjects to load.');
    return;
  }
  this.tableRows = this.subjectsLists.map(subject => ({
    subjectID: subject.ID,
    subjectName: subject.Name,
    divisions: this.divisionsList,
    selectedDivisions: [],
    divisionDropdownOpen: false,
    maxMarks: this.SyllabusForm.get('MaxMarks')?.value || '',
    passMarks: this.SyllabusForm.get('PassMarks')?.value || '',
    examDateAndTime: this.SyllabusForm.get('ExamDateAndTime')?.value || null,
    duration: this.SyllabusForm.get('Duration')?.value || '',
    noOfQuestions: this.SyllabusForm.get('NoOfQuestion')?.value || '',
    instructions: this.SyllabusForm.get('Instructions')?.value || '',
    isActive: true
  }));

  this.isTableModalOpen  = true;
}


// SubmitFinalTable() {

//   if (!this.tableRows || this.tableRows.length === 0) {
//     this.AminityInsStatus = "No data to save.";
//     this.isStatusModalOpen = true;
//     return;
//   }

//   const selectedRows = this.tableRows
//     .filter(row => row.selectedDivision && row.selectedDivision !== '');
    

//   if (selectedRows.length === 0) {
//     this.AminityInsStatus = "Please select at least one subject/division.";
//     this.isStatusModalOpen = true;
//     return;
//   }

//   const payload = {
//     SchoolID: this.AdminselectedSchoolID,
//     AcademicYear: this.AdminselectedAcademivYearID,
//     Class: this.selectedClasses.join(','),

//     Subjects: selectedRows.map(r => r.subjectID).join(','),
//     Divisions: selectedRows.map(r => r.selectedDivision).join(','),

//     MaxMarks: this.SyllabusForm.get('MaxMarks')?.value,
//     PassMarks: this.SyllabusForm.get('PassMarks')?.value,
//     NoOfQuestion: this.SyllabusForm.get('NoOfQuestion')?.value,
//     Duration: this.SyllabusForm.get('Duration')?.value,
// //  ExamDateAndTime: selectedRows
// //         .map(r => r.examDateAndTime
// //             ? new Date(r.examDateAndTime)
// //                 .toISOString()
// //                 .slice(0,19)
// //                 .replace('T',' ')
// //             : '')
// //         .join(','),
//     ExamDateAndTime: this.SyllabusForm.get('ExamDateAndTime')?.value,
//     Instructions: this.SyllabusForm.get('Instructions')?.value,
//     ExamType: this.SyllabusForm.get('ExamType')?.value,
//     IsActive: '1',
//     Flag: '1'
//   };

//   this.apiurl.post("Tbl_SetExam_CRUD_Operations", payload)
//     .subscribe({
//       next: (response: any) => {
//         this.AminityInsStatus = "Exam Details Submitted!";
//         this.isStatusModalOpen = true;
//         this.isTableModalOpen = false;
//         this.IsAddNewClicked = false;

//         this.SyllabusForm.reset();
//         this.selectedClasses = [];   //  reset classes
//         this.classLists=[];

//         this.tableRows = [];
//         this.FetchInitialData();
//       },
//       error: (error) => {
//         console.error(error);
//         this.AminityInsStatus = "Error submitting exam details.";
//         this.isStatusModalOpen = true;
//       }
//     });
// }
onSubjectToggle(index: number) {

  const row = this.tableRows[index];

  if (!row.isActive) {
    row.selectedDivisions = [];
  }

}

toggleDivisionDropdown(index: number) {
  this.tableRows[index].divisionDropdownOpen = !this.tableRows[index].divisionDropdownOpen;
}

toggleDivisionSelection(rowIndex: number, divisionID: string) {
  const row = this.tableRows[rowIndex];
  const index = row.selectedDivisions.indexOf(divisionID);
  
  if (index > -1) {
    row.selectedDivisions.splice(index, 1);
  } else {
    row.selectedDivisions.push(divisionID);
  }
}

saveExam() {

  if (!this.tableRows || this.tableRows.length === 0) {
    this.AminityInsStatus = "No data to save.";
    this.isStatusModalOpen = true;
    return;
  }

  const selectedRows = this.tableRows
  .filter(row =>
    row.isActive === true &&
    row.selectedDivisions &&
    row.selectedDivisions.length > 0
  );

  if (selectedRows.length === 0) {
    this.AminityInsStatus = "Please select at least one subject with division(s).";
    this.isStatusModalOpen = true;
    return;
  }

  const isEditMode = !!this.SyllabusForm.get('ID')?.value;
  const subjects: any[] = [];
const divisions: any[] = [];

selectedRows.forEach(row => {

  subjects.push(row.subjectID);   // subject only once

  if (row.selectedDivisions && row.selectedDivisions.length > 0) {
    divisions.push(row.selectedDivisions.join('|')); 
    // use separator inside subject
  } else {
    divisions.push('');
  }

});

  const payload = {
    ID: isEditMode ? this.SyllabusForm.get('ID')?.value : '',
    SchoolID: this.AdminselectedSchoolID,
    AcademicYear: this.AdminselectedAcademivYearID,
    Class: this.SyllabusForm.get('Class')?.value,

   Subjects: subjects.join(','),
Divisions: divisions.join(','),

    MaxMarks: this.SyllabusForm.get('MaxMarks')?.value,
    PassMarks: this.SyllabusForm.get('PassMarks')?.value,
    NoOfQuestion: this.SyllabusForm.get('NoOfQuestion')?.value,
    Duration: this.SyllabusForm.get('Duration')?.value,
    ExamDateAndTime: selectedRows.map(row => row.examDateAndTime).join(','),
    Instructions: this.SyllabusForm.get('Instructions')?.value,
    ExamType: this.SyllabusForm.get('ExamType')?.value,
    IsActive: this.IsActiveStatus ? "1" : "0",

    Flag: isEditMode ? '5' : '1'
  };

  this.apiurl.post("Tbl_SetExam_CRUD_Operations", payload)
    .subscribe({
      next: (response: any) => {

        this.AminityInsStatus = isEditMode
          ? "Exam Updated Successfully!"
          : "Exam Created Successfully!";

        this.isStatusModalOpen = true;
        this.isTableModalOpen = false;
        this.IsAddNewClicked = false;

        this.SyllabusForm.reset();
        this.tableRows = [];

        this.FetchInitialData();
      },
      error: () => {
        this.AminityInsStatus = "Error saving exam.";
        this.isStatusModalOpen = true;
      }
    });
}

}

