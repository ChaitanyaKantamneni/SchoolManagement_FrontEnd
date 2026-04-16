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
  grossAmount: number;
  deductionAmount: number;
  date: string;
  rawDate: string;
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
      .filter((x) => x.type === 'Addition' && x.amount > 0)
      .map((x) => ({ payHead: x.payHead, amount: x.amount }));
  }

  get deductionLines(): Array<{ payHead: string; amount: number }> {
    if (!this.selectedPayslip) return [];
    return this.selectedPayslip.payHeadLines
      .filter((x) => x.type === 'Deduction' && x.amount > 0)
      .map((x) => ({ payHead: x.payHead, amount: x.amount }));
  }

  get regularDeductionLines(): Array<{ payHead: string; amount: number }> {
    if (!this.selectedPayslip) return [];
    return this.selectedPayslip.payHeadLines
      .filter((x) => x.type === 'Deduction' && x.amount > 0 && !x.payHead.toLowerCase().includes('advance'))
      .map((x) => ({ payHead: x.payHead, amount: x.amount }));
  }

  get advanceDeductionLines(): Array<{ payHead: string; amount: number }> {
    if (!this.selectedPayslip) return [];
    return this.selectedPayslip.payHeadLines
      .filter((x) => x.type === 'Deduction' && x.amount > 0 && x.payHead.toLowerCase().includes('advance'))
      .map((x) => ({ payHead: x.payHead, amount: x.amount }));
  }

  get totalAdvanceDeduction(): number {
    return +this.advanceDeductionLines.reduce((sum, x) => sum + x.amount, 0).toFixed(2);
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
        console.log('[SalaryIssued] raw response:', response);
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
    const startDateRaw = row.payMonth || row.PayMonth ||
      this.extractStartDateFromDescription(row.description || row.Description);
    const endDateRaw = this.extractEndDateFromDescription(row.description || row.Description);
    const startDate = this.formatDate(startDateRaw);
    const endDate = this.formatDate(endDateRaw);
    const payHeadLines = this.parsePayHeadJson(row.payHeadJson || row.PayHeadJson || '[]');

    return {
      staffId: `${row.staffID ?? row.StaffID ?? row.id ?? row.ID ?? ''}`.trim() || undefined,
      schoolName: `${row.schoolName || row.SchoolName || this.getSelectedSchoolName() || '-'}`.trim(),
      academicYearName: `${row.academicYearName || row.AcademicYearName || this.getSelectedAcademicYearName() || '-'}`.trim(),
      staffName: `${row.staffName || row.StaffName || ''}`.trim(),
      designation: `${row.designation || row.Designation || row.roleName || row.RoleName || '-'}`.trim(),
      paymentMode: `${row.paymentMode || row.PaymentMode || '-'}`.trim(),
      salaryPeriod: startDate && endDate ? `${startDate} - ${endDate}` : startDate || '-',
      grossAmount: Number(row.grossAmount ?? row.GrossAmount ?? 0),
      deductionAmount: Number(row.deductionAmount ?? row.DeductionAmount ?? 0),
      amount: Number(row.netAmount ?? row.NetAmount ?? row.amount ?? row.Amount ?? 0),
      date: this.formatDate(row.createdDate || row.CreatedDate || row.payDate || row.PayDate || row.paidDate || row.PaidDate) || '-',
      rawDate: row.createdDate || row.CreatedDate || row.payDate || row.PayDate || '',
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
          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            font-family: "Segoe UI", Arial, sans-serif;
            margin: 0;
            color: #111827;
            background: #ffffff;
          }

          .print-wrapper {
            width: 100%;
            max-width: 850px;
            margin: auto;
          }

          /* MAIN CARD */
          .psl-card {
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            overflow: hidden;
          }

          /* TITLE */
          .psl-title-bar {
            background: #1e293b;
            color: #fff;
            text-align: center;
            font-size: 16px;
            font-weight: 700;
            padding: 10px;
            letter-spacing: 2px;
          }

          /* EMPLOYEE DETAILS */
          .psl-emp-header {
            padding: 12px 16px;
            border-bottom: 1px solid #e5e7eb;
          }

          .psl-emp-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px 16px;
          }

          .psl-label {
            font-size: 10px;
            color: #6b7280;
            text-transform: uppercase;
          }

          .psl-value {
            font-size: 13px;
            font-weight: 600;
          }

          /* TWO COLUMN */
          .psl-two-col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
            border-bottom: 1px solid #e5e7eb;
          }

          .psl-section {
            padding: 0;
          }

          .psl-earn-section {
            border-right: 1px solid #e5e7eb;
          }

          .psl-section-header {
            font-size: 12px;
            font-weight: 700;
            padding: 8px 12px;
            background: #f1f5f9;
          }

          /* TABLE */
          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            border: 1px solid #e5e7eb;
            padding: 6px 8px;
            font-size: 12px;
          }

          th {
            background: #f8fafc;
            font-weight: 600;
          }

          .psl-right {
            text-align: right;
          }

          /* TOTALS */
          .psl-col-footer {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            font-weight: 700;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            background: #f9fafb;
          }

          /* ADVANCE */
          .psl-advance-block {
            border-top: 1px solid #e5e7eb;
          }

          .psl-advance-header {
            padding: 8px 12px;
            font-weight: 700;
            font-size: 12px;
            background: #fef3c7;
          }

          .psl-adv-footer {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            font-weight: 700;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            background: #fef9c3;
          }

          /* NET PAY */
          .psl-net {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: #111827;
            color: #fff;
          }

          .psl-net-amount {
            font-size: 18px;
            font-weight: 800;
          }

          /* SIGNATURE */
          .psl-sign {
            display: flex;
            justify-content: space-between;
            padding: 20px 30px;
            font-size: 12px;
          }

          .psl-sign-line {
            width: 150px;
            border-bottom: 1px solid #000;
            margin-bottom: 6px;
          }

        </style>
      </head>

      <body onload="window.print(); window.close();">
        <div class="print-wrapper">
          ${content}
        </div>
      </body>
    </html>
  `);

  printWindow?.document.close();
}

  get grossEarnings(): number {
    return this.selectedPayslip?.grossAmount ?? +this.earningsLines.reduce((sum, x) => sum + x.amount, 0).toFixed(2);
  }

  get totalDeductions(): number {
    return this.selectedPayslip?.deductionAmount ?? +this.deductionLines.reduce((sum, x) => sum + x.amount, 0).toFixed(2);
  }

  exportPlaceholder(kind: string): void {
    console.log('Export:', kind);
  }
}
