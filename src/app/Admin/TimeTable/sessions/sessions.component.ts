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
  selector: 'app-sessions',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './sessions.component.html',
  styleUrls: ['./sessions.component.css']
})
/**
 * Class Responsibility: Handles view logic and user interactions for SessionsComponent.
 */
export class SessionsComponent extends BasePermissionComponent {
  pageName = 'Sessions';
  
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
      this.FetchInitialData();
    };
  
    IsAddNewClicked:boolean=false;
    IsActiveStatus:boolean=false;
    ViewClassClicked:boolean=false;
    currentPage = 1;
    pageSize = 5;
    visiblePageCount: number = 3;
    searchQuery: string = '';
    private searchTimer: any;
    private readonly SEARCH_MIN_LENGTH = 1;
    private readonly SEARCH_DEBOUNCE = 300;
    ClassList: any[] =[];
    ClassCount: number = 0;
    SyllabusList: any[] =[];
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
  
    sortColumn: string = 'Day'; 
    sortDirection: 'asc' | 'desc' = 'desc';
    editclicked:boolean=false;
    schoolList: any[] = [];
    selectedSchoolID: string = '';
    SchoolSelectionChange:boolean=false;
    academicYearList:any[] = [];
    AdminselectedSchoolID:string = '';
    AdminselectedAcademivYearID:string = '';
    selectedAcademicYearID: string = '';
    SchoolAcademicYearChange: boolean = false;
    AdminSelectedActiveAcademicYearID: string = sessionStorage.getItem('ActiveAcademicYearID') || '';
  
    ClassForm: any = new FormGroup({
      ID: new FormControl(),
      Session:new FormControl('', [Validators.required,Validators.pattern('^[a-zA-Z ]+$')]),
      StartTime: new FormControl('', Validators.required),
      EndTime: new FormControl('', Validators.required),
      School: new FormControl(),
      AcademicYear: new FormControl(0,[Validators.required,Validators.min(1)])
    });

  /**
   * Executes the operation: allowAlphaAndSpecial
   * Parameters: event: KeyboardEvent
   * Rationale: Standard operational controller for the active view.
   */
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
  
  /**
   * Executes the operation: FetchAcademicYearCount
   * Parameters: isSearch: boolean
   * Rationale: Standard operational controller for the active view.
   */
    FetchAcademicYearCount(isSearch: boolean) {
      let SchoolIdSelected = '';
      let AcademicYearIdSelected = '';
  
      if (this.SchoolSelectionChange) {
        SchoolIdSelected = this.selectedSchoolID.trim();
      }

      if (this.SchoolAcademicYearChange) {
        AcademicYearIdSelected = this.selectedAcademicYearID.trim();
      }
  
      const payload: any = {
        Flag: isSearch ? '8' : '6',
        SchoolID:SchoolIdSelected,
        Session: isSearch ? this.searchQuery.trim() : null
      };

      if (!this.isAdmin) {
        payload.AcademicYear = this.AdminSelectedActiveAcademicYearID;
      } else if (this.isAdmin && this.SchoolAcademicYearChange) {
        payload.AcademicYear = AcademicYearIdSelected;
      }

      return this.apiurl.post<any>('Tbl_Session_CRUD_Operations', payload);
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
      let AcademicYearIdSelected = '';
  
      if (this.SchoolSelectionChange) {
        SchoolIdSelected = this.selectedSchoolID.trim();
      }

      if (this.SchoolAcademicYearChange) {
        AcademicYearIdSelected = this.selectedAcademicYearID.trim();
      }
  
      const cursor =
        !extra.offset && this.currentPage > 1
          ? this.pageCursors[this.currentPage - 2] || null
          : null;
  
      this.loader.show();
  
      this.FetchAcademicYearCount(isSearch).subscribe({
        next: (countResp: any) => {
          this.ClassCount = countResp?.data?.[0]?.totalcount ?? 0;
  
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

          if (!this.isAdmin) {
            payload.AcademicYear = this.AdminSelectedActiveAcademicYearID;
          } else if (this.isAdmin && this.SchoolAcademicYearChange) {
            payload.AcademicYear = AcademicYearIdSelected;
          }
  
          if (isSearch) payload.Session = this.searchQuery.trim();
  
          this.apiurl.post<any>('Tbl_Session_CRUD_Operations', payload).subscribe({
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
              this.ClassList = [];
              this.loader.hide();
            }
          });
        },
        error: () => {
          this.ClassList = [];
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
      this.ClassList = (response.data || []).map((item: any) => ({
        ID: item.id,
        Session: item.session,
        StartTime: item.startTime,
        EndTime: item.endTime,
        SchoolName:item.schoolName,
        AcademicYearName:item.academicYearName,
        IsActive: item.isActive === "True" ? 'Active' : 'InActive'
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
        // const schoolFromSession = sessionStorage.getItem('SchoolID') || localStorage.getItem('SchoolID') || '';
        // this.AdminselectedSchoolID = schoolFromSession;
        this.FetchAcademicYearsList();
        if(!this.isAdmin){
          this.ClassForm.get('AcademicYear').patchValue(this.AdminSelectedActiveAcademicYearID);
        }  
      }
      this.IsAddNewClicked=!this.IsAddNewClicked;
      this.IsActiveStatus=true;
      this.ViewClassClicked=false;
    };
  
  /**
   * Executes the operation: FetchSyllabusList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    FetchSyllabusList() {
      const requestData = { Flag: '3' };
  
      this.apiurl.post<any>('Tbl_WorkingDays_CRUD_Operations', requestData)
        .subscribe(
          (response: any) => {
            if (response && Array.isArray(response.data)) {
              this.SyllabusList = response.data.map((item: any) => {
                const isActiveString = item.isActive === "1" ? "Active" : "InActive";
                return {
                  ID: item.id,
                  Name: item.name
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

    formatTime(time: string | null): string | null {
      if (!time) return null;
      return time.length === 5 ? time + ":00" : time; // converts HH:mm → HH:mm:ss
    }

  
  /**
   * Executes the operation: SubmitClass
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    SubmitClass(){
      // if(this.ClassForm.invalid){
      //   this.ClassForm.markAllAsTouched();
      //   return;
      // }
      // else{
        const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
        const data: any = {
          Session: this.ClassForm.get('Session')?.value,
          StartTime: this.formatTime(this.ClassForm.get('StartTime')?.value),
          EndTime: this.formatTime(this.ClassForm.get('EndTime')?.value),
          SchoolID: this.ClassForm.get('School')?.value,
          AcademicYear: this.ClassForm.get('AcademicYear')?.value,
          IsActive:IsActiveStatusNumeric,
          Flag: '1'
        };

        if (!this.isAdmin) {
          data.AcademicYear = this.AdminSelectedActiveAcademicYearID;
        }
  
        this.apiurl.post("Tbl_Session_CRUD_Operations", data).subscribe({
          next: (response: any) => {
            if (response.statusCode === 200) {
              this.IsAddNewClicked=!this.IsAddNewClicked;
              this.isModalOpen = true;
              this.AminityInsStatus = "Working Day Details Submitted!";
              this.ClassForm.reset();
              this.ClassForm.get('AcademicYear').patchValue(sessionStorage.getItem('ActiveAcademicYearID') || '');
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
      // }
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
  
      this.apiurl.post<any>("Tbl_Session_CRUD_Operations", data).subscribe(
        (response: any) => {
  
          const item = response?.data?.[0];
          if (!item) {
            this.ClassForm.reset();
            this.viewSyllabus = null;
            return;
          }
  
          const isActive = item.isActive === "True";
  
          if (mode === 'view') {
            this.isViewMode = true;
            this.viewSyllabus = {
              ID: item.id,
              Session: item.session,
              EndTime:item.endTime,
              StartTime: item.startTime,
              SchoolName:item.schoolName,
              AcademicYearName:item.academicYearName,
              IsActive: isActive
            };
            this.isViewModalOpen = true;
          }
  
          if (mode === 'edit') {
            this.isViewMode = false;
            this.ClassForm.patchValue({
              ID: item.id,
              Session: item.session,
              EndTime:item.endTime,
              StartTime: item.startTime,
              School:item.schoolID,
              AcademicYear:item.academicYear
            });
            this.AdminselectedSchoolID=item.schoolID;
            this.AdminselectedAcademivYearID=item.academicYear;
            this.FetchAcademicYearsList();
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
        const data: any = {
          ID:this.ClassForm.get('ID')?.value || '',
          Session: this.ClassForm.get('Session')?.value,
          StartTime: this.formatTime(this.ClassForm.get('StartTime')?.value),
          EndTime: this.formatTime(this.ClassForm.get('EndTime')?.value),
          SchoolID: this.ClassForm.get('School')?.value,
          AcademicYear: this.ClassForm.get('AcademicYear')?.value,
          IsActive:IsActiveStatusNumeric,
          Flag: '5'
        };

        if (!this.isAdmin) {
          data.AcademicYear = this.AdminSelectedActiveAcademicYearID;
        }
  
        this.apiurl.post("Tbl_Session_CRUD_Operations", data).subscribe({
          next: (response: any) => {
            if (response.statusCode === 200) {
              this.IsAddNewClicked=!this.IsAddNewClicked;
              this.isModalOpen = true;
              this.AminityInsStatus = "Working Day Details Updated!";
              this.ClassForm.reset();
              this.ClassForm.get('AcademicYear').patchValue(sessionStorage.getItem('ActiveAcademicYearID') || '');
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
   * Executes the operation: onRowsCountChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
    onRowsCountChange() {
      this.currentPage = 1;
      this.pageCursors = [];
      this.FetchInitialData();
    }
  
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
      this.academicYearList=[];
      this.ClassForm.get('AcademicYear').patchValue(sessionStorage.getItem('ActiveAcademicYearID') || '');
      const target = event.target as HTMLSelectElement;
      const schoolID = target.value;
      if(schoolID=="0"){
        this.AdminselectedSchoolID="";
      }else{
        this.AdminselectedSchoolID = schoolID;
      }   
      this.FetchAcademicYearsList();
    };

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
}
