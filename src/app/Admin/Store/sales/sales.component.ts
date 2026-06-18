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

interface SaleItemRow {
  itemId: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  currentStock: number | null;
  sellingPrice: number;
  taxAmount: number;
  subTotal: number;
  filteredItems: Array<{
    ID: string;
    Name: string;
    SellingPrice: number;
    TaxCGST: number;
    TaxSGST: number;
    OpeningStock: number;
    CategoryID: string;
  }>;
}

interface SaleRow {
  id: string;
  schoolId: string;
  schoolName: string;
  academicYearId: string;
  academicYearName: string;
  classId: string;
  className: string;
  divisionId: string;
  divisionName: string;
  categoryNames: string;
  itemNames: string;
  admissionNo: string;
  studentName: string;
  categoryIDs: string;
  itemIDs: string;
  prices: string;
  taxAmounts: string;
  subTotals: string;
  totalTaxAmount: number;
  grandTotalAmount: number;
  paymentMode: string;
  notes: string;
  saleDate: string;
  isActive: boolean;
  createdDate?: any;
}

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [
    NgIf, NgFor, NgClass, NgStyle,
    ReactiveFormsModule, FormsModule,
    MatIconModule, DashboardTopNavComponent,
    DatePipe, CurrencyPipe, DecimalPipe
  ],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.css'
})
export class SalesComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Sales';
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

  ngOnInit(): void {
    this.checkViewPermission();
    this.FetchSchoolsList();
    this.today = new Date().toISOString().split('T')[0];
    if (!this.isAdmin) {
      this.salesForm.get('academicYearId')?.disable({ emitEvent: false });
    }
  }

  // ── state ──────────────────────────────────────────────────────────────────
  // FIX 1: getter instead of field so isAdmin is always fresh
  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID') || '';
    return role === '1';
  }

  schoolList: Array<{ ID: string; Name: string }> = [];
  academicYearList: Array<{ ID: string; Name: string }> = [];
  classLists: Array<{ ID: string; Name: string; Division: string }> = [];
  divisionsList: Array<{ ID: string; Name: string }> = [];
  categoriesList: Array<{ ID: string; Name: string }> = [];
  studentsList: Array<{
    ID: string; AdmissionNo: string; Name: string;
    Class: string; Division: string;
  }> = [];
  itemsList: Array<{
    ID: string;
    Name: string;
    SellingPrice: number;
    TaxCGST: number;
    TaxSGST: number;
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
  ViewSaleClicked: boolean = false;

  SalesList: SaleRow[] = [];
  SalesCount: number = 0;

  searchQuery: string = '';
  selectedSchoolID: string = '';

  SaleInsStatus: string = '';
  isModalOpen: boolean = false;
  isViewModalOpen: boolean = false;
  viewSale: SaleRow | null = null;

  editingId: string | null = null;
  selectedAdminSchoolID: string = '';
  selectedAdminAcademicYearID: string = sessionStorage.getItem('ActiveAcademicYearID') || '';
  AdminselectedClassID: string = '';
  AdminselectedDivisionID: string = '';

  saleItems: SaleItemRow[] = [];

  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;
  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
  sortDirection: 'asc' | 'desc' = 'desc';

  salesForm = new FormGroup({
    schoolId: new FormControl('', Validators.required),
    academicYearId: new FormControl(sessionStorage.getItem('ActiveAcademicYearID') || '', Validators.required),
    classId: new FormControl('', Validators.required),
    divisionId: new FormControl('', Validators.required),
    admissionNo: new FormControl('', Validators.required),
    saleDate: new FormControl('', Validators.required),
    paymentMode: new FormControl('Cash', Validators.required),
    notes: new FormControl('')
  });

  paymentModes: string[] = ['Cash', 'Cheque', 'Online', 'Card', 'UPI', 'Bank Transfer'];

  // ── computed totals ─────────────────────────────────────────────────────────
  get totalTaxAmount(): number {
    return this.saleItems.reduce((sum, row) => sum + (row.taxAmount || 0), 0);
  }

  get grandTotalAmount(): number {
    return this.saleItems.reduce((sum, row) => sum + (row.subTotal || 0), 0);
  }

  get itemsCount(): number {
    return this.saleItems.length;
  }

  // ── item row management ─────────────────────────────────────────────────────
  addItemRow(): void {
    this.saleItems.push({
      itemId: '', itemName: '',
      categoryId: '', categoryName: '',
      currentStock: null, sellingPrice: 0,
      taxAmount: 0, subTotal: 0, filteredItems: []
    });
  }

  removeItemRow(index: number): void {
    if (this.saleItems.length > 1) this.saleItems.splice(index, 1);
  }

  onCategorySelect(index: number, event: Event): void {
    const categoryId = (event.target as HTMLSelectElement).value;
    const row = this.saleItems[index];
    row.categoryId = categoryId;
    row.categoryName = this.categoriesList.find(c => c.ID === categoryId)?.Name || '';
    row.itemId = ''; row.itemName = '';
    row.currentStock = null; row.sellingPrice = 0;
    row.taxAmount = 0; row.subTotal = 0;
    row.filteredItems = categoryId
      ? this.itemsList.filter(i => i.CategoryID === categoryId)
      : [];
  }

  onItemSelect(index: number, event: Event): void {
    const itemId = (event.target as HTMLSelectElement).value;
    const row = this.saleItems[index];
    const selected = row.filteredItems.find(i => i.ID === itemId)
      || this.itemsList.find(i => i.ID === itemId);
    if (!selected) return;
    row.itemId = selected.ID;
    row.itemName = selected.Name;
    row.currentStock = selected.OpeningStock ?? 0;
    row.sellingPrice = selected.SellingPrice ?? 0;
    this.recalculateRow(index);
  }

  onPriceChange(index: number): void { this.recalculateRow(index); }

  recalculateRow(index: number): void {
    const row = this.saleItems[index];
    const found = this.itemsList.find(i => i.ID === row.itemId);
    const price = Number(row.sellingPrice) || 0;
    const cgst = found?.TaxCGST ?? 0;
    const sgst = found?.TaxSGST ?? 0;
    row.taxAmount = (price * cgst / 100) + (price * sgst / 100);
    row.subTotal = price + row.taxAmount;
  }

  // ── form actions ────────────────────────────────────────────────────────────
  AddNewClicked(): void {
    this.editingId = null;
    this.selectedAdminSchoolID = '';
    this.selectedAdminAcademicYearID = '';
    this.AdminselectedClassID = '';
    this.AdminselectedDivisionID = '';
    this.academicYearList = [];
    this.classLists = [];
    this.divisionsList = [];
    this.categoriesList = [];
    this.itemsList = [];
    this.studentsList = [];
    this.IsActiveStatus = true;
    this.ViewSaleClicked = false;

    this.salesForm.reset({
      schoolId: this.isAdmin ? '' : this.currentSchoolId,
      academicYearId: sessionStorage.getItem('ActiveAcademicYearID') || '', classId: '', divisionId: '',
      admissionNo: '', saleDate: this.today,
      paymentMode: 'Cash', notes: ''
    });

    this.saleItems = [];
    this.addItemRow();

    if (!this.isAdmin && this.currentSchoolId) {
      this.selectedAdminSchoolID = this.currentSchoolId;
      this.selectedAdminAcademicYearID = this.salesForm.get('academicYearId')?.value || this.selectedAdminAcademicYearID;
      this.FetchAcademicYearsList(this.currentSchoolId);
      if (this.selectedAdminAcademicYearID) {
        this.FetchClassList();
        this.FetchCategoriesList();
        this.FetchItemsList();
      }
    }
    if (!this.isAdmin) {
      this.salesForm.get('academicYearId')?.disable({ emitEvent: false });
    }

    this.IsAddNewClicked = true;
  }

  editreview(SaleID: string): void { this.FetchSaleByID(SaleID, 'edit'); }
  viewReview(SaleID: string): void { this.FetchSaleByID(SaleID, 'view'); }

  FetchSaleByID(SaleID: string, mode: 'view' | 'edit'): void {
    this.loader.show();
    this.apiurl.post<any>('Tbl_Sales_CRUD_Operations', { ID: SaleID, Flag: '4' }).subscribe({
      next: (response: any) => {
        this.loader.hide();
        const item = response?.data?.[0];
        if (!item) return;

        const mapped: SaleRow = {
          id: String(item.id ?? item.ID ?? ''),
          schoolId: String(item.schoolID ?? ''),
          schoolName: String(item.schoolName ?? ''),
          academicYearId: String(item.academicYear ?? ''),
          academicYearName: String(item.academicYearName ?? ''),
          classId: String(item.classID ?? ''),
          className: String(item.className ?? ''),
          divisionId: String(item.divisionID ?? ''),
          divisionName: String(item.divisionName ?? ''),
          categoryNames: String(item.categoryNames ?? ''),
          itemNames: String(item.itemNames ?? ''),
          admissionNo: String(item.admissionNo ?? ''),
          studentName: String(item.studentName ?? ''),
          categoryIDs: String(item.categoryIDs ?? ''),
          itemIDs: String(item.itemIDs ?? ''),
          prices: String(item.prices ?? ''),
          taxAmounts: String(item.taxAmounts ?? ''),
          subTotals: String(item.subTotals ?? ''),
          totalTaxAmount: Number(item.totalTaxAmount ?? 0),
          grandTotalAmount: Number(item.grandTotalAmount ?? 0),
          paymentMode: String(item.paymentMode ?? 'Cash'),
          notes: String(item.notes ?? ''),
          saleDate: item.saleDate
            ? new Date(item.saleDate).toISOString().split('T')[0] : '',
          isActive: this.getBooleanValue(item.isActive ?? item.IsActive),
          createdDate: item.createdDate
        };

        if (mode === 'view') {
          this.viewSale = mapped;
          this.isViewModalOpen = true;
        }

        if (mode === 'edit') {
          this.editingId = mapped.id;
          this.selectedAdminSchoolID = mapped.schoolId;
          this.selectedAdminAcademicYearID = mapped.academicYearId;
          this.AdminselectedClassID = mapped.classId;
          this.AdminselectedDivisionID = mapped.divisionId;

          this.FetchAcademicYearsList(mapped.schoolId);
          this.FetchClassList();
          this.FetchDivisionsList();
          this.FetchCategoriesList();
          this.FetchItemsListForEdit(mapped);

          this.salesForm.patchValue({
            schoolId: mapped.schoolId,
            academicYearId: mapped.academicYearId,
            classId: mapped.classId,
            divisionId: mapped.divisionId,
            admissionNo: mapped.admissionNo,
            saleDate: mapped.saleDate,
            paymentMode: mapped.paymentMode,
            notes: mapped.notes
          });
          if (!this.isAdmin) {
            this.salesForm.get('academicYearId')?.disable({ emitEvent: false });
          }

          this.IsActiveStatus = mapped.isActive;
          this.IsAddNewClicked = true;
          this.ViewSaleClicked = true;
        }
      },
      error: () => { this.loader.hide(); }
    });
  }

  FetchItemsListForEdit(sale: SaleRow): void {
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
            SellingPrice: Number(i.sellingPrice ?? i.SellingPrice ?? 0),
            TaxCGST: Number(i.taxCGST ?? i.TaxCGST ?? 0),
            TaxSGST: Number(i.taxSGST ?? i.TaxSGST ?? 0),
            OpeningStock: Number(i.openingStock ?? i.OpeningStock ?? 0),
            CategoryID: String(i.categoryID ?? i.CategoryID ?? '')
          }))
          : [];
        this.rebuildItemRows(sale);
      }
    });
  }

  rebuildItemRows(sale: SaleRow): void {
    const ids = (sale.itemIDs || '').split(',').map(s => s.trim()).filter(Boolean);
    const catIds = (sale.categoryIDs || '').split(',').map(s => s.trim());
    const prices = (sale.prices || '').split(',').map(s => Number(s.trim()));
    const taxAmounts = (sale.taxAmounts || '').split(',').map(s => Number(s.trim()));
    const subTotals = (sale.subTotals || '').split(',').map(s => Number(s.trim()));

    this.saleItems = ids.map((id, i) => {
      const found = this.itemsList.find(it => it.ID === id);
      const categoryId = catIds[i] || found?.CategoryID || '';
      const categoryName = this.categoriesList.find(c => c.ID === categoryId)?.Name || '';
      const filteredItems = categoryId
        ? this.itemsList.filter(it => it.CategoryID === categoryId)
        : this.itemsList;

      return {
        itemId: id, itemName: found?.Name || id,
        categoryId, categoryName,
        currentStock: found?.OpeningStock ?? null,
        sellingPrice: prices[i] ?? 0,
        taxAmount: taxAmounts[i] ?? 0,
        subTotal: subTotals[i] ?? 0,
        filteredItems
      };
    });

    if (this.saleItems.length === 0) this.addItemRow();
  }

  SubmitSale(): void { this.saveSale('1'); }
  UpdateSale(): void { this.saveSale('5'); }

  private saveSale(flag: string): void {
    if (this.salesForm.invalid) {
      this.salesForm.markAllAsTouched();
      this.SaleInsStatus = 'Please fill all required fields correctly.';
      this.isModalOpen = true;
      return;
    }

    const validItems = this.saleItems.filter(r => r.itemId);
    if (validItems.length === 0) {
      this.SaleInsStatus = 'Please add at least one item.';
      this.isModalOpen = true;
      return;
    }

    const payload = {
      ID: this.editingId || '0',
      SchoolID: String(this.salesForm.get('schoolId')?.value || this.currentSchoolId),
      AcademicYear: this.isAdmin ? String(this.salesForm.get('academicYearId')?.value) : (sessionStorage.getItem('ActiveAcademicYearID') || String(this.salesForm.get('academicYearId')?.value)),
      ClassID: String(this.salesForm.get('classId')?.value),
      DivisionID: String(this.salesForm.get('divisionId')?.value),
      AdmissionNo: String(this.salesForm.get('admissionNo')?.value),
      CategoryIDs: validItems.map(r => r.categoryId).join(','),
      ItemIDs: validItems.map(r => r.itemId).join(','),
      Prices: validItems.map(r => r.sellingPrice).join(','),
      TaxAmounts: validItems.map(r => r.taxAmount.toFixed(2)).join(','),
      SubTotals: validItems.map(r => r.subTotal.toFixed(2)).join(','),
      TotalTaxAmount: this.totalTaxAmount,
      GrandTotalAmount: this.grandTotalAmount,
      PaymentMode: String(this.salesForm.get('paymentMode')?.value),
      Notes: String(this.salesForm.get('notes')?.value || ''),
      SaleDate: this.salesForm.get('saleDate')?.value,
      IsActive: this.IsActiveStatus ? '1' : '0',
      Flag: flag
    };

    this.loader.show();
    this.apiurl.post<any>('Tbl_Sales_CRUD_Operations', payload).subscribe({
      next: (res: any) => {
        this.loader.hide();
        if (res?.statusCode === 200 || res?.StatusCode === 200) {
          this.SaleInsStatus = flag === '1'
            ? 'Sale Submitted Successfully!'
            : 'Sale Updated Successfully!';
          this.isModalOpen = true;
          this.IsAddNewClicked = false;
          this.loadSales();
        } else {
          this.SaleInsStatus = res?.message || 'Error occurred while saving.';
          this.isModalOpen = true;
        }
      },
      error: (err: any) => {
        this.loader.hide();
        if (err.status === 400 && err.error?.message) {
          this.SaleInsStatus = err.error.message;
        } else if (err.status === 500 && err.error?.Message) {
          this.SaleInsStatus = err.error.Message;
        } else {
          this.SaleInsStatus = 'Unexpected error occurred.';
        }
        this.isModalOpen = true;
      }
    });
  }

  // ── data loading ────────────────────────────────────────────────────────────
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

    this.FetchSalesCount(isSearch).subscribe({
      next: (countResp: any) => {
        this.SalesCount = countResp?.data?.[0]?.totalcount ?? 0;

        const payload: any = {
          Flag: flag,
          Limit: this.pageSize,
          SortDirection: this.sortDirection,
          LastCreatedDate: cursor?.lastCreatedDate ?? null,
          LastID: cursor?.lastID ?? null,
          SchoolID: schoolIdForQuery,
          AcademicYear: this.isAdmin ? (sessionStorage.getItem('ActiveAcademicYearID') || '') : (sessionStorage.getItem('ActiveAcademicYearID') || ''),
          AdmissionNo: isSearch ? this.searchQuery.trim() : null,
          ...extra
        };

        this.apiurl.post<any>('Tbl_Sales_CRUD_Operations', payload).subscribe({
          next: (response: any) => {
            const data = response?.data || [];
            this.mapSales(response);
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
            this.SalesList = [];
            this.SalesCount = 0;
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.SalesList = [];
        this.SalesCount = 0;
        this.loader.hide();
      }
    });
  }

  loadSales(): void {
    this.currentPage = 1;
    this.pageCursors = [];
    this.FetchInitialData();
  }

  mapSales(response: any): void {
    this.SalesList = (response.data || []).map((item: any) => ({
      id: String(item.id ?? item.ID ?? ''),
      schoolId: String(item.schoolID ?? ''),
      schoolName: String(item.schoolName ?? ''),
      academicYearId: String(item.academicYear ?? ''),
      academicYearName: String(item.academicYearName ?? ''),
      classId: String(item.classID ?? ''),
      className: String(item.className ?? ''),
      divisionId: String(item.divisionID ?? ''),
      divisionName: String(item.divisionName ?? ''),
      categoryNames: String(item.categoryNames ?? ''),
      itemNames: String(item.itemNames ?? ''),
      admissionNo: String(item.admissionNo ?? ''),
      studentName: String(item.studentName ?? ''),
      categoryIDs: String(item.categoryIDs ?? ''),
      itemIDs: String(item.itemIDs ?? ''),
      prices: String(item.prices ?? ''),
      taxAmounts: String(item.taxAmounts ?? ''),
      subTotals: String(item.subTotals ?? ''),
      totalTaxAmount: Number(item.totalTaxAmount ?? 0),
      grandTotalAmount: Number(item.grandTotalAmount ?? 0),
      paymentMode: String(item.paymentMode ?? ''),
      notes: String(item.notes ?? ''),
      saleDate: item.saleDate
        ? new Date(item.saleDate).toISOString().split('T')[0] : '',
      isActive: this.getBooleanValue(item.isActive ?? item.IsActive),
      createdDate: item.createdDate
    }));
  }

  FetchSalesCount(isSearch: boolean) {
    const schoolIdForQuery = this.isAdmin
      ? (this.selectedSchoolID && this.selectedSchoolID !== '0' ? this.selectedSchoolID : '')
      : this.currentSchoolId;

    return this.apiurl.post<any>('Tbl_Sales_CRUD_Operations', {
      Flag: isSearch ? '8' : '6',
      SchoolID: schoolIdForQuery,
      AcademicYear: this.isAdmin ? (sessionStorage.getItem('ActiveAcademicYearID') || '') : (sessionStorage.getItem('ActiveAcademicYearID') || ''),
      AdmissionNo: isSearch ? this.searchQuery.trim() : null
    });
  }

  // FIX 3: always call loadSales(), add error handler
  private FetchSchoolsList(): void {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (res: any) => {
        this.schoolList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({ ID: String(i.id), Name: String(i.name) }))
          : [];
        if (!this.isAdmin && this.currentSchoolId) {
          this.FetchAcademicYearsList(this.currentSchoolId);
        }
        this.loadSales();
      },
      error: () => {
        this.loadSales();
      }
    });
  }

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

  FetchClassList(): void {
    this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', {
      SchoolID: this.selectedAdminSchoolID || '',
      AcademicYear: this.selectedAdminAcademicYearID || '',
      Flag: '9'
    }).subscribe(
      (response: any) => {
        if (response && Array.isArray(response.data)) {
          this.classLists = response.data.map((item: any) => ({
            ID: item.sNo.toString(),
            Name: item.syllabusClassName,
            Division: item.class
          }));
        } else {
          this.classLists = [];
        }
      },
      () => { this.classLists = []; }
    );
  }

  FetchDivisionsList(): void {
    this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', {
      SchoolID: this.selectedAdminSchoolID || '',
      AcademicYear: this.selectedAdminAcademicYearID || '',
      Class: this.AdminselectedClassID || '',
      Flag: '3'
    }).subscribe(
      (response: any) => {
        if (response && Array.isArray(response.data)) {
          this.divisionsList = response.data.map((item: any) => ({
            ID: item.id, Name: item.name
          }));
        } else {
          this.divisionsList = [];
        }
      },
      () => { this.divisionsList = []; }
    );
  }

  FetchClassStudentsList(): void {
    this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', {
      SchoolID: this.selectedAdminSchoolID || this.currentSchoolId,
      AcademicYear: this.selectedAdminAcademicYearID || '',
      Class: this.AdminselectedClassID || '',
      Division: this.AdminselectedDivisionID || '',
      Flag: '3'
    }).subscribe(
      (response: any) => {
        if (response && Array.isArray(response.data)) {
          this.studentsList = response.data.map((item: any) => ({
            ID: item.id,
            AdmissionNo: item.admissionNo,
            Name: `${item.admissionNo ?? ''} - ${item.firstName ?? ''} ${item.middleName ?? ''} ${item.lastName ?? ''}`.replace(/\s+/g, ' ').trim(),
            Class: item.className,
            Division: item.classDivisionName
          }));
        } else {
          this.studentsList = [];
        }
      },
      () => { this.studentsList = []; }
    );
  }

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
            SellingPrice: Number(i.sellingPrice ?? i.SellingPrice ?? 0),
            TaxCGST: Number(i.taxCGST ?? i.TaxCGST ?? 0),
            TaxSGST: Number(i.taxSGST ?? i.TaxSGST ?? 0),
            OpeningStock: Number(i.openingStock ?? i.OpeningStock ?? 0),
            CategoryID: String(i.categoryID ?? i.CategoryID ?? '')
          }))
          : [];
      }
    });
  }

  // ── cascade handlers ────────────────────────────────────────────────────────
  onSchoolChange(event: Event): void {
    const schoolID = (event.target as HTMLSelectElement).value;
    this.selectedSchoolID = schoolID === '0' ? '' : schoolID;
    this.loadSales();
  }

  onAdminSchoolChange(event: Event): void {
    const schoolId = (event.target as HTMLSelectElement).value;
    this.academicYearList = [];
    this.classLists = [];
    this.divisionsList = [];
    this.categoriesList = [];
    this.itemsList = [];
    this.studentsList = [];
    this.salesForm.get('academicYearId')?.patchValue(sessionStorage.getItem('ActiveAcademicYearID') || '');
    this.salesForm.get('classId')?.patchValue('');
    this.salesForm.get('divisionId')?.patchValue('');
    this.salesForm.get('admissionNo')?.patchValue('');
    this.selectedAdminSchoolID = schoolId === '0' ? '' : schoolId;
    if (this.selectedAdminSchoolID) {
      this.FetchAcademicYearsList(this.selectedAdminSchoolID);
    }
  }

  onAdminAcademicYearChange(event: Event): void {
    const yearId = (event.target as HTMLSelectElement).value;
    this.selectedAdminAcademicYearID = yearId === '0' ? '' : yearId;
    this.classLists = [];
    this.divisionsList = [];
    this.categoriesList = [];
    this.itemsList = [];
    this.studentsList = [];
    this.AdminselectedClassID = '';
    this.AdminselectedDivisionID = '';
    this.salesForm.get('classId')?.patchValue('');
    this.salesForm.get('divisionId')?.patchValue('');
    this.salesForm.get('admissionNo')?.patchValue('');
    this.saleItems.forEach(row => {
      row.categoryId = ''; row.itemId = '';
      row.filteredItems = []; row.currentStock = null;
      row.sellingPrice = 0; row.taxAmount = 0; row.subTotal = 0;
    });
    if (this.selectedAdminAcademicYearID) {
      this.FetchClassList();
      this.FetchCategoriesList();
      this.FetchItemsList();
    }
  }

  onAcademicYearChangeNonAdmin(event: Event): void {
    const yearId = (event.target as HTMLSelectElement).value;
    this.selectedAdminAcademicYearID = yearId === '0' ? '' : yearId;
    this.classLists = [];
    this.divisionsList = [];
    this.categoriesList = [];
    this.itemsList = [];
    this.studentsList = [];
    this.AdminselectedClassID = '';
    this.AdminselectedDivisionID = '';
    this.salesForm.get('classId')?.patchValue('');
    this.salesForm.get('divisionId')?.patchValue('');
    this.salesForm.get('admissionNo')?.patchValue('');
    this.saleItems.forEach(row => {
      row.categoryId = ''; row.itemId = '';
      row.filteredItems = []; row.currentStock = null;
      row.sellingPrice = 0; row.taxAmount = 0; row.subTotal = 0;
    });
    if (this.selectedAdminAcademicYearID) {
      this.FetchClassList();
      this.FetchCategoriesList();
      this.FetchItemsList();
    }
  }

  onClassChange(event: Event): void {
    const classId = (event.target as HTMLSelectElement).value;
    this.AdminselectedClassID = classId === '0' ? '' : classId;
    this.divisionsList = [];
    this.studentsList = [];
    this.AdminselectedDivisionID = '';
    this.salesForm.get('divisionId')?.patchValue('');
    this.salesForm.get('admissionNo')?.patchValue('');
    if (this.AdminselectedClassID) this.FetchDivisionsList();
  }

  onDivisionChange(event: Event): void {
    const divisionId = (event.target as HTMLSelectElement).value;
    this.AdminselectedDivisionID = divisionId === '0' ? '' : divisionId;
    this.studentsList = [];
    this.salesForm.get('admissionNo')?.patchValue('');
    if (this.AdminselectedDivisionID) this.FetchClassStudentsList();
  }

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

  handleOk(): void { this.isModalOpen = false; }

  closeModal(type: 'view' | 'status'): void {
    if (type === 'view') { this.isViewModalOpen = false; this.viewSale = null; }
    if (type === 'status') this.isModalOpen = false;
  }

  getViewItemRows(): { name: string; price: number; taxAmount: number; subTotal: number }[] {
    if (!this.viewSale) return [];
    const ids = (this.viewSale.itemIDs || '').split(',').map(s => s.trim());
    const prices = (this.viewSale.prices || '').split(',').map(s => Number(s.trim()));
    const taxAmounts = (this.viewSale.taxAmounts || '').split(',').map(s => Number(s.trim()));
    const subTotals = (this.viewSale.subTotals || '').split(',').map(s => Number(s.trim()));

    return ids.filter(Boolean).map((id, i) => {
      const found = this.itemsList.find(it => it.ID === id);
      return {
        name: found?.Name || id,
        price: prices[i] ?? 0,
        taxAmount: taxAmounts[i] ?? 0,
        subTotal: subTotals[i] ?? 0
      };
    });
  }

  toggleChange(): void { this.IsActiveStatus = !this.IsActiveStatus; }

  previousPage(): void { if (this.currentPage > 1) this.goToPage(this.currentPage - 1); }
  nextPage(): void { if (this.currentPage < this.totalPages()) this.goToPage(this.currentPage + 1); }
  firstPage(): void { this.goToPage(1); }
  lastPage(): void { this.goToPage(this.totalPages()); }

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

  totalPages(): number { return Math.ceil(this.SalesCount / this.pageSize); }

  pageStartIndex(): number {
    return this.SalesCount === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
  }

  pageEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.SalesCount);
  }

  onRowsCountChange() {
    this.currentPage = 1;
    this.pageCursors = [];
    this.FetchInitialData();
  }

  getVisiblePageNumbers(): number[] {
    const totalPages = this.totalPages();
    const pages: number[] = [];
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, totalPages);
    if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  private getBooleanValue(val: any): boolean {
    return val === true || val === 1 || val === '1' || val === 'True' || val === 'active';
  }
}