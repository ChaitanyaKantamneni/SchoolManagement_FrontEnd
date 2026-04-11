import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { LoaderService } from '../../../Services/loader.service';

type SalaryIssuedRow = {
  staffId?: string;
  schoolName: string;
  academicYearName: string;
  staffName: string;
  designation: string;
  paymentMode: string;
  salaryPeriod: string;
  amount: number;
  date: string;
  payHeadLines: Array<{ payHead: string; type: 'Addition' | 'Deduction'; amount: number }>;
};

@Component({
  selector: 'app-salary-issued',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './salary-issued.component.html',
  styleUrl: './salary-issued.component.css'
})
export class SalaryIssuedComponent implements OnInit {
  constructor(private apiurl: ApiServiceService, public loader: LoaderService) {}

  searchQuery = '';
  isPayslipOpen = false;
  selectedPayslip: SalaryIssuedRow | null = null;
  schoolList: any[] = [];
  academicYearList: any[] = [];
  selectedSchoolID = '';
  selectedAcademicYearID = '';

  salaryIssued: SalaryIssuedRow[] = [];

  get filteredRows(): SalaryIssuedRow[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.salaryIssued;
    return this.salaryIssued.filter(
      (row) =>
        row.schoolName.toLowerCase().includes(q) ||
        row.academicYearName.toLowerCase().includes(q) ||
        row.staffName.toLowerCase().includes(q) ||
        row.designation.toLowerCase().includes(q) ||
        row.paymentMode.toLowerCase().includes(q) ||
        row.salaryPeriod.toLowerCase().includes(q)
    );
  }

  get issuedCount(): number {
    return this.salaryIssued.length;
  }

  get earningsLines(): Array<{ payHead: string; amount: number }> {
    if (!this.selectedPayslip) return [];
    return this.selectedPayslip.payHeadLines
      .filter((x) => x.type === 'Addition')
      .map((x) => ({ payHead: x.payHead, amount: x.amount }));
  }

  get deductionLines(): Array<{ payHead: string; amount: number }> {
    if (!this.selectedPayslip) return [];
    return this.selectedPayslip.payHeadLines
      .filter((x) => x.type === 'Deduction')
      .map((x) => ({ payHead: x.payHead, amount: x.amount }));
  }

  get payslipRows(): Array<{
    earningPayHead: string;
    earningAmount: number | null;
    deductionPayHead: string;
    deductionAmount: number | null;
  }> {
    const earnings = this.earningsLines;
    const deductions = this.deductionLines;
    const max = Math.max(earnings.length, deductions.length, 1);
    return Array.from({ length: max }, (_, i) => ({
      earningPayHead: earnings[i]?.payHead || '-',
      earningAmount: earnings[i]?.amount ?? null,
      deductionPayHead: deductions[i]?.payHead || '-',
      deductionAmount: deductions[i]?.amount ?? null
    }));
  }

  get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  ngOnInit(): void {
    if (this.isAdmin) {
      this.FetchSchoolsList();
      this.FetchSalaryIssued();
    } else {
      this.selectedSchoolID =
        sessionStorage.getItem('SchoolID') ||
        sessionStorage.getItem('schoolID') ||
        sessionStorage.getItem('schoolId') ||
        '';
      this.FetchAcademicYearsList();
      this.FetchSalaryIssued();
    }
  }

  FetchSchoolsList() {
    this.loader.show();
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (response: any) => {
        this.schoolList = Array.isArray(response?.data)
          ? response.data.map((item: any) => ({ ID: item.id, Name: item.name }))
          : [];
        this.loader.hide();
      },
      error: () => {
        this.schoolList = [];
        this.loader.hide();
      }
    });
  }

  FetchAcademicYearsList() {
    if (!this.selectedSchoolID) {
      this.academicYearList = [];
      return;
    }
    this.loader.show();
    this.apiurl
      .post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: this.selectedSchoolID || '', Flag: '2' })
      .subscribe({
        next: (response: any) => {
          this.academicYearList = Array.isArray(response?.data)
            ? response.data.map((item: any) => ({ ID: item.id, Name: item.name }))
            : [];
          this.loader.hide();
        },
        error: () => {
          this.academicYearList = [];
          this.loader.hide();
        }
      });
  }

  onAdminSchoolChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedSchoolID = target.value === '0' ? '' : target.value;
    this.selectedAcademicYearID = '';
    if (this.selectedSchoolID) {
      this.FetchAcademicYearsList();
    } else {
      this.academicYearList = [];
    }
    this.FetchSalaryIssued();
  }

  onAcademicYearChange(): void {
    this.FetchSalaryIssued();
  }

  FetchSalaryIssued(): void {
    const payload: any = {
      Flag: '2',
      SchoolID: this.toNumber(this.selectedSchoolID),
      AcademicYear: this.toNumber(this.selectedAcademicYearID),
      Limit: 500,
      Offset: 0
    };

    this.loader.show();
    this.apiurl.post<any>('Tbl_SalaryPay_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        const data = (response?.Data || response?.data || []) as any[];
        this.salaryIssued = Array.isArray(data)
          ? data.map((row: any) => this.mapSalaryIssuedRow(row)).filter((x) => !!x.staffName)
          : [];
        this.loader.hide();
      },
      error: () => {
        this.salaryIssued = [];
        this.loader.hide();
      }
    });
  }

  private mapSalaryIssuedRow(row: any): SalaryIssuedRow {
    const startDateRaw =
      this.pick(row, ['PayMonth', 'payMonth']) ||
      this.extractStartDateFromDescription(this.pick(row, ['Description', 'description']));
    const endDateRaw = this.extractEndDateFromDescription(this.pick(row, ['Description', 'description']));
    const startDate = this.formatDate(startDateRaw);
    const endDate = this.formatDate(endDateRaw);
    const payHeadLines = this.parsePayHeadJson(this.pick(row, ['PayHeadJson', 'payHeadJson']) || '[]');

    return {
      staffId: `${this.pick(row, ['StaffID', 'staffID', 'staffId', 'ID', 'id']) || ''}`.trim() || undefined,
      schoolName: `${this.pick(row, ['SchoolName', 'schoolName']) || this.getSelectedSchoolName() || '-'}`.trim(),
      academicYearName: `${this.pick(row, ['AcademicYearName', 'academicYearName', 'YearName', 'yearName']) || this.getSelectedAcademicYearName() || '-'}`.trim(),
      staffName: `${this.pick(row, ['StaffName', 'staffName', 'Name', 'name']) || ''}`.trim(),
      designation: `${this.pick(row, ['Designation', 'designation', 'RoleName', 'roleName']) || '-'}`.trim(),
      paymentMode: `${this.pick(row, ['PaymentMode', 'paymentMode']) || '-'}`.trim(),
      salaryPeriod: startDate && endDate ? `${startDate} - ${endDate}` : startDate || '-',
      amount: Number(this.pick(row, ['NetAmount', 'netAmount', 'Amount', 'amount']) || 0),
      date: this.formatDate(this.pick(row, ['PayDate', 'payDate', 'PaidDate', 'paidDate', 'Date', 'date', 'CreatedDate', 'createdDate'])) || '-',
      payHeadLines
    };
  }

  private parsePayHeadJson(raw: any): Array<{ payHead: string; type: 'Addition' | 'Deduction'; amount: number }> {
    let parsed: any[] = [];
    try {
      const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
      parsed = Array.isArray(value) ? value : [];
    } catch {
      parsed = [];
    }

    return parsed
      .map((item: any) => {
        const payHead = `${item?.PayHeadName || item?.payHeadName || '-'}`.trim() || '-';
        const rawType = `${item?.HeadType || item?.headType || item?.Type || item?.type || ''}`.toLowerCase();
        const type: 'Addition' | 'Deduction' = rawType.includes('deduct') ? 'Deduction' : 'Addition';
        const amount = Number(item?.Amount ?? item?.amount ?? 0);
        return { payHead, type, amount: Number.isFinite(amount) ? amount : 0 };
      })
      .filter((x) => x.amount !== 0 || x.payHead !== '-');
  }

  private extractStartDateFromDescription(description: any): string {
    const text = `${description || ''}`;
    const match = text.match(/salary period:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    return match?.[1] || '';
  }

  private extractEndDateFromDescription(description: any): string {
    const text = `${description || ''}`;
    const match = text.match(/to\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    return match?.[1] || '';
  }

  private formatDate(value: any): string {
    if (!value) return '';
    const raw = `${value}`.trim();
    if (!raw) return '';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return raw;
    }
    const dd = `${date.getDate()}`.padStart(2, '0');
    const mm = `${date.getMonth() + 1}`.padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  private pick(obj: any, keys: string[]): any {
    for (const key of keys) {
      if (obj && obj[key] !== undefined && obj[key] !== null) {
        return obj[key];
      }
    }
    return null;
  }

  private toNumber(value: any): number | null {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private getSelectedSchoolName(): string {
    const selected = this.schoolList.find((x: any) => `${x?.ID}` === `${this.selectedSchoolID}`);
    return `${selected?.Name || ''}`.trim();
  }

  private getSelectedAcademicYearName(): string {
    const selected = this.academicYearList.find((x: any) => `${x?.ID}` === `${this.selectedAcademicYearID}`);
    return `${selected?.Name || ''}`.trim();
  }

  openPayslip(row: SalaryIssuedRow): void {
    this.selectedPayslip = row;
    this.isPayslipOpen = true;
  }

  closePayslip(): void {
    this.isPayslipOpen = false;
    this.selectedPayslip = null;
  }

  printPayslip(): void {
    const content = document.getElementById('payslipSection')?.innerHTML;
    if (!content) return;
    const printWindow = window.open('', '', 'width=900,height=700');
    printWindow?.document.write(`
      <html>
        <head>
          <title>Payslip</title>
          <style>
            @page { size: auto; margin: 12mm; }
            * { box-sizing: border-box; }
            body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; color: #111827; }
            .print-page { max-width: 860px; margin: 0 auto; }
            .print-payslip { border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; background: #fff; font-size: 14px; }
            .print-payslip p { margin: 6px 0; }
            .payslip-head { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px; }
            .payslip-title { margin: 0; font-size: 18px; font-weight: 700; }
            .payslip-sub { margin: 3px 0 0; font-size: 12px; color: #64748b; }
            .payslip-meta-right p { margin: 2px 0; font-size: 12px; }
            .payslip-meta-right span, .payslip-meta-grid span { color: #64748b; }
            .payslip-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin-bottom: 12px; }
            .payslip-meta-grid p { margin: 0; font-size: 12px; }
            .payslip-meta-grid p:nth-child(even) { text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
            .payslip-table th { background: #f8fafc; font-weight: 600; }
            .payslip-totals { width: 100%; margin-left: 0; margin-top: 10px; }
            .totals-row { display: flex; align-items: center; font-size: 14px; padding: 4px 0; }
            .totals-row span { text-align: left; }
            .totals-row b { margin-left: auto; text-align: right; min-width: 120px; }
            .net-row { border-top: 1px solid #94a3b8; margin-top: 4px; padding-top: 6px; font-size: 16px; }
            .payslip-sign { display: flex; justify-content: space-between; margin-top: 26px; color: #475569; font-size: 12px; }
          </style>
        </head>
        <body onload="window.print(); window.close();"><div class="print-page"><div class="print-payslip">${content}</div></div></body>
      </html>
    `);
    printWindow?.document.close();
  }

  get grossEarnings(): number {
    return +this.earningsLines.reduce((sum, x) => sum + x.amount, 0).toFixed(2);
  }

  get totalDeductions(): number {
    return +this.deductionLines.reduce((sum, x) => sum + x.amount, 0).toFixed(2);
  }

  exportPlaceholder(kind: string): void {
    console.log('Export:', kind);
  }
}
