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
export class TeachersTimeTableComponent extends BasePermissionComponent {
  pageName = 'Teachers Time Table';
  
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
      this.SchoolSelectionChange=false;
      this.ClassDivisionForm.reset();
      if (this.isAdmin) {
        this.ClassDivisionForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
      } else {
        this.ClassDivisionForm.get('School')?.clearValidators();
      }
      if(this.AdminselectedSchoolID==''){
        this.FetchAcademicYearsList();
      }
      this.ClassDivisionForm.get('School').patchValue('0');
      this.ClassDivisionForm.get('AcademicYear').patchValue('0');
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
      const requestData = { SchoolID:this.AdminselectedSchoolID||'',Flag: '3' };
  
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

    FetchWorkingdaysList() {
      const requestData = { 
        SchoolID:this.AdminselectedSchoolID,
        AcademicYear:this.AdminselectedAcademivYearID,
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

    FetchSessionsList() {
      const requestData = { 
        SchoolID:this.AdminselectedSchoolID,
        AcademicYear:this.AdminselectedAcademivYearID,
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
  
    formatDateYYYYMMDD(dateStr: string | null) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    };
  
    formatDateDDMMYYYY(dateStr: string | null) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
    };
  
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
        } else {
          this.ClassDivisionForm.get('School')?.clearValidators();
        }
        this.ClassDivisionForm.get('School').patchValue('0');
        this.ClassDivisionForm.get('AcademicYear').patchValue('0');
        this.ClassDivisionForm.get('Class').patchValue('0');
        this.ClassDivisionForm.get('Division').patchValue('0');
        this.IsFliterClicked=false;
        if(this.AdminselectedSchoolID==''){
          this.FetchAcademicYearsList();
        }
        this.isViewModalOpen=false;
      }
            
    };
  
    toggleChange(){
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
      if(schoolID=="0"){
        this.selectedSchoolID="";
      }else{
        this.selectedSchoolID = schoolID;
      }    
      this.SchoolSelectionChange = true;
      this.FetchInitialData();
    };

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

    FetchStaffBySchoolAcademicYearList() {
      const requestData = { 
        SchoolID: this.AdminselectedSchoolID,
        AcademicYear: this.AdminselectedAcademivYearID,
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

    FetchTimeSlotsBySchoolAcademicYearList() {
      const requestData = { 
        SchoolID: this.AdminselectedSchoolID,
        AcademicYear: this.AdminselectedAcademivYearID,
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
  
    onAdminClassChange(event: Event) { 
      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      if(schoolID=="0"){
        this.AdminselectedClassID="";
      }else{
        this.AdminselectedClassID = schoolID;
      }      
    };

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

    FetchFreeStaff() {
      const requestData = { 
        SchoolID: this.AdminselectedSchoolID,
        AcademicYear: this.AdminselectedAcademivYearID,
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

    getPeriods(index: number): FormArray {
      return this.timetableArray.at(index).get('Periods') as FormArray;
    }

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

    viewReview(ID: string): void {
      this.FetchInitialData({ ID });
    }

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
  
      this.loader.show();
  
      this.FetchAcademicYearCount(isSearch).subscribe({
        next: (countResp: any) => {
          this.ClassDivisionCount = countResp?.data?.[0]?.totalcount ?? 0;
  
          const payload: any = {
            SchoolID:this.AdminselectedSchoolID,
            AcademicYear:this.AdminselectedAcademivYearID,
            Flag: flag,
            ...extra
          };

          if (!extra.ID) {
            payload.ID = this.AdminselectedClassID;
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
  
    mapAcademicYears(response: any) {
      // this.StudentsList = (response.data || []).map((item: any) => ({
      //   ID: item.id,
      //   SchoolID: item.schoolID,
      //   AcademicYear: item.academicYear,
      //   ClassID: item.classID,
      //   DivisionID: item.divisionID,
      //   DayID: item.dayID,
      //   PeriodNo: item.periodNo,
      //   SessionID: item.sessionID,
      //   StartTime: item.startTime,
      //   EndTime: item.endTime,
      //   SubjectID: item.subjectID,
      //   StaffID: item.staffID,
      //   ClassName: item.className,
      //   DivisionName: item.divisionName,
      //   SubjectName: item.subjectName
      // }));
      // this.isViewModalOpen=true;
      const data = response?.data || [];

      this.StudentsList = data;

      this.buildStaffTimetable(data);

      this.generatePeriodHeaders();

      this.isViewModalOpen = true;

      console.log('this.StudentsList',this.StudentsList);
    };

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
  
      this.loader.show();
  
      this.FetchAcademicYearCount(isSearch).subscribe({
        next: (countResp: any) => {
          this.ClassDivisionCount = countResp?.data?.[0]?.totalcount ?? 0;
  
          const payload: any = {
            SchoolID:this.AdminselectedSchoolID,
            AcademicYear:this.AdminselectedAcademivYearID,
            StartTime: this.selectedStartTime,
            EndTime: this.selectedEndTime,
            DayID: this.AdminselectedWorkingDayID,
            Flag: flag,
            ...extra
          };

          if (!extra.ID) {
            payload.ID = this.AdminselectedClassID;
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
  
    mapStaffAcademicYears(response: any) {
      const data = response?.data || [];

      this.StudentsList = data;

      this.buildStaffTimetable(data);

      this.generatePeriodHeaders();

      this.isViewModalOpen = true;

      console.log('this.StudentsList',this.StudentsList);
    };

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

    buildStaffTimetable(details: any[]) {
      const timetableArray = this.timetableArray;
      timetableArray.clear();

      if (!details || details.length === 0) return;

      const grouped: any = {};

      // get all unique periods
      const periodSet = new Set<number>();

      details.forEach(d => {

        const dayId = d.dayID?.toString();

        if (!grouped[dayId]) {
          grouped[dayId] = {
            dayName: d.day,
            periods: []
          };
        }

        grouped[dayId].periods.push(d);

        periodSet.add(Number(d.periodNo));

      });

      const allPeriods = Array.from(periodSet).sort((a,b)=>a-b);

      Object.keys(grouped)
        .sort((a,b)=>Number(a)-Number(b))
        .forEach(dayID => {

          const dayData = grouped[dayID];

          const dayGroup = new FormGroup({
            DayID: new FormControl(dayID),
            Day: new FormControl(dayData.dayName),
            Periods: new FormArray([])
          });

          const periodsArray = dayGroup.get('Periods') as FormArray;

          allPeriods.forEach(periodNo => {

            const p = dayData.periods.find((x:any)=>x.periodNo == periodNo);

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

    getClassName(classID: string): string {
      const cls = this.SyllabusList?.find(x => x.ID == classID);
      return cls ? cls.Name : '';
    }

    getDivisionName(divisionID: string): string {
      const div = this.DivisionsList?.find(x => x.ID == divisionID);
      return div ? div.Name : '';
    }

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
