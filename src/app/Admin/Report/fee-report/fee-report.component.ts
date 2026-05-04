import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { NgxEchartsModule } from 'ngx-echarts';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { LoaderService } from '../../../Services/loader.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';

interface SimpleOption {
  id: string;
  name: string;
}

interface TableColumn<T> {
  key: keyof T;
  label: string;
  type?: 'text' | 'amount' | 'number' | 'percent';
}

interface FeeCollectionRow {
  id?: number | string;
  receiptNo?: string;
  admissionNo?: string;
  studentId?: string;
  studentName?: string;
  amountPaid?: number;
  paymentDate?: string;
  paymentDateRaw?: string;
  paymentMode?: string;
  paymentModeRaw?: string;
  classId?: string;
  className?: string;
  divisionId?: string;
  divisionName?: string;
  feeCategoryId?: string;
  feeCategoryName?: string;
  schoolId?: string;
  schoolName?: string;
  academicYearId?: string;
  academicYearName?: string;
  raw?: any;
}

interface FeeDuesRow {
  id?: number | string;
  admissionNo?: string;
  studentId?: string;
  studentName?: string;
  classId?: string;
  className?: string;
  divisionId?: string;
  divisionName?: string;
  feeCategoryId?: string;
  feeCategoryName?: string;
  pendingAmount?: number;
  dueAmount?: number;
  schoolId?: string;
  schoolName?: string;
  academicYearId?: string;
  academicYearName?: string;
  phone?: string;
  gender?: string;
  address?: string;
  route?: string;
  busNo?: string;
  stop?: string;
  raw?: any;
}

interface KpiCard {
  title: string;
  value: string;
  meta: string;
  icon: string;
  accent: 'green' | 'red' | 'blue' | 'slate';
  trendDirection: 'up' | 'down' | 'flat';
  trendText: string;
}

interface SummaryRow {
  id: string;
  name: string;
  className?: string;
  collectedAmount: number;
  dueAmount: number;
  netBalance: number;
  totalAmount: number;
  students: number;
  transactions: number;
  collectionEfficiency: number;
}


interface TrendPoint {
  key: string;
  label: string;
  sortValue: number;
  collectionAmount: number;
  dueAmount: number;
  transactionCount: number;
  studentCount: number;
}

interface TrendMeta {
  direction: 'up' | 'down' | 'flat';
  text: string;
}

@Component({
  selector: 'app-fee-report',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, FormsModule, MatIconModule, DashboardTopNavComponent, NgxEchartsModule],
  templateUrl: './fee-report.component.html',
  styleUrl: './fee-report.component.css',
})
export class FeeReportComponent extends BasePermissionComponent {
  pageName = 'Fee Reports';
  hasSubmitted = false;

  schoolList: SimpleOption[] = [];
  academicYearList: SimpleOption[] = [];
  classList: SimpleOption[] = [];
  divisionList: SimpleOption[] = [];
  studentList: SimpleOption[] = [];
  feeCategoryList: SimpleOption[] = [];

  selectedSchool = '';
  selectedAcademicYear = '';
  selectedClass = '';
  selectedDivision = '';
  selectedStudent = '';
  selectedFeeCategory = '';

  mastersLoadError = '';
  feeCollectionLoadError = '';
  feeDuesLoadError = '';
  loading = false;

  searchQuery = '';

  feeCollectionData: FeeCollectionRow[] = [];
  filteredFeeCollectionData: FeeCollectionRow[] = [];
  feeDuesData: FeeDuesRow[] = [];
  filteredFeeDuesData: FeeDuesRow[] = [];

  collectionSortColumn: keyof FeeCollectionRow | '' = '';
  collectionSortDirection: 'asc' | 'desc' = 'asc';
  duesSortColumn: keyof FeeDuesRow | '' = '';
  duesSortDirection: 'asc' | 'desc' = 'asc';

  schoolError = false;
  academicYearError = false;
  classError = false;
  divisionError = false;
  studentError = false;
  feeCategoryError = false;

  currentCollectionPage = 1;
  currentDuesPage = 1;
  pageSize = 10;
  visiblePageCount = 5;

  executiveKpis: KpiCard[] = [];
  trendSeries: TrendPoint[] = [];

  feeCategorySummaryData: SummaryRow[] = [];
  classSummaryData: SummaryRow[] = [];
  divisionSummaryData: SummaryRow[] = [];
  divisionPerformanceData: SummaryRow[] = [];
  displayFeeCategorySummaryData: SummaryRow[] = [];
  displayClassSummaryData: SummaryRow[] = [];
  displayDivisionSummaryData: SummaryRow[] = [];

  feeCategorySummarySortColumn: keyof SummaryRow = 'totalAmount';
  feeCategorySummarySortDirection: 'asc' | 'desc' = 'desc';
  classSummarySortColumn: keyof SummaryRow = 'totalAmount';
  classSummarySortDirection: 'asc' | 'desc' = 'desc';
  divisionSummarySortColumn: keyof SummaryRow = 'totalAmount';
  divisionSummarySortDirection: 'asc' | 'desc' = 'desc';

  activeClassDrillId = '';
  activeClassDrillName = '';

  totalCollectionAmount = 0;
  totalDueAmount = 0;
  netBalanceAmount = 0;
  totalStudentsCount = 0;
  totalTransactionsCount = 0;
  collectionEfficiencyPercent = 0;

  collectionVsDueChartOptions: any = null;
  feeCategoryDistributionChartOptions: any = null;
  classWisePerformanceChartOptions: any = null;
  divisionWisePerformanceChartOptions: any = null;
  monthlyCollectionTrendChartOptions: any = null;
  collectionVsDueAreaChartOptions: any = null;

  private requestSeq = 0;

  readonly feeCollectionColumns: TableColumn<FeeCollectionRow>[] = [
    { key: 'receiptNo', label: 'Receipt No' },
    { key: 'studentName', label: 'Student Name' },
    { key: 'admissionNo', label: 'Admission No' },
    { key: 'className', label: 'Class' },
    { key: 'divisionName', label: 'Division' },
    { key: 'amountPaid', label: 'Fee Amount', type: 'amount' },
    { key: 'paymentDate', label: 'Payment Date' },
    { key: 'feeCategoryName', label: 'Fee Category' },
    { key: 'paymentMode', label: 'Payment Mode' },
    { key: 'schoolName', label: 'School' },
    { key: 'academicYearName', label: 'Academic Year' },
  ];

  readonly feeDuesColumns: TableColumn<FeeDuesRow>[] = [
    { key: 'admissionNo', label: 'Admission No' },
    { key: 'studentName', label: 'Student Name' },
    { key: 'className', label: 'Class' },
    { key: 'divisionName', label: 'Division' },
    { key: 'feeCategoryName', label: 'Fee Category' },
    { key: 'pendingAmount', label: 'Pending Amount', type: 'amount' },
    { key: 'schoolName', label: 'School' },
    { key: 'academicYearName', label: 'Academic Year' },
  ];

  readonly feeCategorySummaryColumns: TableColumn<SummaryRow>[] = [
    { key: 'name', label: 'Fee Category' },
    { key: 'students', label: 'Students', type: 'number' },
    { key: 'transactions', label: 'Transactions', type: 'number' },
    { key: 'collectedAmount', label: 'Collected', type: 'amount' },
    { key: 'dueAmount', label: 'Due', type: 'amount' },
    { key: 'netBalance', label: 'Net', type: 'amount' },
    { key: 'collectionEfficiency', label: 'Efficiency', type: 'percent' },
  ];

  readonly classSummaryColumns: TableColumn<SummaryRow>[] = [
    { key: 'name', label: 'Class' },
    { key: 'students', label: 'Students', type: 'number' },
    { key: 'transactions', label: 'Transactions', type: 'number' },
    { key: 'collectedAmount', label: 'Collected', type: 'amount' },
    { key: 'dueAmount', label: 'Due', type: 'amount' },
    { key: 'netBalance', label: 'Net', type: 'amount' },
    { key: 'collectionEfficiency', label: 'Efficiency', type: 'percent' },
  ];

  readonly divisionSummaryColumns: TableColumn<SummaryRow>[] = [
    { key: 'name', label: 'Division' },
    { key: 'className', label: 'Class' },
    { key: 'students', label: 'Students', type: 'number' },
    { key: 'collectedAmount', label: 'Collected', type: 'amount' },
    { key: 'dueAmount', label: 'Due', type: 'amount' },
    { key: 'netBalance', label: 'Net', type: 'amount' },
    { key: 'collectionEfficiency', label: 'Efficiency', type: 'percent' },
  ];

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

  get totalCount(): number {
    return this.filteredFeeCollectionData.length + this.filteredFeeDuesData.length;
  }

  get feeCollectionTotalAmount(): number {
    return this.filteredFeeCollectionData.reduce((sum, row) => sum + this.toNumber(row.amountPaid), 0);
  }

  get feeDuesTotalAmount(): number {
    return this.filteredFeeDuesData.reduce((sum, row) => sum + this.toNumber(row.pendingAmount ?? row.dueAmount), 0);
  }

  get selectedSchoolName(): string {
    return this.getSelectedOptionName(this.schoolList, this.selectedSchool) || 'All Schools';
  }

  get selectedAcademicYearName(): string {
    return this.getSelectedOptionName(this.academicYearList, this.selectedAcademicYear) || 'All Academic Years';
  }

  get activeDivisionContextLabel(): string {
    return this.activeClassDrillName ? `${this.activeClassDrillName} divisions` : 'All divisions';
  }

  
  get hasDashboardData(): boolean {
    return this.totalCount > 0;
  }

  get totalAmount(): number {
    return this.totalCollectionAmount + this.totalDueAmount;
  }

  get kpiPrefix(): string {
    // Case 5: Class + Division + Student + Fee Category selected
    if (this.selectedClass && this.selectedDivision && this.selectedStudent && this.selectedFeeCategory) {
      return 'Student Fee Category';
    }
    // Case 4: Class + Division + Student selected
    else if (this.selectedClass && this.selectedDivision && this.selectedStudent) {
      return 'Student';
    }
    // Case 3: Class + Division selected
    else if (this.selectedClass && this.selectedDivision) {
      return 'Division';
    }
    // Case 2: Class selected
    else if (this.selectedClass) {
      return 'Class';
    }
    // Case 1: School + Academic Year (default case)
    else {
      return 'School';
    }
  }

  private fetchSchools(): void {
    this.mastersLoadError = '';
    this.loader.show();
    this.api.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (response: any) => {
        const data = this.getResponseData(response);
        this.schoolList = data
          .map((item: any) => ({ id: String(item.id ?? ''), name: String(item.name ?? '') }))
          .filter((item: SimpleOption) => item.id && item.name);
        this.loader.hide();
      },
      error: (err: any) => {
        this.schoolList = [];
        this.mastersLoadError = '';
        console.error('Fee Report: failed to load schools', err);
        this.loader.hide();
      },
    });
  }

  private fetchAcademicYears(): void {
    if (!this.selectedSchool) {
      this.academicYearList = [];
      return;
    }

    this.loader.show();
    this.api.post<any>('Tbl_AcademicYear_CRUD_Operations', {
      SchoolID: this.selectedSchool,
      Flag: '2',
    }).subscribe({
      next: (response: any) => {
        const data = this.getResponseData(response);
        this.academicYearList = data
          .map((item: any) => ({ id: String(item.id ?? ''), name: String(item.name ?? '') }))
          .filter((item: SimpleOption) => item.id && item.name);
        this.loader.hide();
      },
      error: (err: any) => {
        this.academicYearList = [];
        console.error('Fee Report: failed to load academic years', err);
        this.loader.hide();
      },
    });
  }

  private fetchClasses(): void {
    if (!this.selectedSchool) {
      this.classList = [];
      return;
    }

    this.loader.show();
    const payload = {
      Flag: '9',
      SchoolID: this.selectedSchool,
      AcademicYear: this.selectedAcademicYear || '',
    };

    this.api.post<any>('Tbl_ClassDivision_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        const data = this.getResponseData(response);
        this.classList = data
          .map((item: any) => ({
            id: String(item.sNo ?? item.id ?? ''),
            name: String(item.syllabusClassName ?? item.name ?? ''),
          }))
          .filter((item: SimpleOption) => item.id && item.name);
        this.loader.hide();
      },
      error: () => {
        this.api.post<any>('Tbl_Class_CRUD_Operations', {
          Flag: '3',
          SchoolID: this.selectedSchool,
          AcademicYear: this.selectedAcademicYear || '',
        }).subscribe({
          next: (fallbackResponse: any) => {
            const data = this.getResponseData(fallbackResponse);
            this.classList = data
              .map((item: any) => ({ id: String(item.id ?? ''), name: String(item.name ?? '') }))
              .filter((item: SimpleOption) => item.id && item.name);
            this.loader.hide();
          },
          error: (err: any) => {
            this.classList = [];
            console.error('Fee Report: failed to load classes', err);
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

    this.loader.show();
    this.api.post<any>('Tbl_ClassDivision_CRUD_Operations', {
      SchoolID: this.selectedSchool,
      AcademicYear: this.selectedAcademicYear,
      Class: this.selectedClass,
      Flag: '3',
    }).subscribe({
      next: (response: any) => {
        const data = this.getResponseData(response);
        this.divisionList = data
          .map((item: any) => ({ id: String(item.id ?? ''), name: String(item.name ?? '') }))
          .filter((item: SimpleOption) => item.id && item.name);
        this.loader.hide();
      },
      error: (err: any) => {
        this.divisionList = [];
        console.error('Fee Report: failed to load divisions', err);
        this.loader.hide();
      },
    });
  }

  private fetchStudents(): void {
    if (!this.selectedSchool || !this.selectedAcademicYear || !this.selectedClass || !this.selectedDivision) {
      this.studentList = [];
      return;
    }

    this.loader.show();
    this.api.post<any>('Tbl_StudentDetails_CRUD_Operations', {
      SchoolID: this.selectedSchool,
      AcademicYear: this.selectedAcademicYear,
      Class: this.selectedClass,
      Division: this.selectedDivision,
      Flag: '3',
    }).subscribe({
      next: (response: any) => {
        const data = this.getResponseData(response);
        this.studentList = data
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
          .filter((item: SimpleOption) => item.id);
        this.loader.hide();
      },
      error: (err: any) => {
        this.studentList = [];
        console.error('Fee Report: failed to load students', err);
        this.loader.hide();
      },
    });
  }

  private fetchFeeCategories(): void {
    if (!this.selectedSchool || !this.selectedAcademicYear) {
      this.feeCategoryList = [];
      return;
    }

    this.loader.show();
    this.api.post<any>('Tbl_FeeCategory_CRUD_Operations', {
      SchoolID: this.selectedSchool,
      AcademicYear: this.selectedAcademicYear,
      Flag: '3',
    }).subscribe({
      next: (response: any) => {
        const data = this.getResponseData(response);
        this.feeCategoryList = data
          .map((item: any) => ({ id: String(item.id ?? ''), name: String(item.feeCategoryName ?? item.name ?? '') }))
          .filter((item: SimpleOption) => item.id && item.name);
        this.loader.hide();
      },
      error: (err: any) => {
        this.feeCategoryList = [];
        console.error('Fee Report: failed to load fee categories', err);
        this.loader.hide();
      },
    });
  }

  onSubmit(): void {
    this.schoolError = !this.selectedSchool;
    this.academicYearError = !this.selectedAcademicYear;
    this.classError = false;
    this.divisionError = false;
    this.studentError = false;
    this.feeCategoryError = false;

    if (this.schoolError || this.academicYearError) {
      this.hasSubmitted = false;
      return;
    }

    this.hasSubmitted = true;
    this.activeClassDrillId = '';
    this.activeClassDrillName = '';
    this.currentCollectionPage = 1;
    this.currentDuesPage = 1;
    this.fetchReports();
  }

  private fetchReports(): void {
    const requestId = ++this.requestSeq;
    this.loading = true;
    this.feeCollectionLoadError = '';
    this.feeDuesLoadError = '';
    this.feeCollectionData = [];
    this.filteredFeeCollectionData = [];
    this.feeDuesData = [];
    this.filteredFeeDuesData = [];
    this.resetDashboardAnalytics();
    this.loader.show();

    forkJoin({
      feeCollection: this.fetchFeeCollectionRows(),
      feeDues: this.fetchFeeDuesRows(),
    }).subscribe({
      next: ({ feeCollection, feeDues }) => {
        if (requestId !== this.requestSeq) {
          return;
        }

        this.feeCollectionData = this.normalizeFeeCollectionRows(feeCollection);
        this.feeDuesData = this.normalizeFeeDuesRows(feeDues);
        this.applyAllFiltersAndSearch();
        
        this.loading = false;
        this.loader.hide();
      },
      error: (err: any) => {
        if (requestId !== this.requestSeq) {
          return;
        }

        this.feeCollectionData = [];
        this.filteredFeeCollectionData = [];
        this.feeDuesData = [];
        this.filteredFeeDuesData = [];
        this.resetDashboardAnalytics();
        console.error('Fee Report: failed to load reports', err);
        this.loading = false;
        this.loader.hide();
      },
    });
  }

  private fetchFeeCollectionRows(): Observable<any[]> {
    const payload: any = {
      Flag: '2',
      SchoolID: this.selectedSchool || '',
      AcademicYear: this.selectedAcademicYear || '',
      Class: this.selectedClass || '',
      Division: this.selectedDivision || '',
      Student: this.selectedStudent || '',
      FeeCategory: this.selectedFeeCategory || '',
      FeeCategoryID: this.selectedFeeCategory || '',
      FeeCategoryName: this.getSelectedFeeCategoryName(),
      Limit: '10000',
    };

    return this.api.post<any>('Tbl_FeeCollection_CRUD_Operations', payload).pipe(
      map((response: any) => this.getResponseData(response)),
      catchError(() =>
        this.api.get<any>('Tbl_FeeCollection_CRUD_Operations', payload).pipe(
          map((response: any) => this.getResponseData(response)),
          catchError((err: any) => {
            this.feeCollectionLoadError = '';
            console.error('Fee Report: failed to load fee collection rows', err);
            return of([]);
          }),
        ),
      ),
    );
  }

  private fetchFeeDuesRows(): Observable<any[]> {
    const payload: any = {
      SchoolID: this.selectedSchool || '',
      AcademicYear: this.selectedAcademicYear || '',
      Class: this.selectedClass || '',
      Division: this.selectedDivision || '',
      Student: this.selectedStudent || '',
      FeeCategory: this.selectedFeeCategory || '',
      FeeCategoryID: this.selectedFeeCategory || '',
      FeeCategoryName: this.getSelectedFeeCategoryName(),
      fee_category_id: this.selectedFeeCategory || '',
      Flag: '7',
    };

    return this.api.post<any>('Tbl_FeeCollection_CRUD_Operations', payload).pipe(
      map((response: any) => this.getResponseData(response)),
      catchError(() =>
        this.api.get<any>('Tbl_FeeCollection_CRUD_Operations', payload).pipe(
          map((response: any) => this.getResponseData(response)),
          catchError((err: any) => {
            this.feeDuesLoadError = '';
            console.error('Fee Report: failed to load fee dues rows', err);
            return of([]);
          }),
        ),
      ),
    );
  }

  private normalizeFeeCollectionRows(items: any[]): FeeCollectionRow[] {
    return items
      .map((item: any) => {
        const admissionNo = item.student ?? item.admissionNo ?? item.AdmissionNo;
        const paymentDateRaw = item.paymentDate ?? item.PaymentDate;
        const amountPaid = item.amountPaid ?? item.AmountPaid ?? item.feePaid ?? item.FeePaid;
        const paymentModeRaw = item.paymentMode ?? item.PaymentMode;

        return {
          id: item.id ?? item.ID,
          receiptNo: this.toText(item.receiptNo ?? item.ReceiptNo),
          admissionNo: this.toText(admissionNo),
          studentId: this.toText(item.student ?? item.studentID ?? item.Student ?? admissionNo),
          studentName: this.toText(item.studentName ?? item.studentFullName ?? item.name ?? item.Name),
          amountPaid: this.toNumber(amountPaid),
          paymentDate: this.formatDateDDMMYYYY(this.toText(paymentDateRaw)),
          paymentDateRaw: this.toText(paymentDateRaw),
          paymentMode: this.getPaymentModeDisplayValue(paymentModeRaw),
          paymentModeRaw: this.toText(paymentModeRaw),
          classId: this.toText(item.class ?? item.classID ?? item.Class),
          className: this.toText(item.className ?? item.ClassName),
          divisionId: this.toText(item.division ?? item.divisionID ?? item.Division),
          divisionName: this.toText(item.divisionName ?? item.classDivisionName ?? item.DivisionName),
          feeCategoryId: this.toText(item.feeCategory ?? item.feeCategoryID ?? item.FeeCategoryID),
          feeCategoryName: this.toText(item.feeCategoryName ?? item.FeeCategoryName),
          schoolId: this.toText(item.schoolID ?? item.schoolId ?? item.SchoolID),
          schoolName: this.toText(item.schoolName ?? item.SchoolName),
          academicYearId: this.toText(item.academicYear ?? item.academicYearID ?? item.AcademicYear),
          academicYearName: this.toText(item.academicYearName ?? item.AcademicYearName),
          raw: item,
        };
      })
      .filter((row) => !!row.id || !!row.receiptNo || !!row.admissionNo);
  }

  private normalizeFeeDuesRows(items: any[]): FeeDuesRow[] {
    const mappedItems = items.map((item: any) => {
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
        const dueAmount =
          item.dueAmount ?? item.due_amount ?? item.balanceAmount ?? item.balance_amount ?? item.DueAmount;
        const pendingAmount = item.pendingAmount ?? item.pending_amount ?? dueAmount;

        const normalizedRow = {
          id: item.id ?? item.ID,
          admissionNo: this.toText(admissionNo),
          studentId: this.toText(item.student ?? item.studentID ?? item.Student ?? admissionNo),
          studentName: this.toText(name),
          classId: this.toText(item.class ?? item.classID ?? item.Class),
          className: this.toText(className),
          divisionId: this.toText(item.division ?? item.divisionID ?? item.Division),
          divisionName: this.toText(divisionName),
          feeCategoryId: this.toText(item.feeCategory ?? item.feeCategoryID ?? item.fee_category_id ?? item.FeeCategoryID),
          feeCategoryName: this.toText(item.feeCategoryName ?? item.fee_category_name ?? item.FeeCategoryName),
          pendingAmount: this.toNumber(pendingAmount),
          dueAmount: this.toNumber(dueAmount),
          schoolId: this.toText(item.schoolID ?? item.schoolId ?? item.SchoolID),
          schoolName: this.toText(item.schoolName ?? item.school_name ?? item.SchoolName),
          academicYearId: this.toText(item.academicYear ?? item.academicYearID ?? item.AcademicYear),
          academicYearName: this.toText(item.academicYearName ?? item.academic_year_name ?? item.AcademicYearName),
          phone: this.toText(item.phone ?? item.mobileNo ?? item.mobile ?? item.Phone),
          gender: this.toText(item.gender ?? item.Gender),
          address: this.toText(item.address ?? item.Address),
          route: this.toText(item.route ?? item.Route),
          busNo: this.toText(item.busNo ?? item.bus_no ?? item.BusNo),
          stop: this.toText(item.stop ?? item.Stop),
          raw: item,
        };
        
                
        return normalizedRow;
    });
    
    const filteredItems = mappedItems.filter((row) => {
    // For dues data, be more lenient since some fields might be null
    // Check if there's any meaningful data in the row
    return (
      !!row.id || 
      !!row.admissionNo || 
      !!row.studentName ||
      !!row.className ||
      !!row.feeCategoryName ||
      (row.pendingAmount > 0)
    );
  });
    
        
    return filteredItems;
  }

  onSchoolChange(value: string): void {
    this.selectedSchool = value;
    this.resetFiltersAfter('school');
    if (this.selectedSchool) {
      this.fetchAcademicYears();
    }
  }

  onAcademicYearChange(value: string): void {
    this.selectedAcademicYear = value;
    this.resetFiltersAfter('academicYear');
    if (this.selectedSchool && this.selectedAcademicYear) {
      this.fetchClasses();
      this.fetchFeeCategories();
    }
  }

  onClassChange(value: string): void {
    this.selectedClass = value;
    this.resetFiltersAfter('class');
    if (this.selectedClass) {
      this.fetchDivisions();
    }
  }

  onDivisionChange(value: string): void {
    this.selectedDivision = value;
    this.resetFiltersAfter('division');
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

  onSearchChange(): void {
    this.currentCollectionPage = 1;
    this.currentDuesPage = 1;
    this.applyAllFiltersAndSearch();
  }

  sortCollectionBy(column: keyof FeeCollectionRow): void {
    if (this.collectionSortColumn === column) {
      this.collectionSortDirection = this.collectionSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.collectionSortColumn = column;
      this.collectionSortDirection = 'asc';
    }
    this.applyAllFiltersAndSearch();
  }

  sortDuesBy(column: keyof FeeDuesRow): void {
    if (this.duesSortColumn === column) {
      this.duesSortDirection = this.duesSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.duesSortColumn = column;
      this.duesSortDirection = 'asc';
    }
    this.applyAllFiltersAndSearch();
  }

  sortFeeCategorySummaryBy(column: keyof SummaryRow): void {
    if (this.feeCategorySummarySortColumn === column) {
      this.feeCategorySummarySortDirection = this.feeCategorySummarySortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.feeCategorySummarySortColumn = column;
      this.feeCategorySummarySortDirection = 'desc';
    }
    this.refreshSummaryTables();
  }

  sortClassSummaryBy(column: keyof SummaryRow): void {
    if (this.classSummarySortColumn === column) {
      this.classSummarySortDirection = this.classSummarySortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.classSummarySortColumn = column;
      this.classSummarySortDirection = 'desc';
    }
    this.refreshSummaryTables();
  }

  sortDivisionSummaryBy(column: keyof SummaryRow): void {
    if (this.divisionSummarySortColumn === column) {
      this.divisionSummarySortDirection = this.divisionSummarySortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.divisionSummarySortColumn = column;
      this.divisionSummarySortDirection = 'desc';
    }
    this.refreshSummaryTables();
  }

  onClassPerformanceChartClick(event: any): void {
    const label = this.toText(event?.name).trim();
    if (!label) {
      return;
    }

    const clickedRow = this.classSummaryData.find((row) => this.normalizeText(row.name) === this.normalizeText(label));
    if (!clickedRow) {
      return;
    }

    if (this.activeClassDrillId === clickedRow.id) {
      this.clearClassDrill();
      return;
    }

    this.activeClassDrillId = clickedRow.id;
    this.activeClassDrillName = clickedRow.name;
    this.buildDashboardAnalytics();
  }

  clearClassDrill(): void {
    this.activeClassDrillId = '';
    this.activeClassDrillName = '';
    this.buildDashboardAnalytics();
  }

  private applyAllFiltersAndSearch(): void {
    const normalizedSearch = this.normalizeText(this.searchQuery);

    let collection = this.feeCollectionData.filter((row) => this.matchesCollectionFilters(row));
    let dues = this.feeDuesData.filter((row) => this.matchesDuesFilters(row));

    if (normalizedSearch) {
      collection = collection.filter((row) => this.rowMatchesSearch(row, normalizedSearch));
      dues = dues.filter((row) => this.rowMatchesSearch(row, normalizedSearch));
    }

    this.filteredFeeCollectionData = this.sortRows(collection, this.collectionSortColumn, this.collectionSortDirection);
    this.filteredFeeDuesData = this.sortRows(dues, this.duesSortColumn, this.duesSortDirection);

    if (this.currentCollectionPage > this.feeCollectionTotalPages()) {
      this.currentCollectionPage = 1;
    }
    if (this.currentDuesPage > this.feeDuesTotalPages()) {
      this.currentDuesPage = 1;
    }

    this.buildDashboardAnalytics();
  }

  private buildDashboardAnalytics(): void {
    if (!this.hasSubmitted) {
      this.resetDashboardAnalytics();
      return;
    }

    const collectionRows = this.filteredFeeCollectionData;
    const dueRows = this.filteredFeeDuesData;

    this.totalCollectionAmount = collectionRows.reduce((sum, row) => sum + this.toNumber(row.amountPaid), 0);
    this.totalDueAmount = dueRows.reduce((sum, row) => sum + this.toNumber(row.pendingAmount ?? row.dueAmount), 0);
    this.netBalanceAmount = this.totalCollectionAmount - this.totalDueAmount;
    this.totalTransactionsCount = collectionRows.length;
    this.totalStudentsCount = this.getUniqueStudentCount(collectionRows, dueRows);
    this.collectionEfficiencyPercent = this.calculateEfficiency(this.totalCollectionAmount, this.totalDueAmount);

    this.trendSeries = this.buildTrendSeries(collectionRows, dueRows);
    this.executiveKpis = this.buildExecutiveKpis();

    this.feeCategorySummaryData = this.aggregateSummaryRows(
      collectionRows.filter(row => row.feeCategoryName),
      dueRows.filter(row => row.feeCategoryName),
      (row) => row.feeCategoryId || row.feeCategoryName || 'unknown-fee-category',
      (row) => row.feeCategoryName || 'Unassigned Category',
    );

    this.classSummaryData = this.aggregateSummaryRows(
      collectionRows.filter(row => row.className),
      dueRows.filter(row => row.className),
      (row) => row.classId || row.className || 'unknown-class',
      (row) => row.className || 'Unassigned Class',
    );

    this.divisionSummaryData = this.aggregateSummaryRows(
      collectionRows.filter(row => row.divisionName && row.className),
      dueRows.filter(row => row.divisionName && row.className),
      (row) => `${row.classId || row.className || 'class'}::${row.divisionId || row.divisionName || 'division'}`,
      (row) => row.divisionName || 'Unassigned Division',
      (row) => row.className || 'Unassigned Class',
    );

    if (this.activeClassDrillId) {
      const drillExists = this.classSummaryData.some((row) => row.id === this.activeClassDrillId);
      if (!drillExists) {
        this.activeClassDrillId = '';
        this.activeClassDrillName = '';
      }
    }

    const drilledCollectionRows = this.getDrilledCollectionRows(collectionRows);
    const drilledDuesRows = this.getDrilledDuesRows(dueRows);

    this.divisionPerformanceData = this.aggregateSummaryRows(
      drilledCollectionRows.filter(row => row.divisionName && row.className),
      drilledDuesRows.filter(row => row.divisionName && row.className),
      (row) => `${row.classId || row.className || 'class'}::${row.divisionId || row.divisionName || 'division'}`,
      (row) => row.divisionName || 'Unassigned Division',
      (row) => row.className || 'Unassigned Class',
    );

    this.refreshSummaryTables();
    this.buildCharts();
  }

  private buildExecutiveKpis(): KpiCard[] {
    const prefix = this.kpiPrefix;
    
    // Special case handling for Case 5: Student Fee Category
    const isStudentFeeCategoryCase = this.selectedClass && this.selectedDivision && this.selectedStudent && this.selectedFeeCategory;
    
    return [
      {
        title: `${prefix} Total Amount`,
        value: this.formatAmount(this.totalAmount),
        meta: 'Total amount to be collected',
        icon: 'account_balance',
        accent: 'blue',
        trendDirection: 'flat',
        trendText: 'Overall amount',
      },
      {
        title: isStudentFeeCategoryCase ? 'Collected Amount' : `${prefix} Collection`,
        value: this.formatAmount(this.totalCollectionAmount),
        meta: `${this.totalTransactionsCount} transactions`,
        icon: 'payments',
        accent: 'green',
        trendDirection: 'up',
        trendText: 'Collected amount',
      },
      {
        title: isStudentFeeCategoryCase ? 'Due Amount' : `${prefix} Due`,
        value: this.formatAmount(this.totalDueAmount),
        meta: `${this.filteredFeeDuesData.length} records`,
        icon: 'warning',
        accent: 'red',
        trendDirection: 'down',
        trendText: 'Pending amount',
      },
    ];
  }

  private buildCharts(): void {
    this.collectionVsDueChartOptions = this.buildCollectionVsDueChart();
    this.feeCategoryDistributionChartOptions = this.buildFeeCategoryDistributionChart();
    this.classWisePerformanceChartOptions = this.buildClassWisePerformanceChart();
    this.divisionWisePerformanceChartOptions = this.buildDivisionWisePerformanceChart();
    this.monthlyCollectionTrendChartOptions = this.buildMonthlyCollectionTrendChart();
    this.collectionVsDueAreaChartOptions = this.buildCollectionVsDueAreaChart();
  }

  private buildCollectionVsDueChart(): any {
    if (!this.totalCollectionAmount && !this.totalDueAmount) {
      return null;
    }

    return {
      animationDuration: 900,
      color: ['#16a34a', '#dc2626'],
      tooltip: {
        trigger: 'item',
        formatter: (params: any) =>
          `${params.name}<br/><strong>${this.formatAmount(params.value)}</strong> (${params.percent || 0}%)`,
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        textStyle: { color: '#475569', fontSize: 12 },
      },
      series: [
        {
          type: 'pie',
          radius: ['54%', '74%'],
          center: ['50%', '44%'],
          label: {
            formatter: '{d}%',
            color: '#0f172a',
            fontWeight: 700,
          },
          labelLine: { length: 12, length2: 10 },
          itemStyle: {
            borderColor: '#ffffff',
            borderWidth: 4,
          },
          data: [
            { value: this.totalCollectionAmount, name: 'Collection' },
            { value: this.totalDueAmount, name: 'Due' },
          ],
        },
      ],
    };
  }

  private buildFeeCategoryDistributionChart(): any {
    const rows = this.limitPieRows(this.feeCategorySummaryData, 6);
    if (!rows.length) {
      return null;
    }

    return {
      animationDuration: 900,
      color: ['#2563eb', '#0ea5e9', '#14b8a6', '#f59e0b', '#f97316', '#64748b', '#1d4ed8'],
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => `${params.name}<br/><strong>${this.formatAmount(params.value)}</strong>`,
      },
      legend: {
        type: 'scroll',
        bottom: 0,
        icon: 'circle',
        textStyle: { color: '#475569', fontSize: 12 },
      },
      series: [
        {
          type: 'pie',
          radius: ['18%', '72%'],
          center: ['50%', '44%'],
          roseType: false,
          label: {
            formatter: '{b}',
            color: '#0f172a',
          },
          itemStyle: {
            borderColor: '#ffffff',
            borderWidth: 3,
          },
          data: rows.map((row) => ({
            value: row.totalAmount,
            name: row.name,
          })),
        },
      ],
    };
  }

  private buildClassWisePerformanceChart(): any {
    const rows = [...this.classSummaryData].sort((left, right) => right.totalAmount - left.totalAmount).slice(0, 8);
    if (!rows.length) {
      return null;
    }

    return {
      animationDuration: 900,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          const label = params?.[0]?.axisValue || '';
          const lines = params.map(
            (item) => `${item.marker} ${item.seriesName}: <strong>${this.formatAmount(item.value)}</strong>`,
          );
          return `${label}<br/>${lines.join('<br/>')}<br/><span style="color:#64748b">Click to drill into divisions</span>`;
        },
      },
      legend: {
        top: 0,
        icon: 'roundRect',
        textStyle: { color: '#475569' },
      },
      grid: {
        top: 44,
        left: 12,
        right: 18,
        bottom: 12,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: rows.map((row) => row.name),
        axisLine: { lineStyle: { color: '#d9e2ec' } },
        axisLabel: { color: '#475569', interval: 0, rotate: rows.length > 5 ? 18 : 0 },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#64748b',
          formatter: (value: number) => this.formatCompactAmount(value),
        },
        splitLine: { lineStyle: { color: '#e5edf5' } },
      },
      series: [
        {
          name: 'Collection',
          type: 'bar',
          stack: 'amount',
          emphasis: { focus: 'series' },
          itemStyle: {
            color: '#16a34a',
            borderRadius: [8, 8, 0, 0],
          },
          data: rows.map((row) => row.collectedAmount),
        },
        {
          name: 'Due',
          type: 'bar',
          stack: 'amount',
          emphasis: { focus: 'series' },
          itemStyle: {
            color: '#dc2626',
            borderRadius: [8, 8, 0, 0],
          },
          data: rows.map((row) => row.dueAmount),
        },
      ],
    };
  }

  private buildDivisionWisePerformanceChart(): any {
    const rows = [...this.divisionPerformanceData]
      .sort((left, right) => right.totalAmount - left.totalAmount)
      .slice(0, 10);

    if (!rows.length) {
      return null;
    }

    return {
      animationDuration: 900,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          const label = params?.[0]?.axisValue || '';
          const target = rows.find((row) => row.name === label);
          if (!target) {
            return label;
          }
          const lines = params.map(
            (item) => `${item.marker} ${item.seriesName}: <strong>${this.formatAmount(item.value)}</strong>`,
          );
          return `${label}${target.className ? ` (${target.className})` : ''}<br/>${lines.join('<br/>')}<br/>Efficiency: <strong>${target.collectionEfficiency.toFixed(1)}%</strong>`;
        },
      },
      legend: {
        top: 0,
        icon: 'roundRect',
        textStyle: { color: '#475569' },
      },
      grid: {
        top: 44,
        left: 12,
        right: 18,
        bottom: 12,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: rows.map((row) => row.name),
        axisLine: { lineStyle: { color: '#d9e2ec' } },
        axisLabel: { color: '#475569', interval: 0, rotate: rows.length > 5 ? 18 : 0 },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#64748b',
          formatter: (value: number) => this.formatCompactAmount(value),
        },
        splitLine: { lineStyle: { color: '#e5edf5' } },
      },
      series: [
        {
          name: 'Collection',
          type: 'bar',
          stack: 'amount',
          emphasis: { focus: 'series' },
          itemStyle: {
            color: '#16a34a',
            borderRadius: [8, 8, 0, 0],
          },
          data: rows.map((row) => row.collectedAmount),
        },
        {
          name: 'Due',
          type: 'bar',
          stack: 'amount',
          emphasis: { focus: 'series' },
          itemStyle: {
            color: '#dc2626',
            borderRadius: [8, 8, 0, 0],
          },
          data: rows.map((row) => row.dueAmount),
        },
      ],
    };
  }

  private buildMonthlyCollectionTrendChart(): any {
    if (!this.trendSeries.length) {
      return null;
    }

    return {
      animationDuration: 900,
      tooltip: {
        trigger: 'axis',
        formatter: (params: any[]) => {
          const point = this.trendSeries.find((item) => item.label === params?.[0]?.axisValue);
          if (!point) {
            return params?.[0]?.axisValue || '';
          }
          return [
            `<strong>${point.label}</strong>`,
            `Collection: ${this.formatAmount(point.collectionAmount)}`,
            `Transactions: ${point.transactionCount.toLocaleString('en-IN')}`,
            `Students: ${point.studentCount.toLocaleString('en-IN')}`,
          ].join('<br/>');
        },
      },
      grid: {
        top: 18,
        left: 12,
        right: 18,
        bottom: 12,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: this.trendSeries.map((point) => point.label),
        axisLine: { lineStyle: { color: '#d9e2ec' } },
        axisLabel: { color: '#475569' },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#64748b',
          formatter: (value: number) => this.formatCompactAmount(value),
        },
        splitLine: { lineStyle: { color: '#e5edf5' } },
      },
      series: [
        {
          name: 'Collection',
          type: 'line',
          smooth: true,
          showSymbol: true,
          symbolSize: 8,
          lineStyle: { width: 3, color: '#2563eb' },
          itemStyle: { color: '#2563eb' },
          areaStyle: {
            color: 'rgba(37, 99, 235, 0.12)',
          },
          data: this.trendSeries.map((point) => point.collectionAmount),
        },
      ],
    };
  }

  private buildCollectionVsDueAreaChart(): any {
    if (!this.trendSeries.length) {
      return null;
    }

    return {
      animationDuration: 900,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        top: 0,
        icon: 'roundRect',
        textStyle: { color: '#475569' },
      },
      grid: {
        top: 44,
        left: 12,
        right: 18,
        bottom: 12,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: this.trendSeries.map((point) => point.label),
        axisLine: { lineStyle: { color: '#d9e2ec' } },
        axisLabel: { color: '#475569' },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#64748b',
          formatter: (value: number) => this.formatCompactAmount(value),
        },
        splitLine: { lineStyle: { color: '#e5edf5' } },
      },
      series: [
        {
          name: 'Collection',
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 3, color: '#16a34a' },
          areaStyle: { color: 'rgba(22, 163, 74, 0.14)' },
          data: this.trendSeries.map((point) => point.collectionAmount),
        },
        {
          name: 'Due',
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 3, color: '#dc2626' },
          areaStyle: { color: 'rgba(220, 38, 38, 0.12)' },
          data: this.trendSeries.map((point) => point.dueAmount),
        },
      ],
    };
  }

  
  private buildTrendSeries(collectionRows: FeeCollectionRow[], dueRows: FeeDuesRow[]): TrendPoint[] {
    const mapByKey = new Map<
      string,
      {
        key: string;
        label: string;
        sortValue: number;
        collectionAmount: number;
        dueAmount: number;
        transactionCount: number;
        studentKeys: Set<string>;
      }
    >();

    const getBucket = (key: string, label: string, sortValue: number) => {
      const existing = mapByKey.get(key);
      if (existing) {
        return existing;
      }

      const created = {
        key,
        label,
        sortValue,
        collectionAmount: 0,
        dueAmount: 0,
        transactionCount: 0,
        studentKeys: new Set<string>(),
      };
      mapByKey.set(key, created);
      return created;
    };

    collectionRows.forEach((row) => {
      const bucketInfo = this.resolveTimelineBucket(
        this.pickFirst(row.raw, ['paymentDate', 'PaymentDate', 'createdDate', 'CreatedDate']) || row.paymentDateRaw || row.paymentDate,
        'Undated Collection',
        'undated-collection',
      );
      const bucket = getBucket(bucketInfo.key, bucketInfo.label, bucketInfo.sortValue);
      bucket.collectionAmount += this.toNumber(row.amountPaid);
      bucket.transactionCount += 1;
      const studentKey = this.getStudentKey(row.admissionNo, row.studentId, row.studentName);
      if (studentKey) {
        bucket.studentKeys.add(studentKey);
      }
    });

    dueRows.forEach((row) => {
      const rawDate = this.pickFirst(row.raw, [
        'dueDate',
        'DueDate',
        'createdDate',
        'CreatedDate',
        'updatedDate',
        'UpdatedDate',
        'paymentDate',
        'PaymentDate',
      ]);
      const bucketInfo = this.resolveTimelineBucket(rawDate, 'Outstanding', 'outstanding');
      const bucket = getBucket(bucketInfo.key, bucketInfo.label, bucketInfo.sortValue);
      bucket.dueAmount += this.toNumber(row.pendingAmount ?? row.dueAmount);
      const studentKey = this.getStudentKey(row.admissionNo, row.studentId, row.studentName);
      if (studentKey) {
        bucket.studentKeys.add(studentKey);
      }
    });

    return Array.from(mapByKey.values())
      .sort((left, right) => left.sortValue - right.sortValue)
      .map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        sortValue: bucket.sortValue,
        collectionAmount: bucket.collectionAmount,
        dueAmount: bucket.dueAmount,
        transactionCount: bucket.transactionCount,
        studentCount: bucket.studentKeys.size,
      }));
  }

  private aggregateSummaryRows(
    collectionRows: FeeCollectionRow[],
    dueRows: FeeDuesRow[],
    keySelector: (row: FeeCollectionRow | FeeDuesRow) => string,
    labelSelector: (row: FeeCollectionRow | FeeDuesRow) => string,
    classLabelSelector?: (row: FeeCollectionRow | FeeDuesRow) => string,
  ): SummaryRow[] {
    const mapByKey = new Map<
      string,
      SummaryRow & {
        studentKeys: Set<string>;
      }
    >();

    const ensureRow = (row: FeeCollectionRow | FeeDuesRow) => {
      const id = this.toText(keySelector(row)) || 'unknown';
      const existing = mapByKey.get(id);
      if (existing) {
        return existing;
      }

      const created: SummaryRow & { studentKeys: Set<string> } = {
        id,
        name: labelSelector(row) || 'Unassigned',
        className: classLabelSelector?.(row) || '',
        collectedAmount: 0,
        dueAmount: 0,
        netBalance: 0,
        totalAmount: 0,
        students: 0,
        transactions: 0,
        collectionEfficiency: 0,
        studentKeys: new Set<string>(),
      };
      mapByKey.set(id, created);
      return created;
    };

    collectionRows.forEach((row) => {
      const item = ensureRow(row);
      item.collectedAmount += this.toNumber(row.amountPaid);
      item.transactions += 1;
      const studentKey = this.getStudentKey(row.admissionNo, row.studentId, row.studentName);
      if (studentKey) {
        item.studentKeys.add(studentKey);
      }
    });

    dueRows.forEach((row) => {
      const item = ensureRow(row);
      item.dueAmount += this.toNumber(row.pendingAmount ?? row.dueAmount);
      const studentKey = this.getStudentKey(row.admissionNo, row.studentId, row.studentName);
      if (studentKey) {
        item.studentKeys.add(studentKey);
      }
    });

    return Array.from(mapByKey.values())
      .map((row) => ({
        id: row.id,
        name: row.name,
        className: row.className,
        collectedAmount: row.collectedAmount,
        dueAmount: row.dueAmount,
        netBalance: row.collectedAmount - row.dueAmount,
        totalAmount: row.collectedAmount + row.dueAmount,
        students: row.studentKeys.size,
        transactions: row.transactions,
        collectionEfficiency: this.calculateEfficiency(row.collectedAmount, row.dueAmount),
      }))
      .sort((left, right) => right.totalAmount - left.totalAmount);
  }

  
  private refreshSummaryTables(): void {
    this.displayFeeCategorySummaryData = this.sortRows(
      this.feeCategorySummaryData,
      this.feeCategorySummarySortColumn,
      this.feeCategorySummarySortDirection,
    );
    this.displayClassSummaryData = this.sortRows(this.classSummaryData, this.classSummarySortColumn, this.classSummarySortDirection);
    this.displayDivisionSummaryData = this.sortRows(
      this.divisionSummaryData,
      this.divisionSummarySortColumn,
      this.divisionSummarySortDirection,
    );
  }

  private resetDashboardAnalytics(): void {
    this.executiveKpis = [];
    this.trendSeries = [];
    this.feeCategorySummaryData = [];
    this.classSummaryData = [];
    this.divisionSummaryData = [];
    this.divisionPerformanceData = [];
    this.displayFeeCategorySummaryData = [];
    this.displayClassSummaryData = [];
    this.displayDivisionSummaryData = [];
    this.totalCollectionAmount = 0;
    this.totalDueAmount = 0;
    this.netBalanceAmount = 0;
    this.totalStudentsCount = 0;
    this.totalTransactionsCount = 0;
    this.collectionEfficiencyPercent = 0;
    this.collectionVsDueChartOptions = null;
    this.feeCategoryDistributionChartOptions = null;
    this.classWisePerformanceChartOptions = null;
    this.divisionWisePerformanceChartOptions = null;
    this.monthlyCollectionTrendChartOptions = null;
    this.collectionVsDueAreaChartOptions = null;
  }

  private getDrilledCollectionRows(rows: FeeCollectionRow[]): FeeCollectionRow[] {
    if (!this.activeClassDrillId) {
      return rows;
    }

    return rows.filter((row) => this.normalizeText(row.classId || row.className) === this.normalizeText(this.activeClassDrillId));
  }

  private getDrilledDuesRows(rows: FeeDuesRow[]): FeeDuesRow[] {
    if (!this.activeClassDrillId) {
      return rows;
    }

    return rows.filter((row) => this.normalizeText(row.classId || row.className) === this.normalizeText(this.activeClassDrillId));
  }

  private getLatestTrendValue(selector: (point: TrendPoint) => number): number {
    const series = this.getComparableTrendSeries();
    return series.length ? selector(series[series.length - 1]) : 0;
  }

  private getPreviousTrendValue(selector: (point: TrendPoint) => number): number {
    const series = this.getComparableTrendSeries();
    return series.length > 1 ? selector(series[series.length - 2]) : 0;
  }

  private getComparableTrendSeries(): TrendPoint[] {
    const realTimeline = this.trendSeries.filter(
      (point) => !point.key.startsWith('undated-collection') && !point.key.startsWith('outstanding'),
    );
    if (realTimeline.length >= 2) {
      return realTimeline;
    }
    return this.trendSeries;
  }

  private getTrendMeta(current: number, previous: number, positiveWhenHigher: boolean, suffix: string): TrendMeta {
    if (!current && !previous) {
      return { direction: 'flat', text: `No movement ${suffix}` };
    }

    if (current === previous) {
      return { direction: 'flat', text: `Stable ${suffix}` };
    }

    const isPositive = positiveWhenHigher ? current > previous : current < previous;
    const percentChange = previous === 0 ? 100 : Math.abs(((current - previous) / previous) * 100);
    const direction: 'up' | 'down' = current > previous ? 'up' : 'down';
    const verb = isPositive ? 'Improved' : 'Shifted';
    return {
      direction,
      text: `${verb} ${percentChange.toFixed(1)}% ${suffix}`,
    };
  }

  private resolveTimelineBucket(
    rawDate: any,
    fallbackLabel: string,
    fallbackKey: string,
  ): { key: string; label: string; sortValue: number } {
    const parsedDate = this.parseDate(rawDate);
    if (!parsedDate) {
      const fallbackSort = fallbackKey === 'outstanding' ? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER - 1;
      return {
        key: fallbackKey,
        label: fallbackLabel,
        sortValue: fallbackSort,
      };
    }

    const year = parsedDate.getFullYear();
    const month = parsedDate.getMonth();
    return {
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: parsedDate.toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
      sortValue: year * 100 + (month + 1),
    };
  }

  private limitPieRows(rows: SummaryRow[], visibleCount: number): SummaryRow[] {
    if (rows.length <= visibleCount) {
      return rows;
    }

    const primaryRows = rows.slice(0, visibleCount);
    const otherRows = rows.slice(visibleCount);
    const otherSummary = otherRows.reduce(
      (acc, row) => {
        acc.collectedAmount += row.collectedAmount;
        acc.dueAmount += row.dueAmount;
        acc.totalAmount += row.totalAmount;
        acc.netBalance += row.netBalance;
        acc.students += row.students;
        acc.transactions += row.transactions;
        return acc;
      },
      {
        id: 'others',
        name: 'Others',
        className: '',
        collectedAmount: 0,
        dueAmount: 0,
        netBalance: 0,
        totalAmount: 0,
        students: 0,
        transactions: 0,
        collectionEfficiency: 0,
      } as SummaryRow,
    );
    otherSummary.collectionEfficiency = this.calculateEfficiency(otherSummary.collectedAmount, otherSummary.dueAmount);

    return [...primaryRows, otherSummary];
  }

  private getUniqueStudentCount(collectionRows: FeeCollectionRow[], dueRows: FeeDuesRow[]): number {
    const studentKeys = new Set<string>();

    collectionRows.forEach((row) => {
      const studentKey = this.getStudentKey(row.admissionNo, row.studentId, row.studentName);
      if (studentKey) {
        studentKeys.add(studentKey);
      }
    });

    dueRows.forEach((row) => {
      const studentKey = this.getStudentKey(row.admissionNo, row.studentId, row.studentName);
      if (studentKey) {
        studentKeys.add(studentKey);
      }
    });

    return studentKeys.size;
  }

  private getStudentKey(admissionNo: any, studentId: any, studentName: any): string {
    const normalizedAdmission = this.normalizeText(admissionNo);
    if (normalizedAdmission) {
      return normalizedAdmission;
    }

    const normalizedStudentId = this.normalizeText(studentId);
    if (normalizedStudentId) {
      return normalizedStudentId;
    }

    return this.normalizeText(studentName);
  }

  private calculateEfficiency(collectionAmount: number, dueAmount: number): number {
    const denominator = collectionAmount + dueAmount;
    if (!denominator) {
      return 0;
    }
    return (collectionAmount / denominator) * 100;
  }

  private matchesCollectionFilters(row: FeeCollectionRow): boolean {
    return (
      this.matchesSelectedOption(this.selectedSchool, row.schoolId, row.schoolName, this.schoolList) &&
      this.matchesSelectedOption(this.selectedAcademicYear, row.academicYearId, row.academicYearName, this.academicYearList) &&
      this.matchesSelectedOption(this.selectedClass, row.classId, row.className, this.classList) &&
      this.matchesSelectedOption(this.selectedDivision, row.divisionId, row.divisionName, this.divisionList) &&
      this.matchesSelectedStudent(row.admissionNo, row.studentId, row.studentName) &&
      this.matchesSelectedOption(this.selectedFeeCategory, row.feeCategoryId, row.feeCategoryName, this.feeCategoryList)
    );
  }

  private matchesDuesFilters(row: FeeDuesRow): boolean {
    return (
      this.matchesSelectedOption(this.selectedSchool, row.schoolId, row.schoolName, this.schoolList) &&
      this.matchesSelectedOption(this.selectedAcademicYear, row.academicYearId, row.academicYearName, this.academicYearList) &&
      this.matchesSelectedOption(this.selectedClass, row.classId, row.className, this.classList) &&
      this.matchesSelectedOption(this.selectedDivision, row.divisionId, row.divisionName, this.divisionList) &&
      this.matchesSelectedStudent(row.admissionNo, row.studentId, row.studentName) &&
      this.matchesSelectedOption(this.selectedFeeCategory, row.feeCategoryId, row.feeCategoryName, this.feeCategoryList)
    );
  }

  private matchesSelectedOption(selectedId: string, rowId: any, rowName: any, options: SimpleOption[]): boolean {
    if (!selectedId) {
      return true;
    }

    const normalizedSelectedId = this.normalizeText(selectedId);
    const normalizedRowId = this.normalizeText(rowId);
    
    // First try to match by ID if both are present
    if (normalizedSelectedId && normalizedRowId && normalizedSelectedId === normalizedRowId) {
      return true;
    }

    // If row ID is empty or doesn't match, try to match by name
    const selectedName = this.getSelectedOptionName(options, selectedId);
    const normalizedSelectedName = this.normalizeText(selectedName);
    const normalizedRowName = this.normalizeText(rowName);

    // Enhanced name matching - be more lenient with partial matches
    if (normalizedSelectedName && normalizedRowName) {
      // Exact match
      if (normalizedSelectedName === normalizedRowName) {
        return true;
      }
      
      // Partial match - check if selected name is contained in row name
      if (normalizedRowName.includes(normalizedSelectedName)) {
        return true;
      }
      
      // Check if row name is contained in selected name
      if (normalizedSelectedName.includes(normalizedRowName)) {
        return true;
      }
    }

    return false;
  }

  private matchesSelectedStudent(admissionNo: any, studentId: any, studentName: any): boolean {
    if (!this.selectedStudent) {
      return true;
    }

    const normalizedSelected = this.normalizeText(this.selectedStudent);
    const normalizedAdmission = this.normalizeText(admissionNo);
    const normalizedStudentId = this.normalizeText(studentId);
    if (normalizedSelected === normalizedAdmission || normalizedSelected === normalizedStudentId) {
      return true;
    }

    const selectedName = this.getSelectedOptionName(this.studentList, this.selectedStudent);
    return this.normalizeText(selectedName) === this.normalizeText(studentName);
  }

  private rowMatchesSearch(row: any, normalizedSearch: string): boolean {
    return Object.values(row).some((value) => this.normalizeText(value).includes(normalizedSearch));
  }

  private sortRows<T extends Record<string, any>>(
    rows: T[],
    sortColumn: keyof T | '',
    sortDirection: 'asc' | 'desc',
  ): T[] {
    if (!sortColumn) {
      return rows;
    }

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => {
      const leftValue = left[sortColumn];
      const rightValue = right[sortColumn];

      const leftNumber = Number(leftValue);
      const rightNumber = Number(rightValue);
      if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
        return (leftNumber - rightNumber) * direction;
      }

      const leftText = this.normalizeText(leftValue);
      const rightText = this.normalizeText(rightValue);
      if (leftText < rightText) return -1 * direction;
      if (leftText > rightText) return 1 * direction;
      return 0;
    });
  }

  getCollectionValue(row: FeeCollectionRow, key: keyof FeeCollectionRow): string | number {
    const value = row[key];
    if (value === undefined || value === null || value === '') {
      return '-';
    }

    if (key === 'amountPaid') {
      return this.formatAmount(value);
    }

    return value as string | number;
  }

  getDuesValue(row: FeeDuesRow, key: keyof FeeDuesRow): string | number {
    const value = row[key];
    if (value === undefined || value === null || value === '') {
      return '-';
    }

    if (key === 'pendingAmount' || key === 'dueAmount') {
      return this.formatAmount(value);
    }

    return value as string | number;
  }

  getSummaryValue(row: SummaryRow, column: TableColumn<SummaryRow>): string | number {
    const value = row[column.key];
    if (value === undefined || value === null || value === '') {
      return '-';
    }

    if (column.type === 'amount') {
      return this.formatAmount(value);
    }

    if (column.type === 'percent') {
      return `${this.toNumber(value).toFixed(1)}%`;
    }

    if (column.type === 'number') {
      return this.toNumber(value).toLocaleString('en-IN');
    }

    return value as string | number;
  }

  get pagedFeeCollectionData(): FeeCollectionRow[] {
    const start = (this.currentCollectionPage - 1) * this.pageSize;
    return this.filteredFeeCollectionData.slice(start, start + this.pageSize);
  }

  get pagedFeeDuesData(): FeeDuesRow[] {
    const start = (this.currentDuesPage - 1) * this.pageSize;
    return this.filteredFeeDuesData.slice(start, start + this.pageSize);
  }

  feeCollectionTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredFeeCollectionData.length / this.pageSize) || 1);
  }

  feeDuesTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredFeeDuesData.length / this.pageSize) || 1);
  }

  changeCollectionPage(page: number): void {
    const totalPages = this.feeCollectionTotalPages();
    if (page < 1 || page > totalPages) {
      return;
    }
    this.currentCollectionPage = page;
  }

  changeDuesPage(page: number): void {
    const totalPages = this.feeDuesTotalPages();
    if (page < 1 || page > totalPages) {
      return;
    }
    this.currentDuesPage = page;
  }

  get visibleCollectionPages(): number[] {
    return this.getVisiblePages(this.currentCollectionPage, this.feeCollectionTotalPages());
  }

  get visibleDuesPages(): number[] {
    return this.getVisiblePages(this.currentDuesPage, this.feeDuesTotalPages());
  }

  get collectionShowingFrom(): number {
    if (!this.filteredFeeCollectionData.length) return 0;
    return (this.currentCollectionPage - 1) * this.pageSize + 1;
  }

  get collectionShowingTo(): number {
    if (!this.filteredFeeCollectionData.length) return 0;
    return Math.min(this.currentCollectionPage * this.pageSize, this.filteredFeeCollectionData.length);
  }

  get duesShowingFrom(): number {
    if (!this.filteredFeeDuesData.length) return 0;
    return (this.currentDuesPage - 1) * this.pageSize + 1;
  }

  get duesShowingTo(): number {
    if (!this.filteredFeeDuesData.length) return 0;
    return Math.min(this.currentDuesPage * this.pageSize, this.filteredFeeDuesData.length);
  }

  private getVisiblePages(currentPage: number, totalPages: number): number[] {
    const pages: number[] = [];
    const half = Math.floor(this.visiblePageCount / 2);
    let start = Math.max(currentPage - half, 1);
    let end = Math.min(start + this.visiblePageCount - 1, totalPages);

    if (end - start < this.visiblePageCount - 1) {
      start = Math.max(end - this.visiblePageCount + 1, 1);
    }

    for (let index = start; index <= end; index++) {
      pages.push(index);
    }

    return pages;
  }

  private resetFiltersAfter(level: 'school' | 'academicYear' | 'class' | 'division'): void {
    this.hasSubmitted = false;
    this.searchQuery = '';
    this.activeClassDrillId = '';
    this.activeClassDrillName = '';
    this.resetDashboardAnalytics();

    if (level === 'school') {
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
    }

    if (level === 'academicYear') {
      this.academicYearError = false;
      this.selectedClass = '';
      this.selectedDivision = '';
      this.selectedStudent = '';
      this.selectedFeeCategory = '';
      this.classList = [];
      this.divisionList = [];
      this.studentList = [];
      this.feeCategoryList = [];
    }

    if (level === 'class') {
      this.classError = false;
      this.selectedDivision = '';
      this.selectedStudent = '';
      this.divisionList = [];
      this.studentList = [];
    }

    if (level === 'division') {
      this.divisionError = false;
      this.selectedStudent = '';
      this.studentList = [];
    }
  }

  private getSelectedFeeCategoryName(): string {
    return this.getSelectedOptionName(this.feeCategoryList, this.selectedFeeCategory);
  }

  private getSelectedOptionName(options: SimpleOption[], selectedId: string): string {
    if (!selectedId) {
      return '';
    }

    const selected = options.find((option) => option.id === selectedId);
    return selected?.name ?? '';
  }

  private getResponseData(response: any): any[] {
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.Data)) return response.Data;
    if (Array.isArray(response)) return response;
    return [];
  }

  private formatDateDDMMYYYY(dateStr: string | null): string {
    if (!dateStr) {
      return '';
    }

    const date = this.parseDate(dateStr);
    if (!date) {
      return String(dateStr);
    }

    return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
  }

  private getPaymentModeDisplayValue(rawMode: any): string {
    const normalized = this.normalizeText(rawMode);
    if (!normalized) {
      return '';
    }

    if (normalized === '1' || normalized === 'cash') return 'Cash';
    if (normalized === '2' || normalized === 'online') return 'Online';
    if (normalized === '3' || normalized === 'cheque' || normalized === 'check') return 'Cheque';
    if (normalized === '4' || normalized === 'upi') return 'UPI';

    return this.toText(rawMode);
  }

  formatAmount(value: any): string {
    const numericValue = this.toNumber(value);
    return numericValue.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  formatSignedAmount(value: number): string {
    const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${prefix}${this.formatAmount(Math.abs(value))}`;
  }

  formatCompactAmount(value: number): string {
    const numericValue = this.toNumber(value);
    if (Math.abs(numericValue) >= 10000000) {
      return `${(numericValue / 10000000).toFixed(1)}Cr`;
    }
    if (Math.abs(numericValue) >= 100000) {
      return `${(numericValue / 100000).toFixed(1)}L`;
    }
    if (Math.abs(numericValue) >= 1000) {
      return `${(numericValue / 1000).toFixed(1)}K`;
    }
    return numericValue.toLocaleString('en-IN');
  }

  private normalizeText(value: any): string {
    return (value ?? '').toString().trim().toLowerCase();
  }

  private toText(value: any): string {
    if (value === undefined || value === null) {
      return '';
    }
    return String(value);
  }

  private toNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private pickFirst(source: any, keys: string[]): string {
    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && value !== '') {
        return String(value);
      }
    }

    return '';
  }

  private parseDate(value: any): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    const text = this.toText(value).trim();
    if (!text) {
      return null;
    }

    const direct = new Date(text);
    if (!Number.isNaN(direct.getTime())) {
      return direct;
    }

    const ddMmYyyy = text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (ddMmYyyy) {
      const [, day, month, year] = ddMmYyyy;
      const parsed = new Date(Number(year), Number(month) - 1, Number(day));
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  }
}
