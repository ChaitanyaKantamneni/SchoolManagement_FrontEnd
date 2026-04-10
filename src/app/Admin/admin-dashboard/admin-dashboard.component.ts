import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from "../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component";
import { SideBarServiceService } from '../../Services/side-bar-service.service';
import { MenuServiceService, Module, Page } from '../../Services/menu-service.service';
import { FULL_ADMIN_MENU } from '../../constants/admin-full-menu';
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

  private readonly fullAdminMenu: Module[] = FULL_ADMIN_MENU;

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
      'hr & payroll': 'account_balance'
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
      'payroll head': 'account_tree',
      'payment mode': 'payments',
      'salary settings': 'tune',
      'advance salary': 'request_quote',
      'salary pay': 'paid',
      'salary issued': 'receipt_long'
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
