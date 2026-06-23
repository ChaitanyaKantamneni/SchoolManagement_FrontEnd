import { Injectable } from '@angular/core';
import { ApiServiceService } from './api-service.service';
import { Observable, BehaviorSubject } from 'rxjs';

export interface Role {
  id: string;
  name: string;
  isActive: boolean;
}

export interface UserRole {
  roleId: string;
  roleName: string;
  userId: string;
  schoolId?: string;
}

@Injectable({
  providedIn: 'root'
})
/**
 * Class Responsibility: Handles view logic and user interactions for RoleDetectionService.
 */
export class RoleDetectionService {
  private currentRoleSubject = new BehaviorSubject<UserRole | null>(null);
  public currentRole$ = this.currentRoleSubject.asObservable();
  
  private rolesCache: Role[] = [];

  constructor(private apiService: ApiServiceService) {}

  // Fetch all roles from API
  fetchRoles(): Observable<any> {
    return this.apiService.post('Tbl_Roles_CRUD_Operations', { Flag: '2' });
  }

  // Fetch specific role by ID
  fetchRoleById(roleId: string): Observable<any> {
    return this.apiService.post('Tbl_Roles_CRUD_Operations', { 
      Flag: '3',
      ID: roleId
    });
  }

  // Get role name by ID
  getRoleNameById(roleId: string): string {
    const role = this.rolesCache.find(r => r.id === roleId);
    return role ? role.name : '';
  }

  // Initialize roles cache
  async initializeRoles(): Promise<void> {
    try {
      const response = await this.fetchRoles().toPromise();
      if (response?.data) {
        this.rolesCache = response.data.map((item: any) => ({
          id: item.id?.toString() || '',
          name: item.name || '',
          isActive: item.isActive === "1" || item.isActive === 1 || item.isActive === true
        }));
      }
    } catch (error) {
      console.error('Error initializing roles:', error);
    }
  }

  // Detect current user role based on session data
  async detectCurrentRole(): Promise<UserRole | null> {
    // Get role ID from session
    const roleId = this.getSessionValue('RollID') || 
                   this.getSessionValue('rollID') || 
                   this.getSessionValue('menuRoleId') || 
                   this.getSessionValue('RoleID') || '';
    
    const userId = this.getSessionValue('StaffID') || 
                   this.getSessionValue('UserID') || 
                   this.getSessionValue('id') || '';
    
    const schoolId = this.getSessionValue('SchoolID') || 
                     this.getSessionValue('schoolId') || '';

    if (!roleId || !userId) {
      return null;
    }

    // First call FLAG 3 to get specific role details
    try {
      const roleResponse = await this.fetchRoleById(roleId).toPromise();
      let roleName = '';
      
      if (roleResponse?.data && roleResponse.data.length > 0) {
        const roleData = roleResponse.data[0];
        roleName = roleData.RoleName || roleData.roleName || '';
      } else {
        // Fallback to cache if API call fails
        roleName = this.getRoleNameById(roleId);
      }

      const userRole: UserRole = {
        roleId,
        roleName,
        userId,
        schoolId
      };

      this.currentRoleSubject.next(userRole);
      return userRole;
    } catch (error) {
      console.error('Error detecting current role:', error);
      // Fallback to cache
      const roleName = this.getRoleNameById(roleId);
      const userRole: UserRole = {
        roleId,
        roleName,
        userId,
        schoolId
      };
      this.currentRoleSubject.next(userRole);
      return userRole;
    }
  }

  // Get role-based UI type
  async getRoleUIType(): Promise<'teacher' | 'admin' | 'student' | 'parent'> {
    const currentRole = this.currentRoleSubject.value || await this.detectCurrentRole();
    
    if (!currentRole) {
      return 'student'; // default fallback
    }

    const roleId = currentRole.roleId;
    const roleName = currentRole.roleName.toLowerCase();

    // Based on your role mapping:
    // 1: Super Admin, 2: School Admin, 8: Principal -> admin UI
    // 3: Teaching Staff -> teacher UI  
    // 5: Student -> student UI
    // 6: Parent -> parent UI
    // 4: Driver, 7: Maid -> student UI (or limited UI)

    if (roleId === '1' || roleId === '2' || roleId === '8' || 
        roleName.includes('admin') || roleName.includes('principal') || roleName.includes('super')) {
      return 'admin';
    }
    
    if (roleId === '3' || roleName.includes('teaching') || roleName.includes('teacher')) {
      return 'teacher';
    }
    
    if (roleId === '6' || roleName.includes('parent')) {
      return 'parent';
    }
    
    // Default to student UI for other roles
    return 'student';
  }

  // Check if user has specific role
  async hasRole(roleId: string): Promise<boolean> {
    const currentRole = this.currentRoleSubject.value || await this.detectCurrentRole();
    return currentRole?.roleId === roleId;
  }

  // Check if user is admin (Super Admin, School Admin, Principal)
  async isAdmin(): Promise<boolean> {
    const uiType = await this.getRoleUIType();
    return uiType === 'admin';
  }

  // Check if user is teacher
  async isTeacher(): Promise<boolean> {
    const uiType = await this.getRoleUIType();
    return uiType === 'teacher';
  }

  // Check if user is parent
  async isParent(): Promise<boolean> {
    const uiType = await this.getRoleUIType();
    return uiType === 'parent';
  }

  // Check if user is student
  async isStudent(): Promise<boolean> {
    const uiType = await this.getRoleUIType();
    return uiType === 'student';
  }

  // Helper method to get session values
  private getSessionValue(key: string): string {
    return sessionStorage.getItem(key) || 
           localStorage.getItem(key) || 
           '';
  }

  // Get current role info
  async getCurrentRole(): Promise<UserRole | null> {
    return this.currentRoleSubject.value || await this.detectCurrentRole();
  }

  // Clear current role (for logout)
  clearCurrentRole(): void {
    this.currentRoleSubject.next(null);
  }
}
