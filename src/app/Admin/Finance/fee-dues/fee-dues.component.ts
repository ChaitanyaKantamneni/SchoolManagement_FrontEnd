import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { LoaderService } from '../../../Services/loader.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';

interface FeeDuesRow {
  id?: number | string;
  feeCategoryId?: string;
  studentName?: string;
  name?: string;
  admissionNo?: string;
  className?: string;
  divisionName?: string;
  feeCategoryName?: string;
  pendingAmount?: number;
  schoolName?: string;
  academicYearName?: string;
  divisionId?: string | number;
  phone?: string;
  gender?: string;
  address?: string;
  route?: string;
  busNo?: string;
  stop?: string;
  dueAmount?: number;
  [key: string]: any;
}

interface SimpleOption {
  id: string;
  name: string;
}

interface TableColumn {
  key: keyof FeeDuesRow;
  label: string;
}

@Component({
  selector: 'app-fee-dues',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, FormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './fee-dues.component.html',
  styleUrl: './fee-dues.component.css',
})
export class FeeDuesComponent extends BasePermissionComponent {
  pageName = 'Fee Dues';
  hasSubmitted = false;

  // Filter state
  schoolList: SimpleOption[] = [];
  academicYearList: SimpleOption[] = [];
  classList: SimpleOption[] = [];
  divisionList: SimpleOption[] = [];
  studentList: SimpleOption[] = [];
  feeCategoryList: SimpleOption[] = [];

  selectedSchool: string = '';
  selectedAcademicYear: string = '';
  selectedClass: string = '';
  selectedDivision: string = '';
  selectedStudent: string = '';
  selectedFeeCategory: string = '';

  mastersLoadError: string = '';
  feeDuesLoadError: string = '';

  // Some deployments use legacy stored-proc endpoints for fee dues.
  // Keep disabled by default to avoid triggering backend 500s when not implemented.
  private readonly enableLegacyFeeDuesEndpoint = false;

  // Table and UI state
  loading = false;
  tableData: FeeDuesRow[] = [];
  filteredData: FeeDuesRow[] = [];
  private feeDuesRequestSeq = 0;

  // Table controls
  searchQuery = '';
  sortColumn: keyof FeeDuesRow | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Simple required-field validation flags
  schoolError = false;
  academicYearError = false;
  classError = false;
  divisionError = false;
  studentError = false;
  feeCategoryError = false;

  readonly scenario1Columns: TableColumn[] = [
    { key: 'className', label: 'Class Name' },
    { key: 'feeCategoryName', label: 'Fee Category Name' },
    { key: 'pendingAmount', label: 'Pending Amount' },
    { key: 'schoolName', label: 'School Name' },
    { key: 'academicYearName', label: 'Academic Year Name' },
  ];

  readonly scenario2Columns: TableColumn[] = [
    { key: 'className', label: 'Class Name' },
    { key: 'divisionName', label: 'Division Name' },
    { key: 'feeCategoryName', label: 'Fee Category Name' },
    { key: 'pendingAmount', label: 'Pending Amount' },
    { key: 'schoolName', label: 'School Name' },
    { key: 'academicYearName', label: 'Academic Year Name' },
  ];

  readonly scenario3Columns: TableColumn[] = [
    { key: 'admissionNo', label: 'Admission Number' },
    { key: 'studentName', label: 'Student Name' },
    { key: 'feeCategoryName', label: 'Fee Category Name' },
    { key: 'pendingAmount', label: 'Pending Amount' },
    { key: 'schoolName', label: 'School Name' },
    { key: 'academicYearName', label: 'Academic Year Name' },
  ];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  visiblePageCount = 6;

  get totalCount(): number {
    return this.filteredData.length;
  }

  constructor(
    router: Router,
    menuService: MenuServiceService,
    private api: ApiServiceService,
    public loader: LoaderService,
  ) {
    super(menuService, router);
  }

  ngOnInit(): void {
    this.checkViewPermission();
    this.fetchSchools();
  }

  private fetchSchools(): void {
    this.mastersLoadError = '';
    this.loader.show();
    this.api.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response ?? [];
        const arr = Array.isArray(data) ? data : [];
        this.schoolList = arr
          .map((item: any) => ({ id: String(item.id ?? ''), name: String(item.name ?? '') }))
          .filter((x) => x.id && x.name);
        this.loader.hide();
      },
      error: (err: any) => {
        this.schoolList = [];
        this.mastersLoadError = '';
        console.error('Fee Dues: failed to load schools', err);
        this.loader.hide();
      },
    });
  }

  private fetchAcademicYears(): void {
    if (!this.selectedSchool) {
      this.academicYearList = [];
      return;
    }

    this.mastersLoadError = '';
    this.loader.show();
    this.api
      .post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: this.selectedSchool, Flag: '2' })
      .subscribe({
        next: (response: any) => {
          const data = response?.data ?? response ?? [];
          const arr = Array.isArray(data) ? data : [];
          this.academicYearList = arr
            .map((item: any) => ({ id: String(item.id ?? ''), name: String(item.name ?? '') }))
            .filter((x) => x.id && x.name);
          this.loader.hide();
        },
        error: (err: any) => {
          this.academicYearList = [];
          this.mastersLoadError = '';
          console.error('Fee Dues: failed to load academic years', err);
          this.loader.hide();
        },
      });
  }

  private fetchClasses(): void {
    if (!this.selectedSchool) {
      this.classList = [];
      return;
    }

    this.mastersLoadError = '';
    this.loader.show();

    const payload: any = {
      Flag: '9',
      SchoolID: this.selectedSchool,
      AcademicYear: this.selectedAcademicYear || '',
    };

    this.api.post<any>('Tbl_ClassDivision_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response ?? [];
        const arr = Array.isArray(data) ? data : [];
        this.classList = arr
          .map((item: any) => ({
            id: String(item.sNo ?? item.id ?? ''),
            name: String(item.syllabusClassName ?? item.name ?? ''),
          }))
          .filter((x) => x.id && x.name);
        this.loader.hide();
      },
      error: () => {
        // Fallback for deployments where Flag 9 is not available.
        const fallbackPayload: any = {
      Flag: '3',
      SchoolID: this.selectedSchool,
      AcademicYear: this.selectedAcademicYear || '',
    };

        this.api.post<any>('Tbl_Class_CRUD_Operations', fallbackPayload).subscribe({
          next: (fallbackResponse: any) => {
            const fallbackData = fallbackResponse?.data ?? fallbackResponse ?? [];
            const fallbackArr = Array.isArray(fallbackData) ? fallbackData : [];
            this.classList = fallbackArr
              .map((item: any) => ({ id: String(item.id ?? ''), name: String(item.name ?? '') }))
              .filter((x) => x.id && x.name);
            this.loader.hide();
          },
          error: (fallbackErr: any) => {
            this.classList = [];
            this.mastersLoadError = '';
            console.error('Fee Dues: failed to load classes', fallbackErr);
            this.loader.hide();
          },
        });
      },
    });
  }

  private fetchDivisions(): void {
    if (!this.selectedClass) {
      this.divisionList = [];
      return;
    }

    this.mastersLoadError = '';
    this.loader.show();
    const payload: any = {
      SchoolID: this.selectedSchool,
      AcademicYear: this.selectedAcademicYear,
      Class: this.selectedClass,
      Flag: '3',
    };
    this.api.post<any>('Tbl_ClassDivision_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response ?? [];
        const arr = Array.isArray(data) ? data : [];
        this.divisionList = arr
          .map((item: any) => ({ id: String(item.id ?? ''), name: String(item.name ?? '') }))
          .filter((x) => x.id && x.name);
        this.loader.hide();
      },
      error: (err: any) => {
        this.divisionList = [];
        this.mastersLoadError = '';
        console.error('Fee Dues: failed to load divisions', err);
        this.loader.hide();
      },
    });
  }

  private fetchFeeCategories(): void {
    if (!this.selectedSchool || !this.selectedAcademicYear) {
      this.feeCategoryList = [];
      return;
    }

    this.mastersLoadError = '';
    this.loader.show();
    const payload: any = {
      SchoolID: this.selectedSchool,
      AcademicYear: this.selectedAcademicYear,
      Flag: '3',
    };
    this.api.post<any>('Tbl_FeeCategory_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response ?? [];
        const arr = Array.isArray(data) ? data : [];
        this.feeCategoryList = arr
          .map((item: any) => ({ id: String(item.id ?? ''), name: String(item.feeCategoryName ?? item.name ?? '') }))
          .filter((x) => x.id && x.name);
        if (this.selectedFeeCategory && !this.feeCategoryList.some((x) => x.id === this.selectedFeeCategory)) {
          this.selectedFeeCategory = '';
        }
        this.loader.hide();
      },
      error: (err: any) => {
        this.feeCategoryList = [];
        this.mastersLoadError = '';
        console.error('Fee Dues: failed to load fee categories', err);
        this.loader.hide();
      },
    });
  }

  private fetchFeeDues(): void {
    this.feeDuesLoadError = '';
    const requestId = ++this.feeDuesRequestSeq;
    const selectedFeeCategoryName = this.getSelectedFeeCategoryName();

    // Clear old rows immediately to avoid stale values while loading.
    this.tableData = [];
    this.filteredData = [];

    const payload: any = {
      SchoolID: this.selectedSchool || '',
      AcademicYear: this.selectedAcademicYear || '',
      Class: this.selectedClass || '',
      Division: this.selectedDivision || '',
      Student: this.selectedStudent || '',
      FeeCategory: this.selectedFeeCategory || '',
      FeeCategoryID: this.selectedFeeCategory || '',
      FeeCategoryName: selectedFeeCategoryName,
      fee_category_id: this.selectedFeeCategory || '',
      Flag: '7',
    };

    this.loading = true;
    this.loader.show();

    this.api.post<any>('Tbl_FeeCollection_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        if (requestId !== this.feeDuesRequestSeq) {
          return;
        }
        const data = response?.data ?? response ?? [];
        const normalized = this.normalizeFeeDuesRows(Array.isArray(data) ? data : []);
        this.tableData = this.applySelectedFeeCategoryFilter(normalized);
        this.applySearchAndSort();
        this.loading = false;
        this.loader.hide();
      },
      error: (err: any) => {
        // Fallback 1: some backends expose this as GET with query params
        const params: any = {
          SchoolID: this.selectedSchool || '',
          AcademicYear: this.selectedAcademicYear || '',
          Class: this.selectedClass || '',
          Division: this.selectedDivision || '',
          Student: this.selectedStudent || '',
          FeeCategory: this.selectedFeeCategory || '',
          FeeCategoryID: this.selectedFeeCategory || '',
          FeeCategoryName: selectedFeeCategoryName,
          fee_category_id: this.selectedFeeCategory || '',
          Flag: '7',
        };

        this.api.get<any>('Tbl_FeeCollection_CRUD_Operations', params).subscribe({
          next: (response2: any) => {
            if (requestId !== this.feeDuesRequestSeq) {
              return;
            }
            const data2 = response2?.data ?? response2 ?? [];
            const normalized2 = this.normalizeFeeDuesRows(Array.isArray(data2) ? data2 : []);
            this.tableData = this.applySelectedFeeCategoryFilter(normalized2);
            this.applySearchAndSort();
            this.loading = false;
            this.loader.hide();
          },
          error: (err2: any) => {
            if (requestId !== this.feeDuesRequestSeq) {
              return;
            }
            if (this.enableLegacyFeeDuesEndpoint) {
              // Fallback 2: legacy stored-procedure endpoints (Tbl_*)
              this.fetchFeeDuesViaStoredProc(requestId, err2?.status ?? err?.status);
              return;
            }

            this.tableData = [];
            this.filteredData = [];
            this.feeDuesLoadError = '';
            console.error('Fee Dues: failed to load fee dues', err2 ?? err);
            this.loading = false;
            this.loader.hide();
          },
        });
      },
    });
  }

  private fetchFeeDuesViaStoredProc(requestId: number, previousStatus?: any): void {
    const selectedFeeCategoryName = this.getSelectedFeeCategoryName();
    const payload: any = {
      SchoolID: this.selectedSchool || '',
      AcademicYear: this.selectedAcademicYear || '',
      Class: this.selectedClass || '',
      Division: this.selectedDivision || '',
      Student: this.selectedStudent || '',
      FeeCategory: this.selectedFeeCategory || '',
      FeeCategoryID: this.selectedFeeCategory || '',
      FeeCategoryName: selectedFeeCategoryName,
      fee_category_id: this.selectedFeeCategory || '',
      Flag: '7',
    };

    this.api.post<any>('Tbl_FeeCollection_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        if (requestId !== this.feeDuesRequestSeq) {
          return;
        }
        const data = response?.data ?? response ?? [];
        const normalized = this.normalizeFeeDuesRows(Array.isArray(data) ? data : []);
        this.tableData = this.applySelectedFeeCategoryFilter(normalized);
        this.applySearchAndSort();
        this.loading = false;
        this.loader.hide();
      },
      error: (err: any) => {
        if (requestId !== this.feeDuesRequestSeq) {
          return;
        }
        this.tableData = [];
        this.filteredData = [];
        this.feeDuesLoadError = '';
        console.error('Fee Dues: failed to load fee dues (fallback)', err, previousStatus);
        this.loading = false;
        this.loader.hide();
      },      
    });
  }

  private normalizeFeeDuesRows(items: any[]): FeeDuesRow[] {
    return items.map((item: any) => {
      const name =
        item.name ??
        item.studentName ??
        item.studentFullName ??
        item.student_full_name ??
        item.student_fullName;

      const admissionNo = item.admissionNo ?? item.admission_no ?? item.AdmissionNo;

      const className = item.className ?? item.class_name ?? item.syllabusClassName ?? item.ClassName;

      const divisionName =
        item.divisionName ?? item.classDivisionName ?? item.division ?? item.DivisionName ?? item.ClassDivisionName;

      const phone = item.phone ?? item.mobileNo ?? item.mobile ?? item.Phone;
      const gender = item.gender ?? item.Gender;
      const address = item.address ?? item.Address;
      const route = item.route ?? item.Route;
      const busNo = item.busNo ?? item.bus_no ?? item.BusNo;
      const stop = item.stop ?? item.Stop;
      const dueAmount =
        item.dueAmount ?? item.due_amount ?? item.balanceAmount ?? item.balance_amount ?? item.DueAmount;
      const pendingAmount = item.pendingAmount ?? item.pending_amount ?? dueAmount;
      const feeCategoryName = item.feeCategoryName ?? item.fee_category_name ?? item.FeeCategoryName;
      const feeCategoryId = item.feeCategory ?? item.feeCategoryID ?? item.fee_category_id ?? item.FeeCategoryID;
      const schoolName = item.schoolName ?? item.school_name ?? item.SchoolName;
      const academicYearName = item.academicYearName ?? item.academic_year_name ?? item.AcademicYearName;

      return {
        id: item.id ?? item.ID,
        feeCategoryId: feeCategoryId !== undefined && feeCategoryId !== null ? String(feeCategoryId) : '',
        studentName: name ? String(name) : '',
        name: name ? String(name) : '',
        admissionNo: admissionNo ? String(admissionNo) : '',
        className: className ? String(className) : '',
        divisionName: divisionName ? String(divisionName) : '',
        feeCategoryName: feeCategoryName ? String(feeCategoryName) : '',
        pendingAmount:
          pendingAmount !== undefined && pendingAmount !== null && pendingAmount !== ''
            ? Number(pendingAmount)
            : undefined,
        schoolName: schoolName ? String(schoolName) : '',
        academicYearName: academicYearName ? String(academicYearName) : '',
        phone: phone ? String(phone) : '',
        gender: gender ? String(gender) : '',
        address: address ? String(address) : '',
        route: route ? String(route) : '',
        busNo: busNo ? String(busNo) : '',
        stop: stop ? String(stop) : '',
        dueAmount: dueAmount !== undefined && dueAmount !== null && dueAmount !== '' ? Number(dueAmount) : undefined,
        raw: item,
      };
    });
  }

  onSubmit(): void {
    // reset previous errors
    this.schoolError = !this.selectedSchool;
    this.academicYearError = !this.selectedAcademicYear;
    this.classError = false;
    this.divisionError = false;
    this.studentError = false;
    this.feeCategoryError = false;

    if (
      this.schoolError ||
      this.academicYearError ||
      this.classError ||
      this.divisionError ||
      this.studentError ||
      this.feeCategoryError
    ) {
      this.hasSubmitted = false;
      return;
    }

    this.hasSubmitted = true;
    this.currentPage = 1;
    this.fetchFeeDues();
  }



  // Dependency handlers
  onSchoolChange(value: string): void {
    this.selectedSchool = value;
    this.hasSubmitted = false;
    this.schoolError = false;
    this.selectedAcademicYear = '';
    this.selectedClass = '';
    this.selectedDivision = '';
    this.selectedStudent = '';
    this.selectedFeeCategory = '';
    this.academicYearList = [];
    this.classList = [];
    this.divisionList = [];
    this.studentList = [];
    this.feeCategoryList = [];

    if (this.selectedSchool) {
      this.fetchAcademicYears();
    }
  }

  onAcademicYearChange(value: string): void {
    this.selectedAcademicYear = value;
    this.hasSubmitted = false;
    this.academicYearError = false;
    this.selectedClass = '';
    this.selectedDivision = '';
    this.selectedStudent = '';
    this.selectedFeeCategory = '';
    this.classList = [];
    this.divisionList = [];
    this.studentList = [];
    this.feeCategoryList = [];

    if (this.selectedSchool && this.selectedAcademicYear) {
      this.fetchClasses();
      this.fetchFeeCategories();
    }
  }

  onClassChange(value: string): void {
    this.selectedClass = value;
    this.hasSubmitted = false;
    this.classError = false;
    this.selectedDivision = '';
    this.selectedStudent = '';
    this.divisionList = [];
    this.studentList = [];

    if (this.selectedClass) {
      this.fetchDivisions();
    }
  }

  onDivisionChange(value: string): void {
    this.selectedDivision = value;
    this.hasSubmitted = false;
    this.divisionError = false;
    this.selectedStudent = '';
    this.studentList = [];

    if (this.selectedDivision) {
      this.fetchStudents();
    }
  }

  onStudentChange(value: string): void {
    this.selectedStudent = value;
    this.hasSubmitted = false;
    this.studentError = false;
  }

  onFeeCategoryChange(value: string): void {
    this.selectedFeeCategory = value;
    this.hasSubmitted = false;
    this.feeCategoryError = false;
  }

  // Search, sort, pagination helpers
  onSearchChange(): void {
    this.currentPage = 1;
    this.applySearchAndSort();
  }

  sortBy(column: keyof FeeDuesRow): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySearchAndSort();
  }

  private applySearchAndSort(): void {
    const query = this.searchQuery.trim().toLowerCase();

    let data = [...this.tableData];

    if (query) {
      data = data.filter((row) => {
        const valuesToCheck = [
          row.name,
          row.admissionNo,
          row.className,
          row.divisionName,
          row.studentName,
          row.feeCategoryName,
          row.schoolName,
          row.academicYearName,
          row.phone,
          row.gender,
          row.address,
          row.route,
          row.busNo,
          row.stop,
        ];
        return valuesToCheck.some((val) => (val ?? '').toString().toLowerCase().includes(query));
      });
    }

    if (this.sortColumn) {
      const column = this.sortColumn;
      const direction = this.sortDirection === 'asc' ? 1 : -1;
      data.sort((a, b) => {
        const av = (a[column] ?? '').toString().toLowerCase();
        const bv = (b[column] ?? '').toString().toLowerCase();
        if (av < bv) return -1 * direction;
        if (av > bv) return 1 * direction;
        return 0;
      });
    }

    this.filteredData = data;
  }

  private getSelectedFeeCategoryName(): string {
    if (!this.selectedFeeCategory) {
      return '';
    }
    const selected = this.feeCategoryList.find((x) => x.id === this.selectedFeeCategory);
    return selected?.name ?? '';
  }

  private applySelectedFeeCategoryFilter(rows: FeeDuesRow[]): FeeDuesRow[] {
    if (!this.selectedFeeCategory) {
      return rows;
    }

    const selectedId = this.selectedFeeCategory.trim().toLowerCase();
    const selectedName = this.getSelectedFeeCategoryName().trim().toLowerCase();

    return rows.filter((row) => {
      const rowId = (row.feeCategoryId ?? '').toString().trim().toLowerCase();
      const rowName = (row.feeCategoryName ?? '').toString().trim().toLowerCase();

      if (selectedId && rowId && rowId === selectedId) {
        return true;
      }
      if (selectedName && rowName) {
        return rowName === selectedName;
      }
      return false;
    });
  }

  get displayedColumns(): TableColumn[] {
    if (this.selectedClass && this.selectedDivision) {
      return this.scenario3Columns;
    }
    if (this.selectedClass) {
      return this.scenario2Columns;
    }
    return this.scenario1Columns;
  }

  getColumnValue(row: FeeDuesRow, key: keyof FeeDuesRow): string | number {
    const val = row[key];
    if (val === undefined || val === null || val === '') {
      return '-';
    }
    return val as string | number;
  }

  private fetchStudents(): void {
    if (!this.selectedSchool || !this.selectedAcademicYear || !this.selectedClass || !this.selectedDivision) {
      this.studentList = [];
      return;
    }

    this.mastersLoadError = '';
    this.loader.show();

    const payload: any = {
      SchoolID: this.selectedSchool,
      AcademicYear: this.selectedAcademicYear,
      Class: this.selectedClass,
      Division: this.selectedDivision,
      Flag: '3',
    };

    this.api.post<any>('Tbl_StudentDetails_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response ?? [];
        const arr = Array.isArray(data) ? data : [];
        this.studentList = arr
          .map((item: any) => {
            const admissionNo = String(item.admissionNo ?? item.AdmissionNo ?? '').trim();
            const fullName = `${item.firstName ?? ''} ${item.middleName ?? ''} ${item.lastName ?? ''}`
              .replace(/\s+/g, ' ')
              .trim();
            return {
              id: admissionNo,
              name: `${admissionNo} - ${fullName}`.trim(),
            };
          })
          .filter((x) => x.id);
        this.loader.hide();
      },
      error: (err: any) => {
        this.studentList = [];
        this.mastersLoadError = '';
        console.error('Fee Dues: failed to load students', err);
        this.loader.hide();
      },
    });
  }

  get pagedData(): FeeDuesRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredData.slice(start, start + this.pageSize);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredData.length / this.pageSize) || 1);
  }

  changePage(page: number): void {
    const total = this.totalPages();
    if (page < 1 || page > total) {
      return;
    }
    this.currentPage = page;
  }

  get pages(): number[] {
    const total = this.totalPages();
    const pages: number[] = [];
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
    return pages;
  }

  get visiblePages(): number[] {
    const total = this.totalPages();
    const pages: number[] = [];
    const half = Math.floor(this.visiblePageCount / 2);
    let start = Math.max(this.currentPage - half, 1);
    let end = Math.min(start + this.visiblePageCount - 1, total);
    if (end - start < this.visiblePageCount - 1) {
      start = Math.max(end - this.visiblePageCount + 1, 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  get showingFrom(): number {
    if (!this.filteredData.length) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get showingTo(): number {
    if (!this.filteredData.length) return 0;
    return Math.min(this.currentPage * this.pageSize, this.filteredData.length);
  }

  // (Removed) multiselect + export helpers

}

