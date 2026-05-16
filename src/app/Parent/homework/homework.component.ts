import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ApiServiceService } from '../../Services/api-service.service';
import { LoaderService } from '../../Services/loader.service';
import { ParentServiceService } from '../../Services/parent-service.service';
import { HomeworkSubmissionService, HomeworkSubmission } from '../../Services/homework-submission.service';
import { FileService } from '../../Services/file.service';

@Component({
  selector: 'app-parent-homework',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCardModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatChipsModule,
    MatBadgeModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule
  ],
  templateUrl: './homework.component.html',
  styleUrls: ['./homework.component.css']
})
export class ParentHomeworkComponent implements OnInit {
  
  // ─── View Management ────────────────────────────────────────────────────────
  currentTabIndex = 0; // 0 = Assigned Homework, 1 = Submitted
  get currentTab(): string { return this.currentTabIndex === 0 ? 'assignments' : 'submitted'; }
  readonly tabs = [
    { id: 'assignments', label: 'Assigned Homework', icon: 'assignment' },
    { id: 'submitted', label: 'Submitted', icon: 'upload_done' }
  ];

  // ─── Data Properties ────────────────────────────────────────────────────────
  assignmentsList: any[] = [];
  submittedList: HomeworkSubmission[] = [];
  
  // ─── Loading States ─────────────────────────────────────────────────────────
  loadingAssignments = false;
  loadingSubmitted = false;

  // ─── Form Properties ────────────────────────────────────────────────────────
  submissionForm: FormGroup;
  selectedAssignment: any = null;
  selectedFile: File | null = null;
  isSubmitting = false;
  isEditModalOpen = false;
  editingSubmission: HomeworkSubmission | null = null;

  // ─── File Upload Properties ───────────────────────────────────────────────────
  filePreviewUrl: string | null = null;
  filePreviewType: 'image' | 'document' | null = null;
  uploadedFileName: string = '';
  uploadedFileUrl: string = '';

  // ─── Session Data ───────────────────────────────────────────────────────────
  selectedChildId: string = '';
  selectedChild: any = null;
  schoolId: string = '';
  academicYearId: string = '';

  // ─── Table Configuration ───────────────────────────────────────────────────
  assignmentsColumns: string[] = ['title', 'subject', 'assignedDate', 'submissionDate', 'status', 'actions'];
  submittedColumns: string[] = ['title', 'subject', 'submissionDate', 'status', 'attachment', 'actions'];

  constructor(
    private apiService: ApiServiceService,
    private loader: LoaderService,
    private parentService: ParentServiceService,
    private homeworkSubmissionService: HomeworkSubmissionService,
    private fileService: FileService
  ) {
    this.submissionForm = new FormGroup({
      ID: new FormControl(''),
      HomeworkID: new FormControl('', [Validators.required]),
      StudentAdmissionNo: new FormControl('', [Validators.required]),
      SubmissionText: new FormControl('', [Validators.required]),
      AttachmentURL: new FormControl('', [Validators.required]),
      SubmissionStatus: new FormControl('Submitted'),
      IsActive: new FormControl('1')
    });
  }

  ngOnInit(): void {
    // Initialize session data - use data from Parent Dashboard
    this.schoolId = sessionStorage.getItem('SchoolID') || '';
    this.selectedChildId = sessionStorage.getItem('SelectedChildID') || '';
    // Use the academic year from Parent Dashboard if available
    this.academicYearId = sessionStorage.getItem('AcademicYearID') || sessionStorage.getItem('AcademicYear') || '';
    
    // Also try to get child data from Parent Dashboard session
    const childData = sessionStorage.getItem('SelectedChildData');
    if (childData) {
      try {
        this.selectedChild = JSON.parse(childData);
        console.log('[PARENT HOMEWORK] Loaded child from session:', this.selectedChild);
      } catch (e) {
        console.warn('[PARENT HOMEWORK] Failed to parse child data from session');
      }
    }
    
    console.log('[PARENT HOMEWORK] Session data initialized:', {
      schoolId: this.schoolId,
      academicYearId: this.academicYearId,
      selectedChildId: this.selectedChildId,
      selectedChild: this.selectedChild
    });
    
    // If we have child data, load homework directly; otherwise try to load it
    if (this.selectedChild && this.selectedChildId && this.schoolId) {
      console.log('[PARENT HOMEWORK] Child data available, loading homework directly');
      this.loadAllHomeworkData();
    } else {
      console.log('[PARENT HOMEWORK] Child data not available, loading academic years first');
      this.loadAcademicYears();
    }
  }

  // ─── Data Loading Methods ───────────────────────────────────────────────────
  private loadAcademicYears(): void {
    if (!this.schoolId || this.schoolId === '0' || !this.schoolId.trim()) {
      console.warn('[PARENT HOMEWORK] No school ID available');
      return;
    }

    const tryFetch = (flag: string) => {
      this.parentService.getAcademicYears(this.schoolId, flag).subscribe({
        next: (res: any) => {
          const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.Data) ? res.Data : []);
          if (list.length === 0 && flag === '2') {
            tryFetch('3');
            return;
          }

          const academicYears = list.map((i: any) => ({
            ID: String(i.id ?? i.ID ?? i.sNo ?? i.sno ?? ''),
            Name: String(i.name ?? i.Name ?? i.academicYear ?? '')
          })).filter((y: any) => y.ID && y.Name);

          // Auto-select first academic year if available
          if (academicYears.length > 0) {
            this.academicYearId = academicYears[0].ID;
            sessionStorage.setItem('AcademicYearID', this.academicYearId);
            console.log('[PARENT HOMEWORK] Academic year selected:', this.academicYearId);
            this.loadInitialData();
          } else {
            console.warn('[PARENT HOMEWORK] No academic years found');
          }
        },
        error: () => {
          if (flag === '2') tryFetch('3');
          else { 
            console.error('[PARENT HOMEWORK] Failed to load academic years');
            this.loadInitialData(); // Continue without academic year
          }
        }
      });
    };

    tryFetch('2');
  }

  private loadInitialData(): void {
    // If we already have child data, just load homework
    if (this.selectedChild && this.selectedChildId) {
      this.loadAllHomeworkData();
    } else {
      // Try to load children (but this may fail)
      this.loadChildren();
    }
  }

  private loadChildren(): void {
    const parentId = sessionStorage.getItem('email') || sessionStorage.getItem('UserId') || '';
    console.log('[PARENT HOMEWORK] Loading children for parentId:', parentId, 'schoolId:', this.schoolId);
    
    // Load children without academic year filter to avoid 400 error
    this.parentService.getChildrenList(parentId, this.schoolId).subscribe({
      next: (response: any) => {
        console.log('[PARENT HOMEWORK] Children API response:', response);
        const children = response?.data || response || [];
        this.childrenList = children.map((child: any) => ({
          id: child.AdmissionNo || child.id,
          name: child.StudentName || child.name,
          admissionNo: child.AdmissionNo,
          classId: child.Class || child.class || child.classId,
          divisionId: child.Division || child.division || child.divisionId
        }));
        console.log('[PARENT HOMEWORK] Mapped children list:', this.childrenList);
        
        if (this.childrenList.length > 0) {
          this.selectedChildId = this.childrenList[0].id;
          this.selectedChild = this.childrenList[0];
          // Store child data in session for reuse
          sessionStorage.setItem('SelectedChildID', this.selectedChildId);
          sessionStorage.setItem('SelectedChildData', JSON.stringify(this.selectedChild));
          console.log('[PARENT HOMEWORK] Selected child:', this.selectedChild);
          this.loadAllHomeworkData();
        }
      },
      error: (error) => {
        console.error('[PARENT HOMEWORK] Error loading children:', error);
        console.error('[PARENT HOMEWORK] Error details:', error.error || error.message);
        // Don't block UI if children loading fails
        this.assignmentsList = [];
        this.loadingAssignments = false;
      }
    });
  }

  private loadChildData(): void {
    // Load child specific data if needed
  }

  private loadAllHomeworkData(): void {
    // Load submitted first so getSubmissionStatus() has data when assignments map
    this.loadSubmittedHomework(() => {
      this.loadAssignedHomework();
    });
  }

  private loadAssignedHomework(): void {
    // Don't load if we don't have the required data
    if (!this.selectedChild || !this.schoolId) {
      console.warn('[PARENT HOMEWORK] Cannot load homework - missing required data');
      this.loadingAssignments = false;
      return;
    }
    
    this.loadingAssignments = true;
    
    console.log('[PARENT HOMEWORK] Loading assigned homework');
    console.log('[PARENT HOMEWORK] Selected child:', this.selectedChild);
    console.log('[PARENT HOMEWORK] SchoolID:', this.schoolId, 'AcademicYear:', this.academicYearId);
    console.log('[PARENT HOMEWORK] ClassId:', this.selectedChild?.classId, 'DivisionId:', this.selectedChild?.divisionId);
    
    // Use parent service to get homework for child's class
    // If academic year is empty, try without it first
    const academicYearToUse = this.academicYearId || '';
    
    this.parentService.getChildHomework(
      this.selectedChildId,
      this.schoolId,
      academicYearToUse,
      this.selectedChild?.classId?.toString(),
      this.selectedChild?.divisionId?.toString()
    ).subscribe({
      next: (response: any) => {
        console.log('[PARENT HOMEWORK] API response:', response);
        console.log('[PARENT HOMEWORK] Response data length:', response?.data?.length || 0);
        
        if (response?.data && response.data.length > 0) {
          console.log('[PARENT HOMEWORK] First homework item:', response.data[0]);
        }
        
        this.assignmentsList = (response?.data || []).map((item: any) => ({
          id: item.id,
          title: item.homeworkTitle,
          description: item.description,
          subject: item.subjectName,
          subjectID: item.subjectID,
          assignedDate: item.assignedDate,
          submissionDate: item.submissionDate,
          attachmentURL: item.attachmentURL,
          className: item.className,
          divisionName: item.divisionName,
          teacherID: item.teacherID,
          teacherName: item.teacherName || 'Teacher',
          isActive: item.isActive,
          submissionStatus: this.getSubmissionStatus(item.id)
        }));
        console.log('[PARENT HOMEWORK] Mapped assignments list:', this.assignmentsList);
        console.log('[PARENT HOMEWORK] Assignments list length:', this.assignmentsList.length);
        this.backfillSubmittedList();
        this.loadingAssignments = false;
      },
      error: (error) => {
        console.error('[PARENT HOMEWORK] Error loading assigned homework:', error);
        console.error('[PARENT HOMEWORK] Error details:', error.error || error.message);
        
        // Fallback: Try loading without academic year if the first attempt fails
        console.log('[PARENT HOMEWORK] Trying fallback without academic year filter');
        this.parentService.getChildHomework(
          this.selectedChildId,
          this.schoolId,
          '', // Empty academic year
          this.selectedChild?.classId?.toString(),
          this.selectedChild?.divisionId?.toString()
        ).subscribe({
          next: (fallbackResponse: any) => {
            console.log('[PARENT HOMEWORK] Fallback API response:', fallbackResponse);
            this.assignmentsList = (fallbackResponse?.data || []).map((item: any) => ({
              id: item.id,
              title: item.homeworkTitle,
              description: item.description,
              subject: item.subjectName,
              subjectID: item.subjectID,
              assignedDate: item.assignedDate,
              submissionDate: item.submissionDate,
              attachmentURL: item.attachmentURL,
              className: item.className,
              divisionName: item.divisionName,
              teacherID: item.teacherID,
              teacherName: item.teacherName || 'Teacher',
              isActive: item.isActive,
              submissionStatus: this.getSubmissionStatus(item.id)
            }));
            console.log('[PARENT HOMEWORK] Fallback assignments list:', this.assignmentsList);
            this.backfillSubmittedList();
            this.loadingAssignments = false;
          },
          error: (fallbackError) => {
            console.error('[PARENT HOMEWORK] Fallback also failed:', fallbackError);
            this.assignmentsList = [];
            this.loadingAssignments = false;
          }
        });
      }
    });
  }

  private backfillSubmittedList(): void {
    if (this.submittedList && this.assignmentsList) {
      this.submittedList.forEach(sub => {
        const assigned = this.assignmentsList.find(a => String(a.id) === String(sub.HomeworkID));
        if (assigned) {
          if (!sub.SubjectName || sub.SubjectName === 'N/A' || sub.SubjectName === '') {
            sub.SubjectName = assigned.subject || 'N/A';
          }
          if (!sub.HomeworkTitle || sub.HomeworkTitle === 'Unknown' || sub.HomeworkTitle === '') {
            sub.HomeworkTitle = assigned.title || 'Unknown';
          }
        }
      });

      // If the user already opened the modal before assignments finished loading, update the modal data
      if (this.selectedSubmissionForView) {
        const updated = this.submittedList.find(s => String(s.ID) === String(this.selectedSubmissionForView?.ID));
        if (updated) {
          this.selectedSubmissionForView.SubjectName = updated.SubjectName;
          this.selectedSubmissionForView.HomeworkTitle = updated.HomeworkTitle;
        }
      }
    }
  }

  private loadSubmittedHomework(onComplete?: () => void): void {
    this.loadingSubmitted = true;

    console.log('[PARENT HOMEWORK] Loading submitted homework with data:', {
      schoolId: this.schoolId,
      academicYearId: this.academicYearId,
      selectedChildId: this.selectedChildId
    });

    // Ensure we have required data before making the call
    if (!this.schoolId || !this.selectedChildId) {
      console.warn('[PARENT HOMEWORK] Missing required data for submitted homework');
      this.submittedList = [];
      this.loadingSubmitted = false;
      if (onComplete) onComplete();
      return;
    }

    // Fetch ALL submissions for this student
    const payload: any = {
      Flag: '2',
      SchoolID: this.schoolId,
      AcademicYear: this.academicYearId || '',
      StudentAdmissionNo: this.selectedChildId,
      IsActive: '1',
      SortColumn: 'SubmissionDate',
      SortDirection: 'DESC'
    };

    console.log('[PARENT HOMEWORK] Submitted homework payload:', payload);

    this.homeworkSubmissionService.getAllSubmissions(payload).subscribe({
      next: (response: any) => {
        console.log('[PARENT HOMEWORK] Submitted homework response:', response);
        
        let responseData = response?.data || response?.Data || [];
        if (!Array.isArray(responseData)) {
          responseData = responseData ? [responseData] : [];
        }
        
        this.submittedList = responseData.map((item: any) => {
          const submissionId = item.id || item.ID;
          let attachmentUrl = item.attachmentURL || item.AttachmentURL || item.attachment || '';
          
          return {
            ...item,
            ID: submissionId,
            HomeworkID: item.HomeworkID || item.homeworkID || item.homeworkId,
            HomeworkTitle: item.homeworkTitle || item.HomeworkTitle || item.title || 'Unknown',
            SubjectName: item.subjectName || item.SubjectName || item.subject || 'N/A',
            SubmissionDate: item.submissionDate || item.SubmissionDate || item.createdDate,
            SubmissionStatus: item.submissionStatus || item.SubmissionStatus || 'Submitted',
            SubmissionText: item.submissionText || item.SubmissionText || '',
            AttachmentURL: attachmentUrl
          };
        });
        
        console.log('[PARENT HOMEWORK] Mapped submitted list:', this.submittedList);
        console.log('[PARENT HOMEWORK] Submitted list length:', this.submittedList.length);
        
        this.loadingSubmitted = false;
        if (onComplete) onComplete();
      },
      error: (error) => {
        console.error('[PARENT HOMEWORK] Error loading submitted homework:', error);
        this.submittedList = [];
        this.loadingSubmitted = false;
        if (onComplete) onComplete();
      }
    });
  }


  // ─── Tab Management ─────────────────────────────────────────────────────────
  switchTab(tabId: string): void {
    this.currentTabIndex = tabId === 'submitted' ? 1 : 0;
    // If switching to submitted tab, always reload fresh data
    if (tabId === 'submitted') {
      console.log('[PARENT HOMEWORK] Switching to submitted tab, reloading data');
      this.loadSubmittedHomework();
    }
  }

  onTabChange(event: any): void {
    this.currentTabIndex = event.index;
    if (event.index === 1) {
      console.log('[PARENT HOMEWORK] Switched to Submitted tab, reloading data');
      this.loadSubmittedHomework();
    }
  }

  // ─── Debug Method ─────────────────────────────────────────────────────────
  debugSubmittedData(): void {
    console.log('[PARENT HOMEWORK] Debug - Current submitted list:', this.submittedList);
    console.log('[PARENT HOMEWORK] Debug - School ID:', this.schoolId);
    console.log('[PARENT HOMEWORK] Debug - Child ID:', this.selectedChildId);
    console.log('[PARENT HOMEWORK] Debug - Academic Year:', this.academicYearId);
    
    // Test API call directly
    if (this.schoolId && this.selectedChildId) {
      const testPayload = {
        SchoolID: this.schoolId,
        StudentAdmissionNo: this.selectedChildId,
        SubmissionStatus: 'Submitted',
        IsActive: true
      };
      
      console.log('[PARENT HOMEWORK] Debug - Testing API call with payload:', testPayload);
      
      this.homeworkSubmissionService.getAllSubmissions(testPayload).subscribe({
        next: (response) => {
          console.log('[PARENT HOMEWORK] Debug - API test response:', response);
          console.log('[PARENT HOMEWORK] Debug - Response type:', typeof response);
          console.log('[PARENT HOMEWORK] Debug - Response keys:', Object.keys(response || {}));
          
          // Try to extract data from different possible response structures
          const data = response?.data || response?.Data || response || [];
          console.log('[PARENT HOMEWORK] Debug - Extracted data:', data);
          console.log('[PARENT HOMEWORK] Debug - Data type:', typeof data);
          console.log('[PARENT HOMEWORK] Debug - Is array:', Array.isArray(data));
          
          if (Array.isArray(data)) {
            console.log('[PARENT HOMEWORK] Debug - Data length:', data.length);
            if (data.length > 0) {
              console.log('[PARENT HOMEWORK] Debug - First item:', data[0]);
            }
          }
        },
        error: (error) => {
          console.error('[PARENT HOMEWORK] Debug - API test error:', error);
        }
      });
    }
  }

  // ─── Test Method ─────────────────────────────────────────────────────────
  createTestSubmission(): void {
    console.log('[PARENT HOMEWORK] Creating test submission');
    
    if (!this.schoolId || !this.selectedChildId) {
      console.warn('[PARENT HOMEWORK] Cannot create test submission - missing required data');
      return;
    }

    const testSubmission = {
      SchoolID: this.schoolId,
      AcademicYear: this.academicYearId || '',
      HomeworkID: 1, // Test homework ID
      StudentAdmissionNo: this.selectedChildId,
      SubmissionText: 'This is a test submission for debugging purposes',
      AttachmentURL: '',
      SubmissionStatus: 'Submitted',
      CreatedBy: 'Test User',
      IsActive: '1'
    };

    console.log('[PARENT HOMEWORK] Test submission data:', testSubmission);

    this.homeworkSubmissionService.submitHomework(testSubmission).subscribe({
      next: (response) => {
        console.log('[PARENT HOMEWORK] Test submission response:', response);
        // Reload submitted data after creating test submission
        this.loadSubmittedHomework();
      },
      error: (error) => {
        console.error('[PARENT HOMEWORK] Test submission error:', error);
      }
    });
  }

  // ─── Homework Submission Methods ───────────────────────────────────────────────
  openSubmissionModal(assignment: any): void {
    this.selectedAssignment = assignment;
    this.selectedFile = null;
    this.filePreviewUrl = null;
    this.filePreviewType = null;
    this.uploadedFileName = '';
    this.uploadedFileUrl = '';

    // Use loose comparison: API returns HomeworkID as int, assignment.id may be int or string
    const existingSubmission = this.submittedList.find(
      s => Number(s.HomeworkID) === Number(assignment.id)
    );

    if (existingSubmission) {
      this.editingSubmission = existingSubmission;
      this.submissionForm.patchValue({
        ID: existingSubmission.ID || null,
        HomeworkID: assignment.id,
        StudentAdmissionNo: this.selectedChildId,
        SubmissionText: existingSubmission.SubmissionText || '',
        AttachmentURL: existingSubmission.AttachmentURL || '',
        SubmissionStatus: existingSubmission.SubmissionStatus || 'Submitted',
        IsActive: '1'
      });
      this.uploadedFileName = existingSubmission.AttachmentURL ? this.getFileName(existingSubmission.AttachmentURL) : '';
      this.uploadedFileUrl = existingSubmission.AttachmentURL || '';
    } else {
      this.editingSubmission = null;
      this.submissionForm.setValue({
        ID: null,            // null instead of '' — prevents "" being sent to INT column
        HomeworkID: assignment.id,
        StudentAdmissionNo: this.selectedChildId,
        SubmissionText: '',
        AttachmentURL: '',
        SubmissionStatus: 'Submitted',
        IsActive: '1'
      });
    }
    this.isEditModalOpen = true;
  }

  closeSubmissionModal(): void {
    this.isEditModalOpen = false;
    this.selectedAssignment = null;
    this.editingSubmission = null;
    this.selectedFile = null;
    this.filePreviewUrl = null;
    this.filePreviewType = null;
    this.uploadedFileName = '';
    this.uploadedFileUrl = '';
    this.submissionForm.reset();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile = file;
      this.uploadedFileName = file.name;
      
      // Update form control with file name to satisfy validation
      this.submissionForm.patchValue({
        AttachmentURL: file.name
      });
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.filePreviewUrl = e.target?.result as string;
          this.filePreviewType = 'image';
        };
        reader.readAsDataURL(file);
      } else {
        this.filePreviewType = 'document';
        this.filePreviewUrl = null;
      }
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.filePreviewUrl = null;
    this.filePreviewType = null;
    this.uploadedFileName = '';
    this.uploadedFileUrl = '';
    
    // Clear the form control to trigger validation
    this.submissionForm.patchValue({
      AttachmentURL: ''
    });
  }

  submitHomework(): void {
    // Ensure required fields are set before validation
    if (!this.submissionForm.get('HomeworkID')?.value && this.selectedAssignment) {
      this.submissionForm.patchValue({
        HomeworkID: this.selectedAssignment.id,
        StudentAdmissionNo: this.selectedChildId
      });
    }

    if (this.submissionForm.invalid) {
      this.markFormGroupTouched(this.submissionForm);
      return;
    }

    this.isSubmitting = true;
    this.loader.show();

    const rawFormValue = this.submissionForm.value;

    const submissionData: any = {
      ...rawFormValue,
      // ─── Critical fix: empty string ID must be null so MySQL INT param gets DBNull ───
      ID: rawFormValue.ID && rawFormValue.ID.toString().trim() !== '' ? rawFormValue.ID : null,
      // ─── Ensure HomeworkID is sent as integer, not string ───
      HomeworkID: rawFormValue.HomeworkID ? parseInt(rawFormValue.HomeworkID, 10) : null,
      // ─── Class & Division are NOT NULL in DB — must be sent from the selected child ───
      Class: this.selectedChild?.classId ? parseInt(this.selectedChild.classId, 10) : null,
      Division: this.selectedChild?.divisionId ? parseInt(this.selectedChild.divisionId, 10) : null,
      SchoolID: this.schoolId,
      AcademicYear: this.academicYearId,
      SubmissionDate: new Date(),
      CreatedBy: sessionStorage.getItem('UserName') || 'Parent',
      IsActive: '1'
    };

    console.log('[PARENT HOMEWORK] Submitting homework with data:', submissionData);

    // If there's a file to upload, upload it first
    if (this.selectedFile) {
      const formData = new FormData();
      formData.append('file', this.selectedFile);
      formData.append('SchoolID', this.schoolId);
      formData.append('StudentAdmissionNo', this.selectedChildId || '');
      formData.append('HomeworkID', this.selectedAssignment?.id || '');

      this.fileService.uploadHomeworkSubmissionDoc(formData).subscribe({
        next: (fileResponse: any) => {
          console.log('[PARENT HOMEWORK] File uploaded successfully:', fileResponse);
          
          // Update submission data with file URL
          submissionData.AttachmentURL = fileResponse.url || fileResponse.data?.url || '';
          
          // Now submit the homework data
          this.submitHomeworkData(submissionData);
        },
        error: (fileError: any) => {
          console.error('[PARENT HOMEWORK] Error uploading file:', fileError);
          this.isSubmitting = false;
          this.loader.hide();
          alert('Error uploading file. Please try again.');
        }
      });
    } else {
      // No file to upload, submit directly
      this.submitHomeworkData(submissionData);
    }
  }

  private submitHomeworkData(submissionData: any): void {
    const submitMethod = this.editingSubmission
      ? this.homeworkSubmissionService.updateSubmission(submissionData)
      : this.homeworkSubmissionService.submitHomework(submissionData);

    submitMethod.subscribe({
      next: (response: any) => {
        console.log('[PARENT HOMEWORK] Homework submission response:', response);
        this.isSubmitting = false;
        this.loader.hide();
        this.closeSubmissionModal();
        
        // Switch to Submitted tab and reload — load submitted first so status badges update
        this.currentTabIndex = 1;
        setTimeout(() => {
          this.loadSubmittedHomework(() => {
            this.loadAssignedHomework();
          });
        }, 600);
      },
      error: (error: any) => {
        console.error('[PARENT HOMEWORK] Error submitting homework:', error);
        this.isSubmitting = false;
        this.loader.hide();
        this.closeSubmissionModal();
        
        // Still refresh data
        setTimeout(() => {
          this.loadAllHomeworkData();
        }, 600);
      }
    });
  }

  // ─── View Methods ─────────────────────────────────────────────────────────────
  isViewModalOpen = false;
  selectedHomeworkForView: any = null;

  // Submission detail view modal
  isSubmissionViewModalOpen = false;
  selectedSubmissionForView: HomeworkSubmission | null = null;

  viewHomeworkDetails(assignment: any): void {
    this.selectedHomeworkForView = assignment;
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.selectedHomeworkForView = null;
  }

  viewSubmissionDetails(submission: HomeworkSubmission): void {
    this.selectedSubmissionForView = submission;
    this.isSubmissionViewModalOpen = true;
  }

  closeSubmissionViewModal(): void {
    this.isSubmissionViewModalOpen = false;
    this.selectedSubmissionForView = null;
  }

  getCleanFileName(url: string | undefined): string {
    if (!url) return '';
    return this.fileService.getCleanFileName(url);
  }

  downloadAttachment(url: string, submissionId?: string): void {
    if (!url) return;
    
    let fallbackUrl: string | undefined = undefined;
    // If the database URL still points to /temp/ but the backend actually moved the file to /{submissionId}/,
    // we create a fallbackUrl. fileService will attempt both.
    if (url.includes('/temp/') && submissionId) {
      fallbackUrl = url.replace('/temp/', `/${submissionId}/`);
    }

    this.fileService.downloadFile(url, undefined, fallbackUrl);
  }

  // ─── Utility ───────────────────────────────────────────────────────────────────
  private getIntValue(value?: string | number): number | null {
    if (!value || value === '0' || value === '') {
      return null;
    }
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
    return isNaN(numValue) ? null : numValue;
  }

  private getSubmissionStatus(homeworkId: number): string {
    const submission = this.submittedList.find(s => s.HomeworkID === homeworkId);
    if (submission) {
      return submission.SubmissionStatus || 'Submitted';
    }
    return 'Pending';
  }

  private getFileName(url: string): string {
    return url.split('/').pop() || 'attachment';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // ─── Status Badge Methods ─────────────────────────────────────────────────────
  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return 'status-success';
      case 'rejected':
        return 'status-danger';
      case 'submitted':
        return 'status-info';
      case 'pending':
        return 'status-warning';
      default:
        return 'status-secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return 'check_circle';
      case 'rejected':
        return 'cancel';
      case 'submitted':
        return 'upload_done';
      case 'pending':
        return 'schedule';
      default:
        return 'help_outline';
    }
  }

  // ─── File Type Detection ─────────────────────────────────────────────────────
  isFileImage(url: string): boolean {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || 
           lowerUrl.endsWith('.png') || lowerUrl.endsWith('.gif') || 
           lowerUrl.endsWith('.webp');
  }

  isFilePdf(url: string): boolean {
    return url?.toLowerCase().endsWith('.pdf') || false;
  }

  getFileIcon(url: string): string {
    if (!url) return 'insert_drive_file';
    if (this.isFilePdf(url)) return 'picture_as_pdf';
    if (url.toLowerCase().includes('.doc')) return 'description';
    if (url.toLowerCase().endsWith('.txt')) return 'text_snippet';
    return 'insert_drive_file';
  }

  // ─── Children List (for completeness) ───────────────────────────────────────────
  childrenList: any[] = [];

  selectChild(childId: string): void {
    this.selectedChildId = childId;
    this.selectedChild = this.childrenList.find(c => c.id === childId) || null;
    sessionStorage.setItem('SelectedChildID', this.selectedChildId);
    // Ensure academic year is set before loading homework
    if (!this.academicYearId) {
      console.warn('[PARENT HOMEWORK] Academic year not set, loading academic years first');
      this.loadAcademicYears();
    } else {
      this.loadAllHomeworkData();
    }
  }
}
