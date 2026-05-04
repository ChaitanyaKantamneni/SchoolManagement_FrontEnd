import { Injectable } from '@angular/core';
import { ApiServiceService } from './api-service.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ParentServiceService {

  constructor(private apiService: ApiServiceService) {}

  // Get parent's children list - use the correct endpoint that filters by parent
  getChildrenList(parentId: string, schoolId: string): Observable<any> {
    return this.apiService.post('Tbl_StudentDetails_CRUD_Operations', {
      Flag: '9',
      FatherEmail: parentId,
      MotherEmail: parentId,
      SchoolID: schoolId
    });
  }

  // Alternative method to get children list
  getChildrenListAlternative(parentId: string, schoolId: string): Observable<any> {
    return this.apiService.post('Tbl_StudentDetails_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      ParentEmail: parentId
    });
  }

  // Third method to get children list
  getChildrenListThird(parentId: string, schoolId: string): Observable<any> {
    return this.apiService.post('Tbl_Admission_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      ParentEmail: parentId
    });
  }

  // Fourth method - try with Email field directly
  getChildrenListFourth(parentId: string, schoolId: string): Observable<any> {
    return this.apiService.post('Tbl_StudentDetails_CRUD_Operations', {
      Flag: '9',
      Email: parentId,
      SchoolID: schoolId
    });
  }

  // Fifth method - try Tbl_Admission with FatherEmail
  getChildrenListFifth(parentId: string, schoolId: string): Observable<any> {
    return this.apiService.post('Tbl_Admission_CRUD_Operations', {
      Flag: '9',
      FatherEmail: parentId,
      MotherEmail: parentId,
      SchoolID: schoolId
    });
  }

  // Get student attendance for a specific child
  getChildAttendance(childId: string, schoolId: string, academicYear: string): Observable<any> {
    return this.apiService.post('Tbl_StudentAttendance_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: academicYear,
      AdmissionID: childId,
      Limit: '10000'
    });
  }

  // Get fee details for a specific child
  getChildFees(childId: string, schoolId: string, academicYear: string): Observable<any> {
    return this.apiService.post('Tbl_FeeCollection_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: academicYear,
      Student: childId
    });
  }

  // Get exam results for a specific child
  getChildExams(childId: string, schoolId: string, academicYear: string): Observable<any> {
    return this.apiService.post('Tbl_ExamMarks_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: academicYear,
      AdmissionID: childId
    });
  }

  // Get timetable for a specific child's class
  getChildTimetable(schoolId: string, academicYear: string, classId: string, divisionId: string): Observable<any> {
    return this.apiService.post('Tbl_TimeTable_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: academicYear,
      Class: classId,
      Division: divisionId
    });
  }

  // Get homework for a specific child
  getChildHomework(childId: string, schoolId: string, academicYear: string): Observable<any> {
    return this.apiService.post('Tbl_Homework_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: academicYear,
      StudentID: childId
    });
  }

  // Get dashboard summary for parent
  getParentDashboardSummary(parentId: string, schoolId: string, academicYear: string): Observable<any> {
    return this.apiService.post('Proc_DashboardData_RoleAware', {
      SchoolID: schoolId,
      AcademicYear: academicYear,
      UserID: parentId,
      RoleKey: 'parent',
      ChildID: null // Will be set per child
    });
  }

  // Get notices for parent
  getParentNotices(schoolId: string): Observable<any> {
    return this.apiService.post('Tbl_Notices_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId
    });
  }
}
