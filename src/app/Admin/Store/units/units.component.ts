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
  selector: 'app-units',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './units.component.html',
  styleUrl: './units.component.css'
})
/**
 * Class Responsibility: Handles view logic and user interactions for UnitsComponent.
 */
export class UnitsComponent extends BasePermissionComponent {
  pageName = 'Units';
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
      this.UnitsForm.get('AcademicYear')?.disable({ emitEvent: false });
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
    const target = event.target as HTMLInputElement;
    if (event.key === '.' && target.value.indexOf('.') === -1) {
      return;
    }
    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  IsAddNewClicked: boolean = false;
  IsActiveStatus: boolean = false;
  ViewUnitClicked: boolean = false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;
  UnitsList: any[] = [];
  isViewMode = false;
  viewUnit: any = null;
  AminityInsStatus: any = '';
  isModalOpen = false;
  isViewModalOpen = false;
  UnitsCount: number = 0;
  ActiveUserId: string = localStorage.getItem('email')?.toString() || '';
  roleId = localStorage.getItem('RollID');

  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
  lastCreatedDate: string | null = null;
  lastID: number | null = null;

  sortColumn: string = 'UnitName';
  sortDirection: 'asc' | 'desc' = 'desc';
  editclicked: boolean = false;
  schoolList: any[] = [];
  selectedSchoolID: string = '';
  SchoolSelectionChange: boolean = false;
  academicYearList: any[] = [];
  AdminselectedSchoolID: string = '';
  AdminselectedAcademicYearID: string = sessionStorage.getItem('ActiveAcademicYearID') || '';

  // FIX 1: School initialised to 0 (same as Items) so Validators.min(1) works correctly.
  UnitsForm: any = new FormGroup({
    ID: new FormControl(''),
    SchoolID: new FormControl(''),
    UnitName: new FormControl(null, [Validators.required]),
    Abbreviation: new FormControl(null, [Validators.required]),
    MinimumValue: new FormControl('', [Validators.required, Validators.pattern('^\\d+(\\.\\d+)?$')]),
    MaximumValue: new FormControl('', [Validators.required, Validators.pattern('^\\d+(\\.\\d+)?$')]),
    MinimumDifference: new FormControl('', [Validators.required, Validators.pattern('^\\d+(\\.\\d+)?$')]),
    Description: new FormControl(''),
    School: new FormControl(0),
    AcademicYear: new FormControl(sessionStorage.getItem('ActiveAcademicYearID') ? Number(sessionStorage.getItem('ActiveAcademicYearID')) : 0, [Validators.required, Validators.min(1)])
  });

  /**
   * Executes the operation: FetchSchoolsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchSchoolsList() {
    const requestData = { Flag: '2' };

    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', requestData).subscribe(
      (response: any) => {
        if (response && Array.isArray(response.data)) {
          this.schoolList = response.data.map((item: any) => ({
            ID: item.id,
            Name: item.name,
            IsActive: item.isActive === '1' ? 'Active' : 'InActive'
          }));
        } else {
          this.schoolList = [];
        }
      },
      () => { this.schoolList = []; }
    );
  }

  /**
   * Executes the operation: FetchAcademicYearsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchAcademicYearsList() {
    const requestData = { SchoolID: this.AdminselectedSchoolID || '', Flag: '2' };

    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', requestData).subscribe(
      (response: any) => {
        if (response && Array.isArray(response.data)) {
          this.academicYearList = response.data.map((item: any) => ({
            ID: item.id,
            Name: item.name,
            IsActive: item.isActive === '1' ? 'Active' : 'InActive'
          }));
        } else {
          this.academicYearList = [];
        }
      },
      () => { this.academicYearList = []; }
    );
  }

  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  /**
   * Executes the operation: FetchUnitsCount
   * Parameters: isSearch: boolean
   * Rationale: Standard operational controller for the active view.
   */
  FetchUnitsCount(isSearch: boolean) {
    let SchoolIdSelected = '';
    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    const payload: any = {
      Flag: isSearch ? '8' : '6',
      SchoolID: SchoolIdSelected,
      AcademicYear: this.isAdmin ? (this.AdminselectedAcademicYearID || null) : (sessionStorage.getItem('ActiveAcademicYearID') || null),
      UnitName: isSearch ? this.searchQuery.trim() : null
    };

    return this.apiurl.post<any>('Tbl_Units_CRUD_Operations', payload);
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

    this.FetchUnitsCount(isSearch).subscribe({
      next: (countResp: any) => {
        this.UnitsCount = countResp?.data?.[0]?.totalcount ?? 0;

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

        if (isSearch) payload.UnitName = this.searchQuery.trim();

        this.apiurl.post<any>('Tbl_Units_CRUD_Operations', payload).subscribe({
          next: (response: any) => {
            const data = response?.data || [];
            this.mapUnits(response);

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
            this.UnitsList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.UnitsList = [];
        this.UnitsCount = 0;
        this.loader.hide();
      }
    });
  }

  /**
   * Executes the operation: mapUnits
   * Parameters: response: any
   * Rationale: Standard operational controller for the active view.
   */
  mapUnits(response: any) {
    this.UnitsList = (response.data || []).map((item: any) => ({
      ID: item.id,
      SchoolID: item.schoolID,
      AcademicYear: item.academicYear,
      SchoolName: item.schoolName,
      AcademicYearName: item.academicYearName,
      UnitName: item.unitName,
      Abbreviation: item.abbreviation,
      MinimumValue: item.minimumValue,
      MaximumValue: item.maximumValue,
      MinimumDifference: item.minimumDifference,
      Description: item.description,
      IsActive: item.isActive === 'True' ? 'Active' : 'InActive'
    }));
  }

  /**
   * Executes the operation: AddNewClicked
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  AddNewClicked() {
    if (this.isAdmin) {
      this.UnitsForm.get('School')?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      this.UnitsForm.get('School')?.clearValidators();
    }
    // FIX 2: Always call updateValueAndValidity after changing validators.
    this.UnitsForm.get('School')?.updateValueAndValidity();

    if (this.AdminselectedSchoolID === '') {
      const schoolFromSession = sessionStorage.getItem('SchoolID') || localStorage.getItem('SchoolID') || '';
      this.AdminselectedSchoolID = schoolFromSession;
      this.FetchAcademicYearsList();
    }
    this.editclicked = false;
    this.editclicked = false;
    this.UnitsForm.reset();
    this.UnitsForm.get('School').patchValue('0');
    this.UnitsForm.get('AcademicYear').patchValue(sessionStorage.getItem('ActiveAcademicYearID') ? Number(sessionStorage.getItem('ActiveAcademicYearID')) : 0);
    if (!this.isAdmin) {
      this.UnitsForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
    this.IsAddNewClicked = !this.IsAddNewClicked;
    this.IsActiveStatus = true;
    this.ViewUnitClicked = false;
  }

  /**
   * Executes the operation: SubmitUnit
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  SubmitUnit() {
    if (this.UnitsForm.invalid) {
      this.UnitsForm.markAllAsTouched();
      return;
    }

    const minValue = Number(this.UnitsForm.get('MinimumValue')?.value);
    const maxValue = Number(this.UnitsForm.get('MaximumValue')?.value);
    if (minValue >= maxValue) {
      this.AminityInsStatus = '⚠️ Maximum Value must be greater than Minimum Value.';
      this.isModalOpen = true;
      return;
    }

    const IsActiveStatusNumeric = this.IsActiveStatus ? '1' : '0';
    const data = {
      UnitName: this.UnitsForm.get('UnitName')?.value,
      Abbreviation: this.UnitsForm.get('Abbreviation')?.value,
      MinimumValue: this.UnitsForm.get('MinimumValue')?.value,
      MaximumValue: this.UnitsForm.get('MaximumValue')?.value,
      MinimumDifference: this.UnitsForm.get('MinimumDifference')?.value,
      Description: this.UnitsForm.get('Description')?.value,
      // FIX 3: Use the form's School field as SchoolID (same mapping as Items).
      SchoolID: this.UnitsForm.get('School')?.value,
      AcademicYear: this.isAdmin ? this.UnitsForm.get('AcademicYear')?.value : (sessionStorage.getItem('ActiveAcademicYearID') || this.UnitsForm.get('AcademicYear')?.value),
      IsActive: IsActiveStatusNumeric,
      Flag: '1'
    };

    this.apiurl.post('Tbl_Units_CRUD_Operations', data).subscribe({
      next: (response: any) => {
        if (response.statusCode === 200) {
          this.IsAddNewClicked = !this.IsAddNewClicked;
          this.isModalOpen = true;
          this.AminityInsStatus = 'Unit Details Submitted!';
          this.UnitsForm.reset();
          this.UnitsForm.get('AcademicYear').patchValue(sessionStorage.getItem('ActiveAcademicYearID') ? Number(sessionStorage.getItem('ActiveAcademicYearID')) : 0);
          this.UnitsForm.markAsPristine();
          this.currentPage = 1;
          this.pageCursors = [];
          this.sortColumn = 'CreatedDate';
          this.sortDirection = 'desc';
          this.FetchInitialData();
        } else {
          this.AminityInsStatus = response.message || 'Error Submitting Unit.';
          this.isModalOpen = true;
        }
      },
      error: (err: any) => {
        if (err.status === 400 && err.error?.message) {
          this.AminityInsStatus = err.error.message;
        } else if (err.status === 500 && err.error?.Message) {
          this.AminityInsStatus = err.error.Message;
        } else {
          this.AminityInsStatus = 'Unexpected error occurred.';
        }
        this.isModalOpen = true;
      },
      complete: () => { }
    });
  }

  /**
   * Executes the operation: FetchUnitByID
   * Parameters: UnitID: string, mode: 'view' | 'edit'
   * Rationale: Standard operational controller for the active view.
   */
  FetchUnitByID(UnitID: string, mode: 'view' | 'edit') {
    const data = { ID: UnitID, Flag: '4' };

    this.apiurl.post<any>('Tbl_Units_CRUD_Operations', data).subscribe(
      (response: any) => {
        const item = response?.data?.[0];
        if (!item) {
          this.UnitsForm.reset();
          this.viewUnit = null;
          return;
        }

        const isActive = item.isActive === 'True';

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewUnit = {
            ID: item.id,
            SchoolID: item.schoolID,
            AcademicYear: item.academicYear,
            SchoolName: item.schoolName,
            AcademicYearName: item.academicYearName,
            UnitName: item.unitName,
            Abbreviation: item.abbreviation,
            MinimumValue: item.minimumValue,
            MaximumValue: item.maximumValue,
            MinimumDifference: item.minimumDifference,
            Description: item.description,
            IsActive: isActive
          };
          this.isViewModalOpen = true;
        }

        if (mode === 'edit') {
          this.isViewMode = false;
          // FIX 4: Set admin selections BEFORE fetching dependent lists,
          // so the API calls use the correct SchoolID and AcademicYear.
          this.AdminselectedSchoolID = item.schoolID;
          this.AdminselectedAcademicYearID = item.academicYear;
          this.FetchAcademicYearsList();
          this.UnitsForm.patchValue({
            ID: item.id,
            School: item.schoolID,
            AcademicYear: item.academicYear,
            UnitName: item.unitName,
            Abbreviation: item.abbreviation,
            MinimumValue: item.minimumValue,
            MaximumValue: item.maximumValue,
            MinimumDifference: item.minimumDifference,
            Description: item.description
          });
          if (!this.isAdmin) {
            this.UnitsForm.get('AcademicYear')?.disable({ emitEvent: false });
          }
          this.IsActiveStatus = isActive;
          this.IsAddNewClicked = true;
        }
      },
      error => { console.error(error); }
    );
  }

  /**
   * Executes the operation: UpdateUnit
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  UpdateUnit() {
    if (this.UnitsForm.invalid) {
      this.UnitsForm.markAllAsTouched();
      return;
    }

    const minValue = Number(this.UnitsForm.get('MinimumValue')?.value);
    const maxValue = Number(this.UnitsForm.get('MaximumValue')?.value);
    // FIX 5: Use a guard clause (early return) instead of wrapping the entire
    // API call in an else block. Matches the SubmitUnit pattern and is cleaner.
    if (minValue >= maxValue) {
      this.AminityInsStatus = '⚠️ Maximum Value must be greater than Minimum Value.';
      this.isModalOpen = true;
      return;
    }

    const IsActiveStatusNumeric = this.IsActiveStatus ? '1' : '0';
    const data = {
      ID: this.UnitsForm.get('ID')?.value || '',
      // FIX 6: Use the form's School field as SchoolID (same mapping as Items and SubmitUnit).
      SchoolID: this.UnitsForm.get('School')?.value,
      AcademicYear: this.isAdmin ? (this.UnitsForm.get('AcademicYear')?.value || '') : (sessionStorage.getItem('ActiveAcademicYearID') || this.UnitsForm.get('AcademicYear')?.value || ''),
      UnitName: this.UnitsForm.get('UnitName')?.value || '',
      Abbreviation: this.UnitsForm.get('Abbreviation')?.value || '',
      MinimumValue: this.UnitsForm.get('MinimumValue')?.value || '',
      MaximumValue: this.UnitsForm.get('MaximumValue')?.value || '',
      MinimumDifference: this.UnitsForm.get('MinimumDifference')?.value || '',
      Description: this.UnitsForm.get('Description')?.value || '',
      IsActive: IsActiveStatusNumeric,
      Flag: '5'
    };

    this.apiurl.post('Tbl_Units_CRUD_Operations', data).subscribe({
      next: (response: any) => {
        if (response.statusCode === 200) {
          this.IsAddNewClicked = !this.IsAddNewClicked;
          this.isModalOpen = true;
          this.AminityInsStatus = 'Unit Details Updated!';
          this.UnitsForm.reset();
          this.UnitsForm.get('AcademicYear').patchValue(sessionStorage.getItem('ActiveAcademicYearID') ? Number(sessionStorage.getItem('ActiveAcademicYearID')) : 0);
          this.UnitsForm.markAsPristine();
          this.FetchInitialData();
        }
      },
      error: (err: any) => {
        if (err.status === 400 && err.error?.message) {
          this.AminityInsStatus = err.error.message;
        } else if (err.status === 500 && err.error?.Message) {
          this.AminityInsStatus = err.error.Message;
        } else {
          this.AminityInsStatus = 'Unexpected error occurred.';
        }
        this.isModalOpen = true;
      },
      complete: () => { }
    });
  }

  /**
   * Executes the operation: previousPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  previousPage() {
    if (this.currentPage > 1) this.goToPage(this.currentPage - 1);
  }

  /**
   * Executes the operation: nextPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  nextPage() {
    if (this.currentPage < this.totalPages()) this.goToPage(this.currentPage + 1);
  }

  /**
   * Executes the operation: firstPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  firstPage() { this.goToPage(1); }

  /**
   * Executes the operation: lastPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  lastPage() { this.goToPage(this.totalPages()); }

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
  }

  /**
   * Executes the operation: totalPages
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  totalPages() {
    return Math.ceil(this.UnitsCount / this.pageSize);
  }

  /**
   * Executes the operation: pageStartIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageStartIndex(): number {
    return this.UnitsCount === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
  }

  /**
   * Executes the operation: pageEndIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.UnitsCount);
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
        this.pageSize = 5;
        this.visiblePageCount = 3;
        this.pageCursors = [];
        this.FetchInitialData();
        return;
      }

      if (value.length < this.SEARCH_MIN_LENGTH) return;

      this.currentPage = 1;
      this.pageSize = 5;
      this.visiblePageCount = 3;
      this.pageCursors = [];
      this.FetchInitialData();
    }, this.SEARCH_DEBOUNCE);
  }

  /**
   * Executes the operation: closeModal
   * Parameters: type: 'view' | 'status'
   * Rationale: Standard operational controller for the active view.
   */
  closeModal(type: 'view' | 'status') {
    if (type === 'view') {
      this.isViewModalOpen = false;
      this.viewUnit = null;
    }
    if (type === 'status') {
      this.isModalOpen = false;
    }
  }

  /**
   * Executes the operation: handleOk
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  handleOk() {
    this.isModalOpen = false;
    this.FetchInitialData();
  }

  /**
   * Executes the operation: editreview
   * Parameters: UnitID: string
   * Rationale: Standard operational controller for the active view.
   */
  editreview(UnitID: string): void {
    this.editclicked = true;
    this.FetchUnitByID(UnitID, 'edit');
    this.ViewUnitClicked = true;
  }

  /**
   * Executes the operation: toggleChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  toggleChange() {
    this.IsActiveStatus = !this.IsActiveStatus;
  }

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
  }

  /**
   * Executes the operation: onSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onSchoolChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    this.selectedSchoolID = schoolID === '0' ? '' : schoolID;
    this.SchoolSelectionChange = true;
    this.FetchInitialData();
  }

  /**
   * Executes the operation: onAdminSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminSchoolChange(event: Event) {
    this.academicYearList = [];
    // FIX 7: Reset AdminselectedAcademicYearID when school changes so stale
    // year IDs don't leak into FetchUnitsCount / FetchInitialData.
    this.AdminselectedAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';
    this.UnitsForm.get('AcademicYear').patchValue(sessionStorage.getItem('ActiveAcademicYearID') ? Number(sessionStorage.getItem('ActiveAcademicYearID')) : 0);
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    this.AdminselectedSchoolID = schoolID === '0' ? '' : schoolID;
    this.FetchAcademicYearsList();
  }

  /**
   * Executes the operation: exportUnits
   * Parameters: type: 'pdf' | 'excel' | 'print'
   * Rationale: Standard operational controller for the active view.
   */
  exportUnits(type: 'pdf' | 'excel' | 'print') {
    const isSearch = !!this.searchQuery?.trim();
    const flag = isSearch ? '7' : '2';
    const payload: any = {
      Flag: flag,
      SchoolID: this.selectedSchoolID || null,
      UnitName: isSearch ? this.searchQuery.trim() : null
    };

    this.loader.show();

    const url = `${this.apiurl.api_url}/ExportUnits?type=${type}`;

    this.http.post(url, payload, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const fileNameBase = `Units_${new Date().toISOString().replace(/[:.]/g, '')}`;

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
  }

  /**
   * Executes the operation: viewReview
   * Parameters: UnitID: string
   * Rationale: Standard operational controller for the active view.
   */
  viewReview(UnitID: string): void {
    this.FetchUnitByID(UnitID, 'view');
    this.isViewModalOpen = true;
  }
}