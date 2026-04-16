import { Module } from '../Services/menu-service.service';

/**
 * Super Admin sidebar menu source of truth. Search must use the same list,
 * because the API menu may be empty or differ while the UI still shows these pages.
 */
export const FULL_ADMIN_MENU: Module[] = [
  {
    id: 'masters',
    moduleName: 'Masters',
    pages: [
      { id: 'schooldetails', pageName: 'School Details', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'academicyear', pageName: 'Academic Year', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'syllabus', pageName: 'Syllabus', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'class', pageName: 'Class', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'division', pageName: 'Division', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'subject', pageName: 'Subject', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'subjectstaff', pageName: 'Subject Staff', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'modules', pageName: 'Modules', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'pages', pageName: 'Pages', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'role', pageName: 'Roles', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'staff', pageName: 'Staff', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' }
    ]
  },
  {
    id: 'academic',
    moduleName: 'Academic',
    pages: [
      { id: 'admission', pageName: 'Admission', moduleID: 'academic', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'allotclassteacher', pageName: 'Allot Class Teacher', moduleID: 'academic', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'classtransition', pageName: 'Class Transition', moduleID: 'academic', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'transferstudents', pageName: 'Transfer Student', moduleID: 'academic', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' }
    ]
  },
  {
    id: 'transportation',
    moduleName: 'Transportation',
    pages: [
      { id: 'bus', pageName: 'Bus', moduleID: 'transportation', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'routes', pageName: 'Routes', moduleID: 'transportation', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'stops', pageName: 'Stops', moduleID: 'transportation', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'fares', pageName: 'Fares', moduleID: 'transportation', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' }
    ]
  },
  {
    id: 'finance',
    moduleName: 'Finance',
    pages: [
      { id: 'feecategory', pageName: 'Fee Category', moduleID: 'finance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'feeallocation', pageName: 'Fee Allocation', moduleID: 'finance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'feediscountcategory', pageName: 'Fee Discount Category', moduleID: 'finance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'feediscount', pageName: 'Fee Discounts', moduleID: 'finance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'feecollection', pageName: 'Fee Collection', moduleID: 'finance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'feedues', pageName: 'Fee Dues', moduleID: 'finance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' }
    ]
  },
  {
    id: 'timetable',
    moduleName: 'Time Table',
    pages: [
      { id: 'workingdays', pageName: 'Working Days', moduleID: 'timetable', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'sessions', pageName: 'Sessions', moduleID: 'timetable', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'timetablepage', pageName: 'TimeTable', moduleID: 'timetable', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'teacherstimetable', pageName: 'TeachersTimeTable', moduleID: 'timetable', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' }
    ]
  },
  {
    id: 'exam',
    moduleName: 'Exam',
    pages: [
      { id: 'examtype', pageName: 'Exam Type', moduleID: 'exam', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'setexam', pageName: 'Set Exam', moduleID: 'exam', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'viewexams', pageName: 'View Exams', moduleID: 'exam', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'examattendance', pageName: 'Exam Attendance', moduleID: 'exam', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'exammarks', pageName: 'Exam Marks', moduleID: 'exam', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'examresults', pageName: 'Exam Results', moduleID: 'exam', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' }
    ]
  },
  {
    id: 'attendance',
    moduleName: 'Attendance',
    pages: [
      { id: 'attendancesheet', pageName: 'AttendanceSheet', moduleID: 'attendance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'staffattendance', pageName: 'Staffattendance', moduleID: 'attendance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'viewattendance', pageName: 'ViewAttendance', moduleID: 'attendance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'viewstaffattendance', pageName: 'ViewStaffAttendance', moduleID: 'attendance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' }
    ]
  },
  {
    id: 'hrpayroll',
    moduleName: 'HR & Payroll',
    pages: [
      { id: 'payrollhead', pageName: 'Payroll Head', moduleID: 'hrpayroll', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'paymentmode', pageName: 'Payment Mode', moduleID: 'hrpayroll', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'salarysettings', pageName: 'Salary Settings', moduleID: 'hrpayroll', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'salarypay', pageName: 'Salary Pay', moduleID: 'hrpayroll', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'advancesalary', pageName: 'Advance Salary', moduleID: 'hrpayroll', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
      { id: 'salaryissued', pageName: 'Salary Issued', moduleID: 'hrpayroll', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' }
    ]
  }
];
