import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuServiceService } from '../../Services/menu-service.service';
import { LoaderService } from '../../Services/loader.service';
import { ParentServiceService } from '../../Services/parent-service.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './parent-dashboard.component.html',
  styleUrls: ['./parent-dashboard.component.css']
})
export class ParentDashboardComponent implements OnInit {

  // ─── View / Tab Management ────────────────────────────────────────────────
  currentView = 'dashboard';

  permissions: Record<string, boolean> = {
    dashboard: true, attendance: true, fees: true,
    exams: true, homework: true, timetable: true
  };

  readonly tabs = [
    { id: 'dashboard',  label: 'Dashboard',  icon: 'dashboard'  },
    { id: 'attendance', label: 'Attendance',  icon: 'fact_check' },
    { id: 'fees',       label: 'Fees',        icon: 'payments'   },
    { id: 'exams',      label: 'Exams',       icon: 'quiz'       },
    { id: 'homework',   label: 'Homework',    icon: 'assignment' },
    { id: 'timetable',  label: 'Timetable',   icon: 'schedule'   }
  ];

  get visibleTabs() { return this.tabs.filter(t => this.permissions[t.id]); }

  switchView(view: string): void {
    if (this.permissions[view]) {
      this.currentView = view;
      this.loadViewData(view);
    }
  }

  // ─── Session ──────────────────────────────────────────────────────────────
  schoolName   = '';
  academicYear = '';
  parentEmail  = '';   // UserID = email used as FatherEmail / MotherEmail
  schoolId     = '';

  getUserName(): string     { return sessionStorage.getItem('UserName') || sessionStorage.getItem('email') || 'Parent'; }
  getUserInitials(): string {
    const n = this.getUserName().trim().split(/[\s@]+/);
    return n.length >= 2 ? (n[0][0] + n[1][0]).toUpperCase() : this.getUserName().substring(0, 2).toUpperCase();
  }
  logout(): void { sessionStorage.clear(); this.router.navigate(['/signin']); }

  // ─── Children ─────────────────────────────────────────────────────────────
  childrenList: any[] = [];
  selectedChildId = '';
  selectedChild: any = null;

  selectChild(childId: string): void {
    this.selectedChildId = childId;
    this.selectedChild   = this.childrenList.find(c => c.id === childId) || null;
    if (this.selectedChild) {
      this.studentProfile = this.buildProfile(this.selectedChild);
      // Reset cached per-child data
      this.attendanceRecords = []; this.feeRecords = [];
      this.examRecords = []; this.homeworkRecords = []; this.timetableRaw = [];
      this.loadDashboardData();
      if (this.currentView !== 'dashboard') this.loadViewData(this.currentView);
    }
  }

  // ─── Summary Cards ────────────────────────────────────────────────────────
  summaryCards = [
    { label: 'Attendance',       value: '—', subtext: 'This academic year',  icon: 'fact_check', color: 'green'  },
    { label: 'Fee Balance',      value: '—', subtext: 'Outstanding dues',    icon: 'payments',   color: 'blue'   },
    { label: 'Exam Reports',     value: '—', subtext: 'Results available',   icon: 'quiz',       color: 'purple' },
    { label: 'Homework Pending', value: '—', subtext: 'Assignments due',     icon: 'assignment', color: 'orange' }
  ];

  // ─── Student Profile ──────────────────────────────────────────────────────
  studentProfile: any = null;

  // ─── Notices ──────────────────────────────────────────────────────────────
  noticesList: any[] = [];

  // ─── Attendance ───────────────────────────────────────────────────────────
  attendanceRecords: any[] = [];
  attendanceSummary = { total: 0, present: 0, absent: 0, percentage: 0 };

  get attendanceColor(): string { return this.attendanceSummary.percentage >= 75 ? '#22c55e' : '#ef4444'; }
  get attendanceMessage(): string {
    if (!this.attendanceSummary.total) return 'No attendance data loaded yet.';
    return this.attendanceSummary.percentage >= 75
      ? '✅ Great! Attendance is above the 75% minimum.'
      : '⚠️ Warning! Attendance is below the 75% minimum.';
  }

  getStatusClass(status: string): string {
    const m: Record<string, string> = {
      present: 'badge-present', absent: 'badge-absent',
      'not marked': 'badge-holiday', holiday: 'badge-holiday'
    };
    return m[status.toLowerCase()] || 'badge-holiday';
  }

  // ─── Fees ─────────────────────────────────────────────────────────────────
  feeRecords: any[] = [];
  feeTotal = 0; feePaid = 0; feeBalance = 0;

  getFeeStatusClass(status: string): string {
    const m: Record<string, string> = {
      paid: 'badge-paid', 'partially paid': 'badge-partial',
      pending: 'badge-due', overdue: 'badge-due'
    };
    return m[status.toLowerCase()] || '';
  }

  private getFeeStatus(fee: any): string {
    const paid  = parseFloat(fee.amountPaid) || parseFloat(fee.feePaid) || 0;
    const total = parseFloat(fee.totalFee)   || parseFloat(fee.amount)  || 0;
    if (paid >= total && total > 0) return 'Paid';
    if (paid > 0) return 'Partially Paid';
    const due = new Date(fee.dueDate || fee.paymentDate);
    return due < new Date() ? 'Overdue' : 'Pending';
  }

  // ─── Exams ────────────────────────────────────────────────────────────────
  examRecords: any[]  = [];
  examSummary: any    = {};

  getGradeClass(grade: string): string {
    if (!grade || grade === '—') return 'grade-pending';
    if (grade.startsWith('A')) return 'grade-a';
    if (grade.startsWith('B')) return 'grade-b';
    if (grade.startsWith('C')) return 'grade-c';
    return 'grade-d';
  }
  getExamStatusClass(status: string): string {
    const m: Record<string, string> = { completed: 'badge-present', upcoming: 'badge-holiday' };
    return m[status.toLowerCase()] || '';
  }
  private calcGrade(marks: any, total: any): string {
    const pct = (parseFloat(marks) || 0) / (parseFloat(total) || 100) * 100;
    if (pct >= 90) return 'A+'; if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+'; if (pct >= 60) return 'B';
    if (pct >= 50) return 'C';  if (pct >= 40) return 'D'; return 'F';
  }
  private getExamStatus(exam: any): string {
    if (parseFloat(exam.marks) > 0) return 'Completed';
    return new Date(exam.examDate || exam.date) > new Date() ? 'Upcoming' : 'Not Available';
  }

  // ─── Homework ─────────────────────────────────────────────────────────────
  homeworkRecords: any[] = [];
  homeworkSummary: any   = {};

  getHomeworkStatusClass(status: string): string {
    const m: Record<string, string> = { submitted: 'badge-present', pending: 'badge-due', overdue: 'badge-absent' };
    return m[status.toLowerCase()] || '';
  }
  private getHomeworkStatus(hw: any): string {
    if (hw.submittedDate || hw.submissionDate) return 'Submitted';
    const due = new Date(hw.dueDate || hw.endDate);
    return due < new Date() ? 'Overdue' : 'Pending';
  }

  // ─── Timetable ────────────────────────────────────────────────────────────
  timetableRaw: any[] = [];
  timetableDays       = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  timetableGrid: any[] = [];
  todaysSchedule: any[] = [];
  currentDay = '';

  getTimetableCell(row: any, day: string): string { return row[day] || '—'; }

  private getDayName(val: any): string {
    const map: Record<string, string> = {
      '1':'Monday','2':'Tuesday','3':'Wednesday','4':'Thursday','5':'Friday','6':'Saturday','7':'Sunday'
    };
    if (typeof val === 'string' && isNaN(+val)) return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
    return map[String(val)] || 'Monday';
  }
  private buildTimetableGrid(): void {
    const pm = new Map<string, any>();
    this.timetableRaw.forEach(p => {
      const key = `${p.period}_${p.time}`;
      if (!pm.has(key)) pm.set(key, { period: `${p.period}`, time: p.time });
      pm.get(key)[p.day] = p.subject;
    });
    this.timetableGrid = Array.from(pm.values());
    this.todaysSchedule = this.timetableRaw.filter(p => p.day === this.currentDay);
  }

  // ─── Loading flags ────────────────────────────────────────────────────────
  loadingChildren   = true;
  loadingAttendance = false;
  loadingFees       = false;
  loadingExams      = false;
  loadingHomework   = false;
  loadingTimetable  = false;
  noChildrenFound   = false;
  debugInfo         = '';   // shown in UI to help diagnose

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  constructor(
    private router: Router,
    private menuService: MenuServiceService,
    public  loader: LoaderService,
    private parentService: ParentServiceService
  ) {}

  ngOnInit(): void {
    this.schoolName   = sessionStorage.getItem('schoolName')   || '';
    this.academicYear = sessionStorage.getItem('academicYear') || '';
    this.parentEmail  = sessionStorage.getItem('UserID') || sessionStorage.getItem('email') || '';
    this.schoolId     = sessionStorage.getItem('SchoolID') || sessionStorage.getItem('schoolId') || '';

    this.debugInfo = `parentEmail=${this.parentEmail} | schoolId=${this.schoolId}`;
    console.log('[ParentDashboard] Session:', this.debugInfo);
    console.log('[ParentDashboard] ALL sessionStorage keys:',
      Object.keys(sessionStorage).map(k => `${k}=${sessionStorage.getItem(k)}`).join(', '));

    const dayIdx = new Date().getDay();
    this.currentDay = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayIdx];

    // Safety timeout – if still loading after 20s, show error
    setTimeout(() => {
      if (this.loadingChildren) {
        console.error('[ParentDashboard] TIMEOUT: still loading after 20s');
        this.loadingChildren = false;
        this.noChildrenFound = true;
        this.debugInfo += ' | TIMEOUT after 20s';
      }
    }, 20000);

    this.loadChildren();
    this.loadNotices();
  }

  // ─── Load Children (try all 3 APIs sequentially) ──────────────────────────
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

    // API 1: Flag=9 with FatherEmail/MotherEmail
    this.parentService.getChildrenList(this.parentEmail, this.schoolId).subscribe({
      next: (res: any) => {
        console.log('[ParentDashboard] API1 response:', res);
        if (this.hasData(res)) {
          this.processChildrenResponse(res);
        } else {
          this.tryApi2();
        }
      },
      error: (err) => {
        console.warn('[ParentDashboard] API1 error, trying API2:', err);
        this.tryApi2();
      }
    });
  }

  private tryApi2(): void {
    this.parentService.getChildrenListAlternative(this.parentEmail, this.schoolId).subscribe({
      next: (res: any) => {
        console.log('[ParentDashboard] API2 response:', res);
        if (this.hasData(res)) {
          this.processChildrenResponse(res);
        } else {
          this.tryApi3();
        }
      },
      error: (err) => {
        console.warn('[ParentDashboard] API2 error, trying API3:', err);
        this.tryApi3();
      }
    });
  }

  private tryApi3(): void {
    this.parentService.getChildrenListThird(this.parentEmail, this.schoolId).subscribe({
      next: (res: any) => {
        console.log('[ParentDashboard] API3 response:', res);
        if (this.hasData(res)) {
          this.processChildrenResponse(res);
        } else {
          this.tryApi4();
        }
      },
      error: (err) => {
        console.warn('[ParentDashboard] API3 error, trying API4:', err);
        this.tryApi4();
      }
    });
  }

  private tryApi4(): void {
    this.parentService.getChildrenListFourth(this.parentEmail, this.schoolId).subscribe({
      next: (res: any) => {
        console.log('[ParentDashboard] API4 response:', res);
        if (this.hasData(res)) {
          this.processChildrenResponse(res);
        } else {
          this.tryApi5();
        }
      },
      error: (err) => {
        console.warn('[ParentDashboard] API4 error, trying API5:', err);
        this.tryApi5();
      }
    });
  }

  private tryApi5(): void {
    this.parentService.getChildrenListFifth(this.parentEmail, this.schoolId).subscribe({
      next: (res: any) => {
        console.log('[ParentDashboard] API5 response:', res);
        if (this.hasData(res)) {
          this.processChildrenResponse(res);
        } else {
          console.warn('[ParentDashboard] All 5 APIs returned no data');
          this.loadingChildren = false;
          this.noChildrenFound = true;
          this.debugInfo += ' | ALL APIs returned empty';
        }
      },
      error: (err) => {
        console.error('[ParentDashboard] API5 error:', err);
        this.loadingChildren = false;
        this.noChildrenFound = true;
        this.debugInfo += ' | ALL APIs failed';
      }
    });
  }

  private hasData(res: any): boolean {
    if (!res) return false;
    // Accept any array-valued key in the response object
    const possibleKeys = ['data','Data','result','Result','Table','table',
      'students','Students','records','Records','list','List','response','items'];
    for (const k of possibleKeys) {
      if (Array.isArray(res[k]) && res[k].length > 0) return true;
    }
    if (Array.isArray(res) && res.length > 0) return true;
    return false;
  }

  private extractData(res: any): any[] {
    if (!res) return [];
    const possibleKeys = ['data','Data','result','Result','Table','table',
      'students','Students','records','Records','list','List','response','items'];
    for (const k of possibleKeys) {
      if (Array.isArray(res[k]) && res[k].length > 0) return res[k];
    }
    if (Array.isArray(res) && res.length > 0) return res;
    return [];
  }

  private processChildrenResponse(res: any): void {
    const data: any[] = this.extractData(res);
    console.log('[ParentDashboard] RAW children response:', JSON.stringify(res).substring(0, 500));
    console.log('[ParentDashboard] Extracted data rows:', data.length);

    this.childrenList = data
      .map((c: any) => ({
        id:         c.newAdmissionNo || c.admissionNo || c.AdmissionNo || c.NewAdmissionNo || c.id || c.ID || '',
        name:       (`${c.firstName || c.FirstName || ''} ${c.lastName || c.LastName || ''}`).trim()
                    || c.studentName || c.StudentName
                    || `Student (${c.newAdmissionNo || c.admissionNo || 'N/A'})`,
        class:      c.className      || c.ClassName      || c.classDivisionName || c.class || '',
        classId:    c.classId        || c.ClassID         || c.ClassId || '',
        division:   c.division       || c.divisionName    || c.Division || '',
        divisionId: c.divisionId     || c.DivisionID      || c.DivisionId || '',
        rollNo:     c.admissionNo    || c.AdmissionNo     || c.newAdmissionNo || '',
        bloodGroup: c.bloodGroup     || c.BloodGroup      || 'N/A',
        gender:     c.gender         || c.Gender          || 'N/A'
      }))
      .filter((c: any) => c.id);

    this.loadingChildren = false;
    console.log('[ParentDashboard] Mapped childrenList:', this.childrenList);

    if (this.childrenList.length > 0) {
      this.selectedChildId = this.childrenList[0].id;
      this.selectedChild   = this.childrenList[0];
      this.studentProfile  = this.buildProfile(this.selectedChild);
      this.loadDashboardData();
    } else {
      this.noChildrenFound = true;
      this.debugInfo += ' | No valid children after mapping (check console for raw data)';
    }
  }

  private buildProfile(child: any): any {
    return {
      fullName:    child.name,
      class:       child.class,
      admissionId: child.id,
      rollNo:      child.rollNo,
      bloodGroup:  child.bloodGroup,
      gender:      child.gender,
      status:      'Active'
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

  private loadDashboardAttendanceSummary(): void {
    this.parentService.getChildAttendance(this.selectedChildId, this.schoolId, this.academicYear)
      .pipe(catchError(() => of(null))).subscribe((res: any) => {
        const data: any[] = res?.data ?? [];
        const total   = data.length;
        const present = data.filter((r: any) => r.attendance === '1').length;
        const pct     = total > 0 ? Math.round((present / total) * 100) : 0;
        this.summaryCards[0].value   = total > 0 ? `${pct}%` : 'N/A';
        this.summaryCards[0].subtext = total > 0 ? `${present}/${total} days present` : 'No data';
        this.attendanceSummary = { total, present, absent: total - present, percentage: pct };
      });
  }

  private loadDashboardFeeSummary(): void {
    this.parentService.getChildFees(this.selectedChildId, this.schoolId, this.academicYear)
      .pipe(catchError(() => of(null))).subscribe((res: any) => {
        const data: any[] = res?.data ?? [];
        const total   = data.reduce((s: number, f: any) => s + (parseFloat(f.totalFee) || 0), 0);
        const paid    = data.reduce((s: number, f: any) => s + (parseFloat(f.amountPaid) || parseFloat(f.feePaid) || 0), 0);
        const balance = total - paid;
        this.feeTotal = total; this.feePaid = paid; this.feeBalance = balance;
        this.summaryCards[1].value   = `₹${balance.toLocaleString('en-IN')}`;
        this.summaryCards[1].subtext = `₹${paid.toLocaleString('en-IN')} paid`;
      });
  }

  private loadDashboardExamSummary(): void {
    this.parentService.getChildExams(this.selectedChildId, this.schoolId, this.academicYear)
      .pipe(catchError(() => of(null))).subscribe((res: any) => {
        const data: any[] = res?.data ?? [];
        const completed = data.filter((e: any) => parseFloat(e.marks) > 0).length;
        this.summaryCards[2].value   = String(completed);
        this.summaryCards[2].subtext = `${data.length - completed} upcoming`;
      });
  }

  private loadDashboardHomeworkSummary(): void {
    this.parentService.getChildHomework(this.selectedChildId, this.schoolId, this.academicYear)
      .pipe(catchError(() => of(null))).subscribe((res: any) => {
        const data: any[] = res?.data ?? [];
        const pending = data.filter((h: any) => !h.submittedDate && !h.submissionDate).length;
        this.summaryCards[3].value   = String(pending);
        this.summaryCards[3].subtext = `${data.length} total assignments`;
      });
  }

  // ─── Notices ──────────────────────────────────────────────────────────────
  private loadNotices(): void {
    if (!this.schoolId) return;
    this.parentService.getParentNotices(this.schoolId)
      .pipe(catchError(() => of(null))).subscribe((res: any) => {
        const data: any[] = res?.data ?? (Array.isArray(res) ? res : []);
        this.noticesList = data.map((n: any) => ({
          title:       n.title       || n.noticeTitle   || 'Notice',
          date:        n.date        || n.noticeDate    || '',
          description: n.description || n.content       || ''
        })).slice(0, 5);
      });
  }

  // ─── Per-tab lazy load ────────────────────────────────────────────────────
  private loadViewData(view: string): void {
    switch (view) {
      case 'attendance': this.loadFullAttendance(); break;
      case 'fees':       this.loadFullFees();       break;
      case 'exams':      this.loadFullExams();      break;
      case 'homework':   this.loadFullHomework();   break;
      case 'timetable':  this.loadFullTimetable();  break;
    }
  }

  private loadFullAttendance(): void {
    if (!this.selectedChildId || this.attendanceRecords.length) return;
    this.loadingAttendance = true;
    this.parentService.getChildAttendance(this.selectedChildId, this.schoolId, this.academicYear)
      .pipe(catchError(() => of(null))).subscribe((res: any) => {
        const data: any[] = res?.data ?? [];
        this.attendanceRecords = data.map((r: any) => ({
          date:    r.attendanceDate || r.date || '',
          day:     r.attendanceDate ? new Date(r.attendanceDate).toLocaleDateString('en-IN', { weekday: 'long' }) : '',
          status:  r.attendance === '1' ? 'Present' : r.attendance === '0' ? 'Absent' : 'Not Marked',
          session: r.session || ''
        }));
        const total   = this.attendanceRecords.filter(r => r.status !== 'Not Marked').length;
        const present = this.attendanceRecords.filter(r => r.status === 'Present').length;
        const pct     = total > 0 ? Math.round((present / total) * 100) : 0;
        this.attendanceSummary = { total, present, absent: total - present, percentage: pct };
        this.loadingAttendance = false;
      });
  }

  private loadFullFees(): void {
    if (!this.selectedChildId || this.feeRecords.length) return;
    this.loadingFees = true;
    this.parentService.getChildFees(this.selectedChildId, this.schoolId, this.academicYear)
      .pipe(catchError(() => of(null))).subscribe((res: any) => {
        const data: any[] = res?.data ?? [];
        this.feeRecords = data.map((f: any) => ({
          term:        f.term || f.termName || '',
          description: f.feeCategoryName || f.feeType || 'Fee',
          amount:      parseFloat(f.totalFee) || 0,
          paid:        parseFloat(f.amountPaid) || parseFloat(f.feePaid) || 0,
          date:        f.paymentDate || '—',
          status:      this.getFeeStatus(f)
        }));
        this.feeTotal   = this.feeRecords.reduce((s, f) => s + f.amount, 0);
        this.feePaid    = this.feeRecords.reduce((s, f) => s + f.paid, 0);
        this.feeBalance = this.feeTotal - this.feePaid;
        this.loadingFees = false;
      });
  }

  private loadFullExams(): void {
    if (!this.selectedChildId || this.examRecords.length) return;
    this.loadingExams = true;
    this.parentService.getChildExams(this.selectedChildId, this.schoolId, this.academicYear)
      .pipe(catchError(() => of(null))).subscribe((res: any) => {
        const data: any[] = res?.data ?? [];
        this.examRecords = data.map((e: any) => ({
          examName:      e.examTypeName || e.examName || 'Exam',
          subject:       e.subjectName || e.subject || '—',
          date:          e.examDate || '—',
          totalMarks:    parseFloat(e.totalMarks) || 100,
          obtainedMarks: parseFloat(e.marks) || 0,
          percentage:    e.marks && e.totalMarks ? Math.round((parseFloat(e.marks) / parseFloat(e.totalMarks)) * 100) : 0,
          grade:         e.grade || this.calcGrade(e.marks, e.totalMarks || 100),
          status:        this.getExamStatus(e)
        }));
        const done = this.examRecords.filter(e => e.status === 'Completed');
        this.examSummary = {
          total: this.examRecords.length, completed: done.length,
          upcoming: this.examRecords.filter(e => e.status === 'Upcoming').length,
          avgPct: done.length ? Math.round(done.reduce((s, e) => s + e.percentage, 0) / done.length) : 0
        };
        this.loadingExams = false;
      });
  }

  private loadFullHomework(): void {
    if (!this.selectedChildId || this.homeworkRecords.length) return;
    this.loadingHomework = true;
    this.parentService.getChildHomework(this.selectedChildId, this.schoolId, this.academicYear)
      .pipe(catchError(() => of(null))).subscribe((res: any) => {
        const data: any[] = res?.data ?? [];
        this.homeworkRecords = data.map((h: any) => ({
          title:        h.title || h.homeworkTitle || 'Homework',
          subject:      h.subjectName || h.subject || '—',
          assignedDate: h.assignedDate || h.startDate || '—',
          dueDate:      h.dueDate || h.endDate || '—',
          description:  h.description || h.details || '',
          status:       this.getHomeworkStatus(h)
        }));
        this.homeworkSummary = {
          total:     this.homeworkRecords.length,
          pending:   this.homeworkRecords.filter(h => h.status === 'Pending').length,
          submitted: this.homeworkRecords.filter(h => h.status === 'Submitted').length,
          overdue:   this.homeworkRecords.filter(h => h.status === 'Overdue').length
        };
        this.loadingHomework = false;
      });
  }

  private loadFullTimetable(): void {
    if (!this.selectedChild || this.timetableRaw.length) return;
    this.loadingTimetable = true;
    const classId    = this.selectedChild.classId    || '';
    const divisionId = this.selectedChild.divisionId || '';
    this.parentService.getChildTimetable(this.schoolId, this.academicYear, classId, divisionId)
      .pipe(catchError(() => of(null))).subscribe((res: any) => {
        const data: any[] = res?.data ?? [];
        this.timetableRaw = data.map((p: any) => ({
          day:     this.getDayName(p.day || p.Day),
          period:  parseInt(p.period || p.Period) || 1,
          subject: p.subjectName || p.Subject || '—',
          teacher: p.staffName   || p.Teacher || '—',
          time:    p.startTime && p.endTime ? `${p.startTime} – ${p.endTime}` : '—'
        }));
        this.buildTimetableGrid();
        this.loadingTimetable = false;
      });
  }
}
