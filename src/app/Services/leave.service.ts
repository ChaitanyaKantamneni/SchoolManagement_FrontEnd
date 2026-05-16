import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../Environments/environment';
import { ApiServiceService } from './api-service.service';
import {
  LeaveApplication,
  LeaveType,
  LeaveStatus,
  LeaveFilter,
  LeaveStatistics
} from '../models/leave.models';

@Injectable({
  providedIn: 'root'
})
export class LeaveService {
  private apiUrl = environment.baseUrl;

  constructor(private http: HttpClient, private apiService: ApiServiceService) {}

  // ─── Leave Policy ─────────────────────────────────────────────────────────
  getLeaveTypes(schoolId: string, academicYear?: string): Observable<any> {
    return this.apiService.post('Tbl_leavePolicy_CRUD_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: '',
      Limit: 100,
      SortDirection: 'desc',
      LeaveType: null
    });
  }

  // ─── Parent / Student Leave Operations ────────────────────────────────────
  applyLeave(leaveApplication: LeaveApplication): Observable<any> {
    return this.apiService.post('Tbl_LeaveApplication_Operations', {
      Flag: '1',
      SchoolID: leaveApplication.schoolId,
      AcademicYear: leaveApplication.academicYear,
      UserType: 'Student',
      StaffID: null,
      AdmissionNo: leaveApplication.studentId,
      Class: leaveApplication.classId,
      Division: leaveApplication.divisionId,
      LeavePolicyID: null,
      FromDate: leaveApplication.fromDate,
      ToDate: leaveApplication.toDate,
      NoOfDays: (leaveApplication.totalDays || 0).toString(),
      Reason: leaveApplication.reason,
      ApplicationStatus: 'Pending',
      ApprovedBy: null,
      AdminRemarks: null,
      IsActive: '1',
      CreatedBy: leaveApplication.parentId,
      CreatedIp: null,
      ModifiedBy: null,
      ModifiedIp: null
    });
  }

  getStudentLeaves(studentId: string, schoolId: string, academicYear: string): Observable<any> {
    return this.apiService.post('Tbl_LeaveApplication_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: academicYear,
      UserType: 'Student',
      StaffID: null,
      AdmissionNo: studentId,
      Class: null,
      Division: null,
      LeavePolicyID: null,
      FromDate: null,
      ToDate: null,
      NoOfDays: null,
      Reason: null,
      ApplicationStatus: null,
      ApprovedBy: null,
      AdminRemarks: null,
      IsActive: null,
      CreatedBy: null,
      CreatedIp: null,
      ModifiedBy: null,
      ModifiedIp: null
    });
  }

  getParentLeaves(parentEmail: string, schoolId: string, academicYear: string): Observable<any> {
    return this.apiService.post('Tbl_LeaveApplication_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: academicYear,
      UserType: 'Student',
      StaffID: null,
      AdmissionNo: null,
      Class: null,
      Division: null,
      LeavePolicyID: null,
      FromDate: null,
      ToDate: null,
      NoOfDays: null,
      Reason: null,
      ApplicationStatus: null,
      ApprovedBy: null,
      AdminRemarks: null,
      IsActive: null,
      CreatedBy: null,
      CreatedIp: null,
      ModifiedBy: null,
      ModifiedIp: null
    });
  }

  // ─── Status Updates (all write to same table parent reads from) ───────────
  approveLeave(leaveId: string, approvedBy: string): Observable<any> {
    return this.apiService.post('Tbl_LeaveApplication_Operations', {
      Flag: '3',
      ID: leaveId,
      ApplicationStatus: 'Approved',
      ApprovedBy: approvedBy,
      AdminRemarks: null,
      ModifiedBy: approvedBy,
      ModifiedIp: null
    });
  }

  rejectLeave(leaveId: string, rejectedBy: string, rejectionReason: string): Observable<any> {
    return this.apiService.post('Tbl_LeaveApplication_Operations', {
      Flag: '3',
      ID: leaveId,
      ApplicationStatus: 'Rejected',
      ApprovedBy: rejectedBy,
      AdminRemarks: rejectionReason,
      ModifiedBy: rejectedBy,
      ModifiedIp: null
    });
  }

  cancelLeave(leaveId: string, reason: string): Observable<any> {
    return this.apiService.post('Tbl_LeaveApplication_Operations', {
      Flag: '3',
      ID: leaveId,
      ApplicationStatus: 'Cancelled',
      AdminRemarks: reason,
      ModifiedBy: null,
      ModifiedIp: null
    });
  }

  // ─── Admin Fetch Operations ────────────────────────────────────────────────
  getAllLeaves(schoolId: string, academicYear: string, filter?: LeaveFilter): Observable<any> {
    return this.apiService.post('Tbl_LeaveApplication_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: academicYear,
      UserType: 'Student',
      StaffID: null,
      AdmissionNo: filter?.studentId || null,
      Class: filter?.classId || null,
      Division: null,
      LeavePolicyID: null,
      FromDate: filter?.fromDate || null,
      ToDate: filter?.toDate || null,
      NoOfDays: null,
      Reason: null,
      ApplicationStatus: filter?.status || null,
      ApprovedBy: null,
      AdminRemarks: null,
      IsActive: null,
      CreatedBy: null,
      CreatedIp: null,
      ModifiedBy: null,
      ModifiedIp: null
    });
  }

  getPendingLeaves(schoolId: string, academicYear: string): Observable<any> {
    return this.apiService.post('Tbl_LeaveApplication_Operations', {
      Flag: '2',
      SchoolID: schoolId,
      AcademicYear: academicYear,
      UserType: 'Student',
      StaffID: null,
      AdmissionNo: null,
      Class: null,
      Division: null,
      LeavePolicyID: null,
      FromDate: null,
      ToDate: null,
      NoOfDays: null,
      Reason: null,
      ApplicationStatus: 'Pending',
      ApprovedBy: null,
      AdminRemarks: null,
      IsActive: null,
      CreatedBy: null,
      CreatedIp: null,
      ModifiedBy: null,
      ModifiedIp: null
    });
  }

  // ─── Leave Balance ─────────────────────────────────────────────────────────
  getLeaveBalance(studentId: string, academicYear: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/StudentLeave_CRUD_Operations`, {
      Flag: '11',
      StudentID: studentId,
      AcademicYear: academicYear
    });
  }

  updateLeaveBalance(studentId: string, academicYear: string, days: number, leaveType: LeaveType): Observable<any> {
    return this.http.post(`${this.apiUrl}/StudentLeave_CRUD_Operations`, {
      Flag: '12',
      StudentID: studentId,
      AcademicYear: academicYear,
      Days: days,
      LeaveType: leaveType
    });
  }

  // ─── Statistics ────────────────────────────────────────────────────────────
  getLeaveStatistics(schoolId: string, academicYear: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/StudentLeave_CRUD_Operations`, {
      Flag: '13',
      SchoolID: schoolId,
      AcademicYear: academicYear
    });
  }

  // ─── File Operations ───────────────────────────────────────────────────────
  uploadLeaveDocument(file: File, leaveId: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('leaveId', leaveId);
    formData.append('documentType', 'leave-attachment');
    return this.http.post(`${this.apiUrl}/UploadLeaveDocument`, formData);
  }

  downloadLeaveDocument(attachmentName: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/DownloadLeaveDocument/${attachmentName}`, {
      responseType: 'blob'
    });
  }

  // ─── Helper Methods ────────────────────────────────────────────────────────
  calculateTotalDays(fromDate: string, toDate: string): number {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    return Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  isLeaveOverlapping(studentId: string, fromDate: string, toDate: string, existingLeaves: LeaveApplication[]): boolean {
    return existingLeaves.some(leave => {
      if (leave.studentId !== studentId || leave.status === LeaveStatus.REJECTED || leave.status === LeaveStatus.CANCELLED) {
        return false;
      }
      const existingStart = new Date(leave.fromDate);
      const existingEnd = new Date(leave.toDate);
      const newStart = new Date(fromDate);
      const newEnd = new Date(toDate);
      return newStart <= existingEnd && newEnd >= existingStart;
    });
  }

  getLeaveStatusColor(status: LeaveStatus): string {
    switch (status) {
      case LeaveStatus.APPROVED:  return '#22c55e';
      case LeaveStatus.REJECTED:  return '#ef4444';
      case LeaveStatus.PENDING:   return '#f59e0b';
      case LeaveStatus.CANCELLED: return '#6b7280';
      default:                    return '#6b7280';
    }
  }

  getLeaveStatusClass(status: LeaveStatus): string {
    switch (status) {
      case LeaveStatus.APPROVED:  return 'badge-approved';
      case LeaveStatus.REJECTED:  return 'badge-rejected';
      case LeaveStatus.PENDING:   return 'badge-pending';
      case LeaveStatus.CANCELLED: return 'badge-cancelled';
      default:                    return 'badge-default';
    }
  }
}
