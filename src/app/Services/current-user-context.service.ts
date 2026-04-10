import { Injectable } from '@angular/core';

export interface CurrentUserContext {
  roleId: string;
  roleName: string;
  userId: string;
  email: string;
  schoolId: string;
  schoolName: string;
  departmentName: string;
}

@Injectable({
  providedIn: 'root'
})
export class CurrentUserContextService {
  getContext(): CurrentUserContext {
    const roleId = this.read('RollID');

    return {
      roleId,
      roleName: this.getRoleLabel(roleId),
      userId: this.read('UserID', 'EMP-1024'),
      email: this.read('email', 'staff.user@school.com'),
      schoolId: this.readAny(['SchoolID', 'schoolId']),
      schoolName: this.read('schoolName', 'Smart School Campus'),
      departmentName: this.read('departmentName', 'General Administration')
    };
  }

  isAdminRole(roleId: string): boolean {
    return roleId === '1';
  }

  isStaffOrTeacherRole(roleId: string): boolean {
    return roleId === '3' || roleId === '4';
  }

  private getRoleLabel(roleId: string): string {
    const roleMap: Record<string, string> = {
      '1': 'Admin',
      '2': 'Principal',
      '3': 'Teacher',
      '4': 'Staff',
      '5': 'Student',
      '6': 'Parent'
    };

    return roleMap[roleId] || 'User';
  }

  private read(key: string, fallback = ''): string {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || fallback;
  }

  private readAny(keys: string[], fallback = ''): string {
    for (const key of keys) {
      const value = this.read(key);
      if (value) {
        return value;
      }
    }
    return fallback;
  }
}
