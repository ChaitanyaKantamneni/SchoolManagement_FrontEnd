import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule, DatePipe, formatDate } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { DOCUMENT } from '@angular/common';

import { LeaveService } from '../../Services/leave.service';
import { ParentServiceService } from '../../Services/parent-service.service';
import { LoaderService } from '../../Services/loader.service';
import { 
  LeaveApplication, 
  LeaveType, 
  LeaveStatus,
  LeaveBalance 
} from '../../models/leave.models';

@Component({
  selector: 'app-leave-application',
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
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
    MatRadioModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTabsModule,
    MatBadgeModule,
    MatDialogModule,
    MatChipsModule,
    MatExpansionModule,
    MatListModule
  ],
  templateUrl: './leave-application.component.html',
  styleUrls: ['./leave-application.component.css'],
  providers: [DatePipe]
})
export class LeaveApplicationComponent implements OnInit {
  leaveForm: FormGroup;
  selectedFile: File | null = null;
  isSubmitting = false;
  
  // Test property to ensure rendering
  isComponentLoaded = false;
  
  // Date validation
  minDate: Date = new Date();
  maxDate: Date = new Date();
  academicYear: string = '';
  selectedChildId: string = '';
  
  // Session data
  parentEmail: string = '';
  schoolId: string = '';
  schoolName: string = '';
  
  // Data
  childrenList: any[] = [];
  selectedChild: any = null;
  leaveBalances: { [key: string]: LeaveBalance } = {};
  existingLeaves: LeaveApplication[] = [];
  
  // Leave statuses
  leaveStatuses: string[] = Object.values(LeaveStatus);

  constructor(
    private fb: FormBuilder,
    private leaveService: LeaveService,
    private parentService: ParentServiceService,
    private loaderService: LoaderService,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.minDate = new Date();
    this.maxDate = new Date();
    this.maxDate.setMonth(this.maxDate.getMonth() + 3); // Allow booking up to 3 months in advance
    
    this.leaveForm = this.fb.group({
      fromDate: ['', Validators.required],
      toDate: ['', Validators.required],
      reason: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
    }, { validators: this.dateRangeValidator });
  }

  ngOnInit(): void {
    this.isComponentLoaded = true;
    this.initializeSessionData();
    this.initializeDefaultData();
    this.loadChildren();
  }

  private initializeDefaultData(): void {
    this.existingLeaves = [];
    this.leaveBalances = {};
    this.childrenList = [];
  }

  private initializeSessionData(): void {
    this.schoolName = sessionStorage.getItem('SchoolName') || '';
    this.schoolId = sessionStorage.getItem('SchoolID') || '';
    this.academicYear = sessionStorage.getItem('AcademicYear') || '';
    this.parentEmail = sessionStorage.getItem('email') || '';
    this.selectedChildId = sessionStorage.getItem('selectedChildId') || '';
  }

  private loadChildren(): void {
    this.loaderService.show();
    this.parentService.getChildrenList(this.parentEmail, this.schoolId, this.academicYear).subscribe({
      next: (response: any) => {
        console.log('Children response:', response);
        this.loaderService.hide();
        if (response?.data && Array.isArray(response.data)) {
          this.childrenList = response.data.map((child: any) => ({
            id: child.admissionID || child.id,
            name: child.studentName || child.name,
            classId: child.classID || child.classId,
            className: child.className || child.class,
            divisionId: child.divisionID || child.divisionId,
            divisionName: child.divisionName || child.division
          }));

          if (!this.selectedChildId && this.childrenList.length > 0) {
            this.selectChild(this.childrenList[0].id);
          } else if (this.selectedChildId && this.childrenList.length > 0) {
            const child = this.childrenList.find(c => c.id === this.selectedChildId);
            if (child) this.selectChild(child.id);
          }
        } else {
          this.showSnackBar('No children found for this parent', 'warning');
        }
      },
      error: (error: any) => {
        console.error('Error loading children:', error);
        this.loaderService.hide();
        this.showSnackBar('Failed to load children data', 'error');
      }
    });
  }

  selectChild(childId: string): void {
    this.selectedChildId = childId;
    this.selectedChild = this.childrenList.find(c => c.id === childId) || null;
    if (this.selectedChild) {
      this.loadLeaveBalance();
      this.loadExistingLeaves();
    }
  }

  private loadLeaveBalance(): void {
    if (!this.selectedChildId) return;

    // Initialize with default values in case API fails
    this.leaveBalances[this.selectedChildId] = {
      studentId: this.selectedChildId,
      academicYear: this.academicYear,
      totalLeaves: 15,
      usedLeaves: 0,
      remainingLeaves: 15,
      sickLeaveUsed: 0,
      personalLeaveUsed: 0,
      vacationUsed: 0
    };

    this.leaveService.getLeaveBalance(this.selectedChildId, this.academicYear).subscribe({
      next: (response: any) => {
        if (response?.data?.[0]) {
          const balance = response.data[0];
          this.leaveBalances[this.selectedChildId] = {
            studentId: this.selectedChildId,
            academicYear: this.academicYear,
            totalLeaves: balance.totalLeaves || 15,
            usedLeaves: balance.usedLeaves || 0,
            remainingLeaves: balance.remainingLeaves || 15,
            sickLeaveUsed: balance.sickLeaveUsed || 0,
            personalLeaveUsed: balance.personalLeaveUsed || 0,
            vacationUsed: balance.vacationUsed || 0
          };
        }
      },
      error: (error) => {
        console.error('Error loading leave balance:', error);
        // Keep default values if API fails
      }
    });
  }

  private loadExistingLeaves(): void {
    if (!this.selectedChildId) return;

    // Initialize empty array
    this.existingLeaves = [];

    this.leaveService.getStudentLeaves(this.selectedChildId, this.schoolId, this.academicYear).subscribe({
      next: (response: any) => {
        if (response?.data && Array.isArray(response.data)) {
          this.existingLeaves = response.data.map((leave: any) => ({
            id: leave.id,
            studentId: leave.studentID,
            studentName: leave.studentName,
            parentId: leave.parentID,
            parentEmail: leave.parentEmail,
            schoolId: leave.schoolID,
            academicYear: leave.academicYear,
            classId: leave.classID,
            className: leave.className,
            divisionId: leave.divisionID,
            divisionName: leave.divisionName,
            leaveType: leave.leaveType,
            fromDate: leave.fromDate,
            toDate: leave.toDate,
            totalDays: leave.totalDays,
            reason: leave.reason,
            status: leave.status,
            appliedDate: leave.appliedDate,
            approvedDate: leave.approvedDate,
            approvedBy: leave.approvedBy,
            rejectedDate: leave.rejectedDate,
            rejectedBy: leave.rejectedBy,
            rejectionReason: leave.rejectionReason,
            attachment: leave.attachment,
            attachmentName: leave.attachmentName
          }));
        }
      },
      error: (error) => {
        console.error('Error loading existing leaves:', error);
      }
    });
  }

  // Form validation
  dateRangeValidator(form: FormGroup): { [key: string]: boolean } | null {
    const fromDate = form.get('fromDate')?.value;
    const toDate = form.get('toDate')?.value;
    
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      return { dateRangeInvalid: true };
    }
    
    return null;
  }

  onFromDateChange(): void {
    const fromDate = this.leaveForm.get('fromDate')?.value;
    if (fromDate) {
      const toDate = this.leaveForm.get('toDate');
      toDate?.setValidators([Validators.required]);
      toDate?.updateValueAndValidity();
    }
  }

  // File handling
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.showSnackBar('File size should not exceed 5MB', 'error');
        input.value = '';
        return;
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        this.showSnackBar('Only PDF, JPG, JPEG, and PNG files are allowed', 'error');
        input.value = '';
        return;
      }
      
      this.selectedFile = file;
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  async onSubmit(): Promise<void> {
  if (this.isSubmitting) return;

  if (!this.selectedChild || !this.selectedChildId) {
    this.showSnackBar('Please select a child', 'error');
    return;
  }

  this.leaveForm.updateValueAndValidity();

  if (this.leaveForm.invalid) {
    Object.keys(this.leaveForm.controls).forEach(key => {
      this.leaveForm.get(key)?.markAsTouched();
    });
    this.showSnackBar('Please fill all required fields correctly', 'error');
    return;
  }

  this.isSubmitting = true;

  this.loaderService.show();

  try {

    const formValue = this.leaveForm.value;

    const fromDate = new Date(formValue.fromDate);

    const toDate = new Date(formValue.toDate);

    // Format dates as yyyy-MM-dd strings for the API
    const fromDateStr = formatDate(fromDate, 'yyyy-MM-dd', 'en-US');
    const toDateStr = formatDate(toDate, 'yyyy-MM-dd', 'en-US');

    // Calculate leave days
    const totalDays =
      Math.ceil(
        (toDate.getTime() - fromDate.getTime()) /
        (1000 * 60 * 60 * 24)
      ) + 1;

    // Check overlapping leaves
    const isOverlapping =
      this.leaveService.isLeaveOverlapping(
        this.selectedChildId,
        fromDateStr,
        toDateStr,
        this.existingLeaves
      );

    if (isOverlapping) {
      this.showSnackBar('Leave dates overlap with existing leave', 'error');
      this.isSubmitting = false;
      this.loaderService.hide();
      return;
    }

    let attachmentUrl = '';
    let attachmentName = '';

    if (this.selectedFile) {
      attachmentName = this.selectedFile.name;
      attachmentUrl = `uploads/${Date.now()}_${attachmentName}`;
    }

    const leaveApplication: LeaveApplication = {
      studentId: this.selectedChildId,
      studentName: this.selectedChild.name,
      parentId: this.parentEmail,
      parentEmail: this.parentEmail,
      schoolId: this.schoolId,
      academicYear: this.academicYear,
      classId: this.selectedChild.classId,
      className: this.selectedChild.className,
      divisionId: this.selectedChild.divisionId,
      divisionName: this.selectedChild.divisionName,
      leaveType: LeaveType.PERSONAL_LEAVE,
      fromDate: fromDateStr,
      toDate: toDateStr,
      totalDays: totalDays,
      reason: formValue.reason,
      status: LeaveStatus.PENDING,
      appliedDate: new Date().toISOString(),
      attachment: attachmentUrl,
      attachmentName: attachmentName
    };

    console.log('Submitting leave application:', leaveApplication);

    this.leaveService
      .applyLeave(leaveApplication)
      .subscribe({

        next: (response: any) => {

          console.log('API SUCCESS:', response);

          if (response?.success || response) {
            this.showSnackBar('Leave application submitted successfully', 'success');
            this.resetForm();
            this.loadExistingLeaves();
            this.loadLeaveBalance();
          } else {
            this.showSnackBar('Failed to submit leave application', 'error');
          }
          this.isSubmitting = false;
          this.loaderService.hide();
        },
        error: (error: any) => {
          console.error('API ERROR:', error);
          this.showSnackBar('Error while submitting leave application', 'error');
          this.isSubmitting = false;
          this.loaderService.hide();
        }
      });

  } catch (error) {
    console.error('ERROR:', error);
    this.showSnackBar('Unexpected error occurred', 'error');
    this.isSubmitting = false;
    this.loaderService.hide();
  }
}

  resetForm(): void {
    this.leaveForm.reset();
    this.selectedFile = null;
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private showSnackBar(message: string, type: 'success' | 'error' | 'warning'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: type === 'success' ? 'success-snackbar' : 'error-snackbar',
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  // Utility methods
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

  formatDate(date: string): string {
    return this.datePipe.transform(date, 'dd MMM yyyy') || '';
  }


  private getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.leaveForm.controls).forEach(key => {
      const control = this.leaveForm.get(key);
      if (control?.errors) errors[key] = control.errors;
    });
    return errors;
  }
  getRemainingDaysColor(): string {
    if (!this.leaveBalances[this.selectedChildId]) return '#6b7280';
    const percentage = (this.leaveBalances[this.selectedChildId].remainingLeaves / this.leaveBalances[this.selectedChildId].totalLeaves) * 100;
    if (percentage > 50) return '#22c55e';
    if (percentage > 20) return '#f59e0b';
    return '#ef4444';
  }
}
