import { Injectable } from '@angular/core';
import { ApiServiceService } from '../../../Services/api-service.service';
import { Observable } from 'rxjs';
import { OutPass, OutPassResponse } from './out-pass.model';

@Injectable({
  providedIn: 'root'
})
export class OutPassService {
  private readonly endpoint = 'Tbl_OutPass_CRUD_Operations';

  constructor(private apiService: ApiServiceService) {}

  crudOperations(payload: OutPass): Observable<OutPassResponse> {
    return this.apiService.post<OutPassResponse>(this.endpoint, payload);
  }
}
