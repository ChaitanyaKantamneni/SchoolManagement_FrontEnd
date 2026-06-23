import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule,Validators  } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { tap } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { Subscription } from 'rxjs';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent  } from '../../../shared/base-crud.component';
import { SchoolCacheService } from '../../../Services/school-cache.service';
import { LoaderService } from '../../../Services/loader.service';
import { HttpClient } from '@angular/common/http';
import { FileService } from '../../../Services/file.service';

@Component({
  selector: 'app-fee-collection',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './fee-collection.component.html',
  styleUrl: './fee-collection.component.css'
})
/**
 * Class Responsibility: Handles view logic and user interactions for FeeCollectionComponent.
 */
export class FeeCollectionComponent extends BasePermissionComponent {
  pageName = 'Fee Collection';

constructor(
    private http: HttpClient,
    router: Router,
    public loader: LoaderService,
    private apiurl: ApiServiceService,
    menuService: MenuServiceService,
    private fileService: FileService
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
    this.FetchInitialData();
    const admissionControl = this.ClassDivisionForm.get('AdmissionNo');
    this.admissionNoSubscription = admissionControl?.valueChanges.subscribe((value: any) => {
      if (this.suppressAdmissionNoWatcher) return;
      const normalized = (value ?? '').toString().trim();
      if (!normalized) {
        this.clearAdmissionDrivenSelectionAndUnlock(false);
        this.resetFeePreviewState(true);
        this.admissionLookupNoData = false;
        return;
      }

      const lastLoadedAdmission = (this.selectedAdmissionNo || '').toString().trim().toLowerCase();
      if (normalized.toLowerCase() !== lastLoadedAdmission) {
        this.resetHierarchyFieldsAfterAdmissionNoChange();
        this.admissionLookupNoData = false;
      }
    });
  };
  
  /**
   * Executes the operation: ngOnDestroy
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  ngOnDestroy(): void {
    this.admissionNoSubscription?.unsubscribe();
  }

  IsAddNewClicked:boolean=false;
  IsActiveStatus:boolean=false;
  ViewClassDivisionClicked:boolean=false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  private searchTimer: any;
  private readonly SEARCH_DEBOUNCE = 300;
  ClassDivisionList: any[] =[];
  displayedClassDivisionList: any[] = [];
  ClassDivisionCount: number = 0;
  SyllabusList: any[] =[];
  feeCategoryList: any[] =[];
  isViewMode = false;
  viewSyllabus: any = null;
  AminityInsStatus: any = '';
  isModalOpen = false;
  isViewModalOpen= false;  
  showFeeTable: boolean = false;
  showFeeTableAfterFeeCategory: boolean = false;
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
  DivisionsList:any[] = [];
  ClassTeachersList:any[] = [];
  StaffList:any[] = [];
  feesList: any[] = [];
  receiptNo: string = '';
  selectedStudentID: string = '';
  paymentDate: string = '';
  amountPaid: number = 0;
  previousAdvance: number = 0;
  currentAdvance: number = 0;
  selectedStudentName: string = '';
  selectedAdmissionNo: string = '';
  selectedClassInfo: string = '';
  isAdmissionLookupMode: boolean = false;
  admissionLookupNoData: boolean = false;

  AdminselectedSchoolID:string = '';
  AdminselectedSchoolFeeCategoryID:string = '';
  AdminselectedAcademivYearID:string = '';
  AdminselectedClassID:string = '';
  AdminselectedClassDivisionID:string = '';
  private admissionLookupRequestToken = 0;
  private admissionNoSubscription?: Subscription;
  private suppressAdmissionNoWatcher = false;
  AdminSelectedActiveAcademicYearID:string = sessionStorage.getItem('ActiveAcademicYearID') || '';

  /**
   * Executes the operation: getResponseData
   * Parameters: response: any
   * Rationale: Standard operational controller for the active view.
   */
  private getResponseData(response: any): any[] {
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.Data)) return response.Data;
    return [];
  }

  /**
   * Executes the operation: isApiSuccess
   * Parameters: response: any
   * Rationale: Standard operational controller for the active view.
   */
  private isApiSuccess(response: any): boolean {
    const code = response?.statusCode ?? response?.StatusCode;
    const success = response?.success ?? response?.Success;
    return code === 200 || success === true;
  }

  ClassDivisionForm: any = new FormGroup({
    ID: new FormControl(),
    AdmissionNo: new FormControl(''),
    Class: new FormControl(0),
    Division: new FormControl(0),
    ClassTeacher: new FormControl(0),
    School: new FormControl(),
    AcademicYear: new FormControl(0),
    FeeCategory:new FormControl(),
    AmountToBePaid:new FormControl('', [Validators.required, Validators.pattern(/^\d+$/), Validators.min(1)]),
    PaymentMode: new FormControl(0, [Validators.min(1)]),
    TransactionID: new FormControl(),
    ChequeNo: new FormControl('')
  });

  /**
   * Executes the operation: lockHierarchyFields
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private lockHierarchyFields(): void {
    ['School', 'AcademicYear', 'Class', 'Division', 'ClassTeacher'].forEach((field) => {
      const control = this.ClassDivisionForm.get(field);
      if (control && control.enabled) {
        control.disable({ emitEvent: false });
      }
    });
  }

  /**
   * Executes the operation: unlockHierarchyFields
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private unlockHierarchyFields(): void {
    ['School', 'AcademicYear', 'Class', 'Division', 'ClassTeacher'].forEach((field) => {
      const control = this.ClassDivisionForm.get(field);
      if (control && control.disabled) {
        control.enable({ emitEvent: false });
      }
    });
  }

  /**
   * Executes the operation: clearAdmissionDrivenSelectionAndUnlock
   * Parameters: reloadSchools: boolean = true
   * Rationale: Standard operational controller for the active view.
   */
  private clearAdmissionDrivenSelectionAndUnlock(reloadSchools: boolean = true): void {
    this.admissionLookupRequestToken++;
    this.isAdmissionLookupMode = false;
    this.unlockHierarchyFields();

    this.AdminselectedSchoolID = '';
    this.AdminselectedAcademivYearID = '';
    this.AdminselectedClassID = '';
    this.AdminselectedClassDivisionID = '';
    this.AdminselectedSchoolFeeCategoryID = '';

    this.selectedStudentID = '';
    this.selectedStudentName = '';
    this.selectedAdmissionNo = '';
    this.selectedClassInfo = '';
    this.admissionLookupNoData = false;
    this.receiptNo = '';
    this.feeCategoryList = [];
    this.feesList = [];
    this.showFeeTable = false;
    this.showFeeTableAfterFeeCategory = false;
    this.DueAmount = 0;
    this.totalAmount = 0;

    this.academicYearList = [];
    this.SyllabusList = [];
    this.DivisionsList = [];
    this.ClassTeachersList = [];

    this.ClassDivisionForm.get('School')?.patchValue('0', { emitEvent: false });
    this.ClassDivisionForm.get('AcademicYear')?.patchValue('0', { emitEvent: false });
    this.ClassDivisionForm.get('Class')?.patchValue('0', { emitEvent: false });
    this.ClassDivisionForm.get('Division')?.patchValue('0', { emitEvent: false });
    this.ClassDivisionForm.get('ClassTeacher')?.patchValue('0', { emitEvent: false });
    this.ClassDivisionForm.get('FeeCategory')?.patchValue('0', { emitEvent: false });

    if (reloadSchools) {
      this.FetchSchoolsList();
    }
  }

  /**
   * Executes the operation: resetHierarchyFieldsAfterAdmissionNoChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private resetHierarchyFieldsAfterAdmissionNoChange(): void {
    this.admissionLookupRequestToken++;
    this.isAdmissionLookupMode = false;
    this.unlockHierarchyFields();

    this.AdminselectedSchoolID = '';
    this.AdminselectedAcademivYearID = '';
    this.AdminselectedClassID = '';
    this.AdminselectedClassDivisionID = '';
    this.AdminselectedSchoolFeeCategoryID = '';

    this.academicYearList = [];
    this.SyllabusList = [];
    this.DivisionsList = [];
    this.ClassTeachersList = [];

    this.ClassDivisionForm.get('School')?.patchValue('0', { emitEvent: false });
    this.ClassDivisionForm.get('AcademicYear')?.patchValue('0', { emitEvent: false });
    this.ClassDivisionForm.get('Class')?.patchValue('0', { emitEvent: false });
    this.ClassDivisionForm.get('Division')?.patchValue('0', { emitEvent: false });
    this.ClassDivisionForm.get('ClassTeacher')?.patchValue('0', { emitEvent: false });

    this.resetFeePreviewState(true);
    this.admissionLookupNoData = false;
  }

  /**
   * Executes the operation: resetFeePreviewState
   * Parameters: clearStudentSelection: boolean
   * Rationale: Standard operational controller for the active view.
   */
  private resetFeePreviewState(clearStudentSelection: boolean): void {
    this.showFeeTable = false;
    this.showFeeTableAfterFeeCategory = false;
    this.receiptNo = '';
    this.feeCategoryList = [];
    this.feesList = [];
    this.DueAmount = 0;
    this.totalAmount = 0;
    this.paymentDate = '';
    this.AdminselectedSchoolFeeCategoryID = '';
    this.ClassDivisionForm.get('FeeCategory')?.patchValue('0', { emitEvent: false });
    this.ClassDivisionForm.get('AmountToBePaid')?.patchValue('', { emitEvent: false });
    this.ClassDivisionForm.get('PaymentMode')?.patchValue('0', { emitEvent: false });
    this.ClassDivisionForm.get('TransactionID')?.patchValue('', { emitEvent: false });
    this.ClassDivisionForm.get('ChequeNo')?.patchValue('', { emitEvent: false });
    this.setTransactionValidatorsByPaymentMode('0');

    if (clearStudentSelection) {
      this.selectedStudentID = '';
      this.selectedStudentName = '';
      this.selectedAdmissionNo = '';
      this.selectedClassInfo = '';
      this.ClassDivisionForm.get('ClassTeacher')?.patchValue('0', { emitEvent: false });
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

    const requestData = { SchoolID:schoolId,Flag: '3' };

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

  private async FetchAcademicYearsListAsync(): Promise<void> {
    const schoolId =
    this.SchoolSelectionChange
      ? this.selectedSchoolID?.trim()
      : this.AdminselectedSchoolID || '';

    const requestData = { SchoolID: schoolId, Flag: '3' };

    try {
      const response = await firstValueFrom(
        this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', requestData)
      );
      if (response && Array.isArray(response.data)) {
        this.academicYearList = response.data.map((item: any) => ({
          ID: item.id,
          Name: item.name,
          IsActive: item.isActive === '1' ? 'Active' : 'InActive'
        }));
      } else {
        this.academicYearList = [];
      }
    } catch {
      this.academicYearList = [];
    }
  }

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
      Flag: '5',
      SchoolID:SchoolIdSelected
    };

    if (!this.isAdmin) {
      payload.AcademicYear = this.AdminSelectedActiveAcademicYearID;
    }
    else if(this.isAdmin && this.SchoolAcademicYearChange){
      payload.AcademicYear = AcademicYearIdSelected;
    }

    return this.apiurl.post<any>('Tbl_FeeCollection_CRUD_Operations', payload);

  }

  /**
   * Executes the operation: FetchInitialData
   * Parameters: extra: any = {}
   * Rationale: Standard operational controller for the active view.
   */
  FetchInitialData(extra: any = {}) {
    const isSearch = !!this.searchQuery?.trim();
    const flag = '2';

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
        this.ClassDivisionCount = countResp?.data?.[0]?.totalcount ?? 0;

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

        if (!this.isAdmin) {
          payload.AcademicYear = this.AdminSelectedActiveAcademicYearID;
        }
        else if(this.isAdmin && this.SchoolAcademicYearChange){
          payload.AcademicYear = AcademicYearIdSelected;
        }

        // Handle offset-based pagination
        if (extra.offset !== undefined) {
          payload.Offset = extra.offset;
        }

        this.apiurl.post<any>('Tbl_FeeCollection_CRUD_Operations', payload).subscribe({
          next: (response: any) => {
            const data = this.getResponseData(response);
            this.mapAcademicYears(response);
            this.loader.hide();
          },
          error: () => {
            this.ClassDivisionList = [];
            this.displayedClassDivisionList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.ClassDivisionList = [];
        this.displayedClassDivisionList = [];
        this.ClassDivisionCount = 0;
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
    this.ClassDivisionList = this.getResponseData(response).map((item: any) => ({
      ID: item.id,
      ReceiptNo: item.receiptNo,
      AdmissionNo: item.student,
      StudentName: item.studentName,
      AmountPaid: item.amountPaid,
      PaymentDate: this.formatDateDDMMYYYY(item.paymentDate),
      PaymentMode: this.getPaymentModeDisplayValue(item.paymentMode),
      ClassName: item.className,
      DivisionName: item.divisionName,
      FeeCategoryName: item.feeCategoryName,
      SchoolName: item.schoolName,
      AcademicYearName: item.academicYearName
    }));
    this.applyAdmissionNoFilter();
  }

  /**
   * Executes the operation: applyAdmissionNoFilter
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private applyAdmissionNoFilter(): void {
    const normalizedSearchTerm = (this.searchQuery || '').toString().trim().toLowerCase();

    if (!normalizedSearchTerm) {
      this.displayedClassDivisionList = [...this.ClassDivisionList];
      return;
    }

    this.displayedClassDivisionList = this.ClassDivisionList.filter((record: any) =>
      (record?.AdmissionNo ?? '').toString().toLowerCase().includes(normalizedSearchTerm)
    );
  }

  /**
   * Executes the operation: AddNewClicked
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  AddNewClicked(){
    this.ClassDivisionForm.reset();
    this.isAdmissionLookupMode = false;
    this.unlockHierarchyFields();
    if (this.isAdmin) {
      this.ClassDivisionForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
      this.ClassDivisionForm.get('School').patchValue('0');
      this.ClassDivisionForm.get('AcademicYear').patchValue('0');
    } else {
      this.ClassDivisionForm.get('School')?.clearValidators();
      this.ClassDivisionForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
    // this.ClassDivisionForm.get('School')?.clearValidators();
    if(this.AdminselectedSchoolID==''){
      this.FetchAcademicYearsList();
      if(!this.isAdmin){
        this.ClassDivisionForm.get('AcademicYear').patchValue(this.AdminSelectedActiveAcademicYearID);
        this.FetchClassList();
      } 
    }
    // this.FetchClassList();    
    this.ClassDivisionForm.get('Class').patchValue('0');
    this.ClassDivisionForm.get('ClassTeacher').patchValue('0');
    this.ClassDivisionForm.get('Division').patchValue('0');
    this.ClassDivisionForm.get('PaymentMode')?.patchValue('0');
    this.ClassDivisionForm.get('TransactionID')?.patchValue('');
    this.ClassDivisionForm.get('ChequeNo')?.patchValue('');
    this.ClassDivisionForm.get('AmountToBePaid')?.patchValue('');
    this.ClassDivisionForm.get('AdmissionNo')?.patchValue('');
    this.setTransactionValidatorsByPaymentMode('0');
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewClassDivisionClicked=false;
    this.showFeeTable=false;
    this.showFeeTableAfterFeeCategory=false;
    this.clearAdmissionDrivenSelectionAndUnlock(false);
  };

  /**
   * Executes the operation: FetchClassList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchClassList() {
    const AcademicYearIdSelected =
      this.isAdmin
        ? (
            this.SchoolAcademicYearChange
              ? this.selectedAcademicYearID?.trim()
              : this.AdminselectedAcademivYearID?.trim()
          )
        : this.AdminSelectedActiveAcademicYearID || '';

    const requestData = { 
      SchoolID:this.AdminselectedSchoolID,
      AcademicYear:AcademicYearIdSelected,
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

  private async FetchClassListAsync(): Promise<void> {
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
      Flag: '9'
    };
    try {
      const response = await firstValueFrom(
        this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', requestData)
      );
      if (response && Array.isArray(response.data)) {
        this.SyllabusList = response.data.map((item: any) => ({
          ID: item.sNo,
          Name: item.syllabusClassName
        }));
      } else {
        this.SyllabusList = [];
      }
    } catch {
      this.SyllabusList = [];
    }
  }

  /**
   * Executes the operation: FetchDivisionsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchDivisionsList() {
    const AcademicYearIdSelected =
      this.isAdmin
        ? (
            this.SchoolAcademicYearChange
              ? this.selectedAcademicYearID?.trim()
              : this.AdminselectedAcademivYearID?.trim()
          )
        : this.AdminSelectedActiveAcademicYearID || '';

    const requestData = { 
      SchoolID:this.AdminselectedSchoolID,
      AcademicYear:AcademicYearIdSelected,
      Class:this.AdminselectedClassID,
      Flag: '3' };

    this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.DivisionsList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.name
              };
            });
          } else {
            this.DivisionsList = [];
          }
        },
        (error) => {
          this.DivisionsList = [];
        }
      );
  };

  private async FetchDivisionsListAsync(): Promise<void> {
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
      Class: this.AdminselectedClassID,
      Flag: '3'
    };
    try {
      const response = await firstValueFrom(
        this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', requestData)
      );
      if (response && Array.isArray(response.data)) {
        this.DivisionsList = response.data.map((item: any) => ({
          ID: item.id,
          Name: item.name
        }));
      } else {
        this.DivisionsList = [];
      }
    } catch {
      this.DivisionsList = [];
    }
  }

  /**
   * Executes the operation: FetchClassStudentsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchClassStudentsList() {
    const AcademicYearIdSelected =
      this.isAdmin
        ? (
            this.SchoolAcademicYearChange
              ? this.selectedAcademicYearID?.trim()
              : this.AdminselectedAcademivYearID?.trim()
          )
        : this.AdminSelectedActiveAcademicYearID || '';
        
    const requestData = { 
      SchoolID:this.AdminselectedSchoolID || '',
            AcademicYear:AcademicYearIdSelected,
            Class:this.AdminselectedClassID || '',
            Division:this.AdminselectedClassDivisionID,
            Flag: '3' };

    this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.ClassTeachersList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";

              return {
                ID: item.id,
                AdmissionNo:item.admissionNo,
                NameWithAdmissionNo: `${item.admissionNo ?? ''} - ${item.firstName ?? ''} ${item.middleName ?? ''} ${item.lastName ?? ''}`.replace(/\s+/g, ' ').trim(),
                Name: `${item.firstName ?? ''} ${item.middleName ?? ''} ${item.lastName ?? ''}`.replace(/\s+/g, ' ').trim()
              };
            });
            console.log("ClassTeachersList",this.ClassTeachersList);
          } else {
            this.ClassTeachersList = [];
          }
        },
        (error) => {
          this.ClassTeachersList = [];
        }
      );
  };

  private async FetchClassStudentsListAsync(): Promise<void> {
    const AcademicYearIdSelected =
      this.isAdmin
        ? (
            this.SchoolAcademicYearChange
              ? this.selectedAcademicYearID?.trim()
              : this.AdminselectedAcademivYearID?.trim()
          )
        : this.AdminSelectedActiveAcademicYearID || '';

    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: AcademicYearIdSelected,
      Class: this.AdminselectedClassID || '',
      Division: this.AdminselectedClassDivisionID,
      Flag: '3'
    };
    try {
      const response = await firstValueFrom(
        this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', requestData)
      );
      if (response && Array.isArray(response.data)) {
        this.ClassTeachersList = response.data.map((item: any) => {
          const admissionNo = item.admissionNo ?? item.AdmissionNo ?? '';
          return {
            ID: item.id,
            AdmissionNo: admissionNo,
            NameWithAdmissionNo: `${admissionNo} - ${item.firstName ?? ''} ${item.middleName ?? ''} ${item.lastName ?? ''}`.replace(/\s+/g, ' ').trim(),
            Name: `${item.firstName ?? ''} ${item.middleName ?? ''} ${item.lastName ?? ''}`.replace(/\s+/g, ' ').trim()
          };
        });
      } else {
        this.ClassTeachersList = [];
      }
    } catch {
      this.ClassTeachersList = [];
    }
  }


  /**
   * Executes the operation: SubmitClassDivision
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  SubmitClassDivision(){
    if(this.ClassDivisionForm.invalid){
      console.log('Invalid form',this.ClassDivisionForm);
      this.ClassDivisionForm.markAllAsTouched();
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        SchoolID: this.ClassDivisionForm.get('School')?.value,
        AcademicYear: this.ClassDivisionForm.get('AcademicYear')?.value,
        Class: this.ClassDivisionForm.get('Class')?.value,
        Division: this.ClassDivisionForm.get('Division')?.value,
        Student: this.ClassDivisionForm.get('ClassTeacher')?.value, 
        IsActive:IsActiveStatusNumeric,
        Flag: '1'
      };

      this.apiurl.post("Tbl_FeeDiscount_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            this.isModalOpen = true;
            this.AminityInsStatus = "Fee Discount Allocation Submitted!";
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

  /**
   * Executes the operation: FetchSyllabusDetByID
   * Parameters: SyllabusID: string, mode: 'view' | 'edit'
   * Rationale: Standard operational controller for the active view.
   */
  FetchSyllabusDetByID(SyllabusID: string, mode: 'view' | 'edit') {
    const schoolId = sessionStorage.getItem('SchoolID');

    if (schoolId) {
      this.fileService.getSchoolLogo(schoolId).subscribe((res: any) => {
        this.schoolLogoFromDb = res;

        if (res?.filePath) {
          this.logoUrl = this.fileService.getFullLogoFileUrl(res.filePath);
        }
      });
    }

    const data = {
      ID: SyllabusID,
      Flag: "3"
    };

    this.apiurl.post<any>("Tbl_FeeCollection_CRUD_Operations", data).subscribe(
      (response: any) => {

        const item = response?.data?.[0];
        if (!item) {
          this.ClassDivisionForm.reset();
          this.viewSyllabus = null;
          return;
        }

        const isActive = item.isActive === '1';

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewSyllabus = {
            ID: item.id,
            ReceiptNo: item.receiptNo,
            SchoolID: item.schoolID,
            AcademicYear: item.academicYear,
            Student: item.student,
            Class: item.class,
            Division:item.division,
            FeeCategory:item.feeCategory,
            AmountPaid:item.amountPaid,
            PaymentDate:this.formatDateDDMMYYYY(item.paymentDate),
            PaymentMode:item.paymentMode,
            TransactionID:item.transactionID,
            SchoolName:item.schoolName,
            AcademicYearName:item.academicYearName,

            ClassName:item.className,
            DivisionName:item.divisionName,
            StudentName:item.studentName,
            FeeCategoryName:item.feeCategoryName,

            TotalFee:item.totalFee,
            TotalDiscount:item.totalDiscount,
            TotalFeePaid:item.totalFeePaid,
            FeePaid:item.feePaid,

            NetPayable:item.netPayable,
            RemainingAmount:item.remainingAmount
          };
          this.isViewModalOpen = true;
        }

      },
      error => {
        console.error(error);
      }
    );
  };

  /**
   * Executes the operation: UpdateClassDivision
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  UpdateClassDivision(){
    if(this.ClassDivisionForm.invalid){
      this.ClassDivisionForm.markAllAsTouched();
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        ID:this.ClassDivisionForm.get('ID')?.value || '',
        SchoolID: this.ClassDivisionForm.get('School')?.value,
        AcademicYear: this.ClassDivisionForm.get('AcademicYear')?.value,
        Class: this.ClassDivisionForm.get('Class')?.value,
        Division: this.ClassDivisionForm.get('Division')?.value,
        Student: this.ClassDivisionForm.get('ClassTeacher')?.value, 
        IsActive:IsActiveStatusNumeric,
        Flag: '5'
      };

      this.apiurl.post("Tbl_FeeDiscount_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            this.isModalOpen = true;
            this.AminityInsStatus = "Fee Discount Allocation Updated!";
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
    return Math.ceil(this.ClassDivisionCount / this.pageSize);
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
      this.applyAdmissionNoFilter();
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
    this.currentPage = 1;
    this.FetchInitialData({ offset: 0 });
  };

  /**
   * Executes the operation: getReceiptPaymentModeLabel
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  getReceiptPaymentModeLabel(): string {
    const rawMode = this.viewSyllabus?.PaymentMode;
    return this.getPaymentModeDisplayValue(rawMode);
  }

  /**
   * Executes the operation: getPaymentModeDisplayValue
   * Parameters: rawMode: any
   * Rationale: Standard operational controller for the active view.
   */
  private getPaymentModeDisplayValue(rawMode: any): string {
    const mode = (rawMode ?? '').toString().trim().toLowerCase();
    if (mode === '1' || mode === 'cash') return 'Cash';
    if (mode === '2' || mode === 'upi') return 'UPI';
    if (mode === '4' || mode === 'card') return 'Card';
    if (mode === '3' || mode === 'cheque') return 'Cheque';
    return rawMode || '-';
  }

  /**
   * Executes the operation: isReceiptUpiOrCardMode
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  isReceiptUpiOrCardMode(): boolean {
    const mode = this.getReceiptPaymentModeLabel().toLowerCase();
    return mode === 'upi' || mode === 'card';
  }

  /**
   * Executes the operation: isReceiptChequeMode
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  isReceiptChequeMode(): boolean {
    return this.getReceiptPaymentModeLabel().toLowerCase() === 'cheque';
  }

  /**
   * Executes the operation: getReceiptPaymentReferenceValue
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  getReceiptPaymentReferenceValue(): string {
    const value = this.viewSyllabus?.TransactionID;
    return value && value.toString().trim() ? value : '-';
  }

  /**
   * Executes the operation: editreview
   * Parameters: SyllabusID: string
   * Rationale: Standard operational controller for the active view.
   */
  editreview(SyllabusID: string): void {
    this.ClassDivisionForm.get('School')?.clearValidators();
    this.editclicked=true;
    this.FetchSyllabusDetByID(SyllabusID,'edit');
    this.ViewClassDivisionClicked=true;
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
    if(schoolID=="0"){
      this.selectedSchoolID="";
    }else{
      this.selectedSchoolID = schoolID;
    }    
    this.SchoolSelectionChange = true;
    this.currentPage = 1;
    this.FetchInitialData({ offset: 0 });
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
    if (this.isAdmissionLookupMode) return;
    this.isAdmissionLookupMode = false;
    this.unlockHierarchyFields();
    this.ClassDivisionForm.get('AdmissionNo')?.patchValue('', { emitEvent: false });
    this.selectedAdmissionNo = '';
    this.resetFeePreviewState(true);
    this.academicYearList=[];
    this.SyllabusList = [];
    this.DivisionsList = [];
    this.ClassTeachersList = [];
    this.ClassDivisionForm.get('Class').patchValue('0');
    this.ClassDivisionForm.get('Division').patchValue('0');
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

  /**
   * Executes the operation: onAdminAcademicYearChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminAcademicYearChange(event: Event) {
    if (this.isAdmissionLookupMode) return;
    this.isAdmissionLookupMode = false;
    this.unlockHierarchyFields();
    this.ClassDivisionForm.get('AdmissionNo')?.patchValue('', { emitEvent: false });
    this.selectedAdmissionNo = '';
    this.resetFeePreviewState(true);
    this.SyllabusList = []; 
    this.DivisionsList = [];
    this.ClassTeachersList = [];
    this.ClassDivisionForm.get('Class').patchValue('0');
    this.ClassDivisionForm.get('Division').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if(schoolID=="0"){
      this.AdminselectedAcademivYearID="";
    }else{
      this.AdminselectedAcademivYearID = schoolID;
    }    
    this.FetchClassList();
  };

  /**
   * Executes the operation: onAdminClassChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminClassChange(event: Event) {
    if (this.isAdmissionLookupMode) return;
    this.isAdmissionLookupMode = false;
    this.unlockHierarchyFields();
    this.ClassDivisionForm.get('AdmissionNo')?.patchValue('', { emitEvent: false });
    this.selectedAdmissionNo = '';
    this.resetFeePreviewState(true);
    this.DivisionsList = [];    
    this.ClassTeachersList = [];
    this.ClassDivisionForm.get('Division').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if(schoolID=="0"){
      this.AdminselectedClassID="";
    }else{
      this.AdminselectedClassID = schoolID;
    }    
    this.FetchDivisionsList();
  };

  /**
   * Executes the operation: onAdminDivisionChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminDivisionChange(event: Event) {
      if (this.isAdmissionLookupMode) return;
      this.isAdmissionLookupMode = false;
      this.unlockHierarchyFields();
      this.ClassDivisionForm.get('AdmissionNo')?.patchValue('', { emitEvent: false });
      this.selectedAdmissionNo = '';
      this.resetFeePreviewState(true);
      this.ClassTeachersList = [];  
      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      if(schoolID=="0"){
        this.AdminselectedClassDivisionID="";
      }else{
        this.AdminselectedClassDivisionID = schoolID;
      }    
      this.FetchClassStudentsList();
  };

  /**
   * Executes the operation: onStudentChange
   * Parameters: event: any
   * Rationale: Standard operational controller for the active view.
   */
  onStudentChange(event: any) {
    if (this.isAdmissionLookupMode) return;
    this.isAdmissionLookupMode = false;
    this.unlockHierarchyFields();
    this.ClassDivisionForm.get('AdmissionNo')?.patchValue('', { emitEvent: false });
    this.selectedAdmissionNo = '';
    this.resetFeePreviewState(false);
    const studentId = event.target.value;
    this.selectedStudentID = studentId;    
  }

  /**
   * Executes the operation: onPaymentModeChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onPaymentModeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedMode = target.value;
    this.setTransactionValidatorsByPaymentMode(selectedMode);
  }

  /**
   * Executes the operation: isUpiModeSelected
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  isUpiModeSelected(): boolean {
    return this.ClassDivisionForm.get('PaymentMode')?.value?.toString() === '2';
  }

  /**
   * Executes the operation: isCardModeSelected
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  isCardModeSelected(): boolean {
    return this.ClassDivisionForm.get('PaymentMode')?.value?.toString() === '4';
  }

  /**
   * Executes the operation: isChequeModeSelected
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  isChequeModeSelected(): boolean {
    return this.ClassDivisionForm.get('PaymentMode')?.value?.toString() === '3';
  }

  /**
   * Executes the operation: setTransactionValidatorsByPaymentMode
   * Parameters: selectedMode: string
   * Rationale: Standard operational controller for the active view.
   */
  private setTransactionValidatorsByPaymentMode(selectedMode: string) {
    const transactionControl = this.ClassDivisionForm.get('TransactionID');
    const chequeControl = this.ClassDivisionForm.get('ChequeNo');
    const transactionIdPattern = /^[A-Za-z0-9_-]{8,30}$/;
    const chequeNoPattern = /^\d{6}$/;

    if (!transactionControl || !chequeControl) return;

    if (selectedMode === '2' || selectedMode === '4') {
      transactionControl.setValidators([Validators.required, Validators.pattern(transactionIdPattern)]);
      chequeControl.clearValidators();
      chequeControl.patchValue('');
      chequeControl.setErrors(null);
      chequeControl.markAsUntouched();
      chequeControl.markAsPristine();
      chequeControl.updateValueAndValidity();
      transactionControl.updateValueAndValidity();
      return;
    }

    if (selectedMode === '3') {
      chequeControl.setValidators([Validators.required, Validators.pattern(chequeNoPattern)]);
      chequeControl.updateValueAndValidity();
    } else {
      chequeControl.clearValidators();
      chequeControl.patchValue('');
      chequeControl.setErrors(null);
      chequeControl.markAsUntouched();
      chequeControl.markAsPristine();
      chequeControl.updateValueAndValidity();
    }

    transactionControl.clearValidators();
    transactionControl.patchValue('');
    transactionControl.setErrors(null);
    transactionControl.markAsUntouched();
    transactionControl.markAsPristine();
    transactionControl.updateValueAndValidity();
  }

  /**
   * Executes the operation: CollectFee
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  CollectFee() {
    const amountControl = this.ClassDivisionForm.get('AmountToBePaid');
    this.validateAmountAgainstDue(amountControl?.value);

    this.ClassDivisionForm.markAllAsTouched();
    if (this.ClassDivisionForm.invalid) {
      return;
    }

    const data = {
      ReceiptNo: this.receiptNo,
      SchoolID: this.ClassDivisionForm.get('School')?.value,
      AcademicYear: this.ClassDivisionForm.get('AcademicYear')?.value,
      Class: this.ClassDivisionForm.get('Class')?.value,
      Division: this.ClassDivisionForm.get('Division')?.value,
      Student: this.ClassDivisionForm.get('ClassTeacher')?.value, 
      FeeCategory: this.ClassDivisionForm.get('FeeCategory')?.value, 
      AmountPaid: this.ClassDivisionForm.get('AmountToBePaid')?.value.toString(),
      PaymentDate: this.paymentDate,  
      PaymentMode: this.ClassDivisionForm.get('PaymentMode')?.value, 
      TransactionID: this.isChequeModeSelected()
        ? this.ClassDivisionForm.get('ChequeNo')?.value
        : this.ClassDivisionForm.get('TransactionID')?.value, 
      Flag: '1'
    };

    this.apiurl.post("Tbl_FeeCollection_CRUD_Operations", data).subscribe({
      next: (response: any) => {
        if (this.isApiSuccess(response)) {
          this.IsAddNewClicked=!this.IsAddNewClicked;
          this.isModalOpen = true;
          this.AminityInsStatus = response?.message || response?.Message || "Fee collected successfully!";
          this.ClassDivisionForm.reset();
          this.ClassDivisionForm.markAsPristine();
          this.showFeeTable = false;
          this.showFeeTableAfterFeeCategory = false;
          this.feesList = [];
          this.totalAmount = 0;
          this.DueAmount = 0;
        } else {
          this.AminityInsStatus = response?.message || response?.Message || "Unable to collect fee.";
          this.isModalOpen = true;
        }
      },
      error: (err:any) => {
        if (err.status === 400 && (err.error?.message || err.error?.Message)) {
          this.AminityInsStatus = err.error.message || err.error.Message;
        } else if (err.status === 500 && (err.error?.message || err.error?.Message)) {
          this.AminityInsStatus = err.error.message || err.error.Message;
        } else {
          this.AminityInsStatus = "Unexpected error occurred.";
        }
        this.isModalOpen = true;
      },
      complete: () => {
      }
    });
  }

  private async fetchStudentByAdmissionNo(admissionNo: string): Promise<any | null> {
    try {
      const response = await firstValueFrom(
        this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', {
          AdmissionNo: admissionNo,
          Flag: '4'
        })
      );
      const responseData = response?.data;
      if (Array.isArray(responseData)) return responseData[0] ?? null;
      if (responseData && typeof responseData === 'object') return responseData;
      if (Array.isArray(response)) return response[0] ?? null;
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Executes the operation: SubmitFilterList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  async SubmitFilterList(){
    const requestToken = ++this.admissionLookupRequestToken;
    this.amountPaid = 0;
    this.receiptNo = '';
    this.paymentDate = '';
    this.selectedStudentName = '';
    this.selectedAdmissionNo = '';
    this.selectedClassInfo = '';
    this.admissionLookupNoData = false;
    this.previousAdvance = 0;
    this.currentAdvance = 0;

    const enteredAdmissionNo = (this.ClassDivisionForm.get('AdmissionNo')?.value || '').toString().trim();
    const shouldSearchByAdmission = !!enteredAdmissionNo;
    this.isAdmissionLookupMode = false;
    this.unlockHierarchyFields();
    if (shouldSearchByAdmission) {
      // For Admission No lookup, never reuse previous hierarchy context.
      this.AdminselectedSchoolID = '';
      this.AdminselectedAcademivYearID = '';
      this.AdminselectedClassID = '';
      this.AdminselectedClassDivisionID = '';
      this.ClassDivisionForm.get('School')?.patchValue('0');
      this.ClassDivisionForm.get('AcademicYear')?.patchValue('0');
      this.ClassDivisionForm.get('Class')?.patchValue('0');
      this.ClassDivisionForm.get('Division')?.patchValue('0');
      this.ClassDivisionForm.get('ClassTeacher')?.patchValue('0');
      this.academicYearList = [];
      this.SyllabusList = [];
      this.DivisionsList = [];
      this.ClassTeachersList = [];
      this.selectedStudentID = enteredAdmissionNo;
    }

    if (this.selectedStudentID && this.selectedStudentID != "0") {
      this.showFeeTable = true;
      const today = new Date();
      this.paymentDate = this.formatDateYYYYMMDD(today.toISOString());
    } else {
      this.showFeeTable = false;
    }

    if (!this.selectedStudentID || this.selectedStudentID === "0") {
      this.selectedStudentName = '';
      return;
    }

    let studentFromAdmission: any = null;
    if (shouldSearchByAdmission) {
      studentFromAdmission = await this.fetchStudentByAdmissionNo(this.selectedStudentID);
      if (requestToken !== this.admissionLookupRequestToken) return;
    }

    // If Admission No mode is used, only proceed when student lookup succeeds.
    if (shouldSearchByAdmission && !studentFromAdmission) {
      this.resetFeePreviewState(true);
      this.showFeeTable = false;
      this.admissionLookupNoData = true;
      return;
    }

    if (studentFromAdmission) {
      const first = studentFromAdmission.firstName ?? '';
      const middle = studentFromAdmission.middleName ?? '';
      const last = studentFromAdmission.lastName ?? '';

      this.selectedStudentName = `${first} ${middle} ${last}`.replace(/\s+/g, ' ').trim();
      this.selectedAdmissionNo = (studentFromAdmission.admissionNo ?? studentFromAdmission.AdmissionNo ?? enteredAdmissionNo).toString();
      this.selectedStudentID = this.selectedAdmissionNo;

      this.AdminselectedSchoolID = (studentFromAdmission.schoolID ?? studentFromAdmission.schoolId ?? studentFromAdmission.SchoolID ?? '').toString();
      this.AdminselectedAcademivYearID = (studentFromAdmission.academicYear ?? studentFromAdmission.academicYearID ?? studentFromAdmission.AcademicYear ?? '').toString();
      this.AdminselectedClassID = (studentFromAdmission.class ?? studentFromAdmission.classID ?? studentFromAdmission.Class ?? '').toString();
      this.AdminselectedClassDivisionID = (studentFromAdmission.division ?? studentFromAdmission.divisionID ?? studentFromAdmission.Division ?? '').toString();

      await this.FetchAcademicYearsListAsync();
      if (requestToken !== this.admissionLookupRequestToken) return;
      await this.FetchClassListAsync();
      if (requestToken !== this.admissionLookupRequestToken) return;
      await this.FetchDivisionsListAsync();
      if (requestToken !== this.admissionLookupRequestToken) return;
      await this.FetchClassStudentsListAsync();
      if (requestToken !== this.admissionLookupRequestToken) return;

      this.ClassDivisionForm.get('School')?.patchValue(this.AdminselectedSchoolID || '0');
      this.ClassDivisionForm.get('AcademicYear')?.patchValue(this.AdminselectedAcademivYearID || '0');
      this.ClassDivisionForm.get('Class')?.patchValue(this.AdminselectedClassID || '0');
      this.ClassDivisionForm.get('Division')?.patchValue(this.AdminselectedClassDivisionID || '0');
      this.ClassDivisionForm.get('ClassTeacher')?.patchValue(this.selectedAdmissionNo || '0');
      this.isAdmissionLookupMode = true;
      this.lockHierarchyFields();

      const className = studentFromAdmission.className || studentFromAdmission.syllabusClassName || '';
      const divisionName = studentFromAdmission.classDivisionName || studentFromAdmission.divisionName || '';
      this.selectedClassInfo = className && divisionName ? `${className} - ${divisionName}` : className || divisionName || '';
    }

    const student = this.ClassTeachersList.find(s => s.AdmissionNo == this.selectedStudentID);

    if (!studentFromAdmission && student) {
      this.selectedStudentName = student.Name;
      this.selectedAdmissionNo = student.AdmissionNo || '';
    } else if (!studentFromAdmission) {
      this.selectedStudentName = '';
      this.selectedAdmissionNo = this.selectedStudentID;
    }

    // Build class info like "ClassName - DivisionName"
    if (!studentFromAdmission) {
      const selectedClassId = this.ClassDivisionForm.get('Class')?.value;
      const selectedDivisionId = this.ClassDivisionForm.get('Division')?.value;
      const classObj = this.SyllabusList.find(c => c.ID == selectedClassId);
      const divisionObj = this.DivisionsList.find(d => d.ID == selectedDivisionId);
      const className = classObj?.Name || '';
      const divisionName = divisionObj?.Name || '';
      this.selectedClassInfo = className && divisionName ? `${className} - ${divisionName}` : className || divisionName || '';
    }
    // Load dependent data only after fresh student context is ready.
    this.FetchReciptNo();
    this.FetchFeeCategoryList();
  }

  /**
   * Handles form submission: Validates input fields and transmits data payloads.
   */
  async onSubmit(): Promise<void> {
    await this.SubmitFilterList();
  }

  /**
   * Executes the operation: onCancelClick
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  onCancelClick(): void {
    this.suppressAdmissionNoWatcher = true;
    this.ClassDivisionForm.get('AdmissionNo')?.patchValue('', { emitEvent: false });
    this.suppressAdmissionNoWatcher = false;
    this.clearAdmissionDrivenSelectionAndUnlock();
  }

  /**
   * Executes the operation: onFeeCategoryChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onFeeCategoryChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if(schoolID=="0"){
      this.AdminselectedSchoolFeeCategoryID="";
      this.showFeeTableAfterFeeCategory = false;
      this.feesList = [];
      this.DueAmount = 0;
      this.totalAmount = 0;
      this.ClassDivisionForm.get('AmountToBePaid')?.patchValue('', { emitEvent: false });
    }else{
      this.AdminselectedSchoolFeeCategoryID = schoolID;
      this.showFeeTableAfterFeeCategory = true;
    } 
    this.loadStudentFees();
  };

  DueAmount: number = 0;

  /**
   * Executes the operation: loadStudentFees
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  loadStudentFees() {
    const payload = {
      SchoolID: this.AdminselectedSchoolID,
      AcademicYear: this.AdminselectedAcademivYearID,
      Class: this.AdminselectedClassID,
      Division: this.AdminselectedClassDivisionID,
      Student: this.selectedStudentID,
      FeeCategory: this.AdminselectedSchoolFeeCategoryID,
      Flag: '10'
    };

    this.apiurl.post<any>('Tbl_FeeDiscount_CRUD_Operations', payload)
      .subscribe((response: any) => {

        if (response && Array.isArray(response.data)) {

          this.feesList = response.data.map((item: any) => ({
            FeeCategoryName: item.feeCategoryName,
            TotalFee: item.totalFee,
            TotalDiscount: item.totalDiscount,
            TotalPaid: item.totalPaid,
            RemainingAmount: item.remainingAmount
          }));
          this.DueAmount=this.feesList.reduce((sum, item) => sum + Number(item.RemainingAmount), 0);
        } else {
          this.feesList = [];
        }

      });
  }

  /**
   * Executes the operation: FetchReciptNo
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchReciptNo() {
    const requestData = { 
      SchoolID: this.AdminselectedSchoolID,
      AcademicYear: this.AdminselectedAcademivYearID,
      Class: this.AdminselectedClassID,
      Division: this.AdminselectedClassDivisionID,
      Student: this.selectedStudentID,
      Flag: '12'
    };
  
    this.apiurl.post<any>('Tbl_FeeDiscount_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response?.data?.length > 0) {
            this.receiptNo = response.data[0].newRecordNo; // adjust field name
          } else {
            this.receiptNo = '';
          }
        },
        () => {
          this.receiptNo = '';
        }
      );
  }

  /**
   * Executes the operation: FetchFeeCategoryList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchFeeCategoryList(){
    this.ClassDivisionForm.get('FeeCategory')?.patchValue('0');
    const requestData = { 
      SchoolID:this.AdminselectedSchoolID,
      AcademicYear:this.AdminselectedAcademivYearID,
      Class:this.AdminselectedClassID,
      Division:this.AdminselectedClassDivisionID,
      Student:this.selectedStudentID,
      Flag: '11' };

    this.apiurl.post<any>('Tbl_FeeDiscount_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.feeCategoryList = response.data.map((item: any) => {
              return {
                ID: item.id,
                Name: item.feeCategoryName
              };
            });
          } else {
            this.feeCategoryList = [];
          }
        },
        (error) => {
          this.feeCategoryList = [];
        }
      );
  }

  totalAmount: number = 0;

  /**
   * Executes the operation: updateTotal
   * Parameters: event: any
   * Rationale: Standard operational controller for the active view.
   */
  updateTotal(event: any) {
    this.totalAmount = Number(event.target.value || 0);
    const amountControl = this.ClassDivisionForm.get('AmountToBePaid');
    this.validateAmountAgainstDue(event.target.value);
  }

  /**
   * Executes the operation: validateAmountAgainstDue
   * Parameters: inputValue: any
   * Rationale: Standard operational controller for the active view.
   */
  private validateAmountAgainstDue(inputValue: any): void {
    const amountControl = this.ClassDivisionForm.get('AmountToBePaid');
    if (!amountControl) return;

    const enteredAmount = Number(inputValue || 0);

    if (!Number.isNaN(enteredAmount) && enteredAmount > this.DueAmount) {
      amountControl.setErrors({ ...(amountControl.errors || {}), exceedsDue: true });
      return;
    }

    if (amountControl.hasError('exceedsDue')) {
      const remainingErrors = { ...(amountControl.errors || {}) };
      delete remainingErrors.exceedsDue;
      amountControl.setErrors(Object.keys(remainingErrors).length ? remainingErrors : null);
    }
  }

  // printReceipt() {
  //   const content = document.getElementById('receiptSection')?.innerHTML;

  // const win = window.open('', '', 'width=900,height=700');

  // win?.document.write(`
  //   <html>
  //     <head>
  //       <title>Fee Receipt</title>
  //       <style>
  //         body { font-family: Arial; padding: 20px; }
  //         .receipt-box { border: 2px solid #000; padding: 20px; }
  //         .receipt-top { display: flex; justify-content: space-between; }
  //         .receipt-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  //         .receipt-table th, .receipt-table td {
  //           border: 1px solid #000;
  //           padding: 8px;
  //         }
  //         .receipt-table th { background-color: #f2f2f2; }
  //         .section-title { margin-top: 15px; font-weight: bold; }
  //       </style>
  //     </head>
  //     <body onload="window.print(); window.close();">
  //       ${content}
  //     </body>
  //   </html>
  // `);

  // win?.document.close();
  // }

  /**
   * Executes the operation: printReceipt
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  printReceipt() {
    const content = document.getElementById('receiptSection')?.innerHTML;
  
    const win = window.open('', '', 'width=900,height=700');
  
    win?.document.write(`
      <html>
        <head>
          <title>Fee Receipt</title>
          <style>
            @page {
              size: A4;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            body {
              margin: 0;
              padding: 0;
              font-family: "Segoe UI", Arial, sans-serif;
              color: #111;
              background: #fff;
              font-size: 11pt;
              line-height: 1.35;
            }

            .receipt-box {
              border: 1.5px solid #111;
              border-radius: 8px;
              padding: 14px;
              max-width: 100%;
              page-break-inside: avoid;
            }

            .header {
              position: relative;
              min-height: 78px;
              margin-bottom: 8px;
              padding-bottom: 8px;
              border-bottom: 1.5px solid #111;
            }

            .logo {
              position: absolute;
              left: 0;
              top: 0;
            }

            .logo img {
              height: 62px;
              width: auto;
              object-fit: contain;
            }

            .header-center {
              text-align: center;
              padding: 0 72px;
            }

            .header-center h2 {
              margin: 0;
              font-size: 18pt;
              font-weight: 700;
              letter-spacing: 0.2px;
              color: #111;
            }

            .header-center h3 {
              margin: 3px 0 0;
              font-size: 11pt;
              font-weight: 700;
              letter-spacing: 1.4px;
              color: #111;
            }

            .receipt-top {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              margin: 6px 0 4px;
              font-size: 10.5pt;
              font-weight: 600;
            }

            hr {
              border: 0;
              border-top: 1px solid #b5b5b5;
              margin: 10px 0;
            }

            .section-title {
              margin: 0 0 6px;
              font-size: 11pt;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.7px;
              color: #111;
            }

            .receipt-left-line {
              margin: 3px 0;
              font-size: 10.5pt;
              word-break: break-word;
            }

            .receipt-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
              page-break-inside: avoid;
            }

            .receipt-table th,
            .receipt-table td {
              border: 1px solid #111;
              padding: 7px 8px;
              font-size: 10pt;
              vertical-align: middle;
            }

            .receipt-table th {
              font-weight: 700;
              text-align: left;
              background: #f2f2f2;
            }

            .receipt-footer {
              page-break-inside: avoid;
            }

            .note {
              margin: 4px 0 0;
              font-size: 9.5pt;
              color: #222;
            }
          </style>
        </head>
  
        <body onload="window.print(); window.close();">
          ${content}
        </body>
      </html>
    `);
  
    win?.document.close();
  }

  /**
   * Executes the operation: pageStartIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageStartIndex(): number {
    return this.ClassDivisionCount === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
  }

  /**
   * Executes the operation: pageEndIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.ClassDivisionCount);
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
    this.ClassDivisionForm.reset();
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

  schoolLogoFromDb: any = null;
  logoUrl: string = 'Images/Logo1.jpg';
}
