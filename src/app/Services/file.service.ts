import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../Environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FileService {

  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) {}

  // uploadStudentDocs(formData: FormData): Observable<HttpEvent<any>> {
  //   return this.http.post<any>(
  //     `${this.baseUrl}/upload-student-docs`,
  //     formData,
  //     {
  //       reportProgress: true,
  //       observe: 'events'
  //     }
  //   );
  // }

  uploadStudentDocs(formData: FormData): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/upload-student-docs`,
      formData
    );
  }

  getStudentFiles(admissionId: string) {
    return this.http.get<any>(
      `${this.baseUrl}/get-student-files/${admissionId}`
    );
  }

  deleteStudentFile(payload: any) {
    return this.http.delete<any>(
      `${this.baseUrl}/delete-student-file`,
      { body: payload }
    );
  }

  getFullFileUrl(path: string): string {

  if (!path) return '';

  // 🔥 Fix wrong stored path
  let fixedPath = path;

  if (path.includes('api/files')) {
    fixedPath = path.replace('api/files', 'api/SchoolManagement');
  }

  // 🔥 Ensure no double slashes
  return `${environment.imgUrl.replace(/\/$/, '')}/${fixedPath.replace(/^\//, '')}`;
}
}