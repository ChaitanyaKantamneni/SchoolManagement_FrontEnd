import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { LoaderService } from '../../../Services/loader.service';

type SalaryHeadLine = {
  payHead: string;
  enabled: boolean;
  amount: number | null;
};

@Component({
  selector: 'app-salary-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './salary-settings.component.html',
  styleUrl: './salary-settings.component.css'
})
export class SalarySettingsComponent implements OnInit {
  constructor(private apiurl: ApiServiceService, public loader: LoaderService) {}

  IsAddNewClicked = false;
  isViewModalOpen = false;
  searchQuery = '';
  viewRow: any = null;
  schoolList: any[] = [];
  academicYearList: any[] = [];
  selectedSchoolID = '';
  selectedAcademicYearID = '';

  staffList: string[] = ['Priyanka R', 'Anu A S', 'Arvind S'];
  selectedStaff = 'Priyanka R';

  savedRows: Array<{ staff: string; headsCount: number }> = [
    { staff: 'Priyanka R', headsCount: 6 },
    { staff: 'Anu A S', headsCount: 5 }
  ];

  salaryHeads: SalaryHeadLine[] = [
    { payHead: 'Basic Salary', enabled: true, amount: 25000 },
    { payHead: 'LOP', enabled: true, amount: 0 },
    { payHead: 'DA', enabled: true, amount: 3500 },
    { payHead: 'EMI', enabled: true, amount: 1500 },
    { payHead: 'Advance Salary Deduction', enabled: true, amount: 0 },
    { payHead: 'Misc', enabled: false, amount: null }
  ];

  get filteredSaved(): typeof this.savedRows {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.savedRows;
    return this.savedRows.filter((r) => r.staff.toLowerCase().includes(q));
  }

  AddNewClicked(): void {
    this.IsAddNewClicked = !this.IsAddNewClicked;
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
    this.FetchAcademicYearsList();
  }

  saveSettings(): void {
    if ((this.isAdmin && !this.selectedSchoolID) || !this.selectedAcademicYearID) {
      return;
    }
    const idx = this.savedRows.findIndex((r) => r.staff === this.selectedStaff);
    if (idx >= 0) {
      this.savedRows[idx] = { staff: this.selectedStaff, headsCount: this.salaryHeads.filter((h) => h.enabled).length };
    } else {
      this.savedRows.unshift({
        staff: this.selectedStaff,
        headsCount: this.salaryHeads.filter((h) => h.enabled).length
      });
    }
    this.IsAddNewClicked = false;
  }

  onLineEnabledChange(line: SalaryHeadLine): void {
    if (!line.enabled) {
      line.amount = null;
    }
  }

  editReview(row: any): void {
    this.selectedStaff = row.staff;
    this.IsAddNewClicked = true;
  }

  viewReview(row: any): void {
    this.viewRow = row;
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewRow = null;
  }
}
