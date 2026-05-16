import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NgClass, NgFor, NgIf, SlicePipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiServiceService } from '../../Services/api-service.service';
import { LoaderService } from '../../Services/loader.service';
import { NgxEchartsModule } from 'ngx-echarts';
import { MenuServiceService, Module, Page } from '../../Services/menu-service.service';
import { Router } from '@angular/router';
import { FULL_ADMIN_MENU } from '../../constants/admin-full-menu';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-group-admin-dashboard',
  standalone: true,
  imports: [
    MatIconModule,
    FormsModule,
    NgxEchartsModule,
    NgIf,
    NgFor,
    NgClass,
    SlicePipe,
    UpperCasePipe
  ],
  templateUrl: './group-admin-dashboard.component.html',
  styleUrl: './group-admin-dashboard.component.css'
})
export class GroupAdminDashboardComponent implements OnInit {

  isMobileNavOpen = false;

  constructor(
    private cd: ChangeDetectorRef,
    private apiurl: ApiServiceService,
    public loader: LoaderService,
    private menuService: MenuServiceService,
    private router: Router
  ) {}

  /* ================= FILTER DATA ================= */

  schoolList: any[] = [];
  academicYearList: any[] = [];
  branchList: any[] = [];

  selectedSchool: any = null;
  selectedAcademicYear: any = null;
  selectedClass: any = null;
  selectedDivision: any = null;
  selectedBranch: any = null;
  selectedDateRange = 'academic_year';
  selectedCompareMode = 'previous_period';
  selectedTimePeriod: string = 'today';

  /* ================= DASHBOARD ================= */

  dashboard: any = {};
  chartTitle = 'Students by Class';

  noticesList: Array<{
    NoticeId: number; Title: string; Description: string;
    NoticeType: string; StartDate: string; EndDate: string;
    SchoolName?: string; AcademicYearName?: string; IsActive?: boolean;
  }> = [];
  noticeSlide = 0;

  quickLinks: Array<{ icon: string; label: string; route: string }> = [];

  menu: Module[] = [];
  private readonly fullAdminMenu: Module[] = FULL_ADMIN_MENU;

  roleId = '';
  roleKey: 'super_admin' | 'school_admin' | 'principal' | 'chairman' | 'staff' | 'parent' | 'student' = 'school_admin';

  kpiCards: Array<{ key: string; label: string; icon: string; accent: string; fallback: string[] }> = [];

  studentsChart: any;
  staffChart: any;
  attendanceChart: any;
  feeChart: any;
  staffDepartmentChart: any;
  roleActivityCards: Array<{ title: string; dataKey: string; icon: string; type: 'people' | 'notice' }> = [];
  drillPath: string[] = ['Network'];
  alerts: Array<{ severity: 'high' | 'medium' | 'low'; title: string; reason: string; action: string }> = [];

  // ── Group Admin: tagged school IDs from sessionStorage ──
  private taggedSchoolIds: string = '';

  /* ================= INIT ================= */

  ngOnInit() {
    this.roleId          = sessionStorage.getItem('RollID')    || '';
    this.taggedSchoolIds = sessionStorage.getItem('schoolIds') || '';

    this.setRoleContext();

    // ── Group Admin (role 10): do NOT restore single schoolId from session ──
    // They select from their tagged schools via the dropdown
    if (this.roleId !== '10') {
      const storedSchoolId = sessionStorage.getItem('schoolId')
                          || sessionStorage.getItem('SchoolID') || '';
      if (storedSchoolId) {
        this.selectedSchool = storedSchoolId;
      }
    }

    this.loadSchools();
    this.loadAcademicYears();
    this.loadDashboard();
    this.loadNotices();
    this.loadMenu();
    this.loadQuickLinks();
  }

  /* ================= ROLE CONTEXT ================= */

  setRoleContext(): void {
    this.roleKey          = this.resolveRoleKey(this.roleId);
    this.kpiCards         = this.getRoleKpis(this.roleKey);
    this.roleActivityCards = this.getRoleActivities(this.roleKey);
  }

  resolveRoleKey(roleId: string): 'super_admin' | 'school_admin' | 'principal' | 'chairman' | 'staff' | 'parent' | 'student' {
    const roleMap: Record<string, any> = {
      '1':  'super_admin',
      '2':  'school_admin',
      '3':  'staff',        // Teaching Staff
      '4':  'staff',        // Driver
      '5':  'student',
      '6':  'parent',
      '7':  'staff',        // Maid
      '8':  'principal',
      '9':  'staff',        // Finance Dept
      '10': 'chairman'      // Group Admin → chairman KPI context
    };
    return roleMap[roleId] || 'school_admin';
  }

  get roleTitle(): string {
    if (this.roleId === '10') return 'Group Admin Dashboard';
    const map: Record<string, string> = {
      super_admin:  'Super Admin Dashboard',
      school_admin: 'School Admin Dashboard',
      principal:    'Principal Dashboard',
      chairman:     'Chairman Dashboard',
      staff:        'Staff Dashboard',
      parent:       'Parent Dashboard',
      student:      'Student Dashboard'
    };
    return map[this.roleKey];
  }

  get roleInsightLine(): string {
    if (this.roleId === '10') {
      return 'Monitor your branch schools — attendance, fee collection, and academic health.';
    }
    const map: Record<string, string> = {
      super_admin:  'Track branch performance, risk flags, and growth trends across the network.',
      chairman:     'Monitor strategic branch health, fee realization, and attendance consistency.',
      school_admin: 'Focus on admissions, staffing coverage, fee flow, and daily operations.',
      principal:    'Track academic quality, attendance reliability, and class-level performance.',
      staff:        'Prioritize today tasks, class actions, and pending academic workflow.',
      parent:       'Follow child attendance, dues, exams, and school communication updates.',
      student:      'Track personal progress, assignments, attendance, and upcoming exams.'
    };
    return map[this.roleKey];
  }

  // Group Admin also needs the school filter (limited to tagged schools only)
  showSchoolFilter(): boolean {
    return this.roleKey === 'super_admin'
        || this.roleKey === 'chairman'
        || this.roleId  === '10';
  }

  private getRoleKpis(role: string): Array<{ key: string; label: string; icon: string; accent: string; fallback: string[] }> {
    const common = {
      students:  { key: 'students',  label: 'Students',  icon: 'groups',       accent: 'kpi-students',  fallback: ['counts.studentsCount']  },
      staff:     { key: 'staff',     label: 'Staff',     icon: 'badge',        accent: 'kpi-staff',     fallback: ['counts.staffCount']     },
      classes:   { key: 'classes',   label: 'Classes',   icon: 'school',       accent: 'kpi-classes',   fallback: ['counts.classCount']     },
      divisions: { key: 'divisions', label: 'Divisions', icon: 'account_tree', accent: 'kpi-divisions', fallback: ['counts.divisionsCount'] }
    };

    switch (role) {
      case 'super_admin':
        return [
          { key: 'schools',  label: 'Schools',  icon: 'domain',          accent: 'kpi-classes',   fallback: ['counts.schoolCount',  'counts.classCount']     },
          { key: 'branches', label: 'Branches', icon: 'account_balance', accent: 'kpi-divisions', fallback: ['counts.branchCount',  'counts.divisionsCount'] },
          common.staff, common.students
        ];
      case 'chairman':
        return [
          { key: 'branches', label: 'Branch Campuses', icon: 'apartment', accent: 'kpi-divisions', fallback: ['counts.branchCount', 'counts.divisionsCount'] },
          common.classes, common.staff, common.students
        ];
      case 'principal':
        return [common.classes, common.divisions, common.staff, common.students];
      case 'staff':
        return [
          { key: 'assignedClasses',   label: 'Assigned Classes', icon: 'class',                accent: 'kpi-classes',   fallback: ['counts.classCount']          },
          { key: 'attendancePercent', label: 'Attendance',       icon: 'fact_check',           accent: 'kpi-divisions', fallback: ['attendancePercent']           },
          { key: 'pendingTasks',      label: 'Pending Tasks',    icon: 'assignment',           accent: 'kpi-staff',     fallback: ['pendingTasks', 'activeUsers'] },
          { key: 'upcomingExams',     label: 'Upcoming Exams',   icon: 'event',                accent: 'kpi-students',  fallback: ['upcomingExams']               }
        ];
      case 'parent':
        return [
          { key: 'childrenCount',     label: 'My Children',    icon: 'family_restroom', accent: 'kpi-classes',   fallback: ['childrenCount', 'counts.studentsCount'] },
          { key: 'attendancePercent', label: 'Attendance',     icon: 'fact_check',      accent: 'kpi-divisions', fallback: ['attendancePercent']                     },
          { key: 'pendingFees',       label: 'Pending Fees',   icon: 'payments',        accent: 'kpi-staff',     fallback: ['pendingFees']                           },
          { key: 'upcomingExams',     label: 'Upcoming Exams', icon: 'event',           accent: 'kpi-students',  fallback: ['upcomingExams']                         }
        ];
      case 'student':
        return [
          { key: 'myClassRank',        label: 'Class Rank',     icon: 'military_tech',        accent: 'kpi-classes',   fallback: ['myClassRank', 'counts.classCount'] },
          { key: 'attendancePercent',  label: 'Attendance',     icon: 'fact_check',           accent: 'kpi-divisions', fallback: ['attendancePercent']                },
          { key: 'pendingAssignments', label: 'Assignments',    icon: 'assignment_turned_in', accent: 'kpi-staff',     fallback: ['pendingAssignments']               },
          { key: 'upcomingExams',      label: 'Upcoming Exams', icon: 'event',                accent: 'kpi-students',  fallback: ['upcomingExams']                    }
        ];
      case 'school_admin':
      default:
        return [common.classes, common.divisions, common.staff, common.students];
    }
  }

  private getRoleActivities(role: string): Array<{ title: string; dataKey: string; icon: string; type: 'people' | 'notice' }> {
    if (role === 'parent') {
      return [
        { title: 'My Children Updates', dataKey: 'childrenUpdates',       icon: 'child_care',       type: 'people' },
        { title: 'Fee Alerts',          dataKey: 'feeAlerts',             icon: 'payments',         type: 'people' },
        { title: 'School Notices',      dataKey: 'notices',               icon: 'campaign',         type: 'notice' }
      ];
    }
    if (role === 'student') {
      return [
        { title: 'My Recent Assessments',  dataKey: 'recentAssessments',    icon: 'grading',           type: 'people' },
        { title: 'Teacher Announcements',  dataKey: 'teacherAnnouncements', icon: 'record_voice_over', type: 'people' },
        { title: 'School Notices',         dataKey: 'notices',              icon: 'campaign',          type: 'notice' }
      ];
    }
    return [
      { title: 'Recent Admissions',   dataKey: 'recentAdmissions', icon: 'person_add', type: 'people' },
      { title: 'Recent Staff Joined', dataKey: 'recentStaff',      icon: 'badge',      type: 'people' },
      { title: 'Latest Notices',      dataKey: 'notices',          icon: 'campaign',   type: 'notice' }
    ];
  }

  /* ================= LOAD SCHOOLS ================= */

  loadSchools() {
    const req: any = { Flag: '2' };

    // Group Admin: only fetch their tagged schools
    if (this.roleId === '10' && this.taggedSchoolIds) {
      req.SchoolIDs = this.taggedSchoolIds;
    }

    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', req).subscribe(res => {
      this.schoolList = (res?.data || []).map((x: any) => ({
        ID:   x.id,
        Name: x.name
      }));

      // Auto-select first school if Group Admin has only one school
      if (this.roleId === '10' && this.schoolList.length === 1 && !this.selectedSchool) {
        this.selectedSchool = this.schoolList[0].ID;
        this.loadAcademicYears();
        this.loadDashboard();
        this.loadNotices();
      }
    });
  }

  /* ================= LOAD ACADEMIC YEARS ================= */

  loadAcademicYears() {
    // Skip until a school is selected for roles that use the school filter
    if (this.showSchoolFilter() && !this.selectedSchool) {
      return;
    }

    const fetchYears = (flag: '2' | '3') => {
      const req = { SchoolID: this.selectedSchool, Flag: flag };

      this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', req).subscribe(res => {
        const list = (res?.data || []).map((x: any) => ({ ID: x.id, Name: x.name }));

        if (list.length === 0 && flag === '3') {
          fetchYears('2');
          return;
        }

        this.academicYearList = list;

        // Auto-select first year when:
        // - not in school-filter mode (regular roles), OR
        // - Group Admin has already chosen a school
        const shouldAutoSelect = !this.showSchoolFilter()
          || (this.roleId === '10' && !!this.selectedSchool);

        if (this.academicYearList.length > 0 && !this.selectedAcademicYear && shouldAutoSelect) {
          this.selectedAcademicYear = this.academicYearList[0].ID;
          sessionStorage.setItem('ActiveAcademicYearID', this.selectedAcademicYear || '');
          this.loadDashboard();
        }
      });
    };

    fetchYears('2');
  }

  /* ================= FILTER EVENTS ================= */

  onSchoolChange(): void {
    this.selectedAcademicYear = null;
    this.selectedClass        = null;
    this.selectedDivision     = null;
    this.chartTitle           = 'Students by Class';
    this.drillPath            = ['Network'];

    if (this.selectedSchool) {
      this.loadAcademicYears();
    } else {
      this.academicYearList = [];
    }

    this.loadDashboard();
    this.loadNotices();
  }

  onAcademicYearChange(): void {
    this.selectedClass    = null;
    this.selectedDivision = null;
    this.chartTitle       = 'Students by Class';
    this.drillPath        = ['Network'];
    this.loadDashboard();
    this.loadNotices();
  }

  onTimePeriodChange(period: string): void {
    this.selectedTimePeriod = period;
    this.loadDashboard();
  }

  onBranchChange(): void    { this.loadDashboard(); }
  onDateRangeChange(): void  { this.loadDashboard(); }
  onCompareModeChange(): void { this.loadDashboard(); }

  /* ================= LOAD DASHBOARD ================= */

  loadDashboard() {
    const toNullableNumber = (value: any): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const n = Number(value);
      return Number.isNaN(n) ? null : n;
    };

    const request: any = {
      SchoolID:     toNullableNumber(this.selectedSchool),
      AcademicYear: toNullableNumber(this.selectedAcademicYear),
      ClassID:      toNullableNumber(this.selectedClass),
      DivisionID:   toNullableNumber(this.selectedDivision),
      BranchID:     toNullableNumber(this.selectedBranch),
      DateRangeKey: this.selectedTimePeriod,
      CompareMode:  this.selectedCompareMode,
      RoleKey:      this.roleKey,
      UserID:       toNullableNumber(sessionStorage.getItem('UserID'))
    };

    // Group Admin with no single school selected: pass all tagged IDs for aggregate view
    if (this.roleId === '10' && !this.selectedSchool && this.taggedSchoolIds) {
      request.SchoolIDs = this.taggedSchoolIds;
    }

    this.loader.show();

    this.apiurl.post<any>('Dashboard_API', request).subscribe({
      next: (res) => {
        this.loader.hide();
        const normalized = this.normalizeResponse(res?.data || {});
        this.dashboard = normalized;
        this.buildAlerts();
        setTimeout(() => {
          this.buildCharts();
          this.cd.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('Dashboard API Error:', err);
        this.loader.hide();
        this.dashboard = {};
        this.buildCharts();
      }
    });
  }

  normalizeResponse(data: any) {
    if (!data) return {};
    return {
      ...data,
      studentChart: (data.studentChart || []).map((x: any) => ({
        id:           x.ID ?? x.id ?? x.classId ?? x.ClassID ?? 0,
        name:         x.Name ?? x.name ?? x.className ?? x.ClassName ?? 'Unknown',
        studentCount: x.StudentCount ?? x.studentCount ?? x.Count ?? x.total ?? 0
      })),
      staffChart: (data.staffChart || []).map((x: any) => ({
        staffType: x.StaffType ?? x.staffType,
        count:     x.Count     ?? x.count
      })),
      attendance: (data.attendance || []).map((x: any) => ({
        month:      x.Month      ?? x.month,
        attendance: x.Attendance ?? x.attendance
      })),
      fees: (data.fees || []).map((x: any) => ({
        month:  x.Month  ?? x.month,
        amount: x.Amount ?? x.amount
      })),
      notices:        data.notices        || [],
      counts:         data.counts         || {},
      miniKpis:       data.miniKpis       || {},
      roleKpis:       data.roleKpis       || {},
      roleActivities: data.roleActivities || {},
      alerts:         data.alerts         || [],
      meta:           data.meta           || {}
    };
  }

  /* ================= BUILD CHARTS ================= */

  buildCharts() {
    this.buildStudentsChart();
    this.buildStaffChart();
    this.buildAttendanceChart();
    this.buildFeeChart();
    this.buildStaffDepartmentChart();
  }

  classIds: any[]    = [];
  divisionIds: any[] = [];
  staffPercent = 0;
  staffTotal   = 0;
  staffLegend: any[]    = [];
  staffLegendColors = ['#4f46e5', '#0ea5e9', '#14b8a6', '#a855f7', '#f59e0b', '#ef4444'];

  buildStudentsChart() {
    const labels   = this.dashboard.studentChart?.map((x: any) => x.name)         || [];
    const values   = this.dashboard.studentChart?.map((x: any) => x.studentCount)  || [];
    this.classIds  = this.dashboard.studentChart?.map((x: any) => x.id)            || [];

    this.studentsChart = {
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.96)', borderWidth: 0, textStyle: { color: '#e2e8f0' } },
      xAxis:   { type: 'category', data: labels, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { color: '#475569' } },
      yAxis:   { type: 'value', axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#e2e8f0' } } },
      series:  [{ type: 'bar', data: values, barWidth: '45%', itemStyle: { borderRadius: [6, 6, 0, 0], color: '#4f46e5' } }]
    };
  }

  buildStaffChart() {
    if (!this.dashboard?.staffChart) return;
    const total = this.dashboard.staffChart.reduce((a: any, b: any) => a + b.count, 0);
    const data  = this.dashboard.staffChart.map((x: any, i: number) => ({
      value: x.count, name: x.staffType,
      itemStyle: { color: this.staffLegendColors[i % this.staffLegendColors.length] }
    }));
    const teaching  = this.dashboard.staffChart.find((x: any) => x.staffType.includes('Teaching'));
    this.staffPercent = teaching ? Math.round((teaching.count / total) * 100) : 0;
    this.staffTotal   = total;
    this.staffLegend  = this.dashboard.staffChart.map((x: any, i: number) => ({
      name: x.staffType, value: x.count,
      percent: Math.round((x.count / total) * 100),
      color:   this.staffLegendColors[i % this.staffLegendColors.length]
    }));
    this.staffChart = {
      tooltip: { trigger: 'item', backgroundColor: 'rgba(15,23,42,0.96)', borderWidth: 0, textStyle: { color: '#e2e8f0' } },
      series: [{
        type: 'pie', radius: ['60%', '80%'], center: ['35%', '55%'],
        avoidLabelOverlap: false, label: { show: false }, labelLine: { show: false },
        data, itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 }
      }]
    };
  }

  buildAttendanceChart() {
    const attendanceData  = (this.dashboard.attendance || []).filter((x: any) => x.month !== 'No Data');
    const displayMonths   = attendanceData.length > 0 ? attendanceData.map((x: any) => x.month)      : ['No Data'];
    const displayValues   = attendanceData.length > 0 ? attendanceData.map((x: any) => x.attendance) : [0];

    this.attendanceChart = JSON.parse(JSON.stringify({
      animation: true, animationDuration: 1000, animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.96)', borderWidth: 0,
        borderRadius: 8, padding: [12, 16], textStyle: { color: '#e2e8f0', fontSize: 13 },
        formatter: (params: any) => {
          const p = params[0]; const v = p.value;
          const c = v >= 90 ? '#22c55e' : v >= 75 ? '#eab308' : '#ef4444';
          return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="display:inline-block;width:10px;height:10px;background:${c};border-radius:50%"></span>
                    <span>Attendance: <strong style="color:${c}">${v}%</strong></span>
                  </div>`;
        }
      },
      grid: { left: '8%', right: '4%', bottom: '12%', top: '18%', containLabel: true },
      xAxis: { type: 'category', data: displayMonths, axisLine: { lineStyle: { color: '#e2e8f0', width: 2 } }, axisLabel: { color: '#64748b', fontSize: 12 }, axisTick: { show: false } },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: '#64748b', fontSize: 12, formatter: '{value}%' }, splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } } },
      series: [{
        type: 'line', smooth: false, showSymbol: true, symbolSize: 8, symbol: 'circle',
        lineStyle: { width: 3, color: '#6366f1' },
        itemStyle: { color: '#6366f1', borderWidth: 2, borderColor: '#fff' },
        emphasis: { focus: 'series', itemStyle: { color: '#4f46e5', borderWidth: 3, borderColor: '#fff' }, lineStyle: { width: 4 } },
        data: displayValues
      }]
    }));
  }

  buildFeeChart() {
    const feeData       = (this.dashboard.fees || []).filter((x: any) => x.month !== 'No Data');
    const displayMonths = feeData.length > 0 ? feeData.map((x: any) => x.month)  : ['No Data'];
    const displayValues = feeData.length > 0 ? feeData.map((x: any) => x.amount) : [0];

    this.feeChart = JSON.parse(JSON.stringify({
      animation: true, animationDuration: 1000, animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.96)', borderWidth: 0,
        borderRadius: 8, padding: [12, 16], textStyle: { color: '#e2e8f0', fontSize: 13 },
        formatter: (params: any) => {
          const p = params[0]; const v = p.value;
          return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="display:inline-block;width:10px;height:10px;background:#10b981;border-radius:50%"></span>
                    <span>Fee Collection: <strong style="color:#10b981">₹${v.toLocaleString()}</strong></span>
                  </div>`;
        }
      },
      grid: { left: '8%', right: '4%', bottom: '12%', top: '18%', containLabel: true },
      xAxis: { type: 'category', data: displayMonths, axisLine: { lineStyle: { color: '#e2e8f0', width: 2 } }, axisLabel: { color: '#64748b', fontSize: 12 }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 12, formatter: '₹{value}' }, splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } } },
      series: [{
        type: 'bar', barWidth: '45%',
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#059669' }, { offset: 0.5, color: '#10b981' }, { offset: 1, color: '#34d399' }] },
          shadowColor: 'rgba(16,185,129,0.4)', shadowBlur: 8, shadowOffsetY: 4
        },
        emphasis: { focus: 'series', itemStyle: { color: '#10b981', shadowColor: 'rgba(16,185,129,0.6)', shadowBlur: 12 } },
        data: displayValues
      }]
    }));
  }

  buildStaffDepartmentChart(): void {
    const staffData = this.dashboard?.staffChart || [];
    if (!Array.isArray(staffData) || staffData.length === 0) {
      this.staffDepartmentChart = {
        tooltip: { trigger: 'item' },
        series: [{ name: 'Staff Departments', type: 'pie', radius: ['40%', '70%'], data: [{ value: 0, name: 'No Data' }] }]
      };
      return;
    }
    const colors    = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const chartData = staffData.map((item: any, i: number) => ({
      value: item.count, name: item.staffType,
      itemStyle: { color: colors[i % colors.length] }
    }));
    this.staffDepartmentChart = {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend:  { orient: 'vertical', left: 'left' },
      series:  [{ name: 'Staff Departments', type: 'pie', radius: ['40%', '70%'], data: chartData }]
    };
  }

  /* ================= DRILLDOWN ================= */

  onChartClick(event: any) {
    const index = event.dataIndex;
    if (!this.selectedClass) {
      this.selectedClass = this.classIds[index];
      this.chartTitle    = 'Students by Division';
      this.drillPath     = ['Network', this.dashboard.studentChart?.[index]?.name || 'Class'];
    } else {
      this.selectedDivision = this.divisionIds[index];
      this.drillPath = ['Network', this.drillPath[1] || 'Class', this.dashboard.divisionChart?.[index]?.name || 'Division'];
    }
    this.loadDashboard();
  }

  resetDrill(): void {
    this.selectedClass    = null;
    this.selectedDivision = null;
    this.chartTitle       = 'Students by Class';
    this.drillPath        = ['Network'];
    this.loadDashboard();
  }

  /* ================= KPI HELPERS ================= */

  get selectedSchoolName(): string {
    if (!this.selectedSchool) return 'All Schools';
    return this.schoolList.find((s: any) => String(s.ID) === String(this.selectedSchool))?.Name ?? 'All Schools';
  }

  get selectedAcademicYearName(): string {
    if (!this.selectedAcademicYear) return 'All Years';
    return this.academicYearList.find((a: any) => String(a.ID) === String(this.selectedAcademicYear))?.Name ?? 'All Years';
  }

  getKpiValue(key: string): number {
    const apiRoleKpis = this.dashboard?.roleKpis;
    if (apiRoleKpis && typeof apiRoleKpis === 'object' && apiRoleKpis[key] !== undefined && apiRoleKpis[key] !== null) {
      return Number(apiRoleKpis[key]);
    }
    const card = this.kpiCards.find(x => x.key === key);
    if (!card) return 0;
    for (const path of card.fallback) {
      const value = this.readPath(path);
      if (value !== null && value !== undefined && value !== '') return Number(value);
    }
    return 0;
  }

  getKpiTrendDirection(value: number): 'up' | 'flat' { return value > 0 ? 'up' : 'flat'; }
  getKpiTrendLabel(value: number): string            { return value > 0 ? 'Healthy' : 'No data'; }

  readPath(path: string): any {
    return path.split('.').reduce((acc: any, part: string) => acc?.[part], this.dashboard);
  }

  getActivityData(dataKey: string): any[] {
    const list = this.dashboard?.roleActivities?.[dataKey] ?? this.dashboard?.[dataKey];
    return Array.isArray(list) ? list : [];
  }

  getMiniKpiValue(key: 'attendancePercent' | 'activeUsers' | 'pendingFees' | 'upcomingExams' | 'totalCollection'): number {
    const mini  = this.dashboard?.miniKpis;
    const direct = this.dashboard?.[key];
    let value   = mini?.[key] ?? direct;
    if ((value === null || value === undefined) && key === 'pendingFees') {
      value = mini?.totalCollection ?? this.dashboard?.totalCollection ?? 0;
    }
    if (value === null || value === undefined) value = 0;
    return Number(value);
  }

  get hasAttendanceTrend(): boolean { return Array.isArray(this.dashboard?.attendance) && this.dashboard.attendance.length > 0; }
  get hasFeeTrend(): boolean        { return Array.isArray(this.dashboard?.fees)        && this.dashboard.fees.length > 0;       }

  get hasStaffDepartmentData(): boolean {
    const staffData = this.dashboard?.staffDepartmentDistribution
                   || this.dashboard?.staffChart
                   || this.dashboard?.staffDepartment
                   || this.dashboard?.counts?.staffDepartment
                   || this.dashboard?.staffList;
    if (!staffData && this.dashboard?.data) {
      const nested = this.dashboard.data.staffDepartmentDistribution
                  || this.dashboard.data.staffChart
                  || this.dashboard.data.staffDepartment
                  || this.dashboard.data.staffList;
      return Array.isArray(nested) && nested.length > 0;
    }
    return Array.isArray(staffData) && staffData.length > 0;
  }

  get attendanceDirection(): 'up' | 'down' | 'flat' {
    const s = this.dashboard?.attendance || [];
    if (s.length < 2) return 'flat';
    const prev = Number(s[s.length - 2]?.attendance || 0);
    const curr = Number(s[s.length - 1]?.attendance || 0);
    return curr > prev ? 'up' : curr < prev ? 'down' : 'flat';
  }

  get feeDirection(): 'up' | 'down' | 'flat' {
    const s = this.dashboard?.fees || [];
    if (s.length < 2) return 'flat';
    const prev = Number(s[s.length - 2]?.amount || 0);
    const curr = Number(s[s.length - 1]?.amount || 0);
    return curr > prev ? 'up' : curr < prev ? 'down' : 'flat';
  }

  buildAlerts(): void {
    const list = this.dashboard?.alerts;
    if (Array.isArray(list) && list.length) { this.alerts = list.slice(0, 3); return; }

    const attendance  = this.getMiniKpiValue('attendancePercent');
    const pendingFees = this.getMiniKpiValue('pendingFees');
    const activeUsers = this.getMiniKpiValue('activeUsers');
    const generated: typeof this.alerts = [];

    if (attendance > 0 && attendance < 75) {
      generated.push({ severity: 'high',   title: 'Attendance risk',        reason: `Average attendance is ${attendance}%, below target.`, action: 'Review class-wise absentee list and assign follow-up.' });
    }
    if (pendingFees > 0) {
      generated.push({ severity: 'medium', title: 'Fee collection pending', reason: `Outstanding fees are ${pendingFees}.`,                action: 'Prioritize reminders for highest overdue buckets.'    });
    }
    if (activeUsers === 0) {
      generated.push({ severity: 'low',    title: 'Low platform activity',  reason: 'No active users detected in current window.',         action: 'Validate login access and communication channels.'    });
    }

    this.alerts = generated;
  }

  /* ================= NOTICES ================= */

  loadNotices(): void {
    const payload: any = {
      Flag:         '2',
      SchoolID:     this.selectedSchool      || null,
      AcademicYear: this.selectedAcademicYear || null,
      IsActive:     1
    };

    // Group Admin with no single school selected: scope to all tagged schools
    if (this.roleId === '10' && !this.selectedSchool && this.taggedSchoolIds) {
      payload.SchoolIDs = this.taggedSchoolIds;
    }

    this.apiurl.post<any>('Tbl_Notices_CRUD_Operations', payload).subscribe({
      next: (res) => {
        this.noticeSlide = 0;
        this.noticesList = (res?.data || []).map((item: any) => ({
          NoticeId:         item.noticeId,
          Title:            item.title,
          Description:      item.description || '',
          NoticeType:       item.noticeType,
          StartDate:        item.startDate,
          EndDate:          item.endDate,
          SchoolName:       item.schoolName,
          AcademicYearName: item.academicYearName,
          IsActive:         item.isActive === 1 || item.isActive === true
        }));
      },
      error: () => { this.noticesList = []; }
    });
  }

  get activeNotices() {
    return this.noticesList.filter(n => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const start = new Date(n.StartDate); start.setHours(0, 0, 0, 0);
      const end   = new Date(n.EndDate);   end.setHours(0, 0, 0, 0);
      return start >= today || (start <= today && end >= today);
    });
  }

  get noticeSlideCount(): number { return Math.ceil(this.activeNotices.length / 3); }

  get pagedNotices() {
    const start = this.noticeSlide * 3;
    return this.activeNotices.slice(start, start + 3);
  }

  prevNoticeSlide(): void { if (this.noticeSlide > 0) this.noticeSlide--; }
  nextNoticeSlide(): void { if (this.noticeSlide < this.noticeSlideCount - 1) this.noticeSlide++; }

  /* ================= MENU & QUICK LINKS ================= */

  loadMenu(): void {
    try   { this.menu = this.menuService.getMenu(); }
    catch { this.menu = []; }
  }

  loadQuickLinks(): void {
    this.quickLinks = [];
    const sourceMenu = this.roleId === '1' ? this.fullAdminMenu : this.menu;
    const base       = this.roleId === '10' ? '/GroupAdmin' : '/Admin';
    let admissionAdded = false;

    sourceMenu.forEach(module => {
      const pages = this.roleId === '1'
        ? (module.pages || [])
        : (module.pages || []).filter((page: Page) => page.canView === '1');

      const ap = pages.find((p: Page) => p.pageName.toLowerCase().includes('admission'));
      if (ap && !admissionAdded) {
        this.quickLinks.push({ icon: 'person_add', label: 'Quick Admission', route: `${base}/${this.formatRoute(ap.pageName)}` });
        admissionAdded = true;
      }
    });

    sourceMenu.forEach(module => {
      const pages = this.roleId === '1'
        ? (module.pages || [])
        : (module.pages || []).filter((page: Page) => page.canView === '1');

      pages.forEach((page: Page) => {
        if (page.pageName.toLowerCase().includes('admission')) return;
        if (this.quickLinks.length < 6) {
          this.quickLinks.push({ icon: this.getPageIcon(page.pageName), label: page.pageName, route: `${base}/${this.formatRoute(page.pageName)}` });
        }
      });
    });
  }

  private formatRoute(pageName: string): string {
    return pageName.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  }

  private getPageIcon(pageName: string): string {
    const key = (pageName || '').trim().toLowerCase();
    const iconMap: Record<string, string> = {
      'admission': 'person_add', 'attendance': 'fact_check', 'staff': 'badge',
      'students':  'groups',     'classes':    'school',      'subjects': 'book',
      'fees':      'payments',   'exams':      'quiz',        'timetable': 'schedule',
      'transport': 'commute',    'library':    'local_library', 'notice': 'campaign',
      'leave':     'event_busy', 'reports':    'assessment',  'settings': 'settings'
    };
    return iconMap[key] || 'link';
  }

  /* ================= UTILS ================= */

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  calculatePresentStudents(): number {
    const total   = this.getKpiValue('students')              || 0;
    const percent = this.getMiniKpiValue('attendancePercent') || 0;
    return Math.round(total * percent / 100);
  }

  getUserInitials(): string {
    const userName = sessionStorage.getItem('UserName') || 'User';
    const names    = userName.split(' ');
    return names.length >= 2 ? (names[0][0] + names[1][0]).toUpperCase() : userName.substring(0, 2).toUpperCase();
  }

  getUserName(): string { return sessionStorage.getItem('UserName') || 'User'; }

  toggleMobileNav(): void { this.isMobileNavOpen = !this.isMobileNavOpen; }

  getNoticeIcon(noticeType: string): string {
    const iconMap: Record<string, string> = { 'General': 'campaign', 'Exam': 'quiz', 'Holiday': 'celebration', 'Urgent': 'priority_high' };
    return iconMap[noticeType] || 'campaign';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  }

  navigateTo(route: string): void { this.router.navigate([route]); }

  logout() {
    this.menuService.clearMenu();
    sessionStorage.clear();
    this.router.navigate(['/signin']);
  }
}