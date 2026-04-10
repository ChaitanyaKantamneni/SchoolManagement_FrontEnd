import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
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
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-admission',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './admission.component.html',
  styleUrls: ['./admission.component.css']
})
export class AdmissionComponent extends BasePermissionComponent {
  pageName = 'Admission';

  @ViewChild('bulkFileInput') bulkFileInput?: ElementRef<HTMLInputElement>;

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
  bulkUploadRows: any[] = [];
  bulkUploadFileName: string = '';
  bulkUploadStatus: string = '';
  isBulkUploading: boolean = false;
  isBulkUploadModalOpen: boolean = false;
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

  private readonly requiredBulkColumnsCommon = [
    'AcademicYear', 'AdmissionNo', 'Class', 'Division', 'JoinDate', 'FirstName',
    'AadharNo', 'MobileNo', 'EmailID', 'DOB', 'Gender', 'Nationality', 'Religion',
    'FatherName', 'FatherContact', 'FatherEmail', 'FatherAadhar',
    'MotherName', 'MotherContact', 'MotherEmail', 'MotherAadhar',
    'PermanentAddressLine1', 'PermanentPinCode', 'PermanentCountry', 'PermanentState'
  ];

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
      formData.append('RollId', '5');
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
      formData.append('RollId', '6');
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

  openBulkUploadModal(): void {
    this.isBulkUploadModalOpen = true;
  }

  clearBulkUploadFileSelection(): void {
    this.bulkUploadFileName = '';
    this.bulkUploadRows = [];
    this.bulkUploadStatus = '';
    const el = this.bulkFileInput?.nativeElement;
    if (el) {
      el.value = '';
    }
    this.cd.detectChanges();
  }

  closeBulkUploadModal(): void {
    this.clearBulkUploadFileSelection();
    this.isBulkUploadModalOpen = false;
  }

  async downloadBulkTemplate() {
    this.loader.show();
    try {
      const exceljsModule: any = await import('exceljs');
      const WorkbookCtor =
        exceljsModule?.Workbook ||
        exceljsModule?.default?.Workbook;
      if (!WorkbookCtor) {
        throw new Error('Excel engine not loaded');
      }

      const safePost = async (endpoint: string, payload: any) => {
        try {
          const resp = await firstValueFrom(this.apiurl.post<any>(endpoint, payload));
          return resp?.data || [];
        } catch {
          return [];
        }
      };

      const schoolsData = await safePost('Tbl_SchoolDetails_CRUD', { Flag: '2' });
      const effectiveSchoolID = this.getEffectiveSchoolId();
      const schoolIds: string[] = this.isAdmin
        ? schoolsData.map((x: any) => String(x.id)).filter(Boolean)
        : [effectiveSchoolID].filter(Boolean);

      const yearMap = new Map<string, string[]>();
      const syllabusMap = new Map<string, string[]>();
      const classMap = new Map<string, string[]>();
      const divisionMap = new Map<string, string[]>();
      const routeMap = new Map<string, string[]>();
      const stopMap = new Map<string, string[]>();
      const busMap = new Map<string, string[]>();
      const fareMap = new Map<string, string[]>();
      const allYears: any[] = [];
      const allSyllabus: any[] = [];
      const allClasses: any[] = [];
      const allDivisions: any[] = [];
      const allRoutes: any[] = [];
      const allStops: any[] = [];
      const allBuses: any[] = [];
      const allFares: any[] = [];

      for (const schoolId of schoolIds) {
        const years = await safePost('Tbl_AcademicYear_CRUD_Operations', { SchoolID: schoolId, Flag: '2' });
        const schoolYearKey = `AY_S_${schoolId}`;
        const yearValuesForSchool = years.map((y: any) => `${y.id} - ${y.name ?? ''}`);
        yearMap.set(schoolYearKey, yearValuesForSchool.length ? yearValuesForSchool : ['']);
        allYears.push(...years);

        for (const year of years) {
          const yearId = String(year.id ?? '').trim();
          if (!yearId) continue;

          const syllabi = await safePost('Tbl_Syllabus_CRUD_Operations', {
            SchoolID: schoolId,
            AcademicYear: yearId,
            Flag: '3'
          });
          const syllabusKey = `SY_S_${schoolId}_Y_${yearId}`;
          const syllabusValuesForKey = syllabi.map((s: any) => `${s.id} - ${s.name ?? ''}`);
          syllabusMap.set(syllabusKey, syllabusValuesForKey.length ? syllabusValuesForKey : ['']);
          allSyllabus.push(...syllabi);

          for (const syllabus of syllabi) {
            const syllabusId = String(syllabus.id ?? '').trim();
            if (!syllabusId) continue;

            const classes = await safePost('Tbl_Class_CRUD_Operations', {
              SchoolID: schoolId,
              AcademicYear: yearId,
              Syllabus: syllabusId,
              Flag: '3'
            });
            const classKey = `CL_S_${schoolId}_Y_${yearId}_SY_${syllabusId}`;
            const classValuesForKey = classes.map((c: any) => `${c.id} - ${c.name ?? ''}`);
            classMap.set(classKey, classValuesForKey.length ? classValuesForKey : ['']);
            allClasses.push(...classes);

            for (const cls of classes) {
              const classId = String(cls.id ?? '').trim();
              if (!classId) continue;

              const divisions = await safePost('Tbl_ClassDivision_CRUD_Operations', {
                SchoolID: schoolId,
                AcademicYear: yearId,
                Class: classId,
                Flag: '11'
              });
              const divisionKey = `DV_S_${schoolId}_Y_${yearId}_SY_${syllabusId}_CL_${classId}`;
              const divisionValuesForKey = divisions.map((d: any) => `${d.id} - ${d.name ?? ''}`);
              divisionMap.set(divisionKey, divisionValuesForKey.length ? divisionValuesForKey : ['']);
              allDivisions.push(...divisions);
            }
          }

          const routes = await safePost('Tbl_Route_CRUD_Operations', {
            SchoolID: schoolId,
            AcademicYear: yearId,
            Flag: '3'
          });
          const routeKey = `RT_S_${schoolId}_Y_${yearId}`;
          const routeValuesForKey = routes
            .map((route: any) => {
              const routeId = this.pickField(route, ['id', 'ID', 'routeID', 'RouteID']);
              const routeName = this.pickField(route, ['name', 'Name', 'routeName', 'RouteName']);
              return routeId ? `${routeId} - ${routeName}` : '';
            })
            .filter(Boolean);
          routeMap.set(routeKey, routeValuesForKey.length ? routeValuesForKey : ['']);
          allRoutes.push(...routes);

          for (const route of routes) {
            const routeId = this.pickField(route, ['id', 'ID', 'routeID', 'RouteID']);
            if (!routeId) continue;

            const stops = await safePost('Tbl_Stops_CRUD_Operations', {
              SchoolID: schoolId,
              AcademicYear: yearId,
              Route: routeId,
              Flag: '3'
            });
            const stopKey = `ST_S_${schoolId}_Y_${yearId}_R_${routeId}`;
            const stopValuesForKey = stops
              .map((stop: any) => {
                const stopId = this.pickField(stop, ['id', 'ID', 'stopID', 'StopID']);
                const stopName = this.pickField(stop, ['stopName', 'StopName', 'name', 'Name']);
                return stopId ? `${stopId} - ${stopName}` : '';
              })
              .filter(Boolean);
            stopMap.set(stopKey, stopValuesForKey.length ? stopValuesForKey : ['']);
            allStops.push(...stops);

            for (const stop of stops) {
              const stopId = this.pickField(stop, ['id', 'ID', 'stopID', 'StopID']);
              if (!stopId) continue;

              const buses = await safePost('Tbl_Fare_CRUD_Operations', {
                SchoolID: schoolId,
                AcademicYear: yearId,
                RouteID: routeId,
                StopID: stopId,
                Flag: '9'
              });
              const busKey = `BS_S_${schoolId}_Y_${yearId}_R_${routeId}_ST_${stopId}`;
              const busValuesForKey: string[] = Array.from(
                new Set<string>(
                  buses
                    .map((bus: any) => {
                      const busId = this.pickField(bus, ['busID', 'BusID', 'id', 'ID']);
                      const busName = this.pickField(bus, ['busName', 'BusName', 'name', 'Name']);
                      return busId ? `${busId} - ${busName}` : '';
                    })
                    .filter((value: string) => !!value)
                )
              );
              busMap.set(busKey, busValuesForKey.length ? busValuesForKey : ['']);
              allBuses.push(...buses);

              for (const bus of buses) {
                const busId = this.pickField(bus, ['busID', 'BusID', 'id', 'ID']);
                if (!busId) continue;

                const fares = await safePost('Tbl_Fare_CRUD_Operations', {
                  SchoolID: schoolId,
                  AcademicYear: yearId,
                  RouteID: routeId,
                  StopID: stopId,
                  BusID: busId,
                  Flag: '10'
                });
                const fareKey = `FR_S_${schoolId}_Y_${yearId}_R_${routeId}_ST_${stopId}_BS_${busId}`;
                const fareValuesForKey: string[] = Array.from(
                  new Set<string>(
                    fares
                      .map((fare: any) => {
                        const fareId = this.pickField(fare, ['id', 'ID']);
                        const amount = this.pickField(fare, ['amount', 'Amount', 'name', 'Name']);
                        return fareId ? `${fareId} - ${amount}` : '';
                      })
                      .filter((value: string) => !!value)
                  )
                );
                fareMap.set(fareKey, fareValuesForKey.length ? fareValuesForKey : ['']);
                allFares.push(...fares);
              }
            }
          }
        }
      }

      const schoolValues = schoolsData.map((x: any) => `${x.id} - ${x.name ?? ''}`);
      const yearValues = Array.from(new Set(allYears.map((x: any) => `${x.id} - ${x.name ?? ''}`)));
      const syllabusValues = Array.from(new Set(allSyllabus.map((x: any) => `${x.id} - ${x.name ?? ''}`)));
      const classValues = Array.from(new Set(allClasses.map((x: any) => `${x.id} - ${x.name ?? ''}`)));
      const divisionValues = Array.from(new Set(allDivisions.map((x: any) => `${x.id} - ${x.name ?? ''}`)));
      const routeValues = Array.from(
        new Set(
          allRoutes
            .map((route: any) => {
              const routeId = this.pickField(route, ['id', 'ID', 'routeID', 'RouteID']);
              const routeName = this.pickField(route, ['name', 'Name', 'routeName', 'RouteName']);
              return routeId ? `${routeId} - ${routeName}` : '';
            })
            .filter(Boolean)
        )
      );
      const stopValues = Array.from(
        new Set(
          allStops
            .map((stop: any) => {
              const stopId = this.pickField(stop, ['id', 'ID', 'stopID', 'StopID']);
              const stopName = this.pickField(stop, ['stopName', 'StopName', 'name', 'Name']);
              return stopId ? `${stopId} - ${stopName}` : '';
            })
            .filter(Boolean)
        )
      );
      const busValues: string[] = Array.from(
        new Set<string>(
          allBuses
            .map((bus: any) => {
              const busId = this.pickField(bus, ['busID', 'BusID', 'id', 'ID']);
              const busName = this.pickField(bus, ['busName', 'BusName', 'name', 'Name']);
              return busId ? `${busId} - ${busName}` : '';
            })
            .filter((value: string) => !!value)
        )
      );
      const fareValues: string[] = Array.from(
        new Set<string>(
          allFares
            .map((fare: any) => {
              const fareId = this.pickField(fare, ['id', 'ID']);
              const amount = this.pickField(fare, ['amount', 'Amount', 'name', 'Name']);
              return fareId ? `${fareId} - ${amount}` : '';
            })
            .filter((value: string) => !!value)
        )
      );

      const mainHeaders = this.getBulkHeaders();
      const sampleRow = this.buildBulkSampleRow(mainHeaders);

      const workbook = new WorkbookCtor();
      const templateSheet = workbook.addWorksheet('AdmissionBulkTemplate');
      const lookupSheet = workbook.addWorksheet('Lookup');

      templateSheet.addRow(mainHeaders);
      templateSheet.addRow(mainHeaders.map((h) => sampleRow[h] ?? ''));
      templateSheet.getRow(1).font = { bold: true };

      mainHeaders.forEach((header, i) => {
        const col = templateSheet.getColumn(i + 1);
        col.width = Math.max(16, header.length + 2);
      });

      const lookupHeaders = ['SchoolID', 'AcademicYear', 'Syllabus', 'Class', 'Division', 'Gender', 'BloodGroup', 'Nationality', 'Religion', 'Country', 'State', 'Route', 'Stop', 'Bus', 'Fare'];
      lookupSheet.addRow(lookupHeaders);

      const maxLookupRows = Math.max(
        schoolValues.length, yearValues.length, syllabusValues.length, classValues.length, divisionValues.length,
        this.GenderGroups.length, this.bloodGroups.length, this.NationalityGroups.length, this.ReligionsGroups.length,
        this.CountryGroups.length, this.StateGroups.length, routeValues.length, stopValues.length, busValues.length, fareValues.length, 1
      );

      for (let i = 0; i < maxLookupRows; i++) {
        lookupSheet.addRow([
          schoolValues[i] ?? '',
          yearValues[i] ?? '',
          syllabusValues[i] ?? '',
          classValues[i] ?? '',
          divisionValues[i] ?? '',
          this.GenderGroups[i] ? `${this.GenderGroups[i].id} - ${this.GenderGroups[i].name}` : '',
          this.bloodGroups[i] ? `${this.bloodGroups[i].id} - ${this.bloodGroups[i].name}` : '',
          this.NationalityGroups[i] ? `${this.NationalityGroups[i].id} - ${this.NationalityGroups[i].name}` : '',
          this.ReligionsGroups[i] ? `${this.ReligionsGroups[i].id} - ${this.ReligionsGroups[i].name}` : '',
          this.CountryGroups[i] ? `${this.CountryGroups[i].id} - ${this.CountryGroups[i].name}` : '',
          this.StateGroups[i] ? `${this.StateGroups[i].id} - ${this.StateGroups[i].name}` : '',
          routeValues[i] ?? '',
          stopValues[i] ?? '',
          busValues[i] ?? '',
          fareValues[i] ?? ''
        ]);
      }

      this.createStaticNamedRanges(workbook, lookupSheet, {
        SchoolID: schoolValues.length,
        Syllabus: syllabusValues.length,
        Class: classValues.length,
        Division: divisionValues.length,
        Gender: this.GenderGroups.length,
        BloodGroup: this.bloodGroups.length,
        Nationality: this.NationalityGroups.length,
        Religion: this.ReligionsGroups.length,
        Country: this.CountryGroups.length,
        State: this.StateGroups.length,
        Route: routeValues.length,
        Stop: stopValues.length,
        Bus: busValues.length,
        Fare: fareValues.length
      });

      this.createDependentNamedRanges(
        workbook,
        lookupSheet,
        yearMap,
        syllabusMap,
        classMap,
        divisionMap,
        routeMap,
        stopMap,
        busMap,
        fareMap
      );

      this.applyExcelDropdownValidations(templateSheet, mainHeaders);
      lookupSheet.state = 'veryHidden';

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Admission_Bulk_Template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Template generation error:', error);
      this.AminityInsStatus = `Unable to generate template with dropdowns. ${error?.message || 'Please try again.'}`;
      this.isModalOpen = true;
    } finally {
      this.loader.hide();
    }
  }

  private getBulkHeaders(): string[] {
    const headers = [
      'AcademicYear', 'AdmissionNo', 'Syllabus', 'Class', 'Division', 'JoinDate',
      'FirstName', 'MiddleName', 'LastName', 'AadharNo', 'MobileNo', 'EmailID', 'DOB',
      'Gender', 'BloodGroup', 'Nationality', 'Religion', 'Caste',
      'FatherName', 'FatherQualification', 'FatherOccupation', 'FatherContact', 'FatherAadhar', 'FatherEmail',
      'MotherName', 'MotherQualification', 'MotherOccupation', 'MotherContact', 'MotherAadhar', 'MotherEmail',
      'PermanentAddressLine1', 'PermanentAddressLine2', 'PermanentPinCode', 'PermanentPlace', 'PermanentCountry',
      'PermanentState', 'PermanentDistrict', 'PermanentCity',
      'TemporaryAddressLine1', 'TemporaryAddressLine2', 'TemporaryPinCode', 'TemporaryPlace', 'TemporaryCountry',
      'TemporaryState', 'TemporaryDistrict', 'TemporaryCity',
      'Route', 'Stop', 'Bus', 'StartDate', 'Fare'
    ];

    if (this.isAdmin) {
      headers.unshift('SchoolID');
    }
    return headers;
  }

  private buildBulkSampleRow(headers: string[]): Record<string, string> {
    const row: Record<string, string> = {
      SchoolID: '',
      AcademicYear: '',
      AdmissionNo: '',
      Syllabus: '',
      Class: '',
      Division: '',
      JoinDate: '2026-04-01',
      FirstName: '',
      MiddleName: '',
      LastName: '',
      AadharNo: '',
      MobileNo: '',
      EmailID: '',
      DOB: '2015-06-10',
      Gender: '',
      BloodGroup: '',
      Nationality: '',
      Religion: '',
      Caste: '',
      FatherName: '',
      FatherQualification: '',
      FatherOccupation: '',
      FatherContact: '',
      FatherAadhar: '',
      FatherEmail: '',
      MotherName: '',
      MotherQualification: '',
      MotherOccupation: '',
      MotherContact: '',
      MotherAadhar: '',
      MotherEmail: '',
      PermanentAddressLine1: '',
      PermanentAddressLine2: '',
      PermanentPinCode: '',
      PermanentPlace: '',
      PermanentCountry: '',
      PermanentState: '',
      PermanentDistrict: '',
      PermanentCity: '',
      TemporaryAddressLine1: '',
      TemporaryAddressLine2: '',
      TemporaryPinCode: '',
      TemporaryPlace: '',
      TemporaryCountry: '',
      TemporaryState: '',
      TemporaryDistrict: '',
      TemporaryCity: '',
      Route: '',
      Stop: '',
      Bus: '',
      StartDate: '',
      Fare: ''
    };
    const filtered: Record<string, string> = {};
    headers.forEach((h) => {
      filtered[h] = row[h] ?? '';
    });
    return filtered;
  }

  private applyExcelDropdownValidations(
    ws: any,
    headers: string[]
  ) {
    const colMap: Record<string, number> = {};
    headers.forEach((h, i) => (colMap[h] = i));

    const dropdownConfig: Record<string, string> = {
      SchoolID: 'LIST_SCHOOLID',
      Gender: 'LIST_GENDER',
      BloodGroup: 'LIST_BLOODGROUP',
      Nationality: 'LIST_NATIONALITY',
      Religion: 'LIST_RELIGION',
      PermanentCountry: 'LIST_COUNTRY',
      TemporaryCountry: 'LIST_COUNTRY',
      PermanentState: 'LIST_STATE',
      TemporaryState: 'LIST_STATE'
    };

    const applyValidation = (cell: any, formula: string) => {
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [formula]
      };
    };

    Object.entries(dropdownConfig).forEach(([header, formula]) => {
      if (colMap[header] === undefined) return;
      const colIndex = colMap[header] + 1;
      for (let row = 2; row <= 500; row++) {
        applyValidation(ws.getCell(row, colIndex), formula);
      }
    });

    const schoolColLetter = colMap['SchoolID'] !== undefined ? ws.getColumn(colMap['SchoolID'] + 1).letter : '';
    const yearColLetter = colMap['AcademicYear'] !== undefined ? ws.getColumn(colMap['AcademicYear'] + 1).letter : '';
    const syllabusColLetter = colMap['Syllabus'] !== undefined ? ws.getColumn(colMap['Syllabus'] + 1).letter : '';
    const classColLetter = colMap['Class'] !== undefined ? ws.getColumn(colMap['Class'] + 1).letter : '';
    const divisionColLetter = colMap['Division'] !== undefined ? ws.getColumn(colMap['Division'] + 1).letter : '';
    const routeColLetter = colMap['Route'] !== undefined ? ws.getColumn(colMap['Route'] + 1).letter : '';
    const stopColLetter = colMap['Stop'] !== undefined ? ws.getColumn(colMap['Stop'] + 1).letter : '';
    const busColLetter = colMap['Bus'] !== undefined ? ws.getColumn(colMap['Bus'] + 1).letter : '';
    const fareColLetter = colMap['Fare'] !== undefined ? ws.getColumn(colMap['Fare'] + 1).letter : '';

    for (let row = 2; row <= 500; row++) {
      const schoolRef = schoolColLetter ? `$${schoolColLetter}${row}` : `"${this.getEffectiveSchoolId()}"`;
      const yearRef = yearColLetter ? `$${yearColLetter}${row}` : '""';
      const syllabusRef = syllabusColLetter ? `$${syllabusColLetter}${row}` : '""';
      const classRef = classColLetter ? `$${classColLetter}${row}` : '""';
      const routeRef = routeColLetter ? `$${routeColLetter}${row}` : '""';
      const stopRef = stopColLetter ? `$${stopColLetter}${row}` : '""';
      const busRef = busColLetter ? `$${busColLetter}${row}` : '""';
      const schoolIdExpr = schoolColLetter
        ? `LEFT(${schoolRef},FIND(" - ",${schoolRef}&" - ")-1)`
        : `"${this.getEffectiveSchoolId()}"`;
      const yearIdExpr = `LEFT(${yearRef},FIND(" - ",${yearRef}&" - ")-1)`;
      const syllabusIdExpr = `LEFT(${syllabusRef},FIND(" - ",${syllabusRef}&" - ")-1)`;
      const classIdExpr = `LEFT(${classRef},FIND(" - ",${classRef}&" - ")-1)`;
      const routeIdExpr = `LEFT(${routeRef},FIND(" - ",${routeRef}&" - ")-1)`;
      const stopIdExpr = `LEFT(${stopRef},FIND(" - ",${stopRef}&" - ")-1)`;
      const busIdExpr = `LEFT(${busRef},FIND(" - ",${busRef}&" - ")-1)`;

      if (yearColLetter) {
        const effectiveSchoolId = this.getEffectiveSchoolId();
        const formula = schoolColLetter
          ? `INDIRECT(IF(${schoolIdExpr}="","AY_S_EMPTY","AY_S_"&${schoolIdExpr}))`
          : (effectiveSchoolId ? `AY_S_${effectiveSchoolId}` : 'LIST_EMPTY');
        applyValidation(ws.getCell(`${yearColLetter}${row}`), formula);
      }

      if (syllabusColLetter) {
        const formula = `INDIRECT(IF(OR(${schoolIdExpr}="",${yearIdExpr}=""),"LIST_EMPTY","SY_S_"&${schoolIdExpr}&"_Y_"&${yearIdExpr}))`;
        applyValidation(ws.getCell(`${syllabusColLetter}${row}`), formula);
      }

      if (classColLetter) {
        const formula = `INDIRECT(IF(OR(${schoolIdExpr}="",${yearIdExpr}="",${syllabusIdExpr}=""),"LIST_EMPTY","CL_S_"&${schoolIdExpr}&"_Y_"&${yearIdExpr}&"_SY_"&${syllabusIdExpr}))`;
        applyValidation(ws.getCell(`${classColLetter}${row}`), formula);
      }

      if (divisionColLetter) {
        const formula = `INDIRECT(IF(OR(${schoolIdExpr}="",${yearIdExpr}="",${syllabusIdExpr}="",${classIdExpr}=""),"LIST_EMPTY","DV_S_"&${schoolIdExpr}&"_Y_"&${yearIdExpr}&"_SY_"&${syllabusIdExpr}&"_CL_"&${classIdExpr}))`;
        applyValidation(ws.getCell(`${divisionColLetter}${row}`), formula);
      }

      if (routeColLetter) {
        const formula = `INDIRECT(IF(OR(${schoolIdExpr}="",${yearIdExpr}=""),"LIST_EMPTY","RT_S_"&${schoolIdExpr}&"_Y_"&${yearIdExpr}))`;
        applyValidation(ws.getCell(`${routeColLetter}${row}`), formula);
      }

      if (stopColLetter) {
        const formula = `INDIRECT(IF(OR(${schoolIdExpr}="",${yearIdExpr}="",${routeIdExpr}=""),"LIST_EMPTY","ST_S_"&${schoolIdExpr}&"_Y_"&${yearIdExpr}&"_R_"&${routeIdExpr}))`;
        applyValidation(ws.getCell(`${stopColLetter}${row}`), formula);
      }

      if (busColLetter) {
        const formula = `INDIRECT(IF(OR(${schoolIdExpr}="",${yearIdExpr}="",${routeIdExpr}="",${stopIdExpr}=""),"LIST_EMPTY","BS_S_"&${schoolIdExpr}&"_Y_"&${yearIdExpr}&"_R_"&${routeIdExpr}&"_ST_"&${stopIdExpr}))`;
        applyValidation(ws.getCell(`${busColLetter}${row}`), formula);
      }

      if (fareColLetter) {
        const formula = `INDIRECT(IF(OR(${schoolIdExpr}="",${yearIdExpr}="",${routeIdExpr}="",${stopIdExpr}="",${busIdExpr}=""),"LIST_EMPTY","FR_S_"&${schoolIdExpr}&"_Y_"&${yearIdExpr}&"_R_"&${routeIdExpr}&"_ST_"&${stopIdExpr}&"_BS_"&${busIdExpr}))`;
        applyValidation(ws.getCell(`${fareColLetter}${row}`), formula);
      }
    }
  }

  private createStaticNamedRanges(
    workbook: any,
    lookupSheet: any,
    listLengths: Record<string, number>
  ) {
    lookupSheet.getCell('AA1').value = '';
    workbook.definedNames.add(`Lookup!$AA$1:$AA$1`, 'LIST_EMPTY');

    const rangeMap: Record<string, { col: string; name: string }> = {
      SchoolID: { col: 'A', name: 'LIST_SCHOOLID' },
      AcademicYear: { col: 'B', name: 'LIST_ACADEMICYEAR' },
      Syllabus: { col: 'C', name: 'LIST_SYLLABUS' },
      Class: { col: 'D', name: 'LIST_CLASS' },
      Division: { col: 'E', name: 'LIST_DIVISION' },
      Gender: { col: 'F', name: 'LIST_GENDER' },
      BloodGroup: { col: 'G', name: 'LIST_BLOODGROUP' },
      Nationality: { col: 'H', name: 'LIST_NATIONALITY' },
      Religion: { col: 'I', name: 'LIST_RELIGION' },
      Country: { col: 'J', name: 'LIST_COUNTRY' },
      State: { col: 'K', name: 'LIST_STATE' },
      Route: { col: 'L', name: 'LIST_ROUTE' },
      Stop: { col: 'M', name: 'LIST_STOP' },
      Bus: { col: 'N', name: 'LIST_BUS' },
      Fare: { col: 'O', name: 'LIST_FARE' }
    };

    Object.entries(rangeMap).forEach(([key, meta]) => {
      const length = listLengths[key] ?? 0;
      const address = length > 0
        ? `Lookup!$${meta.col}$2:$${meta.col}$${length + 1}`
        : `Lookup!$AA$1:$AA$1`;
      workbook.definedNames.add(address, meta.name);
    });
  }

  private createDependentNamedRanges(
    workbook: any,
    lookupSheet: any,
    yearMap: Map<string, string[]>,
    syllabusMap: Map<string, string[]>,
    classMap: Map<string, string[]>,
    divisionMap: Map<string, string[]>,
    routeMap: Map<string, string[]>,
    stopMap: Map<string, string[]>,
    busMap: Map<string, string[]>,
    fareMap: Map<string, string[]>
  ) {
    let startCol = 30; // AD onward; keep low to avoid column overflow
    workbook.definedNames.add(`Lookup!$AA$1:$AA$1`, 'AY_S_');
    workbook.definedNames.add(`Lookup!$AA$1:$AA$1`, 'AY_S_EMPTY');
    workbook.definedNames.add(`Lookup!$AA$1:$AA$1`, 'SY_S_');
    workbook.definedNames.add(`Lookup!$AA$1:$AA$1`, 'CL_S_');
    workbook.definedNames.add(`Lookup!$AA$1:$AA$1`, 'DV_S_');
    workbook.definedNames.add(`Lookup!$AA$1:$AA$1`, 'RT_S_');
    workbook.definedNames.add(`Lookup!$AA$1:$AA$1`, 'ST_S_');
    workbook.definedNames.add(`Lookup!$AA$1:$AA$1`, 'BS_S_');
    workbook.definedNames.add(`Lookup!$AA$1:$AA$1`, 'FR_S_');
    startCol = this.writeNamedRangeBlock(workbook, lookupSheet, yearMap, startCol);
    startCol = this.writeNamedRangeBlock(workbook, lookupSheet, syllabusMap, startCol);
    startCol = this.writeNamedRangeBlock(workbook, lookupSheet, classMap, startCol);
    startCol = this.writeNamedRangeBlock(workbook, lookupSheet, divisionMap, startCol);
    startCol = this.writeNamedRangeBlock(workbook, lookupSheet, routeMap, startCol);
    startCol = this.writeNamedRangeBlock(workbook, lookupSheet, stopMap, startCol);
    startCol = this.writeNamedRangeBlock(workbook, lookupSheet, busMap, startCol);
    this.writeNamedRangeBlock(workbook, lookupSheet, fareMap, startCol);
  }

  private writeNamedRangeBlock(
    workbook: any,
    sheet: any,
    dataMap: Map<string, string[]>,
    startCol: number
  ): number {
    let col = startCol;
    const usedNames = new Set<string>();
    dataMap.forEach((values, key) => {
      if (!values.length) return;
      const uniqValues = Array.from(new Set(values));
      uniqValues.forEach((value, idx) => {
        sheet.getCell(idx + 2, col).value = value;
      });
      const colLetter = sheet.getColumn(col).letter;
      let rangeName = this.sanitizeRangeName(key).slice(0, 220);
      let suffix = 1;
      while (usedNames.has(rangeName)) {
        rangeName = `${this.sanitizeRangeName(key).slice(0, 210)}_${suffix}`;
        suffix++;
      }
      usedNames.add(rangeName);
      workbook.definedNames.add(
        `Lookup!$${colLetter}$2:$${colLetter}$${uniqValues.length + 1}`,
        rangeName
      );
      col++;
    });
    return col + 1;
  }

  private sanitizeRangeName(value: string): string {
    const cleaned = value.replace(/[^A-Za-z0-9_]/g, '_');
    return /^[A-Za-z_]/.test(cleaned) ? cleaned : `N_${cleaned}`;
  }

  private pickField(obj: any, keys: string[]): string {
    for (const key of keys) {
      const val = obj?.[key];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
    return '';
  }

  private getEffectiveSchoolId(): string {
    return (
      this.AdminselectedSchoolID ||
      sessionStorage.getItem('SchoolID') ||
      localStorage.getItem('SchoolID') ||
      ''
    ).toString().trim();
  }

  onBulkFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.bulkUploadStatus = '';
    this.bulkUploadRows = [];
    this.bulkUploadFileName = file.name;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' }) as any[];

      if (!rows.length) {
        this.bulkUploadStatus = 'Uploaded file is empty.';
        return;
      }

      this.bulkUploadRows = rows.map((row) => this.normalizeBulkRow(row));
      const requiredColumns = [...this.requiredBulkColumnsCommon];
      if (this.isAdmin) requiredColumns.unshift('SchoolID');

      const missingColumns = requiredColumns.filter(
        (col) => !(col in this.bulkUploadRows[0])
      );

      if (missingColumns.length) {
        this.bulkUploadRows = [];
        this.bulkUploadStatus = `Missing required columns: ${missingColumns.join(', ')}`;
        return;
      }

      this.bulkUploadStatus = `${this.bulkUploadRows.length} records loaded. Click "Start Bulk Upload".`;
      this.cd.detectChanges();
    };
    reader.readAsArrayBuffer(file);
  }

  private normalizeBulkRow(row: any): any {
    const normalized: any = {};
    Object.keys(row).forEach((key) => {
      const cleanKey = String(key).trim();
      normalized[cleanKey] = row[key];
    });
    return normalized;
  }

  private toDateValue(value: any): string | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return null;
      const dt = new Date(parsed.y, parsed.m - 1, parsed.d);
      return dt.toISOString().slice(0, 10);
    }
    const strVal = String(value).trim();
    if (!strVal) return null;
    const date = new Date(strVal);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  async startBulkUpload() {
    if (!this.bulkUploadRows.length) {
      this.bulkUploadStatus = 'Please upload a file first.';
      return;
    }

    this.isBulkUploading = true;
    this.loader.show();
    let successCount = 0;
    const failedRows: string[] = [];

    for (let i = 0; i < this.bulkUploadRows.length; i++) {
      const row = this.bulkUploadRows[i];

      try {
        const studentPayload: any = {
          SchoolID: this.isAdmin ? this.parseLookupId(row.SchoolID) : '',
          AcademicYear: this.parseLookupId(row.AcademicYear),
          AdmissionNo: String(row.AdmissionNo ?? '').trim(),
          Syllabus: this.parseLookupId(row.Syllabus) || null,
          Class: this.parseLookupId(row.Class),
          Division: this.parseLookupId(row.Division),
          JoinDate: this.toDateValue(row.JoinDate),
          FirstName: String(row.FirstName ?? '').trim(),
          MiddleName: String(row.MiddleName ?? '').trim() || null,
          LastName: String(row.LastName ?? '').trim() || null,
          AadharNo: String(row.AadharNo ?? '').trim(),
          MobileNo: String(row.MobileNo ?? '').trim(),
          EmailID: String(row.EmailID ?? '').trim(),
          DOB: this.toDateValue(row.DOB),
          Gender: this.parseLookupId(row.Gender),
          BloodGroup: this.parseLookupId(row.BloodGroup) || null,
          Nationality: this.parseLookupId(row.Nationality),
          Religion: this.parseLookupId(row.Religion),
          Caste: String(row.Caste ?? '').trim() || null,
          IsActive: '1',
          Flag: '1'
        };

        await firstValueFrom(this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', studentPayload));

        const parentPayload: any = {
          AdmissionID: studentPayload.AdmissionNo,
          FatherName: String(row.FatherName ?? '').trim(),
          FatherQualification: String(row.FatherQualification ?? '').trim() || null,
          FatherOccupation: String(row.FatherOccupation ?? '').trim() || null,
          FatherContact: String(row.FatherContact ?? '').trim(),
          FatherAadhar: String(row.FatherAadhar ?? '').trim(),
          FatherEmail: String(row.FatherEmail ?? '').trim(),
          MotherName: String(row.MotherName ?? '').trim(),
          MotherQualification: String(row.MotherQualification ?? '').trim() || null,
          MotherOccupation: String(row.MotherOccupation ?? '').trim() || null,
          MotherContact: String(row.MotherContact ?? '').trim(),
          MotherAadhar: String(row.MotherAadhar ?? '').trim(),
          MotherEmail: String(row.MotherEmail ?? '').trim(),
          IsActive: '1',
          Flag: '5'
        };
        await firstValueFrom(this.apiurl.post<any>('Tbl_StudentParentDetails_CRUD_Operations', parentPayload));

        const addressPayload: any = {
          AdmissionID: studentPayload.AdmissionNo,
          PermanentAddressLine1: String(row.PermanentAddressLine1 ?? '').trim(),
          PermanentAddressLine2: String(row.PermanentAddressLine2 ?? '').trim() || null,
          PermanentPinCode: String(row.PermanentPinCode ?? '').trim(),
          PermanentPlace: String(row.PermanentPlace ?? '').trim() || null,
          PermanentCountry: this.parseLookupId(row.PermanentCountry),
          PermanentState: this.parseLookupId(row.PermanentState),
          PermanentDistrict: String(row.PermanentDistrict ?? '').trim() || null,
          PermanentCity: String(row.PermanentCity ?? '').trim() || null,
          TemporaryAddressLine1: String(row.TemporaryAddressLine1 ?? '').trim() || null,
          TemporaryAddressLine2: String(row.TemporaryAddressLine2 ?? '').trim() || null,
          TemporaryPinCode: String(row.TemporaryPinCode ?? '').trim() || null,
          TemporaryPlace: String(row.TemporaryPlace ?? '').trim() || null,
          TemporaryCountry: this.parseLookupId(row.TemporaryCountry) || null,
          TemporaryState: this.parseLookupId(row.TemporaryState) || null,
          TemporaryDistrict: String(row.TemporaryDistrict ?? '').trim() || null,
          TemporaryCity: String(row.TemporaryCity ?? '').trim() || null,
          IsActive: '1',
          Flag: '5'
        };
        await firstValueFrom(this.apiurl.post<any>('Tbl_StudentAddressDetails_CRUD_Operations', addressPayload));

        const route = this.parseLookupId(row.Route);
        const stop = this.parseLookupId(row.Stop);
        const bus = this.parseLookupId(row.Bus);
        const fare = this.parseLookupId(row.Fare);
        const startDate = this.toDateValue(row.StartDate);

        if (route && stop && bus && fare && startDate) {
          const transportPayload: any = {
            AdmissionID: studentPayload.AdmissionNo,
            Route: route,
            Stop: stop,
            Bus: bus,
            Fare: fare,
            StartDate: startDate,
            IsActive: '1',
            Flag: '5'
          };
          await firstValueFrom(this.apiurl.post<any>('Tbl_StudentTransportationDetails_CRUD_Operations', transportPayload));
        }

        await this.createBulkUsers(studentPayload, parentPayload);
        successCount++;
      } catch (error: any) {
        failedRows.push(`Row ${i + 2}: ${error?.error?.message || error?.error?.Message || 'Failed to upload row'}`);
      }
    }

    this.loader.hide();
    this.isBulkUploading = false;
    this.bulkUploadStatus = `Bulk upload completed. Success: ${successCount}, Failed: ${failedRows.length}.`;
    if (failedRows.length) {
      this.AminityInsStatus = failedRows.slice(0, 10).join('\n');
      this.isModalOpen = true;
    }
    this.FetchInitialData();
  }

  private async createBulkUsers(student: any, parent: any) {
    const studentUserForm = new FormData();
    studentUserForm.append('SchoolID', student.SchoolID ?? '');
    studentUserForm.append('FirstName', student.FirstName ?? '');
    studentUserForm.append('LastName', student.LastName ?? '');
    studentUserForm.append('MobileNo', student.MobileNo ?? '');
    studentUserForm.append('Email', student.EmailID ?? '');
    studentUserForm.append('RollId', '8');
    studentUserForm.append('Password', 'Welcome@2025');
    studentUserForm.append('IsActive', '1');
    studentUserForm.append('Flag', '1');

    const parentUserForm = new FormData();
    parentUserForm.append('SchoolID', student.SchoolID ?? '');
    parentUserForm.append('FirstName', parent.FatherName ?? '');
    parentUserForm.append('MobileNo', parent.FatherContact ?? '');
    parentUserForm.append('Email', parent.FatherEmail ?? '');
    parentUserForm.append('RollId', '7');
    parentUserForm.append('Password', 'Welcome@2025');
    parentUserForm.append('IsActive', '1');
    parentUserForm.append('Flag', '1');

    try {
      await firstValueFrom(this.apiurl.post<any>('Tbl_Users_CRUD_Operations', studentUserForm));
    } catch {
      // ignore user creation errors to avoid rolling back admission flow
    }

    try {
      await firstValueFrom(this.apiurl.post<any>('Tbl_Users_CRUD_Operations', parentUserForm));
    } catch {
      // ignore user creation errors to avoid rolling back admission flow
    }
  }

  private parseLookupId(value: any): string {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const splitIndex = raw.indexOf(' - ');
    return splitIndex > -1 ? raw.slice(0, splitIndex).trim() : raw;
  }
}
