import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SideBarServiceService {

  // private _isExpanded = new BehaviorSubject<boolean>(
  //   sessionStorage.getItem('isExpanded') === 'true'
  // );

  // isExpanded$ = this._isExpanded.asObservable();

  // toggleSidebar() {
  //   const newValue = !this._isExpanded.value;
  //   this._isExpanded.next(newValue);
  //   sessionStorage.setItem('isExpanded', newValue.toString());
  // }

  private _isExpanded = new BehaviorSubject<boolean>(
    sessionStorage.getItem('isExpanded') === 'true'
  );

  isExpanded$ = this._isExpanded.asObservable();

  toggleSidebar() {
    const newValue = !this._isExpanded.value;
    this._isExpanded.next(newValue);
    sessionStorage.setItem('isExpanded', newValue.toString());
  }

}
