import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';

interface LeavePolicyRow {
  id: string;
  schoolId: string;
  schoolName: string;
  academicYearId: string;
  academicYearName: string;
  leaveType: string;
  count: number;
  isActive: boolean;
}

@Component({
  selector: 'app-leavedetails',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, ReactiveFormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './leavedetails.component.html',
  styleUrl: './leavedetails.component.css'
})
export class LeavedetailsComponent implements OnInit {
  roleId = sessionStorage.getItem('RollID') || localStorage.getItem('RollID') || '';
  schoolList: Array<{ ID: string; Name: string }> = [];
  academicYearList: Array<{ ID: string; Name: string }> = [];
  readonly currentSchool = sessionStorage.getItem('schoolName') || 'Smart School Campus';
  readonly currentSchoolId =
    sessionStorage.getItem('SchoolID') ||
    sessionStorage.getItem('schoolId') ||
    localStorage.getItem('SchoolID') ||
    localStorage.getItem('schoolId') ||
    '';
  selectedSchoolId = '';
  selectedSchool = this.currentSchool;
  searchTerm = '';
  editingId: string | null = null;

  policyForm = new FormGroup({
    schoolId: new FormControl('0', [Validators.required, Validators.min(1)]),
    academicYearId: new FormControl('0', [Validators.required, Validators.min(1)]),
    leaveType: new FormControl('', [Validators.required, Validators.minLength(2)]),
    count: new FormControl(0, [Validators.required, Validators.min(0)]),
    isActive: new FormControl(true, Validators.required)
  });

  policies: LeavePolicyRow[] = [];
  filteredPolicies: LeavePolicyRow[] = [];

  constructor(private apiurl: ApiServiceService) {}

  ngOnInit(): void {
    this.FetchSchoolsList();
  }

  get isAdmin(): boolean {
    return this.roleId === '1';
  }

  get isEditMode(): boolean {
    return !!this.editingId;
  }

  get totalRecords(): number {
    return this.filteredPolicies.length;
  }

  get activeRecords(): number {
    return this.filteredPolicies.filter(item => item.isActive).length;
  }

  get inactiveRecords(): number {
    return this.filteredPolicies.filter(item => !item.isActive).length;
  }

  toggleChange(): void {
    const currentValue = Boolean(this.policyForm.get('isActive')?.value);
    this.policyForm.get('isActive')?.patchValue(!currentValue);
  }

  applySchoolFilter(event: Event): void {
    this.selectedSchoolId = (event.target as HTMLSelectElement).value;
    this.loadPolicies();
  }

  applySearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.applyFilters();
  }

  editPolicy(policy: LeavePolicyRow): void {
    this.editingId = policy.id;
    const schoolId = policy.schoolId || this.getSchoolIdByName(policy.schoolName);
    if (schoolId) {
      this.FetchAcademicYearsList(schoolId);
    }
    this.policyForm.patchValue({
      schoolId: schoolId || '0',
      academicYearId: policy.academicYearId || '0',
      leaveType: policy.leaveType,
      count: policy.count,
      isActive: policy.isActive
    });
  }

  deletePolicy(policy: LeavePolicyRow): void {
    const payload = {
      ID: policy.id,
      SchoolID: policy.schoolId,
      AcademicYear: policy.academicYearId,
      LeaveType: policy.leaveType,
      MaxDays: String(policy.count),
      Discription: '',
      IsActive: '0',
      Flag: '5'
    };

    this.apiurl.post<any>('Tbl_leavePolicy_CRUD_Operations', payload).subscribe({
      next: () => {
        if (this.editingId === policy.id) {
          this.resetForm();
        }
        this.loadPolicies();
      },
      error: () => {
        window.alert('Unable to delete policy right now. Please try again.');
      }
    });
  }

  submitPolicy(): void {
    if (this.policyForm.invalid) {
      this.policyForm.markAllAsTouched();
      return;
    }
    const schoolId = this.isAdmin
      ? String(this.policyForm.get('schoolId')?.value || '0')
      : this.currentSchoolId;
    const academicYearId = String(this.policyForm.get('academicYearId')?.value || '0');
    const leaveType = String(this.policyForm.get('leaveType')?.value || '').trim();
    const count = Number(this.policyForm.get('count')?.value || 0);
    const isActive = Boolean(this.policyForm.get('isActive')?.value);

    const payload = {
      ID: this.editingId || '',
      SchoolID: schoolId,
      AcademicYear: academicYearId,
      LeaveType: leaveType,
      MaxDays: String(count),
      Discription: '',
      IsActive: isActive ? '1' : '0',
      Flag: this.isEditMode ? '5' : '1'
    };

    this.apiurl.post<any>('Tbl_leavePolicy_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        if (response?.statusCode === 200) {
          this.resetForm();
          this.loadPolicies();
        }
      },
      error: (err: any) => {
        if (err?.status === 400 && err?.error?.message) {
          window.alert(err.error.message);
          return;
        }
        window.alert('Unable to save leave policy right now. Please try again.');
      }
    });
  }

  resetForm(): void {
    this.editingId = null;
    const formSchoolId = this.isAdmin ? '0' : this.currentSchoolId;
    this.policyForm.reset({
      schoolId: formSchoolId || '0',
      academicYearId: '0',
      leaveType: '',
      count: 0,
      isActive: true
    });
  }

  trackByPolicyId(_: number, policy: LeavePolicyRow): string {
    return policy.id;
  }

  private loadPolicies(): void {
    const payload = {
      Flag: '2',
      SchoolID: this.isAdmin ? this.selectedSchoolId || '' : this.currentSchoolId,
      AcademicYear: ''
    };

    this.apiurl.post<any>('Tbl_leavePolicy_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        const rows = Array.isArray(response?.data) ? response.data : [];
        this.policies = rows.map((item: any) => ({
          id: String(item.id ?? item.ID ?? ''),
          schoolId: String(item.schoolID ?? item.SchoolID ?? ''),
          schoolName: String(item.schoolName ?? item.SchoolName ?? ''),
          academicYearId: String(item.academicYear ?? item.AcademicYear ?? ''),
          academicYearName: String(item.academicYearName ?? item.AcademicYearName ?? ''),
          leaveType: String(item.leaveType ?? item.LeaveType ?? ''),
          count: Number(item.maxDays ?? item.MaxDays ?? 0),
          isActive: this.getBooleanValue(item.isActive ?? item.IsActive)
        }));
        this.applyFilters();
      },
      error: () => {
        this.policies = [];
        this.filteredPolicies = [];
      }
    });
  }

  private applyFilters(): void {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();

    this.filteredPolicies = this.policies
      .filter(item => !this.selectedSchoolId || item.schoolId === this.selectedSchoolId)
      .filter(item =>
        !normalizedSearch ||
        item.academicYearName.toLowerCase().includes(normalizedSearch) ||
        item.leaveType.toLowerCase().includes(normalizedSearch)
      );
  }

  onAdminSchoolChange(event: Event): void {
    this.academicYearList = [];
    this.policyForm.get('academicYearId')?.patchValue('0');

    const schoolId = (event.target as HTMLSelectElement).value;
    const selectedFormSchoolId = schoolId === '0' ? '' : schoolId;
    this.selectedSchool = this.getSchoolNameById(selectedFormSchoolId);

    if (selectedFormSchoolId) {
      this.FetchAcademicYearsList(selectedFormSchoolId);
    }
  }

  private FetchSchoolsList(): void {
    const requestData = { Flag: '2' };
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', requestData).subscribe({
      next: (response: any) => {
        this.schoolList = Array.isArray(response?.data)
          ? response.data.map((item: any) => ({
              ID: String(item.id),
              Name: String(item.name)
            }))
          : [];

        if (this.isAdmin) {
          this.selectedSchoolId = '';
          this.policyForm.get('schoolId')?.patchValue('0');
        } else {
          const nonAdminSchoolId = this.currentSchoolId || this.getSchoolIdByName(this.currentSchool);
          this.policyForm.get('schoolId')?.patchValue(nonAdminSchoolId || '0');
          this.selectedSchoolId = nonAdminSchoolId;
          if (nonAdminSchoolId) {
            this.FetchAcademicYearsList(nonAdminSchoolId);
          }
        }

        if (this.isAdmin) {
          this.resetForm();
        }
        this.loadPolicies();
      },
      error: () => {
        this.schoolList = [];
        this.resetForm();
      }
    });
  }

  private FetchAcademicYearsList(schoolId: string): void {
    const requestData = { SchoolID: schoolId || '', Flag: '2' };
    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', requestData).subscribe({
      next: (response: any) => {
        this.academicYearList = Array.isArray(response?.data)
          ? response.data.map((item: any) => ({
              ID: String(item.id),
              Name: String(item.name)
            }))
          : [];

        if (this.academicYearList.length && String(this.policyForm.get('academicYearId')?.value || '0') === '0') {
          this.policyForm.get('academicYearId')?.patchValue(this.academicYearList[0].ID);
        }
      },
      error: () => {
        this.academicYearList = [];
      }
    });
  }

  private getSchoolNameById(id: string): string {
    if (!id) return this.currentSchool;
    return this.schoolList.find(item => item.ID === id)?.Name || this.currentSchool;
  }

  private getSchoolIdByName(name: string): string {
    return this.schoolList.find(item => item.Name === name)?.ID || '';
  }

  private getBooleanValue(value: any): boolean {
    if (value === true || value === 1) {
      return true;
    }
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'active';
    }
    return false;
  }

}
