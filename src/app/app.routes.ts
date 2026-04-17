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
import { TransferStudentsComponent } from './Admin/AcademicModule/transfer-students/transfer-students.component';
import { BusesComponent } from './Admin/Transporation/buses/buses.component';
import { RoutesComponent } from './Admin/Transporation/routes/routes.component';
import { StopsComponent } from './Admin/Transporation/stops/stops.component';
import { schoolGuard } from './guards/school.guard';
import { AuthMfaGuard } from './guards/auth-mfa.guard';
import { FareComponent } from './Admin/Transporation/fare/fare.component';
import { FeeCategoryComponent } from './Admin/Finance/fee-category/fee-category.component';
import { FeeAllocationComponent } from './Admin/Finance/fee-allocation/fee-allocation.component';
import { ExamTypeComponent } from './Admin/Exam/exam-type/exam-type.component';
import { ExammarksComponent } from './Admin/Exam/exammarks/exammarks.component';
import { ExamresultsComponent } from './Admin/Exam/examresults/examresults.component';
import { ExamattendenceComponent } from './Admin/Exam/examattendence/examattendence.component';
import { SetexamComponent } from './Admin/Exam/setexam/setexam.component';
import { ViewexamsComponent } from './Admin/Exam/viewexams/viewexams.component';
import { WorkingDaysComponent } from './Admin/TimeTable/working-days/working-days.component';
import { SessionsComponent } from './Admin/TimeTable/sessions/sessions.component';
import { TimeTableComponent } from './Admin/TimeTable/time-table/time-table.component';
import { TeachersTimeTableComponent } from './Admin/TimeTable/teachers-time-table/teachers-time-table.component';
import { FeeDiscountCategoryComponent } from './Admin/Finance/fee-discount-category/fee-discount-category.component';
import { FeeDiscountComponent } from './Admin/Finance/fee-discount/fee-discount.component';
import { FeeCollectionComponent } from './Admin/Finance/fee-collection/fee-collection.component';
// import { FeeDuesComponent } from './Admin/Finance/fee-dues/fee-dues.component';
import { FeeDuesComponent } from './Admin/Finance/fee-dues/fee-dues.component';

import { AttendanceSheetComponent } from './Admin/Attendance/attendance-sheet/attendance-sheet.component';
import { ViewAttendanceComponent } from './Admin/Attendance/view-attendance/view-attendance.component';
import { StaffattendanceComponent } from './Admin/Attendance/staffattendance/staffattendance.component';
import { ViewstaffattendanceComponent } from './Admin/Attendance/viewstaffattendance/viewstaffattendance.component';
import { PayrollHeadComponent } from './Admin/HrPayroll/payroll-head/payroll-head.component';
import { PaymentModeComponent } from './Admin/HrPayroll/payment-mode/payment-mode.component';
import { SalarySettingsComponent } from './Admin/HrPayroll/salary-settings/salary-settings.component';
import { AdvanceSalaryComponent } from './Admin/HrPayroll/advance-salary/advance-salary.component';
import { SalaryPayComponent } from './Admin/HrPayroll/salary-pay/salary-pay.component';
import { SalaryIssuedComponent } from './Admin/HrPayroll/salary-issued/salary-issued.component';

import { ApplyleaveComponent } from './Admin/LeaveManagement/applyleave/applyleave.component';
// import { LeavelistComponent } from './Admin/LeaveManagement/leavelist/leavelist.component';
import { LeaveapprovalComponent } from './Admin/LeaveManagement/leaveapproval/leaveapproval.component';
import { LeavedetailsComponent } from './Admin/LeaveManagement/leavedetails/leavedetails.component';


export const routes: Routes = [
  { path: '', component: SignInComponent },
  { path: 'signin', component: SignInComponent },

  // Admin
  {
    path: 'Admin', component: AdminDashboardComponent, canActivate: [AuthMfaGuard],
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
      { path: 'ClassTransition', component: PromotionComponent },
      { path: 'TransferStudents', component: TransferStudentsComponent },
      { path: 'Bus', component: BusesComponent },
      { path: 'Routes', component: RoutesComponent },
      { path: 'Stops', component: StopsComponent },
      { path: 'Fares', component: FareComponent },
      { path: 'FeeCategory', component: FeeCategoryComponent },
      { path: 'FeeAllocation', component: FeeAllocationComponent },
      { path: 'FeeDiscountCategory', component: FeeDiscountCategoryComponent },
      { path: 'FeeDiscount', component: FeeDiscountComponent },
      { path: 'FeeCollection', component: FeeCollectionComponent },
      { path: 'FeeDues', component: FeeDuesComponent },
      { path: 'Fare', component: FareComponent },
      { path: 'ExamType', component: ExamTypeComponent },
      { path: 'SetExam', component: SetexamComponent },
      { path: 'ExamAttendance', component: ExamattendenceComponent },
      { path: 'ExamMarks', component: ExammarksComponent },
      { path: 'ExamResults', component: ExamresultsComponent },
      { path: 'ViewExams', component: ViewexamsComponent },
      { path: 'Fares', component: FareComponent },
      { path: 'WorkingDays', component: WorkingDaysComponent },
      { path: 'Sessions', component: SessionsComponent },
      { path: 'TimeTable', component: TimeTableComponent },
      { path: 'TeachersTimetable', component: TeachersTimeTableComponent },
      { path: 'AttendanceSheet', component: AttendanceSheetComponent },
      { path: 'ViewAttendance', component: ViewAttendanceComponent },
      { path: 'Staffattendance', component: StaffattendanceComponent },
      { path: 'view-staff-attendance', redirectTo: 'ViewStaffAttendance', pathMatch: 'full' },
      { path: 'ViewStaffAttendance', component: ViewstaffattendanceComponent },
      { path: 'PayrollHead', component: PayrollHeadComponent },
      { path: 'PaymentMode', component: PaymentModeComponent },
      { path: 'SalarySettings', component: SalarySettingsComponent },
      { path: 'AdvanceSalary', component: AdvanceSalaryComponent },
      { path: 'SalaryPay', component: SalaryPayComponent },
      { path: 'SalaryIssued', component: SalaryIssuedComponent },
      { path: 'ViewStaffAttendance', component: ViewstaffattendanceComponent },
      { path: 'ApplyLeave',    component: ApplyleaveComponent },
      // { path: 'MyLeaves',      component:  LeavelistComponent},
      { path: 'LeaveApproval', component: LeaveapprovalComponent },
      { path: 'LeaveDetails',  component: LeavedetailsComponent },
    ]
  },

  // OthersSideBar
  {
    path: 'OthersSideBar', component: SideBarComponentComponent, canActivate: [AuthMfaGuard],
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
      { path: 'ClassTransition', component: PromotionComponent },
      { path: 'TransferStudents', component: TransferStudentsComponent },
      { path: 'Bus', component: BusesComponent },
      { path: 'Routes', component: RoutesComponent },
      { path: 'Stops', component: StopsComponent },
      { path: 'Fares', component: FareComponent },
      { path: 'FeeCategory', component: FeeCategoryComponent },
      { path: 'FeeAllocation', component: FeeAllocationComponent },
      { path: 'FeeDiscountCategory', component: FeeDiscountCategoryComponent },
      { path: 'FeeDiscount', component: FeeDiscountComponent },
      { path: 'FeeCollection', component: FeeCollectionComponent },
      { path: 'FeeDues', component: FeeDuesComponent },
      { path: 'Stops', component: StopsComponent },
      { path: 'ExamType', component: ExamTypeComponent },
      { path: 'SetExam', component: SetexamComponent },
      { path: 'ExamAttendance', component: ExamattendenceComponent },
      { path: 'ExamMarks', component: ExammarksComponent },
      { path: 'ExamResults', component: ExamresultsComponent },
      { path: 'ViewExams', component: ViewexamsComponent },
      { path: 'Fares', component: FareComponent },
      { path: 'WorkingDays', component: WorkingDaysComponent },
      { path: 'Sessions', component: SessionsComponent },
      { path: 'TimeTable', component: TimeTableComponent },
      { path: 'TeachersTimetable', component: TeachersTimeTableComponent },
      { path: 'AttendanceSheet', component: AttendanceSheetComponent },
      { path: 'ViewAttendance', component: ViewAttendanceComponent },
      { path: 'Staffattendance', component: StaffattendanceComponent },
      { path: 'view-staff-attendance', redirectTo: 'ViewStaffAttendance', pathMatch: 'full' },
      { path: 'ViewStaffAttendance', component: ViewstaffattendanceComponent },
      { path: 'PayrollHead', component: PayrollHeadComponent },
      { path: 'PaymentMode', component: PaymentModeComponent },
      { path: 'SalarySettings', component: SalarySettingsComponent },
      { path: 'AdvanceSalary', component: AdvanceSalaryComponent },
      { path: 'SalaryPay', component: SalaryPayComponent },
      { path: 'SalaryIssued', component: SalaryIssuedComponent },
      { path: 'ViewStaffAttendance', component: ViewstaffattendanceComponent },
      { path: 'ApplyLeave',    component: ApplyleaveComponent },
      // { path: 'MyLeaves',      component:  LeavelistComponent},
      { path: 'LeaveApproval', component: LeaveapprovalComponent },
      { path: 'LeaveDetails',  component: LeavedetailsComponent },



    ]
  },

  //SCHOOL ROOT
  {
    path: ':schoolName',
    component: SideBarComponentComponent,
    canActivate: [AuthMfaGuard, schoolGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      { path: 'dashboard', component: AdminMainDashboardComponent },
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
      { path: 'ClassTransition', component: PromotionComponent },
      { path: 'TransferStudents', component: TransferStudentsComponent },
      { path: 'Bus', component: BusesComponent },
      { path: 'Routes', component: RoutesComponent },
      { path: 'Stops', component: StopsComponent },
      { path: 'Fares', component: FareComponent },
      { path: 'FeeCategory', component: FeeCategoryComponent },
      { path: 'FeeAllocation', component: FeeAllocationComponent },
      { path: 'FeeDiscountCategory', component: FeeDiscountCategoryComponent },
      { path: 'FeeDiscount', component: FeeDiscountComponent },
      { path: 'FeeCollection', component: FeeCollectionComponent },
      { path: 'FeeDues', component: FeeDuesComponent },
      { path: 'Stops', component: StopsComponent },
      { path: 'ExamType', component: ExamTypeComponent },
      { path: 'ViewExams', component: ViewexamsComponent },
      { path: 'SetExam', component: SetexamComponent },
      { path: 'ExamAttendance', component: ExamattendenceComponent },
      { path: 'ExamMarks', component: ExammarksComponent },
      { path: 'ExamResults', component: ExamresultsComponent },


      { path: 'Fares', component: FareComponent },
      { path: 'WorkingDays', component: WorkingDaysComponent },
      { path: 'Sessions', component: SessionsComponent },
      { path: 'TimeTable', component: TimeTableComponent },
      { path: 'TeachersTimeTable', component: TeachersTimeTableComponent },
      { path: 'AttendanceSheet', component: AttendanceSheetComponent },
      { path: 'ViewAttendance', component: ViewAttendanceComponent },
      { path: 'Staffattendance', component: StaffattendanceComponent },
      { path: 'view-staff-attendance', redirectTo: 'ViewStaffAttendance', pathMatch: 'full' },
      { path: 'ViewStaffAttendance', component: ViewstaffattendanceComponent },
      { path: 'PayrollHead', component: PayrollHeadComponent },
      { path: 'PaymentMode', component: PaymentModeComponent },
      { path: 'SalarySettings', component: SalarySettingsComponent },
      { path: 'AdvanceSalary', component: AdvanceSalaryComponent },
      { path: 'SalaryPay', component: SalaryPayComponent },
      { path: 'SalaryIssued', component: SalaryIssuedComponent },
      { path: 'ViewStaffAttendance', component: ViewstaffattendanceComponent },
      { path: 'ApplyLeave',    component: ApplyleaveComponent },
      // { path: 'MyLeaves',      component:  LeavelistComponent},
      { path: 'LeaveApproval', component: LeaveapprovalComponent },
      { path: 'LeaveDetails',  component: LeavedetailsComponent },
      { path: 'LeavePolicy',    component: LeavedetailsComponent },
    ]
  }
];
