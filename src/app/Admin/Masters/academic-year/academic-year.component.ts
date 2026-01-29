import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { tap } from 'rxjs';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent  } from '../../../shared/base-crud.component';
import { SchoolCacheService } from '../../../Services/school-cache.service';
import { LoaderService } from '../../../Services/loader.service';

@Component({
  selector: 'app-academic-year',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './academic-year.component.html',
  styleUrls: ['./academic-year.component.css']
})
export class AcademicYearComponent extends BasePermissionComponent {
pageName = 'AcademicYear';
  IsAddNewClicked = false;
  IsActiveStatus = false;
  ViewAcademicYearClicked = false;

  currentPage = 1;
  pageSize = 5;
  visiblePageCount = 3;
  searchQuery = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;

  AcademicYearList: any[] = [];
  AminityInsStatus = '';
  isModalOpen = false;
  AcademicYearCount = 0;

  ActiveUserId = localStorage.getItem('SchoolID')?.toString() || '';
  roleId = localStorage.getItem('RollID');

  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
  lastCreatedDate: string | null = null;
  lastID: number | null = null;

  sortColumn: string = 'Name'; 
  sortDirection: 'asc' | 'desc' = 'desc';
  editclicked:boolean=false;
  schoolList: any[] = [];
  selectedSchoolID: string = '';
  SchoolSelectionChange:boolean=false;


  AcademicYearForm = new FormGroup({
    ID: new FormControl(),
    Name: new FormControl('', Validators.required),
    StartDate: new FormControl('', Validators.required),
    EndDate: new FormControl('', Validators.required),
    Description: new FormControl()
  });

  constructor(
    router: Router,
    private apiurl: ApiServiceService,
    private schoolCache: SchoolCacheService,
    public loader: LoaderService,
    menuService: MenuServiceService
  ) {
super(menuService, router);
}

  ngOnInit(): void {
    this.checkViewPermission();
    this.SchoolSelectionChange=false;
    this.FetchSchoolsList();
    this.FetchInitialData();
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

  protected override get isAdmin(): boolean {
    return this.roleId === '1';
  }

  FetchAcademicYearCount(isSearch: boolean) {
    let SchoolIdSelected = '';

    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    return this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', {
      Flag: isSearch ? '8' : '6',
      SchoolID:SchoolIdSelected,
      Name: isSearch ? this.searchQuery.trim() : null
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
        this.AcademicYearCount = countResp?.data?.[0]?.totalcount ?? 0;

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

        if (isSearch) payload.Name = this.searchQuery.trim();

        this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', payload).subscribe({
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
            this.AcademicYearList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.AcademicYearList = [];
        this.AcademicYearCount = 0;
        this.loader.hide();
      }
    });
  }

  mapAcademicYears(response: any) {
    const schoolMap = this.schoolCache.getSchoolMap() || {};
    this.AcademicYearList = (response.data || []).map((item: any) => ({
      ID: item.id,
      Name: item.name,
      // SchoolName: schoolMap[item.schoolID] ?? `School-${item.schoolID}`,
      SchoolName:item.schoolName,
      StartDate: this.formatDateDDMMYYYY(item.startDate),
      EndDate: this.formatDateDDMMYYYY(item.endDate),
      IsActive: item.isActive === '1' ? 'Active' : 'InActive'
    }));
  }

  AddNewClicked() {
    this.IsAddNewClicked = !this.IsAddNewClicked;
    this.IsActiveStatus = true;
    this.ViewAcademicYearClicked = false;
  }

  SubmitAcademicYear() {
    if(this.AcademicYearForm.invalid){
      this.AcademicYearForm.markAllAsTouched();
      return;
    };

    const data = {
      Name: this.AcademicYearForm.get('Name')?.value,
      StartDate: this.AcademicYearForm.get('StartDate')?.value,
      EndDate: this.AcademicYearForm.get('EndDate')?.value,
      Description: this.AcademicYearForm.get('Description')?.value,
      IsActive: this.IsActiveStatus ? "1" : "0",
      SchoolID: this.ActiveUserId,
      Flag: '1'
    };

    this.apiurl.post("Tbl_AcademicYear_CRUD_Operations", data).subscribe({
      next: () => {
        this.isModalOpen = true;
        this.AminityInsStatus = "Academic Year Details Submitted!";
        this.AcademicYearForm.reset();
        this.FetchInitialData();
        this.IsAddNewClicked = false;
      },
      error: () => {
        this.isModalOpen = true;
        this.AminityInsStatus = "Error Submitting Academic Year!";
      }
    });
  }

  FetchAcademicYearDetByID(AcademicYearID: string) {
    this.apiurl.post<any>("Tbl_AcademicYear_CRUD_Operations", { ID: AcademicYearID, Flag: "4" }).subscribe({
      next: (response: any) => {
        const item = response?.data?.[0];
        if (item) {
          this.AcademicYearForm.patchValue({
            ID: item.id,
            Name: item.name,
            StartDate: this.formatDateYYYYMMDD(item.startDate),
            EndDate: this.formatDateYYYYMMDD(item.endDate),
            Description: item.description
          });
          this.IsActiveStatus = item.isActive === "1";
        }
        this.IsAddNewClicked = true;
        this.ViewAcademicYearClicked = true;
      }
    });
  }

  UpdateAcademicYear() {
    if(this.AcademicYearForm.invalid){
      this.AcademicYearForm.markAllAsTouched();
      return;
    };

    const data = {
      ID: this.AcademicYearForm.get('ID')?.value || '',
      Name: this.AcademicYearForm.get('Name')?.value || '',
      StartDate: this.AcademicYearForm.get('StartDate')?.value || '',
      EndDate: this.AcademicYearForm.get('EndDate')?.value || '',
      Description: this.AcademicYearForm.get('Description')?.value || '',
      IsActive: this.IsActiveStatus ? "1" : "0",
      SchoolID: this.ActiveUserId,
      Flag: '5'
    };

    this.apiurl.post("Tbl_AcademicYear_CRUD_Operations", data).subscribe({
      next: () => {
        this.isModalOpen = true;
        this.AminityInsStatus = "Academic Year Details Updated!";
        this.AcademicYearForm.reset();
        this.FetchInitialData();
        this.IsAddNewClicked = false;
      },
      error: () => {
        this.isModalOpen = true;
        this.AminityInsStatus = "Error Updating Academic Year!";
      }
    });
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages()) {
      this.goToPage(this.currentPage + 1);
    }
  }

  firstPage() {
    this.goToPage(1);
  }

  lastPage() {
    this.goToPage(this.totalPages());
  }

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
  }

  totalPages() {
    return Math.ceil(this.AcademicYearCount / this.pageSize);
  }

  getVisiblePageNumbers() {
    const totalPages = this.totalPages();
    const pages = [];
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount/2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, totalPages);
    if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
    for (let i=start; i<=end; i++) pages.push(i);
    return pages;
  }

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
  }


  formatDateYYYYMMDD(dateStr: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
  }

  formatDateDDMMYYYY(dateStr: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  handleOk() {
    this.isModalOpen = false;
    this.FetchInitialData();
  }

  editreview(AcademicYearID: string) {
    this.editclicked=true;
    this.FetchAcademicYearDetByID(AcademicYearID);
  }

  toggleChange() {
    this.IsActiveStatus = !this.IsActiveStatus;
  }
  
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
  }

  onSchoolChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if(schoolID=="0"){
      this.selectedSchoolID="";
    }else{
      this.selectedSchoolID = schoolID;
    }    
    this.SchoolSelectionChange = true;
    // this.FetchInitialData({ SchoolID: this.selectedSchoolID });
    this.FetchInitialData();
  }
}


