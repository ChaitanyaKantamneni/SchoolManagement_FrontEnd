import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SideBarServiceService } from '../../Services/side-bar-service.service';
import { MenuServiceService } from '../../Services/menu-service.service';
import { FULL_ADMIN_MENU } from '../../constants/admin-full-menu';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-dashboard-top-nav',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './dashboard-top-nav.component.html',
  styleUrl: './dashboard-top-nav.component.css'
})
export class DashboardTopNavComponent implements OnInit, OnDestroy {
  @Input() shellMode = false;

  pageTitle = 'Dashboard';
  pageSubtitle = 'School ERP workspace';
  workspaceLabel = 'Workspace';
  userLabel = 'User';
  userInitial = 'U';
  searchPlaceholder = 'Search records, pages, students...';
  searchTerm = '';
  searchResults: Array<{
    moduleName: string;
    pageName: string;
    route: string;
  }> = [];
  showSearchResults = false;
  isSearching = false;
  shouldRenderHeader = true;
  isSidebarExpanded = true;

  private routeSub?: Subscription;
  private menuLoadSub?: Subscription;
  private sidebarSub?: Subscription;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private closeTimer?: ReturnType<typeof setTimeout>;

  private readonly titleMap: Record<string, string> = {
    admin: 'Dashboard',
    dashboard: 'Dashboard',
    dashboad: 'Dashboard',
    schooldetails: 'School Details',
    academicyear: 'Academic Year',
    syllabus: 'Syllabus',
    class: 'Class',
    division: 'Division',
    subject: 'Subject',
    subjectstaff: 'Subject Staff',
    modules: 'Modules',
    pages: 'Pages',
    role: 'Roles',
    staff: 'Staff',
    admission: 'Admission',
    allotclassteacher: 'Allot Class Teacher',
    classtransition: 'Class Transition',
    transferstudents: 'Transfer Students',
    bus: 'Bus',
    routes: 'Routes',
    stops: 'Stops',
    fares: 'Fares',
    feecategory: 'Fee Category',
    feeallocation: 'Fee Allocation',
    feediscountcategory: 'Fee Discount Category',
    feediscount: 'Fee Discount',
    feecollection: 'Fee Collection',
    feedues: 'Fee Dues',
    examtype: 'Exam Type',
    setexam: 'Set Exam',
    examattendance: 'Exam Attendance',
    exammarks: 'Exam Marks',
    examresults: 'Exam Results',
    viewexams: 'View Exams',
    workingdays: 'Working Days',
    sessions: 'Sessions',
    timetable: 'Time Table',
    teacherstimetable: 'Teachers Time Table',
    attendancesheet: 'Attendance Sheet',
    viewattendance: 'View Attendance',
    staffattendance: 'Staff Attendance',
    viewstaffattendance: 'View Staff Attendance',
    leavemanagement: 'Leave Management'
  };

  constructor(
    private sidebarService: SideBarServiceService,
    private router: Router,
    protected menuService: MenuServiceService
  ) {}

  ngOnInit(): void {
    const email = sessionStorage.getItem('email') || '';
    const schoolName = sessionStorage.getItem('schoolName') || '';
    const roleId = sessionStorage.getItem('RollID') || '';

    this.userLabel = email ? email.split('@')[0] : 'User';
    this.userInitial = (this.userLabel || 'U').trim().charAt(0).toUpperCase();
    this.workspaceLabel = roleId === '1' ? 'Admin Workspace' : (schoolName || 'School Workspace');

    this.updatePageContext(this.router.url);
    this.updateVisibility(this.router.url);
    this.refreshSearchResults();
    this.syncShellWidth();

    this.routeSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updatePageContext(this.router.url);
      this.updateVisibility(this.router.url);
      this.refreshSearchResults();
    });

    this.menuLoadSub = this.menuService.menuLoaded$.subscribe(() => {
      this.refreshSearchResults();
    });

    this.sidebarSub = this.sidebarService.isExpanded$.subscribe(value => {
      this.isSidebarExpanded = value;
      this.syncShellWidth();
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.menuLoadSub?.unsubscribe();
    this.sidebarSub?.unsubscribe();
  }

  toggleSidebar() {
    if (this.isMobileViewport()) {
      this.sidebarService.toggleMobileMenu();
      return;
    }

    this.sidebarService.toggleSidebar();
  }

  onSearchChange(value: string) {
    this.searchTerm = value;
    const hasQuery = this.searchTerm.trim().length >= 1;
    this.showSearchResults = hasQuery;

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    if (!hasQuery) {
      this.searchResults = [];
      this.isSearching = false;
      return;
    }

    this.isSearching = true;
    this.searchTimer = setTimeout(() => {
      this.refreshSearchResults();
      this.isSearching = false;
    }, 150);
  }

  openSearchResults() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
    }

    if (this.searchTerm.trim().length >= 1) {
      this.showSearchResults = true;
      this.refreshSearchResults();
    }
  }

  closeSearchResults() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
    }

    this.closeTimer = setTimeout(() => {
      this.showSearchResults = false;
    }, 150);
  }

  clearSearch() {
    this.searchTerm = '';
    this.searchResults = [];
    this.showSearchResults = false;
  }

  selectSearchResult(route: string) {
    this.showSearchResults = false;
    this.searchTerm = '';
    this.router.navigateByUrl(route);
  }

  logout() {
    this.menuService.clearMenu(); 
    sessionStorage.clear();
    this.router.navigate(['/signin']);
  }

  private refreshSearchResults() {
    const query = this.searchTerm.trim().toLowerCase();
    const normalizedQuery = this.normalizeForSearch(query);
    const isSuperAdmin = this.isSuperAdminRole();
    const apiMenu = this.menuService.getMenu() || [];
    // Super Admin sidebar uses FULL_ADMIN_MENU, not the API list — search must match that.
    const menu = isSuperAdmin ? FULL_ADMIN_MENU : apiMenu;

    if (!query) {
      this.searchResults = [];
      return;
    }

    if (!menu.length) {
      this.searchResults = [];
      return;
    }

    const currentRoot = this.getCurrentRoot();
    const results: Array<{
      moduleName: string;
      pageName: string;
      route: string;
    }> = [];

    for (const module of menu) {
      const moduleName = module.moduleName || '';
      const normalizedModuleName = this.normalizeForSearch(moduleName);
      const moduleMatches =
        moduleName.toLowerCase().includes(query) ||
        normalizedModuleName.includes(normalizedQuery);

      for (const page of module.pages || []) {
        if (!isSuperAdmin && page.canView !== '1') {
          continue;
        }

        const pageName = page.pageName || '';
        const normalizedPageName = this.normalizeForSearch(pageName);
        const pageMatches =
          pageName.toLowerCase().includes(query) ||
          normalizedPageName.includes(normalizedQuery) ||
          moduleMatches;

        if (pageMatches) {
          const route = `/${currentRoot}/${this.formatRoute(pageName, currentRoot)}`;
          results.push({
            moduleName,
            pageName,
            route
          });
        }
      }
    }

    this.searchResults = results.slice(0, 8);
  }

  private updateVisibility(url: string) {
    if (this.shellMode) {
      this.shouldRenderHeader = true;
      return;
    }

    const cleanUrl = (url || '').split('?')[0].split('#')[0];
    const segments = cleanUrl.split('/').filter(Boolean);
    const root = segments[0] || '';
    const schoolName = sessionStorage.getItem('schoolName') || '';

    this.shouldRenderHeader = !(
      root === 'Admin' ||
      root === 'OthersSideBar' ||
      (schoolName && root === schoolName)
    );
  }

  private syncShellWidth() {
    const width = this.isSidebarExpanded ? '270px' : '84px';
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--erp-sidebar-width', width);
    }
  }

  private isMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 768;
  }

  private getCurrentRoot(): string {
    const segments = (this.router.url || '').split('?')[0].split('#')[0].split('/').filter(Boolean);
    return segments[0] || 'Admin';
  }

  private formatRoute(name: string, root: string): string {
    const compact = (name ?? '').replace(/\s+/g, '');
    const normalized = compact.toLowerCase().replace(/[^a-z0-9]/g, '');

    const alias: Record<string, string> = {
      dashboard: root === 'Admin' || root === 'OthersSideBar' ? 'Dashboad' : 'dashboard',
      academicyear: 'AcademicYear',
      schooldetails: 'SchoolDetails',
      subjectstaff: 'SubjectStaff',
      feeallocation: 'FeeAllocation',
      feecategory: 'FeeCategory',
      feecollection: 'FeeCollection',
      feediscount: 'FeeDiscount',
      feediscountcategory: 'FeeDiscountCategory',
      feedues: 'FeeDues',
      examattendance: 'ExamAttendance',
      exammarks: 'ExamMarks',
      examresults: 'ExamResults',
      examtype: 'ExamType',
      viewexams: 'ViewExams',
      workingdays: 'WorkingDays',
      teacherstimetable: 'TeachersTimetable',
      attendancesheet: 'AttendanceSheet',
      viewattendance: 'ViewAttendance',
      staffattendance: 'Staffattendance',
      viewstaffattendance: 'ViewStaffAttendance',
      leavemanagement: 'LeaveManagement',
      classtransition: 'ClassTransition',
      transferstudents: 'TransferStudents'
    };

    return alias[normalized] ?? compact;
  }

  private updatePageContext(url: string) {
    const cleanUrl = (url || '').split('?')[0].split('#')[0];
    const segments = cleanUrl.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || 'dashboard';
    const normalized = lastSegment.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    this.pageTitle = this.titleMap[normalized] || this.formatTitle(lastSegment);

    const routeRoot = segments[0];
    if (routeRoot === 'Admin' || routeRoot === 'OthersSideBar' || routeRoot === 'dashboard') {
      this.pageSubtitle = 'School ERP workspace';
    } else if (segments.length > 1) {
      this.pageSubtitle = `${this.formatTitle(segments[0])} / ${this.formatTitle(segments[segments.length - 1])}`;
    } else {
      this.pageSubtitle = 'School ERP workspace';
    }
  }

  private formatTitle(value: string): string {
    return (value || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private normalizeForSearch(value: string): string {
    return (value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private isSuperAdminRole(): boolean {
    const id = `${sessionStorage.getItem('RollID') ?? ''}`.trim();
    return id === '1';
  }
}
