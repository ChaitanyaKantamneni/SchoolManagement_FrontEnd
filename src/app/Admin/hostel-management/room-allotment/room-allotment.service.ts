import { Injectable } from '@angular/core';
import { ApiServiceService } from '../../../Services/api-service.service';
import { Observable } from 'rxjs';
import { RoomAllotment, RoomAllotmentResponse } from './room-allotment.model';

@Injectable({
  providedIn: 'root'
})
/**
 * Class Responsibility: Handles view logic and user interactions for RoomAllotmentService.
 */
export class RoomAllotmentService {
  private readonly endpoint = 'Tbl_RoomAllotment_CRUD_Operations';

  constructor(private apiService: ApiServiceService) {}

  crudOperations(payload: RoomAllotment): Observable<RoomAllotmentResponse> {
    return this.apiService.post<RoomAllotmentResponse>(this.endpoint, payload);
  }
}
