// import { Routes } from '@angular/router';
// import { SignInComponent } from './SignInAndSignUp/sign-in/sign-in.component';
// import { AdminDashboardComponent } from './Admin/admin-dashboard/admin-dashboard.component';
// import { AdminMainDashboardComponent } from './Admin/admin-dashboard/admin-main-dashboard/admin-main-dashboard.component';
// import { SchoolDetailsComponent } from './Admin/Masters/school-details/school-details.component';
// import { AcademicYearComponent } from './Admin/Masters/academic-year/academic-year.component';
// import { SyllabusComponent } from './Admin/Masters/syllabus/syllabus.component';
// import { ClassComponent } from './Admin/Masters/class/class.component';
// import { ClassDivisionComponent } from './Admin/Masters/class-division/class-division.component';
// import { RolesComponent } from './Admin/Masters/roles/roles.component';
// import { ModulesComponent } from './Admin/Masters/modules/modules.component';
// import { PagesComponent } from './Admin/Masters/pages/pages.component';
// import { StaffComponent } from './Admin/Masters/staff/staff.component';
// import { SideBarComponentComponent } from './SideBar/side-bar-component/side-bar-component.component';

// export const routes: Routes = [
//   {path:'',component:SignInComponent},
//   {path:'signin',component:SignInComponent},
//   {path:'Admin',component:AdminDashboardComponent,
//     children:[
//       {path:'',component:AdminMainDashboardComponent},
//       {path:'Dashboad',component:AdminMainDashboardComponent},
//       {path:'Masters/Staff',component:StaffComponent},
//       {path:'Masters/SchoolDetails',component:SchoolDetailsComponent},
//       {path:'Masters/AcademicYear',component:AcademicYearComponent},
//       {path:'Masters/Syllabus',component:SyllabusComponent},
//       {path:'Masters/Class',component:ClassComponent},
//       {path:'Masters/Division',component:ClassDivisionComponent},
//       {path:'Masters/Modules',component:ModulesComponent},
//       {path:'Masters/Pages',component:PagesComponent},
//       {path:'Masters/Role',component:RolesComponent}
//     ]
//   },
//   {path:'OthersSideBar',component:SideBarComponentComponent}
// ];


import { Routes } from '@angular/router';
import { SignInComponent } from './SignInAndSignUp/sign-in/sign-in.component';
import { AdminDashboardComponent } from './Admin/admin-dashboard/admin-dashboard.component';
import { AdminMainDashboardComponent } from './Admin/admin-dashboard/admin-main-dashboard/admin-main-dashboard.component';
import { SchoolDetailsComponent } from './Admin/Masters/school-details/school-details.component';
import { AcademicYearComponent } from './Admin/Masters/academic-year/academic-year.component';
import { SyllabusComponent } from './Admin/Masters/syllabus/syllabus.component';
import { ClassComponent } from './Admin/Masters/class/class.component';
import { ClassDivisionComponent } from './Admin/Masters/class-division/class-division.component';
import { RolesComponent } from './Admin/Masters/roles/roles.component';
import { ModulesComponent } from './Admin/Masters/modules/modules.component';
import { PagesComponent } from './Admin/Masters/pages/pages.component';
import { StaffComponent } from './Admin/Masters/staff/staff.component';
import { SideBarComponentComponent } from './SideBar/side-bar-component/side-bar-component.component';
import { SubjectComponent } from './Admin/Masters/subject/subject.component';
import { SubjectStaffComponent } from './Admin/Masters/subject-staff/subject-staff.component';
import { AdmissionComponent } from './Admin/AcademicModule/admission/admission.component';
import { AllotClassTeacherComponent } from './Admin/AcademicModule/allot-class-teacher/allot-class-teacher.component';
import { PromotionComponent } from './Admin/AcademicModule/promotion/promotion.component';
import { DePromotionComponent } from './Admin/AcademicModule/de-promotion/de-promotion.component';
import { TransferStudentsComponent } from './Admin/AcademicModule/transfer-students/transfer-students.component';
import { BusesComponent } from './Admin/Transporation/buses/buses.component';
import { RoutesComponent } from './Admin/Transporation/routes/routes.component';
import { StopsComponent } from './Admin/Transporation/stops/stops.component';
import { FareComponent } from './Admin/Transporation/fare/fare.component';

export const routes: Routes = [
  { path: '', component: SignInComponent },
  { path: 'signin', component: SignInComponent },

  // Admin
  {
    path: 'Admin', component: AdminDashboardComponent,
    children: [
      { path: '', component: AdminMainDashboardComponent },
      { path: 'Dashboad', component: AdminMainDashboardComponent },
      { path: 'Staff', component: StaffComponent },
      { path: 'SchoolDetails', component: SchoolDetailsComponent },
      { path: 'AcademicYear', component: AcademicYearComponent },
      { path: 'Syllabus', component: SyllabusComponent },
      { path: 'Class', component: ClassComponent },
      { path: 'Division', component: ClassDivisionComponent },
      { path: 'Subject', component: SubjectComponent },
      { path: 'SubjectStaff', component: SubjectStaffComponent },
      { path: 'Modules', component: ModulesComponent },
      { path: 'Pages', component: PagesComponent },
      { path: 'Role', component: RolesComponent },
      { path: 'Admission', component: AdmissionComponent },
      { path: 'AllotClassTeacher', component: AllotClassTeacherComponent },
      { path: 'Promotion', component: PromotionComponent },
      { path: 'DePromotion', component: DePromotionComponent },
      { path: 'TransferStudents', component: TransferStudentsComponent },
      { path: 'Buses', component: BusesComponent },
      { path: 'Routes', component: RoutesComponent },
      { path: 'Stops', component: StopsComponent },
      { path: 'Fare', component: FareComponent },
    ]
  },

  // OthersSideBar
  {
    path: 'OthersSideBar', component: SideBarComponentComponent,
    children: [
      { path: '', component: AdminMainDashboardComponent },
      { path: 'Staff', component: StaffComponent },
      { path: 'SchoolDetails', component: SchoolDetailsComponent },
      { path: 'AcademicYear', component: AcademicYearComponent },
      { path: 'Syllabus', component: SyllabusComponent },
      { path: 'Class', component: ClassComponent },
      { path: 'Division', component: ClassDivisionComponent },
      { path: 'Subject', component: SubjectComponent },
      { path: 'SubjectStaff', component: SubjectStaffComponent },
      { path: 'Modules', component: ModulesComponent },
      { path: 'Pages', component: PagesComponent },
      { path: 'Roles', component: RolesComponent },
      { path: 'Admission', component: AdmissionComponent },
      { path: 'AllotClassTeacher', component: AllotClassTeacherComponent },
      { path: 'Promotion', component: PromotionComponent },
      { path: 'DePromotion', component: DePromotionComponent },
      { path: 'TransferStudents', component: TransferStudentsComponent },
      { path: 'Buses', component: BusesComponent },
      { path: 'Routes', component: RoutesComponent },
      { path: 'Stops', component: StopsComponent }
    ]
  }
];
