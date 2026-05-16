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

  // Download file to local PC (forces download instead of opening in new tab)
  downloadFile(path: string, filename?: string, fallbackPath?: string): void {
    const fullUrl = this.getFullFileUrl(path);
    if (!fullUrl) return;

    const downloadName = filename || this.getCleanFileName(path);

    this.attemptFetch(fullUrl, downloadName).catch(err => {
      console.error('Download failed for primary URL:', err);
      
      // If a fallback path is provided and primary failed, try the fallback
      if (fallbackPath) {
        const fallbackUrl = this.getFullFileUrl(fallbackPath);
        console.log('Trying fallback URL:', fallbackUrl);
        this.attemptFetch(fallbackUrl, downloadName).catch(fallbackErr => {
          this.handleDownloadFailure(fallbackUrl, downloadName, fallbackErr);
        });
      } else {
        this.handleDownloadFailure(fullUrl, downloadName, err);
      }
    });
  }

  private attemptFetch(url: string, downloadName: string): Promise<void> {
    return fetch(url, {
      method: 'GET',
      headers: {
        'Accept': '*/*'
      }
    })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const contentType = response.headers.get('content-type') || '';
      // If the backend returns JSON or HTML error page instead of the actual file
      if (contentType.includes('application/json') || contentType.includes('text/html')) {
        throw new Error(`HTTP 404 - Server returned ${contentType} (File Not Found)`);
      }
      
      return response.blob();
    })
    .then(blob => {
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    });
  }

  private handleDownloadFailure(url: string, downloadName: string, err: any): void {
    console.error('Final download failure:', err);
    if (err.message && err.message.includes('HTTP')) {
       alert("File not found on the server. It may have been moved, deleted, or the path is invalid.");
    } else {
       // Fallback for CORS or network issues
       const link = document.createElement('a');
       link.href = url;
       link.target = '_blank';
       link.download = downloadName;
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
    }
  }

  getCleanFileName(path: string): string {
    if (!path) return '';
    const name = path.split('/').pop() || 'file';
    // Remove GUID prefix (e.g., 550e8400-e29b-41d4-a716-446655440000_filename.txt -> filename.txt)
    return name.replace(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}_/, '');
  }

  private getFileNameFromPath(path: string): string {
    return path.split('/').pop() || 'download';
  }

// getFullFileUrl(path: string): string {

//     if (!path) return '';

//     // 🔥 Fix wrong stored path
//     let fixedPath = path;

//     if (path.includes('api/files')) {
//       fixedPath = path.replace('api/files', 'api/SchoolManagement');
//     }

//     // 🔥 Ensure no double slashes
//     return `${environment.imgUrl.replace(/\/$/, '')}/${fixedPath.replace(/^\//, '')}`;
//   }

getFullLogoFileUrl(path: string): string {

    if (!path) return '';

    // always build full API path
    return `${environment.imgUrl.replace(/\/$/, '')}/api/SchoolManagement/${path.replace(/^\//, '')}`;
  }

  uploadSchoolLogo(fd: FormData) {
    return this.http.post(`${this.baseUrl}/upload-school-logo`, fd);
  }

  getSchoolLogo(schoolId: string) {
    return this.http.get(`${this.baseUrl}/get-school-logo/${schoolId}`);
  }
}