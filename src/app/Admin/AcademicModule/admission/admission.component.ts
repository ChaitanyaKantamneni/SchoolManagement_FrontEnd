import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
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
  selector: 'app-admission',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './admission.component.html',
  styleUrls: ['./admission.component.css']
})
export class AdmissionComponent extends BasePermissionComponent {
  pageName = 'Admission';

  constructor(
    private http: HttpClient,
    router: Router,
    public loader: LoaderService,
    private apiurl: ApiServiceService,
    menuService: MenuServiceService,
    private cd: ChangeDetectorRef
  ) {
    super(menuService, router);
  }

  ngOnInit(): void {
    this.checkViewPermission();
    this.SchoolSelectionChange=false;
    this.categories=[];
    this.FetchSchoolsList();
    this.FetchInitialData();
  };

  IsAddNewClicked:boolean=false;
  IsActiveStatus:boolean=false;
  ViewModuleClicked:boolean=false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;
  SubjectsList: any[] =[];
  SubjectsCount: number = 0;
  SyllabusList: any[] =[];
  ClassList: any[] =[];
  DivisionList: any[] =[];
  RoutesList:any[] =[];
  StopsList:any[] =[];
  BusList:any[] =[];
  FareList:any[] =[];
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

  currentMode: 'view' | 'edit' = 'edit';

  sortColumn: string = 'AdmissionNo'; 
  sortDirection: 'asc' | 'desc' = 'desc';
  editclicked:boolean=false;
  schoolList: any[] = [];
  selectedSchoolID: string = '';
  SchoolSelectionChange:boolean=false;
  academicYearList:any[] = [];
  AdminselectedSchoolID:string = '';
  AdminselectedAcademivYearID:string = '';
  selectedAdmissionID:string = '';

  ModuleForm: any = new FormGroup({
    ID: new FormControl(),
    School: new FormControl(),
    AcademicYear: new FormControl(0,[Validators.required,Validators.min(1)]),
    AdmissionNo: new FormControl('',Validators.required),
    Class:new FormControl(0,[Validators.required,Validators.min(1)]),
    Division:new FormControl(0,[Validators.required,Validators.min(1)]),
    FirstName: new FormControl('',[Validators.required,Validators.pattern('^[a-zA-Z ]+$')]),
    MiddleName: new FormControl('',[Validators.pattern('^[a-zA-Z ]+$')]),
    LastName: new FormControl('',[Validators.pattern('^[a-zA-Z ]+$')]),
    JoinDate: new FormControl('', [Validators.required]),
    AadharNo: new FormControl('',[Validators.required,Validators.pattern(/^[2-9]{1}[0-9]{11}$/)]),
    MobileNo: new FormControl('',[Validators.required,Validators.pattern(/^[6-9]{1}[0-9]{9}$/)]),
    Email: new FormControl('', [Validators.required,Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]),
    DOB: new FormControl('', [Validators.required,this.noFutureDateValidator]),
    Gender:new FormControl(0,[Validators.required,Validators.min(1)]),
    BloodGroup: new FormControl(),
    Nationality:new FormControl(0,[Validators.required,Validators.min(1)]),
    Religion:new FormControl(0,[Validators.required,Validators.min(1)]),
    Caste: new FormControl(),
    FatherName: new FormControl('',[Validators.required,Validators.pattern('^[a-zA-Z ]+$')]),
    FatherQualification: new FormControl(),
    FatherOccupation: new FormControl(),
    FatherMobile: new FormControl('',[Validators.required,Validators.pattern(/^[6-9]{1}[0-9]{9}$/)]),
    FatherEmail: new FormControl('', [Validators.required,Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]),
    FatherAadharNo: new FormControl('',[Validators.required,Validators.pattern(/^[2-9]{1}[0-9]{11}$/)]),
    MotherName: new FormControl('',[Validators.required,Validators.pattern('^[a-zA-Z ]+$')]),
    MotherQualification: new FormControl(),
    MotherOccupation: new FormControl(),
    MotherMobile: new FormControl('',[Validators.required,Validators.pattern(/^[6-9]{1}[0-9]{9}$/)]),
    MotherEmail: new FormControl('', [Validators.required,Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]),
    MotherAadharNo: new FormControl('',[Validators.required,Validators.pattern(/^[2-9]{1}[0-9]{11}$/)]),
    PermanentAddressLine1: new FormControl('',Validators.required),
    PermanentAddressLine2: new FormControl(),
    PermanentPincode: new FormControl('',[Validators.required,Validators.pattern(/^[1-9]{1}[0-9]{5}$/)]),
    PermanentPlace: new FormControl(),
    PermanentCountry:new FormControl(0,[Validators.required,Validators.min(1)]),
    PermanentState:new FormControl(0,[Validators.required,Validators.min(1)]),
    PermanentDistrict: new FormControl(),
    PermanentCity: new FormControl(),
    TemporaryAddressLine1: new FormControl(),
    TemporaryAddressLine2: new FormControl(),
    TemporaryPincode: new FormControl('',[Validators.pattern(/^[1-9]{1}[0-9]{5}$/)]),
    TemporaryPlace: new FormControl(),
    TemporaryCountry:new FormControl(),
    TemporaryState:new FormControl(),
    TemporaryDistrict: new FormControl(),
    TemporaryCity: new FormControl(),
    Route:new FormControl(0,[Validators.required,Validators.min(1)]),
    Stop:new FormControl(0,[Validators.required,Validators.min(1)]),
    Bus:new FormControl(0,[Validators.required,Validators.min(1)]),
    Fare:new FormControl(0,[Validators.required,Validators.min(1)]),
    StartDate: new FormControl('',Validators.required)
  });

  today: string = new Date().toISOString().split('T')[0];
  categories:any[] = [];
  selectedCategories: string[] = [];
  dropdownOpen: boolean = false;

  bloodGroups = [
    { id: '1', name: 'A+' },
    { id: '2', name: 'A-' },
    { id: '3', name: 'B+' },
    { id: '4', name: 'B-' },
    { id: '5', name: 'O+' },
    { id: '6', name: 'O-' },
    { id: '7', name: 'AB+' },
    { id: '8', name: 'AB-' }
  ];

  GenderGroups = [
    { id: '1', name: 'Male' },
    { id: '2', name: 'Female' },
    { id: '3', name: 'Others' }
  ];

  NationalityGroups = [
    { id: '1', name: 'Indian' }
  ];

  ReligionsGroups = [
    { id: '1', name: 'Hindu' },
    { id: '2', name: 'Muslim' },
    { id: '3', name: 'Christian' }
  ];

  CountryGroups = [
    { id: '1', name: 'India' }
  ];

  StateGroups = [
    { id: '1', name: 'Andhara Pradesh' },
    { id: '2', name: 'Telangana' },
    { id: '3', name: 'Tamil Nadu' },
    { id: '4', name: 'Karnataka' }
  ];

  noFutureDateValidator(control: any) {
    if (!control.value) return null;

    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0,0,0,0);

    return selectedDate > today ? { futureDate: true } : null;
  }


  toggleSelection(value: string) {
    const index = this.selectedCategories.indexOf(value);
    if (index > -1) {
      this.selectedCategories.splice(index, 1);
    } else {
      this.selectedCategories.push(value);
    }
    this.ModuleForm.get('Class')?.setValue(this.selectedCategories);
  }

  allowAlphaAndSpecial(event: KeyboardEvent) {
    const allowedRegex = /^[a-zA-Z ]$/;
    if (
      event.key === 'Backspace' ||
      event.key === 'Tab' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'Delete'
    ) {
      return;
    }

    if (!allowedRegex.test(event.key)) {
      event.preventDefault();
    }
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
    const requestData = { SchoolID:this.AdminselectedSchoolID||'',Flag: '2' };

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

    return this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', {
      Flag: isSearch ? '8' : '6',
      SchoolID:SchoolIdSelected,
      AdmissionNo: isSearch ? this.searchQuery.trim() : null
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
        this.SubjectsCount = countResp?.data?.[0]?.totalcount ?? 0;

        const payload: any = {
          Flag: flag,
          Limit: this.pageSize,
          SortColumn: this.sortColumn,
          SortDirection: this.sortDirection,
          LastCreatedDate: cursor?.lastCreatedDate ?? null,
          LastID: cursor?.lastID ?? null,
          SchoolID:SchoolIdSelected,
          ...extra
        };

        if (isSearch) payload.AdmissionNo = this.searchQuery.trim();

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
            this.SubjectsList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.SubjectsList = [];
        this.SubjectsCount = 0;
        this.loader.hide();
      }
    });
  };

  mapAcademicYears(response: any) {
    this.SubjectsList = (response.data || []).map((item: any) => ({
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
      IsActive: item.isActive === '1' ? 'Active' : 'InActive'      
    }));
  };


  AddNewClicked(){
    if (this.isAdmin) {
      this.ModuleForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
    } else {
      this.ModuleForm.get('School')?.clearValidators();
    }
    if(this.AdminselectedSchoolID==''){
      this.FetchAcademicYearsList();
    }
    this.categories=[];
    this.selectedCategories=[];
    this.FetchClassList();
    this.ModuleForm.reset();
    this.ModuleForm.get('School').patchValue('0');
    this.ModuleForm.get('AcademicYear').patchValue('0');
    this.ModuleForm.get('Class').patchValue('0');
    this.ModuleForm.get('Division').patchValue('0');
    this.ModuleForm.get('Gender').patchValue('0');
    this.ModuleForm.get('BloodGroup').patchValue('0');
    this.ModuleForm.get('Nationality').patchValue('0');
    this.ModuleForm.get('Religion').patchValue('0');
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewModuleClicked=false;
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
            this.ClassList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.sNo.toString(),
                Name: item.syllabusClassName
              };
            });
          } else {
            this.ClassList = [];
          }
        },
        (error) => {
          this.ClassList = [];
        }
      );
  };

  FetchDivisionList() {
    const requestData = { 
      SchoolID:this.AdminselectedSchoolID,
      AcademicYear:this.AdminselectedAcademivYearID,
      Class:this.ModuleForm.get('Class')?.value,
      Flag: '11' };

    this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.DivisionList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.name
              };
            });
          } else {
            this.DivisionList = [];
          }
        },
        (error) => {
          this.DivisionList = [];
        }
      );
  };

  FetchAdmissionNo(){
    const requestData = { 
      SchoolID:this.AdminselectedSchoolID,
      AcademicYear:this.AdminselectedAcademivYearID,
      Flag: '9' };

    this.apiurl.post<any>("Tbl_StudentDetails_CRUD_Operations", requestData).subscribe(
      (response: any) => {

        const item = response?.data?.[0];
        this.ModuleForm.patchValue({
            AdmissionNo: item.newAdmissionNo
        })
      },
      error => {
        console.error(error);
      }
    );
  };

  FetchRoutesList() {
    const requestData = { 
      SchoolID:this.AdminselectedSchoolID,
      AcademicYear:this.AdminselectedAcademivYearID,
      Flag: '3' };

    this.apiurl.post<any>('Tbl_Route_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.RoutesList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.name
              };
            });
          } else {
            this.RoutesList = [];
          }
        },
        (error) => {
          this.RoutesList = [];
        }
      );
  };

  FetchStopsList() {
    const requestData = { 
      SchoolID:this.AdminselectedSchoolID,
      AcademicYear:this.AdminselectedAcademivYearID,
      Route:this.ModuleForm.get('Route')?.value,
      Flag: '3' };

    this.apiurl.post<any>('Tbl_Stops_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.StopsList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.stopName
              };
            });
          } else {
            this.StopsList = [];
          }
        },
        (error) => {
          this.StopsList = [];
        }
      );
  };  

  FetchBusList() {
    const requestData = { 
      SchoolID:this.AdminselectedSchoolID,
      AcademicYear:this.AdminselectedAcademivYearID,
      RouteID:this.ModuleForm.get('Route')?.value,
      StopID:this.ModuleForm.get('Stop')?.value,
      Flag: '9' };

    this.apiurl.post<any>('Tbl_Fare_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.BusList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.busID,
                Name: item.busName
              };
            });
          } else {
            this.BusList = [];
          }
        },
        (error) => {
          this.BusList = [];
        }
      );
  };

  FetchFareList() {
    const requestData = { 
      SchoolID:this.AdminselectedSchoolID,
      AcademicYear:this.AdminselectedAcademivYearID,
      RouteID:this.ModuleForm.get('Route')?.value,
      StopID:this.ModuleForm.get('Stop')?.value,
      BusID:this.ModuleForm.get('Bus')?.value,
      Flag: '10' };

    this.apiurl.post<any>('Tbl_Fare_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.FareList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.amount
              };
            });
          } else {
            this.FareList = [];
          }
        },
        (error) => {
          this.FareList = [];
        }
      );
  };

  SubmitPersonalDetails(){
    if(this.activeTab=="personal"){
      this.ModuleForm.markAllAsTouched();
      const personalFieldKeys = [
        'School', 'AcademicYear','AdmissionNo', 'Class', 'Division', 'FirstName', 'AadharNo', 'MobileNo', 'Email',
        'DOB', 'Gender', 'Nationality', 'Religion', 'Caste'
      ];

      const isPersonalValid = personalFieldKeys.every(key => this.ModuleForm.get(key)?.valid);

      if (!isPersonalValid) {
        return;
      }
      else{
        const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
        const data = {
          SchoolID:this.ModuleForm.get('School')?.value,
          AcademicYear: this.ModuleForm.get('AcademicYear')?.value,
          AdmissionNo: this.ModuleForm.get('AdmissionNo')?.value,
          Class: this.ModuleForm.get('Class')?.value,
          Division: this.ModuleForm.get('Division')?.value,        
          JoinDate:this.ModuleForm.get('JoinDate')?.value,
          FirstName: this.ModuleForm.get('FirstName')?.value,
          MiddleName: this.ModuleForm.get('MiddleName')?.value,
          LastName: this.ModuleForm.get('LastName')?.value,
          AadharNo: this.ModuleForm.get('AadharNo')?.value,
          MobileNo: this.ModuleForm.get('MobileNo')?.value,
          EmailID: this.ModuleForm.get('Email')?.value,
          DOB: this.ModuleForm.get('DOB')?.value,
          Gender: this.ModuleForm.get('Gender')?.value,
          BloodGroup: this.ModuleForm.get('BloodGroup')?.value,
          Nationality: this.ModuleForm.get('Nationality')?.value,
          Religion: this.ModuleForm.get('Religion')?.value,
          Caste: this.ModuleForm.get('Caste')?.value,
          DocumentDetails: this.ModuleForm.get('Topics')?.value,
          IsActive:IsActiveStatusNumeric,
          Flag: '1'
        };

        this.apiurl.post("Tbl_StudentDetails_CRUD_Operations", data).subscribe({
          next: (response: any) => {
            if (response.statusCode === 200) {
              this.SubmitUser();
              this.tabChange('parents');
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
    }
    else if(this.activeTab=="parents"){
      this.ModuleForm.markAllAsTouched();
      const personalFieldKeys = [
        'FatherName', 'FatherMobile','FatherEmail', 'FatherAadharNo', 'MotherName', 
        'MotherMobile', 'MotherEmail','MotherAadharNo'
      ];

      const isPersonalValid = personalFieldKeys.every(key => this.ModuleForm.get(key)?.valid);

      if (!isPersonalValid) {
        return;
      }
      else{
        const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
        const data = {
          FatherName:this.ModuleForm.get('FatherName')?.value,
          FatherQualification: this.ModuleForm.get('FatherQualification')?.value,
          AdmissionID: this.ModuleForm.get('AdmissionNo')?.value,
          FatherOccupation: this.ModuleForm.get('FatherOccupation')?.value,
          FatherContact: this.ModuleForm.get('FatherMobile')?.value,        
          FatherEmail:this.ModuleForm.get('FatherEmail')?.value,
          FatherAadhar: this.ModuleForm.get('FatherAadharNo')?.value,
          MotherName: this.ModuleForm.get('MotherName')?.value,
          MotherQualification: this.ModuleForm.get('MotherQualification')?.value,
          MotherOccupation: this.ModuleForm.get('MotherOccupation')?.value,
          MotherContact: this.ModuleForm.get('MotherMobile')?.value,
          MotherEmail: this.ModuleForm.get('MotherEmail')?.value,
          MotherAadhar: this.ModuleForm.get('MotherAadharNo')?.value,
          Flag: '1'
        };

        this.apiurl.post("Tbl_StudentParentDetails_CRUD_Operations", data).subscribe({
          next: (response: any) => {
            if (response.statusCode === 200) {
              this.SubmitUser();
              this.ModuleForm.get('PermanentCountry').patchValue('0');
              this.ModuleForm.get('PermanentState').patchValue('0');
              this.tabChange('permanent');
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
    }
    else if(this.activeTab=="permanent"){
      this.ModuleForm.markAllAsTouched();
      const personalFieldKeys = [
        'PermanentAddressLine1', 'PermanentPincode','PermanentCountry', 'PermanentState'
      ];

      const isPersonalValid = personalFieldKeys.every(key => this.ModuleForm.get(key)?.valid);

      if (!isPersonalValid) {
        return;
      }
      else{
        const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
        const data = {
          PermanentAddressLine1:this.ModuleForm.get('PermanentAddressLine1')?.value,
          PermanentAddressLine2: this.ModuleForm.get('PermanentAddressLine2')?.value,
          AdmissionID: this.ModuleForm.get('AdmissionNo')?.value,
          PermanentPincode: this.ModuleForm.get('PermanentPincode')?.value,
          PermanentPlace: this.ModuleForm.get('PermanentPlace')?.value,        
          PermanentCountry:this.ModuleForm.get('PermanentCountry')?.value,
          PermanentState: this.ModuleForm.get('PermanentState')?.value,
          PermanentDistrict: this.ModuleForm.get('PermanentDistrict')?.value,
          PermanentCity: this.ModuleForm.get('PermanentCity')?.value,
          Flag: '1'
        };

        this.apiurl.post("Tbl_StudentAddressDetails_CRUD_Operations", data).subscribe({
          next: (response: any) => {
            if (response.statusCode === 200) {
              this.ModuleForm.get('TemporaryCountry').patchValue('0');
              this.ModuleForm.get('TemporaryState').patchValue('0');
              this.tabChange('temporary');
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
    }
    else if(this.activeTab=="temporary"){
      this.ModuleForm.get('TemporaryAddressLine1')?.setValidators([Validators.required]);
      this.ModuleForm.get('TemporaryPincode')?.setValidators([Validators.required]);
      this.ModuleForm.get('TemporaryCountry')?.setValidators([Validators.required,Validators.min(1)]);
      this.ModuleForm.get('TemporaryState')?.setValidators([Validators.required,Validators.min(1)]);
      this.ModuleForm.markAllAsTouched();
      const personalFieldKeys = [
        'TemporaryAddressLine1', 'TemporaryPincode','TemporaryCountry', 'TemporaryState'
      ];

      const isPersonalValid = personalFieldKeys.every(key => this.ModuleForm.get(key)?.valid);

      if (!isPersonalValid) {
        return;
      }
      else{
        const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
        const data = {
          TemporaryAddressLine1:this.ModuleForm.get('TemporaryAddressLine1')?.value,
          TemporaryAddressLine2: this.ModuleForm.get('TemporaryAddressLine2')?.value,
          AdmissionID: this.ModuleForm.get('AdmissionNo')?.value,
          TemporaryPinCode: this.ModuleForm.get('TemporaryPincode')?.value,
          TemporaryPlace: this.ModuleForm.get('TemporaryPlace')?.value,        
          TemporaryCountry:this.ModuleForm.get('TemporaryCountry')?.value,
          TemporaryState: this.ModuleForm.get('TemporaryState')?.value,
          TemporaryDistrict: this.ModuleForm.get('TemporaryDistrict')?.value,
          TemporaryCity: this.ModuleForm.get('TemporaryCity')?.value,
          Flag: '5'
        };

        this.apiurl.post("Tbl_StudentAddressDetails_CRUD_Operations", data).subscribe({
          next: (response: any) => {
            if (response.statusCode === 200) {
              this.ModuleForm.get('Route').patchValue('0');
              this.ModuleForm.get('Stop').patchValue('0');
              this.ModuleForm.get('Bus').patchValue('0');
              this.ModuleForm.get('Fare').patchValue('0');
              this.FetchRoutesList();
              this.tabChange('bus');
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
    }
    else if(this.activeTab=="bus"){      
      this.ModuleForm.get('Route')?.setValidators([Validators.required,Validators.min(1)]);
      this.ModuleForm.get('Stop')?.setValidators([Validators.required,Validators.min(1)]);
      this.ModuleForm.get('Bus')?.setValidators([Validators.required,Validators.min(1)]);
      this.ModuleForm.get('Fare')?.setValidators([Validators.required,Validators.min(1)]);
      this.ModuleForm.get('StartDate')?.setValidators([Validators.required]);
      this.ModuleForm.markAllAsTouched();
      const personalFieldKeys = [
        'Route', 'Stop','Bus', 'Fare','StartDate'
      ];

      const isPersonalValid = personalFieldKeys.every(key => this.ModuleForm.get(key)?.valid);

      if (!isPersonalValid) {
        return;
      }
      else{
        const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
        const data = {
          Route:this.ModuleForm.get('Route')?.value,
          Stop: this.ModuleForm.get('Stop')?.value,
          AdmissionID: this.ModuleForm.get('AdmissionNo')?.value,
          Bus: this.ModuleForm.get('Bus')?.value,
          Fare: this.ModuleForm.get('Fare')?.value,
          StartDate: this.ModuleForm.get('StartDate')?.value,        
          IsActive:IsActiveStatusNumeric,
          Flag: '1'
        };

        this.apiurl.post("Tbl_StudentTransportationDetails_CRUD_Operations", data).subscribe({
          next: (response: any) => {
            if (response.statusCode === 200) {
              this.IsAddNewClicked=!this.IsAddNewClicked;
              this.FetchInitialData();
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
    }
  };

  SubmitUser(){
    // parentroleid=15
    if(this.activeTab=="personal"){
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const formData = new FormData();
      formData.append('SchoolID', this.ModuleForm.get('School')?.value ?? '');
      formData.append('FirstName', this.ModuleForm.get('FirstName')?.value ?? '');
      formData.append('LastName', this.ModuleForm.get('LastName')?.value ?? '');
      formData.append('MobileNo', this.ModuleForm.get('MobileNo')?.value ?? '');
      formData.append('Email', this.ModuleForm.get('Email')?.value ?? '');
      formData.append('RollId', '14');
      formData.append('Password', 'Welcome@2025');
      formData.append('IsActive', IsActiveStatusNumeric);
      formData.append('Flag', '1');

      this.apiurl.post("Tbl_Users_CRUD_Operations", formData).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            // this.ModuleForm.reset();
            // this.ModuleForm.markAsPristine();
          }
        },
        error: (error: any) => {
          if (error.status === 409) {
            this.AminityInsStatus = error.error?.Message || "Student already exists";
          } else if (error.status === 400) {
            this.AminityInsStatus = error.error?.Message || "Operation failed";
          } else {
            this.AminityInsStatus = "Unexpected error occurred";
          }
          this.isModalOpen = true;
        },
        complete: () => {
        }
      });
    }
    else if(this.activeTab=="parents"){
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const formData = new FormData();
      formData.append('SchoolID', this.ModuleForm.get('School')?.value ?? '');
      formData.append('FirstName', this.ModuleForm.get('FatherName')?.value ?? '');
      formData.append('MobileNo', this.ModuleForm.get('FatherMobile')?.value ?? '');
      formData.append('Email', this.ModuleForm.get('FatherEmail')?.value ?? '');
      formData.append('RollId', '15');
      formData.append('Password', 'Welcome@2025');
      formData.append('IsActive', IsActiveStatusNumeric);
      formData.append('Flag', '1');

        this.apiurl.post("Tbl_Users_CRUD_Operations", formData).subscribe({
          next: (response: any) => {
            if (response.statusCode === 200) {
              // this.ModuleForm.reset();
              // this.ModuleForm.markAsPristine();
            }
          },
          error: (error: any) => {
            if (error.status === 409) {
              this.AminityInsStatus = error.error?.Message || "User already exists";
            } else if (error.status === 400) {
              this.AminityInsStatus = error.error?.Message || "Operation failed";
            } else {
              this.AminityInsStatus = "Unexpected error occurred";
            }
            this.isModalOpen = true;
          },
          complete: () => {
          }
        });
    }
  };

  UpdateUser(){
    if(this.activeTab=="personal"){
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const formData = new FormData();
      formData.append('SchoolID', this.ModuleForm.get('School')?.value ?? '');
      formData.append('FirstName', this.ModuleForm.get('FirstName')?.value ?? '');
      formData.append('LastName', this.ModuleForm.get('LastName')?.value ?? '');
      formData.append('MobileNo', this.ModuleForm.get('MobileNo')?.value ?? '');
      formData.append('Email', this.ModuleForm.get('Email')?.value ?? '');
      formData.append('IsActive', IsActiveStatusNumeric);
      formData.append('Flag', '7');

      this.apiurl.post("Tbl_Users_CRUD_Operations", formData).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            // this.ModuleForm.reset();
            // this.ModuleForm.markAsPristine();
          }
        },
        error: (error: any) => {
          if (error.status === 409) {
            this.AminityInsStatus = error.error?.Message || "Student already exists";
          } else if (error.status === 400) {
            this.AminityInsStatus = error.error?.Message || "Operation failed";
          } else {
            this.AminityInsStatus = "Unexpected error occurred";
          }
          this.isModalOpen = true;
        },
        complete: () => {
        }
      });
    }
    else if(this.activeTab=="parents"){
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const formData = new FormData();
      formData.append('SchoolID', this.ModuleForm.get('School')?.value ?? '');
      formData.append('FirstName', this.ModuleForm.get('FatherName')?.value ?? '');
      formData.append('MobileNo', this.ModuleForm.get('FatherMobile')?.value ?? '');
      formData.append('Email', this.ModuleForm.get('FatherEmail')?.value ?? '');
      formData.append('IsActive', IsActiveStatusNumeric);
      formData.append('Flag', '7');

        this.apiurl.post("Tbl_Users_CRUD_Operations", formData).subscribe({
          next: (response: any) => {
            if (response.statusCode === 200) {
              // this.ModuleForm.reset();
              // this.ModuleForm.markAsPristine();
            }
          },
          error: (error: any) => {
            if (error.status === 409) {
              this.AminityInsStatus = error.error?.Message || "User already exists";
            } else if (error.status === 400) {
              this.AminityInsStatus = error.error?.Message || "Operation failed";
            } else {
              this.AminityInsStatus = "Unexpected error occurred";
            }
            this.isModalOpen = true;
          },
          complete: () => {
          }
        });
    }
  };

  FetchPersonalDetByID(SyllabusID: string, mode: 'view' | 'edit') {
    const data = {
      AdmissionNo: SyllabusID,
      Flag: "4"
    };

    this.apiurl.post<any>("Tbl_StudentDetails_CRUD_Operations", data).subscribe(
      (response: any) => {

        const item = response?.data?.[0];
        if (!item) {
          this.ModuleForm.reset();
          this.viewSyllabus = null;
          return;
        }

        const isActive = item.isActive === '1';
        const classArray = item.class? item.class.split(',').map((x: string) => x.trim()): [];

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewSyllabus = {
            ID: item.id,
            School:item.schoolID,
            AcademicYear: item.academicYear,
            AdmissionNo:item.admissionNo,
            Class: item.class,
            Division: item.division,
            JoinDate:this.formatDateYYYYMMDD(item.joinDate),
            FirstName: item.firstName,
            MiddleName: item.middleName,
            LastName: item.lastName,
            Name: `${item.firstName ?? ''} ${item.middleName ?? ''} ${item.lastName ?? ''}`.replace(/\s+/g, ' ').trim(),
            AadharNo:item.aadharNo,
            MobileNo: item.mobileNo,
            Email: item.emailID,
            DOB: this.formatDateYYYYMMDD(item.dob),
            Gender: this.GenderGroups.find(x => x.id === item.gender)?.name || '',
            BloodGroup: this.bloodGroups.find(x => x.id === item.bloodGroup)?.name || '',
            Nationality: this.NationalityGroups.find(x => x.id === item.nationality)?.name || '',
            Religion: this.ReligionsGroups.find(x => x.id === item.religion)?.name || '',
            Caste: item.caste,
            ClassName: item.className,
            SchoolName:item.schoolName,
            AcademicYearName:item.academicYearName,
            ClassDivisionName:item.classDivisionName,
            IsActive: isActive
          };
          this.isViewModalOpen = true;
          this.selectedAdmissionID=item.admissionNo;
        }

        if (mode === 'edit') {
          this.isViewMode = false;
          this.ModuleForm.patchValue({
            ID: item.id,
            School:item.schoolID,
            AcademicYear: item.academicYear,
            AdmissionNo:item.admissionNo,
            Class: item.class,
            Division: item.division,
            JoinDate:this.formatDateYYYYMMDD(item.joinDate),
            FirstName: item.firstName,
            MiddleName: item.middleName,
            LastName: item.lastName,
            AadharNo:item.aadharNo,
            MobileNo: item.mobileNo,
            Email: item.emailID,
            DOB: this.formatDateYYYYMMDD(item.dob),
            Gender:item.gender,
            BloodGroup: item.bloodGroup,
            Nationality: item.nationality,
            Religion: item.religion,
            Caste: item.caste
          });
          this.AdminselectedSchoolID=item.schoolID;
          this.AdminselectedAcademivYearID=item.academicYear;
          this.FetchAcademicYearsList();
          this.FetchClassList();
          this.FetchDivisionList();
          this.IsActiveStatus = isActive;
          this.IsAddNewClicked = true;
          this.selectedAdmissionID=item.admissionNo;
        }

      },
      error => {
        console.error(error);
      }
    );
  };

  FetchParentDetByAdmissionID(mode: 'view' | 'edit') {
    const data = {
      AdmissionID: this.selectedAdmissionID,
      Flag: "4"
    };

    this.apiurl.post<any>("Tbl_StudentParentDetails_CRUD_Operations", data).subscribe(
      (response: any) => {

        const item = response?.data?.[0];
        if (!item) {
          this.ModuleForm.reset();
          this.viewSyllabus = null;
          return;
        }

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewSyllabus = {
            FatherName:item.fatherName,
            FatherQualification: item.fatherQualification,
            FatherOccupation: item.fatherOccupation,
            FatherMobile: item.fatherContact,
            FatherEmail:item.fatherEmail,
            FatherAadharNo: item.fatherAadhar,
            MotherName: item.motherName,
            MotherQualification: item.motherQualification,
            MotherOccupation:item.motherOccupation,
            MotherMobile: item.motherContact,
            MotherEmail: item.motherEmail,
            MotherAadharNo: item.motherAadhar
          };         
        }

        if (mode === 'edit') {
          this.isViewMode = false;
          this.ModuleForm.patchValue({
            FatherName:item.fatherName,
            FatherQualification: item.fatherQualification,
            FatherOccupation: item.fatherOccupation,
            FatherMobile: item.fatherContact,
            FatherEmail:item.fatherEmail,
            FatherAadharNo: item.fatherAadhar,
            MotherName: item.motherName,
            MotherQualification: item.motherQualification,
            MotherOccupation:item.motherOccupation,
            MotherMobile: item.motherContact,
            MotherEmail: item.motherEmail,
            MotherAadharNo: item.motherAadhar
          });
        }

      },
      error => {
        console.error(error);
      }
    );
  };

  FetchPermanentAddressByAdmissionID(mode: 'view' | 'edit') {
    const data = {
      AdmissionID: this.selectedAdmissionID,
      Flag: "4"
    };

    this.apiurl.post<any>("Tbl_StudentAddressDetails_CRUD_Operations", data).subscribe(
      (response: any) => {

        const item = response?.data?.[0];
        if (!item) {
          this.ModuleForm.reset();
          this.viewSyllabus = null;
          return;
        }

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewSyllabus = {
            PermanentAddressLine1:item.permanentAddressLine1,
            PermanentAddressLine2: item.permanentAddressLine2,
            PermanentPincode: item.permanentPinCode,
            PermanentPlace: item.permanentPlace,
            PermanentCountry: this.CountryGroups.find(x => x.id === item.permanentCountry)?.name || '',
            PermanentState: this.StateGroups.find(x => x.id === item.permanentState)?.name || '',
            PermanentDistrict: item.permanentDistrict,
            PermanentCity: item.permanentCity
          };         
        }

        if (mode === 'edit') {
          this.isViewMode = false;
          this.ModuleForm.patchValue({
            PermanentAddressLine1:item.permanentAddressLine1,
            PermanentAddressLine2: item.permanentAddressLine2,
            PermanentPincode: item.permanentPinCode,
            PermanentPlace: item.permanentPlace,
            PermanentCountry:item.permanentCountry,
            PermanentState: item.permanentState,
            PermanentDistrict: item.permanentDistrict,
            PermanentCity: item.permanentCity
          });
        }

      },
      error => {
        console.error(error);
      }
    );
  };

  FetchTemporaryAddressByAdmissionID(mode: 'view' | 'edit') {
    const data = {
      AdmissionID: this.selectedAdmissionID,
      Flag: "4"
    };

    this.apiurl.post<any>("Tbl_StudentAddressDetails_CRUD_Operations", data).subscribe(
      (response: any) => {

        const item = response?.data?.[0];
        if (!item) {
          this.ModuleForm.reset();
          this.viewSyllabus = null;
          return;
        }

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewSyllabus = {
            TemporaryAddressLine1:item.temporaryAddressLine1,
            TemporaryAddressLine2: item.temporaryAddressLine2,
            TemporaryPincode: item.temporaryPinCode,
            TemporaryPlace: item.temporaryPlace,
            TemporaryCountry: this.CountryGroups.find(x => x.id === item.temporaryCountry)?.name || '',
            TemporaryState: this.StateGroups.find(x => x.id === item.temporaryState)?.name || '',
            TemporaryDistrict: item.temporaryDistrict,
            TemporaryCity: item.temporaryCity
          };         
        }

        if (mode === 'edit') {
          this.isViewMode = false;
          this.ModuleForm.patchValue({
            TemporaryAddressLine1:item.temporaryAddressLine1,
            TemporaryAddressLine2: item.temporaryAddressLine2,
            TemporaryPincode: item.temporaryPinCode,
            TemporaryPlace: item.temporaryPlace,
            TemporaryCountry:item.temporaryCountry,
            TemporaryState: item.temporaryState,
            TemporaryDistrict: item.temporaryDistrict,
            TemporaryCity: item.temporaryCity
          });
        }

      },
      error => {
        console.error(error);
      }
    );
  };

  FetchTransportationDetByAdmissionID(mode: 'view' | 'edit') {
    const data = {
      AdmissionID: this.selectedAdmissionID,
      Flag: "4"
    };

    this.apiurl.post<any>("Tbl_StudentTransportationDetails_CRUD_Operations", data).subscribe(
      (response: any) => {

        const item = response?.data?.[0];
        if (!item) {
          this.ModuleForm.reset();
          this.viewSyllabus = null;
          return;
        }

        const isActive = item.isActive === '1';

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewSyllabus = {
            Route:item.route,
            Stop: item.stop,
            Bus: item.bus,
            Fare: item.fare,
            StartDate:this.formatDateYYYYMMDD(item.startDate),
            IsActive: isActive,
            RouteName:item.routeName,
            StopName:item.stopName,
            BusName:item.busName,
            FareName:item.fareName
          };         
        }

        if (mode === 'edit') {
          this.isViewMode = false;
          this.ModuleForm.patchValue({
            Route:item.route,
            Stop: item.stop,
            Bus: item.bus,
            Fare: item.fare,
            StartDate:this.formatDateYYYYMMDD(item.startDate)
          });
          this.AdminselectedSchoolID=item.schoolID;
          this.AdminselectedAcademivYearID=item.academicYear;
          this.FetchStopsList();
          this.FetchBusList();
          this.FetchFareList();
          this.IsActiveStatus = isActive;
        }

      },
      error => {
        console.error(error);
      }
    );
  };

  UpdateModule(){
    if(this.activeTab=="personal"){
      this.ModuleForm.markAllAsTouched();
      const personalFieldKeys = [
        'School', 'AcademicYear','AdmissionNo', 'Class', 'Division', 'FirstName', 'AadharNo', 'MobileNo', 'Email',
        'DOB', 'Gender', 'Nationality', 'Religion', 'Caste'
      ];

      const isPersonalValid = personalFieldKeys.every(key => this.ModuleForm.get(key)?.valid);

      if (!isPersonalValid) {
        return;
      }
      else{
        const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
        const data = {
          SchoolID:this.ModuleForm.get('School')?.value,
          AcademicYear: this.ModuleForm.get('AcademicYear')?.value,
          AdmissionNo: this.ModuleForm.get('AdmissionNo')?.value,
          Class: this.ModuleForm.get('Class')?.value,
          Division: this.ModuleForm.get('Division')?.value,        
          JoinDate:this.ModuleForm.get('JoinDate')?.value,
          FirstName: this.ModuleForm.get('FirstName')?.value,
          MiddleName: this.ModuleForm.get('MiddleName')?.value,
          LastName: this.ModuleForm.get('LastName')?.value,
          AadharNo: this.ModuleForm.get('AadharNo')?.value,
          MobileNo: this.ModuleForm.get('MobileNo')?.value,
          EmailID: this.ModuleForm.get('Email')?.value,
          DOB: this.ModuleForm.get('DOB')?.value,
          Gender: this.ModuleForm.get('Gender')?.value,
          BloodGroup: this.ModuleForm.get('BloodGroup')?.value,
          Nationality: this.ModuleForm.get('Nationality')?.value,
          Religion: this.ModuleForm.get('Religion')?.value,
          Caste: this.ModuleForm.get('Caste')?.value,
          DocumentDetails: this.ModuleForm.get('Topics')?.value,
          IsActive:IsActiveStatusNumeric,
          Flag: '5'
        };

        this.apiurl.post("Tbl_StudentDetails_CRUD_Operations", data).subscribe({
          next: (response: any) => {
            if (response.statusCode === 200) {
              this.UpdateUser();
              this.tabChange('parents');
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
    }
    else if(this.activeTab=="parents"){
      this.ModuleForm.markAllAsTouched();
      const personalFieldKeys = [
        'FatherName', 'FatherMobile','FatherEmail', 'FatherAadharNo', 'MotherName', 
        'MotherMobile', 'MotherEmail','MotherAadharNo'
      ];

      const isPersonalValid = personalFieldKeys.every(key => this.ModuleForm.get(key)?.valid);

      if (!isPersonalValid) {
        return;
      }
      else{
        const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
        const data = {
          FatherName:this.ModuleForm.get('FatherName')?.value,
          FatherQualification: this.ModuleForm.get('FatherQualification')?.value,
          AdmissionID: this.ModuleForm.get('AdmissionNo')?.value,
          FatherOccupation: this.ModuleForm.get('FatherOccupation')?.value,
          FatherContact: this.ModuleForm.get('FatherMobile')?.value,        
          FatherEmail:this.ModuleForm.get('FatherEmail')?.value,
          FatherAadhar: this.ModuleForm.get('FatherAadharNo')?.value,
          MotherName: this.ModuleForm.get('MotherName')?.value,
          MotherQualification: this.ModuleForm.get('MotherQualification')?.value,
          MotherOccupation: this.ModuleForm.get('MotherOccupation')?.value,
          MotherContact: this.ModuleForm.get('MotherMobile')?.value,
          MotherEmail: this.ModuleForm.get('MotherEmail')?.value,
          MotherAadhar: this.ModuleForm.get('MotherAadharNo')?.value,
          Flag: '5'
        };

        this.apiurl.post("Tbl_StudentParentDetails_CRUD_Operations", data).subscribe({
          next: (response: any) => {
            if (response.statusCode === 200) {
              this.UpdateUser();
              this.ModuleForm.get('PermanentCountry').patchValue('0');
              this.ModuleForm.get('PermanentState').patchValue('0');
              this.tabChange('permanent');
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
    }
    else if(this.activeTab=="permanent"){
      this.ModuleForm.markAllAsTouched();
      const personalFieldKeys = [
        'PermanentAddressLine1', 'PermanentPincode','PermanentCountry', 'PermanentState'
      ];

      const isPersonalValid = personalFieldKeys.every(key => this.ModuleForm.get(key)?.valid);

      if (!isPersonalValid) {
        return;
      }
      else{
        const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
        const data = {
          PermanentAddressLine1:this.ModuleForm.get('PermanentAddressLine1')?.value,
          PermanentAddressLine2: this.ModuleForm.get('PermanentAddressLine2')?.value,
          AdmissionID: this.ModuleForm.get('AdmissionNo')?.value,
          PermanentPincode: this.ModuleForm.get('PermanentPincode')?.value,
          PermanentPlace: this.ModuleForm.get('PermanentPlace')?.value,        
          PermanentCountry:this.ModuleForm.get('PermanentCountry')?.value,
          PermanentState: this.ModuleForm.get('PermanentState')?.value,
          PermanentDistrict: this.ModuleForm.get('PermanentDistrict')?.value,
          PermanentCity: this.ModuleForm.get('PermanentCity')?.value,
          Flag: '5'
        };

        this.apiurl.post("Tbl_StudentAddressDetails_CRUD_Operations", data).subscribe({
          next: (response: any) => {
            if (response.statusCode === 200) {
              this.ModuleForm.get('TemporaryCountry').patchValue('0');
              this.ModuleForm.get('TemporaryState').patchValue('0');
              this.tabChange('temporary');
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
    }
    else if(this.activeTab=="temporary"){
      this.ModuleForm.markAllAsTouched();
      const personalFieldKeys = [
        'TemporaryAddressLine1', 'TemporaryPincode','TemporaryCountry', 'TemporaryState'
      ];

      const isPersonalValid = personalFieldKeys.every(key => this.ModuleForm.get(key)?.valid);

      if (!isPersonalValid) {
        return;
      }
      else{
        const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
        const data = {
          TemporaryAddressLine1:this.ModuleForm.get('TemporaryAddressLine1')?.value,
          TemporaryAddressLine2: this.ModuleForm.get('TemporaryAddressLine2')?.value,
          AdmissionID: this.ModuleForm.get('AdmissionNo')?.value,
          TemporaryPinCode: this.ModuleForm.get('TemporaryPincode')?.value,
          TemporaryPlace: this.ModuleForm.get('TemporaryPlace')?.value,        
          TemporaryCountry:this.ModuleForm.get('TemporaryCountry')?.value,
          TemporaryState: this.ModuleForm.get('TemporaryState')?.value,
          TemporaryDistrict: this.ModuleForm.get('TemporaryDistrict')?.value,
          TemporaryCity: this.ModuleForm.get('TemporaryCity')?.value,
          Flag: '5'
        };

        this.apiurl.post("Tbl_StudentAddressDetails_CRUD_Operations", data).subscribe({
          next: (response: any) => {
            if (response.statusCode === 200) {
              this.ModuleForm.get('Route').patchValue('0');
              this.ModuleForm.get('Stop').patchValue('0');
              this.ModuleForm.get('Bus').patchValue('0');
              this.ModuleForm.get('Fare').patchValue('0');
              this.FetchRoutesList();
              this.tabChange('bus');
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
    }
    else if(this.activeTab=="bus"){
      this.ModuleForm.markAllAsTouched();
      const personalFieldKeys = [
        'Route', 'Stop','Bus', 'Fare','StartDate'
      ];

      const isPersonalValid = personalFieldKeys.every(key => this.ModuleForm.get(key)?.valid);

      if (!isPersonalValid) {
        return;
      }
      else{
        const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
        const data = {
          Route:this.ModuleForm.get('Route')?.value,
          Stop: this.ModuleForm.get('Stop')?.value,
          AdmissionID: this.ModuleForm.get('AdmissionNo')?.value,
          Bus: this.ModuleForm.get('Bus')?.value,
          Fare: this.ModuleForm.get('Fare')?.value,
          StartDate: this.ModuleForm.get('StartDate')?.value,        
          IsActive:IsActiveStatusNumeric,
          Flag: '5'
        };

        this.apiurl.post("Tbl_StudentTransportationDetails_CRUD_Operations", data).subscribe({
          next: (response: any) => {
            if (response.statusCode === 200) {
              this.IsAddNewClicked=!this.IsAddNewClicked;
              this.FetchInitialData();
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
    return Math.ceil(this.SubjectsCount / this.pageSize);
  };

  getVisiblePageNumbers() {
    const totalPages = this.totalPages();
    const pages = [];
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount/2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, totalPages);
    if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
    for (let i=start; i<=end; i++) pages.push(i);
    return pages;
  };

  onSearchChange() {
    clearTimeout(this.searchTimer);

    this.searchTimer = setTimeout(() => {
      const value = this.searchQuery?.trim() || '';

      if (value.length === 0) {
        this.currentPage = 1;
        this.pageSize=5;
        this.visiblePageCount=3;
        this.FetchInitialData();
        return;
      }

      if (value.length < this.SEARCH_MIN_LENGTH) {
        return;
      }
      
      this.currentPage = 1;
      this.pageSize=5;
      this.visiblePageCount=3;
      this.FetchInitialData();

    }, this.SEARCH_DEBOUNCE);
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

  // editreview(SyllabusID: string): void {
  //   if (this.isAdmin) {
  //     this.ModuleForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
  //   } else {
  //     this.ModuleForm.get('School')?.clearValidators();
  //   }
  //   this.editclicked=true;
  //   this.FetchPersonalDetByID(SyllabusID,'edit');
  //   this.ViewModuleClicked=true;
  // };

  editreview(SyllabusID: string): void {
    this.activeTab="personal";
    this.currentMode = 'edit';
    this.selectedAdmissionID = SyllabusID;

    if (this.isAdmin) {
      this.ModuleForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
    } else {
      this.ModuleForm.get('School')?.clearValidators();
    }
    this.editclicked=true;
    this.FetchPersonalDetByID(SyllabusID,'edit');
    this.ViewModuleClicked=true;
  }


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

  exportToExcel() {
      const isSearch = !!this.searchQuery?.trim();
      const flag = isSearch ? '7' : '2';

      const payload: any = {
        Flag: flag,
        SchoolID: this.selectedSchoolID || null,
        Name: isSearch ? this.searchQuery.trim() : null
      };

      this.loader.show();

      this.http.post(`${this.apiurl.api_url}/ExportSyllabusToExcel`, payload, { responseType: 'blob' })
        .subscribe({
          next: (blob: Blob) => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'Syllabus.xlsx';
            a.click();
            URL.revokeObjectURL(a.href);
            this.loader.hide();
          },
          error: () => {
            alert('Excel export failed. Please try again.');
            this.loader.hide();
          }
        });
  };

  exportSyllabus(type: 'pdf' | 'excel' | 'print') {
    const isSearch = !!this.searchQuery?.trim();
    const flag = isSearch ? '7' : '2';
    const payload: any = {
      Flag: flag,
      SchoolID: this.selectedSchoolID || null,
      Name: isSearch ? this.searchQuery.trim() : null
    };

    this.loader.show();

    const url = `${this.apiurl.api_url}/ExportSyllabus?type=${type}`;

    this.http.post(url, payload, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const fileNameBase = `Syllabus_${new Date().toISOString().replace(/[:.]/g,'')}`;

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

          // Release URL after use
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

  // viewReview(SyllabusID: string): void {
  //   this.FetchPersonalDetByID(SyllabusID,'view');
  //   this.isViewModalOpen=true;
  // };

  viewReview(SyllabusID: string): void {
    this.currentMode = 'view';
    this.selectedAdmissionID = SyllabusID;
    this.FetchPersonalDetByID(SyllabusID, 'view');
    this.isViewModalOpen = true;
  };


  onAdminSchoolChange(event: Event) {
    this.academicYearList=[];
    this.SyllabusList = [];
    this.ModuleForm.get('Class').patchValue('0');
    this.ModuleForm.get('AcademicYear').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if(schoolID=="0"){
      this.AdminselectedSchoolID="";
    }else{
      this.AdminselectedSchoolID = schoolID;
    }   
    this.FetchAcademicYearsList();
  };

  onAdminAcademicYearChange(event: Event) {
    this.ClassList = []; 
    this.ModuleForm.get('Class').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;    
    if(schoolID=="0"){
      this.AdminselectedAcademivYearID="";
    }else{
      this.AdminselectedAcademivYearID = schoolID;
    }  
    console.log('this.AdminselectedAcademivYearID',this.AdminselectedAcademivYearID);
    this.FetchAdmissionNo();  
    this.FetchClassList();
  };

  onClassSelectedChange(event: Event) {
    this.DivisionList = []; 
    this.ModuleForm.get('Division').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value; 
    this.FetchDivisionList();
  };

  onRouteSelectedChange(event: Event) {
    this.StopsList = []; 
    this.ModuleForm.get('Stop').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value; 
    this.FetchStopsList();
  };

  onStopSelectedChange(event: Event) {
    this.BusList = []; 
    this.ModuleForm.get('Bus').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value; 
    this.FetchBusList();
  };

  onBusSelectedChange(event: Event) {
    this.FareList = []; 
    this.ModuleForm.get('Fare').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value; 
    this.FetchFareList();
  };

  activeTab: string = 'personal';

  // tabChange(tab: string) {
  //   this.activeTab = tab;
  //   this.cd.detectChanges();
  // }

  tabChange(tab: string) {
    this.activeTab = tab;    
    this.cd.detectChanges();

    const mode = this.currentMode;

    if (tab === "personal") {
      this.FetchPersonalDetByID(this.selectedAdmissionID, mode);
    }
    else if (tab === "parents") {
      this.FetchParentDetByAdmissionID(mode);
    }
    else if (tab === "permanent") {
      this.FetchPermanentAddressByAdmissionID(mode);
    }
    else if (tab === "temporary") {
      this.FetchTemporaryAddressByAdmissionID(mode);
    }
    else if (tab === "bus") {
      this.FetchRoutesList();
      this.FetchTransportationDetByAdmissionID(mode);
    }
  }


  SkipButtonClick(){
    this.ModuleForm.get('Route').patchValue('0');
    this.ModuleForm.get('Stop').patchValue('0');
    this.ModuleForm.get('Bus').patchValue('0');
    this.ModuleForm.get('Fare').patchValue('0');
    this.FetchRoutesList();
    this.activeTab="bus"
  }

  CancelButtonClick(){
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.FetchInitialData();
  }
}
