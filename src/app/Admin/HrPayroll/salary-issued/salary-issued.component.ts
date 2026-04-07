import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';

type SalaryIssuedRow = {
  staffId?: string;
  staffName: string;
  designation: string;
  paymentMode: string;
  salaryPeriod: string;
  amount: number;
  date: string;
};

@Component({
  selector: 'app-salary-issued',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './salary-issued.component.html',
  styleUrl: './salary-issued.component.css'
})
export class SalaryIssuedComponent implements OnInit {
  constructor(private apiurl: ApiServiceService) {}

  searchQuery = '';
  isPayslipOpen = false;
  selectedPayslip: SalaryIssuedRow | null = null;
  schoolList: any[] = [];
  academicYearList: any[] = [];
  selectedSchoolID = '';
  selectedAcademicYearID = '';

  salaryIssued: SalaryIssuedRow[] = [
    { staffId: 'STF-001', staffName: 'Anu A S', designation: 'Teaching Staff', paymentMode: 'Cash', salaryPeriod: '01-02-2026 - 28-02-2026', amount: 10000, date: '25-03-2026' },
    { staffId: 'STF-002', staffName: 'Arvind S', designation: 'Driver', paymentMode: 'Cash', salaryPeriod: '01-02-2026 - 28-02-2026', amount: 8500, date: '17-03-2026' },
    { staffId: 'STF-003', staffName: 'Anju B V', designation: 'Teaching Staff', paymentMode: 'Online', salaryPeriod: '01-02-2026 - 28-02-2026', amount: 20000, date: '07-01-2026' }
  ];

  get filteredRows(): SalaryIssuedRow[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.salaryIssued;
    return this.salaryIssued.filter(
      (row) =>
        row.staffName.toLowerCase().includes(q) ||
        row.designation.toLowerCase().includes(q) ||
        row.paymentMode.toLowerCase().includes(q) ||
        row.salaryPeriod.toLowerCase().includes(q)
    );
  }

  get issuedCount(): number {
    return this.salaryIssued.length;
  }

  get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  ngOnInit(): void {
    if (this.isAdmin) {
      this.FetchSchoolsList();
    } else {
      this.selectedSchoolID =
        sessionStorage.getItem('SchoolID') ||
        sessionStorage.getItem('schoolID') ||
        sessionStorage.getItem('schoolId') ||
        '';
      this.FetchAcademicYearsList();
    }
  }

  FetchSchoolsList() {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (response: any) => {
        this.schoolList = Array.isArray(response?.data)
          ? response.data.map((item: any) => ({ ID: item.id, Name: item.name }))
          : [];
      },
      error: () => (this.schoolList = [])
    });
  }

  FetchAcademicYearsList() {
    this.apiurl
      .post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: this.selectedSchoolID || '', Flag: '2' })
      .subscribe({
        next: (response: any) => {
          this.academicYearList = Array.isArray(response?.data)
            ? response.data.map((item: any) => ({ ID: item.id, Name: item.name }))
            : [];
        },
        error: () => (this.academicYearList = [])
      });
  }

  onAdminSchoolChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedSchoolID = target.value === '0' ? '' : target.value;
    this.selectedAcademicYearID = '';
    this.FetchAcademicYearsList();
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
            * { box-sizing: border-box; }
            body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; padding: 18px; color: #111827; }
            .print-payslip { border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; }
            .print-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px; }
            .print-title { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: .3px; }
            .print-sub { margin: 3px 0 0; font-size: 12px; color: #475569; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-bottom: 12px; }
            .meta-item { font-size: 12px; }
            .meta-item span { color: #64748b; display: inline-block; min-width: 110px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; font-weight: 600; }
            .totals { margin-top: 10px; margin-left: auto; width: 280px; }
            .totals-row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; }
            .net { border-top: 1px solid #94a3b8; margin-top: 4px; padding-top: 6px; font-weight: 700; font-size: 14px; }
            .sign { margin-top: 26px; display: flex; justify-content: space-between; font-size: 12px; color: #475569; }
          </style>
        </head>
        <body onload="window.print(); window.close();"><div class="print-payslip">${content}</div></body>
      </html>
    `);
    printWindow?.document.close();
  }

  get basicSalary(): number {
    if (!this.selectedPayslip) return 0;
    return +(this.selectedPayslip.amount * 0.75).toFixed(2);
  }

  get hra(): number {
    if (!this.selectedPayslip) return 0;
    return +(this.selectedPayslip.amount * 0.15).toFixed(2);
  }

  get allowances(): number {
    if (!this.selectedPayslip) return 0;
    return +(this.selectedPayslip.amount * 0.10).toFixed(2);
  }

  get grossEarnings(): number {
    return +(this.basicSalary + this.hra + this.allowances).toFixed(2);
  }

  get pfDeduction(): number {
    return +(this.basicSalary * 0.12).toFixed(2);
  }

  get professionalTax(): number {
    return this.selectedPayslip ? 200 : 0;
  }

  get totalDeductions(): number {
    return +(this.pfDeduction + this.professionalTax).toFixed(2);
  }

  exportPlaceholder(kind: string): void {
    console.log('Export:', kind);
  }
}
