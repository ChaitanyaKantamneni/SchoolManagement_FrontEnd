import { Injectable } from '@angular/core';
import { ApiServiceService } from './api-service.service';
import { Observable } from 'rxjs';

export interface HomeworkSubmission {
  ID?: string;
  SchoolID?: string;
  AcademicYear?: string;
  HomeworkID?: number;
  StudentAdmissionNo?: string;
  Class?: number;
  Division?: number;
  SubmissionText?: string;
  AttachmentURL?: string;
  SubmissionDate?: Date;
  SubmissionStatus?: string;
  MarksObtained?: string;
  Remarks?: string;
  IsActive?: boolean;
  CreatedBy?: string;
  CreatedIp?: string;
  CreatedDate?: Date;
  ModifiedBy?: string;
  ModifiedIp?: string;
  ModifiedDate?: Date;
  HomeworkTitle?: string;
  StudentName?: string;
  Status?: string;
  totalcount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class HomeworkSubmissionService {
  constructor(private apiService: ApiServiceService) {}

  // Submit homework
  submitHomework(submission: HomeworkSubmission): Observable<any> {
    const data = {
      ...submission,
      Flag: '1'
    };
    return this.apiService.post('Tbl_HomeworkSubmission_CRUD_Operations', data);
  }

  // Get all submissions (for teachers/admins)
  getAllSubmissions(params?: {
    SchoolID?: string;
    AcademicYear?: string;
    Class?: number;
    Division?: number;
    HomeworkID?: number;
    SubmissionStatus?: string;
    IsActive?: boolean;
    Limit?: number;
    Offset?: number;
    SortColumn?: string;
    SortDirection?: string;
    LastCreatedDate?: string;
    LastID?: number;
  }): Observable<any> {
    const data = {
      ...params,
      Flag: '2'
    };
    return this.apiService.post('Tbl_HomeworkSubmission_CRUD_Operations', data);
  }

  // Get active submissions
  getActiveSubmissions(params?: any): Observable<any> {
    const data = {
      ...params,
      Flag: '3'
    };
    return this.apiService.post('Tbl_HomeworkSubmission_CRUD_Operations', data);
  }

  // Get submission by ID
  getSubmissionById(id: string): Observable<any> {
    const data = {
      ID: id,
      Flag: '4'
    };
    return this.apiService.post('Tbl_HomeworkSubmission_CRUD_Operations', data);
  }

  // Update submission
  updateSubmission(submission: HomeworkSubmission): Observable<any> {
    const data = {
      ...submission,
      Flag: '5'
    };
    return this.apiService.post('Tbl_HomeworkSubmission_CRUD_Operations', data);
  }

  // Get submission count
  getSubmissionCount(params?: any): Observable<any> {
    const data = {
      ...params,
      Flag: '6'
    };
    return this.apiService.post('Tbl_HomeworkSubmission_CRUD_Operations', data);
  }

  // Search submissions
  searchSubmissions(params?: any): Observable<any> {
    const data = {
      ...params,
      Flag: '7'
    };
    return this.apiService.post('Tbl_HomeworkSubmission_CRUD_Operations', data);
  }

  // Get search count
  getSearchCount(params?: any): Observable<any> {
    const data = {
      ...params,
      Flag: '8'
    };
    return this.apiService.post('Tbl_HomeworkSubmission_CRUD_Operations', data);
  }
}
