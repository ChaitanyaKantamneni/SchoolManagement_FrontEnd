import { Injectable } from '@angular/core';
import { ApiServiceService } from '../../../Services/api-service.service';
import { Observable } from 'rxjs';
import { RoomMaster, RoomMasterResponse } from './room-master.model';

@Injectable({
  providedIn: 'root'
})
export class RoomMasterService {
  private readonly endpoint = 'Tbl_RoomMaster_CRUD_Operations';

  constructor(private apiService: ApiServiceService) { }

  crudOperations(payload: RoomMaster): Observable<RoomMasterResponse> {
    return this.apiService.post<RoomMasterResponse>(this.endpoint, payload);
  }
}
