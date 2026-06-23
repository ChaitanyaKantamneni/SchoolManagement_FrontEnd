import { NgClass, NgFor, NgIf, NgStyle, DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { Router } from '@angular/router';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { LoaderService } from '../../../Services/loader.service';
import { HttpClient } from '@angular/common/http';

interface PurchaseItemRow {
  itemId: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  currentStock: number | null;
  quantity: number;
  price: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  subTotal: number;
  filteredItems: Array<{
    ID: string;
    Name: string;
    PurchasePrice: number;
    TaxCGST: number;
    TaxSGST: number;
    OpeningStock: number;
    CategoryID: string;
      UnitID: string;

  }>;
}

interface PurchaseRow {
  id: string;
  schoolId: string;
  schoolName: string;
  academicYearId: string;
  academicYearName: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  paymentMode: string;
  notes: string;
  itemIDs: string;
  quantities: string;
  prices: string;
  cgsts: string;
  sgsts: string;
  totalTaxes: string;
  subTotals: string;
  totalTaxAmount: number;
  grandTotalAmount: number;
  isActive: boolean;
  createdDate?: any;
}

@Component({
  selector: 'app-purchase',
  standalone: true,
  imports: [
    NgIf, NgFor, NgClass, NgStyle,
    ReactiveFormsModule, FormsModule,
    MatIconModule, DashboardTopNavComponent,
    DatePipe, CurrencyPipe, DecimalPipe
  ],
  templateUrl: './purchase.component.html',
  styleUrl: './purchase.component.css'
})
/**
 * Class Responsibility: Handles view logic and user interactions for PurchaseComponent.
 */
export class PurchaseComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Purchase';
  Math = Math;

  constructor(
    private http: HttpClient,
    private apiurl: ApiServiceService,
    private mService: MenuServiceService,
    private rtr: Router,
    public loader: LoaderService
  ) {
    super(mService, rtr);
  }

  /**
   * Lifecycle hook: Initializes component parameters and loads default page datasets.
   */
  ngOnInit(): void {
    this.checkViewPermission();
    this.FetchSchoolsList();
    this.today = new Date().toISOString().split('T')[0];
    if (!this.isAdmin) {
      this.purchaseForm.get('academicYearId')?.disable({ emitEvent: false });
    }
     if (this.selectedAdminAcademicYearID) {
      this.FetchSuppliersList();
      this.FetchCategoriesList();
      // this.FetchItemsList();
    }
  }

  // ── state ─────────────────────────────────────────────────────────────────────
  // FIX 1: getter instead of field
  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID') || '';
    return role === '1';
  }

  schoolList: Array<{ ID: string; Name: string }> = [];
  academicYearList: Array<{ ID: string; Name: string }> = [];
  suppliersList: Array<{ ID: string; Name: string }> = [];
  categoriesList: Array<{ ID: string; Name: string }> = [];

  itemsList: Array<{
    ID: string;
    Name: string;
    PurchasePrice: number;
    SellingPrice: number;
    TaxCGST: number;
    TaxSGST: number;
      UnitID: string;

    OpeningStock: number;
    CategoryID: string;
  }> = [];

  readonly currentSchoolId =
    sessionStorage.getItem('SchoolID') ||
    sessionStorage.getItem('schoolId') ||
    localStorage.getItem('SchoolID') ||
    localStorage.getItem('schoolId') || '';

  today: string = '';
  IsAddNewClicked: boolean = false;
  IsActiveStatus: boolean = true;
  ViewPurchaseClicked: boolean = false;

  PurchaseList: PurchaseRow[] = [];
    unitsList: any[] = [];
    selectedUnitByRow: any[] = [];

  PurchaseCount: number = 0;

  searchQuery: string = '';
  selectedSchoolID: string = '';

  PurchaseInsStatus: string = '';
  isModalOpen: boolean = false;
  isViewModalOpen: boolean = false;
  viewPurchase: PurchaseRow | null = null;

  editingId: string | null = null;
  selectedAdminSchoolID: string = '';
  selectedAdminAcademicYearID: string = sessionStorage.getItem('ActiveAcademicYearID') || '';

  purchaseItems: PurchaseItemRow[] = [];

  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;
  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
  sortDirection: 'asc' | 'desc' = 'desc';

  purchaseForm = new FormGroup({
    schoolId: new FormControl('', Validators.required),
    academicYearId: new FormControl(sessionStorage.getItem('ActiveAcademicYearID') || '', Validators.required),
    supplierId: new FormControl('', Validators.required),
    purchaseDate: new FormControl('', Validators.required),
    paymentMode: new FormControl('Cash', Validators.required),
    notes: new FormControl('')
  });

  paymentModes: string[] = ['Cash', 'Cheque', 'Online', 'Card', 'UPI', 'Bank Transfer'];

  // ── computed totals ───────────────────────────────────────────────────────────
  get totalTaxAmount(): number {
    return this.purchaseItems.reduce((sum, row) => sum + (row.totalTax || 0), 0);
  }
  get grandTotalAmount(): number {
    return this.purchaseItems.reduce((sum, row) => sum + (row.subTotal || 0), 0);
  }
  get itemsCount(): number { return this.purchaseItems.length; }

  // ── item row management ───────────────────────────────────────────────────────
  addItemRow(): void {
    this.purchaseItems.push({
      itemId: '', itemName: '', categoryId: '', categoryName: '',
      currentStock: null, quantity: 1, price: 0, cgst: 0, sgst: 0,
      totalTax: 0, subTotal: 0, filteredItems: []
    });
  }

  /**
   * Executes the operation: removeItemRow
   * Parameters: index: number
   * Rationale: Standard operational controller for the active view.
   */
  removeItemRow(index: number): void {
    if (this.purchaseItems.length > 1) this.purchaseItems.splice(index, 1);
  }

  /**
   * Executes the operation: onCategorySelect
   * Parameters: index: number, event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onCategorySelect(index: number, event: Event): void {
    const categoryId = (event.target as HTMLSelectElement).value;
    const row = this.purchaseItems[index];
    row.categoryId = categoryId;
    row.categoryName = this.categoriesList.find(c => c.ID === categoryId)?.Name || '';
    row.itemId = ''; row.itemName = '';
    row.currentStock = null; row.price = 0;
    row.cgst = 0; row.sgst = 0; row.totalTax = 0; row.subTotal = 0;
    row.filteredItems = categoryId
      ? this.itemsList.filter(i => i.CategoryID === categoryId)
      : [];
  }

  /**
   * Executes the operation: onItemSelect
   * Parameters: index: number, event: Event
   * Rationale: Standard operational controller for the active view.
   */
onItemSelect(index: number, event: Event): void {

  const itemId = (event.target as HTMLSelectElement).value;
  const row = this.purchaseItems[index];

  const selected =
    row.filteredItems.find(i => i.ID === itemId) ||
    this.itemsList.find(i => i.ID === itemId);

  if (!selected) return;

this.FetchUnitsList(selected.UnitID, index);
  row.itemId = selected.ID;
  row.itemName = selected.Name;
  row.currentStock = selected.OpeningStock ?? 0;
  row.price = selected.PurchasePrice ?? 0;
  row.cgst = selected.TaxCGST ?? 0;
  row.sgst = selected.TaxSGST ?? 0;

  this.recalculateRow(index);
}

  /**
   * Executes the operation: onQuantityChange
   * Parameters: index: number
   * Rationale: Standard operational controller for the active view.
   */
  onQuantityChange(index: number): void { this.recalculateRow(index); }
  /**
   * Executes the operation: onPriceChange
   * Parameters: index: number
   * Rationale: Standard operational controller for the active view.
   */
  onPriceChange(index: number): void { this.recalculateRow(index); }
  /**
   * Executes the operation: onCgstChange
   * Parameters: index: number
   * Rationale: Standard operational controller for the active view.
   */
  onCgstChange(index: number): void { this.recalculateRow(index); }
  /**
   * Executes the operation: onSgstChange
   * Parameters: index: number
   * Rationale: Standard operational controller for the active view.
   */
  onSgstChange(index: number): void { this.recalculateRow(index); }

  /**
   * Executes the operation: recalculateRow
   * Parameters: index: number
   * Rationale: Standard operational controller for the active view.
   */
  recalculateRow(index: number): void {
    const row = this.purchaseItems[index];
    const qty = Number(row.quantity) || 0;
    const price = Number(row.price) || 0;
    const cgst = Number(row.cgst) || 0;
    const sgst = Number(row.sgst) || 0;
    const base = qty * price;
    row.totalTax = (base * cgst / 100) + (base * sgst / 100);
    row.subTotal = base + row.totalTax;
  }

  // ── form actions ──────────────────────────────────────────────────────────────
  AddNewClicked(): void {
    this.editingId = null;
    this.selectedAdminSchoolID = '';
    this.selectedAdminAcademicYearID = '';
    this.academicYearList = [];
    this.suppliersList = [];
    this.categoriesList = [];
    this.itemsList = [];
    this.IsActiveStatus = true;
    this.ViewPurchaseClicked = false;

    this.purchaseForm.reset({
      schoolId: this.isAdmin ? '' : this.currentSchoolId,
      academicYearId: sessionStorage.getItem('ActiveAcademicYearID') || '', supplierId: '',
      purchaseDate: this.today, paymentMode: 'Cash', notes: ''
    });

    this.purchaseItems = [];
    this.addItemRow();

    if (!this.isAdmin && this.currentSchoolId) {
      this.selectedAdminSchoolID = this.currentSchoolId;
      this.FetchAcademicYearsList(this.currentSchoolId);
      this.FetchSuppliersList();
      this.FetchCategoriesList();   // <-- ADD THIS
  this.FetchItemsList();        // <-- ADD THIS
    }
    if (!this.isAdmin) {
      this.purchaseForm.get('academicYearId')?.disable({ emitEvent: false });
    }

    this.IsAddNewClicked = true;
  }

  /**
   * Executes the operation: editreview
   * Parameters: PurchaseID: string
   * Rationale: Standard operational controller for the active view.
   */
  editreview(PurchaseID: string): void { this.FetchPurchaseByID(PurchaseID, 'edit'); }
  /**
   * Executes the operation: viewReview
   * Parameters: PurchaseID: string
   * Rationale: Standard operational controller for the active view.
   */
  viewReview(PurchaseID: string): void { this.FetchPurchaseByID(PurchaseID, 'view'); }

  /**
   * Executes the operation: FetchPurchaseByID
   * Parameters: PurchaseID: string, mode: 'view' | 'edit'
   * Rationale: Standard operational controller for the active view.
   */
  FetchPurchaseByID(PurchaseID: string, mode: 'view' | 'edit'): void {
    this.loader.show();
    this.apiurl.post<any>('Tbl_Purchase_CRUD_Operations', { ID: PurchaseID, Flag: '4' }).subscribe({
      next: (response: any) => {
        this.loader.hide();
        const item = response?.data?.[0];
        if (!item) return;

        const mapped: PurchaseRow = {
          id: String(item.id ?? item.ID ?? ''),
          schoolId: String(item.schoolID ?? ''),
          schoolName: String(item.schoolName ?? ''),
          academicYearId: String(item.academicYear ?? ''),
          academicYearName: String(item.academicYearName ?? ''),
          supplierId: String(item.supplierID ?? ''),
          supplierName: String(item.supplierName ?? ''),
          purchaseDate: item.purchaseDate
            ? new Date(item.purchaseDate).toISOString().split('T')[0] : '',
          paymentMode: String(item.paymentMode ?? 'Cash'),
          notes: String(item.notes ?? ''),
          itemIDs: String(item.itemIDs ?? ''),
          quantities: String(item.quantities ?? ''),
          prices: String(item.prices ?? ''),
          cgsts: String(item.cgsts ?? ''),
          sgsts: String(item.sgsts ?? ''),
          totalTaxes: String(item.totalTaxes ?? ''),
          subTotals: String(item.subTotals ?? ''),
          totalTaxAmount: Number(item.totalTaxAmount ?? 0),
          grandTotalAmount: Number(item.grandTotalAmount ?? 0),
          isActive: this.getBooleanValue(item.isActive ?? item.IsActive),
          createdDate: item.createdDate
        };

        if (mode === 'view') {
          this.viewPurchase = mapped;
          this.isViewModalOpen = true;
        }

        if (mode === 'edit') {
          this.editingId = mapped.id;
          this.selectedAdminSchoolID = mapped.schoolId;
          this.selectedAdminAcademicYearID = mapped.academicYearId;

          this.FetchAcademicYearsList(mapped.schoolId);
          this.FetchSuppliersList();
          this.FetchCategoriesList();
          this.FetchItemsListForEdit(mapped);

          this.purchaseForm.patchValue({
            schoolId: mapped.schoolId,
            academicYearId: mapped.academicYearId,
            supplierId: mapped.supplierId,
            purchaseDate: mapped.purchaseDate,
            paymentMode: mapped.paymentMode,
            notes: mapped.notes
          });
          if (!this.isAdmin) {
            this.purchaseForm.get('academicYearId')?.disable({ emitEvent: false });
          }

          this.IsActiveStatus = mapped.isActive;
          this.IsAddNewClicked = true;
          this.ViewPurchaseClicked = true;
        }
      },
      error: () => { this.loader.hide(); }
    });
  }

  /**
   * Executes the operation: FetchItemsListForEdit
   * Parameters: purchase: PurchaseRow
   * Rationale: Standard operational controller for the active view.
   */
  FetchItemsListForEdit(purchase: PurchaseRow): void {
    const schoolId = this.selectedAdminSchoolID || this.currentSchoolId;
    this.apiurl.post<any>('Tbl_Items_CRUD_Operations', {
      SchoolID: schoolId,
      AcademicYear: this.selectedAdminAcademicYearID || '',
      Flag: '3'
    }).subscribe({
      next: (res: any) => {
        this.itemsList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({
            ID: String(i.id ?? i.ID),
            Name: String(i.itemName ?? i.ItemName),
            PurchasePrice: Number(i.purchasePrice ?? i.PurchasePrice ?? 0),
            SellingPrice: Number(i.sellingPrice ?? i.SellingPrice ?? 0),
            TaxCGST: Number(i.taxCGST ?? i.TaxCGST ?? 0),
            TaxSGST: Number(i.taxSGST ?? i.TaxSGST ?? 0),
            OpeningStock: Number(i.openingStock ?? i.OpeningStock ?? 0),
            CategoryID: String(i.categoryID ?? i.CategoryID ?? '')
          }))
          : [];
        this.rebuildItemRows(purchase);
      }
    });
  }

  /**
   * Executes the operation: rebuildItemRows
   * Parameters: purchase: PurchaseRow
   * Rationale: Standard operational controller for the active view.
   */
rebuildItemRows(purchase: PurchaseRow): void {
  const ids = (purchase.itemIDs || '').split(',').map(s => s.trim()).filter(Boolean);
  const qtys = (purchase.quantities || '').split(',').map(s => Number(s.trim()));
  const prices = (purchase.prices || '').split(',').map(s => Number(s.trim()));
  const cgsts = (purchase.cgsts || '').split(',').map(s => Number(s.trim()));
  const sgsts = (purchase.sgsts || '').split(',').map(s => Number(s.trim()));
  const subTotals = (purchase.subTotals || '').split(',').map(s => Number(s.trim()));
  const totalTaxes = (purchase.totalTaxes || '').split(',').map(s => Number(s.trim()));

  this.purchaseItems = ids.map((id, i) => {
    const found = this.itemsList.find(it => it.ID === id);
    const categoryId = found?.CategoryID || '';
    const categoryName = this.categoriesList.find(c => c.ID === categoryId)?.Name || '';
    const filteredItems = categoryId
      ? this.itemsList.filter(it => it.CategoryID === categoryId)
      : this.itemsList;

    return {
      itemId: id, itemName: found?.Name || id,
      categoryId, categoryName,
      currentStock: found?.OpeningStock ?? null,
      quantity: qtys[i] ?? 1,
      price: prices[i] ?? 0,
      cgst: cgsts[i] ?? 0,
      sgst: sgsts[i] ?? 0,
      totalTax: totalTaxes[i] ?? 0,
      subTotal: subTotals[i] ?? 0,
      filteredItems
    };
  });

  if (this.purchaseItems.length === 0) this.addItemRow();

  // populate selectedUnitByRow for every restored row so validation actually runs
  this.purchaseItems.forEach((row, i) => {
    const found = this.itemsList.find(it => it.ID === row.itemId);
    if (found?.UnitID) {
      this.FetchUnitsListForValidationOnly(found.UnitID, i);
    }
  });
}
  /**
   * Executes the operation: FetchUnitsListForValidationOnly
   * Parameters: unitId: string, rowIndex: number
   * Rationale: Standard operational controller for the active view.
   */
FetchUnitsListForValidationOnly(unitId: string, rowIndex: number) {
  const requestData = { ID: unitId, Flag: '4' };

  this.apiurl.post<any>('Tbl_Units_CRUD_Operations', requestData).subscribe(
    (response: any) => {
      if (response?.data?.length) {
        const unit = response.data[0];
        this.selectedUnitByRow[rowIndex] = {
          MinimumValue: Number(unit.minimumValue),
          MaxValue: Number(unit.maximumValue),
          Difference: Number(unit.minimumDifference)
        };
      }
    }
  );
}
  /**
   * Executes the operation: SubmitPurchase
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  SubmitPurchase(): void { this.savePurchase('1'); }
  /**
   * Executes the operation: UpdatePurchase
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  UpdatePurchase(): void { this.savePurchase('5'); }

  /**
   * Executes the operation: savePurchase
   * Parameters: flag: string
   * Rationale: Standard operational controller for the active view.
   */
  private savePurchase(flag: string): void {
     if (this.purchaseForm.invalid) {
    this.purchaseForm.markAllAsTouched();
    return;
  }

  const hasInvalidQuantity = this.purchaseItems.some(
    (_, index) => this.quantityValidator(index) !== null
  );

  if (hasInvalidQuantity) {
    this.PurchaseInsStatus =
      'Please enter valid quantities for all items.';
    this.isModalOpen = true;
    return;
  }

    const validItems = this.purchaseItems.filter(r => r.itemId && r.quantity > 0);
    if (validItems.length === 0) {
      this.PurchaseInsStatus = 'Please add at least one item.';
      this.isModalOpen = true;
      return;
    }

    const payload = {
      ID: this.editingId || '0',
      SchoolID: String(this.purchaseForm.get('schoolId')?.value || this.currentSchoolId),
      AcademicYear: this.isAdmin ? String(this.purchaseForm.get('academicYearId')?.value) : (sessionStorage.getItem('ActiveAcademicYearID') || String(this.purchaseForm.get('academicYearId')?.value)),
      SupplierID: String(this.purchaseForm.get('supplierId')?.value),
      PurchaseDate: this.purchaseForm.get('purchaseDate')?.value,
      PaymentMode: String(this.purchaseForm.get('paymentMode')?.value),
      Notes: String(this.purchaseForm.get('notes')?.value || ''),
      ItemIDs: validItems.map(r => r.itemId).join(','),
      Quantities: validItems.map(r => r.quantity).join(','),
      Prices: validItems.map(r => r.price).join(','),
      CGSTs: validItems.map(r => r.cgst).join(','),
      SGSTs: validItems.map(r => r.sgst).join(','),
      TotalTaxes: validItems.map(r => r.totalTax.toFixed(2)).join(','),
      SubTotals: validItems.map(r => r.subTotal.toFixed(2)).join(','),
      TotalTaxAmount: this.totalTaxAmount,
      GrandTotalAmount: this.grandTotalAmount,
      IsActive: this.IsActiveStatus ? '1' : '0',
      Flag: flag
    };

    this.loader.show();
    this.apiurl.post<any>('Tbl_Purchase_CRUD_Operations', payload).subscribe({
      next: (res: any) => {
        this.loader.hide();
        if (res?.statusCode === 200 || res?.StatusCode === 200) {
          this.PurchaseInsStatus = flag === '1'
            ? 'Purchase Submitted Successfully!'
            : 'Purchase Updated Successfully!';
          this.isModalOpen = true;
          this.IsAddNewClicked = false;
          this.loadPurchases();
        } else {
          this.PurchaseInsStatus = res?.message || 'Error occurred while saving.';
          this.isModalOpen = true;
        }
      },
      error: (err: any) => {
        this.loader.hide();
        if (err.status === 400 && err.error?.message) {
          this.PurchaseInsStatus = err.error.message;
        } else if (err.status === 500 && err.error?.Message) {
          this.PurchaseInsStatus = err.error.Message;
        } else {
          this.PurchaseInsStatus = 'Unexpected error occurred.';
        }
        this.isModalOpen = true;
      }
    });
  }

  // ── data loading ──────────────────────────────────────────────────────────────
  // FIX 2: consistent school ID resolution
  FetchInitialData(extra: any = {}): void {
    const isSearch = !!this.searchQuery?.trim();
    const flag = isSearch ? '7' : '2';

    const schoolIdForQuery = this.isAdmin
      ? (this.selectedSchoolID && this.selectedSchoolID !== '0' ? this.selectedSchoolID : '')
      : this.currentSchoolId;

    const cursor = !extra.offset && this.currentPage > 1
      ? this.pageCursors[this.currentPage - 2] || null
      : null;

    this.loader.show();

    this.FetchPurchaseCount(isSearch).subscribe({
      next: (countResp: any) => {
        this.PurchaseCount = countResp?.data?.[0]?.totalcount ?? 0;

        const payload: any = {
          Flag: flag,
          Limit: this.pageSize,
          SortDirection: this.sortDirection,
          LastCreatedDate: cursor?.lastCreatedDate ?? null,
          LastID: cursor?.lastID ?? null,
          SchoolID: schoolIdForQuery,
          AcademicYear: this.isAdmin ? (sessionStorage.getItem('ActiveAcademicYearID') || '') : (sessionStorage.getItem('ActiveAcademicYearID') || ''),
          PaymentMode: isSearch ? this.searchQuery.trim() : null,
          ...extra
        };

        this.apiurl.post<any>('Tbl_Purchase_CRUD_Operations', payload).subscribe({
          next: (response: any) => {
            const data = response?.data || [];
            this.mapPurchases(response);
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
            this.PurchaseList = [];
            this.PurchaseCount = 0;
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.PurchaseList = [];
        this.PurchaseCount = 0;
        this.loader.hide();
      }
    });
  }

  /**
   * Executes the operation: loadPurchases
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  loadPurchases(): void {
    this.currentPage = 1;
    this.pageCursors = [];
    this.FetchInitialData();
  }

  /**
   * Executes the operation: mapPurchases
   * Parameters: response: any
   * Rationale: Standard operational controller for the active view.
   */
  mapPurchases(response: any): void {
    this.PurchaseList = (response.data || []).map((item: any) => ({
      id: String(item.id ?? item.ID ?? ''),
      schoolId: String(item.schoolID ?? ''),
      schoolName: String(item.schoolName ?? ''),
      academicYearId: String(item.academicYear ?? ''),
      academicYearName: String(item.academicYearName ?? ''),
      supplierId: String(item.supplierID ?? ''),
      supplierName: String(item.supplierName ?? ''),
      purchaseDate: item.purchaseDate
        ? new Date(item.purchaseDate).toISOString().split('T')[0] : '',
      paymentMode: String(item.paymentMode ?? ''),
      notes: String(item.notes ?? ''),
      itemIDs: String(item.itemIDs ?? ''),
      quantities: String(item.quantities ?? ''),
      prices: String(item.prices ?? ''),
      cgsts: String(item.cgsts ?? ''),
      sgsts: String(item.sgsts ?? ''),
      totalTaxes: String(item.totalTaxes ?? ''),
      subTotals: String(item.subTotals ?? ''),
      totalTaxAmount: Number(item.totalTaxAmount ?? 0),
      grandTotalAmount: Number(item.grandTotalAmount ?? 0),
      isActive: this.getBooleanValue(item.isActive ?? item.IsActive),
      createdDate: item.createdDate
    }));
  }

  /**
   * Executes the operation: FetchPurchaseCount
   * Parameters: isSearch: boolean
   * Rationale: Standard operational controller for the active view.
   */
  FetchPurchaseCount(isSearch: boolean) {
    const schoolIdForQuery = this.isAdmin
      ? (this.selectedSchoolID && this.selectedSchoolID !== '0' ? this.selectedSchoolID : '')
      : this.currentSchoolId;

    return this.apiurl.post<any>('Tbl_Purchase_CRUD_Operations', {
      Flag: isSearch ? '8' : '6',
      SchoolID: schoolIdForQuery,
      AcademicYear: this.isAdmin ? (sessionStorage.getItem('ActiveAcademicYearID') || '') : (sessionStorage.getItem('ActiveAcademicYearID') || '')
    });
  }

  // FIX 3: always call loadPurchases(), add error handler
  private FetchSchoolsList(): void {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (res: any) => {
        this.schoolList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({ ID: String(i.id), Name: String(i.name) }))
          : [];
        if (!this.isAdmin && this.currentSchoolId) {
          this.FetchAcademicYearsList(this.currentSchoolId);
          this.FetchSuppliersList();
          this.FetchCategoriesList();   // <-- ADD THIS
        this.FetchItemsList();     
        }
        this.loadPurchases();
      },
      error: () => {
        this.loadPurchases();
      }
    });
  }

  /**
   * Executes the operation: FetchAcademicYearsList
   * Parameters: schoolId: string
   * Rationale: Standard operational controller for the active view.
   */
  FetchAcademicYearsList(schoolId: string): void {
    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', {
      SchoolID: schoolId, Flag: '2'
    }).subscribe({
      next: (res: any) => {
        this.academicYearList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({ ID: String(i.id), Name: String(i.name) }))
          : [];
      }
    });
  }

  /**
   * Executes the operation: FetchSuppliersList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchSuppliersList(): void {
    const schoolId = this.selectedAdminSchoolID || this.currentSchoolId;
    this.apiurl.post<any>('Tbl_Suppliers_CRUD_Operations', {
      SchoolID: schoolId,
      AcademicYear: this.selectedAdminAcademicYearID || '',
      Flag: '3'
    }).subscribe({
      next: (res: any) => {
        this.suppliersList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({
            ID: String(i.id ?? i.ID),
            Name: String(i.supplierName ?? i.SupplierName)
          }))
          : [];
      }
    });
  }

  /**
   * Executes the operation: FetchCategoriesList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchCategoriesList(): void {
    const schoolId = this.selectedAdminSchoolID || this.currentSchoolId;
    this.apiurl.post<any>('Tbl_Categories_CRUD_Operations', {
      SchoolID: schoolId,
      AcademicYear: this.selectedAdminAcademicYearID || '',
      Flag: '3'
    }).subscribe({
      next: (res: any) => {
        this.categoriesList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({
            ID: String(i.id ?? i.ID),
            Name: String(i.categoryName ?? i.CategoryName)
          }))
          : [];
      }
    });
  }

  /**
   * Executes the operation: FetchItemsList
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchItemsList(): void {
    const schoolId = this.selectedAdminSchoolID || this.currentSchoolId;
    this.apiurl.post<any>('Tbl_Items_CRUD_Operations', {
      SchoolID: schoolId,
      AcademicYear: this.selectedAdminAcademicYearID || '',
      Flag: '3'
    }).subscribe({
      next: (res: any) => {
        this.itemsList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({
            ID: String(i.id ?? i.ID),
            Name: String(i.itemName ?? i.ItemName),
            PurchasePrice: Number(i.purchasePrice ?? i.PurchasePrice ?? 0),
            SellingPrice: Number(i.sellingPrice ?? i.SellingPrice ?? 0),
            TaxCGST: Number(i.taxCGST ?? i.TaxCGST ?? 0),
            TaxSGST: Number(i.taxSGST ?? i.TaxSGST ?? 0),
            UnitID: String(i.unitID ?? i.UnitID ?? ''),
            OpeningStock: Number(i.openingStock ?? i.OpeningStock ?? 0),
            CategoryID: String(i.categoryID ?? i.CategoryID ?? '')
          }))
          : [];
      }
    });
  }
  /**
   * Executes the operation: FetchUnitsList
   * Parameters: unitId: string, rowIndex: number
   * Rationale: Standard operational controller for the active view.
   */
FetchUnitsList(unitId: string, rowIndex: number) {
  const requestData = {
    ID: unitId,
    Flag: '4'
  };

  this.apiurl.post<any>('Tbl_Units_CRUD_Operations', requestData).subscribe(
    (response: any) => {

      if (response?.data?.length) {

        const unit = response.data[0];

        this.selectedUnitByRow[rowIndex] = {
          MinimumValue: Number(unit.minimumValue),
          MaxValue: Number(unit.maximumValue),
          Difference: Number(unit.minimumDifference)
        };

        this.purchaseItems[rowIndex].quantity =
          Number(unit.minimumValue);
      }
    }
  );
}
  /**
   * Executes the operation: onSearchChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  onSearchChange(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      const value = this.searchQuery?.trim() || '';
      if (value.length === 0) {
        this.currentPage = 1; this.pageSize = 5;
        this.visiblePageCount = 3; this.pageCursors = [];
        this.FetchInitialData(); return;
      }
      if (value.length < this.SEARCH_MIN_LENGTH) return;
      this.currentPage = 1; this.pageSize = 5;
      this.visiblePageCount = 3; this.pageCursors = [];
      this.FetchInitialData();
    }, this.SEARCH_DEBOUNCE);
  }

  /**
   * Executes the operation: onSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onSchoolChange(event: Event): void {
    const schoolID = (event.target as HTMLSelectElement).value;
    this.selectedSchoolID = schoolID === '0' ? '' : schoolID;
    this.loadPurchases();
  }

  /**
   * Executes the operation: onAdminSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminSchoolChange(event: Event): void {
    const schoolId = (event.target as HTMLSelectElement).value;
    this.academicYearList = [];
    this.suppliersList = [];
    this.categoriesList = [];
    this.itemsList = [];
    this.purchaseForm.get('academicYearId')?.patchValue(sessionStorage.getItem('ActiveAcademicYearID') || '');
    this.purchaseForm.get('supplierId')?.patchValue('');
    this.selectedAdminSchoolID = schoolId === '0' ? '' : schoolId;
    if (this.selectedAdminSchoolID) {
      this.FetchAcademicYearsList(this.selectedAdminSchoolID);
      this.FetchSuppliersList();
    }
  }

  /**
   * Executes the operation: onAdminAcademicYearChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAdminAcademicYearChange(event: Event): void {
    const yearId = (event.target as HTMLSelectElement).value;
    this.selectedAdminAcademicYearID = yearId === '0' ? '' : yearId;
    this.suppliersList = [];
    this.categoriesList = [];
    this.itemsList = [];
    this.purchaseForm.get('supplierId')?.patchValue('');
    this.purchaseItems.forEach(row => {
      row.categoryId = ''; row.itemId = '';
      row.filteredItems = []; row.currentStock = null;
      row.price = 0; row.cgst = 0; row.sgst = 0;
      row.totalTax = 0; row.subTotal = 0;
    });
    if (this.selectedAdminAcademicYearID) {
      this.FetchSuppliersList();
      this.FetchCategoriesList();
      this.FetchItemsList();
    }
  }

  /**
   * Executes the operation: onAcademicYearChangeNonAdmin
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAcademicYearChangeNonAdmin(event: Event): void {
    const yearId = (event.target as HTMLSelectElement).value;
    this.selectedAdminAcademicYearID = yearId === '0' ? '' : yearId;
    this.itemsList = [];
    this.categoriesList = [];
    this.suppliersList = [];
    this.purchaseForm.get('supplierId')?.patchValue('');
    this.purchaseItems.forEach(row => {
      row.categoryId = ''; row.itemId = '';
      row.filteredItems = []; row.currentStock = null;
      row.price = 0; row.cgst = 0; row.sgst = 0;
      row.totalTax = 0; row.subTotal = 0;
    });
    if (this.selectedAdminAcademicYearID) {
      this.FetchSuppliersList();
      this.FetchCategoriesList();
      this.FetchItemsList();
    }
  }

  /**
   * Executes the operation: handleOk
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  handleOk(): void { this.isModalOpen = false; }

  /**
   * Executes the operation: closeModal
   * Parameters: type: 'view' | 'status'
   * Rationale: Standard operational controller for the active view.
   */
  closeModal(type: 'view' | 'status'): void {
    if (type === 'view') { this.isViewModalOpen = false; this.viewPurchase = null; }
    if (type === 'status') this.isModalOpen = false;
  }

  getViewItemRows(): { name: string; qty: number; price: number; cgst: number; sgst: number; subTotal: number }[] {
    if (!this.viewPurchase) return [];
    const ids = (this.viewPurchase.itemIDs || '').split(',').map(s => s.trim());
    const qtys = (this.viewPurchase.quantities || '').split(',').map(s => Number(s.trim()));
    const prices = (this.viewPurchase.prices || '').split(',').map(s => Number(s.trim()));
    const cgsts = (this.viewPurchase.cgsts || '').split(',').map(s => Number(s.trim()));
    const sgsts = (this.viewPurchase.sgsts || '').split(',').map(s => Number(s.trim()));
    const subTotals = (this.viewPurchase.subTotals || '').split(',').map(s => Number(s.trim()));

    return ids.filter(Boolean).map((id, i) => {
      const found = this.itemsList.find(it => it.ID === id);
      return {
        name: found?.Name || id,
        qty: qtys[i] ?? 0,
        price: prices[i] ?? 0,
        cgst: cgsts[i] ?? 0,
        sgst: sgsts[i] ?? 0,
        subTotal: subTotals[i] ?? 0
      };
    });
  }

  /**
   * Executes the operation: previousPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  previousPage(): void { if (this.currentPage > 1) this.goToPage(this.currentPage - 1); }
  /**
   * Executes the operation: nextPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  nextPage(): void { if (this.currentPage < this.totalPages()) this.goToPage(this.currentPage + 1); }
  /**
   * Executes the operation: firstPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  firstPage(): void { this.goToPage(1); }
  /**
   * Executes the operation: lastPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  lastPage(): void { this.goToPage(this.totalPages()); }

  /**
   * Executes the operation: goToPage
   * Parameters: pageNumber: number
   * Rationale: Standard operational controller for the active view.
   */
  goToPage(pageNumber: number): void {
    const total = this.totalPages();
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > total) pageNumber = total;
    this.currentPage = pageNumber;
    const isBoundaryPage = pageNumber === 1 || pageNumber === total || !this.pageCursors[pageNumber - 2];
    if (isBoundaryPage) {
      this.FetchInitialData({ offset: (pageNumber - 1) * this.pageSize });
    } else {
      this.FetchInitialData();
    }
  }

  /**
   * Executes the operation: totalPages
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  totalPages(): number { return Math.ceil(this.PurchaseCount / this.pageSize); }

  /**
   * Executes the operation: pageStartIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageStartIndex(): number {
    return this.PurchaseCount === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
  }

  /**
   * Executes the operation: pageEndIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.PurchaseCount);
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
  getVisiblePageNumbers(): number[] {
    const totalPages = this.totalPages();
    const pages: number[] = [];
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, totalPages);
    if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  /**
   * Executes the operation: getBooleanValue
   * Parameters: val: any
   * Rationale: Standard operational controller for the active view.
   */
  private getBooleanValue(val: any): boolean {
    return val === true || val === 1 || val === '1' || val === 'True' || val === 'active';
  }

  /**
   * Executes the operation: exportPurchases
   * Parameters: type: 'pdf' | 'excel' | 'print'
   * Rationale: Standard operational controller for the active view.
   */
  exportPurchases(type: 'pdf' | 'excel' | 'print'): void {
    const payload: any = { Flag: '2', SchoolID: this.selectedSchoolID || null, AcademicYear: this.isAdmin ? null : (sessionStorage.getItem('ActiveAcademicYearID') || '') };
    this.loader.show();
    const url = `${this.apiurl.api_url}/ExportPurchases?type=${type}`;
    this.http.post(url, payload, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const fileNameBase = `Purchases_${new Date().toISOString().replace(/[:.]/g, '')}`;
        if (type === 'pdf' || type === 'print') {
          const fileURL = URL.createObjectURL(blob);
          if (type === 'print') { const pw = window.open(fileURL); pw?.focus(); pw?.print(); }
          else { const a = document.createElement('a'); a.href = fileURL; a.download = `${fileNameBase}.pdf`; a.click(); }
          setTimeout(() => URL.revokeObjectURL(fileURL), 1000);
        } else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = `${fileNameBase}.xlsx`; a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }
        this.loader.hide();
      },
      error: () => { alert(`${type.toUpperCase()} export failed.`); this.loader.hide(); }
    });
  }
  /**
   * Executes the operation: quantityValidator
   * Parameters: index: number
   * Rationale: Standard operational controller for the active view.
   */
 quantityValidator(index: number): any {

  const row = this.purchaseItems[index];
  const unit = this.selectedUnitByRow[index];

  if (!unit || row.quantity == null) {
    return null;
  }

  const value = Number(row.quantity);

  const min = Number(unit.MinimumValue);
  const max = Number(unit.MaxValue);

  if (value < min || value > max) {
    return { invalidRange: true };
  }

  return null;
}

  /**
   * Executes the operation: increaseQuantity
   * Parameters: index: number
   * Rationale: Standard operational controller for the active view.
   */
increaseQuantity(index: number): void {

  const unit = this.selectedUnitByRow[index];

  if (!unit) return;

  const row = this.purchaseItems[index];

  const currentValue =
    Number(row.quantity || unit.MinimumValue);

  const nextValue =
    currentValue + Number(unit.Difference);

  if (nextValue <= Number(unit.MaxValue)) {
    row.quantity = nextValue;
    this.recalculateRow(index);
  }
}

  /**
   * Executes the operation: decreaseQuantity
   * Parameters: index: number
   * Rationale: Standard operational controller for the active view.
   */
decreaseQuantity(index: number): void {

  const unit = this.selectedUnitByRow[index];

  if (!unit) return;

  const row = this.purchaseItems[index];

  const currentValue =
    Number(row.quantity || unit.MinimumValue);

  const nextValue =
    currentValue - Number(unit.Difference);

  if (nextValue >= Number(unit.MinimumValue)) {
    row.quantity = nextValue;
    this.recalculateRow(index);
  }
}

}