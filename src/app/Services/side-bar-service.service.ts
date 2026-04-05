import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SideBarServiceService {
  private _isExpanded = new BehaviorSubject<boolean>(
    sessionStorage.getItem('isExpanded') !== 'false'
  );
  private _isMobileMenuOpen = new BehaviorSubject<boolean>(false);

  isExpanded$ = this._isExpanded.asObservable();
  isMobileMenuOpen$ = this._isMobileMenuOpen.asObservable();

  toggleSidebar() {
    const newValue = !this._isExpanded.value;
    this._isExpanded.next(newValue);
    sessionStorage.setItem('isExpanded', newValue.toString());
  }

  setSidebarExpanded(expanded: boolean) {
    this._isExpanded.next(expanded);
    sessionStorage.setItem('isExpanded', expanded.toString());
  }

  toggleMobileMenu() {
    this.setMobileMenuOpen(!this._isMobileMenuOpen.value);
  }

  setMobileMenuOpen(open: boolean) {
    this._isMobileMenuOpen.next(open);
  }

  resetSidebar() {
    this._isExpanded.next(true);
    this._isMobileMenuOpen.next(false);
    sessionStorage.setItem('isExpanded', 'true');
  }

}
