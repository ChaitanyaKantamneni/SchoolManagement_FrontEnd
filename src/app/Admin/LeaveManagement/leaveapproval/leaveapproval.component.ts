import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';

@Component({
  selector: 'app-leaveapproval',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, FormsModule, DashboardTopNavComponent],
  templateUrl: './leaveapproval.component.html',
  styleUrl: './leaveapproval.component.css'
})
export class LeaveapprovalComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Leave Approval';

  readonly schoolId =
    sessionStorage.getItem('SchoolID') || sessionStorage.getItem('schoolId') ||
    localStorage.getItem('SchoolID') || localStorage.getItem('schoolId') || '';
  readonly currentUserId =
    sessionStorage.getItem('StaffID') || sessionStorage.getItem('UserID') ||
    localStorage.getItem('StaffID') || localStorage.getItem('UserID') || '';

  protected override get isAdmin(): boolean {
    const roleId = sessionStorage.getItem('RollID') || localStorage.getItem('RollID') || '0';
    return roleId === '1';
  }

  schoolList: Array<{ ID: string; Name: string }> = [];
  availableAcademicYears: Array<{ ID: string; Name: string }> = [];

  selectedSchoolId = '';
  selectedAcademicYearId = '';
  // 'mine' = pending assigned to me (Flag 4), 'all' = all for school/year (Flag 5)
  viewMode: 'mine' | 'all' = 'mine';

  searchTerm = '';
  statusFilter: 'All' | 'Pending' | 'Approved' | 'Rejected' = 'Pending';

  isDetailsModalOpen = false;
  selectedRequest: any = null;
  actionRemarks = '';
  isLoading = false;

  leaveRequests: any[] = [];

  constructor(menuService: MenuServiceService, router: Router, private apiurl: ApiServiceService) {
    super(menuService, router);
  }

  ngOnInit(): void {
    if (this.isAdmin) {
      this.fetchSchoolsList();
    } else {
      this.selectedSchoolId = this.schoolId;
      this.fetchAcademicYears();
    }
  }

  onSchoolChange(event: Event): void {
    this.selectedSchoolId = (event.target as HTMLSelectElement).value;
    this.availableAcademicYears = [];
    this.selectedAcademicYearId = '';
    this.leaveRequests = [];
    if (this.selectedSchoolId) this.fetchAcademicYears();
  }

  onAcademicYearChange(event: Event): void {
    this.selectedAcademicYearId = (event.target as HTMLSelectElement).value;
    if (this.selectedAcademicYearId) this.fetchLeaveRequests();
  }

  onViewModeChange(event: Event): void {
    this.viewMode = (event.target as HTMLSelectElement).value as 'mine' | 'all';
    this.statusFilter = this.viewMode === 'mine' ? 'Pending' : 'All';
    if (this.selectedAcademicYearId) this.fetchLeaveRequests();
  }

  fetchLeaveRequests(): void {
    if (!this.selectedSchoolId || !this.selectedAcademicYearId) return;
    this.isLoading = true;

    // Flag 4 = pending assigned to me, Flag 5 = all for school/year
    const payload: any = {
      Flag: this.viewMode === 'mine' ? '4' : '5',
      SchoolID: this.selectedSchoolId,
      AcademicYear: this.selectedAcademicYearId,
      ActionBy: this.currentUserId,
      Limit: 500,
      Offset: 0
    };

    this.apiurl.post<any>('LeaveManagement', payload).subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.Data) ? res.Data : []);
        this.leaveRequests = list.map((item: any) => ({
          id: String(item.id ?? item.ID ?? ''),
          applicantName: item.applicantName || item.ApplicantName || '-',
          applicantId: item.applicantID || item.ApplicantID || '-',
          leaveType: item.leaveType || item.LeaveType || '-',
          fromDate: item.fromDate || item.FromDate,
          toDate: item.toDate || item.ToDate,
          appliedOn: (item.createdDate || item.CreatedDate || '').split('T')[0],
          reason: item.reason || item.Reason || '-',
          status: item.status || item.Status || 'Pending',
          approvalRemarks: item.approvalRemarks || item.ApprovalRemarks || '',
          currentApproverID: item.currentApproverID || item.CurrentApproverID
        }));
        this.isLoading = false;
      },
      error: () => { this.leaveRequests = []; this.isLoading = false; }
    });
  }

  get filteredRequests(): any[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.leaveRequests.filter(item => {
      const matchesStatus = this.statusFilter === 'All' || item.status === this.statusFilter;
      const matchesSearch =
        !term ||
        item.applicantName?.toLowerCase().includes(term) ||
        item.id?.toLowerCase().includes(term) ||
        item.leaveType?.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }

  get pendingCount(): number { return this.leaveRequests.filter(i => i.status === 'Pending').length; }
  get approvedCount(): number { return this.leaveRequests.filter(i => i.status === 'Approved').length; }
  get rejectedCount(): number { return this.leaveRequests.filter(i => i.status === 'Rejected').length; }

  getStatusClass(status: string): string { return status?.toLowerCase() || 'pending'; }

  openDetails(request: any): void {
    this.selectedRequest = request;
    this.actionRemarks = request.approvalRemarks || '';
    this.isDetailsModalOpen = true;
  }

  closeDetails(): void {
    this.isDetailsModalOpen = false;
    this.selectedRequest = null;
    this.actionRemarks = '';
  }

  approveRequest(request: any): void { this.updateStatus(request, 'Approved'); }
  rejectRequest(request: any): void { this.updateStatus(request, 'Rejected'); }

  private updateStatus(request: any, status: 'Approved' | 'Rejected'): void {
    if (request.status !== 'Pending') return;

    const payload = {
      Flag: '2',
      ID: Number(request.id),
      ActionBy: this.currentUserId,
      Status: status,
      Remarks: this.actionRemarks.trim() || `${status} by approver.`
    };

    this.apiurl.post<any>('LeaveManagement', payload).subscribe({
      next: (res) => {
        if (res.statusCode === 200 || res.StatusCode === 200) {
          request.status = status;
          request.approvalRemarks = payload.Remarks;
          this.closeDetails();
          this.fetchLeaveRequests();
        } else {
          alert(res.message || res.Message || 'Failed to update status.');
        }
      },
      error: () => alert('Error communicating with the server.')
    });
  }

  private fetchSchoolsList(): void {
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (res: any) => {
        this.schoolList = Array.isArray(res?.data)
          ? res.data.map((i: any) => ({ ID: String(i.id ?? i.ID), Name: String(i.name ?? i.Name) })) : [];
      },
      error: () => { this.schoolList = []; }
    });
  }

  private fetchAcademicYears(): void {
    if (!this.selectedSchoolId) return;
    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', { SchoolID: this.selectedSchoolId, Flag: '2' }).subscribe({
      next: (res: any) => {
        const years = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.Data) ? res.Data : []);
        this.availableAcademicYears = years.map((i: any) => ({
          ID: String(i.id ?? i.ID ?? ''),
          Name: String(i.name ?? i.Name ?? '')
        }));
        if (this.availableAcademicYears.length > 0) {
          this.selectedAcademicYearId = this.availableAcademicYears[0].ID;
          this.fetchLeaveRequests();
        }
      },
      error: () => { this.availableAcademicYears = []; }
    });
  }
}
