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
import {AbstractControl,ValidatorFn } from '@angular/forms';
@Component({
  selector: 'app-items',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './items.component.html',
  styleUrl: './items.component.css'
})
/**
 * Class Responsibility: Handles view logic and user interactions for ItemsComponent.
 */
export class ItemsComponent extends BasePermissionComponent {
  pageName = 'Items';
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
      this.ItemsForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
     if (this.AdminselectedAcademicYearID) {
      this.FetchCategoriesList();
      this.FetchUnitsList();
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
   * Executes the operation: allowDecimalNumbers
   * Parameters: event: KeyboardEvent
   * Rationale: Standard operational controller for the active view.
   */
  allowDecimalNumbers(event: KeyboardEvent) {
    if (
      event.key === 'Backspace' ||
      event.key === 'Tab' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'Delete' ||
      event.key === '.'
    ) {
      return;
    }
    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }
  selectedUnit: any = null;
  /**
   * Executes the operation: openingStockValidator
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
openingStockValidator(): ValidatorFn {
  return (control: AbstractControl) => {

    if (!this.selectedUnit || control.value === null || control.value === '') {
      return null;
    }

    const value = Number(control.value);

    const min = Number(this.selectedUnit.MinimumValue);
    const max = Number(this.selectedUnit.MaxValue);

    if (value < min || value > max) {
      return {
        invalidRange: {
          min,
          max
        }
      };
    }

    return null;
  };
}
  /**
   * Executes the operation: onUnitChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
onUnitChange(event: Event) {
  const unitId = Number(
    (event.target as HTMLSelectElement).value
  );

  this.selectedUnit = this.unitsList.find(
    x => Number(x.ID) === unitId
  );

  if (this.selectedUnit) {
    this.ItemsForm.patchValue({
      OpeningStock: this.selectedUnit.MinimumValue
    });
  }

  this.ItemsForm.get('OpeningStock')?.updateValueAndValidity();
}
  /**
   * Executes the operation: increaseStock
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
increaseStock(event: Event) {
  const keyboardEvent = event as KeyboardEvent;
  keyboardEvent.preventDefault();

  if (!this.selectedUnit) return;

  const control = this.ItemsForm.get('OpeningStock');

  const currentValue =
    Number(control?.value) ||
    Number(this.selectedUnit.MinimumValue);

  const newValue =
    currentValue + Number(this.selectedUnit.Difference);

  if (newValue <= Number(this.selectedUnit.MaxValue)) {
    control?.setValue(newValue);
  }
}

  /**
   * Executes the operation: decreaseStock
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
decreaseStock(event: Event) {
  const keyboardEvent = event as KeyboardEvent;
  keyboardEvent.preventDefault();

  if (!this.selectedUnit) return;
  const control = this.ItemsForm.get('OpeningStock');

  const currentValue =
    Number(control?.value) ||
    Number(this.selectedUnit.MinimumValue);

  const newValue =
    currentValue - Number(this.selectedUnit.Difference);

  if (newValue >= Number(this.selectedUnit.MinimumValue)) {
    control?.setValue(newValue);
  }
} 
IsAddNewClicked: boolean = false;
  IsActiveStatus: boolean = false;
  ViewItemClicked: boolean = false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;
  ItemsList: any[] = [];
  isViewMode = false;
  viewItem: any = null;
  ItemInsStatus: any = '';
  isModalOpen = false;
  isViewModalOpen = false;
  ItemsCount: number = 0;
  ActiveUserId: string = localStorage.getItem('email')?.toString() || '';
  roleId = localStorage.getItem('RollID');

  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
  lastCreatedDate: string | null = null;
  lastID: number | null = null;

  sortColumn: string = 'ItemName';
  sortDirection: 'asc' | 'desc' = 'desc';
  editclicked: boolean = false;
  schoolList: any[] = [];
  selectedSchoolID: string = '';
  SchoolSelectionChange: boolean = false;
  academicYearList: any[] = [];
  categoriesList: any[] = [];
  unitsList: any[] = [];
  AdminselectedSchoolID: string = '';
  AdminselectedAcademicYearID: string = sessionStorage.getItem('ActiveAcademicYearID') || '';

  ItemsForm: any = new FormGroup({
    ID: new FormControl(''),
    SchoolID: new FormControl(''),
    School: new FormControl(0),
    AcademicYear: new FormControl(sessionStorage.getItem('ActiveAcademicYearID') ? Number(sessionStorage.getItem('ActiveAcademicYearID')) : 0, [Validators.required, Validators.min(1)]),
    CategoryID: new FormControl(0, [Validators.required, Validators.min(1)]),
    UnitID: new FormControl(0, [Validators.required, Validators.min(1)]),
    ItemName: new FormControl(null, [Validators.required]),
    PurchasePrice: new FormControl(null, [Validators.required, Validators.min(0)]),
    SellingPrice: new FormControl(null, [Validators.required, Validators.min(0)]),
OpeningStock: new FormControl(null, [
  this.openingStockValidator()
]),    ReorderLevel: new FormControl(null, [Validators.min(0)]),
    TaxCGST: new FormControl(null, [Validators.min(0), Validators.max(100)]),
    TaxSGST: new FormControl(null, [Validators.min(0), Validators.max(100)]),
    Description: new FormControl('')
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

  /**
   * Executes the operation: FetchCategoriesList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchCategoriesList() {
    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: this.AdminselectedAcademicYearID || '',
      Flag: '2'
    };

    this.apiurl.post<any>('Tbl_Categories_CRUD_Operations', requestData).subscribe(
      (response: any) => {
        if (response && Array.isArray(response.data)) {
          this.categoriesList = response.data.map((item: any) => ({
            ID: item.id,
            Name: item.categoryName,
            IsActive: item.isActive === 'True' ? 'Active' : 'InActive'
          }));
        } else {
          this.categoriesList = [];
        }
      },
      () => { this.categoriesList = []; }
    );
  }

  /**
   * Executes the operation: FetchUnitsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchUnitsList() {
    const requestData = {
      SchoolID: this.AdminselectedSchoolID || '',
      AcademicYear: this.AdminselectedAcademicYearID || '',
      Flag: '2'
    };

    this.apiurl.post<any>('Tbl_Units_CRUD_Operations', requestData).subscribe(
      (response: any) => {
        if (response && Array.isArray(response.data)) {
          this.unitsList = response.data.map((item: any) => ({
            ID: item.id,
            Name: item.unitName,
            MinimumValue: item.minimumValue,
            MaxValue: item.maximumValue,
            Difference: item.minimumDifference,
            IsActive: item.isActive === 'True' ? 'Active' : 'InActive'
          }));
        } else {
          this.unitsList = [];
        }
      },
      () => { this.unitsList = []; }
    );
  }

  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  /**
   * Executes the operation: FetchItemsCount
   * Parameters: isSearch: boolean
   * Rationale: Standard operational controller for the active view.
   */
  FetchItemsCount(isSearch: boolean) {
    let SchoolIdSelected = '';
    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    const payload: any = {
      Flag: isSearch ? '8' : '6',
      SchoolID: SchoolIdSelected,
      AcademicYear: this.isAdmin ? (this.AdminselectedAcademicYearID || null) : (sessionStorage.getItem('ActiveAcademicYearID') || null),
      ItemName: isSearch ? this.searchQuery.trim() : null
    };

    return this.apiurl.post<any>('Tbl_Items_CRUD_Operations', payload);
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

    this.FetchItemsCount(isSearch).subscribe({
      next: (countResp: any) => {
        this.ItemsCount = countResp?.data?.[0]?.totalcount ?? 0;

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

        if (isSearch) payload.ItemName = this.searchQuery.trim();

        this.apiurl.post<any>('Tbl_Items_CRUD_Operations', payload).subscribe({
          next: (response: any) => {
            const data = response?.data || [];
            this.mapItems(response);

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
            this.ItemsList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.ItemsList = [];
        this.ItemsCount = 0;
        this.loader.hide();
      }
    });
  }

  /**
   * Executes the operation: mapItems
   * Parameters: response: any
   * Rationale: Standard operational controller for the active view.
   */
  mapItems(response: any) {
    this.ItemsList = (response.data || []).map((item: any) => ({
      ID: item.id,
      SchoolID: item.schoolID,
      AcademicYear: item.academicYear,
      CategoryID: item.categoryID,
      UnitID: item.unitID,
      ItemName: item.itemName,
      PurchasePrice: item.purchasePrice,
      SellingPrice: item.sellingPrice,
      OpeningStock: item.openingStock,
      ReorderLevel: item.reorderLevel,
      TaxCGST: item.taxCGST,
      TaxSGST: item.taxSGST,
      Description: item.description,
      CategoryName: item.categoryName,
      UnitName: item.unitName,
      SchoolName: item.schoolName,
      AcademicYearName: item.academicYearName,
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
      this.ItemsForm.get('School')?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      this.ItemsForm.get('School')?.clearValidators();
    }
    if (this.AdminselectedSchoolID == '') {
      const schoolFromSession = sessionStorage.getItem('SchoolID') || localStorage.getItem('SchoolID') || '';
      this.AdminselectedSchoolID = schoolFromSession;
      this.FetchAcademicYearsList();
    }
    this.ItemsForm.reset();
    this.ItemsForm.get('School').patchValue('0');
    this.ItemsForm.get('AcademicYear').patchValue(sessionStorage.getItem('ActiveAcademicYearID') ? Number(sessionStorage.getItem('ActiveAcademicYearID')) : 0);
    if (!this.isAdmin) {
      this.ItemsForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
    this.ItemsForm.get('CategoryID').patchValue('0');
    this.ItemsForm.get('UnitID').patchValue('0');
    this.IsAddNewClicked = !this.IsAddNewClicked;
    this.IsActiveStatus = true;
    this.ViewItemClicked = false;
  }

  /**
   * Executes the operation: SubmitItem
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  SubmitItem() {
    if (this.ItemsForm.invalid) {
      this.ItemsForm.markAllAsTouched();
      return;
    }

    const IsActiveStatusNumeric = this.IsActiveStatus ? '1' : '0';
    const data = {
      SchoolID: this.ItemsForm.get('School')?.value,
      AcademicYear: this.isAdmin ? this.ItemsForm.get('AcademicYear')?.value : (sessionStorage.getItem('ActiveAcademicYearID') || this.ItemsForm.get('AcademicYear')?.value),
      CategoryID: this.ItemsForm.get('CategoryID')?.value,
      UnitID: this.ItemsForm.get('UnitID')?.value,
      ItemName: this.ItemsForm.get('ItemName')?.value,
      PurchasePrice: this.ItemsForm.get('PurchasePrice')?.value,
      SellingPrice: this.ItemsForm.get('SellingPrice')?.value,
      OpeningStock: this.ItemsForm.get('OpeningStock')?.value,
      ReorderLevel: this.ItemsForm.get('ReorderLevel')?.value,
      TaxCGST: this.ItemsForm.get('TaxCGST')?.value,
      TaxSGST: this.ItemsForm.get('TaxSGST')?.value,
      Description: this.ItemsForm.get('Description')?.value,
      IsActive: IsActiveStatusNumeric,
      Flag: '1'
    };

    this.apiurl.post('Tbl_Items_CRUD_Operations', data).subscribe({
      next: (response: any) => {
        if (response.statusCode === 200) {
          this.IsAddNewClicked = !this.IsAddNewClicked;
          this.isModalOpen = true;
          this.ItemInsStatus = 'Item Details Submitted!';
          this.ItemsForm.reset();
          this.ItemsForm.get('AcademicYear').patchValue(sessionStorage.getItem('ActiveAcademicYearID') ? Number(sessionStorage.getItem('ActiveAcademicYearID')) : 0);
          this.ItemsForm.markAsPristine();
          this.currentPage = 1;
          this.pageCursors = [];
          this.sortColumn = 'CreatedDate';
          this.sortDirection = 'desc';
          this.FetchInitialData();
        } else {
          this.ItemInsStatus = response.message || 'Error Submitting Item.';
          this.isModalOpen = true;
        }
      },
      error: (err: any) => {
        if (err.status === 400 && err.error?.message) {
          this.ItemInsStatus = err.error.message;
        } else if (err.status === 500 && err.error?.Message) {
          this.ItemInsStatus = err.error.Message;
        } else {
          this.ItemInsStatus = 'Unexpected error occurred.';
        }
        this.isModalOpen = true;
      },
      complete: () => { }
    });
  }

  /**
   * Executes the operation: FetchItemByID
   * Parameters: ItemID: string, mode: 'view' | 'edit'
   * Rationale: Standard operational controller for the active view.
   */
  FetchItemByID(ItemID: string, mode: 'view' | 'edit') {
    const data = { ID: ItemID, Flag: '4' };

    this.apiurl.post<any>('Tbl_Items_CRUD_Operations', data).subscribe(
      (response: any) => {
        const item = response?.data?.[0];
        if (!item) {
          this.ItemsForm.reset();
          this.viewItem = null;
          return;
        }

        const isActive = item.isActive === 'True';

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewItem = {
            ID: item.id,
            SchoolID: item.schoolID,
            AcademicYear: item.academicYear,
            CategoryID: item.categoryID,
            UnitID: item.unitID,
            ItemName: item.itemName,
            PurchasePrice: item.purchasePrice,
            SellingPrice: item.sellingPrice,
            OpeningStock: item.openingStock,
            ReorderLevel: item.reorderLevel,
            TaxCGST: item.taxCGST,
            TaxSGST: item.taxSGST,
            Description: item.description,
            CategoryName: item.categoryName,
            UnitName: item.unitName,
            SchoolName: item.schoolName,
            AcademicYearName: item.academicYearName,
            IsActive: isActive
          };
          this.isViewModalOpen = true;
        }

        if (mode === 'edit') {
          this.isViewMode = false;
          this.AdminselectedSchoolID = item.schoolID;
          this.AdminselectedAcademicYearID = item.academicYear;
          this.FetchAcademicYearsList();
          this.FetchCategoriesList();
          this.FetchUnitsList();
          this.ItemsForm.patchValue({
            ID: item.id,
            School: item.schoolID,
            AcademicYear: item.academicYear,
            CategoryID: item.categoryID,
            UnitID: item.unitID,
            ItemName: item.itemName,
            PurchasePrice: item.purchasePrice,
            SellingPrice: item.sellingPrice,
            OpeningStock: item.openingStock,
            ReorderLevel: item.reorderLevel,
            TaxCGST: item.taxCGST,
            TaxSGST: item.taxSGST,
            Description: item.description
          });
          if (!this.isAdmin) {
            this.ItemsForm.get('AcademicYear')?.disable({ emitEvent: false });
          }
          this.IsActiveStatus = isActive;
          this.IsAddNewClicked = true;
        }
      },
      error => { console.error(error); }
    );
  }

  /**
   * Executes the operation: UpdateItem
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  UpdateItem() {
    if (this.ItemsForm.invalid) {
      this.ItemsForm.markAllAsTouched();
      return;
    }

    const IsActiveStatusNumeric = this.IsActiveStatus ? '1' : '0';
    const data = {
      ID: this.ItemsForm.get('ID')?.value || '',
      SchoolID: this.ItemsForm.get('School')?.value,
      AcademicYear: this.isAdmin ? (this.ItemsForm.get('AcademicYear')?.value || '') : (sessionStorage.getItem('ActiveAcademicYearID') || this.ItemsForm.get('AcademicYear')?.value || ''),
      CategoryID: this.ItemsForm.get('CategoryID')?.value || '',
      UnitID: this.ItemsForm.get('UnitID')?.value || '',
      ItemName: this.ItemsForm.get('ItemName')?.value || '',
      PurchasePrice: this.ItemsForm.get('PurchasePrice')?.value,
      SellingPrice: this.ItemsForm.get('SellingPrice')?.value,
      OpeningStock: this.ItemsForm.get('OpeningStock')?.value,
      ReorderLevel: this.ItemsForm.get('ReorderLevel')?.value,
      TaxCGST: this.ItemsForm.get('TaxCGST')?.value,
      TaxSGST: this.ItemsForm.get('TaxSGST')?.value,
      Description: this.ItemsForm.get('Description')?.value || '',
      IsActive: IsActiveStatusNumeric,
      Flag: '5'
    };

    this.apiurl.post('Tbl_Items_CRUD_Operations', data).subscribe({
      next: (response: any) => {
        if (response.statusCode === 200) {
          this.IsAddNewClicked = !this.IsAddNewClicked;
          this.isModalOpen = true;
          this.ItemInsStatus = 'Item Details Updated!';
          this.ItemsForm.reset();
          this.ItemsForm.get('AcademicYear').patchValue(sessionStorage.getItem('ActiveAcademicYearID') ? Number(sessionStorage.getItem('ActiveAcademicYearID')) : 0);
          this.ItemsForm.markAsPristine();
          this.FetchInitialData();
        }
      },
      error: (err: any) => {
        if (err.status === 400 && err.error?.message) {
          this.ItemInsStatus = err.error.message;
        } else if (err.status === 500 && err.error?.Message) {
          this.ItemInsStatus = err.error.Message;
        } else {
          this.ItemInsStatus = 'Unexpected error occurred.';
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
    return Math.ceil(this.ItemsCount / this.pageSize);
  }

  /**
   * Executes the operation: pageStartIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageStartIndex(): number {
    return this.ItemsCount === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
  }

  /**
   * Executes the operation: pageEndIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.ItemsCount);
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
      this.viewItem = null;
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
   * Parameters: ItemID: string
   * Rationale: Standard operational controller for the active view.
   */
  editreview(ItemID: string): void {
    this.editclicked = true;
    this.FetchItemByID(ItemID, 'edit');
    this.ViewItemClicked = true;
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
    this.categoriesList = [];
    this.unitsList = [];
    this.ItemsForm.get('AcademicYear').patchValue(sessionStorage.getItem('ActiveAcademicYearID') ? Number(sessionStorage.getItem('ActiveAcademicYearID')) : 0);
    this.ItemsForm.get('CategoryID').patchValue('0');
    this.ItemsForm.get('UnitID').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    this.AdminselectedSchoolID = schoolID === '0' ? '' : schoolID;
    this.FetchAcademicYearsList();
  }

  /**
   * Executes the operation: onAdminAcademicYearChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminAcademicYearChange(event: Event) {
    this.categoriesList = [];
    this.unitsList = [];
    this.ItemsForm.get('CategoryID').patchValue('0');
    this.ItemsForm.get('UnitID').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const yearID = target.value;
    this.AdminselectedAcademicYearID = yearID === '0' ? '' : yearID;
    if (this.AdminselectedAcademicYearID) {
      this.FetchCategoriesList();
      this.FetchUnitsList();
    }
  }

  /**
   * Executes the operation: exportItems
   * Parameters: type: 'pdf' | 'excel' | 'print'
   * Rationale: Standard operational controller for the active view.
   */
  exportItems(type: 'pdf' | 'excel' | 'print') {
    const isSearch = !!this.searchQuery?.trim();
    const flag = isSearch ? '7' : '2';
    const payload: any = {
      Flag: flag,
      SchoolID: this.selectedSchoolID || null,
      ItemName: isSearch ? this.searchQuery.trim() : null
    };

    this.loader.show();

    const url = `${this.apiurl.api_url}/ExportItems?type=${type}`;

    this.http.post(url, payload, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const fileNameBase = `Items_${new Date().toISOString().replace(/[:.]/g, '')}`;

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
   * Parameters: ItemID: string
   * Rationale: Standard operational controller for the active view.
   */
  viewReview(ItemID: string): void {
    this.FetchItemByID(ItemID, 'view');
    this.isViewModalOpen = true;
  }
}