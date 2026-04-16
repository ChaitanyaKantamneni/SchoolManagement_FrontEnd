import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { Router } from '@angular/router';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { LoaderService } from '../../../Services/loader.service';

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
  imports: [NgIf, NgFor, NgClass, NgStyle, ReactiveFormsModule, FormsModule, MatIconModule, DashboardTopNavComponent],
  templateUrl: './leavedetails.component.html',
  styleUrl: './leavedetails.component.css'
})
export class LeavedetailsComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Leave Policy';

  constructor(
    private apiurl: ApiServiceService,
    private mService: MenuServiceService,
    private rtr: Router,
    public loader: LoaderService
  ) {
    super(mService, rtr);
  }

  ngOnInit(): void {
    this.checkViewPermission();
    this.FetchSchoolsList();
  }

  // ── state (Aligned with Buses) ────────────────────────────────────────────────
  roleId = sessionStorage.getItem('RollID') || localStorage.getItem('RollID') || '';
  schoolList: Array<{ ID: string; Name: string }> = [];
  academicYearList: Array<{ ID: string; Name: string }> = [];
  
  readonly currentSchoolId = sessionStorage.getItem('SchoolID') || sessionStorage.getItem('schoolId') || localStorage.getItem('SchoolID') || localStorage.getItem('schoolId') || '';

  IsAddNewClicked: boolean = false;
  IsActiveStatus: boolean = true;
  ViewSyllabusClicked: boolean = false;
  
  PolicyList: LeavePolicyRow[] = [];
  filteredPolicies: LeavePolicyRow[] = [];
  PolicyCount: number = 0;
  
  searchQuery: string = '';
  selectedSchoolID: string = '';
  
  AminityInsStatus: string = '';
  isModalOpen: boolean = false;
  isViewModalOpen: boolean = false;
  viewPolicy: any = null;
  
  editingId: string | null = null;
  selectedAdminSchoolID: string = '';

  policyForm = new FormGroup({
    schoolId: new FormControl('', Validators.required),
    academicYearId: new FormControl('', Validators.required),
    leaveType: new FormControl('', [Validators.required, Validators.minLength(2)]),
    count: new FormControl(0, [Validators.required, Validators.min(1)]),
    isActive: new FormControl(true)
  });

  protected override get isAdmin(): boolean {
    return this.roleId === '1';
  }

  // ── actions ───────────────────────────────────────────────────────────────────
  toggleChange(): void {
    this.IsActiveStatus = !this.IsActiveStatus;
  }

  AddNewClicked(): void {
    this.editingId = null;
    this.selectedAdminSchoolID = '';
    this.IsActiveStatus = true;
    this.ViewSyllabusClicked = false;
    this.policyForm.reset({
      schoolId: this.isAdmin ? '' : this.currentSchoolId,
      academicYearId: '',
      leaveType: '',
      count: 0,
      isActive: true
    });
    
    if (!this.isAdmin && this.currentSchoolId) {
       this.FetchAcademicYearsList(this.currentSchoolId);
    }

    this.IsAddNewClicked = !this.IsAddNewClicked;
  }

  editreview(PolicyID: string): void {
    this.FetchPolicyDetByID(PolicyID, 'edit');
  }

  viewReview(PolicyID: string): void {
    this.FetchPolicyDetByID(PolicyID, 'view');
  }

  FetchPolicyDetByID(PolicyID: string, mode: 'view' | 'edit') {
    const policy = this.PolicyList.find(p => p.id === PolicyID);
    if (!policy) return;

    if (mode === 'view') {
      this.viewPolicy = { ...policy };
      this.isViewModalOpen = true;
    }

    if (mode === 'edit') {
      this.editingId = policy.id;
      this.selectedAdminSchoolID = policy.schoolId;
      this.FetchAcademicYearsList(this.selectedAdminSchoolID);
      
      this.policyForm.patchValue({
        schoolId: policy.schoolId,
        academicYearId: policy.academicYearId,
        leaveType: policy.leaveType,
        count: policy.count,
        isActive: policy.isActive
      });
      this.IsActiveStatus = policy.isActive;
      this.IsAddNewClicked = true;
      this.ViewSyllabusClicked = true;
    }
  }

  SubmitSyllabus(): void {
    this.savePolicy('1');
  }

  UpdateSyllabus(): void {
    this.savePolicy('5');
  }

  private savePolicy(flag: string): void {
    if (this.policyForm.invalid) {
      this.policyForm.markAllAsTouched();
      this.AminityInsStatus = 'Please fill all required fields correctly.';
      this.isModalOpen = true;
      return;
    }

    const payload = {
      ID: this.editingId || '0',
      SchoolID: String(this.policyForm.get('schoolId')?.value),
      AcademicYear: String(this.policyForm.get('academicYearId')?.value),
      LeaveType: String(this.policyForm.get('leaveType')?.value).trim(),
      MaxDays: String(this.policyForm.get('count')?.value),
      Discription: '',
      IsActive: this.IsActiveStatus ? '1' : '0',
      Flag: flag
    };

    this.loader.show();
    this.apiurl.post<any>('Tbl_leavePolicy_CRUD_Operations', payload).subscribe({
      next: (res: any) => {
        this.loader.hide();
        if (res?.statusCode === 200 || res?.StatusCode === 200) {
          this.AminityInsStatus = flag === '1' ? 'Leave Policy Submitted Successfully!' : 'Leave Policy Updated Successfully!';
          this.isModalOpen = true;
          this.IsAddNewClicked = false;
          this.loadPolicies();
        } else {
          this.AminityInsStatus = res?.message || 'Error occurred while saving.';
          this.isModalOpen = true;
        }
      },
      error: (err) => {
        this.loader.hide();
        this.AminityInsStatus = err?.error?.message || 'API Error.';
        this.isModalOpen = true;
      }
    });
  }

  loadPolicies(): void {
    this.loader.show();
    const payload = {
      Flag: '2',
      SchoolID: this.isAdmin ? (this.selectedSchoolID || '') : this.currentSchoolId,
      AcademicYear: ''
    };

    this.apiurl.post<any>('Tbl_leavePolicy_CRUD_Operations', payload).subscribe({
      next: (response: any) => {
        this.loader.hide();
        const rows = Array.isArray(response?.data) ? response.data : (Array.isArray(response?.Data) ? response.Data : []);
        this.PolicyList = rows.map((item: any) => ({
          id: String(item.id ?? item.ID ?? ''),
          schoolId: String(item.schoolID ?? item.SchoolID ?? ''),
          schoolName: String(item.schoolName ?? item.SchoolName ?? ''),
          academicYearId: String(item.academicYear ?? item.AcademicYear ?? ''),
          academicYearName: String(item.academicYearName ?? item.AcademicYearName ?? ''),
          leaveType: String(item.leaveType ?? item.LeaveType ?? ''),
          count: Number(item.maxDays ?? item.MaxDays ?? 0),
          isActive: this.getBooleanValue(item.isActive ?? item.IsActive)
        }));
        this.PolicyCount = this.PolicyList.length;
        this.applyFilters();
      },
      error: () => {
        this.loader.hide();
        this.PolicyList = [];
        this.filteredPolicies = [];
      }
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onSchoolChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedSchoolID = val === '0' ? '' : val;
    this.loadPolicies();
  }

  applyFilters(): void {
    const term = this.searchQuery.trim().toLowerCase();
    this.filteredPolicies = this.PolicyList.filter(p => {
      const matchSearch = !term || p.leaveType.toLowerCase().includes(term) || p.academicYearName.toLowerCase().includes(term);
      const matchSchool = !this.selectedSchoolID || p.schoolId === this.selectedSchoolID;
      return matchSearch && matchSchool;
    });
  }

  handleOk() {
    this.isModalOpen = false;
  }

  closeModal(type: 'view' | 'status') {
    if (type === 'view') this.isViewModalOpen = false;
    if (type === 'status') this.isModalOpen = false;
  }

  // Form Field Change Handlers
  onAdminSchoolChange(event: Event): void {
    const schoolId = (event.target as HTMLSelectElement).value;
    this.academicYearList = [];
    this.policyForm.get('academicYearId')?.patchValue('');
    if (schoolId && schoolId !== '0') {
      this.FetchAcademicYearsList(schoolId);
    }
  }

  private FetchSchoolsList(): void {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (res: any) => {
        this.schoolList = Array.isArray(res?.data) ? res.data.map((i: any) => ({ ID: String(i.id), Name: String(i.name) })) : [];
        if (!this.isAdmin && this.currentSchoolId) {
          this.FetchAcademicYearsList(this.currentSchoolId);
        }
        this.loadPolicies();
      }
    });
  }

  private FetchAcademicYearsList(schoolId: string): void {
    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: schoolId, Flag: '2' }).subscribe({
      next: (res: any) => {
        this.academicYearList = Array.isArray(res?.data) ? res.data.map((i: any) => ({ ID: String(i.id), Name: String(i.name) })) : [];
      }
    });
  }

  private getBooleanValue(val: any): boolean {
    if (val === true || val === 1 || val === '1' || val === 'active') return true;
    return false;
  }
}
