import { Injectable } from '@angular/core';
import { ApiServiceService } from '../../../Services/api-service.service';
import { Observable } from 'rxjs';
import { HostelMaster, HostelMasterResponse } from './hostel-master.model';

@Injectable({
  providedIn: 'root'
})
export class HostelMasterService {
  private readonly endpoint = 'Tbl_HostelMaster_CRUD_Operations';

  constructor(private apiService: ApiServiceService) { }

  crudOperations(payload: HostelMaster): Observable<HostelMasterResponse> {
    return this.apiService.post<HostelMasterResponse>(this.endpoint, payload);
  }
}
