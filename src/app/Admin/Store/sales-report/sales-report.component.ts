import { NgClass, NgFor, NgIf, NgStyle, DecimalPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { Router } from '@angular/router';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { LoaderService } from '../../../Services/loader.service';
import { HttpClient } from '@angular/common/http';

interface SaleReportRow {
  id: string;
  schoolId: string;
  schoolName: string;
  academicYearId: string;
  academicYearName: string;
  classId: string;
  className: string;
  divisionId: string;
  divisionName: string;
  admissionNo: string;
  studentName: string;
  totalTaxAmount: number;
  grandTotalAmount: number;
  paymentMode: string;
  saleDate: string;
  isActive: boolean;
}

@Component({
  selector: 'app-sales-report',
  standalone: true,
  imports: [
    NgIf, NgFor, NgClass, NgStyle,
    FormsModule, MatIconModule,
    DashboardTopNavComponent, DecimalPipe
  ],
  templateUrl: './sales-report.component.html',
  styleUrl: './sales-report.component.css'
})
export class SalesReportComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Sales Report';

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
    this.selectedAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';

    // Fix 3: pre-set school and load academic years for non-admin
    // immediately — don't wait for FetchSchoolsList HTTP call
    if (!this.isAdmin && this.currentSchoolId) {
      this.selectedSchoolID = this.currentSchoolId;
      this.FetchAcademicYearsList(this.currentSchoolId);
    }

    this.FetchSchoolsList();
  }

  // ── role ────────────────────────────────────────────────────────────────────
  // getter so isAdmin is always read fresh from storage, never stale
  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID') || '';
    return role === '1';
  }

  readonly currentSchoolId =
    sessionStorage.getItem('SchoolID') ||
    sessionStorage.getItem('schoolId') ||
    localStorage.getItem('SchoolID') ||
    localStorage.getItem('schoolId') || '';

  // ── dropdown lists ──────────────────────────────────────────────────────────
  schoolList: Array<{ ID: string; Name: string }> = [];
  academicYearList: Array<{ ID: string; Name: string }> = [];
  classLists: Array<{ ID: string; Name: string; Division: string }> = [];
  divisionsList: Array<{ ID: string; Name: string }> = [];
  studentsList: Array<{ ID: string; AdmissionNo: string; Name: string }> = [];

  // ── selected filter values ──────────────────────────────────────────────────
  selectedSchoolID: string = '';
  selectedAcademicYearID: string = sessionStorage.getItem('ActiveAcademicYearID') || '';
  selectedClassID: string = '';
  selectedDivisionID: string = '';
  selectedAdmissionNo: string = '';

  // ── report data ─────────────────────────────────────────────────────────────
  ReportList: SaleReportRow[] = [];
  ReportCount: number = 0;
  hasSearched: boolean = false;

  // ── pagination ──────────────────────────────────────────────────────────────
  currentPage = 1;
  pageSize = 10;
  visiblePageCount = 3;
  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
  sortDirection: 'asc' | 'desc' = 'desc';

  // ── summary getters ─────────────────────────────────────────────────────────
  get totalSalesCount(): number { return this.ReportCount; }

  get totalRevenue(): number {
    return this.ReportList.reduce((sum, r) => sum + (r.grandTotalAmount || 0), 0);
  }

  get totalTax(): number {
    return this.ReportList.reduce((sum, r) => sum + (r.totalTaxAmount || 0), 0);
  }

  // ── fetch schools ───────────────────────────────────────────────────────────
  private FetchSchoolsList(): void {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (res: any) => {
        this.schoolList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({ ID: String(i.id), Name: String(i.name) }))
          : [];

        // For non-admin: if academic years not yet loaded by ngOnInit
        // (edge case where ngOnInit fired before storage was ready),
        // retry here as a safety net
        if (!this.isAdmin && this.currentSchoolId && this.academicYearList.length === 0) {
          this.selectedSchoolID = this.currentSchoolId;
          this.FetchAcademicYearsList(this.currentSchoolId);
        }
      },
      error: () => {
        // even on error, ensure non-admin school ID is set
        if (!this.isAdmin && this.currentSchoolId) {
          this.selectedSchoolID = this.currentSchoolId;
        }
      }
    });
  }

  // ── fetch academic years ────────────────────────────────────────────────────
  FetchAcademicYearsList(schoolId: string): void {
    this.academicYearList = [];
    this.classLists = [];
    this.divisionsList = [];
    this.studentsList = [];
    this.selectedAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';
    this.selectedClassID = '';
    this.selectedDivisionID = '';
    this.selectedAdmissionNo = '';

    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', {
      SchoolID: schoolId,
      Flag: '2'
    }).subscribe({
      next: (res: any) => {
        this.academicYearList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({ ID: String(i.id), Name: String(i.name) }))
          : [];
        const activeYearId = sessionStorage.getItem('ActiveAcademicYearID') || '';
        const matchedYear = this.academicYearList.find(y => y.ID === activeYearId);
        if (matchedYear) {
          this.selectedAcademicYearID = matchedYear.ID;
          this.FetchClassList();
        } else if (this.academicYearList.length > 0 && !this.selectedAcademicYearID) {
          this.selectedAcademicYearID = this.academicYearList[0].ID;
          this.FetchClassList();
        }
      },
      error: () => { this.academicYearList = []; }
    });
  }

  // ── fetch classes ───────────────────────────────────────────────────────────
  FetchClassList(): void {
    this.classLists = [];
    this.divisionsList = [];
    this.studentsList = [];
    this.selectedClassID = '';
    this.selectedDivisionID = '';
    this.selectedAdmissionNo = '';

    this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', {
      SchoolID: this.selectedSchoolID,
      AcademicYear: this.selectedAcademicYearID,
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

  // ── fetch divisions ─────────────────────────────────────────────────────────
  FetchDivisionsList(): void {
    this.divisionsList = [];
    this.studentsList = [];
    this.selectedDivisionID = '';
    this.selectedAdmissionNo = '';

    this.apiurl.post<any>('Tbl_ClassDivision_CRUD_Operations', {
      SchoolID: this.selectedSchoolID,
      AcademicYear: this.selectedAcademicYearID,
      Class: this.selectedClassID,
      Flag: '3'
    }).subscribe(
      (response: any) => {
        if (response && Array.isArray(response.data)) {
          this.divisionsList = response.data.map((item: any) => ({
            ID: item.id,
            Name: item.name
          }));
        } else {
          this.divisionsList = [];
        }
      },
      () => { this.divisionsList = []; }
    );
  }

  // ── fetch students ──────────────────────────────────────────────────────────
  FetchStudentsList(): void {
    this.studentsList = [];
    this.selectedAdmissionNo = '';

    this.apiurl.post<any>('Tbl_StudentDetails_CRUD_Operations', {
      SchoolID: this.selectedSchoolID || this.currentSchoolId,
      AcademicYear: this.selectedAcademicYearID || '',
      Class: this.selectedClassID || '',
      Division: this.selectedDivisionID || '',
      Flag: '3'
    }).subscribe(
      (response: any) => {
        if (response && Array.isArray(response.data)) {
          this.studentsList = response.data.map((item: any) => ({
            ID: item.id,
            AdmissionNo: item.admissionNo,
            Name: `${item.admissionNo ?? ''} - ${item.firstName ?? ''} ${item.middleName ?? ''} ${item.lastName ?? ''}`.replace(/\s+/g, ' ').trim()
          }));
        } else {
          this.studentsList = [];
        }
      },
      () => { this.studentsList = []; }
    );
  }

  // ── cascade handlers ────────────────────────────────────────────────────────
  onSchoolChange(event: Event): void {
    const schoolId = (event.target as HTMLSelectElement).value;
    this.selectedSchoolID = schoolId === '0' ? '' : schoolId;
    this.ReportList = [];
    this.hasSearched = false;

    if (this.selectedSchoolID) {
      this.FetchAcademicYearsList(this.selectedSchoolID);
    } else {
      this.academicYearList = [];
      this.classLists = [];
      this.divisionsList = [];
      this.studentsList = [];
      this.selectedAcademicYearID = this.isAdmin ? '' : (sessionStorage.getItem('ActiveAcademicYearID') || '');
      this.selectedClassID = '';
      this.selectedDivisionID = '';
      this.selectedAdmissionNo = '';
    }
  }

  onAcademicYearChange(event: Event): void {
    const yearId = (event.target as HTMLSelectElement).value;
    this.selectedAcademicYearID = yearId === '0' ? '' : yearId;
    this.ReportList = [];
    this.hasSearched = false;

    if (this.selectedAcademicYearID) {
      this.FetchClassList();
    } else {
      this.classLists = [];
      this.divisionsList = [];
      this.studentsList = [];
      this.selectedClassID = '';
      this.selectedDivisionID = '';
      this.selectedAdmissionNo = '';
    }
  }

  onClassChange(event: Event): void {
    const classId = (event.target as HTMLSelectElement).value;
    this.selectedClassID = classId === '0' ? '' : classId;
    this.ReportList = [];
    this.hasSearched = false;

    if (this.selectedClassID) {
      this.FetchDivisionsList();
    } else {
      this.divisionsList = [];
      this.studentsList = [];
      this.selectedDivisionID = '';
      this.selectedAdmissionNo = '';
    }
  }

  onDivisionChange(event: Event): void {
    const divisionId = (event.target as HTMLSelectElement).value;
    this.selectedDivisionID = divisionId === '0' ? '' : divisionId;
    this.ReportList = [];
    this.hasSearched = false;

    if (this.selectedDivisionID) {
      this.FetchStudentsList();
    } else {
      this.studentsList = [];
      this.selectedAdmissionNo = '';
    }
  }

  onStudentChange(event: Event): void {
    const admissionNo = (event.target as HTMLSelectElement).value;
    this.selectedAdmissionNo = admissionNo === '0' ? '' : admissionNo;
    this.ReportList = [];
    this.hasSearched = false;
  }

  // ── generate report ─────────────────────────────────────────────────────────
  onGenerateReport(): void {
    this.currentPage = 1;
    this.pageCursors = [];
    this.FetchReport();
  }

  // ── fetch report data ───────────────────────────────────────────────────────
  FetchReport(extra: any = {}): void {
    const cursor = !extra.Offset && this.currentPage > 1
      ? this.pageCursors[this.currentPage - 2] || null
      : null;

    this.loader.show();

    this.FetchReportCount().subscribe({
      next: (countResp: any) => {
        this.ReportCount = countResp?.data?.[0]?.totalcount ?? 0;

        // Fix 1: use capital Offset to match DAL parameter name
        const payload: any = {
          Flag: '2',
          SchoolID: this.selectedSchoolID || (this.isAdmin ? null : this.currentSchoolId),
          AcademicYear: this.selectedAcademicYearID || null,
          ClassID: this.selectedClassID || null,
          DivisionID: this.selectedDivisionID || null,
          AdmissionNo: this.selectedAdmissionNo || null,
          Limit: this.pageSize,
          SortDirection: this.sortDirection,
          LastCreatedDate: cursor?.lastCreatedDate ?? null,
          LastID: cursor?.lastID ?? null,
          Offset: extra.Offset ?? null   // Fix 1: explicit capital Offset
        };

        this.apiurl.post<any>('Tbl_Sales_CRUD_Operations', payload).subscribe({
          next: (response: any) => {
            const data = response?.data || [];
            this.mapReport(response);
            this.hasSearched = true;

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
            this.ReportList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.ReportList = [];
        this.ReportCount = 0;
        this.loader.hide();
      }
    });
  }

  // ── fetch count ─────────────────────────────────────────────────────────────
  FetchReportCount() {
    return this.apiurl.post<any>('Tbl_Sales_CRUD_Operations', {
      Flag: '6',
      SchoolID: this.selectedSchoolID || (this.isAdmin ? null : this.currentSchoolId),
      AcademicYear: this.selectedAcademicYearID || null,
      ClassID: this.selectedClassID || null,
      DivisionID: this.selectedDivisionID || null,
      AdmissionNo: this.selectedAdmissionNo || null
    });
  }

  // ── map response ────────────────────────────────────────────────────────────
  mapReport(response: any): void {
    this.ReportList = (response.data || []).map((item: any) => ({
      id: String(item.id ?? item.ID ?? ''),
      schoolId: String(item.schoolID ?? ''),
      schoolName: String(item.schoolName ?? ''),
      academicYearId: String(item.academicYear ?? ''),
      academicYearName: String(item.academicYearName ?? ''),
      classId: String(item.classID ?? ''),
      className: String(item.className ?? ''),
      divisionId: String(item.divisionID ?? ''),
      divisionName: String(item.divisionName ?? ''),
      admissionNo: String(item.admissionNo ?? ''),
      studentName: String(item.studentName ?? ''),
      totalTaxAmount: Number(item.totalTaxAmount ?? 0),
      grandTotalAmount: Number(item.grandTotalAmount ?? 0),
      paymentMode: String(item.paymentMode ?? ''),
      saleDate: item.saleDate
        ? new Date(item.saleDate).toISOString().split('T')[0]
        : '',
      isActive: this.getBooleanValue(item.isActive ?? item.IsActive)
    }));
  }

  // ── clear filters ───────────────────────────────────────────────────────────
  onClearFilters(): void {
    this.selectedAcademicYearID = this.isAdmin ? '' : (sessionStorage.getItem('ActiveAcademicYearID') || '');
    this.selectedClassID = '';
    this.selectedDivisionID = '';
    this.selectedAdmissionNo = '';
    this.classLists = [];
    this.divisionsList = [];
    this.studentsList = [];
    this.ReportList = [];
    this.ReportCount = 0;
    this.hasSearched = false;
    this.currentPage = 1;
    this.pageCursors = [];

    if (this.isAdmin) {
      this.selectedSchoolID = '';
      this.academicYearList = [];
    } else {
      // non-admin: keep school, just reload academic years
      this.FetchAcademicYearsList(this.currentSchoolId);
    }
  }

  // ── export ──────────────────────────────────────────────────────────────────
  exportReport(type: 'pdf' | 'excel' | 'print'): void {
    const payload: any = {
      Flag: '2',
      SchoolID: this.selectedSchoolID || (this.isAdmin ? null : this.currentSchoolId),
      AcademicYear: this.selectedAcademicYearID || null,
      ClassID: this.selectedClassID || null,
      DivisionID: this.selectedDivisionID || null,
      AdmissionNo: this.selectedAdmissionNo || null
    };

    this.loader.show();
    const url = `${this.apiurl.api_url}/ExportSalesReport?type=${type}`;

    this.http.post(url, payload, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const fileNameBase = `SalesReport_${new Date().toISOString().replace(/[:.]/g, '')}`;

        if (type === 'pdf' || type === 'print') {
          const fileURL = URL.createObjectURL(blob);
          if (type === 'print') {
            const pw = window.open(fileURL);
            pw?.focus();
            pw?.print();
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

  // ── pagination ──────────────────────────────────────────────────────────────
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
      pageNumber === 1 ||
      pageNumber === total ||
      !this.pageCursors[pageNumber - 2];

    if (isBoundaryPage) {
      // Fix 2: capital Offset to match DAL
      this.FetchReport({ Offset: (pageNumber - 1) * this.pageSize });
    } else {
      this.FetchReport();
    }
  }

  totalPages(): number { return Math.ceil(this.ReportCount / this.pageSize); }

  getVisiblePageNumbers(): number[] {
    const totalPages = this.totalPages();
    const pages: number[] = [];
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, totalPages);
    if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  // ── helpers ─────────────────────────────────────────────────────────────────
  private getBooleanValue(val: any): boolean {
    return val === true || val === 1 || val === '1' || val === 'True' || val === 'active';
  }
}