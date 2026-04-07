import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';

@Component({
  selector: 'app-payroll-head',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './payroll-head.component.html',
  styleUrl: './payroll-head.component.css'
})
export class PayrollHeadComponent implements OnInit {
  constructor(private apiurl: ApiServiceService) {}

  IsAddNewClicked = false;
  isViewModalOpen = false;
  searchQuery = '';
  editIndex: number | null = null;
  viewHead: any = null;
  schoolList: any[] = [];
  academicYearList: any[] = [];
  selectedSchoolID = '';
  selectedAcademicYearID = '';

  form = {
    schoolID: '',
    academicYearID: '',
    payHeadName: '',
    description: '',
    headType: 'Addition',
    isEnabled: true
  };

  headTypes: string[] = ['Addition', 'Deduction'];

  payrollHeads: Array<{ payHeadName: string; headType: string; description: string; isEnabled: boolean }> = [
    { payHeadName: 'Basic Salary', headType: 'Addition', description: 'Base monthly salary', isEnabled: true },
    { payHeadName: 'LOP', headType: 'Deduction', description: 'Loss of pay deduction', isEnabled: true },
    { payHeadName: 'Advance Salary EMI', headType: 'Deduction', description: 'Advance salary recovery', isEnabled: true }
  ];

  get filteredHeads(): typeof this.payrollHeads {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.payrollHeads;
    return this.payrollHeads.filter(
      (h) =>
        h.payHeadName.toLowerCase().includes(q) ||
        h.headType.toLowerCase().includes(q) ||
        (h.description || '').toLowerCase().includes(q)
    );
  }

  get headCount(): number {
    return this.payrollHeads.length;
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
      this.form.schoolID = this.selectedSchoolID;
      this.FetchAcademicYearsList();
    }
  }

  FetchSchoolsList() {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (response: any) => {
        if (response && Array.isArray(response.data)) {
          this.schoolList = response.data.map((item: any) => ({
            ID: item.id,
            Name: item.name
          }));
        } else {
          this.schoolList = [];
        }
      },
      error: () => {
        this.schoolList = [];
      }
    });
  }

  FetchAcademicYearsList() {
    this.apiurl
      .post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: this.selectedSchoolID || '', Flag: '2' })
      .subscribe({
        next: (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.academicYearList = response.data.map((item: any) => ({
              ID: item.id,
              Name: item.name
            }));
          } else {
            this.academicYearList = [];
          }
        },
        error: () => {
          this.academicYearList = [];
        }
      });
  }

  onAdminSchoolChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedSchoolID = target.value === '0' ? '' : target.value;
    this.selectedAcademicYearID = '';
    this.form.schoolID = this.selectedSchoolID;
    this.form.academicYearID = '';
    this.FetchAcademicYearsList();
  }

  AddNewClicked(): void {
    this.IsAddNewClicked = !this.IsAddNewClicked;
    if (this.IsAddNewClicked) {
      this.editIndex = null;
      this.form = {
        schoolID: this.selectedSchoolID,
        academicYearID: this.selectedAcademicYearID,
        payHeadName: '',
        description: '',
        headType: 'Addition',
        isEnabled: true
      };
    }
  }

  toggleEnable(): void {
    this.form.isEnabled = !this.form.isEnabled;
  }

  addHead(): void {
    if ((this.isAdmin && !this.form.schoolID) || !this.form.academicYearID) {
      return;
    }
    if (!this.form.payHeadName.trim()) {
      return;
    }

    const payload = {
      payHeadName: this.form.payHeadName.trim(),
      headType: this.form.headType,
      description: this.form.description.trim(),
      isEnabled: this.form.isEnabled
    };
    if (this.editIndex !== null) {
      this.payrollHeads[this.editIndex] = payload;
    } else {
      this.payrollHeads.unshift(payload);
    }

    this.IsAddNewClicked = false;
    this.editIndex = null;
    this.form = {
      schoolID: this.selectedSchoolID,
      academicYearID: this.selectedAcademicYearID,
      payHeadName: '',
      description: '',
      headType: 'Addition',
      isEnabled: true
    };
  }

  editReview(item: any, index: number): void {
    this.editIndex = index;
    this.form = {
      schoolID: this.selectedSchoolID,
      academicYearID: this.selectedAcademicYearID,
      payHeadName: item.payHeadName,
      description: item.description || '',
      headType: item.headType,
      isEnabled: !!item.isEnabled
    };
    this.IsAddNewClicked = true;
  }

  viewReview(item: any): void {
    this.viewHead = item;
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewHead = null;
  }
}
