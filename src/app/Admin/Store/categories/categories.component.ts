import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { LoaderService } from '../../../Services/loader.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
/**
 * Class Responsibility: Handles view logic and user interactions for CategoriesComponent.
 */
export class CategoriesComponent extends BasePermissionComponent {
  pageName = 'Categories';
  Math = Math;

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
    this.SchoolSelectionChange = false;
    this.FetchSchoolsList();
    this.FetchInitialData();
    if (!this.isAdmin) {
      this.CategoriesForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
  };

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

  IsAddNewClicked: boolean = false;
  IsActiveStatus: boolean = false;
  ViewCategoryClicked: boolean = false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;
  CategoriesList: any[] = [];
  isViewMode = false;
  viewCategory: any = null;
  AminityInsStatus: any = '';
  isModalOpen = false;
  isViewModalOpen = false;
  CategoriesCount: number = 0;
  ActiveUserId: string = localStorage.getItem('email')?.toString() || '';
  roleId = localStorage.getItem('RollID');

  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
  lastCreatedDate: string | null = null;
  lastID: number | null = null;

  sortColumn: string = 'CategoryName';
  sortDirection: 'asc' | 'desc' = 'desc';
  editclicked: boolean = false;
  schoolList: any[] = [];
  selectedSchoolID: string = '';
  SchoolSelectionChange: boolean = false;
  academicYearList: any[] = [];
  AdminselectedSchoolID: string = '';
  AdminselectedAcademicYearID: string = sessionStorage.getItem('ActiveAcademicYearID') || '';

  CategoriesForm: any = new FormGroup({
    ID: new FormControl(''),
    SchoolID: new FormControl(''),
    CategoryName: new FormControl(null, [Validators.required]),
    Description: new FormControl(''),
    School: new FormControl(),
    AcademicYear: new FormControl(sessionStorage.getItem('ActiveAcademicYearID') ? Number(sessionStorage.getItem('ActiveAcademicYearID')) : 0, [Validators.required, Validators.min(1)])
  });

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
    const requestData = { SchoolID: this.AdminselectedSchoolID || '', Flag: '2' };

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
   * Executes the operation: FetchCategoriesCount
   * Parameters: isSearch: boolean
   * Rationale: Standard operational controller for the active view.
   */
  FetchCategoriesCount(isSearch: boolean) {
    let SchoolIdSelected = '';

    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    const payload: any = {
      Flag: isSearch ? '8' : '6',
      SchoolID: SchoolIdSelected,
      AcademicYear: this.isAdmin ? (this.AdminselectedAcademicYearID || null) : (sessionStorage.getItem('ActiveAcademicYearID') || null),
      CategoryName: isSearch ? this.searchQuery.trim() : null
    };

    return this.apiurl.post<any>('Tbl_Categories_CRUD_Operations', payload);
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

    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    const cursor =
      !extra.offset && this.currentPage > 1
        ? this.pageCursors[this.currentPage - 2] || null
        : null;

    this.loader.show();

    this.FetchCategoriesCount(isSearch).subscribe({
      next: (countResp: any) => {
        this.CategoriesCount = countResp?.data?.[0]?.totalcount ?? 0;

        const payload: any = {
          Flag: flag,
          Limit: this.pageSize,
          SortColumn: this.sortColumn,
          SortDirection: this.sortDirection,
          LastCreatedDate: cursor?.lastCreatedDate ?? null,
          LastID: cursor?.lastID ?? null,
          SchoolID: SchoolIdSelected,
          AcademicYear: this.isAdmin ? (this.AdminselectedAcademicYearID || null) : (sessionStorage.getItem('ActiveAcademicYearID') || null),
          ...extra
        };

        if (isSearch) payload.CategoryName = this.searchQuery.trim();

        this.apiurl.post<any>('Tbl_Categories_CRUD_Operations', payload).subscribe({
          next: (response: any) => {
            const data = response?.data || [];
            this.mapCategories(response);

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
            this.CategoriesList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.CategoriesList = [];
        this.CategoriesCount = 0;
        this.loader.hide();
      }
    });
  };

  /**
   * Executes the operation: mapCategories
   * Parameters: response: any
   * Rationale: Standard operational controller for the active view.
   */
  mapCategories(response: any) {
    this.CategoriesList = (response.data || []).map((item: any) => ({
      ID: item.id,
      SchoolID: item.schoolID,
      AcademicYear: item.academicYear,
      SchoolName: item.schoolName,
      AcademicYearName: item.academicYearName,
      CategoryName: item.categoryName,
      Description: item.description,
      IsActive: item.isActive === "True" ? 'Active' : 'InActive'
    }));
  };

  /**
   * Executes the operation: AddNewClicked
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  AddNewClicked() {
    if (this.isAdmin) {
      this.CategoriesForm.get('School')?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      this.CategoriesForm.get('School')?.clearValidators();
    }
    if (this.AdminselectedSchoolID == '') {
      const schoolFromSession = sessionStorage.getItem('SchoolID') || localStorage.getItem('SchoolID') || '';
      this.AdminselectedSchoolID = schoolFromSession;
      this.FetchAcademicYearsList();
    }
    this.CategoriesForm.reset();
    this.CategoriesForm.get('School').patchValue('0');
    this.CategoriesForm.get('AcademicYear').patchValue(sessionStorage.getItem('ActiveAcademicYearID') ? Number(sessionStorage.getItem('ActiveAcademicYearID')) : 0);
    if (!this.isAdmin) {
      this.CategoriesForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
    this.IsAddNewClicked = !this.IsAddNewClicked;
    this.IsActiveStatus = true;
    this.ViewCategoryClicked = false;
  };

  /**
   * Executes the operation: SubmitCategory
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  SubmitCategory() {
    if (this.CategoriesForm.invalid) {
      this.CategoriesForm.markAllAsTouched();
      return;
    }

    const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
    const data = {
      CategoryName: this.CategoriesForm.get('CategoryName')?.value,
      Description: this.CategoriesForm.get('Description')?.value,
      SchoolID: this.CategoriesForm.get('School')?.value,
      AcademicYear: this.isAdmin ? this.CategoriesForm.get('AcademicYear')?.value : (sessionStorage.getItem('ActiveAcademicYearID') || this.CategoriesForm.get('AcademicYear')?.value),
      IsActive: IsActiveStatusNumeric,
      Flag: '1'
    };

    this.apiurl.post("Tbl_Categories_CRUD_Operations", data).subscribe({
      next: (response: any) => {
        if (response.statusCode === 200) {
          this.IsAddNewClicked = !this.IsAddNewClicked;
          this.isModalOpen = true;
          this.AminityInsStatus = "Category Details Submitted!";
          this.CategoriesForm.reset();
          this.CategoriesForm.get('AcademicYear').patchValue(sessionStorage.getItem('ActiveAcademicYearID') ? Number(sessionStorage.getItem('ActiveAcademicYearID')) : 0);
          this.CategoriesForm.markAsPristine();
          this.currentPage = 1;
          this.pageCursors = [];
          this.sortColumn = 'CreatedDate';
          this.sortDirection = 'desc';
          this.FetchInitialData();
        } else {
          this.AminityInsStatus = response.message || "Error Submitting Category.";
          this.isModalOpen = true;
        }
      },
      error: (err: any) => {
        if (err.status === 400 && err.error?.message) {
          this.AminityInsStatus = err.error.message;
        } else if (err.status === 500 && err.error?.Message) {
          this.AminityInsStatus = err.error.Message;
        } else {
          this.AminityInsStatus = "Unexpected error occurred.";
        }
        this.isModalOpen = true;
      },
      complete: () => { }
    });
  };

  /**
   * Executes the operation: FetchCategoryByID
   * Parameters: CategoryID: string, mode: 'view' | 'edit'
   * Rationale: Standard operational controller for the active view.
   */
  FetchCategoryByID(CategoryID: string, mode: 'view' | 'edit') {
    const data = {
      ID: CategoryID,
      Flag: "4"
    };

    this.apiurl.post<any>("Tbl_Categories_CRUD_Operations", data).subscribe(
      (response: any) => {
        const item = response?.data?.[0];
        if (!item) {
          this.CategoriesForm.reset();
          this.viewCategory = null;
          return;
        }

        const isActive = item.isActive === "True";

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewCategory = {
            ID: item.id,
            SchoolID: item.schoolID,
            AcademicYear: item.academicYear,
            SchoolName: item.schoolName,
            AcademicYearName: item.academicYearName,
            CategoryName: item.categoryName,
            Description: item.description,
            IsActive: isActive
          };
          this.isViewModalOpen = true;
        }

        if (mode === 'edit') {
          this.isViewMode = false;
          this.CategoriesForm.patchValue({
            ID: item.id,
            School: item.schoolID,
            AcademicYear: item.academicYear,
            CategoryName: item.categoryName,
            Description: item.description
          });
          if (!this.isAdmin) {
            this.CategoriesForm.get('AcademicYear')?.disable({ emitEvent: false });
          }
          this.AdminselectedSchoolID = item.schoolID;
          this.AdminselectedAcademicYearID = item.academicYear;
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
   * Executes the operation: UpdateCategory
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  UpdateCategory() {
    if (this.CategoriesForm.invalid) {
      this.CategoriesForm.markAllAsTouched();
      return;
    }

    const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
    const data = {
      ID: this.CategoriesForm.get('ID')?.value || '',
      SchoolID: this.CategoriesForm.get('School')?.value,
      AcademicYear: this.isAdmin ? (this.CategoriesForm.get('AcademicYear')?.value || '') : (sessionStorage.getItem('ActiveAcademicYearID') || this.CategoriesForm.get('AcademicYear')?.value || ''),
      CategoryName: this.CategoriesForm.get('CategoryName')?.value || '',
      Description: this.CategoriesForm.get('Description')?.value || '',
      IsActive: IsActiveStatusNumeric,
      Flag: '5'
    };

    this.apiurl.post("Tbl_Categories_CRUD_Operations", data).subscribe({
      next: (response: any) => {
        if (response.statusCode === 200) {
          this.IsAddNewClicked = !this.IsAddNewClicked;
          this.isModalOpen = true;
          this.AminityInsStatus = "Category Details Updated!";
          this.CategoriesForm.reset();
          this.CategoriesForm.get('AcademicYear').patchValue(sessionStorage.getItem('ActiveAcademicYearID') ? Number(sessionStorage.getItem('ActiveAcademicYearID')) : 0);
          this.CategoriesForm.markAsPristine();
          this.FetchInitialData();
        }
      },
      error: (err: any) => {
        if (err.status === 400 && err.error?.message) {
          this.AminityInsStatus = err.error.message;
        } else if (err.status === 500 && err.error?.Message) {
          this.AminityInsStatus = err.error.Message;
        } else {
          this.AminityInsStatus = "Unexpected error occurred.";
        }
        this.isModalOpen = true;
      },
      complete: () => { }
    });
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
    return Math.ceil(this.CategoriesCount / this.pageSize);
  }

  /**
   * Executes the operation: pageStartIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageStartIndex(): number {
    return this.CategoriesCount === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
  }

  /**
   * Executes the operation: pageEndIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.CategoriesCount);
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
   * Executes the operation: getVisiblePageNumbers
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  getVisiblePageNumbers() {
    const totalPages = this.totalPages();
    const pages = [];
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, totalPages);
    if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
    for (let i = start; i <= end; i++) pages.push(i);
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
        this.pageSize = 5;
        this.visiblePageCount = 3;
        this.pageCursors = [];
        this.FetchInitialData();
        return;
      }

      if (value.length < this.SEARCH_MIN_LENGTH) {
        return;
      }

      this.currentPage = 1;
      this.pageSize = 5;
      this.visiblePageCount = 3;
      this.pageCursors = [];
      this.FetchInitialData();

    }, this.SEARCH_DEBOUNCE);
  };

  /**
   * Executes the operation: closeModal
   * Parameters: type: 'view' | 'status'
   * Rationale: Standard operational controller for the active view.
   */
  closeModal(type: 'view' | 'status') {
    if (type === 'view') {
      this.isViewModalOpen = false;
      this.viewCategory = null;
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
   * Parameters: CategoryID: string
   * Rationale: Standard operational controller for the active view.
   */
  editreview(CategoryID: string): void {
    this.editclicked = true;
    this.FetchCategoryByID(CategoryID, 'edit');
    this.ViewCategoryClicked = true;
  };

  /**
   * Executes the operation: toggleChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  toggleChange() {
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
    if (schoolID == "0") {
      this.selectedSchoolID = "";
    } else {
      this.selectedSchoolID = schoolID;
    }
    this.SchoolSelectionChange = true;
    this.FetchInitialData();
  };

  /**
   * Executes the operation: exportCategories
   * Parameters: type: 'pdf' | 'excel' | 'print'
   * Rationale: Standard operational controller for the active view.
   */
  exportCategories(type: 'pdf' | 'excel' | 'print') {
    const isSearch = !!this.searchQuery?.trim();
    const flag = isSearch ? '7' : '2';
    const payload: any = {
      Flag: flag,
      SchoolID: this.selectedSchoolID || null,
      CategoryName: isSearch ? this.searchQuery.trim() : null
    };

    this.loader.show();

    const url = `${this.apiurl.api_url}/ExportCategories?type=${type}`;

    this.http.post(url, payload, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const fileNameBase = `Categories_${new Date().toISOString().replace(/[:.]/g, '')}`;

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

          setTimeout(() => URL.revokeObjectURL(fileURL), 1000);
        } else if (type === 'excel') {
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
   * Parameters: CategoryID: string
   * Rationale: Standard operational controller for the active view.
   */
  viewReview(CategoryID: string): void {
    this.FetchCategoryByID(CategoryID, 'view');
    this.isViewModalOpen = true;
  };

  /**
   * Executes the operation: onAdminSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminSchoolChange(event: Event) {
    this.academicYearList = [];
    this.CategoriesForm.get('AcademicYear').patchValue(sessionStorage.getItem('ActiveAcademicYearID') ? Number(sessionStorage.getItem('ActiveAcademicYearID')) : 0);
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if (schoolID == "0") {
      this.AdminselectedSchoolID = "";
    } else {
      this.AdminselectedSchoolID = schoolID;
    }
    this.FetchAcademicYearsList();
  };
}