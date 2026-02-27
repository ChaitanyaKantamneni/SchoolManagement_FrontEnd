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
  selector: 'app-fare',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './fare.component.html',
  styleUrls: ['./fare.component.css']
})
export class FareComponent extends BasePermissionComponent{
  pageName = 'Fares';

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
    this.FetchSchoolsList();
    this.FetchInitialData();    
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

  RouteChange(routeId: any) {
    this.FetchStopsListBySelectedRouteList(routeId);
  }


  FetchRoutesList() {
    const requestData = { Flag: '3' };

    this.apiurl.post<any>('Tbl_Route_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.RouteList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.name,
                IsActive: isActiveString
              };
            });            
          } else {
            this.RouteList = [];
          }
        },
        (error) => {
          this.RouteList = [];
        }
      );
  };

  FetchStopsListBySelectedRouteList(Route:any ) {
    const requestData = { Route,Flag: '3' };

    this.apiurl.post<any>('Tbl_Stops_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.StopList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.stopName,
                IsActive: isActiveString
              };
            });            
          } else {
            this.StopList = [];
          }
        },
        (error) => {
          this.StopList = [];
        }
      );
  };

  FetchBusList() {
    const requestData = { Flag: '3' };

    this.apiurl.post<any>('Tbl_Bus_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.BusList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.name,
                IsActive: isActiveString
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

  IsAddNewClicked:boolean=false;
  IsActiveStatus:boolean=false;
  ViewSyllabusClicked:boolean=false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;
  SyllabusList: any[] =[];
  RouteList: any[] =[];
  StopList: any[] =[];
  BusList:any[] =[];
  isViewMode = false;
  viewSyllabus: any = null;
  AminityInsStatus: any = '';
  isModalOpen = false;
  isViewModalOpen= false;
  SyllabusCount: number = 0;
  ActiveUserId:string=localStorage.getItem('email')?.toString() || '';
  roleId = localStorage.getItem('RollID');

  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
  lastCreatedDate: string | null = null;
  lastID: number | null = null;

  sortColumn: string = 'Amount'; 
  sortDirection: 'asc' | 'desc' = 'desc';
  editclicked:boolean=false;
  schoolList: any[] = [];
  selectedSchoolID: string = '';
  SchoolSelectionChange:boolean=false;
  academicYearList:any[] = [];
  AdminselectedSchoolID:string = '';
  AdminselectedAcademivYearID:string = '';

  SyllabusForm: any = new FormGroup({
    ID: new FormControl(),
    SchoolID: new FormControl(),
    Route: new FormControl(0, Validators.min(1)),
    Stop: new FormControl(0, Validators.min(1)),
    Bus: new FormControl(0, Validators.min(1)),
    School: new FormControl(),
    Amount: new FormControl('', [Validators.required,Validators.pattern('^[0-9]+$')]),
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


  // protected override get isAdmin(): boolean {
  //   return this.roleId === '1';
  // }

  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  FetchAcademicYearCount(isSearch: boolean) {
    let SchoolIdSelected = '';

    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    return this.apiurl.post<any>('Tbl_Fare_CRUD_Operations', {
      Flag: isSearch ? '8' : '6',
      SchoolID:SchoolIdSelected,
      Amount: isSearch ? this.searchQuery.trim() : null
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
          SchoolID:SchoolIdSelected,
          ...extra
        };

        if (isSearch) payload.Amount = this.searchQuery.trim();

        this.apiurl.post<any>('Tbl_Fare_CRUD_Operations', payload).subscribe({
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
    this.SyllabusList = (response.data || []).map((item: any) => ({
      ID: item.id,
      SchoolName:item.schoolName,
      RouteID: item.routeID,
      StopID: item.stopID,
      BusID: item.busID,
      Amount: item.amount,
      RouteName:item.routeName,
      StopName:item.stopName,
      BusName:item.busName,
      // Description:item.Description,
      IsActive: item.isActive === "True" ? 'Active' : 'InActive',
      AcademicYearName:item.academicYearName,

    }));
  };

  AddNewClicked(){
     if (this.isAdmin) {
      this.SyllabusForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
    } else {
      this.SyllabusForm.get('School')?.clearValidators();
    }
    if(this.AdminselectedSchoolID==''){
      this.FetchAcademicYearsList();
    }
    this.FetchRoutesList();
    this.FetchBusList();
    this.SyllabusForm.reset();

    this.SyllabusForm.get('School').patchValue('0');
    this.SyllabusForm.get('AcademicYear').patchValue('0');


    this.SyllabusForm.get('Route').patchValue('0');
    this.SyllabusForm.get('Stop').patchValue('0');
    this.SyllabusForm.get('Bus').patchValue('0');
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewSyllabusClicked=false;
  };

  SubmitSyllabus(){
    if(this.SyllabusForm.invalid){
      this.SyllabusForm.markAllAsTouched();
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        // SchoolID: this.SyllabusForm.get('ID')?.value,
        RouteID: this.SyllabusForm.get('Route')?.value,
        StopID: this.SyllabusForm.get('Stop')?.value,
        BusID: this.SyllabusForm.get('Bus')?.value,
        Amount: this.SyllabusForm.get('Amount')?.value,
        SchoolID: this.SyllabusForm.get('School')?.value,

        AcademicYear: this.SyllabusForm.get('AcademicYear')?.value,

        IsActive:IsActiveStatusNumeric,
        Flag: '1'
      };

      this.apiurl.post("Tbl_Fare_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            this.isModalOpen = true;
            this.AminityInsStatus = "Fare Details Submitted!";
            this.SyllabusForm.reset();
            this.SyllabusForm.markAsPristine();
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

  formatTime(time: string | null): string | null {
    if (!time) return null;
    return time.length === 5 ? time + ":00" : time; // converts HH:mm → HH:mm:ss
  }


  FetchSyllabusDetByID(SyllabusID: string, mode: 'view' | 'edit') {
    const data = {
      ID: SyllabusID,
      Flag: "4"
    };

    this.apiurl.post<any>("Tbl_Fare_CRUD_Operations", data).subscribe(
      (response: any) => {

        const item = response?.data?.[0];
        if (!item) {
          this.SyllabusForm.reset();
          this.viewSyllabus = null;
          return;
        }

        this.FetchStopsListBySelectedRouteList(item.routeID);
        const isActive = item.isActive === "True";

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewSyllabus = {
            ID: item.id,
            SchoolName:item.schoolName,
            RouteID: item.routeID,
            StopID: item.stopID,
            BusID: item.busID,
            Amount: item.amount,
            RouteName:item.routeName,
            StopName:item.stopName,
            BusName:item.busName,
            AcademicYearName:item.academicYearName,
            IsActive: isActive
          };
          this.isViewModalOpen = true;
        }

        if (mode === 'edit') {
          this.isViewMode = false;
          this.SyllabusForm.patchValue({
            ID: item.id,
            // SchoolName: schoolMap[item.schoolID] ?? `School-${item.schoolID}`,
            // SchoolName:item.schoolName,
            School:item.schoolID,
            AcademicYear:item.academicYear,
            Route: item.routeID,
            Stop: item.stopID,
            Bus: item.busID,
            Amount: item.amount
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

  UpdateSyllabus(){
    debugger
    if(this.SyllabusForm.invalid){
      // console.log('this.SyllabusForm',this.SyllabusForm);
      this.SyllabusForm.markAllAsTouched();
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        ID:this.SyllabusForm.get('ID')?.value || '',
        RouteID: this.SyllabusForm.get('Route')?.value,
        StopID: this.SyllabusForm.get('Stop')?.value,
        BusID: this.SyllabusForm.get('Bus')?.value,
        Amount: this.SyllabusForm.get('Amount')?.value,
        SchoolID: this.SyllabusForm.get('School')?.value,

        IsActive:IsActiveStatusNumeric,
        AcademicYear: this.SyllabusForm.get('AcademicYear')?.value,
        Flag: '5'
      };

      this.apiurl.post("Tbl_Fare_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            this.isModalOpen = true;
            this.AminityInsStatus = "Fare Details Updated!";
            this.SyllabusForm.reset();
            this.SyllabusForm.markAsPristine();
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
    this.FetchInitialData();
  };

  editreview(SyllabusID: string): void {
    this.editclicked=true;
    this.FetchRoutesList();
    this.FetchBusList();
    this.FetchSyllabusDetByID(SyllabusID,'edit');
    this.ViewSyllabusClicked=true;
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



  

  viewReview(SyllabusID: string): void {
    this.FetchSyllabusDetByID(SyllabusID,'view');
    this.isViewModalOpen=true;
  };
  onAdminSchoolChange(event: Event) {
    this.academicYearList=[];
    this.SyllabusForm.get('AcademicYear').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if(schoolID=="0"){
      this.AdminselectedSchoolID="";
    }else{
      this.AdminselectedSchoolID = schoolID;
    }   
    this.FetchAcademicYearsList();
  };

}
