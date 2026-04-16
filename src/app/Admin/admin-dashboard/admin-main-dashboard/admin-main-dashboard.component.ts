import { Component } from '@angular/core';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { NgClass, NgFor, NgIf, SlicePipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiServiceService } from '../../../Services/api-service.service';
import { LoaderService } from '../../../Services/loader.service';
import { NgxEchartsModule } from 'ngx-echarts';

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
export class AdminMainDashboardComponent{

constructor(
private apiurl:ApiServiceService,
public loader:LoaderService,
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

/* ================= DASHBOARD ================= */

dashboard:any={}

chartTitle="Students by Class"

roleId = ''
roleKey: 'super_admin' | 'school_admin' | 'principal' | 'chairman' | 'staff' | 'parent' | 'student' = 'school_admin'

kpiCards: Array<{ key: string; label: string; icon: string; accent: string; fallback: string[] }> = [];

studentsChart:any
staffChart:any
attendanceChart:any
feeChart:any
roleActivityCards: Array<{ title: string; dataKey: string; icon: string; type: 'people' | 'notice' }> = [];
drillPath: string[] = ['Network']
alerts: Array<{ severity: 'high' | 'medium' | 'low'; title: string; reason: string; action: string }> = [];


/* ================= INIT ================= */

ngOnInit(){

this.roleId = sessionStorage.getItem('RollID') || ''
this.setRoleContext()

const storedSchoolId = sessionStorage.getItem('schoolId') || sessionStorage.getItem('SchoolID') || ''
if (storedSchoolId) {
  this.selectedSchool = storedSchoolId
}

this.loadSchools()
this.loadAcademicYears()
this.loadDashboard()

}

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

showSchoolFilter(): boolean {
  return this.roleKey === 'super_admin' || this.roleKey === 'chairman';
}

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

loadSchools(){

const req={Flag:'2'}

this.apiurl.post<any>('Tbl_SchoolDetails_CRUD',req)
.subscribe(res=>{

this.schoolList=(res?.data || []).map((x:any)=>({

ID:x.id,
Name:x.name

}))

})

}


/* ================= LOAD ACADEMIC YEARS ================= */

loadAcademicYears(){

const fetchYears = (flag: '2' | '3') => {
  const req = {
    SchoolID: this.selectedSchool,
    Flag: flag
  }

  this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', req).subscribe(res => {
    const list = (res?.data || []).map((x: any) => ({
      ID: x.id,
      Name: x.name
    }))

    if (list.length === 0 && flag === '3') {
      fetchYears('2')
      return
    }

    this.academicYearList = list
  })
}

fetchYears('3')

}


/* ================= FILTER EVENTS ================= */

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
}

onAcademicYearChange(): void {
this.selectedClass = null
this.selectedDivision = null
this.chartTitle = 'Students by Class'
this.drillPath = ['Network']
this.loadDashboard()
}

onBranchChange(): void {
this.loadDashboard()
}

onDateRangeChange(): void {
this.loadDashboard()
}

onCompareModeChange(): void {
this.loadDashboard()
}


/* ================= LOAD DASHBOARD ================= */

loadDashboard(){

const toNullableNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

const request={

SchoolID:toNullableNumber(this.selectedSchool),
AcademicYear:toNullableNumber(this.selectedAcademicYear),
ClassID:toNullableNumber(this.selectedClass),
DivisionID:toNullableNumber(this.selectedDivision),
BranchID:toNullableNumber(this.selectedBranch),
DateRangeKey:this.selectedDateRange,
CompareMode:this.selectedCompareMode,
RoleKey:this.roleKey,
UserID: toNullableNumber(sessionStorage.getItem('UserID'))

}

this.loader.show()

this.apiurl.post<any>('Dashboard_API',request)
.subscribe({

next:(res)=>{

this.loader.hide()

this.dashboard=res.data || {}
this.buildAlerts()

this.buildCharts()

},

error:()=>{

this.loader.hide()

}

})

}


/* ================= BUILD CHARTS ================= */

buildCharts(){

this.buildStudentsChart()
this.buildStaffChart()
this.buildAttendanceChart()
this.buildFeeChart()

}

classIds:any[]=[]
divisionIds:any[]=[]
staffPercent=0
staffTotal=0
staffLegend:any[]=[]
staffLegendColors = ['#4f46e5', '#0ea5e9', '#14b8a6', '#a855f7', '#f59e0b', '#ef4444']


/* ================= STUDENT CHART ================= */

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

buildAttendanceChart(){

this.attendanceChart={

tooltip:{
trigger:'axis',
backgroundColor:'rgba(15,23,42,0.96)',
borderWidth:0,
textStyle:{color:'#e2e8f0'}
},

xAxis:{
type:'category',
data:this.dashboard.attendance?.map((x:any)=>x.month) || [],
axisLine:{lineStyle:{color:'#cbd5e1'}},
axisLabel:{color:'#475569'}
},

yAxis:{
type:'value',
axisLabel:{color:'#64748b'},
splitLine:{lineStyle:{color:'#e2e8f0'}}
},

series:[{

type:'line',
smooth:true,
showSymbol:false,
lineStyle:{width:3,color:'#0891b2'},
areaStyle:{color:'rgba(8,145,178,0.14)'},
data:this.dashboard.attendance?.map((x:any)=>x.attendance) || []

}]

}

}


/* ================= FEE CHART ================= */

buildFeeChart(){

this.feeChart={

tooltip:{
trigger:'axis',
backgroundColor:'rgba(15,23,42,0.96)',
borderWidth:0,
textStyle:{color:'#e2e8f0'}
},

xAxis:{
type:'category',
data:this.dashboard.fees?.map((x:any)=>x.month) || [],
axisLine:{lineStyle:{color:'#cbd5e1'}},
axisLabel:{color:'#475569'}
},

yAxis:{
type:'value',
axisLabel:{color:'#64748b'},
splitLine:{lineStyle:{color:'#e2e8f0'}}
},

series:[{

type:'line',
smooth:true,
showSymbol:false,
lineStyle:{width:3,color:'#16a34a'},
areaStyle:{color:'rgba(22,163,74,0.12)'},
data:this.dashboard.fees?.map((x:any)=>x.amount) || []

}]

}

}


/* ================= DRILLDOWN ================= */

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

getKpiTrendLabel(value: number): string {
  return value > 0 ? 'Healthy' : 'No data';
}

readPath(path: string): any {
  return path.split('.').reduce((acc: any, part: string) => acc?.[part], this.dashboard);
}

getActivityData(dataKey: string): any[] {
  const roleActivities = this.dashboard?.roleActivities;
  const list = roleActivities?.[dataKey] ?? this.dashboard?.[dataKey];
  return Array.isArray(list) ? list : [];
}

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

}
