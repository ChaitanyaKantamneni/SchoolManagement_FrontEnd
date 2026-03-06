// import { Component } from '@angular/core';
// import { MatIcon, MatIconModule } from '@angular/material/icon';
// import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
// import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
// import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
// import { Router } from '@angular/router';
// import { ApiServiceService } from '../../../Services/api-service.service';
// import { tap } from 'rxjs';
// import { MenuServiceService } from '../../../Services/menu-service.service';
// import { BasePermissionComponent  } from '../../../shared/base-crud.component';
// import { SchoolCacheService } from '../../../Services/school-cache.service';
// import { LoaderService } from '../../../Services/loader.service';
// import { dateRangeValidator } from '../../../Validators/date-range.validator';

// @Component({
//   selector: 'app-admin-main-dashboard',
//   standalone:true,
//   imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule,MatIcon],
//   templateUrl: './admin-main-dashboard.component.html',
//   styleUrl: './admin-main-dashboard.component.css'
// })
// export class AdminMainDashboardComponent {

//   constructor(
//     router: Router,
//     private apiurl: ApiServiceService,
//     public loader: LoaderService
//   ) {
//   }

//   DashboardCountsList: any[] =[];
//   schoolList: any[] = [];
//   academicYearList:any[] = [];
//   AdminselectedSchoolID:string = '';
//   AdminselectedAcademivYearID:string = '';

//   ClassDivisionForm: any = new FormGroup({  
//       School: new FormControl(),
//       AcademicYear: new FormControl()
//   });

//   ngOnInit(): void {    
//     this.ClassDivisionForm.get('School').patchValue('0');
//       this.ClassDivisionForm.get('AcademicYear').patchValue('0');
//     this.FetchDashboardCountsList();
//     this.FetchSchoolsList();
//   }

//   FetchSchoolsList() {
//       const requestData = { Flag: '2' };
  
//       this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', requestData)
//         .subscribe(
//           (response: any) => {
//             if (response && Array.isArray(response.data)) {
//               this.schoolList = response.data.map((item: any) => {
//                 const isActiveString = item.isActive === "1" ? "Active" : "InActive";
//                 return {
//                   ID: item.id,
//                   Name: item.name,
//                   IsActive: isActiveString
//                 };
//               });            
//             } else {
//               this.schoolList = [];
//             }
//           },
//           (error) => {
//             this.schoolList = [];
//           }
//         );
//   };
  
//   FetchAcademicYearsList() {
//       const requestData = { SchoolID:this.AdminselectedSchoolID||'',Flag: '3' };
  
//       this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', requestData)
//         .subscribe(
//           (response: any) => {
//             if (response && Array.isArray(response.data)) {
//               this.academicYearList = response.data.map((item: any) => {
//                 const isActiveString = item.isActive === "1" ? "Active" : "InActive";
//                 return {
//                   ID: item.id,
//                   Name: item.name,
//                   IsActive: isActiveString
//                 };
//               });            
//             } else {
//               this.academicYearList = [];
//             }
//           },
//           (error) => {
//             this.academicYearList = [];
//           }
//         );
//   };

//   FetchDashboardCountsList() {
//     const requestData = { 
//       SchoolID:this.AdminselectedSchoolID||'',
//       AcademicYear:this.AdminselectedAcademivYearID||'',
//       Flag: '1' };

//     this.apiurl.post<any>('Proc_DashboardData_Controller', requestData)
//       .subscribe(
//         (response: any) => {
//           if (response && Array.isArray(response.data)) {
//             this.DashboardCountsList = response.data.map((item: any) => {
//               return {
//                 ClassCount: item.classCount,
//                 DivisionsCount: item.divisionsCount,
//                 StaffCount: item.staffCount,
//                 StudentsCount: item.studentsCount
//               };
//             });            
//           } else {
//             this.DashboardCountsList = [];
//           }
//         },
//         (error) => {
//           this.DashboardCountsList = [];
//         }
//       );
//       console.log('this.DashboardCountsList',this.DashboardCountsList);
//   };

//   SubmitFilterList(){

//   }

//   onAdminSchoolChange(event: Event) {
//       this.academicYearList=[];
//       this.ClassDivisionForm.get('AcademicYear').patchValue('0');
//       const target = event.target as HTMLSelectElement;
//       const schoolID = target.value;
//       if(schoolID=="0"){
//         this.AdminselectedSchoolID="";
//       }else{
//         this.AdminselectedSchoolID = schoolID;
//       }  
//       console.log('this.AdminselectedSchoolID',this.AdminselectedSchoolID);  
//       this.FetchAcademicYearsList();
//   };

//   onAdminAcademicYearChange(event: Event) {
//       this.DashboardCountsList = [];
//       const target = event.target as HTMLSelectElement;
//       const schoolID = target.value;
//       if(schoolID=="0"){
//         this.AdminselectedAcademivYearID="";
//       }else{
//         this.AdminselectedAcademivYearID = schoolID;
//       }    
//       this.FetchDashboardCountsList();
//     };
// }



// Second Dashboard with graphs
// import { Component } from '@angular/core';
// import { MatIcon, MatIconModule } from '@angular/material/icon';
// import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
// import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
// import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
// import { Router } from '@angular/router';
// import { ApiServiceService } from '../../../Services/api-service.service';
// import { LoaderService } from '../../../Services/loader.service';
// import { NgxEchartsModule } from 'ngx-echarts';

// @Component({
//   selector: 'app-admin-main-dashboard',
//   standalone: true,
//   imports: [
//     NgIf,
//     NgFor,
//     NgClass,
//     NgStyle,
//     MatIconModule,
//     DashboardTopNavComponent,
//     ReactiveFormsModule,
//     FormsModule,
//     MatIcon,
//     NgxEchartsModule
//   ],
//   templateUrl: './admin-main-dashboard.component.html',
//   styleUrl: './admin-main-dashboard.component.css'
// })
// export class AdminMainDashboardComponent {

//   constructor(
//     router: Router,
//     private apiurl: ApiServiceService,
//     public loader: LoaderService
//   ) {}

//   DashboardCountsList: any[] = [];
//   schoolList: any[] = [];
//   academicYearList: any[] = [];

//   AdminselectedSchoolID: string | null = null;
//   AdminselectedAcademivYearID: string | null = null;

//   studentsChartOptions: any;
//   staffChartOptions: any;
//   attendanceChartOptions: any;
//   feeChartOptions: any;

//   ClassDivisionForm = new FormGroup({
//     School: new FormControl('0'),
//     AcademicYear: new FormControl('0')
//   });

//   ngOnInit(): void {
//     this.FetchSchoolsList();
//     this.loadDashboard();
//   }

//   loadDashboard(){
//     this.FetchDashboardCountsList();
//     this.loadStudentsChart();
//     this.loadStaffChart();
//     this.loadAttendanceChart();
//     this.loadFeeChart();
//   }

//   FetchSchoolsList() {

//     const requestData = { Flag: '2' };

//     this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', requestData)
//       .subscribe((response: any) => {

//         if (response && Array.isArray(response.data)) {

//           this.schoolList = response.data.map((item: any) => ({
//             ID: item.id,
//             Name: item.name
//           }));

//         } else {
//           this.schoolList = [];
//         }

//       });
//   }

//   FetchAcademicYearsList() {

//     const requestData = {
//       SchoolID: this.AdminselectedSchoolID,
//       Flag: '3'
//     };

//     this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', requestData)
//       .subscribe((response: any) => {

//         if (response && Array.isArray(response.data)) {

//           this.academicYearList = response.data.map((item: any) => ({
//             ID: item.id,
//             Name: item.name
//           }));

//         } else {
//           this.academicYearList = [];
//         }

//       });
//   }

//   FetchDashboardCountsList() {
//     const requestData = { 
//       SchoolID:this.AdminselectedSchoolID||'',
//       AcademicYear:this.AdminselectedAcademivYearID||'',
//       Flag: '1' };

//     this.apiurl.post<any>('Proc_DashboardData_Controller', requestData)
//       .subscribe(
//         (response: any) => {
//           if (response && Array.isArray(response.data)) {
//             this.DashboardCountsList = response.data.map((item: any) => {
//               return {
//                 ClassCount: item.classCount,
//                 DivisionsCount: item.divisionsCount,
//                 StaffCount: item.staffCount,
//                 StudentsCount: item.studentsCount
//               };
//             });            
//           } else {
//             this.DashboardCountsList = [];
//           }
//         },
//         (error) => {
//           this.DashboardCountsList = [];
//         }
//       );
//       console.log('this.DashboardCountsList',this.DashboardCountsList);
//   };

//   /* Students Chart */

//   loadStudentsChart(){
//     const requestData = {
//       SchoolID: this.AdminselectedSchoolID,
//       AcademicYear: this.AdminselectedAcademivYearID,
//       Flag: '2'
//     };

//     this.apiurl.post<any>('Proc_DashboardData_Controller', requestData)
//     .subscribe(res => {

//       const classes = res.data.map((x:any)=>x.name);
//       const counts = res.data.map((x:any)=>Number(x.studentCount));

//       const tooltipData = res.data.map((x:any)=>({
//         school:x.schoolName,
//         syllabus:x.syllabusName
//       }));

//       this.studentsChartOptions = {

//         tooltip:{
//           trigger:'axis',
//           formatter:(params:any)=>{

//             const index = params[0].dataIndex;
//             const data = tooltipData[index];

//             return `
//             <b>${classes[index]}</b><br>
//             Students : ${counts[index]}<br>
//             School : ${data.school}<br>
//             Syllabus : ${data.syllabus}
//             `;
//           }
//         },

//         xAxis:{
//           type:'category',
//           data:classes,
//           axisLabel:{
//             rotate:25
//           }
//         },

//         yAxis:{
//           type:'value'
//         },

//         series:[
//           {
//             type:'bar',
//             data:counts,
//             barWidth:'45%',
//             itemStyle:{
//               borderRadius:[6,6,0,0],
//               color:'#3B82F6'
//             }
//           }
//         ]

//       };

//     });

//   }

//   /* Staff Chart */

//   loadStaffChart(){

//     const requestData={
//       SchoolID:this.AdminselectedSchoolID,
//       AcademicYear:this.AdminselectedAcademivYearID,
//       Flag:'3'
//     };

//     this.apiurl.post<any>('Proc_DashboardData_Controller',requestData)
//     .subscribe(res=>{

//       this.staffChartOptions={

//         tooltip:{ trigger:'item' },

//         series:[
//           {
//             type:'pie',
//             radius:['40%','70%'],
//             data:res.data.map((x:any)=>({
//               value:x.count,
//               name:x.staffType
//             }))
//           }
//         ]

//       };

//     });

//   }

//   /* Attendance Chart */

//   loadAttendanceChart(){

//     const requestData={
//       SchoolID:this.AdminselectedSchoolID,
//       AcademicYear:this.AdminselectedAcademivYearID,
//       Flag:'4'
//     };

//     this.apiurl.post<any>('Proc_DashboardData_Controller',requestData)
//     .subscribe(res=>{

//       const months = res.data.map((x:any)=>x.month);
//       const values = res.data.map((x:any)=>x.attendance);

//       this.attendanceChartOptions = {
//         xAxis:{ type:'category', data:months },
//         yAxis:{ type:'value' },
//         series:[
//           {
//             type:'line',
//             data:values,
//             smooth:true,
//             areaStyle:{}
//           }
//         ]
//       };

//     });
//   }

//   /* Fee Chart */

//   loadFeeChart(){

//     const requestData={
//       SchoolID:this.AdminselectedSchoolID,
//       AcademicYear:this.AdminselectedAcademivYearID,
//       Flag:'5'
//     };

//     this.apiurl.post<any>('Proc_DashboardData_Controller',requestData)
//     .subscribe(res=>{

//       const months = res.data.map((x:any)=>x.month);
//       const values = res.data.map((x:any)=>x.amount);

//       this.feeChartOptions={
//         xAxis:{ type:'category', data:months },
//         yAxis:{ type:'value' },
//         series:[
//           {
//             type:'line',
//             data:values,
//             areaStyle:{},
//             smooth:true,
//             color:'#F59E0B'
//           }
//         ]
//       };

//     });
//   }

//   onAdminSchoolChange(event: Event){

//     const schoolID = (event.target as HTMLSelectElement).value;
//     this.AdminselectedSchoolID = schoolID === "0" ? null : schoolID;

//     this.FetchAcademicYearsList();
//     this.loadDashboard();
//   }

//   onAdminAcademicYearChange(event: Event){

//     const yearID = (event.target as HTMLSelectElement).value;
//     this.AdminselectedAcademivYearID = yearID === "0" ? null : yearID;

//     this.loadDashboard();
//   }

// }
import { Component } from '@angular/core';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiServiceService } from '../../../Services/api-service.service';
import { LoaderService } from '../../../Services/loader.service';
import { NgxEchartsModule } from 'ngx-echarts';

@Component({
selector:'app-admin-main-dashboard',
standalone:true,
imports:[
NgIf,
NgFor,
NgClass,
MatIconModule,
DashboardTopNavComponent,
FormsModule,
NgxEchartsModule
],
templateUrl:'./admin-main-dashboard.component.html',
styleUrl:'./admin-main-dashboard.component.css'
})
export class AdminMainDashboardComponent{

constructor(
private apiurl:ApiServiceService,
public loader:LoaderService
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

}