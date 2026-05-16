import { Injectable } from '@angular/core';

export interface LeaveBalancePolicy {
  id: string;
  schoolId: string;
  schoolName: string;
  academicYearId: string;
  academicYearName: string;
  leaveType: string;
  count: number;
  isActive: boolean;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class LeaveBalancePolicyService {
  private readonly storageKey = 'leave-balance-policies-v1';

  getAllPolicies(): LeaveBalancePolicy[] {
    if (!this.canUseStorage()) {
      return [];
    }

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      const mapped = parsed
        .filter(item => item && typeof item === 'object')
        .map(item => ({
          id: String(item.id ?? ''),
          schoolId: String(item.schoolId ?? ''),
          schoolName: String(item.schoolName ?? ''),
          academicYearId: String(item.academicYearId ?? ''),
          academicYearName: String(item.academicYearName ?? item.academicYear ?? ''),
          leaveType: String(item.leaveType ?? ''),
          count: Number(item.count ?? item.total ?? 0),
          isActive: Boolean(item.isActive),
          updatedAt: String(item.updatedAt ?? '')
        }))
        .filter(item => item.id && item.schoolName && item.academicYearName && item.leaveType);

      return mapped;
    } catch {
      return [];
    }
  }

  getPoliciesFor(schoolName: string, academicYearName: string): LeaveBalancePolicy[] {
    const schoolKey = this.normalize(schoolName);
    const yearKey = this.normalize(academicYearName);

    return this.getAllPolicies()
      .filter(item => item.isActive)
      .filter(item => this.normalize(item.schoolName) === schoolKey)
      .filter(item => this.normalize(item.academicYearName) === yearKey)
      .sort((a, b) => a.leaveType.localeCompare(b.leaveType));
  }

  getAcademicYearsForSchool(schoolName: string): string[] {
    const schoolKey = this.normalize(schoolName);
    const years = this.getAllPolicies()
      .filter(item => item.isActive)
      .filter(item => this.normalize(item.schoolName) === schoolKey)
      .map(item => item.academicYearName);

    return Array.from(new Set(years));
  }

  savePolicy(payload: Omit<LeaveBalancePolicy, 'id' | 'updatedAt'> & { id?: string }): LeaveBalancePolicy {
    const list = this.getAllPolicies();
    const id = payload.id || this.generateId();
    const record: LeaveBalancePolicy = {
      id,
      schoolId: payload.schoolId ? String(payload.schoolId).trim() : '',
      schoolName: payload.schoolName.trim(),
      academicYearId: payload.academicYearId ? String(payload.academicYearId).trim() : '',
      academicYearName: payload.academicYearName.trim(),
      leaveType: payload.leaveType.trim(),
      count: Math.max(0, Number(payload.count || 0)),
      isActive: payload.isActive,
      updatedAt: new Date().toISOString()
    };

    const index = list.findIndex(item => item.id === id);
    if (index >= 0) {
      list[index] = record;
    } else {
      list.unshift(record);
    }

    this.saveAllPolicies(list);
    return record;
  }

  deletePolicy(id: string): void {
    const list = this.getAllPolicies().filter(item => item.id !== id);
    this.saveAllPolicies(list);
  }

  private saveAllPolicies(list: LeaveBalancePolicy[]): void {
    if (!this.canUseStorage()) {
      return;
    }
    localStorage.setItem(this.storageKey, JSON.stringify(list));
  }

  private generateId(): string {
    return `lb-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  private normalize(value: string): string {
    return (value || '').trim().toLowerCase();
  }

  private canUseStorage(): boolean {
    return typeof localStorage !== 'undefined';
  }
}
