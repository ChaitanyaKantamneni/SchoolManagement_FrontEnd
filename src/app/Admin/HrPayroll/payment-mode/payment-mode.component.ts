import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';

@Component({
  selector: 'app-payment-mode',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './payment-mode.component.html',
  styleUrl: './payment-mode.component.css'
})
export class PaymentModeComponent implements OnInit {
  constructor(private apiurl: ApiServiceService) {}

  IsAddNewClicked = false;
  isViewModalOpen = false;
  searchQuery = '';
  editIndex: number | null = null;
  viewModeItem: any = null;
  schoolList: any[] = [];
  academicYearList: any[] = [];
  selectedSchoolID = '';
  selectedAcademicYearID = '';

  accountTypes: string[] = ['Personal Account', 'Fees', 'Student', 'Store Sale', 'Staff Salary', 'Staff'];

  form = {
    schoolID: '',
    academicYearID: '',
    paymentModeName: '',
    description: '',
    accountType: '',
    isEnabled: true
  };

  paymentModes: Array<{ paymentModeName: string; accountType: string; description: string; isEnabled: boolean }> = [
    { paymentModeName: 'Cash', accountType: 'Staff Salary', description: 'Cash payout', isEnabled: true },
    { paymentModeName: 'Online', accountType: 'Staff Salary', description: 'Bank transfer', isEnabled: true }
  ];

  get filteredModes(): typeof this.paymentModes {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.paymentModes;
    return this.paymentModes.filter(
      (m) =>
        m.paymentModeName.toLowerCase().includes(q) ||
        m.accountType.toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q)
    );
  }

  get modeCount(): number {
    return this.paymentModes.length;
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
        paymentModeName: '',
        description: '',
        accountType: '',
        isEnabled: true
      };
    }
  }

  toggleEnable(): void {
    this.form.isEnabled = !this.form.isEnabled;
  }

  addPaymentMode(): void {
    if ((this.isAdmin && !this.form.schoolID) || !this.form.academicYearID) return;
    if (!this.form.paymentModeName.trim()) return;

    const payload = {
      paymentModeName: this.form.paymentModeName.trim(),
      accountType: this.form.accountType || 'Staff Salary',
      description: this.form.description.trim(),
      isEnabled: this.form.isEnabled
    };
    if (this.editIndex !== null) {
      this.paymentModes[this.editIndex] = payload;
    } else {
      this.paymentModes.unshift(payload);
    }

    this.IsAddNewClicked = false;
    this.editIndex = null;
    this.form = {
      schoolID: this.selectedSchoolID,
      academicYearID: this.selectedAcademicYearID,
      paymentModeName: '',
      description: '',
      accountType: '',
      isEnabled: true
    };
  }

  editReview(item: any, index: number): void {
    this.editIndex = index;
    this.form = {
      schoolID: this.selectedSchoolID,
      academicYearID: this.selectedAcademicYearID,
      paymentModeName: item.paymentModeName,
      description: item.description || '',
      accountType: item.accountType || '',
      isEnabled: !!item.isEnabled
    };
    this.IsAddNewClicked = true;
  }

  viewReview(item: any): void {
    this.viewModeItem = item;
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewModeItem = null;
  }
}
