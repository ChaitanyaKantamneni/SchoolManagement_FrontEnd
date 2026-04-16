import { Component } from '@angular/core';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { NgClass, NgFor, NgIf, SlicePipe } from '@angular/common';
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
SlicePipe
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

selectedSchool:any=null
selectedAcademicYear:any=null
selectedClass:any=null
selectedDivision:any=null

/* ================= DASHBOARD ================= */

dashboard:any={}

chartTitle="Students by Class"

studentsChart:any
staffChart:any
attendanceChart:any
feeChart:any


/* ================= INIT ================= */

ngOnInit(){

this.loadSchools()
this.loadDashboard()

}


/* ================= LOAD SCHOOLS ================= */

loadSchools(){

const req={Flag:'2'}

this.apiurl.post<any>('Tbl_SchoolDetails_CRUD',req)
.subscribe(res=>{

this.schoolList=res.data.map((x:any)=>({

ID:x.id,
Name:x.name

}))

})

}


/* ================= LOAD ACADEMIC YEARS ================= */

loadAcademicYears(){

const req={

SchoolID:this.selectedSchool,
Flag:'3'

}

this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations',req)
.subscribe(res=>{

this.academicYearList=res.data.map((x:any)=>({

ID:x.id,
Name:x.name

}))

})

}


/* ================= FILTER EVENTS ================= */

onSchoolChange(event:any){

this.selectedSchool=event.target.value || null
this.selectedAcademicYear=null
this.selectedClass=null
this.selectedDivision=null

this.loadAcademicYears()

this.loadDashboard()

}


onAcademicYearChange(event:any){

this.selectedAcademicYear=event.target.value || null
this.selectedClass=null
this.selectedDivision=null

this.loadDashboard()

}


/* ================= LOAD DASHBOARD ================= */

loadDashboard(){

const request={

SchoolID:this.selectedSchool,
AcademicYear:this.selectedAcademicYear,
ClassID:this.selectedClass,
DivisionID:this.selectedDivision

}

this.loader.show()

this.apiurl.post<any>('Dashboard_API',request)
.subscribe({

next:(res)=>{

this.loader.hide()

this.dashboard=res.data || {}

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


/* ================= STUDENT CHART ================= */

buildStudentsChart(){

const labels = this.dashboard.studentChart?.map((x:any)=>x.name) || []
const values = this.dashboard.studentChart?.map((x:any)=>x.studentCount) || []

/* store IDs for drilldown */

this.classIds = this.dashboard.studentChart?.map((x:any)=>x.id) || []

this.studentsChart={

tooltip:{trigger:'axis'},

xAxis:{
type:'category',
data:labels
},

yAxis:{type:'value'},

series:[{
type:'bar',
data:values,
barWidth:'45%',
itemStyle:{
borderRadius:[6,6,0,0],
color:'#3B82F6'
}
}]

}

}


/* ================= STAFF CHART ================= */

buildStaffChart(){

if(!this.dashboard?.staffChart) return

const total = this.dashboard.staffChart.reduce((a:any,b:any)=>a+b.count,0)

const data = this.dashboard.staffChart.map((x:any)=>({

value:x.count,
name:x.staffType

}))

const teaching = this.dashboard.staffChart.find((x:any)=>x.staffType.includes('Teaching'))

const percent = teaching ? Math.round((teaching.count/total)*100) : 0

this.staffPercent = percent
this.staffTotal = total
this.staffLegend = this.dashboard.staffChart.map((x:any)=>({

name:x.staffType,
value:x.count,
percent: Math.round((x.count/total)*100)

}))

this.staffChart={

tooltip:{trigger:'item'},

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

tooltip:{trigger:'axis'},

xAxis:{
type:'category',
data:this.dashboard.attendance?.map((x:any)=>x.month) || []
},

yAxis:{type:'value'},

series:[{

type:'line',
smooth:true,
areaStyle:{},
data:this.dashboard.attendance?.map((x:any)=>x.attendance) || []

}]

}

}


/* ================= FEE CHART ================= */

buildFeeChart(){

this.feeChart={

tooltip:{trigger:'axis'},

xAxis:{
type:'category',
data:this.dashboard.fees?.map((x:any)=>x.month) || []
},

yAxis:{type:'value'},

series:[{

type:'line',
smooth:true,
areaStyle:{},
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

}
else{

this.selectedDivision = this.divisionIds[index]

}

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

}
