import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class  schoolGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const schoolNameFromStorage = sessionStorage.getItem('schoolName');
    const roleId = sessionStorage.getItem('RollID');

    // Admin users can access any Admin route
    if (roleId === '1') return true;

    // Non-admin users must match their schoolName
    const schoolNameFromUrl = route.paramMap.get('schoolName');
    if (schoolNameFromUrl === schoolNameFromStorage && schoolNameFromStorage) {
      return true;
    }

    // If not matching, redirect to the correct school dashboard
    this.router.navigate([`/${schoolNameFromStorage}/dashboard`], { replaceUrl: true });
    return false;
  }
};
