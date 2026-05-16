import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule,Validators  } from '@angular/forms';
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
  selector: 'app-promotion',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './promotion.component.html',
  styleUrls: ['./promotion.component.css']
})
export class PromotionComponent extends BasePermissionComponent {
  pageName = 'Class Transition';

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
    this.SyllabusList=[];
    if (this.isAdmin) {
      this.ClassDivisionForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
    } else {
      this.ClassDivisionForm.get('School')?.clearValidators();
    }
    if(this.AdminselectedSchoolID==''){
      this.FetchAcademicYearsList();
      this.FetchTransitionAcademicYearsList();
    }
    this.ClassDivisionForm.reset();
    this.ClassDivisionForm.get('Class').patchValue('0');
    this.ClassDivisionForm.get('School').patchValue('0');
    this.ClassDivisionForm.get('AcademicYear').patchValue('0');
    this.ClassDivisionForm.get('TransitionType')?.patchValue(1);
    this.onTransitionChange(1);
    this.ClassDivisionForm.get('Division').patchValue('0');
    this.StudentsList=[];
    this.selectedStudents=[];
    this.FetchSchoolsList();
  };

  IsAddNewClicked:boolean=false;
    IsActiveStatus:boolean=false;
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
    TransitionClassList: any[] =[];
    StudentsList: any[] =[];
    selectedStudents: any[] = [];
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
    transitionacademicYearList:any[] = [];
    DivisionsList:any[] = [];
    TransitionDivisionsList:any[] = [];
    ClassTeachersList:any[] = [];
    StaffList:any[] = [];
    AdminselectedSchoolID:string = '';
    AdminselectedAcademivYearID:string = '';
    AdminselectedClassID:string = '';
    AdminselectedTransitionAcademicYearID = '';
    AdminselectedTransitionClassID = '';
    AdminselectedClassDivisionID:string = '';
    SelectedTransitionID:string = '';
  
    ClassDivisionForm: any = new FormGroup({
      ID: new FormControl(),
      Class: new FormControl(0, Validators.min(1)),
      Division: new FormControl(0, Validators.min(1)),
      TransitionType: new FormControl(0, Validators.min(1)),
      School: new FormControl(),
      AcademicYear: new FormControl(0,[Validators.required,Validators.min(1)]),
      TransitionAcademicYear: new FormControl(0, Validators.min(1)),
      TransitionClass: new FormControl(0, Validators.min(1)),
      TransitionDivision: new FormControl(0, Validators.min(1)),
      Remarks: new FormControl()
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

    FetchTransitionAcademicYearsList() {
      const requestData = { SchoolID:this.AdminselectedSchoolID||'',Flag: '2' };
  
      this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', requestData)
        .subscribe(
          (response: any) => {
            if (response && Array.isArray(response.data)) {
              this.transitionacademicYearList = response.data.map((item: any) => {
                const isActiveString = item.isActive === "1" ? "Active" : "InActive";
                return {
                  ID: item.id,
                  Name: item.name,
                  IsActive: isActiveString
                };
              });            
            } else {
              this.transitionacademicYearList = [];
            }
          },
          (error) => {
            this.transitionacademicYearList = [];
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
  
      return this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', {
        Flag: isSearch ? '8' : '6',
        SchoolID:SchoolIdSelected,
        Class: isSearch ? this.searchQuery.trim() : null
      });
    }
  
    FetchInitialData(extra: any = {}) {
      const isSearch = !!this.searchQuery?.trim();
      const flag = isSearch ? '7' : '3';
  
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
            Class:this.AdminselectedClassID,
            Division:this.AdminselectedClassDivisionID,
            Flag: flag,
            // Limit: this.pageSize,
            SortColumn: this.sortColumn,
            SortDirection: this.sortDirection,
            LastCreatedDate: cursor?.lastCreatedDate ?? null,
            LastID: cursor?.lastID ?? null,
            ...extra
          };
  
          if (isSearch) payload.Class = this.searchQuery.trim();
  
          this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', payload).subscribe({
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
      this.StudentsList = (response.data || []).map((item: any) => ({
        ID: item.id,
        School:item.schoolID,
        AcademicYear: item.academicYear,
        AdmissionNo:item.admissionNo,
        Class: item.class,
        Division: item.division,
        JoinDate:item.joinDate,
        FirstName: item.firstName,
        MiddleName: item.middleName,
        LastName: item.lastName,
        AadharNo:item.aadharNo,
        MobileNo: item.mobileNo,
        Email: item.emailID,
        DOB: item.dob,
        Gender:item.gender,
        BloodGroup: item.bloodGroup,
        Nationality: item.nationality,
        Religion: item.religion,
        Caste: item.caste,
        ClassName: item.className,
        SchoolName:item.schoolName,
        AcademicYearName:item.academicYearName,
        Name: `${item.firstName ?? ''} ${item.middleName ?? ''} ${item.lastName ?? ''}`.replace(/\s+/g, ' ').trim(),
        ClassDivisionName:item.classDivisionName,
        isSelected: true,
        IsActive: item.isActive === '1' ? 'Active' : 'InActive' 
      }));
      this.isViewModalOpen = true;
    };
  
    FetchClassList() {
      const requestData = { 
        SchoolID:this.AdminselectedSchoolID,
        AcademicYear:this.AdminselectedAcademivYearID,
        Flag: '9' };
  
      this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', requestData)
        .subscribe(
          (response: any) => {
            if (response && Array.isArray(response.data)) {
              this.SyllabusList = response.data.map((item: any) => {
                const isActiveString = item.isActive === "1" ? "Active" : "InActive";
                return {
                  ID: item.sNo,
                  Name: item.syllabusClassName
                };
              });
            } else {
              this.SyllabusList = [];
            }
          },
          (error) => {
            this.SyllabusList = [];
          }
        );
    };

    FetchTransitionClassList() {
      const requestData = { 
        SchoolID:this.AdminselectedSchoolID,
        AcademicYear:this.AdminselectedTransitionAcademicYearID,
        Flag: '9' };
  
      this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', requestData)
        .subscribe(
          (response: any) => {
            if (response && Array.isArray(response.data)) {
              this.TransitionClassList = response.data.map((item: any) => {
                const isActiveString = item.isActive === "1" ? "Active" : "InActive";
                return {
                  ID: item.sNo,
                  Name: item.syllabusClassName
                };
              });
            } else {
              this.TransitionClassList = [];
            }
          },
          (error) => {
            this.TransitionClassList = [];
          }
        );
    };


  FetchDivisionsList(type: 'main' | 'transition') {
      const requestData = {
        SchoolID: this.AdminselectedSchoolID,
        AcademicYear: this.AdminselectedTransitionAcademicYearID,
        Class:
          type === 'transition'
            ? this.AdminselectedTransitionClassID
            : this.AdminselectedClassID,
        Flag: '3'
      };

      this.apiurl.post<any>(
        'Tbl_ClassDivision_CRUD_Operations',
        requestData
      )
      .subscribe(
        (response: any) => {

          const mappedData =
            response && Array.isArray(response.data)
              ? response.data.map((item: any) => ({
                  ID: item.id,
                  Name: item.name
                }))
              : [];

          if (type === 'transition') {
            this.TransitionDivisionsList = mappedData;
          } else {
            this.DivisionsList = mappedData;
          }

        },
        () => {

          if (type === 'transition') {
            this.TransitionDivisionsList = [];
          } else {
            this.DivisionsList = [];
          }

        }
      );
    }

  SubmitClassDivision(){
      const formValues = this.ClassDivisionForm.value;
      if(this.ClassDivisionForm.invalid){
        this.ClassDivisionForm.markAllAsTouched();
        return;
      }
      // else if (formValues.Class === formValues.TransitionClass) {
      //   this.AminityInsStatus = "Current class and transition class cannot be the same.";
      //   this.isModalOpen = true;
      //   return;
      // }
      else if (formValues.Division === formValues.TransitionDivision) {
        this.AminityInsStatus = "Current division and transition division cannot be the same.";
        this.isModalOpen = true;
        return;
      }
      else if (!this.selectedStudents || this.selectedStudents.length === 0) {
        this.AminityInsStatus = "Please select students before submitting.";
        this.isModalOpen = true;
        return;
      }
      else{
        const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
        const admissionList = this.selectedStudents
          .map(s => s.AdmissionNo)
          .join(', ');
        const data = {
          AcademicYear: this.ClassDivisionForm.get('TransitionAcademicYear')?.value,
          Class: this.ClassDivisionForm.get('TransitionClass')?.value,
          Division: this.ClassDivisionForm.get('TransitionDivision')?.value,
          DePromotionRemarks: this.ClassDivisionForm.get('Remarks')?.value || '',
          AdmissionNo: this.selectedStudents
                  .map(s => s.AdmissionNo)
                  .join(','),
          Flag: '10'
        };
  
        this.apiurl.post("Tbl_StudentDetails_CRUD_Operations", data).subscribe({
          next: (response: any) => {
            if (response.statusCode === 200) {
              this.IsAddNewClicked=!this.IsAddNewClicked;
              this.isModalOpen = true;
              this.AminityInsStatus = `Students (${admissionList}) (${this.SelectedTransitionID}) succesfull`;
              this.ClassDivisionForm.reset();
              this.ClassDivisionForm.markAsPristine();
              this.isViewModalOpen=false;
              this.selectedStudents = [];
              this.SelectedTransitionID="";      
              this.ClassDivisionForm.reset();
              this.ClassDivisionForm.get('Class').patchValue('0');
              this.ClassDivisionForm.get('School').patchValue('0');
              this.ClassDivisionForm.get('AcademicYear').patchValue('0');
              this.ClassDivisionForm.get('TransitionType').patchValue('0');
              this.ClassDivisionForm.get('Division').patchValue('0');
            }
          },
          error: (err:any) => {
            if (err.status === 400 && err.error?.message) {
              this.AminityInsStatus = err.error.message;  
            } else if (err.status === 500 && err.error?.Message) {
              this.AminityInsStatus = err.error.Message;
            } else {
              this.AminityInsStatus = "Unexpected error occurred.";
            }
            this.isModalOpen = true;
          },
          complete: () => {
          }
        });
      }
    };

  UpdateClassDivision(){
      if(this.ClassDivisionForm.invalid){
        this.ClassDivisionForm.markAllAsTouched();
        return;
      }
      else{
        const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
        const data = {
          ID:this.ClassDivisionForm.get('ID')?.value || '',
          Class: this.ClassDivisionForm.get('Class')?.value,
          Division: this.ClassDivisionForm.get('Division')?.value,
          ClassTeacher: this.ClassDivisionForm.get('ClassTeacher')?.value,          
          SchoolID: this.ClassDivisionForm.get('School')?.value,
          AcademicYear: this.ClassDivisionForm.get('AcademicYear')?.value,
          IsActive:IsActiveStatusNumeric,
          Flag: '5'
        };
  
        this.apiurl.post("Tbl_AllotClassTeacher_CRUD_Operations", data).subscribe({
          next: (response: any) => {
            if (response.statusCode === 200) {
              this.IsAddNewClicked=!this.IsAddNewClicked;
              this.isModalOpen = true;
              this.AminityInsStatus = "Class Teacher Allocation Updated!";
              this.ClassDivisionForm.reset();
              this.ClassDivisionForm.markAsPristine();
            }
          },
          error: (err:any) => {
            if (err.status === 400 && err.error?.message) {
              this.AminityInsStatus = err.error.message;  // School Name Already Exists!
            } else if (err.status === 500 && err.error?.Message) {
              this.AminityInsStatus = err.error.Message;  // Database or internal error
            } else {
              this.AminityInsStatus = "Unexpected error occurred.";
            }
            this.isModalOpen = true;
          },
          complete: () => {
          }
        });
      }
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
      this.isModalOpen = false;
      this.ClassDivisionForm.get('TransitionType')?.patchValue(1);
      this.onTransitionChange(1);
      if(this.AdminselectedSchoolID==''){
        this.FetchAcademicYearsList();
        this.FetchTransitionAcademicYearsList();
      }
      this.isViewModalOpen=false;
    };

  onAdminSchoolChange(event: Event) {
      this.academicYearList=[];
      this.SyllabusList = [];
      this.transitionacademicYearList=[];
      this.TransitionClassList = [];
      this.ClassDivisionForm.get('Class').patchValue('0');
      this.ClassDivisionForm.get('AcademicYear').patchValue('0');
      this.ClassDivisionForm.get('TransitionAcademicYear').patchValue('0');
      this.ClassDivisionForm.get('TransitionClass').patchValue('0');
      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      if(schoolID=="0"){
        this.AdminselectedSchoolID="";
      }else{
        this.AdminselectedSchoolID = schoolID;
      }    
      this.FetchAcademicYearsList();
      this.FetchTransitionAcademicYearsList();
    };
  
    onAdminAcademicYearChange(event: Event) {
      this.SyllabusList = [];    
      this.ClassDivisionForm.get('Class').patchValue('0');
      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      if(schoolID=="0"){
        this.AdminselectedAcademivYearID="";
      }else{
        this.AdminselectedAcademivYearID = schoolID;
      }    
      this.FetchClassList();
    };

    onAdminTransitionAcademicYearChange(event: Event) {
      this.TransitionClassList = [];    
      this.ClassDivisionForm.get('TransitionClass').patchValue('0');
      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      if(schoolID=="0"){
        this.AdminselectedTransitionAcademicYearID="";
      }else{
        this.AdminselectedTransitionAcademicYearID = schoolID;
      }    
      this.FetchTransitionClassList();
    };
  
    onAdminClassChange(event: Event) {          
      if (this.ClassDivisionForm.get('TransitionType')?.value === 1 ||
          this.ClassDivisionForm.get('TransitionType')?.value === 2) {
        this.TransitionDivisionsList = [];
        this.ClassDivisionForm.get('TransitionDivision')?.patchValue('0');
      } else {
        this.DivisionsList = [];
        this.ClassDivisionForm.get('Division')?.patchValue('0');
      }      
      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      if(schoolID=="0"){
        this.AdminselectedClassID="";
      }else{
        this.AdminselectedClassID = schoolID;
      }    
      this.FetchDivisionsList('main');
    };

    onTransitionClassChange(event: Event) {
      this.TransitionDivisionsList = [];
      this.ClassDivisionForm.get('TransitionDivision')?.patchValue('0');

      const target = event.target as HTMLSelectElement;

      this.AdminselectedTransitionClassID =
        target.value === '0'
          ? ''
          : target.value;

      this.FetchDivisionsList('transition');
    }

    onAdminDivisionChange(event: Event) {
      this.StudentsList = [];  
      this.selectedStudents = [];
      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      if(schoolID=="0"){
        this.AdminselectedClassDivisionID="";
      }else{
        this.AdminselectedClassDivisionID = schoolID;
      }    
      this.FetchInitialData();
    };

    onTransitionChange(value: number): void {
      // Reset dependent fields
      this.ClassDivisionForm.get('TransitionAcademicYear')?.patchValue('0');
      this.ClassDivisionForm.get('TransitionClass')?.patchValue('0');
      this.ClassDivisionForm.get('TransitionDivision')?.patchValue('0');
      
      // Set the form control value
      this.ClassDivisionForm.get('TransitionType')?.setValue(value);
      this.ClassDivisionForm.get('TransitionType')?.markAsTouched();

      if (value === 1) {
        this.SelectedTransitionID = "Promotion";
        // Clear remarks validator for promotion
        this.ClassDivisionForm.get('Remarks')?.clearValidators();

      } else if (value === 2) {
        this.SelectedTransitionID = "De-Promotion";
        // Remarks is mandatory for de-promotion
        this.ClassDivisionForm.get('Remarks')?.setValidators([Validators.required]);

      } else {
        this.SelectedTransitionID = String(value);
        this.ClassDivisionForm.get('Remarks')?.clearValidators();
      }

      // Always update validity after changing validators
      this.ClassDivisionForm.get('Remarks')?.updateValueAndValidity();
    }

    submitSelection() {
      this.selectedStudents = this.StudentsList
        .filter(student => student.isSelected);
      this.isViewModalOpen=false;
    }

    editSelection(){
      this.isViewModalOpen=true;
    }

    cancelSelectedlist(){
      if(this.isViewModalOpen){
        this.isViewModalOpen=false;
      }
      else{
        const confirmClear = confirm(
          'Are you sure you want to clear the selected students list?'
        );

        if (confirmClear) {
          this.selectedStudents = [];
        }
      }      
    }

    getSelectedCount(): number {
      return this.StudentsList.filter(s => s.isSelected).length;
    }

    isAllSelected(): boolean {
      return this.StudentsList.length > 0 &&
            this.StudentsList.every(s => s.isSelected);
    }

    toggleSelectAll(event: Event): void {
      const checked = (event.target as HTMLInputElement).checked;
      this.StudentsList.forEach(s => s.isSelected = checked);
    }

    isSuccessStatus(): boolean {
  const msg = (this.AminityInsStatus || '').toLowerCase();
  return msg.includes('success') || msg.includes('successful');
}

isErrorStatus(): boolean {
  const msg = (this.AminityInsStatus || '').toLowerCase();
  return msg.includes('fail') || msg.includes('error') || msg.includes('invalid');
}

isInfoStatus(): boolean {
  return !this.isSuccessStatus() && !this.isErrorStatus();
}
}
