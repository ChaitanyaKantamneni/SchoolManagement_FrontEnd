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

  uploadHomeworkDoc(formData: FormData): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/upload-homework-doc`,
      formData
    );
  }

  deleteHomeworkFile(payload: any): Observable<any> {
    return this.http.delete<any>(
      `${this.baseUrl}/delete-homework-file`,
      { body: payload }
    );
  }

  uploadHomeworkSubmissionDoc(formData: FormData): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/upload-homework-submission-doc`,
      formData
    );
  }

  deleteHomeworkSubmissionFile(payload: any): Observable<any> {
    return this.http.delete<any>(
      `${this.baseUrl}/delete-homework-submission-file`,
      { body: payload }
    );
  }

  // ── Leave File Methods ────────────────────────────────────────────────────────
  uploadLeaveDoc(formData: FormData): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/upload-leave-doc`,
      formData
    );
  }

  deleteLeaveFile(payload: any): Observable<any> {
    return this.http.delete<any>(
      `${this.baseUrl}/delete-leave-file`,
      { body: payload }
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

    // If already full URL, return as-is
    if (path.startsWith('http')) return path;

    // Use imgUrl for static files (images, pdfs, etc.)
    const baseUrl = environment.imgUrl.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');

    return `${baseUrl}/${cleanPath}`;
  }

  isImageFile(path: string): boolean {
    return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(path);
  }

  isPdfFile(path: string): boolean {
    return /\.pdf$/i.test(path);
  }

  getFileIcon(path: string): string {
    if (this.isImageFile(path)) return 'image';
    if (this.isPdfFile(path)) return 'picture_as_pdf';
    if (/\.(doc|docx)$/i.test(path)) return 'description';
    return 'insert_drive_file';
  }

  // Download file to local PC (forces download instead of opening)
  downloadFile(path: string, filename?: string): void {
    const fullUrl = this.getFullFileUrl(path);
    if (!fullUrl) return;

    const downloadName = filename || this.getFileNameFromPath(path);

    // Fetch file as blob (no credentials to avoid CORS issues)
    fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': '*/*'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.blob();
    })
    .then(blob => {
      // Create blob URL and trigger download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    })
    .catch(err => {
      console.error('Download failed:', err);
      // Fallback: try direct download with iframe
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = fullUrl;
      document.body.appendChild(iframe);
      setTimeout(() => document.body.removeChild(iframe), 1000);
    });
  }

  private getFileNameFromPath(path: string): string {
    return path.split('/').pop() || 'download';
  }
}