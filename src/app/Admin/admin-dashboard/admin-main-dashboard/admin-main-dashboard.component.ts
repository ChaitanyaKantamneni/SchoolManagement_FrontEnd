import { Component, OnInit } from '@angular/core';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { NgClass, NgFor, NgIf, SlicePipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiServiceService } from '../../../Services/api-service.service';
import { LoaderService } from '../../../Services/loader.service';
import { NgxEchartsModule } from 'ngx-echarts';
import { MenuServiceService, Module, Page } from '../../../Services/menu-service.service';
import { Router } from '@angular/router';
import { FULL_ADMIN_MENU } from '../../../constants/admin-full-menu';
import { ChangeDetectorRef } from '@angular/core';

@Component({
selector:'app-admin-main-dashboard',
standalone:true,
imports:[
MatIconModule,
FormsModule,
NgxEchartsModule,
NgIf,
NgFor,
NgClass,
SlicePipe,
UpperCasePipe,
MatIconModule,
FormsModule,
NgxEchartsModule
],
templateUrl:'./admin-main-dashboard.component.html',
styleUrl:'./admin-main-dashboard.component.css'
})
/**
 * Class Responsibility: Handles view logic and user interactions for AdminMainDashboardComponent.
 */
export class AdminMainDashboardComponent implements OnInit{

isMobileNavOpen = false;

constructor(
  private cd: ChangeDetectorRef,
  private apiurl:ApiServiceService,
  public loader:LoaderService,
  private menuService: MenuServiceService,
  private router: Router
){}

/* ================= FILTER DATA ================= */

schoolList:any[]=[];
academicYearList:any[]=[];
branchList:any[]=[];

selectedSchool:any=null
selectedAcademicYear:any=null
selectedClass:any=null
selectedDivision:any=null
selectedBranch:any=null
selectedDateRange='academic_year'
selectedCompareMode='previous_period'
selectedTimePeriod:string='today'

/* ================= DASHBOARD ================= */

dashboard:any={}

chartTitle="Students by Class"

noticesList: Array<{ NoticeId: number; Title: string; Description: string; NoticeType: string; StartDate: string; EndDate: string; SchoolName?: string; AcademicYearName?: string; IsActive?: boolean }> = []
noticeSlide = 0

quickLinks: Array<{ icon: string; label: string; route: string }> = []

menu: Module[] = []
private readonly fullAdminMenu: Module[] = FULL_ADMIN_MENU

roleId = ''
roleKey: 'super_admin' | 'school_admin' | 'principal' | 'chairman' | 'staff' | 'parent' | 'student' = 'school_admin'

kpiCards: Array<{ key: string; label: string; icon: string; accent: string; fallback: string[] }> = [];

studentsChart:any
staffChart:any
attendanceChart:any
feeChart:any
staffDepartmentChart:any
roleActivityCards: Array<{ title: string; dataKey: string; icon: string; type: 'people' | 'notice' }> = [];
drillPath: string[] = ['Network']
alerts: Array<{ severity: 'high' | 'medium' | 'low'; title: string; reason: string; action: string }> = [];


/* ================= INIT ================= */

  get currentRoleName(): string {
    return (sessionStorage.getItem('roleName') || sessionStorage.getItem('RoleName') || sessionStorage.getItem('rollName') || sessionStorage.getItem('RollName') || '').trim();
  }

  get isTeacher(): boolean {
    const r = this.currentRoleName.toLowerCase();
    const id = this.roleId;
    return id === '3' || r.includes('teacher') || r.includes('teaching');
  }

  /**
   * Lifecycle hook: Initializes component parameters and loads default page datasets.
   */
  ngOnInit(){

    console.log('Dashboard ngOnInit called');

    this.roleId = sessionStorage.getItem('RollID') || ''
    console.log('Role ID from sessionStorage:', this.roleId);

    const schoolName = sessionStorage.getItem('schoolName') || '';
    if (this.isTeacher && schoolName) {
      this.router.navigate([`/${schoolName}/TimeTable`]);
      return;
    }

    this.setRoleContext()

    const storedSchoolId = sessionStorage.getItem('schoolId') || sessionStorage.getItem('SchoolID') || ''
    if (storedSchoolId) {
      this.selectedSchool = storedSchoolId
    }

    console.log('Initial school ID:', this.selectedSchool);

    this.loadSchools()
    this.loadAcademicYears()
    this.loadDashboard()
    this.loadNotices()
    this.loadMenu()
    this.loadQuickLinks()

  }

  /**
   * Executes the operation: setRoleContext
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
setRoleContext(): void {
  this.roleKey = this.resolveRoleKey(this.roleId);
  this.kpiCards = this.getRoleKpis(this.roleKey);
  this.roleActivityCards = this.getRoleActivities(this.roleKey);
}

resolveRoleKey(roleId: string): 'super_admin' | 'school_admin' | 'principal' | 'chairman' | 'staff' | 'parent' | 'student' {
  const roleMap: Record<string, 'super_admin' | 'school_admin' | 'principal' | 'chairman' | 'staff' | 'parent' | 'student'> = {
    '1': 'super_admin',
    '2': 'school_admin',
    '3': 'principal',
    '4': 'chairman',
    '5': 'staff',
    '6': 'parent',
    '7': 'student'
  };
  return roleMap[roleId] || 'school_admin';
}

get roleTitle(): string {
  const map: Record<string, string> = {
    super_admin: 'Super Admin Dashboard',
    school_admin: 'School Admin Dashboard',
    principal: 'Principal Dashboard',
    chairman: 'Chairman Dashboard',
    staff: 'Staff Dashboard',
    parent: 'Parent Dashboard',
    student: 'Student Dashboard'
  };
  return map[this.roleKey];
}

get roleInsightLine(): string {
  const map: Record<string, string> = {
    super_admin: 'Track branch performance, risk flags, and growth trends across the network.',
    chairman: 'Monitor strategic branch health, fee realization, and attendance consistency.',
    school_admin: 'Focus on admissions, staffing coverage, fee flow, and daily operations.',
    principal: 'Track academic quality, attendance reliability, and class-level performance.',
    staff: 'Prioritize today tasks, class actions, and pending academic workflow.',
    parent: 'Follow child attendance, dues, exams, and school communication updates.',
    student: 'Track personal progress, assignments, attendance, and upcoming exams.'
  };
  return map[this.roleKey];
}

  /**
   * Executes the operation: showSchoolFilter
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
showSchoolFilter(): boolean {
  return this.roleKey === 'super_admin' || this.roleKey === 'chairman';
}

  /**
   * Executes the operation: getRoleKpis
   * Parameters: role: string
   * Rationale: Standard operational controller for the active view.
   */
private getRoleKpis(role: string): Array<{ key: string; label: string; icon: string; accent: string; fallback: string[] }> {
  const common = {
    students: { key: 'students', label: 'Students', icon: 'groups', accent: 'kpi-students', fallback: ['counts.studentsCount'] },
    staff: { key: 'staff', label: 'Staff', icon: 'badge', accent: 'kpi-staff', fallback: ['counts.staffCount'] },
    classes: { key: 'classes', label: 'Classes', icon: 'school', accent: 'kpi-classes', fallback: ['counts.classCount'] },
    divisions: { key: 'divisions', label: 'Divisions', icon: 'account_tree', accent: 'kpi-divisions', fallback: ['counts.divisionsCount'] }
  };

  switch (role) {
    case 'super_admin':
      return [
        { key: 'schools', label: 'Schools', icon: 'domain', accent: 'kpi-classes', fallback: ['counts.schoolCount', 'counts.classCount'] },
        { key: 'branches', label: 'Branches', icon: 'account_balance', accent: 'kpi-divisions', fallback: ['counts.branchCount', 'counts.divisionsCount'] },
        common.staff,
        common.students
      ];
    case 'chairman':
      return [
        { key: 'branches', label: 'Branch Campuses', icon: 'apartment', accent: 'kpi-divisions', fallback: ['counts.branchCount', 'counts.divisionsCount'] },
        common.classes,
        common.staff,
        common.students
      ];
    case 'principal':
      return [
        common.classes,
        common.divisions,
        common.staff,
        common.students
      ];
    case 'staff':
      return [
        { key: 'assignedClasses', label: 'Assigned Classes', icon: 'class', accent: 'kpi-classes', fallback: ['counts.classCount'] },
        { key: 'attendancePercent', label: 'Attendance', icon: 'fact_check', accent: 'kpi-divisions', fallback: ['attendancePercent'] },
        { key: 'pendingTasks', label: 'Pending Tasks', icon: 'assignment', accent: 'kpi-staff', fallback: ['pendingTasks', 'activeUsers'] },
        { key: 'upcomingExams', label: 'Upcoming Exams', icon: 'event', accent: 'kpi-students', fallback: ['upcomingExams'] }
      ];
    case 'parent':
      return [
        { key: 'childrenCount', label: 'My Children', icon: 'family_restroom', accent: 'kpi-classes', fallback: ['childrenCount', 'counts.studentsCount'] },
        { key: 'attendancePercent', label: 'Attendance', icon: 'fact_check', accent: 'kpi-divisions', fallback: ['attendancePercent'] },
        { key: 'pendingFees', label: 'Pending Fees', icon: 'payments', accent: 'kpi-staff', fallback: ['pendingFees'] },
        { key: 'upcomingExams', label: 'Upcoming Exams', icon: 'event', accent: 'kpi-students', fallback: ['upcomingExams'] }
      ];
    case 'student':
      return [
        { key: 'myClassRank', label: 'Class Rank', icon: 'military_tech', accent: 'kpi-classes', fallback: ['myClassRank', 'counts.classCount'] },
        { key: 'attendancePercent', label: 'Attendance', icon: 'fact_check', accent: 'kpi-divisions', fallback: ['attendancePercent'] },
        { key: 'pendingAssignments', label: 'Assignments', icon: 'assignment_turned_in', accent: 'kpi-staff', fallback: ['pendingAssignments'] },
        { key: 'upcomingExams', label: 'Upcoming Exams', icon: 'event', accent: 'kpi-students', fallback: ['upcomingExams'] }
      ];
    case 'school_admin':
    default:
      return [common.classes, common.divisions, common.staff, common.students];
  }
}

  /**
   * Executes the operation: getRoleActivities
   * Parameters: role: string
   * Rationale: Standard operational controller for the active view.
   */
private getRoleActivities(role: string): Array<{ title: string; dataKey: string; icon: string; type: 'people' | 'notice' }> {
  if (role === 'parent') {
    return [
      { title: 'My Children Updates', dataKey: 'childrenUpdates', icon: 'child_care', type: 'people' },
      { title: 'Fee Alerts', dataKey: 'feeAlerts', icon: 'payments', type: 'people' },
      { title: 'School Notices', dataKey: 'notices', icon: 'campaign', type: 'notice' }
    ];
  }

  if (role === 'student') {
    return [
      { title: 'My Recent Assessments', dataKey: 'recentAssessments', icon: 'grading', type: 'people' },
      { title: 'Teacher Announcements', dataKey: 'teacherAnnouncements', icon: 'record_voice_over', type: 'people' },
      { title: 'School Notices', dataKey: 'notices', icon: 'campaign', type: 'notice' }
    ];
  }

  return [
    { title: 'Recent Admissions', dataKey: 'recentAdmissions', icon: 'person_add', type: 'people' },
    { title: 'Recent Staff Joined', dataKey: 'recentStaff', icon: 'badge', type: 'people' },
    { title: 'Latest Notices', dataKey: 'notices', icon: 'campaign', type: 'notice' }
  ];
}


/* ================= LOAD SCHOOLS ================= */

  /**
   * Executes the operation: loadSchools
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
loadSchools(){

console.log('Loading schools...');

const req={Flag:'2'}

this.apiurl.post<any>('Tbl_SchoolDetails_CRUD',req)
.subscribe(res=>{

console.log('Schools API Response:', res);

this.schoolList=(res?.data || []).map((x:any)=>({

ID:x.id,
Name:x.name

}))

console.log('Schools list:', this.schoolList);

})

}


/* ================= LOAD ACADEMIC YEARS ================= */

  /**
   * Executes the operation: loadAcademicYears
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
loadAcademicYears(){
const fetchYears = (flag: '2' | '3') => {
  const req = {
    SchoolID: this.selectedSchool,
    Flag: flag
  }

  console.log('Academic years API request:', req);

  this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', req).subscribe(res => {
    console.log('Academic years API response:', res);

    const list = (res?.data || []).map((x: any) => ({
      ID: x.id,
      Name: x.name
    }))

    if (list.length === 0 && flag === '3') {
      console.log('No academic years found with flag 3, trying flag 2');
      fetchYears('2')
      return
    }

    this.academicYearList = list

    // ✅ SET DEFAULT ACADEMIC YEAR (IMPORTANT FIX)
    // Only auto-select if NOT Super Admin (when school is already determined)
    if (this.academicYearList.length > 0 && !this.selectedAcademicYear && !this.showSchoolFilter()) {
      this.selectedAcademicYear = this.academicYearList[0].ID;
      sessionStorage.setItem('ActiveAcademicYearID',     this.selectedAcademicYear || '');
      // ✅ LOAD DASHBOARD AFTER YEAR SET
      this.loadDashboard();
    }

    console.log('Academic years list:', this.academicYearList);
  })
}

// For Super Admin with no school selected, don't fetch academic years yet
if (this.showSchoolFilter() && !this.selectedSchool) {
  console.log('Super Admin: Skipping academic year load until school is selected');
  return;
}

fetchYears('3')

}


/* ================= FILTER EVENTS ================= */

  /**
   * Executes the operation: onSchoolChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
onSchoolChange(): void {
this.selectedAcademicYear = null
this.selectedClass = null
this.selectedDivision = null
this.chartTitle = 'Students by Class'
this.drillPath = ['Network']

if (this.selectedSchool) {
  this.loadAcademicYears()
} else {
  this.academicYearList = []
}

this.loadDashboard()
this.loadNotices()
}

  /**
   * Executes the operation: onAcademicYearChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
onAcademicYearChange(): void {
console.log('Academic year changed:', this.selectedAcademicYear)
this.selectedClass = null
this.selectedDivision = null
this.chartTitle = 'Students by Class'
this.drillPath = ['Network']
this.loadDashboard()
this.loadNotices()
}

  /**
   * Executes the operation: onTimePeriodChange
   * Parameters: period: string
   * Rationale: Standard operational controller for the active view.
   */
onTimePeriodChange(period: string): void {
this.selectedTimePeriod = period
console.log('Time period changed:', period)
this.loadDashboard()
}

  /**
   * Executes the operation: onBranchChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
onBranchChange(): void {
this.loadDashboard()
}

  /**
   * Executes the operation: onDateRangeChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
onDateRangeChange(): void {
this.loadDashboard()
}

  /**
   * Executes the operation: onCompareModeChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
onCompareModeChange(): void {
this.loadDashboard()
}


/* ================= LOAD DASHBOARD ================= */

  /**
   * Executes the operation: loadDashboard
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
loadDashboard() {

  const toNullableNumber = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  };

  const request = {
    SchoolID: toNullableNumber(this.selectedSchool),
    AcademicYear: toNullableNumber(this.selectedAcademicYear),
    ClassID: toNullableNumber(this.selectedClass),
    DivisionID: toNullableNumber(this.selectedDivision),
    BranchID: toNullableNumber(this.selectedBranch),
    DateRangeKey: this.selectedTimePeriod,   // MUST match SP values
    CompareMode: this.selectedCompareMode,
    RoleKey: this.roleKey,
    UserID: toNullableNumber(sessionStorage.getItem('UserID'))
  };

  console.log('Dashboard API Request:', request);

  this.loader.show();

  this.apiurl.post<any>('Dashboard_API', request)
    .subscribe({

      next: (res) => {

        console.log('Dashboard API Raw Response:', res);

        this.loader.hide();

        // ✅ IMPORTANT: normalize backend data
        const normalized = this.normalizeResponse(res?.data || {});
        console.log('Normalized Dashboard Data:', normalized);

        this.dashboard = normalized;

        this.buildAlerts();

        // ✅ ensure charts rebuild properly
        setTimeout(() => {
          this.buildCharts();
          this.cd.detectChanges();
        }, 0);
      },

      error: (err) => {

        console.error('Dashboard API Error:', err);

        this.loader.hide();

        // fallback (avoid crash)
        this.dashboard = {};
        this.buildCharts();
      }

    });
}

  /**
   * Executes the operation: normalizeResponse
   * Parameters: data: any
   * Rationale: Standard operational controller for the active view.
   */
normalizeResponse(data: any) {

  if (!data) return {};

  return {

    ...data,

    // ✅ STUDENT CHART
    studentChart: (data.studentChart || []).map((x: any) => ({
      id: x.ID ?? x.id ?? x.classId ?? x.ClassID ?? 0,
      name: x.Name ?? x.name ?? x.className ?? x.ClassName ?? 'Unknown',
      studentCount: x.StudentCount ?? x.studentCount ?? x.Count ?? x.total ?? 0
    })),

    // ✅ STAFF CHART
    staffChart: (data.staffChart || []).map((x: any) => ({
      staffType: x.StaffType ?? x.staffType,
      count: x.Count ?? x.count
    })),


    // ✅ ATTENDANCE
    attendance: (data.attendance || []).map((x: any) => ({
      month: x.Month ?? x.month,
      attendance: x.Attendance ?? x.attendance
    })),
    
    // ✅ FEES
    fees: (data.fees || []).map((x: any) => ({
      month: x.Month ?? x.month,
      amount: x.Amount ?? x.amount
    })),

    // ✅ SAFE FALLBACKS
    notices: data.notices || [],
    counts: data.counts || {},
    miniKpis: data.miniKpis || {},
    roleKpis: data.roleKpis || {},
    roleActivities: data.roleActivities || {},
    alerts: data.alerts || [],
    meta: data.meta || {}
  };
}


/* ================= BUILD CHARTS ================= */

  /**
   * Executes the operation: buildCharts
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
buildCharts(){

this.buildStudentsChart()
this.buildStaffChart()
this.buildAttendanceChart()
this.buildFeeChart()
this.buildStaffDepartmentChart()

}

classIds:any[]=[]
divisionIds:any[]=[]
staffPercent=0
staffTotal=0
staffLegend:any[]=[]
staffLegendColors = ['#4f46e5', '#0ea5e9', '#14b8a6', '#a855f7', '#f59e0b', '#ef4444']


/* ================= STUDENT CHART ================= */

  /**
   * Executes the operation: buildStudentsChart
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
buildStudentsChart(){

const labels = this.dashboard.studentChart?.map((x:any)=>x.name) || []
const values = this.dashboard.studentChart?.map((x:any)=>x.studentCount) || []

/* store IDs for drilldown */

this.classIds = this.dashboard.studentChart?.map((x:any)=>x.id) || []

this.studentsChart={

tooltip:{
trigger:'axis',
backgroundColor:'rgba(15,23,42,0.96)',
borderWidth:0,
textStyle:{color:'#e2e8f0'}
},

xAxis:{
type:'category',
data:labels,
axisLine:{lineStyle:{color:'#cbd5e1'}},
axisLabel:{color:'#475569'}
},

yAxis:{
type:'value',
axisLabel:{color:'#64748b'},
splitLine:{lineStyle:{color:'#e2e8f0'}}
},

series:[{
type:'bar',
data:values,
barWidth:'45%',
itemStyle:{
borderRadius:[6,6,0,0],
color:'#4f46e5'
}
}]

}

}


/* ================= STAFF CHART ================= */

  /**
   * Executes the operation: buildStaffChart
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
buildStaffChart(){

if(!this.dashboard?.staffChart) return

const total = this.dashboard.staffChart.reduce((a:any,b:any)=>a+b.count,0)

const data = this.dashboard.staffChart.map((x:any, index:number)=>({

value:x.count,
name:x.staffType,
itemStyle:{color:this.staffLegendColors[index % this.staffLegendColors.length]}

}))

const teaching = this.dashboard.staffChart.find((x:any)=>x.staffType.includes('Teaching'))

const percent = teaching ? Math.round((teaching.count/total)*100) : 0

this.staffPercent = percent
this.staffTotal = total
this.staffLegend = this.dashboard.staffChart.map((x:any, index:number)=>({

name:x.staffType,
value:x.count,
percent: Math.round((x.count/total)*100),
color: this.staffLegendColors[index % this.staffLegendColors.length]

}))

this.staffChart={

tooltip:{
trigger:'item',
backgroundColor:'rgba(15,23,42,0.96)',
borderWidth:0,
textStyle:{color:'#e2e8f0'}
},

series:[{

type:'pie',

radius:['60%','80%'],

center:['35%','55%'],

avoidLabelOverlap:false,

label:{show:false},

labelLine:{show:false},

data:data,

itemStyle:{
borderRadius:4,
borderColor:'#fff',
borderWidth:2
}

}]

}

}


/* ================= ATTENDANCE CHART ================= */

  /**
   * Executes the operation: buildAttendanceChart
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
buildAttendanceChart(){

const attendanceData = (this.dashboard.attendance || [])
  .filter((x:any) => x.month !== 'No Data');
const months = attendanceData.map((x:any)=>x.month) || [];
const attendanceValues = attendanceData.map((x:any)=>x.attendance) || [];

const displayMonths = months.length > 0 
  ? months 
  : ['No Data'];

const displayValues = attendanceValues.length > 0 
  ? attendanceValues 
  : [0];

this.attendanceChart = JSON.parse(JSON.stringify({

animation:true,
animationDuration:1000,
animationEasing:'cubicOut',

tooltip:{
trigger:'axis',
backgroundColor:'rgba(15,23,42,0.96)',
borderWidth:0,
borderRadius:8,
padding:[12,16],
textStyle:{color:'#e2e8f0',fontSize:13},
formatter: (params: any) => {
  const param = params[0];
  const value = param.value;
  const color = value >= 90 ? '#22c55e' : value >= 75 ? '#eab308' : '#ef4444';
  return `<div style="font-weight:600;margin-bottom:4px">${param.name}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:50%"></span>
            <span>Attendance: <strong style="color:${color}">${value}%</strong></span>
          </div>`;
}
},

grid:{
left:'8%',
right:'4%',
bottom:'12%',
top:'18%',
containLabel:true
},

xAxis:{
type:'category',
data:displayMonths,
axisLine:{lineStyle:{color:'#e2e8f0',width:2}},
axisLabel:{color:'#64748b',fontSize:12,fontWeight:500},
axisTick:{show:false}
},

yAxis:{
type:'value',
min:0,
max:100,
axisLabel:{
color:'#64748b',
fontSize:12,
formatter:'{value}%'
},
splitLine:{
lineStyle:{
color:'#e2e8f0',
type:'dashed',
width:1,
opacity:0.6
}
}
},

series:[{

type:'line',
smooth:false,
showSymbol:true,
symbolSize:8,
symbol:'circle',
lineStyle:{
width:3,
color:'#6366f1'
},
itemStyle:{
color:'#6366f1',
borderWidth:2,
borderColor:'#fff'
},
emphasis:{
focus:'series',
itemStyle:{
color:'#4f46e5',
borderWidth:3,
borderColor:'#fff'
},
lineStyle:{
width:4
}
},
data:displayValues

}]

}))

}


/* ================= FEE CHART ================= */

  /**
   * Executes the operation: buildFeeChart
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
buildFeeChart(){

const feeData = (this.dashboard.fees || [])
  .filter((x:any) => x.month !== 'No Data');
const months = feeData.map((x:any)=>x.month) || [];
const feeValues = feeData.map((x:any)=>x.amount) || [];

// Use mock data if no data is available
const displayMonths = months.length > 0 
  ? months 
  : ['No Data'];

const displayValues = feeValues.length > 0 
  ? feeValues 
  : [0];

this.feeChart = JSON.parse(JSON.stringify({

animation:true,
animationDuration:1000,
animationEasing:'cubicOut',

tooltip:{
trigger:'axis',
backgroundColor:'rgba(15,23,42,0.96)',
borderWidth:0,
borderRadius:8,
padding:[12,16],
textStyle:{color:'#e2e8f0',fontSize:13},
formatter: (params: any) => {
  const param = params[0];
  const value = param.value;
  return `<div style="font-weight:600;margin-bottom:4px">${param.name}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="display:inline-block;width:10px;height:10px;background:#10b981;border-radius:50%"></span>
            <span>Fee Collection: <strong style="color:#10b981">₹${value.toLocaleString()}</strong></span>
          </div>`;
}
},

grid:{
left:'8%',
right:'4%',
bottom:'12%',
top:'18%',
containLabel:true
},

xAxis:{
type:'category',
data:displayMonths,
axisLine:{lineStyle:{color:'#e2e8f0',width:2}},
axisLabel:{color:'#64748b',fontSize:12,fontWeight:500},
axisTick:{show:false}
},

yAxis:{
type:'value',
axisLabel:{
color:'#64748b',
fontSize:12,
formatter:'₹{value}'
},
splitLine:{
lineStyle:{
color:'#e2e8f0',
type:'dashed',
width:1,
opacity:0.6
}
}
},

series:[{

type:'bar',
barWidth:'45%',
itemStyle:{
borderRadius:[8,8,0,0],
color:{
type:'linear',
x:0,y:0,x2:0,y2:1,
colorStops:[
{offset:0,color:'#059669'},
{offset:0.5,color:'#10b981'},
{offset:1,color:'#34d399'}
]
},
shadowColor:'rgba(16,185,129,0.4)',
shadowBlur:8,
shadowOffsetY:4
},
emphasis:{
focus:'series',
itemStyle:{
color:'#10b981',
shadowColor:'rgba(16,185,129,0.6)',
shadowBlur:12
}
},
data:displayValues

}]

}
));
}


/* ================= DRILLDOWN ================= */

  /**
   * Executes the operation: onChartClick
   * Parameters: event:any
   * Rationale: Standard operational controller for the active view.
   */
onChartClick(event:any){

const index = event.dataIndex

if(!this.selectedClass){

this.selectedClass = this.classIds[index]
this.chartTitle="Students by Division"
const selectedLabel = this.dashboard.studentChart?.[index]?.name || 'Class'
this.drillPath = ['Network', selectedLabel]

}
else{

this.selectedDivision = this.divisionIds[index]
const selectedDivisionLabel = this.dashboard.divisionChart?.[index]?.name || 'Division'
this.drillPath = ['Network', this.drillPath[1] || 'Class', selectedDivisionLabel]

}

this.loadDashboard()

}

  /**
   * Executes the operation: resetDrill
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
resetDrill(): void {
this.selectedClass = null
this.selectedDivision = null
this.chartTitle = 'Students by Class'
this.drillPath = ['Network']
this.loadDashboard()
}

get selectedSchoolName(): string {
  if (!this.selectedSchool) return 'All Schools';
  return this.schoolList.find((s: any) => String(s.ID) === String(this.selectedSchool))?.Name ?? 'All Schools';
}

get selectedAcademicYearName(): string {
  if (!this.selectedAcademicYear) return 'All Years';
  return this.academicYearList.find((a: any) => String(a.ID) === String(this.selectedAcademicYear))?.Name ?? 'All Years';
}

  /**
   * Executes the operation: getKpiValue
   * Parameters: key: string
   * Rationale: Standard operational controller for the active view.
   */
getKpiValue(key: string): number {
  const apiRoleKpis = this.dashboard?.roleKpis;
  if (apiRoleKpis && typeof apiRoleKpis === 'object' && apiRoleKpis[key] !== undefined && apiRoleKpis[key] !== null) {
    return Number(apiRoleKpis[key]);
  }

  const card = this.kpiCards.find(x => x.key === key);
  if (!card) {
    return 0;
  }

  for (const path of card.fallback) {
    const value = this.readPath(path);
    if (value !== null && value !== undefined && value !== '') {
      return Number(value);
    }
  }

  return 0;
}

getKpiTrendDirection(value: number): 'up' | 'flat' {
  return value > 0 ? 'up' : 'flat';
}

  /**
   * Executes the operation: getKpiTrendLabel
   * Parameters: value: number
   * Rationale: Standard operational controller for the active view.
   */
getKpiTrendLabel(value: number): string {
  return value > 0 ? 'Healthy' : 'No data';
}

  /**
   * Executes the operation: readPath
   * Parameters: path: string
   * Rationale: Standard operational controller for the active view.
   */
readPath(path: string): any {
  return path.split('.').reduce((acc: any, part: string) => acc?.[part], this.dashboard);
}

  /**
   * Executes the operation: getActivityData
   * Parameters: dataKey: string
   * Rationale: Standard operational controller for the active view.
   */
getActivityData(dataKey: string): any[] {
  const roleActivities = this.dashboard?.roleActivities;
  const list = roleActivities?.[dataKey] ?? this.dashboard?.[dataKey];
  return Array.isArray(list) ? list : [];
}

  /**
   * Executes the operation: getMiniKpiValue
   * Parameters: key: 'attendancePercent' | 'activeUsers' | 'pendingFees' | 'upcomingExams' | 'totalCollection'
   * Rationale: Standard operational controller for the active view.
   */
getMiniKpiValue(key: 'attendancePercent' | 'activeUsers' | 'pendingFees' | 'upcomingExams' | 'totalCollection'): number {
  const mini = this.dashboard?.miniKpis;
  const direct = this.dashboard?.[key];
  let value = mini?.[key] ?? direct;
  if ((value === null || value === undefined) && key === 'pendingFees') {
    value = mini?.totalCollection ?? this.dashboard?.totalCollection ?? 0;
  }
  if (value === null || value === undefined) {
    value = 0;
  }
  return Number(value);
}

get hasAttendanceTrend(): boolean {
  return Array.isArray(this.dashboard?.attendance) && this.dashboard.attendance.length > 0;
}

get hasFeeTrend(): boolean {
  return Array.isArray(this.dashboard?.fees) && this.dashboard.fees.length > 0;
}

get hasStaffDepartmentData(): boolean {
  const staffData = this.dashboard?.staffDepartmentDistribution ||
                   this.dashboard?.staffChart ||
                   this.dashboard?.staffDepartment ||
                   this.dashboard?.counts?.staffDepartment ||
                   this.dashboard?.staffList;
  
  if (!staffData && this.dashboard?.data) {
    const nestedData = this.dashboard.data.staffDepartmentDistribution ||
                      this.dashboard.data.staffChart ||
                      this.dashboard.data.staffDepartment ||
                      this.dashboard.data.staffList;
    return Array.isArray(nestedData) && nestedData.length > 0;
  }
  
  return Array.isArray(staffData) && staffData.length > 0;
}

get attendanceDirection(): 'up' | 'down' | 'flat' {
  const series = this.dashboard?.attendance || [];
  if (series.length < 2) return 'flat';
  const prev = Number(series[series.length - 2]?.attendance || 0);
  const curr = Number(series[series.length - 1]?.attendance || 0);
  if (curr > prev) return 'up';
  if (curr < prev) return 'down';
  return 'flat';
}

get feeDirection(): 'up' | 'down' | 'flat' {
  const series = this.dashboard?.fees || [];
  if (series.length < 2) return 'flat';
  const prev = Number(series[series.length - 2]?.amount || 0);
  const curr = Number(series[series.length - 1]?.amount || 0);
  if (curr > prev) return 'up';
  if (curr < prev) return 'down';
  return 'flat';
}

  /**
   * Executes the operation: buildAlerts
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
buildAlerts(): void {
  const list = this.dashboard?.alerts;
  if (Array.isArray(list) && list.length) {
    this.alerts = list.slice(0, 3);
    return;
  }

  const attendance = this.getMiniKpiValue('attendancePercent');
  const pendingFees = this.getMiniKpiValue('pendingFees');
  const activeUsers = this.getMiniKpiValue('activeUsers');

  const generated: Array<{ severity: 'high' | 'medium' | 'low'; title: string; reason: string; action: string }> = [];

  if (attendance > 0 && attendance < 75) {
    generated.push({
      severity: 'high',
      title: 'Attendance risk',
      reason: `Average attendance is ${attendance}%, below target.`,
      action: 'Review class-wise absentee list and assign follow-up.'
    });
  }

  if (pendingFees > 0) {
    generated.push({
      severity: 'medium',
      title: 'Fee collection pending',
      reason: `Outstanding fees are ${pendingFees}.`,
      action: 'Prioritize reminders for highest overdue buckets.'
    });
  }

  if (activeUsers === 0) {
    generated.push({
      severity: 'low',
      title: 'Low platform activity',
      reason: 'No active users detected in current window.',
      action: 'Validate login access and communication channels.'
    });
  }

  this.alerts = generated;
}

  /**
   * Executes the operation: getCurrentDate
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
getCurrentDate(): string {
  const today = new Date();
  return today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

  /**
   * Executes the operation: calculatePresentStudents
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
calculatePresentStudents(): number {
  const totalStudents = this.getKpiValue('students') || 0;
  const attendancePercent = this.getMiniKpiValue('attendancePercent') || 0;
  return Math.round(totalStudents * attendancePercent / 100);
}

  /**
   * Executes the operation: getUserInitials
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
getUserInitials(): string {
  const userName = sessionStorage.getItem('UserName') || 'User';
  const names = userName.split(' ');
  if (names.length >= 2) {
    return (names[0][0] + names[1][0]).toUpperCase();
  }
  return userName.substring(0, 2).toUpperCase();
}

  /**
   * Executes the operation: getUserName
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
getUserName(): string {
  return sessionStorage.getItem('UserName') || 'User';
}

get activeNotices() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.noticesList.filter(n => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(n.StartDate);
    const end = new Date(n.EndDate);

    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);

    return start >= today || (start <= today && end >= today);
  });
}

get noticeSlideCount(): number {
  return Math.ceil(this.activeNotices.length / 3);
}

get pagedNotices() {
  const start = this.noticeSlide * 3;
  return this.activeNotices.slice(start, start + 3);
}

  /**
   * Executes the operation: prevNoticeSlide
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
prevNoticeSlide(): void {
  if (this.noticeSlide > 0) this.noticeSlide--;
}

  /**
   * Executes the operation: nextNoticeSlide
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
nextNoticeSlide(): void {
  if (this.noticeSlide < this.noticeSlideCount - 1) this.noticeSlide++;
}

  /**
   * Executes the operation: loadNotices
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
loadNotices(): void {
  const payload = {
    Flag: '2',
    SchoolID: this.selectedSchool || null,
    AcademicYear: this.selectedAcademicYear || null,
    IsActive: 1
  };

  this.apiurl.post<any>('Tbl_Notices_CRUD_Operations', payload).subscribe({
    next: (res) => {
      this.noticeSlide = 0;
      this.noticesList = (res?.data || []).map((item: any) => ({
        NoticeId: item.noticeId,
        Title: item.title,
        Description: item.description || '',
        NoticeType: item.noticeType,
        StartDate: item.startDate,
        EndDate: item.endDate,
        SchoolName: item.schoolName,
        AcademicYearName: item.academicYearName,
        IsActive: item.isActive === 1 || item.isActive === true
      }));
    },
    error: (err) => {
      console.error('Error loading notices:', err);
      this.noticesList = [];
    }
  });
}

  /**
   * Executes the operation: loadMenu
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
loadMenu(): void {
  try {
    this.menu = this.menuService.getMenu();
  } catch (error) {
    console.error('Error loading menu:', error);
    this.menu = [];
  }
}

  /**
   * Executes the operation: loadQuickLinks
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
loadQuickLinks(): void {
  this.quickLinks = [];
  const sourceMenu = this.roleId === '1' ? this.fullAdminMenu : this.menu;

  // First, try to add "Admission" (Quick Admission) as the first link
  let admissionAdded = false;
  sourceMenu.forEach(module => {
    const pages = this.roleId === '1' ? (module.pages || []) : (module.pages || []).filter((page: Page) => page.canView === '1');
    const admissionPage = pages.find((page: Page) => page.pageName.toLowerCase().includes('admission'));
    if (admissionPage && !admissionAdded) {
      this.quickLinks.push({
        icon: 'person_add',
        label: 'Quick Admission',
        route: `/Admin/${this.formatRoute(admissionPage.pageName)}`
      });
      admissionAdded = true;
    }
  });

  // Then add other pages
  sourceMenu.forEach(module => {
    const pages = this.roleId === '1' ? (module.pages || []) : (module.pages || []).filter((page: Page) => page.canView === '1');
    pages.forEach((page: Page) => {
      // Skip admission since we already added it
      if (page.pageName.toLowerCase().includes('admission')) return;

      if (this.quickLinks.length < 6) { // Limit to 6 quick links
        this.quickLinks.push({
          icon: this.getPageIcon(page.pageName),
          label: page.pageName,
          route: `/Admin/${this.formatRoute(page.pageName)}`
        });
      }
    });
  });
}

  /**
   * Executes the operation: formatRoute
   * Parameters: pageName: string
   * Rationale: Standard operational controller for the active view.
   */
private formatRoute(pageName: string): string {
  // Convert to PascalCase format matching the actual routes
  return pageName
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

  /**
   * Executes the operation: getPageIcon
   * Parameters: pageName: string
   * Rationale: Standard operational controller for the active view.
   */
private getPageIcon(pageName: string): string {
  const key = (pageName || '').trim().toLowerCase();
  const iconMap: Record<string, string> = {
    'admission': 'person_add',
    'attendance': 'fact_check',
    'staff': 'badge',
    'students': 'groups',
    'classes': 'school',
    'subjects': 'book',
    'fees': 'payments',
    'exams': 'quiz',
    'timetable': 'schedule',
    'transport': 'commute',
    'library': 'local_library',
    'notice': 'campaign',
    'leave': 'event_busy',
    'reports': 'assessment',
    'settings': 'settings'
  };
  return iconMap[key] || 'link';
}

  /**
   * Executes the operation: toggleMobileNav
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
toggleMobileNav(): void {
  this.isMobileNavOpen = !this.isMobileNavOpen;
}

  /**
   * Executes the operation: getNoticeIcon
   * Parameters: noticeType: string
   * Rationale: Standard operational controller for the active view.
   */
getNoticeIcon(noticeType: string): string {
  const iconMap: Record<string, string> = {
    'General': 'campaign',
    'Exam': 'quiz',
    'Holiday': 'celebration',
    'Urgent': 'priority_high'
  };
  return iconMap[noticeType] || 'campaign';
}

  /**
   * Executes the operation: formatDate
   * Parameters: dateString: string
   * Rationale: Standard operational controller for the active view.
   */
formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
}

  /**
   * Executes the operation: navigateTo
   * Parameters: route: string
   * Rationale: Standard operational controller for the active view.
   */
navigateTo(route: string): void {
  this.router.navigate([route]);
}

  /**
   * Executes the operation: buildStaffDepartmentChart
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
buildStaffDepartmentChart(): void {

  // ✅ FIX: define staffData
  const staffData = this.dashboard?.staffChart || [];

  console.log('Staff Department Data:', staffData);

  // ✅ Empty state
  if (!staffData || !Array.isArray(staffData) || staffData.length === 0) {
    this.staffDepartmentChart = {
      tooltip: { trigger: 'item' },
      series: [
        {
          name: 'Staff Departments',
          type: 'pie',
          radius: ['40%', '70%'],
          data: [{ value: 0, name: 'No Data' }]
        }
      ]
    };
    return;
  }

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const chartData = staffData.map((item: any, index: number) => ({
    value: item.count,
    name: item.staffType,
    itemStyle: { color: colors[index % colors.length] }
  }));

  console.log('Chart Data:', chartData);

  this.staffDepartmentChart = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: 'Staff Departments',
        type: 'pie',
        radius: ['40%', '70%'],
        data: chartData
      }
    ]
  };
}

}
