import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule, MatTabChangeEvent } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';

import { LeaveService } from '../../../Services/leave.service';
import { LoaderService } from '../../../Services/loader.service';
import { 
  LeaveApplication, 
  LeaveType, 
  LeaveStatus,
  LeaveFilter,
  LeaveStatistics 
} from '../../../models/leave.models';

@Component({
  selector: 'app-student-leave-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatBadgeModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
  templateUrl: './student-leave-management.component.html',
  styleUrls: ['./student-leave-management.component.css']
})
/**
 * Class Responsibility: Handles view logic and user interactions for StudentLeaveManagementComponent.
 */
export class StudentLeaveManagementComponent implements OnInit {
  // Tab Management
  selectedTab = 0;
  
  // Form for filtering
  filterForm!: FormGroup;
  
  // Data
  allLeaves: LeaveApplication[] = [];
  pendingLeaves: LeaveApplication[] = [];
  displayedColumns: string[] = [
    'studentName', 'className', 'leaveType', 'fromDate', 'toDate', 
    'totalDays', 'appliedDate', 'status', 'actions'
  ];
  
  // Statistics
  statistics: LeaveStatistics = {
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    currentMonthApplications: 0
  };
  
  // Filters
  leaveTypes = Object.values(LeaveType);
  leaveStatuses = Object.values(LeaveStatus);
  classes: any[] = [];
  divisions: any[] = [];
  students: any[] = [];
  
  // Session Data
  schoolId = '';
  schoolName = '';
  academicYear = '';
  currentUser = '';
  
  // Loading States
  isLoading = false;
  isProcessing = false;

  constructor(
    private fb: FormBuilder,
    private leaveService: LeaveService,
    private loaderService: LoaderService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe
  ) {
    this.initializeFilterForm();
  }

  /**
   * Lifecycle hook: Initializes component parameters and loads default page datasets.
   */
  ngOnInit(): void {
    this.initializeSessionData();
    this.loadInitialData();
  }

  /**
   * Executes the operation: initializeSessionData
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private initializeSessionData(): void {
    this.schoolId = sessionStorage.getItem('SchoolID') || '';
    this.schoolName = sessionStorage.getItem('SchoolName') || '';
    this.academicYear = sessionStorage.getItem('AcademicYear') || '';
    this.currentUser = sessionStorage.getItem('UserName') || sessionStorage.getItem('email') || '';
  }

  /**
   * Executes the operation: initializeFilterForm
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private initializeFilterForm(): void {
    this.filterForm = this.fb.group({
      status: [''],
      leaveType: [''],
      classId: [''],
      divisionId: [''],
      studentId: [''],
      fromDate: [''],
      toDate: ['']
    });
  }

  /**
   * Executes the operation: loadInitialData
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private loadInitialData(): void {
    this.loadStatistics();
    this.loadPendingLeaves();
    this.loadAllLeaves();
    this.loadMasterData();
  }

  /**
   * Executes the operation: loadStatistics
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private loadStatistics(): void {
    this.leaveService.getLeaveStatistics(this.schoolId, this.academicYear).subscribe({
      next: (response: any) => {
        if (response?.data?.[0]) {
          this.statistics = {
            totalApplications: response.data[0].totalApplications || 0,
            pendingApplications: response.data[0].pendingApplications || 0,
            approvedApplications: response.data[0].approvedApplications || 0,
            rejectedApplications: response.data[0].rejectedApplications || 0,
            currentMonthApplications: response.data[0].currentMonthApplications || 0
          };
        }
      },
      error: (error: any) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  /**
   * Executes the operation: loadPendingLeaves
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private loadPendingLeaves(): void {
    this.isLoading = true;
    this.leaveService.getPendingLeaves(this.schoolId, this.academicYear).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response?.data && Array.isArray(response.data)) {
          this.pendingLeaves = this.mapLeaveData(response.data);
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Error loading pending leaves:', error);
      }
    });
  }

  /**
   * Executes the operation: loadAllLeaves
   * Parameters: filter?: LeaveFilter
   * Rationale: Standard operational controller for the active view.
   */
  private loadAllLeaves(filter?: LeaveFilter): void {
    this.isLoading = true;
    this.leaveService.getAllLeaves(this.schoolId, this.academicYear, filter).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response?.data && Array.isArray(response.data)) {
          this.allLeaves = this.mapLeaveData(response.data);
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Error loading all leaves:', error);
      }
    });
  }

  /**
   * Executes the operation: mapLeaveData
   * Parameters: data: any[]
   * Rationale: Standard operational controller for the active view.
   */
  private mapLeaveData(data: any[]): LeaveApplication[] {
    return data.map((item: any) => ({
      id: item.id,
      studentId: item.studentID,
      studentName: item.studentName,
      parentId: item.parentID,
      parentEmail: item.parentEmail,
      schoolId: item.schoolID,
      academicYear: item.academicYear,
      classId: item.classID,
      className: item.className,
      divisionId: item.divisionID,
      divisionName: item.divisionName,
      leaveType: item.leaveType,
      fromDate: item.fromDate,
      toDate: item.toDate,
      totalDays: item.totalDays,
      reason: item.reason,
      status: item.status,
      appliedDate: item.appliedDate,
      approvedDate: item.approvedDate,
      approvedBy: item.approvedBy,
      rejectedDate: item.rejectedDate,
      rejectedBy: item.rejectedBy,
      rejectionReason: item.rejectionReason,
      attachment: item.attachment || undefined,
      attachmentName: item.attachmentName || undefined,
      schoolName: item.schoolName
    }));
  }

  /**
   * Executes the operation: loadMasterData
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private loadMasterData(): void {
    // Load classes, divisions, and students for filters
    // This would typically call your existing master data services
    // For now, we'll keep it simple
  }

  // Tab Management
  onTabChange(event: MatTabChangeEvent): void {
    this.selectedTab = event.index;
    if (event.index === 1) { // All leaves tab
      this.loadAllLeaves();
    }
  }

  // Filter Operations
  applyFilters(): void {
    const filterValues = this.filterForm.value;
    const filter: LeaveFilter = {
      status: filterValues.status || undefined,
      leaveType: filterValues.leaveType || undefined,
      classId: filterValues.classId || undefined,
      studentId: filterValues.studentId || undefined,
      fromDate: filterValues.fromDate ? (this.datePipe.transform(filterValues.fromDate, 'yyyy-MM-dd') || undefined) : undefined,
      toDate: filterValues.toDate ? (this.datePipe.transform(filterValues.toDate, 'yyyy-MM-dd') || undefined) : undefined
    };

    this.loadAllLeaves(filter);
  }

  /**
   * Executes the operation: clearFilters
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  clearFilters(): void {
    this.filterForm.reset();
    this.loadAllLeaves();
  }

  // Leave Actions
  viewLeaveDetails(leave: LeaveApplication): void {
    // TODO: Implement dialog for viewing leave details
    this.showSnackBar('View details dialog will be implemented soon', 'warning');
  }

  /**
   * Executes the operation: approveLeave
   * Parameters: leave: LeaveApplication
   * Rationale: Standard operational controller for the active view.
   */
  approveLeave(leave: LeaveApplication): void {
    // TODO: Implement approval dialog
    if (confirm('Are you sure you want to approve this leave application?')) {
      this.processLeaveApproval(leave);
    }
  }

  /**
   * Executes the operation: processLeaveApproval
   * Parameters: leave: LeaveApplication
   * Rationale: Standard operational controller for the active view.
   */
  private processLeaveApproval(leave: LeaveApplication): void {
    this.isProcessing = true;
    this.loaderService.show();
    this.leaveService.approveLeave(leave.id!, this.currentUser).subscribe({
      next: (response: any) => {
        this.isProcessing = false;
        this.loaderService.hide();
        this.showSnackBar('Leave approved successfully', 'success');
        this.refreshData();
      },
      error: (error: any) => {
        this.isProcessing = false;
        this.loaderService.hide();
        console.error('Error approving leave:', error);
        this.showSnackBar('An error occurred while approving leave', 'error');
      }
    });
  }

  /**
   * Executes the operation: rejectLeave
   * Parameters: leave: LeaveApplication
   * Rationale: Standard operational controller for the active view.
   */
  rejectLeave(leave: LeaveApplication): void {
    const reason = prompt('Please enter reason for rejection:');
    if (reason && reason.trim()) {
      this.processLeaveRejection(leave, reason.trim());
    }
  }

  /**
   * Executes the operation: processLeaveRejection
   * Parameters: leave: LeaveApplication, reason: string
   * Rationale: Standard operational controller for the active view.
   */
  private processLeaveRejection(leave: LeaveApplication, reason: string): void {
    this.isProcessing = true;
    this.loaderService.show();
    this.leaveService.rejectLeave(leave.id!, this.currentUser, reason).subscribe({
      next: (response: any) => {
        this.isProcessing = false;
        this.loaderService.hide();
        this.showSnackBar('Leave rejected successfully', 'success');
        this.refreshData();
      },
      error: (error: any) => {
        this.isProcessing = false;
        this.loaderService.hide();
        console.error('Error rejecting leave:', error);
        this.showSnackBar('An error occurred while rejecting leave', 'error');
      }
    });
  }

  
  /**
   * Executes the operation: refreshData
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private refreshData(): void {
    this.loadStatistics();
    this.loadPendingLeaves();
    if (this.selectedTab === 1) {
      this.loadAllLeaves();
    }
  }

  // Utility Methods
  formatDate(date: string): string {
    return this.datePipe.transform(date, 'dd MMM yyyy') || '';
  }

  /**
   * Executes the operation: getStatusColor
   * Parameters: status: LeaveStatus
   * Rationale: Standard operational controller for the active view.
   */
  getStatusColor(status: LeaveStatus): string {
    return this.leaveService.getLeaveStatusColor(status);
  }

  /**
   * Executes the operation: getStatusClass
   * Parameters: status: LeaveStatus
   * Rationale: Standard operational controller for the active view.
   */
  getStatusClass(status: LeaveStatus): string {
    return this.leaveService.getLeaveStatusClass(status);
  }

  /**
   * Executes the operation: getLeaveTypeColor
   * Parameters: leaveType: LeaveType
   * Rationale: Standard operational controller for the active view.
   */
  getLeaveTypeColor(leaveType: LeaveType): string {
    switch (leaveType) {
      case LeaveType.SICK_LEAVE:
        return '#ef4444';
      case LeaveType.PERSONAL_LEAVE:
        return '#3b82f6';
      case LeaveType.VACATION:
        return '#10b981';
      case LeaveType.MEDICAL:
        return '#f59e0b';
      case LeaveType.FAMILY_EMERGENCY:
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  }

  /**
   * Executes the operation: showSnackBar
   * Parameters: message: string, type: 'success' | 'error' | 'warning'
   * Rationale: Standard operational controller for the active view.
   */
  private showSnackBar(message: string, type: 'success' | 'error' | 'warning'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: type === 'success' ? 'success-snackbar' : 'error-snackbar',
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  // Export functionality
  exportToExcel(): void {
    // Implementation for exporting data to Excel
    this.showSnackBar('Export functionality will be implemented soon', 'warning');
  }

  // Print functionality
  printLeaveReport(): void {
    // Implementation for printing leave report
    window.print();
  }

  /**
   * Executes the operation: downloadAttachment
   * Parameters: leave: LeaveApplication
   * Rationale: Standard operational controller for the active view.
   */
  downloadAttachment(leave: LeaveApplication): void {
    if (!leave.attachmentName) return;
    
    this.leaveService.downloadLeaveDocument(leave.attachmentName).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = leave.attachmentName || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error: any) => {
        console.error('Error downloading attachment:', error);
        this.showSnackBar('Failed to download attachment', 'error');
      }
    });
  }
}
