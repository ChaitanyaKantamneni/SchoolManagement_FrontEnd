import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from "../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component";
import { SideBarServiceService } from '../../Services/side-bar-service.service';
import { MenuServiceService, Module, Page } from '../../Services/menu-service.service';
import { Subscription, filter } from 'rxjs';
import { NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterOutlet, ReactiveFormsModule, RouterLink, RouterLinkActive, NgIf, NgFor, NgClass, MatIconModule, DashboardTopNavComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  menu: Module[] = [];
  isExpanded: boolean = false;
  isMobileMenuOpen = false;
  openedSubmenu: string | null = null;
  activeMobileSection: string | null = null;
  currentPath = '';
  userInitial = 'U';
  userLabel = 'User';
  workspaceLabel = 'Workspace';
  private roleId = '';
  private sidebarSub?: Subscription;
  private mobileSidebarSub?: Subscription;
  private routeSub?: Subscription;
  constructor(
    private router: Router,
    private sidebarService: SideBarServiceService,
    private menuService: MenuServiceService
  ) {}

  private readonly fullAdminMenu: Module[] = [
    {
      id: 'masters',
      moduleName: 'Masters',
      pages: [
        { id: 'schooldetails', pageName: 'School Details', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'academicyear', pageName: 'Academic Year', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'syllabus', pageName: 'Syllabus', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'class', pageName: 'Class', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'division', pageName: 'Division', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'subject', pageName: 'Subject', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'subjectstaff', pageName: 'Subject Staff', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'modules', pageName: 'Modules', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'pages', pageName: 'Pages', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'role', pageName: 'Roles', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'staff', pageName: 'Staff', moduleID: 'masters', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' }
      ]
    },
    {
      id: 'academic',
      moduleName: 'Academic',
      pages: [
        { id: 'admission', pageName: 'Admission', moduleID: 'academic', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'allotclassteacher', pageName: 'Allot Class Teacher', moduleID: 'academic', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'classtransition', pageName: 'Class Transition', moduleID: 'academic', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'transferstudents', pageName: 'Transfer Student', moduleID: 'academic', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' }
      ]
    },
    {
      id: 'transportation',
      moduleName: 'Transportation',
      pages: [
        { id: 'bus', pageName: 'Bus', moduleID: 'transportation', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'routes', pageName: 'Routes', moduleID: 'transportation', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'stops', pageName: 'Stops', moduleID: 'transportation', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'fares', pageName: 'Fares', moduleID: 'transportation', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' }
      ]
    },
    {
      id: 'finance',
      moduleName: 'Finance',
      pages: [
        { id: 'feecategory', pageName: 'Fee Category', moduleID: 'finance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'feeallocation', pageName: 'Fee Allocation', moduleID: 'finance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'feediscountcategory', pageName: 'Fee Discount Category', moduleID: 'finance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'feediscount', pageName: 'Fee Discounts', moduleID: 'finance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'feecollection', pageName: 'Fee Collection', moduleID: 'finance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'feedues', pageName: 'Fee Dues', moduleID: 'finance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' }
      ]
    },
    {
      id: 'timetable',
      moduleName: 'Time Table',
      pages: [
        { id: 'workingdays', pageName: 'Working Days', moduleID: 'timetable', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'sessions', pageName: 'Sessions', moduleID: 'timetable', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'timetablepage', pageName: 'TimeTable', moduleID: 'timetable', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'teacherstimetable', pageName: 'TeachersTimeTable', moduleID: 'timetable', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' }
      ]
    },
    {
      id: 'exam',
      moduleName: 'Exam',
      pages: [
        { id: 'examtype', pageName: 'Exam Type', moduleID: 'exam', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'setexam', pageName: 'Set Exam', moduleID: 'exam', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'viewexams', pageName: 'View Exams', moduleID: 'exam', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'examattendance', pageName: 'Exam Attendance', moduleID: 'exam', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'exammarks', pageName: 'Exam Marks', moduleID: 'exam', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'examresults', pageName: 'Exam Results', moduleID: 'exam', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' }
      ]
    },
    {
      id: 'attendance',
      moduleName: 'Attendance',
      pages: [
        { id: 'attendancesheet', pageName: 'AttendanceSheet', moduleID: 'attendance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'staffattendance', pageName: 'Staffattendance', moduleID: 'attendance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'viewattendance', pageName: 'ViewAttendance', moduleID: 'attendance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
        { id: 'viewstaffattendance', pageName: 'ViewStaffAttendance', moduleID: 'attendance', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' }
      ]
    },
   {
  id: 'leavemanagement',
  moduleName: 'Leave Management',
  pages: [
    { id: 'applyleave',    pageName: 'Apply Leave',     moduleID: 'leavemanagement', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
    // { id: 'leavelist',     pageName: 'My Leaves',       moduleID: 'leavemanagement', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
    { id: 'leaveapproval', pageName: 'Leave Approval',  moduleID: 'leavemanagement', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' },
    { id: 'leavedetails',  pageName: 'Leave Details',   moduleID: 'leavemanagement', canView: '1', canAdd: '1', canEdit: '1', canDelete: '1' }
  ]
}
  ];

  ngOnInit(): void {
    this.roleId = sessionStorage.getItem('RollID') || '';
    const email = sessionStorage.getItem('email') || '';
    const schoolName = sessionStorage.getItem('schoolName') || '';
    this.userLabel = email ? email.split('@')[0] : 'User';
    this.userInitial = this.userLabel.trim().charAt(0).toUpperCase();
    this.workspaceLabel = this.roleId === '1' ? 'Admin Workspace' : (schoolName || 'School Workspace');

    this.sidebarSub = this.sidebarService.isExpanded$.subscribe(value => {
      this.isExpanded = value;
    });

    this.mobileSidebarSub = this.sidebarService.isMobileMenuOpen$.subscribe(value => {
      this.isMobileMenuOpen = value;
      if (typeof document !== 'undefined') {
        document.body.style.overflow = value ? 'hidden' : '';
      }
    });

    this.routeSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.currentPath = this.router.url;
      this.sidebarService.setMobileMenuOpen(false);
    });

    if(!sessionStorage.getItem("email") || !this.roleId){
      this.router.navigate(['/signin'])
      return;
    }

    this.loadMenu(this.roleId);
    this.currentPath = this.router.url;
  }

  ngOnDestroy(): void {
    this.sidebarSub?.unsubscribe();
    this.mobileSidebarSub?.unsubscribe();
    this.routeSub?.unsubscribe();
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  // isExpanded = true;
  // toggleSidebar() {
  //   this.isExpanded = !this.isExpanded;
  // }

  toggleSidebar(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.sidebarService.toggleMobileMenu();
      return;
    }

    this.sidebarService.toggleSidebar();
  }

  goToDashboard(): void {
    this.activeMobileSection = 'dashboard';
    this.openedSubmenu = null;
    this.router.navigate(['/Admin/Dashboad']);

    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.sidebarService.setMobileMenuOpen(false);
    }
  }

  logout() {
    this.router.navigate(['/signin'])
    sessionStorage.clear();
  }

  toggleSubmenu(moduleId: string) {
    if (!this.isExpanded) {
      this.sidebarService.setSidebarExpanded(true);
    }

    if (this.openedSubmenu === moduleId) {
      this.openedSubmenu = null;
    } else {
      this.openedSubmenu = moduleId;
    }
  }

  closeAllSubmenus() {
    this.openedSubmenu = null;
  }

  private get isSuperAdmin(): boolean {
    return this.roleId === '1';
  }

  getVisibleModules(): Module[] {
    const sourceMenu = this.isSuperAdmin ? this.fullAdminMenu : (this.menu || []);
    return sourceMenu.filter(module => this.getVisiblePages(module).length > 0);
  }

  getVisiblePages(module: Module): Page[] {
    if (this.isSuperAdmin) {
      return module.pages || [];
    }
    return (module.pages || []).filter(page => page.canView === '1');
  }

  hasVisibleModule(moduleName: string): boolean {
    return !!this.findVisibleModule(moduleName);
  }

  findVisibleModule(moduleName: string): Module | undefined {
    const normalizedTarget = (moduleName || '').trim().toLowerCase();
    return this.getVisibleModules().find(module => {
      const normalizedModule = (module.moduleName || '').trim().toLowerCase();
      return normalizedModule === normalizedTarget;
    });
  }

  findVisibleModuleByNames(moduleNames: string[]): Module | undefined {
    const normalizedNames = moduleNames.map(name => (name || '').trim().toLowerCase());
    return this.getVisibleModules().find(module => {
      const normalizedModule = (module.moduleName || '').trim().toLowerCase();
      return normalizedNames.includes(normalizedModule);
    });
  }

  openMobileSection(moduleId: string): void {
    this.activeMobileSection = moduleId;
    this.openedSubmenu = moduleId;
    this.sidebarService.setSidebarExpanded(true);

    if (!this.isMobileMenuOpen) {
      this.sidebarService.setMobileMenuOpen(true);
    }
  }

  navigate(page: Page, event?: Event): void {
    event?.stopPropagation();
    const path = `/Admin/${this.formatRoute(page.pageName)}`;
    this.router.navigate([path]);
    this.currentPath = path;

    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.sidebarService.setMobileMenuOpen(false);
    }
  }

  isPageActive(page: Page): boolean {
    const expectedPath = `/Admin/${this.formatRoute(page.pageName)}`.toLowerCase();
    return this.currentPath.toLowerCase() === expectedPath;
  }

  getModuleIcon(moduleName: string): string {
    const key = (moduleName || '').trim().toLowerCase();
    const map: Record<string, string> = {
      masters: 'widgets',
      academic: 'school',
      transportation: 'commute',
      finance: 'account_balance_wallet',
      timetable: 'schedule',
      'time table': 'schedule',
      exam: 'quiz',
      attendance: 'how_to_reg',
      'leave management': 'event_note'
    };

    return map[key] || 'folder';
  }

  getPageIcon(pageName: string): string {
    const key = (pageName || '').trim().toLowerCase();
    const map: Record<string, string> = {
      'school details': 'domain',
      'academic year': 'calendar_month',
      syllabus: 'library_books',
      class: 'class',
      division: 'account_tree',
      subject: 'menu_book',
      'subject staff': 'person',
      modules: 'apps',
      pages: 'pageview',
      roles: 'badge',
      role: 'badge',
      staff: 'supervisor_account',
      admission: 'people',
      'allot class teacher': 'assignment',
      'class transition': 'autorenew',
      'transfer student': 'swap_horiz',
      'transfer students': 'swap_horiz',
      bus: 'directions_bus',
      routes: 'route',
      stops: 'place',
      fares: 'payments',
      fare: 'payments',
      'fee category': 'category',
      'fee allocation': 'assignment_ind',
      'fee discount category': 'sell',
      'fee discounts': 'local_offer',
      'fee discount': 'local_offer',
      'fee collection': 'paid',
      'fee dues': 'receipt_long',
      'working days': 'event_available',
      sessions: 'timer',
      timetable: 'view_timeline',
      'time table': 'view_timeline',
      teacherstimetable: 'groups',
      'teachers timetable': 'groups',
      'exam type': 'military_tech',
      'set exam': 'event_note',
      'view exams': 'visibility',
      'exam attendance': 'fact_check',
      'exam marks': 'grading',
      'exam results': 'insights',
      attendancesheet: 'today',
      'attendance sheet': 'today',
      staffattendance: 'badge',
      'staff attendance': 'badge',
      viewattendance: 'groups',
      'view attendance': 'groups',
      viewstaffattendance: 'groups',
      'view staff attendance': 'groups',
      'leave management': 'event_note',
      'apply leave':    'add_circle_outline',
      'my leaves':      'list_alt',
      'leave approval': 'approval',
      'leave details':  'info',
    };

    return map[key] || 'menu';
  }

  private formatRoute(name: string): string {
    const compact = (name ?? '').replace(/\s+/g, '');
    const normalized = compact.toLowerCase().replace(/[^a-z0-9]/g, '');

    const alias: Record<string, string> = {
      dashboard: 'Dashboad',
      schooldetails: 'SchoolDetails',
      academicyear: 'AcademicYear',
      subjectstaff: 'SubjectStaff',
      role: 'Role',
      roles: 'Role',
      allotclassteacher: 'AllotClassTeacher',
      classtransition: 'ClassTransition',
      transferstudent: 'TransferStudents',
      transferstudents: 'TransferStudents',
      feecategory: 'FeeCategory',
      feeallocation: 'FeeAllocation',
      feediscountcategory: 'FeeDiscountCategory',
      feediscounts: 'FeeDiscount',
      feediscount: 'FeeDiscount',
      feecollection: 'FeeCollection',
      feedues: 'FeeDues',
      examtype: 'ExamType',
      setexam: 'SetExam',
      viewexams: 'ViewExams',
      examattendance: 'ExamAttendance',
      exammarks: 'ExamMarks',
      examresults: 'ExamResults',
      workingdays: 'WorkingDays',
      teacherstimetable: 'TeachersTimetable',
      attendancesheet: 'AttendanceSheet',
      staffattendance: 'Staffattendance',
      viewattendance: 'ViewAttendance',
      viewstaffattendance: 'ViewStaffAttendance',
      applyleave:           'ApplyLeave',
      myleaves:             'MyLeaves',
      leaveapproval:        'LeaveApproval',
      leavedetails:         'LeaveDetails',
    };

    return alias[normalized] ?? compact;
  }

  private loadMenu(roleId: string): void {
    this.menuService.loadMenu(roleId).subscribe(menu => {
      this.menu = menu || [];
      this.menuService.setMenu(this.menu);

      if (this.openedSubmenu && !this.getVisibleModules().some(module => module.id?.toString() === this.openedSubmenu)) {
        this.openedSubmenu = null;
      }
    });
  }
}
