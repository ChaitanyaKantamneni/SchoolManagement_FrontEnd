import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {

  private _loading = new BehaviorSubject<boolean>(false);
  loading$ = this._loading.asObservable();

  show() {
    setTimeout(() => this._loading.next(true)); // ✅ FIX
  }

  hide() {
    setTimeout(() => this._loading.next(false)); // ✅ FIX
  }
}