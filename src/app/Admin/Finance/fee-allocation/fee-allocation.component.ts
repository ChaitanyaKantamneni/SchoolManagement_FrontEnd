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
  selector: 'app-fee-allocation',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule], 
   templateUrl: './fee-allocation.component.html',
  styleUrl: './fee-allocation.component.css'
})
/**
 * Class Responsibility: Handles view logic and user interactions for FeeAllocationComponent.
 */
export class FeeAllocationComponent extends BasePermissionComponent{
  pageName = 'Fee Allocation';

  constructor(
    private http: HttpClient,
    router: Router,
    public loader: LoaderService,
    private apiurl: ApiServiceService,
    menuService: MenuServiceService
  ) {
    super(menuService, router);
  }

  /**
   * Lifecycle hook: Initializes component parameters and loads default page datasets.
   */
  ngOnInit(): void {
    this.checkViewPermission();
    this.SchoolSelectionChange=false;
    this.SyllabusList=[];
    this.AdminSelectedActiveAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';
    this.FetchSchoolsList();
    this.FetchAcademicYearsList();
    this.FetchInitialData();
    if(!this.isAdmin){
      this.FetchFeeCategoryList();
    }
  };

  IsAddNewClicked:boolean=false;
  IsActiveStatus:boolean=false;
  ViewClassClicked:boolean=false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;
  ClassList: any[] =[];
  ClassCount: number = 0;
  SubjectsActiveCount: number = 0;
  SubjectsInActiveCount: number = 0;
  SyllabusList: any[] =[];
  feeCategoryList: any[] = [];
  FeeAllocationList: any[] = [];

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
  
  sortColumn: string = 'FeeAllocation'; 
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
  FineCollectionTypePercentage:boolean=false;

  ClassForm: any = new FormGroup({
    ID: new FormControl(),
    SchoolID: new FormControl(),
    Syllabus: new FormControl('',[Validators.required,Validators.min(1)]),
    Class: new FormControl('',[Validators.required,Validators.min(1)]),
    Divisions: new FormControl([],Validators.required),
    FeeCategory: new FormControl('',[Validators.required,Validators.min(1)]),
    Amount: new FormControl('',Validators.required),
    StartDate: new FormControl('',Validators.required),
    EndDate:new FormControl('', Validators.required),
   
    School: new FormControl(),
    AcademicYear: new FormControl(0,[Validators.required,Validators.min(1)])
  });

    categories:any[] = [];

    feecategories:any[] = [];

    selectedCategories: string[] = [];
    dropdownOpen: boolean = false;


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
    const requestData = { 
      Flag: '2'
     };

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

    const requestData = { 
      SchoolID:schoolId,
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

  /**
   * Executes the operation: FetchFeeCategoryList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchFeeCategoryList() {
    const AcademicYearIdSelected =
      this.isAdmin
        ? (
            this.SchoolAcademicYearChange
              ? this.selectedAcademicYearID?.trim()
              : this.AdminselectedAcademivYearID?.trim()
          )
        : this.AdminSelectedActiveAcademicYearID || '';

    const requestData = {
      SchoolID: this.AdminselectedSchoolID,
      AcademicYear: AcademicYearIdSelected,
      Flag: '3'
    };
    console.log("Request:", requestData);

    this.apiurl.post<any>('Tbl_FeeCategory_CRUD_Operations', requestData)
        .subscribe(
          (response: any) => {
            if (response && Array.isArray(response.data)) {
              this.feecategories = response.data.map((item: any) => {
                const isActiveString = item.isActive === "1" ? "Active" : "InActive";
                return {
                  ID: item.id,
                  Name: item.feeCategoryName,
                  IsActive: isActiveString
                };
              });            
            } else {
              this.feecategories = [];
            }
          },
          (error) => {
            this.feecategories = [];
          }
        );
  };

  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
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
      FeeCategory:ClassSelected,
      FeeCategoryName: isSearch ? this.searchQuery.trim() : null
    };

    // ✅ add only for admin
    if (!this.isAdmin) {
      payload.AcademicYear = this.AdminSelectedActiveAcademicYearID;
    }
    else if(this.isAdmin && this.SchoolAcademicYearChange){
      payload.AcademicYear = AcademicYearIdSelected;
    }

    return this.apiurl.post<any>('Tbl_FeeAllocation_CRUD_Operations', payload);
    // const SchoolIdSelected = this.selectedSchoolID?.trim() || '';

    // const searchText = isSearch ? this.searchQuery.trim() : null;
    // return this.apiurl.post<any>('Tbl_FeeAllocation_CRUD_Operations', {
    //   Flag: isSearch ? '8' : '6',
    //   SchoolID:SchoolIdSelected,
    //   FeeCategoryName: searchText,
    //   FeeCategory: searchText
    // });
  }

  /**
   * Executes the operation: FetchInitialData
   * Parameters: extra: any = {}
   * Rationale: Standard operational controller for the active view.
   */
  FetchInitialData(extra: any = {}) {
    const isSearch = !!this.searchQuery?.trim();
    const flag = isSearch ? '7' : '2';

    // const SchoolIdSelected = this.selectedSchoolID?.trim() || '';
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
        this.ClassCount = countResp?.data?.[0]?.totalcount ?? 0;
        this.SubjectsActiveCount=countResp?.data?.[0]?.activeCount ?? 0;
        this.SubjectsInActiveCount=countResp?.data?.[0]?.inactiveCount ?? 0;

        const payload: any = {
          Flag: flag,
          Limit: this.pageSize,
          SortColumn: this.sortColumn,
          SortDirection: this.sortDirection,
          LastCreatedDate: cursor?.lastCreatedDate ?? null,
          LastID: cursor?.lastID ?? null,
          FeeCategory:ClassSelected,
          SchoolID:SchoolIdSelected,
          ...extra
        };

        // // Handle offset-based pagination
        // if (extra.offset !== undefined) {
        //   payload.Offset = extra.offset;
        // }

        // if (isSearch) {
        //   const searchText = this.searchQuery.trim();
        //   payload.FeeCategoryName = searchText;
        //   payload.FeeCategory = searchText;
        // }

        if (!this.isAdmin) {
          payload.AcademicYear = this.AdminSelectedActiveAcademicYearID;
        }
        else if(this.isAdmin && this.SchoolAcademicYearChange){
          payload.AcademicYear = AcademicYearIdSelected;
        }

        if (isSearch) payload.FeeCategoryName = this.searchQuery.trim();

        this.apiurl.post<any>('Tbl_FeeAllocation_CRUD_Operations', payload).subscribe({
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
            this.FeeAllocationList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.FeeAllocationList = [];
        this.ClassCount = 0;
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
    this.FeeAllocationList = (response.data || []).map((item: any) => ({
      ID: item.id,
      SchoolID:item.schoolID,
      Syllabus: item.syllabus,
      Class: item.class,
      Divisions:item.divisions,
      FeeCategory:item.feeCategory,
      Amount:item.amount,
      StartDate:this.formatDateYYYYMMDD(item.startDate),
      EndDate:this.formatDateYYYYMMDD(item.endDate),
      IsActive: item.isActive === "1" ? 'Active' : 'InActive',
      AcademicYearName:item.academicYearName,
      SchoolName:item.schoolName,
      SyllabusName:item.syllabusName,
      ClassName:item.className,
      DivisionName:item.divisionName,
      FeeCategoryName:item.feeCategoryName
    }));
  };

  /**
   * Executes the operation: AddNewClicked
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  AddNewClicked(){
    this.ClassForm.reset(); 
    if (this.isAdmin) {
      this.ClassForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
      this.ClassForm.get('School').patchValue('0');
      this.ClassForm.get('AcademicYear').patchValue('0'); 
    } else {
      this.ClassForm.get('School')?.clearValidators();
      this.ClassForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
    if(this.AdminselectedSchoolID==''){
      this.FetchAcademicYearsList();
      if(!this.isAdmin){
        this.ClassForm.get('AcademicYear').patchValue(this.AdminSelectedActiveAcademicYearID);
        this.FetchFeeCategoryList();
        this.FetchSyllabusList();
      }   
    }
    this.categories=[];
    this.selectedCategories=[];
    this.ClassForm.get('Syllabus').patchValue('0');
    this.ClassForm.get('Class').patchValue('0');
    this.ClassForm.get('Divisions').patchValue([]);
    this.ClassForm.get('FeeCategory').patchValue('0');
    this.ClassForm.get('Amount').patchValue('');
    this.ClassForm.get('StartDate').patchValue('');
    this.ClassForm.get('EndDate').patchValue('');
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewClassClicked=false;
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
   * Executes the operation: toggleSelection
   * Parameters: value: string, event?: Event
   * Rationale: Standard operational controller for the active view.
   */
  toggleSelection(value: string, event?: Event) {
    const normalizedValue = String(value);
    const isChecked = event ? (event.target as HTMLInputElement).checked : !this.selectedCategories.includes(normalizedValue);

    this.selectedCategories = isChecked
      ? (this.selectedCategories.includes(normalizedValue)
          ? [...this.selectedCategories]
          : [...this.selectedCategories, normalizedValue])
      : this.selectedCategories.filter(item => item !== normalizedValue);

    const divisionsControl = this.ClassForm.get('Divisions');
    divisionsControl?.setValue([...this.selectedCategories]);
    divisionsControl?.markAsTouched();
    divisionsControl?.markAsDirty();
    divisionsControl?.updateValueAndValidity();
  }

  /**
   * Executes the operation: FetchClassList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchClassList() {
    const requestData = { 
      SchoolID:this.AdminselectedSchoolID,
      AcademicYear:this.AdminselectedAcademivYearID,
      Syllabus:this.ClassForm.get('Syllabus')?.value,
      Flag: '3' };

    this.apiurl.post<any>('Tbl_Class_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.ClassList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.name
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

  /**
   * Executes the operation: FetchClassDivisionList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchClassDivisionList() {
    const requestData = { 
      SchoolID:this.AdminselectedSchoolID,
      AcademicYear:this.AdminselectedAcademivYearID,
      Class:this.ClassForm.get('Class')?.value,
      Flag: '3' };

    this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.categories = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.name
              };
            });
          } else {
            this.categories = [];
          }
        },
        (error) => {
          this.categories = [];
        }
      );
  };

  /**
   * Executes the operation: SubmitClass
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  SubmitClass(){
    if(this.ClassForm.invalid){
      this.ClassForm.markAllAsTouched();
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const divisionValue = this.ClassForm.get('Divisions')?.value;
      const divisions = Array.isArray(divisionValue)
        ? divisionValue.join(',')
        : divisionValue || '';
      const data = {
        Syllabus: this.ClassForm.get('Syllabus')?.value,
        Class: this.ClassForm.get('Class')?.value,
        // Divisions: this.ClassForm.get('Divisions')?.value.join(','),
        Divisions: divisions,
        FeeCategory: this.ClassForm.get('FeeCategory')?.value,
        Amount: this.ClassForm.get('Amount')?.value,
        StartDate: this.ClassForm.get('StartDate')?.value,
        EndDate: this.ClassForm.get('EndDate')?.value,
      
        SchoolID: this.ClassForm.get('School')?.value,
        AcademicYear: this.ClassForm.get('AcademicYear')?.value,

        IsActive:IsActiveStatusNumeric,
        Flag: '1'
      };

      this.apiurl.post("Tbl_FeeAllocation_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            this.isModalOpen = true;
            this.AminityInsStatus = "Fee Allocation Details Submitted!";
            this.ClassForm.reset();
            this.ClassForm.markAsPristine();

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

    this.apiurl.post<any>("Tbl_FeeAllocation_CRUD_Operations", data).subscribe(
      (response: any) => {

        const item = response?.data?.[0];
        if (!item) {
          this.ClassForm.reset();
          this.viewSyllabus = null;
          return;
        }

        // ✅ normalize once
        const isActive = item.isActive === "1";
        const classArray = item.divisions? item.divisions.split(',').map((x: string) => x.trim()): [];


        if (mode === 'view') {
          this.isViewMode = true;

          this.viewSyllabus = {
            ID: item.id,
            SchoolID: item.schoolID,
            Syllabus: item.syllabus,
            Class: item.class,
            Divisions:item.divisions,
            FeeCategory:item.feeCategory,
            Amount:item.amount,
            StartDate:this.formatDateYYYYMMDD(item.startDate),
            EndDate:this.formatDateYYYYMMDD(item.endDate),
            SchoolName: item.schoolName,
            AcademicYearName: item.academicYearName,
            SyllabusName:item.syllabusName,
            ClassName:item.className,
            DivisionName:item.divisionName,
            FeeCategoryName:item.feeCategoryName,
            IsActive: isActive 
          };

          this.isViewModalOpen = true;
        }


        // if (mode === 'edit') {
        //   this.isViewMode = false;
        //   this.ClassForm.patchValue({
        //     ID: item.id,
        //     SchoolID: item.schoolID,
        //     Syllabus: item.syllabus,
        //     Class: item.class,
        //     Divisions:item.divisions,
        //     FeeCategory:item.feeCategory,
        //     Amount:item.amount,
        //     StartDate:this.formatDateYYYYMMDD(item.startDate),
        //     EndDate:this.formatDateYYYYMMDD(item.endDate),
        //     School:item.schoolID,
        //     AcademicYear:item.academicYear
        //   });
        //   this.selectedCategories = [...classArray];
        //   this.categories = this.categories || [];
        //   this.AdminselectedSchoolID=item.schoolID;
        //   this.AdminselectedAcademivYearID=item.academicYear;
        //   this.FetchAcademicYearsList();
        //   this.FetchFeeCategoryList();
        //   this.FetchSyllabusList();
        //   this.FetchClassList();
        //   this.FetchClassDivisionList();
        //   this.IsActiveStatus = isActive;
        //   this.IsAddNewClicked = true;
        // }

        if (mode === 'edit') {
            this.isViewMode = false;

            const divisionArray = item.divisions
              ? item.divisions.split(',').map((x: string) => x.trim())
              : [];

            this.ClassForm.patchValue({
              ID: item.id,
              SchoolID: item.schoolID,
              Syllabus: item.syllabus,
              Class: item.class,
              Divisions: divisionArray,
              FeeCategory: item.feeCategory,
              Amount: item.amount,
              StartDate: this.formatDateYYYYMMDD(item.startDate),
              EndDate: this.formatDateYYYYMMDD(item.endDate),
              School: item.schoolID,
              AcademicYear: item.academicYear
            });

            this.selectedCategories = [...divisionArray];

            this.AdminselectedSchoolID = item.schoolID;
            this.AdminselectedAcademivYearID = item.academicYear;

            this.FetchAcademicYearsList();
            this.FetchFeeCategoryList();
            this.FetchSyllabusList();
            this.FetchClassList();
            this.FetchClassDivisionList();

            this.IsActiveStatus = item.isActive === "1";
            this.IsAddNewClicked = true;
          }

      },
      error => {
        console.error(error);
      }
    );
  };

  /**
   * Executes the operation: UpdateClass
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  UpdateClass(){
    if(this.ClassForm.invalid){
      this.ClassForm.markAllAsTouched();
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        ID:this.ClassForm.get('ID')?.value || '',
        Syllabus: this.ClassForm.get('Syllabus')?.value,
        Class: this.ClassForm.get('Class')?.value,
        Divisions: this.ClassForm.get('Divisions')?.value.join(','),
        FeeCategory: this.ClassForm.get('FeeCategory')?.value,
        Amount: this.ClassForm.get('Amount')?.value,
        StartDate: this.ClassForm.get('StartDate')?.value,
        EndDate: this.ClassForm.get('EndDate')?.value,
        SchoolID: this.ClassForm.get('School')?.value,
        AcademicYear: this.ClassForm.get('AcademicYear')?.value,
        IsActive:IsActiveStatusNumeric,
        Flag: '5'
      };

      this.apiurl.post("Tbl_FeeAllocation_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            this.isModalOpen = true;
            this.AminityInsStatus = "Fee Allocation Details Updated!";
            this.ClassForm.reset();
            this.ClassForm.markAsPristine();
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

    // Always use offset-based pagination for consistency
    const offset = (pageNumber - 1) * this.pageSize;
    this.FetchInitialData({ offset });
  };

  /**
   * Executes the operation: totalPages
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  totalPages() {
    return Math.ceil(this.ClassCount / this.pageSize);
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
      this.applySearch();
    }, this.SEARCH_DEBOUNCE);
  };

  /**
   * Executes the operation: onSearchSubmit
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  onSearchSubmit() {
    clearTimeout(this.searchTimer);
    this.applySearch();
  };

  /**
   * Executes the operation: applySearch
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private applySearch() {
    const value = this.searchQuery?.trim() || '';

    if (value.length === 0) {
      this.currentPage = 1;
      this.pageSize=5;
      this.visiblePageCount=3;
      this.FetchInitialData({ offset: 0 });
      return;
    }

    if (value.length < this.SEARCH_MIN_LENGTH) {
      return;
    }
    
    this.currentPage = 1;
    this.pageSize=5;
    this.visiblePageCount=3;
    this.FetchInitialData({ offset: 0 });
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
    this.currentPage = 1;
    this.FetchInitialData({ offset: 0 });
  };

  /**
   * Executes the operation: editreview
   * Parameters: SyllabusID: string
   * Rationale: Standard operational controller for the active view.
   */
  editreview(SyllabusID: string): void {
    if (this.isAdmin) {
      this.ClassForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
    } else {
      this.ClassForm.get('School')?.clearValidators();
    }
    this.editclicked=true;
    this.FetchSyllabusDetByID(SyllabusID,'edit');
    this.ViewClassClicked=true;
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
    this.FetchInitialData({ offset: 0 });
  };

  /**
   * Executes the operation: onSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onSchoolChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    this.selectedSchoolID = schoolID === "0" ? '' : schoolID;
    // this.currentPage = 1;
    this.SchoolSelectionChange = true;
    this.FetchAcademicYearsList();
    this.FetchInitialData({ offset: 0 });
  }

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
    this.FetchFeeCategoryList();
    this.FetchInitialData();
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
   * Executes the operation: onAdminSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminSchoolChange(event: Event) {
    this.academicYearList = [];
    this.SyllabusList = [];
    this.feecategories = [];
    this.ClassForm.get('Class')?.patchValue('0');
    this.ClassForm.get('AcademicYear')?.patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if (schoolID == "0") {
      this.AdminselectedSchoolID = "";
    } else {
      this.AdminselectedSchoolID = schoolID;
    }
    this.FetchAcademicYearsList();
  }

  /**
   * Executes the operation: onAdminAcademicYearchange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminAcademicYearchange(event: Event){
    this.feecategories =[];
    this.SyllabusListbySchool = [];
    this.ClassForm.get('FeeCategory').patchValue('0');
    this.ClassForm.get('Syllabus').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const academicyearId = target.value;
    if(academicyearId=="0"){
      this.AdminselectedAcademivYearID="";
    }else{
      this.AdminselectedAcademivYearID = academicyearId;
    }   
    this.FetchFeeCategoryList();
    this.FetchSyllabusList();
  }

  /**
   * Executes the operation: onAdminSyllabusChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminSyllabusChange(event: Event){
    this.ClassList =[];
    this.ClassForm.get('Class').patchValue('0');
    this.FetchClassList();
  }

  /**
   * Executes the operation: onAdminClassChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminClassChange(event: Event){
    this.categories =[];
    this.selectedCategories = [];
    this.ClassForm.get('Divisions')?.patchValue([]);
    this.ClassForm.get('Divisions')?.updateValueAndValidity();
    this.FetchClassDivisionList();
  }

  SyllabusListbySchool: any[] = [];
  /**
   * Executes the operation: FetchSyllabusList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchSyllabusList() {
    const AcademicYearIdSelected =
      this.isAdmin
        ? this.AdminselectedAcademivYearID?.trim()
        : this.AdminSelectedActiveAcademicYearID || '';

    const requestData = {
      SchoolID: this.AdminselectedSchoolID,
      AcademicYear: AcademicYearIdSelected,
      Flag: '3'
    };
    
    this.apiurl.post<any>('Tbl_Syllabus_CRUD_Operations', requestData)
        .subscribe(
          (response: any) => {
            if (response && Array.isArray(response.data)) {
              this.SyllabusListbySchool = response.data.map((item: any) => {
                const isActiveString = item.isActive === "1" ? "Active" : "InActive";
                return {
                  ID: item.id,
                  Name: item.name,
                  IsActive: isActiveString
                };
              });            
            } else {
              this.SyllabusListbySchool = [];
            }
          },
          (error) => {
            this.SyllabusListbySchool = [];
          }
        );
  }

  /**
   * Executes the operation: onFineTypeChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onFineTypeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    this.ClassForm.get('FineIncrementIn').patchValue('0');
    if(schoolID=="Percentage"){
      this.FineCollectionTypePercentage=true;
      this.ClassForm.get('FineIncrementIn')?.setValidators([Validators.required,Validators.min(1)]);
    }else{
      this.FineCollectionTypePercentage=false;
      this.ClassForm.get('FineIncrementIn')?.clearValidators();
    }   
    this.ClassForm.get('FineIncrementIn')?.updateValueAndValidity();
  };  

  /**
   * Executes the operation: pageStartIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageStartIndex(): number {
    return this.ClassCount === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
  }

  /**
   * Executes the operation: pageEndIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.ClassCount);
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
    this.ClassForm.reset();
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
}
