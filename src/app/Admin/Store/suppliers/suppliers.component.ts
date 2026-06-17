import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
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

interface SupplierRow {
  id: string;
  schoolId: string;
  schoolName: string;
  academicYearId: string;
  academicYearName: string;
  supplierName: string;
  emailAddress: string;
  phoneNumber: string;
  address: string;
  isActive: boolean;
  createdDate?: any;
}

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, ReactiveFormsModule, FormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './suppliers.component.html',
  styleUrl: './suppliers.component.css'
})
export class SuppliersComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Suppliers';
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
    this.FetchSchoolsList();  // loadSuppliers() is called inside this callback
    if (!this.isAdmin) {
      this.supplierForm.get('academicYearId')?.disable({ emitEvent: false });
    }
  }

  // ── state ─────────────────────────────────────────────────────────────────────

  // FIX 1: Use getter instead of field so isAdmin is always evaluated fresh
  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID') || '';
    return role === '1';
  }

  schoolList: Array<{ ID: string; Name: string }> = [];
  academicYearList: Array<{ ID: string; Name: string }> = [];

  readonly currentSchoolId =
    sessionStorage.getItem('SchoolID') ||
    sessionStorage.getItem('schoolId') ||
    localStorage.getItem('SchoolID') ||
    localStorage.getItem('schoolId') || '';

  IsAddNewClicked: boolean = false;
  IsActiveStatus: boolean = true;
  ViewSupplierClicked: boolean = false;

  SuppliersList: SupplierRow[] = [];
  SuppliersCount: number = 0;

  searchQuery: string = '';
  selectedSchoolID: string = '';

  SupplierInsStatus: string = '';
  isModalOpen: boolean = false;
  isViewModalOpen: boolean = false;
  viewSupplier: SupplierRow | null = null;

  editingId: string | null = null;
  selectedAdminSchoolID: string = '';

  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;

  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];

  sortColumn: string = 'CreatedDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  supplierForm = new FormGroup({
    schoolId: new FormControl('', Validators.required),
    academicYearId: new FormControl(sessionStorage.getItem('ActiveAcademicYearID') || '', Validators.required),
    supplierName: new FormControl('', [Validators.required, Validators.minLength(2)]),
    emailAddress: new FormControl('', [Validators.email]),
    phoneNumber: new FormControl('', [Validators.pattern(/^[0-9]{10,15}$/)]),
    address: new FormControl('')
  });

  // ── actions ───────────────────────────────────────────────────────────────────
  toggleChange(): void {
    this.IsActiveStatus = !this.IsActiveStatus;
  }

  AddNewClicked(): void {
    this.editingId = null;
    this.selectedAdminSchoolID = '';
    this.academicYearList = [];
    this.IsActiveStatus = true;
    this.ViewSupplierClicked = false;
    this.supplierForm.reset({
      schoolId: this.isAdmin ? '' : this.currentSchoolId,
      academicYearId: sessionStorage.getItem('ActiveAcademicYearID') || '',
      supplierName: '',
      emailAddress: '',
      phoneNumber: '',
      address: ''
    });

    if (!this.isAdmin && this.currentSchoolId) {
      this.FetchAcademicYearsList(this.currentSchoolId);
    }
    if (!this.isAdmin) {
      this.supplierForm.get('academicYearId')?.disable({ emitEvent: false });
    }

    this.IsAddNewClicked = !this.IsAddNewClicked;
  }

  editreview(SupplierID: string): void {
    this.FetchSupplierByID(SupplierID, 'edit');
  }

  viewReview(SupplierID: string): void {
    this.FetchSupplierByID(SupplierID, 'view');
  }

  FetchSupplierByID(SupplierID: string, mode: 'view' | 'edit'): void {
    const supplier = this.SuppliersList.find(s => s.id === SupplierID);
    if (!supplier) return;

    if (mode === 'view') {
      this.viewSupplier = { ...supplier };
      this.isViewModalOpen = true;
    }

    if (mode === 'edit') {
      this.editingId = supplier.id;
      this.selectedAdminSchoolID = supplier.schoolId;
      this.FetchAcademicYearsList(this.selectedAdminSchoolID);

      this.supplierForm.patchValue({
        schoolId: supplier.schoolId,
        academicYearId: supplier.academicYearId,
        supplierName: supplier.supplierName,
        emailAddress: supplier.emailAddress,
        phoneNumber: supplier.phoneNumber,
        address: supplier.address
      });
      if (!this.isAdmin) {
        this.supplierForm.get('academicYearId')?.disable({ emitEvent: false });
      }
      this.IsActiveStatus = supplier.isActive;
      this.IsAddNewClicked = true;
      this.ViewSupplierClicked = true;
    }
  }

  SubmitSupplier(): void { this.saveSupplier('1'); }
  UpdateSupplier(): void { this.saveSupplier('5'); }

  private saveSupplier(flag: string): void {
    if (this.supplierForm.invalid) {
      this.supplierForm.markAllAsTouched();
      this.SupplierInsStatus = 'Please fill all required fields correctly.';
      this.isModalOpen = true;
      return;
    }

    const payload = {
      ID: this.editingId || '0',
      SchoolID: String(this.supplierForm.get('schoolId')?.value),
      AcademicYear: this.isAdmin ? String(this.supplierForm.get('academicYearId')?.value) : (sessionStorage.getItem('ActiveAcademicYearID') || String(this.supplierForm.get('academicYearId')?.value)),
      SupplierName: String(this.supplierForm.get('supplierName')?.value).trim(),
      EmailAddress: String(this.supplierForm.get('emailAddress')?.value || '').trim(),
      PhoneNumber: String(this.supplierForm.get('phoneNumber')?.value || '').trim(),
      Address: String(this.supplierForm.get('address')?.value || '').trim(),
      IsActive: this.IsActiveStatus ? '1' : '0',
      Flag: flag
    };

    this.loader.show();
    this.apiurl.post<any>('Tbl_Suppliers_CRUD_Operations', payload).subscribe({
      next: (res: any) => {
        this.loader.hide();
        if (res?.statusCode === 200 || res?.StatusCode === 200) {
          this.SupplierInsStatus = flag === '1'
            ? 'Supplier Submitted Successfully!'
            : 'Supplier Updated Successfully!';
          this.isModalOpen = true;
          this.IsAddNewClicked = false;
          this.loadSuppliers();
        } else {
          this.SupplierInsStatus = res?.message || 'Error occurred while saving.';
          this.isModalOpen = true;
        }
      },
      error: (err: any) => {
        this.loader.hide();
        if (err.status === 400 && err.error?.message) {
          this.SupplierInsStatus = err.error.message;
        } else if (err.status === 500 && err.error?.Message) {
          this.SupplierInsStatus = err.error.Message;
        } else {
          this.SupplierInsStatus = 'Unexpected error occurred.';
        }
        this.isModalOpen = true;
      }
    });
  }

  // FIX 2: Rewritten to match LeavePolicy pattern exactly
  FetchInitialData(extra: any = {}): void {
    const isSearch = !!this.searchQuery?.trim();
    const flag = isSearch ? '7' : '2';

    // FIX 3: Use currentSchoolId for non-admin, same as LeavePolicy
    const schoolIdForQuery = this.isAdmin
      ? (this.selectedSchoolID && this.selectedSchoolID !== '0' ? this.selectedSchoolID : '')
      : this.currentSchoolId;

    const cursor = !extra.offset && this.currentPage > 1
      ? this.pageCursors[this.currentPage - 2] || null
      : null;

    this.loader.show();

    this.FetchSuppliersCount(isSearch).subscribe({
      next: (countResp: any) => {
        this.SuppliersCount = countResp?.data?.[0]?.totalcount ?? 0;

        const payload: any = {
          Flag: flag,
          Limit: this.pageSize,
          SortDirection: this.sortDirection,
          LastCreatedDate: cursor?.lastCreatedDate ?? null,
          LastID: cursor?.lastID ?? null,
          SchoolID: schoolIdForQuery,
          AcademicYear: this.isAdmin ? (sessionStorage.getItem('ActiveAcademicYearID') || '') : (sessionStorage.getItem('ActiveAcademicYearID') || ''),
          SupplierName: isSearch ? this.searchQuery.trim() : null,
          ...extra
        };

        this.apiurl.post<any>('Tbl_Suppliers_CRUD_Operations', payload).subscribe({
          next: (response: any) => {
            const data = response?.data || [];
            this.mapSuppliers(response);

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
            this.SuppliersList = [];
            this.SuppliersCount = 0;
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.SuppliersList = [];
        this.SuppliersCount = 0;
        this.loader.hide();
      }
    });
  }

  loadSuppliers(): void {
    this.currentPage = 1;
    this.pageCursors = [];
    this.FetchInitialData();
  }

  mapSuppliers(response: any): void {
    this.SuppliersList = (response.data || []).map((item: any) => ({
      id: String(item.id ?? item.ID ?? ''),
      schoolId: String(item.schoolID ?? item.SchoolID ?? ''),
      schoolName: String(item.schoolName ?? item.SchoolName ?? ''),
      academicYearId: String(item.academicYear ?? item.AcademicYear ?? ''),
      academicYearName: String(item.academicYearName ?? item.AcademicYearName ?? ''),
      supplierName: String(item.supplierName ?? item.SupplierName ?? ''),
      emailAddress: String(item.emailAddress ?? item.EmailAddress ?? ''),
      phoneNumber: String(item.phoneNumber ?? item.PhoneNumber ?? ''),
      address: String(item.address ?? item.Address ?? ''),
      isActive: this.getBooleanValue(item.isActive ?? item.IsActive),
      createdDate: item.createdDate || item.CreatedDate
    }));
  }

  // FIX 4: Count query cleaned up — no SupplierName on non-search count
  FetchSuppliersCount(isSearch: boolean) {
    const schoolIdForQuery = this.isAdmin
      ? (this.selectedSchoolID && this.selectedSchoolID !== '0' ? this.selectedSchoolID : '')
      : this.currentSchoolId;

    return this.apiurl.post<any>('Tbl_Suppliers_CRUD_Operations', {
      Flag: isSearch ? '8' : '6',
      SchoolID: schoolIdForQuery,
      AcademicYear: this.isAdmin ? (sessionStorage.getItem('ActiveAcademicYearID') || '') : (sessionStorage.getItem('ActiveAcademicYearID') || ''),
      SupplierName: isSearch ? this.searchQuery.trim() : null
    });
  }

  onSearchChange(): void {
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

  onSchoolChange(event: Event): void {
    const schoolID = (event.target as HTMLSelectElement).value;
    this.selectedSchoolID = schoolID === '0' ? '' : schoolID;
    this.loadSuppliers();
  }

  onAdminSchoolChange(event: Event): void {
    const schoolId = (event.target as HTMLSelectElement).value;
    this.academicYearList = [];
    this.supplierForm.get('academicYearId')?.patchValue(sessionStorage.getItem('ActiveAcademicYearID') || '');
    this.selectedAdminSchoolID = schoolId === '0' ? '' : schoolId;
    if (this.selectedAdminSchoolID) {
      this.FetchAcademicYearsList(this.selectedAdminSchoolID);
    }
  }

  handleOk(): void { this.isModalOpen = false; }

  closeModal(type: 'view' | 'status'): void {
    if (type === 'view') { this.isViewModalOpen = false; this.viewSupplier = null; }
    if (type === 'status') this.isModalOpen = false;
  }

  // FIX 5: Match LeavePolicy — always call loadSuppliers() unconditionally at end
  private FetchSchoolsList(): void {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (res: any) => {
        this.schoolList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({ ID: String(i.id), Name: String(i.name) }))
          : [];
        if (!this.isAdmin && this.currentSchoolId) {
          this.FetchAcademicYearsList(this.currentSchoolId);
        }
        this.loadSuppliers();  // ← always called, same as LeavePolicy
      },
      error: () => {
        // FIX 6: Even if school list fails, still try to load suppliers
        this.loadSuppliers();
      }
    });
  }

  private FetchAcademicYearsList(schoolId: string): void {
    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: schoolId, Flag: '2' }).subscribe({
      next: (res: any) => {
        this.academicYearList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({ ID: String(i.id), Name: String(i.name) }))
          : [];
      }
    });
  }

  private getBooleanValue(val: any): boolean {
    return val === true || val === 1 || val === '1' || val === 'True' || val === 'active';
  }

  exportSuppliers(type: 'pdf' | 'excel' | 'print'): void {
    const isSearch = !!this.searchQuery?.trim();
    const payload: any = {
      Flag: isSearch ? '7' : '2',
      SchoolID: this.selectedSchoolID || null,
      AcademicYear: this.isAdmin ? null : (sessionStorage.getItem('ActiveAcademicYearID') || null),
      SupplierName: isSearch ? this.searchQuery.trim() : null
    };

    this.loader.show();
    const url = `${this.apiurl.api_url}/ExportSuppliers?type=${type}`;

    this.http.post(url, payload, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const fileNameBase = `Suppliers_${new Date().toISOString().replace(/[:.]/g, '')}`;
        if (type === 'pdf' || type === 'print') {
          const fileURL = URL.createObjectURL(blob);
          if (type === 'print') {
            const printWindow = window.open(fileURL);
            printWindow?.focus(); printWindow?.print();
          } else {
            const a = document.createElement('a');
            a.href = fileURL; a.download = `${fileNameBase}.pdf`; a.click();
          }
          setTimeout(() => URL.revokeObjectURL(fileURL), 1000);
        } else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${fileNameBase}.xlsx`; a.click();
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

  previousPage(): void { if (this.currentPage > 1) this.goToPage(this.currentPage - 1); }
  nextPage(): void { if (this.currentPage < this.totalPages()) this.goToPage(this.currentPage + 1); }
  firstPage(): void { this.goToPage(1); }
  lastPage(): void { this.goToPage(this.totalPages()); }

  goToPage(pageNumber: number): void {
    const total = this.totalPages();
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > total) pageNumber = total;
    this.currentPage = pageNumber;

    const isBoundaryPage =
      pageNumber === 1 || pageNumber === total || !this.pageCursors[pageNumber - 2];

    if (isBoundaryPage) {
      this.FetchInitialData({ offset: (pageNumber - 1) * this.pageSize });
    } else {
      this.FetchInitialData();
    }
  }

  totalPages(): number { return Math.ceil(this.SuppliersCount / this.pageSize); }

  pageStartIndex(): number {
    return this.SuppliersCount === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
  }

  pageEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.SuppliersCount);
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
}