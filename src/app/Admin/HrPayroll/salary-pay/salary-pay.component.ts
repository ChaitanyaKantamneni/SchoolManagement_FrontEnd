import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { LoaderService } from '../../../Services/loader.service';

@Component({
  selector: 'app-salary-pay',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './salary-pay.component.html',
  styleUrl: './salary-pay.component.css'
})
export class SalaryPayComponent implements OnInit {
  constructor(private apiurl: ApiServiceService, public loader: LoaderService) {}

  staffList: string[] = ['Select', 'Priyanka R', 'Anu A S', 'Arvind S'];
  paymentModes: string[] = ['Select', 'Cash', 'Cheque', 'Online'];
  schoolList: any[] = [];
  academicYearList: any[] = [];
  selectedSchoolID = '';
  selectedAcademicYearID = '';

  form = {
    staffName: 'Select',
    paymentMode: 'Select',
    startDate: '',
    endDate: ''
  };

  salaryDetails: { gross: number; deduction: number; net: number } | null = null;

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

  getSalaryDetails(): void {
    if ((this.isAdmin && !this.selectedSchoolID) || !this.selectedAcademicYearID) {
      this.salaryDetails = null;
      return;
    }
    if (
      this.form.staffName === 'Select' ||
      this.form.paymentMode === 'Select' ||
      !this.form.startDate ||
      !this.form.endDate
    ) {
      this.salaryDetails = null;
      return;
    }

    this.salaryDetails = { gross: 30000, deduction: 5500, net: 24500 };
  }

  paySalary(): void {
    if (!this.salaryDetails) return;
    console.log('Salary paid', this.form, this.salaryDetails);
  }
}
