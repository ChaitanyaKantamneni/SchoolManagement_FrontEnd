import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuServiceService } from '../../Services/menu-service.service';
import { LoaderService } from '../../Services/loader.service';
import { ParentServiceService } from '../../Services/parent-service.service';
import { LeaveService } from '../../Services/leave.service';
import { ParentHomeworkComponent } from '../homework/homework.component';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import {
  LeaveApplication,
  LeaveType,
  LeaveStatus,
  LeaveBalance
} from '../../models/leave.models';
import { LeaveBalancePolicyService } from '../../Services/leave-balance-policy.service';
import { FileService } from '../../Services/file.service';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReactiveFormsModule, ParentHomeworkComponent],
  providers: [DatePipe],
  templateUrl: './parent-dashboard.component.html',
  styleUrls: ['./parent-dashboard.component.css']
})
/**
 * Class Responsibility: Handles view logic and user interactions for ParentDashboardComponent.
 */
export class ParentDashboardComponent implements OnInit {

  // ─── View / Tab Management ────────────────────────────────────────────────
  currentView = 'dashboard';

  permissions: Record<string, boolean> = {
    dashboard: true, attendance: true, fees: true,
    exams: true, homework: true, timetable: true, leave: true
  };

  readonly tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'attendance', label: 'Attendance', icon: 'fact_check' },
    { id: 'fees', label: 'Fees', icon: 'payments' },
    { id: 'exams', label: 'Exams', icon: 'quiz' },
    { id: 'homework', label: 'Homework', icon: 'assignment' },
    { id: 'leave', label: 'Leave', icon: 'event_busy' },
    { id: 'timetable', label: 'Timetable', icon: 'schedule' }
  ];

  get visibleTabs() { return this.tabs.filter(t => this.permissions[t.id]); }

  /**
   * Executes the operation: switchView
   * Parameters: view: string
   * Rationale: Standard operational controller for the active view.
   */
  switchView(view: string): void {
    if (this.permissions[view]) {
      this.currentView = view;
      this.loadViewData(view);
    }
  }

  // ─── Session ──────────────────────────────────────────────────────────────
  schoolName = '';
  academicYear = '';
  parentEmail = '';   // UserID = email used as FatherEmail / MotherEmail
  schoolId = '';

  // ─── Academic Year ───────────────────────────────────────────────────────────
  academicYears: Array<{ ID: string; Name: string }> = [];
  selectedAcademicYearId = '';

  /**
   * Executes the operation: getUserName
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  getUserName(): string { return sessionStorage.getItem('UserName') || sessionStorage.getItem('email') || 'Parent'; }
  /**
   * Executes the operation: getUserInitials
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  getUserInitials(): string {
    const n = this.getUserName().trim().split(/[\s@]+/);
    return n.length >= 2 ? (n[0][0] + n[1][0]).toUpperCase() : this.getUserName().substring(0, 2).toUpperCase();
  }
  /**
   * Executes the operation: logout
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  logout(): void { sessionStorage.clear(); this.router.navigate(['/signin']); }

  // ─── Children ─────────────────────────────────────────────────────────────
  childrenList: any[] = [];
  selectedChildId = '';
  selectedChild: any = null;

  /**
   * Executes the operation: selectChild
   * Parameters: childId: string
   * Rationale: Standard operational controller for the active view.
   */
  selectChild(childId: string): void {
    this.selectedChildId = childId;
    this.selectedChild = this.childrenList.find(c => c.id === childId) || null;
    if (this.selectedChild) {
      this.studentProfile = this.buildProfile(this.selectedChild);
      // Save to session for Homework component to use
      sessionStorage.setItem('SelectedChildID', this.selectedChildId);
      sessionStorage.setItem('SelectedChildData', JSON.stringify(this.selectedChild));
      // Reset cached per-child data
      this.attendanceRecords = []; this.feeRecords = []; this.feeDuesRecords = [];
      this.examRecords = []; this.homeworkRecords = []; this.timetableRaw = [];
      this.loadDashboardData();
      if (this.currentView !== 'dashboard') this.loadViewData(this.currentView);
    }
  }

  // ─── Summary Cards ────────────────────────────────────────────────────────
  summaryCards = [
    { label: 'Attendance', value: '—', subtext: 'This academic year', icon: 'fact_check', color: 'green' },
    { label: 'Fee Balance', value: '—', subtext: 'Outstanding dues', icon: 'payments', color: 'blue' },
    { label: 'Exam Reports', value: '—', subtext: 'Results available', icon: 'quiz', color: 'purple' },
    { label: 'Homework Pending', value: '—', subtext: 'Assignments due', icon: 'assignment', color: 'orange' }
  ];

  // ─── Student Profile ──────────────────────────────────────────────────────
  studentProfile: any = null;

  // ─── Notices ──────────────────────────────────────────────────────────────
  noticesList: any[] = [];

  // ─── Attendance ───────────────────────────────────────────────────────────
  attendanceRecords: any[] = [];
  attendanceSummary = { total: 0, present: 0, absent: 0, percentage: 0 };

  // ─── Exam Detail View ─────────────────────────────────────────────────────
  selectedExamForView: any = null;
  studentReport: any[] = [];
  isExamViewModalOpen = false;

  // ─── Fee Detail View ─────────────────────────────────────────────────────
  viewSyllabus: any = null;
  isViewModalOpen = false;

  get attendanceColor(): string { return this.attendanceSummary.percentage >= 75 ? '#22c55e' : '#ef4444'; }
  get attendanceMessage(): string {
    if (!this.attendanceSummary.total) return 'No attendance data loaded yet.';
    return this.attendanceSummary.percentage >= 75
      ? '✅ Great! Attendance is above the 75% minimum.'
      : '⚠️ Warning! Attendance is below the 75% minimum.';
  }

  /**
   * Executes the operation: getStatusClass
   * Parameters: status: string
   * Rationale: Standard operational controller for the active view.
   */
  getStatusClass(status: string): string {
    const m: Record<string, string> = {
      present: 'badge-present', absent: 'badge-absent',
      'not marked': 'badge-holiday', holiday: 'badge-holiday'
    };
    return m[status.toLowerCase()] || 'badge-holiday';
  }

  // ─── Fees ─────────────────────────────────────────────────────────────────
  feeRecords: any[] = [];
  feeDuesRecords: any[] = [];
  feeTotal = 0; feePaid = 0; feeBalance = 0; feeDuesTotal = 0;
  currentFeeTab = 'dues'; // 'dues' or 'history'

  readonly feeTabs = [
    { id: 'dues', label: 'Fee Dues', icon: 'receipt_long' },
    { id: 'history', label: 'Payment History', icon: 'history' }
  ];

  /**
   * Executes the operation: switchFeeTab
   * Parameters: tab: string
   * Rationale: Standard operational controller for the active view.
   */
  switchFeeTab(tab: string): void {
    this.currentFeeTab = tab;
  }

  /**
   * Executes the operation: downloadReceipt
   * Parameters: receiptNo: string
   * Rationale: Standard operational controller for the active view.
   */
  downloadReceipt(receiptNo: string): void {
    // Find the payment record with this receipt number
    const payment = this.feeRecords.find(f => f.receiptNo === receiptNo);
    if (!payment) return;

    // Get payment mode label
    const getPaymentModeLabel = (mode: string): string => {
      const m = (mode || '').toString().trim().toLowerCase();
      if (m === '1' || m === 'cash') return 'Cash';
      if (m === '2' || m === 'upi') return 'UPI';
      if (m === '4' || m === 'card') return 'Card';
      if (m === '3' || m === 'cheque') return 'Cheque';
      return mode || '-';
    };

    const paymentModeLabel = getPaymentModeLabel(payment.paymentMode);
    const isUpiOrCard = paymentModeLabel.toLowerCase() === 'upi' || paymentModeLabel.toLowerCase() === 'card';
    const isCheque = paymentModeLabel.toLowerCase() === 'cheque';

    // Generate receipt HTML matching Fee Collection format
    const receiptHtml = `
      <html>
        <head>
          <title>Fee Receipt</title>
          <style>
            @page {
              size: A4;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            body {
              margin: 0;
              padding: 0;
              font-family: "Segoe UI", Arial, sans-serif;
              color: #111;
              background: #fff;
              font-size: 11pt;
              line-height: 1.35;
            }

            .receipt-box {
              border: 1.5px solid #111;
              border-radius: 8px;
              padding: 14px;
              max-width: 100%;
              page-break-inside: avoid;
            }

            .header {
              position: relative;
              min-height: 78px;
              margin-bottom: 8px;
              padding-bottom: 8px;
              border-bottom: 1.5px solid #111;
            }

            .logo {
              position: absolute;
              left: 0;
              top: 0;
            }

            .logo img {
              height: 60px;
              width: auto;
            }

            .header-center {
              text-align: center;
              padding-top: 10px;
            }

            .header-center h2 {
              margin: 0;
              font-size: 18pt;
              font-weight: 600;
            }

            .header-center h3 {
              margin: 5px 0 0 0;
              font-size: 14pt;
              font-weight: 600;
            }

            .receipt-top {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }

            .section-title {
              margin: 12px 0 8px 0;
              font-size: 11pt;
              font-weight: 600;
            }

            .receipt-left-line {
              margin-bottom: 4px;
            }

            .receipt-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
            }

            .receipt-table th,
            .receipt-table td {
              border: 1px solid #111;
              padding: 6px 10px;
              text-align: left;
            }

            .receipt-table th {
              background-color: #f2f2f2;
              font-weight: 600;
            }

            .receipt-footer {
              margin-top: 12px;
            }

            .note {
              margin-top: 12px;
              font-size: 10pt;
              font-style: italic;
            }

            hr {
              border: none;
              border-top: 1px solid #111;
              margin: 10px 0;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="receipt-box">
            <!-- HEADER -->
            <div class="header">
              <!-- LOGO -->
              <div class="logo">
                <img src="assets/logo.png" alt="Logo">
              </div>
              <!-- CENTER TEXT -->
              <div class="header-center">
                <h2>${payment.schoolName || this.schoolName}</h2>
                <h3>RECEIPT</h3>
              </div>
            </div>

            <div class="receipt-top">
              <div><b>Receipt No:</b> ${receiptNo}</div>
              <div><b>Date:</b> ${payment.date}</div>
            </div>

            <hr>

            <!-- STUDENT DETAILS -->
            <h5 class="section-title">Student Details</h5>

            <div class="receipt-left-line"><b>Student Name :</b> ${payment.studentName}</div>
            <div class="receipt-left-line"><b>Class :</b> ${payment.className}</div>
            <div class="receipt-left-line"><b>Division :</b> ${payment.divisionName}</div>

            <hr>

            <!-- PAYMENT SUMMARY -->
            <h5 class="section-title">Payment Summary</h5>

            <table class="receipt-table">
              <tr>
                <th>Particulars</th>
                <th>Amount</th>
              </tr>
              <tr>
                <td>Total Fee</td>
                <td>₹ ${payment.totalFee || 0}</td>
              </tr>
              <tr>
                <td>Total Discount</td>
                <td>₹ ${payment.totalDiscount || 0}</td>
              </tr>
              <tr>
                <td>Total Fee Paid</td>
                <td>₹ ${payment.totalFeePaid || 0}</td>
              </tr>
              <tr>
                <td>Fee Paid (This Receipt)</td>
                <td>₹ ${payment.feePaid || payment.amount || 0}</td>
              </tr>
              <tr>
                <td><b>Remaining Amount</b></td>
                <td><b>₹ ${payment.remainingAmount || 0}</b></td>
              </tr>
            </table>

            <hr>

            <!-- PAYMENT DETAILS -->
            <h5 class="section-title">Payment Details</h5>

            <div class="receipt-left-line"><b>Payment Mode :</b> ${paymentModeLabel}</div>
            ${isUpiOrCard ? `<div class="receipt-left-line"><b>Transaction ID :</b> ${payment.transactionID || '-'}</div>` : ''}
            ${isCheque ? `<div class="receipt-left-line"><b>Cheque No :</b> ${payment.transactionID || '-'}</div>` : ''}

            <hr>

            <!-- FOOTER -->
            <div class="receipt-footer">
              <div class="receipt-left-line"><b>Received By :</b> ${payment.createdBy || '-'}</div>
              <div class="receipt-left-line"><b>School Name :</b> ${payment.schoolName || this.schoolName}</div>
            </div>

            <hr>

            <p class="note">
              <b>Note:</b> This is a system-generated receipt. No signature required.
            </p>
          </div>
        </body>
      </html>
    `;

    // Open in new window for printing/saving
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
    }
  }

  /**
   * Executes the operation: getFeeStatusClass
   * Parameters: status: string
   * Rationale: Standard operational controller for the active view.
   */
  getFeeStatusClass(status: string): string {
    const m: Record<string, string> = {
      paid: 'badge-paid', 'partially paid': 'badge-partial',
      pending: 'badge-due', overdue: 'badge-due'
    };
    return m[status.toLowerCase()] || '';
  }

  /**
   * Executes the operation: getFeeStatus
   * Parameters: fee: any
   * Rationale: Standard operational controller for the active view.
   */
  private getFeeStatus(fee: any): string {
    const paid = parseFloat(fee.amountPaid) || parseFloat(fee.feePaid) || 0;
    const total = parseFloat(fee.totalFee) || parseFloat(fee.amount) || 0;
    if (paid >= total && total > 0) return 'Paid';
    if (paid > 0) return 'Partially Paid';
    const due = new Date(fee.dueDate || fee.paymentDate);
    return due < new Date() ? 'Overdue' : 'Pending';
  }

  // ─── Exams ────────────────────────────────────────────────────────────────
  examRecords: any[] = [];
  examSummary: any = {};

  /**
   * Executes the operation: getGradeClass
   * Parameters: grade: string
   * Rationale: Standard operational controller for the active view.
   */
  getGradeClass(grade: string): string {
    if (!grade || grade === '—') return 'grade-pending';
    if (grade.startsWith('A')) return 'grade-a';
    if (grade.startsWith('B')) return 'grade-b';
    if (grade.startsWith('C')) return 'grade-c';
    return 'grade-d';
  }
  /**
   * Executes the operation: getExamStatusClass
   * Parameters: status: string
   * Rationale: Standard operational controller for the active view.
   */
  getExamStatusClass(status: string): string {
    const m: Record<string, string> = { completed: 'badge-present', upcoming: 'badge-holiday' };
    return m[status.toLowerCase()] || '';
  }
  /**
   * Executes the operation: calcGrade
   * Parameters: marks: any, total: any
   * Rationale: Standard operational controller for the active view.
   */
  private calcGrade(marks: any, total: any): string {
    const pct = (parseFloat(marks) || 0) / (parseFloat(total) || 100) * 100;
    if (pct >= 90) return 'A+'; if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+'; if (pct >= 60) return 'B';
    if (pct >= 50) return 'C'; if (pct >= 40) return 'D'; return 'F';
  }
  /**
   * Executes the operation: getExamStatus
   * Parameters: exam: any
   * Rationale: Standard operational controller for the active view.
   */
  private getExamStatus(exam: any): string {
    if (parseFloat(exam.marks) > 0) return 'Completed';
    return new Date(exam.examDate || exam.date) > new Date() ? 'Upcoming' : 'Not Available';
  }

  /**
   * Executes the operation: viewExamDetails
   * Parameters: exam: any
   * Rationale: Standard operational controller for the active view.
   */
  viewExamDetails(exam: any): void {
    console.log('View exam details:', exam);
    this.selectedExamForView = exam;
    this.fetchExamDetailReport(exam);
  }

  // ─── Fee View Methods (matching Admin fee-collection) ───────────────────────
  viewReview(SyllabusID: string): void {
    this.fetchFeeDetailsByID(SyllabusID, 'view');
  };

  /**
   * Executes the operation: printFeeReceiptFromList
   * Parameters: receiptId: string
   * Rationale: Standard operational controller for the active view.
   */
  printFeeReceiptFromList(receiptId: string): void {
    this.fetchFeeDetailsByID(receiptId, 'view');
    setTimeout(() => {
      this.printFeeReceipt();
    }, 500);
  }

  /**
   * Executes the operation: fetchExamDetailReport
   * Parameters: exam: any
   * Rationale: Standard operational controller for the active view.
   */
  fetchExamDetailReport(exam: any): void {
    console.log('Fetching exam details for exam:', exam);

    const classId = this.selectedChild?.classId || '';
    const divisionId = this.selectedChild?.divisionId || '';

    // Use ExamID (integer) instead of ExamType (string)
    const examId = exam.examId || exam.ExamID || exam.examID;
    console.log('Fetching exam details with ExamID:', examId);

    // Clear previous data
    this.studentReport = [];
    this.selectedExamForView = null;

    // Use SAME API as Admin examresults - Tbl_ExamMarks_CRUD_Operations with Flag '10'
    const requestData = {
      SchoolID: this.schoolId || '',
      AcademicYear: this.selectedAcademicYearId || '',
      Class: classId || '',
      Division: divisionId || '',
      ExamID: examId || '',
      AdmissionID: this.selectedChildId || '',
      Flag: '10'
    };

    console.log('API request data:', requestData);

    this.parentService.getExamMarkDetail(requestData).subscribe(
      (response: any) => {
        console.log('Exam detail report response:', response);

        if (response && Array.isArray(response.data) && response.data.length > 0) {
          // Use EXACT SAME mapping from Admin examresults FetchMarkDetailReport
          this.studentReport = response.data.map((item: any) => ({
            ID: item.id,
            Name: item.studentName,
            AdmissionID: item.admissionID,
            SubjectName: item.subjectName,
            ExamType: item.examName || item.examType || item.examTypeName,
            SubjectResult: item.subjectResult,
            SubjectPercentage: item.subjectPercentage,
            TotalMarks: item.totalMarks,
            TotalMaxMarks: item.totalMaxMarks,
            TotalPercentage: item.totalPercentage,
            ExamDuration: item.examDuration,
            NoofQuestion: item.noofQuestion,
            Instructions: item.instructions,
            Class: item.className,
            MaxMarks: item.maxMarks,
            Divisions: item.divisionName,
            SchoolName: item.schoolName,
            AcademicYearName: item.academicYearName,
            SubjectMarks: item.subjectMarks
          }));

          console.log('Mapped student report:', this.studentReport);

          if (this.studentReport.length > 0) {
            // Set selected exam for view with exam details
            this.selectedExamForView = {
              ...exam,
              ...this.studentReport[0], // Add student report details
              SchoolName: this.studentReport[0].SchoolName,
              AcademicYearName: this.studentReport[0].AcademicYearName,
              TotalMarks: this.studentReport[0].TotalMarks,
              TotalMaxMarks: this.studentReport[0].TotalMaxMarks,
              TotalPercentage: this.studentReport[0].TotalPercentage
            };

            console.log('Selected exam for view:', this.selectedExamForView);
            this.isExamViewModalOpen = true;
          }
        } else {
          console.log('No exam details found');
          this.studentReport = [];
        }
      },
      error => {
        console.error('Error fetching exam details:', error);
        this.studentReport = [];
      }
    );
  }

  // ─── Fee Details Methods ─────────────────────────────────────────────────────
  viewFeeDetails(receiptId: string): void {
    console.log('View fee details for receipt:', receiptId);
    this.fetchFeeDetailsByID(receiptId, 'view');
  }

  /**
   * Executes the operation: fetchFeeDetailsByID
   * Parameters: receiptId: string, mode: 'view' | 'edit'
   * Rationale: Standard operational controller for the active view.
   */
  fetchFeeDetailsByID(receiptId: string, mode: 'view' | 'edit'): void {
    console.log('Fetching fee details for receipt:', receiptId);

    // Use the exact same method as Admin fee-collection
    const data = {
      ID: receiptId,
      Flag: "3"
    };

    this.parentService.getFeeDetails(data).subscribe(
      (response: any) => {
        console.log('Fee details response:', response);

        const item = response?.data?.[0];
        if (!item) {
          console.error('No fee details found');
          return;
        }

        if (mode === 'view') {
          this.viewSyllabus = {
            ID: item.id,
            ReceiptNo: item.receiptNo,
            SchoolID: item.schoolID,
            AcademicYear: item.academicYear,
            Student: item.student,
            Class: item.class,
            Division: item.division,
            FeeCategory: item.feeCategory,
            AmountPaid: item.amountPaid,
            PaymentDate: this.formatDateDDMMYYYY(item.paymentDate),
            PaymentMode: item.paymentMode,
            TransactionID: item.transactionID,
            SchoolName: item.schoolName,
            AcademicYearName: item.academicYearName,
            ClassName: item.className,
            DivisionName: item.divisionName,
            StudentName: item.studentName,
            FeeCategoryName: item.feeCategoryName,
            TotalFee: item.totalFee,
            TotalDiscount: item.totalDiscount,
            TotalFeePaid: item.totalFeePaid,
            FeePaid: item.feePaid,
            NetPayable: item.netPayable,
            RemainingAmount: item.remainingAmount,
            CreatedBy: item.createdBy
          };
          console.log('Mapped viewSyllabus:', this.viewSyllabus);
          this.isViewModalOpen = true;
        }
      },
      error => {
        console.error('Error fetching fee details:', error);
      }
    );
  }

  /**
   * Executes the operation: mapFeeDetails
   * Parameters: item: any
   * Rationale: Standard operational controller for the active view.
   */
  private mapFeeDetails(item: any): void {
    this.viewSyllabus = {
      ID: item.id,
      ReceiptNo: item.receiptNo,
      SchoolID: item.schoolID,
      AcademicYear: item.academicYear,
      Student: item.student,
      Class: item.class,
      Division: item.division,
      FeeCategory: item.feeCategory,
      AmountPaid: item.amountPaid,
      PaymentDate: this.formatDateDDMMYYYY(item.paymentDate),
      PaymentMode: item.paymentMode,
      TransactionID: item.transactionID,
      SchoolName: item.schoolName,
      AcademicYearName: item.academicYearName,
      ClassName: item.className,
      DivisionName: item.divisionName,
      StudentName: item.studentName,
      FeeCategoryName: item.feeCategoryName,
      TotalFee: item.totalFee,
      TotalDiscount: item.totalDiscount,
      TotalFeePaid: item.totalFeePaid,
      FeePaid: item.feePaid,
      NetPayable: item.netPayable,
      RemainingAmount: item.remainingAmount,
      CreatedBy: item.createdBy
    };
  }

  // ─── Fee Receipt Helper Methods (matching Admin fee-collection) ───────────────
  getReceiptPaymentModeLabel(): string {
    const rawMode = this.viewSyllabus?.PaymentMode;
    return this.getPaymentModeDisplayValue(rawMode);
  }

  /**
   * Executes the operation: getPaymentModeDisplayValue
   * Parameters: rawMode: any
   * Rationale: Standard operational controller for the active view.
   */
  private getPaymentModeDisplayValue(rawMode: any): string {
    const mode = (rawMode ?? '').toString().trim().toLowerCase();
    if (mode === '1' || mode === 'cash') return 'Cash';
    if (mode === '2' || mode === 'upi') return 'UPI';
    if (mode === '4' || mode === 'card') return 'Card';
    if (mode === '3' || mode === 'cheque') return 'Cheque';
    return rawMode || '-';
  }

  /**
   * Executes the operation: isReceiptUpiOrCardMode
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  isReceiptUpiOrCardMode(): boolean {
    const mode = this.getReceiptPaymentModeLabel().toLowerCase();
    return mode === 'upi' || mode === 'card';
  }

  /**
   * Executes the operation: isReceiptChequeMode
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  isReceiptChequeMode(): boolean {
    return this.getReceiptPaymentModeLabel().toLowerCase() === 'cheque';
  }

  /**
   * Executes the operation: getReceiptPaymentReferenceValue
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  getReceiptPaymentReferenceValue(): string {
    const value = this.viewSyllabus?.TransactionID;
    return value && value.toString().trim() ? value : '-';
  }

  /**
   * Executes the operation: closeModal
   * Parameters: type: 'view' | 'status'
   * Rationale: Standard operational controller for the active view.
   */
  closeModal(type: 'view' | 'status') {
    if (type === 'view') {
      this.isViewModalOpen = false;
      this.viewSyllabus = null;
    }
  }

  /**
   * Executes the operation: formatDateDDMMYYYY
   * Parameters: date: string
   * Rationale: Standard operational controller for the active view.
   */
  formatDateDDMMYYYY(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Executes the operation: printFeeReceipt
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  printFeeReceipt(): void {
    const content = document.getElementById('receiptSection')?.innerHTML;

    const win = window.open('', '', 'width=900,height=700');

    win?.document.write(`
      <html>
        <head>
          <title>Fee Receipt</title>
          <style>
            @page {
              size: A4;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            body {
              margin: 0;
              padding: 0;
              font-family: "Segoe UI", Arial, sans-serif;
              color: #111;
              background: #fff;
              font-size: 11pt;
              line-height: 1.35;
            }

            .receipt-box {
              border: 1.5px solid #111;
              border-radius: 8px;
              padding: 14px;
              max-width: 100%;
              page-break-inside: avoid;
            }

            .header {
              position: relative;
              min-height: 78px;
              margin-bottom: 8px;
              padding-bottom: 8px;
              border-bottom: 1.5px solid #111;
            }

            .logo {
              position: absolute;
              left: 0;
              top: 0;
            }

            .logo img {
              height: 62px;
              width: auto;
              object-fit: contain;
            }

            .header-center {
              text-align: center;
              padding: 0 72px;
            }

            .header-center h2 {
              margin: 0;
              font-size: 18pt;
              font-weight: 700;
              letter-spacing: 0.2px;
              color: #111;
            }

            .header-center h3 {
              margin: 3px 0 0;
              font-size: 11pt;
              font-weight: 700;
              letter-spacing: 1.4px;
              color: #111;
            }

            .receipt-top {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              margin: 6px 0 4px;
              font-size: 10.5pt;
              font-weight: 600;
            }

            hr {
              border: 0;
              border-top: 1px solid #b5b5b5;
              margin: 10px 0;
            }

            .section-title {
              margin: 0 0 6px;
              font-size: 11pt;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.7px;
              color: #111;
            }

            .receipt-left-line {
              margin: 3px 0;
              font-size: 10.5pt;
              word-break: break-word;
            }

            .receipt-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
              page-break-inside: avoid;
            }

            .receipt-table th,
            .receipt-table td {
              border: 1px solid #111;
              padding: 7px 8px;
              font-size: 10pt;
              vertical-align: middle;
            }

            .receipt-table th {
              font-weight: 700;
              text-align: left;
              background: #f2f2f2;
            }

            .receipt-footer {
              page-break-inside: avoid;
            }

            .note {
              margin: 4px 0 0;
              font-size: 9.5pt;
              color: #222;
            }
          </style>
        </head>
  
        <body onload="window.print(); window.close();">
          ${content}
        </body>
      </html>
    `);

    win?.document.close();
  }

  // Print exam marksheet (matching Admin examresults)
  printMarksheet(): void {
    const content = document.getElementById('marksheetContent')?.innerHTML;
    if (!content) return;

    console.log('Printing marksheet with content length:', content.length);

    const printWindow = window.open('', '', 'width=900,height=700');
    printWindow?.document.write(`
      <html>
        <head>
          <title>Exam Results</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              margin: 0;
              background: white;
            }
            .text-center { text-align: center; }
            .text-md-end { text-align: right; }
            .fw-bold { font-weight: bold; }
            .mb-0 { margin-bottom: 0; }
            .mt-3 { margin-top: 1rem; }
            .mt-4 { margin-top: 1.5rem; }
            .border { border: 1px solid #dee2e6; }
            .bg-light { background-color: #f8f9fa; }
            .p-3 { padding: 1rem; }
            .rounded { border-radius: 0.375rem; }
            .table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 1rem;
            }
            th, td { 
              border: 1px solid #dee2e6; 
              padding: 8px; 
              text-align: left; 
              vertical-align: middle;
            }
            th { 
              background-color: #f2f2f2; 
              font-weight: bold;
            }
            .text-start { text-align: left; }
            .fw-semibold { font-weight: 600; }
            .text-success { color: #198754; font-weight: bold; }
            .text-danger { color: #dc3545; font-weight: bold; }
            .fw-bold { font-weight: 700; }
            .fw-bolder { font-weight: 800; }
            .table-dark { background-color: #343a40; color: white; }
            .table-dark th { background-color: #343a40; color: white; border-color: #454d55; }
            .exam-line { 
              text-align: center; 
              margin: 1rem 0; 
              padding: 0.5rem;
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 0.25rem;
            }
            .exam-line span {
              font-weight: bold;
              font-size: 1.1rem;
            }
            hr { 
              border: 0; 
              border-top: 1px solid #dee2e6; 
              margin: 1rem 0; 
            }
            @media print {
              body { padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.print();
  }

  // Final result calculation (matching Admin examresults)
  getFinalResult(): string {
    if (!this.studentReport || this.studentReport.length === 0) {
      return 'FAIL';
    }

    const hasFail = this.studentReport.some(
      x => (x.SubjectResult || '').toUpperCase() === 'FAIL'
    );

    return hasFail ? 'FAIL' : 'PASS';
  }

  // ─── Homework ─────────────────────────────────────────────────────────────
  homeworkRecords: any[] = [];
  homeworkSummary: any = {};

  /**
   * Executes the operation: getHomeworkStatusClass
   * Parameters: status: string
   * Rationale: Standard operational controller for the active view.
   */
  getHomeworkStatusClass(status: string): string {
    const m: Record<string, string> = { submitted: 'badge-present', pending: 'badge-due', overdue: 'badge-absent' };
    return m[status.toLowerCase()] || '';
  }
  /**
   * Executes the operation: getHomeworkStatus
   * Parameters: hw: any
   * Rationale: Standard operational controller for the active view.
   */
  private getHomeworkStatus(hw: any): string {
    if (hw.submittedDate || hw.submissionDate) return 'Submitted';
    const due = new Date(hw.dueDate || hw.endDate);
    return due < new Date() ? 'Overdue' : 'Pending';
  }

  // ─── Timetable ────────────────────────────────────────────────────────────
  timetableRaw: any[] = [];
  timetableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  timetableGrid: any[] = [];
  periodHeaders: string[] = [];
  todaysSchedule: any[] = [];
  currentDay = '';
  subjectsList: any[] = []; // For mapping subject IDs to names
  staffList: any[] = [];    // For mapping staff IDs to names
  workingDays: any[] = [];  // For mapping dayID to day names

  /**
   * Executes the operation: getTimetableCell
   * Parameters: row: any, day: string
   * Rationale: Standard operational controller for the active view.
   */
  getTimetableCell(row: any, day: string): string { return row[day] || '—'; }

  /**
   * Executes the operation: getTimetableSubject
   * Parameters: day: string, period: number
   * Rationale: Standard operational controller for the active view.
   */
  getTimetableSubject(day: string, period: number): string {
    const entry = this.timetableRaw.find(t =>
      t.day === day && t.period === period
    );
    return entry?.subject || '';
  }

  /**
   * Executes the operation: getTimetableTime
   * Parameters: day: string, period: number
   * Rationale: Standard operational controller for the active view.
   */
  getTimetableTime(day: string, period: number): string {
    const entry = this.timetableRaw.find(t =>
      t.day === day && t.period === period
    );
    return entry?.time || '';
  }

  /**
   * Executes the operation: getTimetableStaff
   * Parameters: day: string, period: number
   * Rationale: Standard operational controller for the active view.
   */
  getTimetableStaff(day: string, period: number): string {
    const entry = this.timetableRaw.find(t =>
      t.day === day && t.period === period
    );
    return entry?.teacher || '';
  }

  /**
   * Executes the operation: getDayName
   * Parameters: val: any
   * Rationale: Standard operational controller for the active view.
   */
  private getDayName(val: any): string {
    const map: Record<string, string> = {
      '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday', '7': 'Sunday'
    };
    if (typeof val === 'string' && isNaN(+val)) return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
    return map[String(val)] || 'Monday';
  }

  /**
   * Executes the operation: buildTimetableGrid
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private buildTimetableGrid(): void {
    // Get unique days from timetable data (like Admin view)
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const uniqueDays = [...new Set(this.timetableRaw.map(t => t.day))].sort((a, b) => {
      return dayOrder.indexOf(a) - dayOrder.indexOf(b);
    });

    // Determine number of periods from the data
    const maxPeriod = this.timetableRaw.length > 0
      ? Math.max(...this.timetableRaw.map(t => t.period || 0))
      : 6;

    // Generate period headers
    this.periodHeaders = Array.from({ length: maxPeriod }, (_, i) => `Period ${i + 1}`);

    // Build grid - days as rows (only days with data), periods as columns
    this.timetableGrid = uniqueDays.map(day => {
      const row: any = { day };
      for (let i = 1; i <= maxPeriod; i++) {
        const entry = this.timetableRaw.find(t => t.day === day && t.period === i);
        row[`period${i}`] = entry || null;
      }
      return row;
    });

    this.todaysSchedule = this.timetableRaw.filter(p => p.day === this.currentDay);
  }

  // ─── Loading flags ────────────────────────────────────────────────────────
  loadingChildren = true;
  loadingAttendance = false;
  loadingFees = false;
  loadingExams = false;
  loadingHomework = false;
  loadingTimetable = false;
  noChildrenFound = false;
  debugInfo = '';   // shown in UI to help diagnose

  // ─── Leave Management ────────────────────────────────────────────────────────
  leaveApplications: LeaveApplication[] = [];
  leaveBalance: LeaveBalance | null = null;
  leaveForm!: FormGroup;
  dynamicLeaveTypes: string[] = [];
  leaveStatuses = Object.values(LeaveStatus);
  isSubmittingLeave = false;
  selectedLeaveForView: LeaveApplication | null = null;
  showLeaveForm = false;
  currentLeaveTab = 'history';
  loadingLeaveTypes = false;
  loadingLeaveHistory = false;
  showLeaveConfirmModal = false;
  pendingLeaveApplication: LeaveApplication | null = null;

  readonly leaveTabs = [
    { id: 'history', label: 'Leave History', icon: 'history' },
    { id: 'apply', label: 'Apply Leave', icon: 'add_circle' }
  ];

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  constructor(
    private router: Router,
    private menuService: MenuServiceService,
    public loader: LoaderService,
    private parentService: ParentServiceService,
    private leaveService: LeaveService,
    private leaveBalancePolicyService: LeaveBalancePolicyService,
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private fileService: FileService
  ) {
    this.initializeLeaveForm();
  }

  /**
   * Lifecycle hook: Initializes component parameters and loads default page datasets.
   */
  ngOnInit(): void {
    this.schoolName = sessionStorage.getItem('schoolName') || '';
    this.academicYear = sessionStorage.getItem('AcademicYear') || '';
    this.parentEmail = sessionStorage.getItem('UserID') || sessionStorage.getItem('email') || '';
    this.schoolId = sessionStorage.getItem('SchoolID') || sessionStorage.getItem('schoolId') || '';

    this.debugInfo = `parentEmail=${this.parentEmail} | schoolId=${this.schoolId}`;
    console.log('[ParentDashboard] Session:', this.debugInfo);
    console.log('[ParentDashboard] ALL sessionStorage keys:',
      Object.keys(sessionStorage).map(k => `${k}=${sessionStorage.getItem(k)}`).join(', '));

    const dayIdx = new Date().getDay();
    this.currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIdx];

    // Safety timeout – if still loading after 20s, show error
    setTimeout(() => {
      if (this.loadingChildren) {
        console.error('[ParentDashboard] TIMEOUT: still loading after 20s');
        this.loadingChildren = false;
        this.noChildrenFound = true;
        this.debugInfo += ' | TIMEOUT after 20s';
      }
    }, 20000);

    this.fetchAcademicYears();
    this.loadNotices();
  }

  // ─── Academic Year Methods ───────────────────────────────────────────────────
  private fetchAcademicYears(): void {
    if (!this.schoolId || this.schoolId === '0' || !this.schoolId.trim()) return;

    const tryFetch = (flag: string) => {
      this.parentService.getAcademicYears(this.schoolId, flag).subscribe({
        next: (res: any) => {
          const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.Data) ? res.Data : []);
          if (list.length === 0 && flag === '2') {
            tryFetch('3'); // Try fallback flag
            return;
          }

          this.academicYears = list.map((i: any) => ({
            ID: String(i.id ?? i.ID ?? i.sNo ?? i.sno ?? ''),
            Name: String(i.name ?? i.Name ?? i.academicYear ?? '')
          })).filter((y: any) => y.ID && y.Name);

          // Auto-select first academic year if available
          if (this.academicYears.length > 0 && !this.selectedAcademicYearId) {
            this.selectedAcademicYearId = this.academicYears[0].ID;
            this.academicYear = this.academicYears[0].Name;
            // Save to session for Homework component to use
            sessionStorage.setItem('AcademicYearID', this.selectedAcademicYearId);
            sessionStorage.setItem('AcademicYear', this.academicYear);
            // Load children after academic year is selected
            this.loadChildren();
          }
        },
        error: () => {
          if (flag === '2') tryFetch('3');
          else { this.academicYears = []; }
        }
      });
    };

    tryFetch('2');
  }

  /**
   * Executes the operation: onAcademicYearChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
  onAcademicYearChange(event: Event): void {
    const selectedId = (event.target as HTMLSelectElement).value;
    this.selectedAcademicYearId = selectedId;
    const yearObj = this.academicYears.find(y => y.ID === selectedId);
    this.academicYear = yearObj?.Name || '';

    // Save to session for Homework component to use
    sessionStorage.setItem('AcademicYearID', this.selectedAcademicYearId);
    sessionStorage.setItem('AcademicYear', this.academicYear);

    // Reload all data when academic year changes
    this.reloadAllData();
  }

  /**
   * Executes the operation: reloadAllData
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private reloadAllData(): void {
    // Reset all data arrays
    this.childrenList = [];
    this.attendanceRecords = [];
    this.feeRecords = [];
    this.feeDuesRecords = [];
    this.examRecords = [];
    this.homeworkRecords = [];
    this.timetableRaw = [];
    this.selectedChildId = '';
    this.selectedChild = null;
    this.studentProfile = null;

    // Reset summary cards
    this.summaryCards = [
      { label: 'Attendance', value: '—', subtext: 'This academic year', icon: 'fact_check', color: 'green' },
      { label: 'Fee Balance', value: '—', subtext: 'Outstanding dues', icon: 'payments', color: 'blue' },
      { label: 'Exam Reports', value: '—', subtext: 'Results available', icon: 'quiz', color: 'purple' },
      { label: 'Homework Pending', value: '—', subtext: 'Assignments due', icon: 'assignment', color: 'orange' }
    ];

    // Reload children with new academic year
    this.loadChildren();
  }

  // ─── Load Children (matching applyleave fetchParentChildren logic) ─────────
  private loadChildren(): void {
    this.loadingChildren = true;
    this.noChildrenFound = false;

    if (!this.parentEmail || !this.schoolId) {
      console.warn('[ParentDashboard] No parentEmail or schoolId in session');
      this.loadingChildren = false;
      this.noChildrenFound = true;
      this.debugInfo += ' | MISSING session keys';
      return;
    }

    if (!this.selectedAcademicYearId) {
      console.warn('[ParentDashboard] No academic year selected');
      this.loadingChildren = false;
      this.noChildrenFound = true;
      this.debugInfo += ' | No academic year selected';
      return;
    }

    // Use same API as applyleave: Tbl_StudentParentDetails_CRUD_Operations with Flag 9
    this.parentService.getChildrenList(this.parentEmail, this.schoolId, this.selectedAcademicYearId).subscribe({
      next: (res: any) => {
        console.log('[ParentDashboard] Children API response:', res);
        const list: any[] = res?.data || [];

        this.childrenList = list.map((s: any) => {
          // Handle multiple possible field name variations (matching applyleave)
          const admissionId = s.admissionID || s.AdmissionID || s.admissionno || s.AdmissionNo || s.newAdmissionNo || s.id || s.ID || '';
          const studentName = s.fatherName || s.name || s.Name || s.firstName || s.FirstName || '';
          const lastName = s.lastName || s.LastName || '';
          const fullName = `${studentName} ${lastName}`.trim() || studentName || `Student (${admissionId})`;
          const classId = s.class || s.Class || s.classID || s.ClassID || '';
          const divisionId = s.division || s.Division || s.divisionID || s.DivisionID || '';
          const schoolId = s.schoolID || s.SchoolID || s.schoolId || s.SchoolId || '';

          return {
            id: String(admissionId),
            name: fullName,
            class: classId,
            classId: String(classId),
            division: divisionId,
            divisionId: String(divisionId),
            rollNo: admissionId,
            schoolId: String(schoolId)
          };
        }).filter((c: any) => c.id);

        this.loadingChildren = false;
        console.log('[ParentDashboard] Mapped childrenList:', this.childrenList);

        if (this.childrenList.length > 0) {
          this.selectedChildId = this.childrenList[0].id;
          this.selectedChild = this.childrenList[0];
          this.studentProfile = this.buildProfile(this.selectedChild);
          // Save to session for Homework component to use
          sessionStorage.setItem('SelectedChildID', this.selectedChildId);
          sessionStorage.setItem('SelectedChildData', JSON.stringify(this.selectedChild));
          this.loadDashboardData();
        } else {
          this.noChildrenFound = true;
          this.debugInfo += ' | No children found for this parent email and academic year';
        }
      },
      error: (err) => {
        console.error('[ParentDashboard] Children API error:', err);
        this.loadingChildren = false;
        this.noChildrenFound = true;
        this.debugInfo += ' | API call failed';
      }
    });
  }


  /**
   * Executes the operation: buildProfile
   * Parameters: child: any
   * Rationale: Standard operational controller for the active view.
   */
  private buildProfile(child: any): any {
    return {
      fullName: child.name,
      class: child.class,
      admissionId: child.id,
      rollNo: child.rollNo,
      bloodGroup: 'N/A',
      gender: 'N/A',
      status: 'Active'
    };
  }

  // ─── Dashboard summary ────────────────────────────────────────────────────
  private loadDashboardData(): void {
    this.studentProfile = this.buildProfile(this.selectedChild);
    this.loadDashboardAttendanceSummary();
    this.loadDashboardFeeSummary();
    this.loadDashboardExamSummary();
    this.loadDashboardHomeworkSummary();
  }

  /**
   * Executes the operation: loadDashboardAttendanceSummary
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private loadDashboardAttendanceSummary(): void {
    this.parentService.getChildAttendance(this.selectedChildId, this.schoolId, this.selectedAcademicYearId)
      .pipe(catchError(() => of(null))).subscribe((res: any) => {
        const data: any[] = res?.data ?? [];
        // Client-side filter to ensure only selected child's data is shown
        const filteredData = data.filter((r: any) =>
          r.admissionID === this.selectedChildId || r.AdmissionID === this.selectedChildId
        );
        const total = filteredData.length;
        const present = filteredData.filter((r: any) => r.attendance === '1').length;
        const pct = total > 0 ? Math.round((present / total) * 100) : 0;
        this.summaryCards[0].value = total > 0 ? `${pct}%` : 'N/A';
        this.summaryCards[0].subtext = total > 0 ? `${present}/${total} days present` : 'No data';
        this.attendanceSummary = { total, present, absent: total - present, percentage: pct };
      });
  }

  /**
   * Executes the operation: loadDashboardFeeSummary
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private loadDashboardFeeSummary(): void {
    // Load fee dues for balance info
    this.parentService.getChildFeeDues(this.selectedChildId, this.schoolId, this.selectedAcademicYearId, this.selectedChild?.classId, this.selectedChild?.divisionId)
      .pipe(catchError(() => of(null))).subscribe((res: any) => {
        const data: any[] = res?.data ?? [];
        // Client-side filter to ensure only selected child's data is shown
        const filteredData = data.filter((f: any) =>
          f.student === this.selectedChildId || f.Student === this.selectedChildId ||
          f.admissionNo === this.selectedChildId || f.AdmissionNo === this.selectedChildId
        );
        const duesTotal = filteredData.reduce((s: number, f: any) => s + (parseFloat(f.pendingAmount) || parseFloat(f.dueAmount) || 0), 0);
        this.feeDuesTotal = duesTotal;
        this.feeBalance = duesTotal;
        this.summaryCards[1].value = duesTotal > 0 ? `₹${duesTotal.toLocaleString('en-IN')}` : '₹0';
        this.summaryCards[1].subtext = duesTotal > 0 ? 'Outstanding dues' : 'No dues';
      });
  }

  /**
   * Executes the operation: loadDashboardExamSummary
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private loadDashboardExamSummary(): void {
    this.parentService.getExamTypes(this.schoolId, this.selectedAcademicYearId)
      .pipe(catchError((err) => {
        console.error('Exam types API error:', err);
        this.summaryCards[2].value = '0';
        this.summaryCards[2].subtext = 'No exam results';
        return of(null);
      }))
      .subscribe((res: any) => {
        if (!res || !res.data) {
          this.summaryCards[2].value = '0';
          this.summaryCards[2].subtext = 'No exam results';
          return;
        }
        this.summaryCards[2].value = String(res.data.length);
        this.summaryCards[2].subtext = `${res.data.length} exam types`;
      });
  }

  /**
   * Executes the operation: loadDashboardHomeworkSummary
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private loadDashboardHomeworkSummary(): void {
    this.parentService.getChildHomework(this.selectedChildId, this.schoolId, this.selectedAcademicYearId, this.selectedChild?.classId, this.selectedChild?.divisionId)
      .pipe(catchError(() => of(null))).subscribe((res: any) => {
        const data: any[] = res?.data ?? [];
        // Client-side filter to ensure only selected child's data is shown
        const filteredData = data.filter((h: any) =>
          h.studentAdmissionNo === this.selectedChildId || h.StudentAdmissionNo === this.selectedChildId ||
          h.student === this.selectedChildId || h.Student === this.selectedChildId
        );
        const pending = filteredData.filter((h: any) => !h.submissionDate).length;
        this.summaryCards[3].value = String(pending);
        this.summaryCards[3].subtext = `${filteredData.length} total assignments`;
      });
  }

  // ─── Notices ──────────────────────────────────────────────────────────────
  private loadNotices(): void {
    if (!this.schoolId) return;
    this.parentService.getParentNotices(this.schoolId)
      .pipe(catchError(() => of(null))).subscribe((res: any) => {
        const data: any[] = res?.data ?? (Array.isArray(res) ? res : []);
        // Filter out notices meant for staff (keeping Student/All notices)
        const studentNotices = data.filter((n: any) => {
          const aud = (n.audience || n.Audience || '').toString().trim().toLowerCase();
          return aud !== 'staff';
        });
        this.noticesList = studentNotices.map((n: any) => ({
          title: n.title || n.noticeTitle || 'Notice',
          date: n.date || n.noticeDate || '',
          description: n.description || n.content || ''
        })).slice(0, 5);
      });
  }

  // ─── Per-tab lazy load ────────────────────────────────────────────────────
  private loadViewData(view: string): void {
    switch (view) {
      case 'attendance': this.loadFullAttendance(); break;
      case 'fees': this.loadFullFees(); break;
      case 'exams': this.loadFullExams(); break;
      case 'homework': this.loadFullHomework(); break;
      case 'leave': this.loadLeaveData(); break;
      case 'timetable': this.loadFullTimetable(); break;
    }
  }

  /**
   * Executes the operation: loadFullAttendance
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private loadFullAttendance(): void {
    if (!this.selectedChildId || this.attendanceRecords.length) return;
    this.loadingAttendance = true;
    this.parentService.getChildAttendance(this.selectedChildId, this.schoolId, this.selectedAcademicYearId)
      .pipe(catchError(() => of(null))).subscribe((res: any) => {
        const data: any[] = res?.data ?? [];
        // Client-side filter to ensure only selected child's data is shown
        const filteredData = data.filter((r: any) =>
          r.admissionID === this.selectedChildId || r.AdmissionID === this.selectedChildId
        );
        this.attendanceRecords = filteredData.map((r: any) => ({
          date: r.attendanceDate || r.date || '',
          day: r.attendanceDate ? new Date(r.attendanceDate).toLocaleDateString('en-IN', { weekday: 'long' }) : '',
          status: r.attendance === '1' ? 'Present' : r.attendance === '0' ? 'Absent' : 'Not Marked',
          session: r.session || ''
        }));
        const total = this.attendanceRecords.filter(r => r.status !== 'Not Marked').length;
        const present = this.attendanceRecords.filter(r => r.status === 'Present').length;
        const pct = total > 0 ? Math.round((present / total) * 100) : 0;
        this.attendanceSummary = { total, present, absent: total - present, percentage: pct };
        this.loadingAttendance = false;
      });
  }

  /**
   * Executes the operation: loadFullFees
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private loadFullFees(): void {
    if (!this.selectedChildId || this.feeRecords.length) return;
    this.loadingFees = true;

    const schoolId = sessionStorage.getItem('SchoolID');

    if (schoolId) {
      this.fileService.getSchoolLogo(schoolId).subscribe((res: any) => {
        this.schoolLogoFromDb = res;

        if (res?.filePath) {
          this.logoUrl = this.fileService.getFullLogoFileUrl(res.filePath);
        }
      });
    }
    // Load both payment history and fee dues
    forkJoin({
      payments: this.parentService.getChildFees(this.selectedChildId, this.schoolId, this.selectedAcademicYearId).pipe(catchError(() => of(null))),
      dues: this.parentService.getChildFeeDues(this.selectedChildId, this.schoolId, this.selectedAcademicYearId, this.selectedChild?.classId, this.selectedChild?.divisionId).pipe(catchError(() => of(null)))
    }).subscribe(({ payments, dues }: any) => {
      // Process payment history
      const paymentData: any[] = payments?.data ?? [];
      const filteredPayments = paymentData.filter((f: any) =>
        f.student === this.selectedChildId || f.Student === this.selectedChildId ||
        f.admissionNo === this.selectedChildId || f.AdmissionNo === this.selectedChildId
      );

      // Process fee dues
      const duesData: any[] = dues?.data ?? [];
      const filteredDues = duesData.filter((f: any) =>
        f.student === this.selectedChildId || f.Student === this.selectedChildId ||
        f.admissionNo === this.selectedChildId || f.AdmissionNo === this.selectedChildId
      );

      this.feeDuesRecords = filteredDues.map((f: any) => ({
        term: f.feeCategoryName || f.feeCategory || 'Fee',
        description: f.feeCategoryName || f.feeCategory || 'Fee',
        amount: parseFloat(f.pendingAmount) || parseFloat(f.dueAmount) || 0,
        paid: 0,
        status: 'Pending',
        date: f.dueDate ? new Date(f.dueDate).toLocaleDateString('en-IN') : ''
      }));

      this.feeRecords = filteredPayments.map((f: any) => ({
        ID: f.id || f.ID,
        term: f.feeCategoryName || f.feeCategory || 'Fee',
        description: f.feeCategoryName || f.feeCategory || 'Fee',
        amount: parseFloat(f.amountPaid) || 0,
        paid: parseFloat(f.amountPaid) || 0,
        status: 'Paid',
        date: f.paymentDate ? new Date(f.paymentDate).toLocaleDateString('en-IN') : '',
        receiptNo: f.receiptNo || f.ReceiptNo || '',
        totalFee: parseFloat(f.totalFee) || 0,
        totalDiscount: parseFloat(f.totalDiscount) || 0,
        totalFeePaid: parseFloat(f.totalFeePaid) || 0,
        feePaid: parseFloat(f.feePaid) || parseFloat(f.amountPaid) || 0,
        remainingAmount: parseFloat(f.remainingAmount) || 0,
        paymentMode: f.paymentMode || '',
        transactionID: f.transactionID || '',
        studentName: f.studentName || this.selectedChild?.name || '',
        className: f.className || this.selectedChild?.classId || '',
        divisionName: f.divisionName || this.selectedChild?.divisionId || '',
        schoolName: f.schoolName || this.schoolName || '',
        createdBy: f.createdBy || ''
      }));

      this.feeTotal = this.feeRecords.reduce((s, f) => s + f.amount, 0);
      this.feePaid = this.feeRecords.reduce((s, f) => s + f.paid, 0);
      this.feeDuesTotal = this.feeDuesRecords.reduce((s, f) => s + f.amount, 0);
      this.feeBalance = this.feeDuesTotal;
      this.loadingFees = false;
    });
  }

  /**
   * Executes the operation: loadFullExams
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private loadFullExams(): void {
    if (!this.selectedChild) return;
    this.loadingExams = true;
    this.examRecords = [];

    console.log('Loading exams for selected child:', this.selectedChildId);
    console.log('School ID:', this.schoolId);
    console.log('Academic Year:', this.selectedAcademicYearId);

    // Use SAME API as Admin Exam Results - Tbl_ExamMarks_CRUD_Operations with Flag '10'
    const requestData = {
      SchoolID: this.schoolId || '',
      AcademicYear: this.selectedAcademicYearId || '',
      Class: this.selectedChild.classId || '',
      Division: this.selectedChild.divisionId || '',
      ExamID: '', // Will be set per exam
      AdmissionID: this.selectedChildId || '',
      Flag: '10'
    };

    // First get exam types, then get results for each exam
    this.parentService.getExamTypes(this.schoolId, this.selectedAcademicYearId)
      .pipe(
        catchError((err) => {
          console.error('Exam types API error:', err);
          this.examRecords = [];
          this.examSummary = { total: 0, completed: 0, upcoming: 0, avgPct: 0 };
          this.loadingExams = false;
          return of(null);
        }),
        switchMap((examTypesRes: any) => {
          if (!examTypesRes || !examTypesRes.data) {
            this.examRecords = [];
            this.examSummary = { total: 0, completed: 0, upcoming: 0, avgPct: 0 };
            this.loadingExams = false;
            return of(null);
          }

          const examTypes = examTypesRes.data || [];
          if (examTypes.length === 0) {
            this.examRecords = [];
            this.examSummary = { total: 0, completed: 0, upcoming: 0, avgPct: 0 };
            this.loadingExams = false;
            return of(null);
          }

          const examRequests = examTypes.map((exam: any) => {
            const examId = exam.ID || exam.id;
            const examName = exam.Name || exam.examType || exam.examTypeName;

            // Update request data for this specific exam
            const examRequestData = {
              ...requestData,
              ExamID: examId
            };

            console.log('Fetching results for exam:', examId, examName);

            return this.parentService.getExamMarkDetail(examRequestData).pipe(
              map((res: any) => ({ res, examId, examName })),
              catchError((err) => {
                console.error('Exam results error for exam', examId, err);
                return of(null);
              })
            );
          });

          return forkJoin(examRequests);
        })
      )
      .subscribe((results: any) => {
        if (!results) {
          this.loadingExams = false;
          return;
        }

        console.log('Exam results received:', results);

        const allResults: any[] = [];
        results.forEach((result: any) => {
          if (result && result.res && result.res.data && result.res.data.length > 0) {
            const examData = result.res.data.map((e: any) => ({
              ...e,
              examName: result.examName,
              examId: result.examId
            }));
            allResults.push(...examData);
          }
        });

        console.log('All exam results before filtering:', allResults);

        // Filter for selected child only - strict filtering
        const filteredData = allResults.filter((e: any) => {
          const admissionId = e.admissionID || e.AdmissionID || e.studentAdmissionNo || e.StudentAdmissionNo || e.admissionNo || e.AdmissionNo;
          return admissionId === this.selectedChildId;
        });

        console.log('Filtered exam results for selected child:', filteredData);

        // Map to exam records format matching Admin Exam Results
    const groupedExams = new Map();

filteredData.forEach((e: any) => {

  const examKey =
    `${e.examId || e.ExamID || e.examID}`;

  if (!groupedExams.has(examKey)) {
    groupedExams.set(examKey, []);
  }

  groupedExams.get(examKey).push(e);
});

this.examRecords = Array.from(groupedExams.values()).map((subjects: any[]) => {

  const first = subjects[0];

  const totalMarks =
    parseFloat(first.totalMarks || first.TotalMarks || '0');

  const totalMaxMarks =
    parseFloat(
      first.totalMaxMarks ||
      first.TotalMaxMarks ||
      '100'
    );

  // ✅ IMPORTANT
  // if any subject FAIL => overall FAIL

  const hasFail = subjects.some((s: any) =>
    (s.subjectResult || s.SubjectResult || '')
      .toUpperCase() === 'FAIL'
  );

  return {

    ExamType:
      first.examName ||
      first.ExamType ||
      first.examType ||
      'Exam',

    AdmissionNo:
      first.admissionID ||
      first.AdmissionID ||
      this.selectedChildId,

    StudentName:
      first.studentName ||
      first.StudentName ||
      this.selectedChild?.name ||
      '—',

    Class:
      first.className ||
      first.ClassName ||
      this.selectedChild?.class ||
      '—',

    Division:
      first.divisionName ||
      first.DivisionName ||
      this.selectedChild?.division ||
      '—',

    TotalMarks: totalMarks,

    TotalMaxMarks: totalMaxMarks,

    TotalPercentage:
      first.totalPercentage ||
      first.TotalPercentage ||
      0,

    // ✅ FINAL RESULT
    Result: hasFail ? 'FAIL' : 'PASS',

    examId:
      first.examId ||
      first.ExamID ||
      first.examID,

    SchoolName:
      first.schoolName ||
      first.SchoolName,

    AcademicYearName:
      first.academicYearName ||
      first.AcademicYearName
  };
});

        console.log('Mapped exam records:', this.examRecords);

        const done = this.examRecords.filter(e => e.TotalMarks > 0);
        this.examSummary = {
          total: this.examRecords.length, completed: done.length,
          upcoming: this.examRecords.filter(e => e.TotalMarks === 0).length,
          avgPct: done.length ? Math.round(done.reduce((s, e) => s + e.TotalPercentage, 0) / done.length) : 0
        };

        console.log('Exam summary:', this.examSummary);
        this.loadingExams = false;
      });
  }

  /**
   * Executes the operation: calculateFinalResult
   * Parameters: records: any[]
   * Rationale: Standard operational controller for the active view.
   */
  calculateFinalResult(records: any[]): string {
    return records?.every(
      (item: any) => {
        const subjectResult = item.SubjectResult ?? item.subjectResult;
        const subjectMarks = item.SubjectMarks ?? item.subjectMarks;
        return subjectResult === 'PASS' && !!subjectMarks;
      }
    ) ? 'PASS' : 'FAIL';
  }

  /**
   * Executes the operation: loadFullHomework
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private loadFullHomework(): void {
    if (!this.selectedChildId) return;
    this.loadingHomework = true;
    this.homeworkRecords = []; // Clear to allow reload
    this.parentService.getChildHomework(this.selectedChildId, this.schoolId, this.selectedAcademicYearId, this.selectedChild?.classId, this.selectedChild?.divisionId)
      .pipe(catchError((err) => { console.error('Homework API error:', err); return of(null); }))
      .subscribe((res: any) => {
        console.log('Homework API response:', res);
        const data: any[] = res?.data ?? [];
        console.log('Homework data length:', data.length);
        // Homework is class-based, no student filter needed
        const filteredData = data;
        console.log('Filtered homework data length:', filteredData.length);
        this.homeworkRecords = filteredData.map((h: any) => ({
          title: h.homeworkTitle || h.title || 'Homework',
          subject: h.subjectName || h.subject || '—',
          description: h.description || '',
          dueDate: h.submissionDate ? new Date(h.submissionDate).toLocaleDateString('en-IN') : '',
          status: this.getHomeworkStatus(h)
        }));
        this.homeworkSummary = {
          total: this.homeworkRecords.length,
          pending: this.homeworkRecords.filter(h => h.status === 'Pending').length,
          submitted: this.homeworkRecords.filter(h => h.status === 'Submitted').length,
          overdue: this.homeworkRecords.filter(h => h.status === 'Overdue').length
        };
        this.loadingHomework = false;
      });
  }

  /**
   * Executes the operation: loadFullTimetable
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private loadFullTimetable(): void {
    if (!this.selectedChild) return;
    this.loadingTimetable = true;
    this.timetableRaw = []; // Clear to allow reload
    const classId = this.selectedChild.classId || '';
    const divisionId = this.selectedChild.divisionId || '';
    console.log('Loading timetable for classId:', classId, 'divisionId:', divisionId);

    // Fetch subjects, staff, and working days in parallel
    forkJoin({
      subjects: this.parentService.getSubjectsList(this.schoolId, this.selectedAcademicYearId, classId),
      staff: this.parentService.getStaffList(this.schoolId, this.selectedAcademicYearId),
      workingDays: this.parentService.getWorkingDays(this.schoolId, this.selectedAcademicYearId)
    }).pipe(
      switchMap((results: any) => {
        this.subjectsList = results.subjects?.data || [];
        this.staffList = results.staff?.data || [];
        this.workingDays = results.workingDays?.data || [];
        console.log('Subjects loaded:', this.subjectsList.length);
        console.log('Staff loaded:', this.staffList.length);
        console.log('Working days loaded:', this.workingDays.length);

        // Then fetch timetable
        return this.parentService.getChildTimetable(this.schoolId, this.selectedAcademicYearId, classId, divisionId);
      }),
      catchError((err) => { console.error('Timetable API error:', err); return of(null); })
    )
      .subscribe((res: any) => {
        console.log('Timetable API response:', res);
        const data: any[] = res?.data ?? [];
        console.log('Timetable data length:', data.length);

        // Check if timeTableDetails is available as JSON
        if (data.length > 0 && data[0].timeTableDetails) {
          try {
            const timetableDetails = typeof data[0].timeTableDetails === 'string'
              ? JSON.parse(data[0].timeTableDetails)
              : data[0].timeTableDetails;
            console.log('Parsed timetableDetails:', timetableDetails);

            // Map from timetableDetails array - same as Admin component
            this.timetableRaw = (Array.isArray(timetableDetails) ? timetableDetails : []).map((p: any) => {
              // Map subject ID to subject name - API returns 'name' field
              const subjectObj = this.subjectsList.find((s: any) => s.id === p.subjectID || s.ID === p.subjectID);
              const subjectName = subjectObj?.name || subjectObj?.subjectName || subjectObj?.Name || p.subjectName || p.subject || p.Subject || '—';

              // Map staff ID to staff name
              const staffObj = this.staffList.find((s: any) => s.id === p.staffID || s.ID === p.staffID);
              const staffName = staffObj?.staffName || staffObj?.firstName || staffObj?.name || p.staffName || p.staff || p.Teacher || '—';

              // Map dayID to day name
              const workingDay = this.workingDays.find((w: any) => w.id === p.dayID || w.ID === p.dayID);
              const dayName = workingDay?.day || workingDay?.Day || this.getDayName(p.dayID || p.day || p.Day);

              return {
                day: dayName,
                period: parseInt(p.periodNo || p.period || p.Period) || 1,
                subject: subjectName,
                teacher: staffName,
                time: p.startTime && p.endTime ? `${p.startTime.substring(0, 5)} - ${p.endTime.substring(0, 5)}` : '',
                subjectID: p.subjectID,
                staffID: p.staffID
              };
            });
          } catch (e) {
            console.error('Error parsing timetableDetails:', e);
            this.timetableRaw = [];
          }
        } else {
          // Use direct fields if available - check if data has period details
          console.log('No timeTableDetails, checking direct fields');
          this.timetableRaw = data.map((p: any) => {
            // Map subject ID to subject name - API returns 'name' field
            const subjectObj = this.subjectsList.find((s: any) => s.id === p.subjectID || s.ID === p.subjectID);
            const subjectName = subjectObj?.name || subjectObj?.subjectName || subjectObj?.Name || p.subjectName || p.subject || p.Subject || '—';

            // Map staff ID to staff name
            const staffObj = this.staffList.find((s: any) => s.id === p.staffID || s.ID === p.staffID);
            const staffName = staffObj?.staffName || staffObj?.firstName || staffObj?.name || p.staffName || p.staff || p.Teacher || '—';

            // Map dayID to day name
            const workingDay = this.workingDays.find((w: any) => w.id === p.dayID || w.ID === p.dayID);
            const dayName = workingDay?.day || workingDay?.Day || this.getDayName(p.dayID || p.day || p.Day);

            return {
              day: dayName,
              period: parseInt(p.periodNo || p.period || p.Period) || 1,
              subject: subjectName,
              teacher: staffName,
              time: p.startTime && p.endTime ? `${p.startTime.substring(0, 5)} - ${p.endTime.substring(0, 5)}` : '',
              subjectID: p.subjectID,
              staffID: p.staffID
            };
          });
        }

        console.log('Final timetableRaw:', this.timetableRaw);
        this.buildTimetableGrid();
        this.loadingTimetable = false;
      });
  }

  // ─── Leave Management Methods ─────────────────────────────────────────────────
  private initializeLeaveForm(): void {
    this.leaveForm = this.fb.group({
      fromDate: ['', Validators.required],
      toDate: ['', Validators.required],
      reason: ['', [Validators.required, Validators.minLength(10)]],
      attachment: ['']
    });
  }

  /**
   * Executes the operation: switchLeaveTab
   * Parameters: tab: string
   * Rationale: Standard operational controller for the active view.
   */
  switchLeaveTab(tab: string): void {
    this.currentLeaveTab = tab;
    if (tab === 'apply') {
      this.showLeaveForm = true;
      this.resetLeaveForm();
    } else if (tab === 'history') {
      this.loadLeaveData();
    }
  }

  /**
   * Executes the operation: resetLeaveForm
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  resetLeaveForm(): void {
    this.leaveForm.reset();
    this.selectedLeaveForView = null;
  }

  /**
   * Executes the operation: getPendingLeavesCount
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  getPendingLeavesCount(): number {
    return this.leaveApplications.filter(leave => leave.status === 'Pending').length;
  }

  /**
   * Executes the operation: loadLeaveData
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  loadLeaveData(): void {
    if (!this.selectedChild) return;
    this.leaveApplications = [];
    this.loadingLeaveHistory = true;
    this.loadLeaveHistory();
  }

  /**
   * Executes the operation: loadDynamicLeaveTypes
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  loadDynamicLeaveTypes(): void {
    const schoolId = sessionStorage.getItem('SchoolID');
    console.log('loadDynamicLeaveTypes - SchoolID:', schoolId);
    console.log('loadDynamicLeaveTypes - SchoolName:', this.schoolName);
    console.log('loadDynamicLeaveTypes - AcademicYear:', this.academicYear);

    if (!schoolId) {
      console.error('SchoolID not found in sessionStorage');
      return;
    }

    this.loadingLeaveTypes = true;
    this.leaveService.getLeaveTypes(schoolId, this.academicYear).subscribe({
      next: (response) => {
        console.log('Leave Policy API Response:', response);
        console.log('Response data:', response?.data);
        console.log('Response data type:', typeof response?.data);
        console.log('Is array:', Array.isArray(response?.data));

        // Extract Leave Types from Tbl_leavePolicy_CRUD_Operations response
        if (response?.data && Array.isArray(response.data)) {
          console.log('Data array length:', response.data.length);
          console.log('First item:', response.data[0]);

          // Extract leave types without strict isActive filter
          this.dynamicLeaveTypes = response.data
            .map((item: any) => {
              const leaveType = item.LeaveType || item.leaveType || item.LeaveCategory || item.leaveCategory || '';
              return leaveType;
            })
            .filter((type: string) => type); // Filter out empty values only

          console.log('All leave types from API:', this.dynamicLeaveTypes);
        } else if (response && Array.isArray(response)) {
          console.log('Response is array directly, length:', response.length);
          this.dynamicLeaveTypes = response.map((item: any) => item.LeaveType || item.leaveType).filter((t: string) => t);
        } else {
          this.dynamicLeaveTypes = [];
          console.warn('No valid Leave Categories found in Leave Policy response');
        }
        this.loadingLeaveTypes = false;
      },
      error: (error) => {
        console.error('Error loading leave types from API:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        this.dynamicLeaveTypes = [];
        this.loadingLeaveTypes = false;
      }
    });
  }

  /**
   * Executes the operation: loadLeaveHistory
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private loadLeaveHistory(): void {
    if (!this.selectedChild) return;
    this.loadingLeaveHistory = true;
    this.leaveService.getStudentLeaves(
      this.selectedChild.id,
      this.schoolId,
      ''
    ).subscribe({
      next: (response: any) => {
        this.loadingLeaveHistory = false;
        console.log('[LeaveHistory] Raw API response:', JSON.stringify(response?.data?.[0]));
        if (response?.data && Array.isArray(response.data)) {
          this.leaveApplications = this.mapLeaveData(response.data);
        } else if (Array.isArray(response)) {
          this.leaveApplications = this.mapLeaveData(response);
        } else {
          this.leaveApplications = [];
        }
      },
      error: (error: any) => {
        this.loadingLeaveHistory = false;
        console.error('Error loading leave history:', error);
        this.leaveApplications = [];
      }
    });
  }


  /**
   * Executes the operation: normalizeStatus
   * Parameters: raw: any
   * Rationale: Standard operational controller for the active view.
   */
  private normalizeStatus(raw: any): LeaveStatus {
    const s = (raw || '').toString().trim().toLowerCase();
    if (s === 'approved' || s === 'approve' || s === '2') return LeaveStatus.APPROVED;
    if (s === 'rejected' || s === 'reject' || s === '3') return LeaveStatus.REJECTED;
    if (s === 'cancelled' || s === 'cancel' || s === '4') return LeaveStatus.CANCELLED;
    return LeaveStatus.PENDING;
  }

  /**
   * Executes the operation: mapLeaveData
   * Parameters: data: any[]
   * Rationale: Standard operational controller for the active view.
   */
  private mapLeaveData(data: any[]): LeaveApplication[] {
    return data.map((item: any) => {
      // Scan ALL possible status field names the API might return
      const rawStatus =
        item.ApplicationStatus ??
        item.applicationStatus ??
        item.Status ??
        item.status ??
        item.LeaveStatus ??
        item.leaveStatus ??
        null;
      console.log('[LeaveHistory] item ID:', item.ID || item.id, '| rawStatus:', rawStatus, '| full item keys:', Object.keys(item));
      return {
        id: item.ID || item.id,
        studentId: item.AdmissionNo || item.studentID || item.studentId,
        studentName: item.StudentName || item.studentName || item.ApplicantName || this.selectedChild?.name || '',
        parentId: item.CreatedBy || item.parentID || item.parentId,
        parentEmail: item.parentEmail || this.parentEmail,
        schoolId: item.SchoolID || item.schoolID || item.schoolId,
        schoolName: item.SchoolName || item.schoolName || this.schoolName,
        classId: item.Class || item.classID || item.classId,
        className: item.ClassName || item.className,
        divisionId: item.Division || item.divisionID || item.divisionId,
        divisionName: item.DivisionName || item.divisionName,
        academicYear: item.AcademicYear || item.academicYear,
        leaveType: item.LeaveType || item.leaveType,
        fromDate: item.FromDate || item.fromDate,
        toDate: item.ToDate || item.toDate,
        totalDays: Number(item.NoOfDays || item.totalDays || 0),
        reason: item.Reason || item.reason,
        status: this.normalizeStatus(rawStatus),
        appliedDate: item.CreatedDate || item.appliedDate || new Date().toISOString(),
        approvedBy: item.ApprovedBy || item.approvedBy,
        approvedByName: item.ApprovedByName || item.approvedByName,
        approvedDate: item.approvedDate || undefined,
        rejectedBy: item.RejectedBy || item.rejectedBy,
        rejectionReason: item.AdminRemarks || item.rejectionReason,
        attachment: item.attachment || undefined,
        attachmentName: item.attachmentName || undefined
      };
    });
  }

  /**
   * Executes the operation: submitLeaveApplication
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  submitLeaveApplication(): void {
    if (!this.selectedChild) {
      this.showErrorMessage('Please select a child first.');
      return;
    }
    if (!this.leaveForm.valid) {
      this.leaveForm.markAllAsTouched();
      this.showErrorMessage('Please fill all required fields correctly.');
      return;
    }

    const { fromDate, toDate, reason } = this.leaveForm.value;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const totalDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    this.pendingLeaveApplication = {
      studentId: this.selectedChild.id,
      studentName: this.selectedChild.name,
      parentId: this.parentEmail,
      parentEmail: this.parentEmail,
      schoolId: this.schoolId,
      schoolName: this.schoolName,
      classId: this.selectedChild.classId || this.selectedChild.class || '',
      className: this.selectedChild.className || this.selectedChild.class || '',
      divisionId: this.selectedChild.divisionId || this.selectedChild.division || '',
      divisionName: this.selectedChild.divisionName || this.selectedChild.division || '',
      academicYear: this.selectedAcademicYearId,
      leaveType: LeaveType.PERSONAL_LEAVE,
      fromDate: from.toISOString().split('T')[0],
      toDate: to.toISOString().split('T')[0],
      totalDays: totalDays,
      reason: reason,
      status: LeaveStatus.PENDING,
      appliedDate: new Date().toISOString()
    };
    this.showLeaveConfirmModal = true;
  }

  /**
   * Executes the operation: confirmLeaveSubmit
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  confirmLeaveSubmit(): void {
    if (!this.pendingLeaveApplication) return;
    this.showLeaveConfirmModal = false;
    this.isSubmittingLeave = true;

    this.leaveService.applyLeave(this.pendingLeaveApplication).subscribe({
      next: () => {
        this.isSubmittingLeave = false;
        this.pendingLeaveApplication = null;
        this.resetLeaveForm();
        this.currentLeaveTab = 'history';
        this.loadLeaveData();
      },
      error: (error: any) => {
        this.isSubmittingLeave = false;
        this.pendingLeaveApplication = null;
        console.error('Error submitting leave application:', error);
        this.showErrorMessage('An error occurred while submitting leave application.');
      }
    });
  }

  /**
   * Executes the operation: cancelLeaveConfirm
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  cancelLeaveConfirm(): void {
    this.showLeaveConfirmModal = false;
    this.pendingLeaveApplication = null;
  }

  showCancelModal = false;
  cancelLeaveTarget: LeaveApplication | null = null;
  cancelReason = '';

  /**
   * Executes the operation: openCancelModal
   * Parameters: leave: LeaveApplication
   * Rationale: Standard operational controller for the active view.
   */
  openCancelModal(leave: LeaveApplication): void {
    this.cancelLeaveTarget = leave;
    this.cancelReason = '';
    this.showCancelModal = true;
  }

  /**
   * Executes the operation: closeCancelModal
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  closeCancelModal(): void {
    this.showCancelModal = false;
    this.cancelLeaveTarget = null;
    this.cancelReason = '';
  }

  /**
   * Executes the operation: confirmCancelLeave
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  confirmCancelLeave(): void {
    if (!this.cancelReason.trim()) return;
    const leave = this.cancelLeaveTarget!;
    this.showCancelModal = false;
    this.leaveService.cancelLeave(leave.id!, this.cancelReason.trim()).subscribe({
      next: () => {
        this.cancelLeaveTarget = null;
        this.cancelReason = '';
        this.loadLeaveData();
      },
      error: (error: any) => {
        console.error('Error cancelling leave:', error);
        this.showErrorMessage('An error occurred while cancelling leave application.');
      }
    });
  }

  /**
   * Executes the operation: viewLeaveDetails
   * Parameters: leave: LeaveApplication
   * Rationale: Standard operational controller for the active view.
   */
  viewLeaveDetails(leave: LeaveApplication): void {
    this.selectedLeaveForView = leave;
  }

  /**
   * Executes the operation: closeLeaveDetails
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  closeLeaveDetails(): void {
    this.selectedLeaveForView = null;
  }

  // Utility methods for leave management
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Executes the operation: showSuccessMessage
   * Parameters: message: string
   * Rationale: Standard operational controller for the active view.
   */
  private showSuccessMessage(message: string): void {
    console.log('Success:', message);
  }

  /**
   * Executes the operation: showErrorMessage
   * Parameters: message: string
   * Rationale: Standard operational controller for the active view.
   */
  private showErrorMessage(message: string): void {
    console.error('Error:', message);
    alert(message);
  }

  /**
   * Executes the operation: formatDate
   * Parameters: date: string
   * Rationale: Standard operational controller for the active view.
   */
  formatDate(date: string): string {
    return this.datePipe.transform(date, 'dd MMM yyyy') || '';
  }

  /**
   * Executes the operation: getLeaveStatusClass
   * Parameters: status: any
   * Rationale: Standard operational controller for the active view.
   */
  getLeaveStatusClass(status: any): string {
    const s = (status || '').toString().trim();
    // Handle both PascalCase (API) and any casing
    const sl = s.toLowerCase();
    if (sl === 'approved') return 'badge-approved';
    if (sl === 'rejected') return 'badge-rejected';
    if (sl === 'pending') return 'badge-pending';
    if (sl === 'cancelled') return 'badge-cancelled';
    return 'badge-pending';
  }

  /**
   * Executes the operation: getLeaveStatusColor
   * Parameters: status: LeaveStatus
   * Rationale: Standard operational controller for the active view.
   */
  getLeaveStatusColor(status: LeaveStatus): string {
    return this.leaveService.getLeaveStatusColor(status);
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

  // File upload handler
  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.leaveForm.patchValue({ attachment: file });
    }
  }

  schoolLogoFromDb: any = null;
  logoUrl: string = 'Images/Logo1.jpg';
}
