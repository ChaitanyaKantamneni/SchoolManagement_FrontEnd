import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
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
  selector: 'app-staff',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.css'
})
/**
 * Class Responsibility: Handles view logic and user interactions for StaffComponent.
 */
export class StaffComponent extends BasePermissionComponent {
  pageName = 'Staff';

  constructor(
    private http: HttpClient,
    router: Router,
    public loader: LoaderService,
    private apiurl: ApiServiceService,
    menuService: MenuServiceService,
    private cdr: ChangeDetectorRef
  ) {
    super(menuService, router);
  }

  /**
   * Lifecycle hook: Initializes component parameters and loads default page datasets.
   */
  ngOnInit(): void {
    this.checkViewPermission();
    this.SchoolSelectionChange=false;
    this.FetchRoleList();
    this.FetchSchoolsList();
     this.FetchOnlyClassList();
    this.FetchInitialData();
  };

  IsAddNewClicked:boolean=false;
  IsActiveStatus:boolean=false;
  ViewStaffClicked:boolean=false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;
  StaffList: any[] =[];
  DefaultstaffList: any[] =[];
  StaffCount: number = 0;
  SubjectsActiveCount: number = 0;
  SubjectsInActiveCount: number = 0;
  StaffTypeList:any[]=[];
  StaffTypeListBySchoolId:any[]=[];
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
  selectedAcademicYearID: string = '';
  selectedClassID: string = '';
  SchoolSelectionChange:boolean=false;
  SchoolAcademicYearChange:boolean=false;
  SchoolClassChange:boolean=false;
  academicYearList:any[] = [];
  AdminselectedSchoolID:string = '';
  AdminselectedAcademivYearID:string = '';
  AdminSelectedActiveAcademicYearID:string = sessionStorage.getItem('ActiveAcademicYearID') || '';

  StaffForm: any = new FormGroup({
    ID: new FormControl(),
    StaffType: new FormControl([], Validators.required),
    FirstName: new FormControl('',[Validators.required,Validators.pattern('^[a-zA-Z ]+$')]),
    MiddleName:new FormControl('',[Validators.pattern('^[a-zA-Z ]+$')]),
    LastName: new FormControl('',[Validators.pattern('^[a-zA-Z ]+$')]),
    MobileNumber: new FormControl('', [Validators.required,Validators.pattern(/^[0-9]{10}$/)]),
    Email: new FormControl('', [Validators.required,Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]),
    DateOfBirth:new FormControl('', Validators.required),
    Qualification: new FormControl('', Validators.required),
    School:new FormControl(),
    AcademicYear: new FormControl(0,[Validators.required,Validators.min(1)])
  });

  /**
   * Executes the operation: allowAlphaAndSpecial
   * Parameters: event: KeyboardEvent
   * Rationale: Standard operational controller for the active view.
   */
  allowAlphaAndSpecial(event: KeyboardEvent) {
    const allowedRegex = /^[a-zA-Z ]+$/;
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

    const requestData = { SchoolID:schoolId,Flag: '2' };

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

  get currentSchoolId(): string {
    // If SuperAdmin, use form selection
    if (this.isAdmin) {
      const formVal = this.StaffForm.get('School')?.value;
      if (formVal && formVal !== '0' && formVal !== 0) return formVal;
    }
    // Otherwise, use session
    return sessionStorage.getItem('SchoolID') || sessionStorage.getItem('schoolId') || localStorage.getItem('SchoolID') || '';
  }

  /**
   * Executes the operation: FetchAcademicYearCount
   * Parameters: isSearch: boolean
   * Rationale: Standard operational controller for the active view.
   */
  FetchAcademicYearCount(isSearch: boolean) {
    let SchoolIdSelected = '';
    let AcademicYearIdSelected='';
    let ClassSelected='';


    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    if(this.SchoolAcademicYearChange){
      AcademicYearIdSelected=this.selectedAcademicYearID.trim();
    }

    if(this.SchoolClassChange){
      ClassSelected=this.selectedClassID.trim();
    }

    const payload: any = {
      Flag: isSearch ? '8' : '6',
      SchoolID: SchoolIdSelected,
      Class:ClassSelected,
      Name: isSearch ? this.searchQuery.trim() : null
    };

    if (!this.isAdmin) {
      payload.AcademicYear = this.AdminSelectedActiveAcademicYearID;
    }
    else if(this.isAdmin && this.SchoolAcademicYearChange){
      payload.AcademicYear = AcademicYearIdSelected;
    }

    return this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', payload);
  }

  /**
   * Executes the operation: FetchInitialData
   * Parameters: extra: any = {}
   * Rationale: Standard operational controller for the active view.
   */
  FetchInitialData(extra: any = {}) {
    const isSearch = !!this.searchQuery?.trim();
    const flag = isSearch ? '7' : '2';

    let SchoolIdSelected = '';
    let AcademicYearIdSelected='';
    let ClassSelected='';

    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    if(this.SchoolAcademicYearChange){
      AcademicYearIdSelected=this.selectedAcademicYearID.trim();
    }

    if(this.SchoolClassChange){
      ClassSelected=this.selectedClassID.trim();
    }

    const cursor =
      !extra.offset && this.currentPage > 1
        ? this.pageCursors[this.currentPage - 2] || null
        : null;

    this.loader.show();

    this.FetchAcademicYearCount(isSearch).subscribe({
      next: (countResp: any) => {
        this.StaffCount = countResp?.data?.[0]?.totalCount ?? 0;
        this.SubjectsActiveCount=countResp?.data?.[0]?.activeCount ?? 0;
        this.SubjectsInActiveCount=countResp?.data?.[0]?.inactiveCount ?? 0;

        const payload: any = {
          Flag: flag,
          Limit: this.pageSize,
          SortColumn: this.sortColumn,
          SortDirection: this.sortDirection,
          LastCreatedDate: cursor?.lastCreatedDate ?? null,
          LastID: cursor?.lastID ?? null,
          ID:ClassSelected,
          SchoolID:SchoolIdSelected,
          ...extra
        };

         if (!this.isAdmin) {
          payload.AcademicYear = this.AdminSelectedActiveAcademicYearID;
        }
        else if(this.isAdmin && this.SchoolAcademicYearChange){
          payload.AcademicYear = AcademicYearIdSelected;
        }

        if (isSearch) payload.Name = this.searchQuery.trim();

        this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', payload).subscribe({
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
            this.StaffList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.StaffList = [];
        this.StaffCount = 0;
        this.loader.hide();
      }
    });
  };

  /**
   * Executes the operation: mapAcademicYears
   * Parameters: response: any
   * Rationale: Standard operational controller for the active view.
   */
  mapAcademicYears(response: any) {
    this.StaffList = (response.data || []).map((item: any) => {

      const staffTypeArray = item.staffType
        ? item.staffType.split(',').map((id: string) => id.trim())
        : [];

      return {
        ID: item.id,
        StaffType: staffTypeArray,

        // Full name (same logic as backend CONCAT)
        Name: [
          item.firstName,
          item.middleName,
          item.lastName
        ].filter(Boolean).join(' '),

        FirstName: item.firstName,
        MiddleName: item.middleName,
        LastName: item.lastName,

        MobileNumber: item.mobileNumber,
        Email: item.email,
        DateOfBirth: item.dateOfBirth,
        Qualification: item.qualification,
        Schoolname:item.schoolName,
        AcademicYearName:item.academicYearName,

        IsActive: item.isActive === '1' || item.isActive === true
          ? 'Active'
          : 'Inactive'
      };
    });
  }


  /**
   * Executes the operation: AddNewClicked
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  AddNewClicked(){
    this.StaffForm.reset();
    if (this.isAdmin) {
      this.StaffForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
      this.StaffForm.get('School')?.patchValue('0');
      this.StaffForm.get('AcademicYear')?.patchValue('0');
    } else {
      this.StaffForm.get('School')?.clearValidators();
      this.StaffForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
    if(this.AdminselectedSchoolID==''){
      this.FetchAcademicYearsList();
      this.FetchRoleListBySchoolID();
      if(!this.isAdmin){
        this.StaffForm.get('AcademicYear').patchValue(this.AdminSelectedActiveAcademicYearID);
        this.FetchOnlyClassList();
      } 
    }
    this.selectedCategories = [];    
    this.dropdownOpen = false;
    // this.cdr.detectChanges();
    
    
    this.StaffForm.get('StaffType')?.setValue([]);
    this.selectedSchoolID="";
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewStaffClicked=false;
  };

  /**
   * Executes the operation: SubmitStaff
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  SubmitStaff(){
    if(this.StaffForm.invalid){
      this.StaffForm.markAllAsTouched();
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        SchoolID: this.currentSchoolId,
        AcademicYear:this.StaffForm.get('AcademicYear')?.value,
        StaffType: this.StaffForm.get('StaffType')?.value.join(','),
        FirstName: this.StaffForm.get('FirstName')?.value,
        MiddleName: this.StaffForm.get('MiddleName')?.value,
        LastName: this.StaffForm.get('LastName')?.value,
        MobileNumber: this.StaffForm.get('MobileNumber')?.value,
        Email: this.StaffForm.get('Email')?.value,
        DateOfBirth: this.StaffForm.get('DateOfBirth')?.value,
        Qualification: this.StaffForm.get('Qualification')?.value,
        IsActive:IsActiveStatusNumeric,
        Flag: '1'
      };

      this.apiurl.post("Tbl_Staff_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.SubmitUser();
            this.IsAddNewClicked=!this.IsAddNewClicked;
            // this.AminityInsStatus = response.status;
            this.isModalOpen = true;
            this.AminityInsStatus = "Staff Details Submitted!";
            this.currentPage=1;
            this.StaffForm.reset();
            this.StaffForm.markAsPristine();
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

    this.apiurl.post<any>("Tbl_Staff_CRUD_Operations", data).subscribe(
      (response: any) => {

        const item = response?.data?.[0];
        if (!item) {
          this.StaffForm.reset();
          this.viewSyllabus = null;
          return;
        }

        const isActive = item.isActive === '1';
        const staffTypeArray = item.staffType ? item.staffType.split(',').map((id: string) => id.trim()) : [];
        this.selectedCategories = item.staffType ? item.staffType.split(',').map((id: string) => id.trim()) : [];

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewSyllabus = {
            ID: item.id,
            StaffType: staffTypeArray,
            Name: item.firstName + ' ' + item.middleName + ' ' + item.lastName,
            FirstName: item.firstName,
            MiddleName: item.middleName,
            LastName: item.lastName,
            MobileNumber: item.mobileNumber,
            Email: item.email,
            DateOfBirth: this.formatDateDDMMYYYY(item.dateOfBirth),
            Qualification: item.qualification,
            SchoolName: item.schoolName,
            AcademicYearName: item.academicYearName,
            IsActive: isActive
          };
          this.isViewModalOpen = true;
        }

        if (mode === 'edit') {
          this.isViewMode = false;
          this.StaffForm.patchValue({
            ID: item.id,
            StaffType: this.selectedCategories,
            FirstName: item.firstName,
            MiddleName: item.middleName,
            LastName: item.lastName,
            MobileNumber: item.mobileNumber,
            Email: item.email,
            DateOfBirth: this.formatDateYYYYMMDD(item.dateOfBirth),
            Qualification: item.qualification,
            School:item.schoolID,
            AcademicYear:item.academicYear
          });
          this.AdminselectedSchoolID=item.schoolID;
          this.AdminselectedAcademivYearID=item.academicYear;
          this.FetchAcademicYearsList();
          this.FetchRoleListBySchoolID();
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
   * Executes the operation: UpdateStaff
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  UpdateStaff(){
    if(this.StaffForm.invalid){
      this.StaffForm.markAllAsTouched();
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        ID:this.StaffForm.get('ID')?.value,
        SchoolID: this.currentSchoolId,
        AcademicYear:this.StaffForm.get('AcademicYear')?.value,
        StaffType: this.StaffForm.get('StaffType')?.value.join(','),
        FirstName: this.StaffForm.get('FirstName')?.value,
        MiddleName: this.StaffForm.get('MiddleName')?.value,
        LastName: this.StaffForm.get('LastName')?.value,
        MobileNumber: this.StaffForm.get('MobileNumber')?.value,
        Email: this.StaffForm.get('Email')?.value,
        DateOfBirth: this.StaffForm.get('DateOfBirth')?.value,
        Qualification: this.StaffForm.get('Qualification')?.value,
        IsActive:IsActiveStatusNumeric,
        Flag: '5'
      };

      console.log('data',data);
      this.apiurl.post("Tbl_Staff_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.UpdateUser();
            this.IsAddNewClicked=!this.IsAddNewClicked;
            // this.AminityInsStatus = response.status;
            this.isModalOpen = true;
            this.AminityInsStatus = "Staff Details Updated!";
            this.currentPage=1;
            this.StaffForm.reset();
            this.StaffForm.markAsPristine();
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
    return Math.ceil(this.StaffCount / this.pageSize);
  };

  /**
   * Executes the operation: getVisiblePageNumbers
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  getVisiblePageNumbers() {
    const totalPages = this.totalPages();
    const pages = [];
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount/2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, totalPages);
    if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
    for (let i=start; i<=end; i++) pages.push(i);
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

  /**
   * Executes the operation: formatDateYYYYMMDD
   * Parameters: dateStr: string | null
   * Rationale: Standard operational controller for the active view.
   */
  formatDateYYYYMMDD(dateStr: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
  };

  /**
   * Executes the operation: formatDateDDMMYYYY
   * Parameters: dateStr: string | null
   * Rationale: Standard operational controller for the active view.
   */
  formatDateDDMMYYYY(dateStr: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
  };

  /**
   * Executes the operation: closeModal
   * Parameters: type: 'view' | 'status'
   * Rationale: Standard operational controller for the active view.
   */
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
    this.editclicked=true;
    this.FetchSyllabusDetByID(SyllabusID,'edit');
    this.ViewStaffClicked=true;
  };

  /**
   * Executes the operation: toggleChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  toggleChange(){
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
    if(schoolID=="0"){
      this.selectedSchoolID="";
    }else{
      this.selectedSchoolID = schoolID;
    }    
    this.SchoolSelectionChange = true;
    this.FetchAcademicYearsList();
    this.FetchInitialData();
  };

  /**
   * Executes the operation: onAcademicYearChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAcademicYearChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if(schoolID=="0"){
      this.selectedAcademicYearID="";
    }else{
      this.selectedAcademicYearID = schoolID;
    }    
    this.SchoolAcademicYearChange = true;
   this.FetchOnlyClassList();
    this.FetchInitialData();
  };

  /**
   * Executes the operation: FetchOnlyClassList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchOnlyClassList() {
    const AcademicYearIdSelected =
    this.SchoolAcademicYearChange
      ? this.selectedAcademicYearID?.trim()
      : this.AdminSelectedActiveAcademicYearID || '';

    const requestData = { 
      SchoolID:this.AdminselectedSchoolID,
      AcademicYear:AcademicYearIdSelected,
      Flag: '2' };

    this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.DefaultstaffList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: [
                  item.firstName,
                  item.middleName,
                  item.lastName
                ].filter(Boolean).join(' ')
              };
            });
          } else {
            this.DefaultstaffList = [];
          }
        },
        (error) => {
          this.DefaultstaffList = [];
        }
      );
  };

  /**
   * Executes the operation: onClassSelectionChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onClassSelectionChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if(schoolID=="0"){
      this.selectedClassID="";
    }else{
      this.selectedClassID = schoolID;
    }    
    this.SchoolClassChange = true;
    this.FetchInitialData();
  };

  /**
   * Executes the operation: exportToExcel
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: viewReview
   * Parameters: SyllabusID: string
   * Rationale: Standard operational controller for the active view.
   */
  viewReview(SyllabusID: string): void {
    this.FetchSyllabusDetByID(SyllabusID,'view');
    this.isViewModalOpen=true;
  };

  /**
   * Executes the operation: getSyllabusName
   * Parameters: staffType: string | string[]
   * Rationale: Standard operational controller for the active view.
   */
  getSyllabusName(staffType: string | string[]): string {
    console.log('staffType:', staffType); // Debugging line

    // If it's a single staff type ID
    if (typeof staffType === 'string') {
      console.log('Looking for ID:', staffType); // Debugging line
      const syllabus = this.StaffTypeList.find(s => s.ID === staffType);
      console.log('Found syllabus:', syllabus); // Debugging line
      return syllabus?.Name ?? 'N/A';
    }

    // If it's an array of staff type IDs
    if (Array.isArray(staffType)) {
      const names = staffType
        .map(id => {
          console.log('Looking for ID:', id); // Debugging line
          const syllabus = this.StaffTypeList.find(s => s.ID === id);
          console.log('Found syllabus:', syllabus); // Debugging line
          return syllabus?.Name;
        })
        .filter(name => name != null);

      return names.join(', ') || 'N/A';
    }

    return 'N/A';
  };

  selectedCategories: string[] = []; // s
  dropdownOpen: boolean = false;

  /**
   * Executes the operation: toggleSelection
   * Parameters: value: string
   * Rationale: Standard operational controller for the active view.
   */
  toggleSelection(value: string) {
    const index = this.selectedCategories.indexOf(value);
    if (index > -1) {
      this.selectedCategories.splice(index, 1); // remove if already selected
    } else {
      this.selectedCategories.push(value); // add if not selected
    }

    this.StaffForm.get('StaffType')?.setValue(this.selectedCategories);
  };

  /**
   * Executes the operation: closeDropdown
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  closeDropdown(){
    this.dropdownOpen = false;
  };

  /**
   * Executes the operation: FetchRoleList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchRoleList() {
    const requestData = { 
      Flag: '2' };
    this.apiurl.post<any>('Tbl_Roles_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.StaffTypeList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.roleName,
                IsActive: isActiveString
              };
            });
          } else {
            this.StaffTypeList = [];
          }
        },
        (error) => {
          this.StaffTypeList = [];
        }
      );
  };

  /**
   * Executes the operation: FetchRoleListBySchoolID
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchRoleListBySchoolID() {
    const requestData = { 
      Flag: '2' };
    this.apiurl.post<any>('Tbl_Roles_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            let roles = response.data;

            if (!this.isAdmin) {
              roles = roles.filter((item: any) => item.id != "1" && item.id != "10");
            }
            else {
              roles = roles.filter((item: any) => item.id != "10");
            }

            this.StaffTypeListBySchoolId = roles.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.roleName,
                IsActive: isActiveString
              };
            });
          } else {
            this.StaffTypeListBySchoolId = [];
          }
        },
        (error) => {
          this.StaffTypeListBySchoolId = [];
        }
      );
  };

  /**
   * Executes the operation: SubmitUser
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  SubmitUser(){
    const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
    const formData = new FormData();
    formData.append('SchoolID', this.currentSchoolId);
    formData.append('FirstName', this.StaffForm.get('FirstName')?.value ?? '');
    formData.append('LastName', this.StaffForm.get('LastName')?.value ?? '');
    formData.append('MobileNo', this.StaffForm.get('MobileNumber')?.value ?? '');
    formData.append('Email', this.StaffForm.get('Email')?.value ?? '');
    formData.append('RollId', this.StaffForm.get('StaffType')?.value.join(','));
    formData.append('Password', 'Welcome@2025');
    formData.append('IsActive', IsActiveStatusNumeric);
    formData.append('Flag', '1');

      this.apiurl.post("Tbl_Users_CRUD_Operations", formData).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.StaffForm.reset();
            this.StaffForm.markAsPristine();
          }
        },
        error: (error: any) => {
          if (error.status === 409) {
            this.AminityInsStatus = error.error?.Message || "Staff already exists";
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
  };

  /**
   * Executes the operation: UpdateUser
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  UpdateUser(){
    const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
    const formData = new FormData();
    formData.append('SchoolID', this.currentSchoolId);
    formData.append('FirstName', this.StaffForm.get('FirstName')?.value ?? '');
    formData.append('LastName', this.StaffForm.get('LastName')?.value ?? '');
    formData.append('MobileNo', this.StaffForm.get('MobileNumber')?.value ?? '');
    formData.append('Email', this.StaffForm.get('Email')?.value ?? '');
    formData.append('RollId', this.StaffForm.get('StaffType')?.value.join(','));
    formData.append('Password', 'Welcome@2025');
    formData.append('IsActive', IsActiveStatusNumeric);
    formData.append('Flag', '7');

      this.apiurl.post("Tbl_Users_CRUD_Operations", formData).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.StaffForm.reset();
            this.StaffForm.markAsPristine();
          }
        },
        error: (error: any) => {
          if (error.status === 409) {
            this.AminityInsStatus = error.error?.Message || "Staff already exists";
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
  };

  /**
   * Executes the operation: onAdminSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminSchoolChange(event: Event) {
    this.StaffTypeListBySchoolId=[];
    this.selectedCategories=[];
    this.StaffForm.get('StaffType')?.setValue([]);
    this.academicYearList=[];
    this.StaffForm.get('AcademicYear').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if(schoolID=="0"){
      this.AdminselectedSchoolID="";
    }else{
      this.AdminselectedSchoolID = schoolID;
    }   
    this.FetchAcademicYearsList();
    this.FetchRoleListBySchoolID();
  };

  /**
   * Executes the operation: onAdminAcademicYearChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminAcademicYearChange(event: Event) {
    this.StaffTypeListBySchoolId=[];
    this.selectedCategories=[];
    this.StaffForm.get('StaffType')?.setValue([]);
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if(schoolID=="0"){
      this.AdminselectedAcademivYearID="";
    }else{
      this.AdminselectedAcademivYearID = schoolID;
    }    
    this.FetchRoleList();
  };  

  /**
   * Executes the operation: pageStartIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageStartIndex(): number {
    return this.StaffCount === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
  }

  /**
   * Executes the operation: pageEndIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.StaffCount);
  }

  /**
   * Executes the operation: CancelSyllabus
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  CancelSyllabus(){
    this.IsAddNewClicked=false;
    this.AdminselectedSchoolID = '';
    this.AdminselectedAcademivYearID = '';
    this.StaffForm.reset();
    this.FetchInitialData();
  }

  /**
   * Executes the operation: onRowsCountChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  onRowsCountChange() {
    this.currentPage = 1;
    this.FetchInitialData();
  }

  @ViewChild('dropdownContainer')
  dropdownContainer!: ElementRef;

  /**
   * Executes the operation: toggleDropdown
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  /**
   * Executes the operation: clickOutside
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  clickOutside(event: Event) {

    if (
      this.dropdownContainer &&
      !this.dropdownContainer.nativeElement.contains(event.target)
    ) {
      this.dropdownOpen = false;
    }
  }
}
