import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthMfaGuard implements CanActivate {
  constructor(private router: Router) {}

canActivate(): boolean {

  const token = sessionStorage.getItem('accessToken');
  const pending = sessionStorage.getItem('pendingLogin');

  console.log('GUARD CHECK:', { token, pending });

  // ❌ Not logged in
  if (!token) {
    this.router.navigate(['/signin']);
    return false;
  }

  // ❌ OTP still pending
  if (pending) {
    this.router.navigate(['/signin']);
    return false;
  }

  return true;
}
}
