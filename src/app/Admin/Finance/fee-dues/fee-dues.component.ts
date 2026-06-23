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
  classId?: string;
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
/**
 * Class Responsibility: Handles view logic and user interactions for FeeDuesComponent.
 */
export class FeeDuesComponent extends BasePermissionComponent {
  pageName = 'Fee Dues';
  hasSubmitted = false;

  // Session helpers for role checking
  public ss(key: string) {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
  }

  get currentRollID(): string { return (this.ss('RollID') || this.ss('rollID') || this.ss('menuRoleId') || this.ss('RoleID') || '').trim(); }

  // Role-based properties
  override get isAdmin(): boolean { return this.currentRollID === '1'; }

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

  /**
   * Lifecycle hook: Initializes component parameters and loads default page datasets.
   */
  ngOnInit(): void {
    this.checkViewPermission();
    if (this.isAdmin) {
      this.fetchSchools();
    } else {
      // For School Admin, auto-set school from session
      const schoolId = this.ss('SchoolID') || this.ss('schoolId') || '';
      if (schoolId) {
        this.selectedSchool = schoolId;
        this.fetchAcademicYears();
      }
    }
  }

  /**
   * Executes the operation: fetchSchools
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: fetchAcademicYears
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: fetchClasses
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: fetchDivisions
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: fetchFeeCategories
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: fetchFeeDues
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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
        let normalized = this.normalizeFeeDuesRows(Array.isArray(data) ? data : []);
        
        // Post-process: enrich class names with syllabus from selected class
        normalized = this.enrichClassNames(normalized);
        
        // Filter out rows with no fee category AND no pending amount (empty rows)
        normalized = normalized.filter(row => 
          (row.feeCategoryName && row.feeCategoryName !== '') || 
          (row.pendingAmount && row.pendingAmount > 0)
        );
        
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
            let normalized2 = this.normalizeFeeDuesRows(Array.isArray(data2) ? data2 : []);
            
            // Post-process: enrich class names with syllabus from selected class
            normalized2 = this.enrichClassNames(normalized2);
            
            // Filter out rows with no fee category AND no pending amount (empty rows)
            normalized2 = normalized2.filter(row => 
              (row.feeCategoryName && row.feeCategoryName !== '') || 
              (row.pendingAmount && row.pendingAmount > 0)
            );
            
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

  /**
   * Executes the operation: fetchFeeDuesViaStoredProc
   * Parameters: requestId: number, previousStatus?: any
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: normalizeFeeDuesRows
   * Parameters: items: any[]
   * Rationale: Standard operational controller for the active view.
   */
  private normalizeFeeDuesRows(items: any[]): FeeDuesRow[] {
    return items.map((item: any) => {
      const name =
        item.name ??
        item.studentName ??
        item.studentFullName ??
        item.student_full_name ??
        item.student_fullName;

      const admissionNo = item.admissionNo ?? item.admission_no ?? item.AdmissionNo;

      // Use basic className from API; enrichClassNames will add syllabus prefix later
      const className = item.className ?? item.class_name ?? item.syllabusClassName ?? item.ClassName ?? '';
      const classId = item.classId ?? item.ClassID ?? item.class_id ?? item.class ?? '';

      const divisionName =
        item.divisionName ?? item.classDivisionName ?? item.division ?? item.DivisionName ?? item.ClassDivisionName;

      const phone = item.phone ?? item.mobileNo ?? item.mobile ?? item.Phone;
      const gender = item.gender ?? item.Gender;
      const address = item.address ?? item.Address;
      const route = item.route ?? item.Route;
      const busNo = item.busNo ?? item.bus_no ?? item.BusNo;
      const stop = item.stop ?? item.Stop;
      const dueAmount =
        item.dueAmount ?? item.due_amount ?? item.balanceAmount ?? item.balance_amount ?? item.DueAmount ?? 
        item.totalDue ?? item.total_due ?? item.TotalDue ?? item.amountDue ?? item.amount_due ?? 0;
      const pendingAmount = item.pendingAmount ?? item.pending_amount ?? item.PendingAmount ?? 
        item.pending ?? item.Pending ?? item.balance ?? item.Balance ?? dueAmount ?? 0;
      const feeCategoryName = item.feeCategoryName ?? item.fee_category_name ?? item.FeeCategoryName ?? 
        item.feeCategory ?? item.FeeCategory ?? item.categoryName ?? item.category_name ?? 
        item.CategoryName ?? item.feeType ?? item.fee_type ?? '';
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
        classId: classId ? String(classId) : '',
        divisionName: divisionName ? String(divisionName) : '',
        feeCategoryName: feeCategoryName ? String(feeCategoryName) : '',
        pendingAmount:
          pendingAmount !== undefined && pendingAmount !== null && pendingAmount !== '' && !isNaN(Number(pendingAmount))
            ? Number(pendingAmount)
            : 0,
        schoolName: schoolName ? String(schoolName) : '',
        academicYearName: academicYearName ? String(academicYearName) : '',
        phone: phone ? String(phone) : '',
        gender: gender ? String(gender) : '',
        address: address ? String(address) : '',
        route: route ? String(route) : '',
        busNo: busNo ? String(busNo) : '',
        stop: stop ? String(stop) : '',
        dueAmount: dueAmount !== undefined && dueAmount !== null && dueAmount !== '' && !isNaN(Number(dueAmount))
            ? Number(dueAmount)
            : 0,
        raw: item,
      };
    });
  }

  /**
   * Handles form submission: Validates input fields and transmits data payloads.
   */
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

  /**
   * Executes the operation: onAcademicYearChange
   * Parameters: value: string
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: onClassChange
   * Parameters: value: string
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: onDivisionChange
   * Parameters: value: string
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: onStudentChange
   * Parameters: value: string
   * Rationale: Standard operational controller for the active view.
   */
  onStudentChange(value: string): void {
    this.selectedStudent = value;
    this.hasSubmitted = false;
    this.studentError = false;
  }

  /**
   * Executes the operation: onFeeCategoryChange
   * Parameters: value: string
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: sortBy
   * Parameters: column: keyof FeeDuesRow
   * Rationale: Standard operational controller for the active view.
   */
  sortBy(column: keyof FeeDuesRow): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySearchAndSort();
  }

  /**
   * Executes the operation: applySearchAndSort
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Post-process rows to enrich className with syllabus prefix from classList.
   * When a specific class is selected, all rows should show the full class name
   * including syllabus (e.g., "CBSE - 1st" instead of just "1st").
   */
  private enrichClassNames(rows: FeeDuesRow[]): FeeDuesRow[] {
    if (this.classList.length === 0) {
      return rows;
    }

    return rows.map(row => {
      const currentClassName = row.className ?? '';
      const currentClassId = row.classId ?? '';

      // Skip if className already includes syllabus (has " - ")
      if (currentClassName.includes(' - ')) {
        return row;
      }

      let fullClassName: string | undefined;

      // Case 1: If a specific class is selected, use its full name for all rows
      if (this.selectedClass) {
        const selectedClassObj = this.classList.find(c => c.id === this.selectedClass);
        if (selectedClassObj) {
          fullClassName = selectedClassObj.name;
        }
      } else {
        // Case 2: No specific class selected - look up each row individually

        // 2a: Try matching by classId from the API response
        if (currentClassId) {
          const matchById = this.classList.find(c => c.id === currentClassId);
          if (matchById) {
            fullClassName = matchById.name;
          }
        }

        // 2b: Try matching by className (extract plain name from "CBSE - 1st" format)
        if (!fullClassName && currentClassName) {
          const matchByName = this.classList.find(c => {
            // The classList name format is "CBSE - 1st", extract "1st" part
            const plainName = c.name.split(' - ').pop() ?? c.name;
            return plainName === currentClassName || plainName.toLowerCase() === currentClassName.toLowerCase();
          });
          if (matchByName) {
            fullClassName = matchByName.name;
          }
        }

        // 2c: Try getting syllabus from raw data and build the full name
        if (!fullClassName) {
          const raw = (row as any)['raw'] ?? {};
          const syllabus = raw.syllabus ?? raw.Syllabus ?? raw.syllabusName ?? raw.syllabus_name ?? '';
          if (syllabus && currentClassName) {
            fullClassName = `${syllabus} - ${currentClassName}`;
          }
        }
      }

      // Apply the full class name if found
      if (fullClassName) {
        // For case 1 (specific class selected), only apply if the row's class matches
        if (this.selectedClass) {
          const plainClassName = fullClassName.split(' - ')[1] ?? fullClassName;
          if (currentClassName === plainClassName || currentClassName.toLowerCase() === plainClassName.toLowerCase()) {
            return { ...row, className: fullClassName };
          }
        } else {
          return { ...row, className: fullClassName };
        }
      }

      return row;
    });
  }

  /**
   * Executes the operation: getSelectedFeeCategoryName
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private getSelectedFeeCategoryName(): string {
    if (!this.selectedFeeCategory) {
      return '';
    }
    const selected = this.feeCategoryList.find((x) => x.id === this.selectedFeeCategory);
    return selected?.name ?? '';
  }

  /**
   * Executes the operation: applySelectedFeeCategoryFilter
   * Parameters: rows: FeeDuesRow[]
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: fetchStudents
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: totalPages
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredData.length / this.pageSize) || 1);
  }

  /**
   * Executes the operation: changePage
   * Parameters: page: number
   * Rationale: Standard operational controller for the active view.
   */
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

