export interface LeaveApplication {
  id?: string;
  studentId: string;
  studentName: string;
  parentId: string;
  parentEmail: string;
  schoolId: string;
  academicYear: string;
  classId: string;
  className: string;
  divisionId: string;
  divisionName: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  appliedDate: string;
  approvedDate?: string;
  approvedBy?: string;
  rejectedDate?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  attachment?: string;
  attachmentName?: string;
  schoolName?: string;
}

export enum LeaveType {
  SICK_LEAVE = 'Sick Leave',
  PERSONAL_LEAVE = 'Personal Leave',
  VACATION = 'Vacation',
  MEDICAL = 'Medical',
  FAMILY_EMERGENCY = 'Family Emergency',
  OTHER = 'Other'
}

export enum LeaveStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  CANCELLED = 'Cancelled'
}

export interface LeaveBalance {
  studentId: string;
  academicYear: string;
  totalLeaves: number;
  usedLeaves: number;
  remainingLeaves: number;
  sickLeaveUsed: number;
  personalLeaveUsed: number;
  vacationUsed: number;
}

export interface LeaveApprovalRequest {
  leaveId: string;
  status: LeaveStatus;
  approvedBy: string;
  approvedDate: string;
  rejectionReason?: string;
}

export interface LeaveFilter {
  status?: LeaveStatus;
  leaveType?: LeaveType;
  fromDate?: string;
  toDate?: string;
  studentId?: string;
  classId?: string;
}

export interface LeaveStatistics {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  currentMonthApplications: number;
}
