import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthMfaGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const accessToken = sessionStorage.getItem('accessToken');
    const mfaVerified = sessionStorage.getItem('mfaVerified');

    if (accessToken && mfaVerified === 'true') {
      return true;
    }

    this.router.navigate(['/signin'], { replaceUrl: true });
    return false;
  }
}
