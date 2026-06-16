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
    if (!this.isAdmin) {
      this.policyForm.get('academicYearId')?.disable({ emitEvent: false });
    }
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
  
  // Pagination properties (exactly like ExamType)
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  
  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
  lastCreatedDate: string | null = null;
  lastID: number | null = null;
  
  sortColumn: string = 'CreatedDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  policyForm = new FormGroup({
    schoolId: new FormControl('', Validators.required),
    academicYearId: new FormControl(sessionStorage.getItem('ActiveAcademicYearID') || '', Validators.required),
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
      academicYearId: sessionStorage.getItem('ActiveAcademicYearID') || '',
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

    if (!this.isAdmin) {
      payload.AcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
    }

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

  FetchInitialData(extra: any = {}) {
    const isSearch = !!this.searchQuery?.trim();
    const flag = isSearch ? '7' : '2';
    
    let SchoolIdSelected = '';
    if (this.selectedSchoolID && this.selectedSchoolID !== '0') {
      SchoolIdSelected = this.selectedSchoolID;
    }
    
    const cursor = !extra.offset && this.currentPage > 1
      ? this.pageCursors[this.currentPage - 2] || null
      : null;
    
    this.loader.show();
    
    this.FetchPolicyCount(isSearch).subscribe({
      next: (countResp: any) => {
        this.PolicyCount = countResp?.data?.[0]?.totalcount ?? 0;
        
        const payload: any = {
          Flag: flag,
          Limit: this.pageSize,
          SortDirection: this.sortDirection,
          LastCreatedDate: cursor?.lastCreatedDate ?? null,
          LastID: cursor?.lastID ?? null,
          SchoolID: SchoolIdSelected || (this.isAdmin ? '' : this.currentSchoolId),
          AcademicYear: '',
          LeaveType: isSearch ? this.searchQuery.trim() : null,
          ...extra
        };

        if (!this.isAdmin) {
          payload.AcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
        }
        
        this.apiurl.post<any>('Tbl_leavePolicy_CRUD_Operations', payload).subscribe({
          next: (response: any) => {
            const data = response?.data || [];
            this.mapPolicies(response);
            
            if (data.length > 0 && !this.pageCursors[this.currentPage - 1]) {
              const lastRow = data[data.length - 1];
              this.pageCursors[this.currentPage - 1] = {
                lastCreatedDate: lastRow.createdDate,
                lastID: Number(lastRow.id)
              };
            }
            
            this.loader.hide();
          },
          error: () => {
            this.PolicyList = [];
            this.PolicyCount = 0;
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.PolicyList = [];
        this.PolicyCount = 0;
        this.loader.hide();
      }
    });
  }
  
  loadPolicies(): void {
    this.currentPage = 1;
    this.pageCursors = [];
    this.FetchInitialData();
  }

  mapPolicies(response: any) {
    this.PolicyList = (response.data || []).map((item: any) => ({
      id: String(item.id ?? item.ID ?? ''),
      schoolId: String(item.schoolID ?? item.SchoolID ?? ''),
      schoolName: String(item.schoolName ?? item.SchoolName ?? ''),
      academicYearId: String(item.academicYear ?? item.AcademicYear ?? ''),
      academicYearName: String(item.academicYearName ?? item.AcademicYearName ?? ''),
      leaveType: String(item.leaveType ?? item.LeaveType ?? ''),
      count: Number(item.maxDays ?? item.MaxDays ?? 0),
      isActive: this.getBooleanValue(item.isActive ?? item.IsActive),
      createdDate: item.createdDate || item.CreatedDate
    }));
  }
  
  FetchPolicyCount(isSearch: boolean) {
    let SchoolIdSelected = '';
    if (this.selectedSchoolID && this.selectedSchoolID !== '0') {
      SchoolIdSelected = this.selectedSchoolID;
    }
    
    const payload: any = {
      Flag: isSearch ? '8' : '6',
      SchoolID: SchoolIdSelected || (this.isAdmin ? '' : this.currentSchoolId),
      AcademicYear: '',
      LeaveType: isSearch ? this.searchQuery.trim() : null
    };

    if (!this.isAdmin) {
      payload.AcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
    }

    return this.apiurl.post<any>('Tbl_leavePolicy_CRUD_Operations', payload);
  }
  
  onSearchChange() {
    clearTimeout(this.searchTimer);
    
    this.searchTimer = setTimeout(() => {
      const value = this.searchQuery?.trim() || '';
      
      if (value.length === 0) {
        this.currentPage = 1;
        this.pageSize = 5;
        this.visiblePageCount = 3;
        this.pageCursors = [];
        this.FetchInitialData();
        return;
      }
      
      if (value.length < this.SEARCH_MIN_LENGTH) {
        return;
      }
      
      this.currentPage = 1;
      this.pageSize = 5;
      this.visiblePageCount = 3;
      this.pageCursors = [];
      this.FetchInitialData();
      
    }, 300);
  }
  
  onSchoolChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if (schoolID == "0") {
      this.selectedSchoolID = "";
    } else {
      this.selectedSchoolID = schoolID;
    }
    this.loadPolicies();
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
    this.policyForm.get('academicYearId')?.patchValue(sessionStorage.getItem('ActiveAcademicYearID') || '');
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
  
  // Pagination methods (exactly like ExamType)
  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }
  
  nextPage() {
    if (this.currentPage < this.totalPages()) {
      this.goToPage(this.currentPage + 1);
    }
  }
  
  firstPage() {
    this.goToPage(1);
  }
  
  lastPage() {
    this.goToPage(this.totalPages());
  }
  
  goToPage(pageNumber: number) {
    const total = this.totalPages();
    
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > total) pageNumber = total;
    
    this.currentPage = pageNumber;
    
    const isBoundaryPage =
      pageNumber === 1 ||
      pageNumber === total ||
      !this.pageCursors[pageNumber - 2];
    
    if (isBoundaryPage) {
      const offset = (pageNumber - 1) * this.pageSize;
      this.FetchInitialData({ offset });
    } else {
      this.FetchInitialData();
    }
  }
  
    pageStartIndex(): number {
      return this.PolicyCount === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
    }

    pageEndIndex(): number {
      return Math.min(this.currentPage * this.pageSize, this.PolicyCount);
    }

    onRowsCountChange() {
      this.currentPage = 1;
      this.pageCursors = [];
      this.loadPolicies();
    }

    totalPages() {
      return Math.ceil(this.PolicyCount / this.pageSize);
    }

    getVisiblePageNumbers() {
      const totalPages = this.totalPages();
      const pages = [];
      let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
      let end = Math.min(start + this.visiblePageCount - 1, totalPages);
      if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    }
}
