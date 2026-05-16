import { Injectable } from '@angular/core';
import { ApiServiceService } from './api-service.service';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ParentServiceService {

  constructor(private apiService: ApiServiceService) {}

  // Get academic years for a school
  getAcademicYears(schoolId: string, flag: string): Observable<any> {
    return this.apiService.post('Tbl_AcademicYear_CRUD_Operations', {
      SchoolID: schoolId,
      Flag: flag
    });
  }

  // Get parent's children list - filters by parent email from Tbl_StudentParentDetails
  // This ensures only the parent's children are returned, matching applyleave component
  getChildrenList(parentId: string, schoolId: string, academicYear?: string): Observable<any> {
    const payload: any = {
      Flag: '9',
      FatherEmail: parentId,
      MotherEmail: parentId,
      AcademicYear: academicYear || ''
    };
    return this.apiService.post('Tbl_StudentParentDetails_CRUD_Operations', payload);
  }

  // Alternative method - try with Email field if FatherEmail/MotherEmail doesn't match
  getChildrenListAlternative(parentId: string, schoolId: string, academicYear?: string): Observable<any> {
    const payload: any = {
      Flag: '9',
      Email: parentId,
      AcademicYear: academicYear || ''
    };
    return this.apiService.post('Tbl_StudentParentDetails_CRUD_Operations', payload);
  }

  // Removed fallback APIs that query different tables (Tbl_Admission_CRUD_Operations)
  // to ensure data consistency with Super Admin which uses Tbl_StudentDetails_CRUD_Operations

  // Get student attendance for a specific child
  getChildAttendance(childId: string, schoolId: string, academicYear: string): Observable<any> {
    return this.apiService.post('Tbl_StudentAttendance_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: academicYear || null, // Pass null instead of empty string
      AdmissionID: childId,
      Limit: '10000'
    });
  }

  // Get fee details for a specific child (payment history)
  getChildFees(childId: string, schoolId: string, academicYear: string): Observable<any> {
    return this.apiService.post('Tbl_FeeCollection_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: academicYear || null,
      AdmissionNo: childId
    });
  }

  // Get fee dues for a specific child
  getChildFeeDues(childId: string, schoolId: string, academicYear: string, classId?: string, divisionId?: string): Observable<any> {
    const payload: any = {
      Flag: '7',
      SchoolID: schoolId,
      AcademicYear: academicYear || null,
      Student: childId,
      AdmissionNo: childId
    };
    if (classId) payload.Class = classId;
    if (divisionId) payload.Division = divisionId;
    return this.apiService.post('Tbl_FeeCollection_CRUD_Operations', payload);
  }

  // Get exam results for a specific child and specific exam (same as Admin)
  getChildExamResults(childId: string, schoolId: string, academicYear: string, examId: string, classId?: string, divisionId?: string): Observable<any> {
    const payload: any = {
      Flag: '10',
      SchoolID: schoolId,
      AcademicYear: academicYear || null,
      AdmissionID: childId,
      ExamID: examId
    };
    if (classId) payload.Class = classId;
    if (divisionId) payload.Division = divisionId;
    return this.apiService.post('Tbl_ExamMarks_CRUD_Operations', payload);
  }

  // Get exam types for a school/academic year (same as Admin)
  getExamTypes(schoolId: string, academicYear: string): Observable<any> {
    return this.apiService.post('Tbl_Examtype_CRUD_Operations', {
      SchoolID: schoolId,
      AcademicYear: academicYear,
      Flag: '3'
    });
  }

  // Get timetable for a specific child's class
  getChildTimetable(schoolId: string, academicYear: string, classId: string, divisionId: string): Observable<any> {
    // First fetch timetable header to get ID, then fetch details with Flag: '4'
    return this.apiService.post('Tbl_TimeTable_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: academicYear,
      Class: classId,
      Division: divisionId
    }).pipe(
      switchMap((headerRes: any) => {
        const timetableList = headerRes?.data || [];
        if (timetableList.length === 0) {
          return of({ data: [] });
        }
        const timetableId = timetableList[0].id;
        return this.apiService.post('Tbl_TimeTable_CRUD_Operations', {
          Flag: '4',
          ID: timetableId
        });
      })
    );
  }

  // Get fee details by ID
  getFeeDetails(data: any): Observable<any> {
    return this.apiService.post('Tbl_FeeCollection_CRUD_Operations', data);
  }

  // Get exam mark details (same as Admin examresults)
  getExamMarkDetail(data: any): Observable<any> {
    return this.apiService.post('Tbl_ExamMarks_CRUD_Operations', data);
  }

  // Get homework for a specific child (filtered by class/division) - matching admin implementation
  getChildHomework(childId: string, schoolId: string, academicYear: string, classId?: string, divisionId?: string): Observable<any> {
    // Helper function to get integer value or null
    const getIntValue = (value?: string | number): number | null => {
      if (!value || value === '0' || value === '') {
        return null;
      }
      const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
      return isNaN(numValue) ? null : numValue;
    };

    const payload: any = {
      Flag: '2', // Same flag as admin parent role
      SchoolID: schoolId,
      AcademicYear: academicYear || '', // Use empty string to match Admin component
      Class: getIntValue(classId),
      Division: getIntValue(divisionId),
      SubjectID: null, // No subject filter for parent
      Limit: 100, // Get more records
      Offset: 0,
      SortColumn: 'CreatedDate',
      SortDirection: 'DESC'
    };
    
    console.log('[PARENT SERVICE] getChildHomework payload:', payload);
    console.log('[PARENT SERVICE] Requested for childId:', childId, 'classId:', classId, 'divisionId:', divisionId, 'academicYear:', academicYear);
    
    return this.apiService.post('Tbl_Homework_CRUD_Operations', payload);
  }

  // Get subjects list for mapping subject IDs to names
  getSubjectsList(schoolId: string, academicYear: string, classId: string): Observable<any> {
    return this.apiService.post('Tbl_Subject_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: academicYear,
      Class: classId
    });
  }

  // Submit homework
  submitHomework(submissionData: any): Observable<any> {
    return this.apiService.post('Tbl_HomeworkSubmission_CRUD_Operations', submissionData);
  }

  // Get homework submissions for student
  getHomeworkSubmissions(payload: any): Observable<any> {
    return this.apiService.post('Tbl_HomeworkSubmission_CRUD_Operations', payload);
  }

  // Get staff list for mapping staff IDs to names
  getStaffList(schoolId: string, academicYear: string): Observable<any> {
    return this.apiService.post('Tbl_Staff_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: academicYear
    });
  }

  // Get working days for mapping dayID to day names
  getWorkingDays(schoolId: string, academicYear: string): Observable<any> {
    return this.apiService.post('Tbl_WorkingDays_CRUD_Operations', {
      Flag: '3',
      SchoolID: schoolId,
      AcademicYear: academicYear
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
