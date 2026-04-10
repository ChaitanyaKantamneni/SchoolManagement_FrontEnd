import { Component, OnDestroy, OnInit } from '@angular/core';
import { MenuServiceService, Module, Page } from '../../Services/menu-service.service';
import { Router, RouterOutlet, ActivatedRoute, NavigationEnd, RouterLinkActive } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SideBarServiceService } from '../../Services/side-bar-service.service';
import { DashboardTopNavComponent } from '../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-side-bar-component',
  templateUrl: './side-bar-component.component.html',
  styleUrls: ['./side-bar-component.component.css'],
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLinkActive,
    NgIf,
    NgFor,
    NgClass,
    ReactiveFormsModule,
    MatIconModule,
    DashboardTopNavComponent
  ]
})
export class SideBarComponentComponent implements OnInit, OnDestroy {

  menu: Module[] = [];
  isExpanded = false;
  isMobileMenuOpen = false;
  openedSubmenu: string | null = null;
  activeMobileSection: string | null = null;
  currentPath = '';

  schoolName: string | null = null;
  roleRoot!: string;
  private roleId!: string;
  private sidebarSub?: Subscription;
  private mobileSidebarSub?: Subscription;
  private routeSub?: Subscription;

  constructor(
    public menuService: MenuServiceService,
    private router: Router,
    private route: ActivatedRoute,
    private sidebarService: SideBarServiceService
  ) {}

  ngOnInit(): void {
    // Sidebar toggle subscription
    this.sidebarSub = this.sidebarService.isExpanded$.subscribe(value => this.isExpanded = value);
    this.mobileSidebarSub = this.sidebarService.isMobileMenuOpen$.subscribe(value => {
      this.isMobileMenuOpen = value;
      if (typeof document !== 'undefined') {
        document.body.style.overflow = value ? 'hidden' : '';
      }
    });

    // Get user info from sessionStorage
    const email = sessionStorage.getItem('email');
    this.roleId = sessionStorage.getItem('RollID') || '';
    this.schoolName = sessionStorage.getItem('schoolName');

    // If not logged in, redirect to signin
    if (!email || !this.roleId) {
      this.router.navigate(['/signin']);
      return;
    }

    // Set roleRoot
    this.roleRoot = this.roleId === '1' ? 'Admin' : (this.schoolName ?? '');

    if (this.roleId !== '1' && !this.schoolName) {
      this.router.navigate(['/signin']);
      return;
    }

    // Listen to route changes to prevent manual URL tampering
    this.routeSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.currentPath = this.router.url;

      if (this.roleId !== '1') {
        const routeSchool = this.route.snapshot.paramMap.get('schoolName');
        // If user manually changes schoolName in URL, redirect to correct one
        if (routeSchool && routeSchool !== this.schoolName) {
          this.router.navigate([`/${this.schoolName}/dashboard`], { replaceUrl: true });
        }
      }

      if (this.isMobileViewport()) {
        this.sidebarService.setMobileMenuOpen(false);
      }
    });

    // Initial menu load
    this.currentPath = this.router.url;
    this.loadMenu(this.roleId);
  }

  ngOnDestroy(): void {
    this.sidebarSub?.unsubscribe();
    this.mobileSidebarSub?.unsubscribe();
    this.routeSub?.unsubscribe();
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  toggleSidebar(): void {
    if (this.isMobileViewport()) {
      this.sidebarService.toggleMobileMenu();
      return;
    }

    this.sidebarService.toggleSidebar();
  }

  openMobileSection(menuName: string): void {
    this.activeMobileSection = menuName;
    this.openedSubmenu = menuName;
    this.sidebarService.setSidebarExpanded(true);

    if (!this.isMobileMenuOpen) {
      this.sidebarService.setMobileMenuOpen(true);
    }
  }

  goToDashboard(): void {
    this.activeMobileSection = 'dashboard';
    this.openedSubmenu = null;
    const path = this.roleId === '1'
      ? '/Admin/Dashboad'
      : `/${this.roleRoot}/dashboard`;

    this.router.navigate([path]);

    if (this.isMobileViewport()) {
      this.sidebarService.setMobileMenuOpen(false);
    }
  }

  // Load menu for role
  private loadMenu(roleId: string) {
    this.menuService.loadMenu(roleId).subscribe(menu => {
      this.menu = menu;
      this.menuService.setMenu(menu);

      const activeModule = this.getVisibleModules().find(module => this.isModuleActive(module));
      if (activeModule) {
        this.openedSubmenu = activeModule.id?.toString() ?? null;
        this.activeMobileSection = activeModule.id?.toString() ?? null;
        return;
      }

      if (this.openedSubmenu && !this.getVisibleModules().some(module => module.id?.toString() === this.openedSubmenu)) {
        this.openedSubmenu = null;
      }
    });
  }

  toggleSubmenu(moduleId: number | string) {
    const id = moduleId.toString();
    if (!this.isExpanded) {
      this.sidebarService.setSidebarExpanded(true);
    }
    this.openedSubmenu = this.openedSubmenu === id ? null : id;
  }

  formatRoute(name: string): string {
    const compact = (name ?? '').replace(/\s+/g, '');
    const normalized = compact.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Some schools/roles have slightly different page names coming from API
    // (e.g. "Fee Discounts" vs route path "FeeDiscount").
    const alias: Record<string, string> = {
      feediscounts: 'FeeDiscount',
      feediscount: 'FeeDiscount',
      feediscountcategory: 'FeeDiscountCategory',
      feecategories: 'FeeCategory',
      feecategory: 'FeeCategory',
      feecollections: 'FeeCollection',
      feecollection: 'FeeCollection',
      feedues: 'FeeDues',
      fare: 'Fare',
      fares: 'Fares',
      dashboard: 'dashboard',
    };

    return alias[normalized] ?? compact;
  }

  getVisibleModules(): Module[] {
    const visibleModules = (this.menu || []).filter(module => this.getVisiblePages(module).length > 0);
    const hasHrPayroll = visibleModules.some(
      module => (module.moduleName || '').trim().toLowerCase() === 'hr & payroll'
    );

    if (hasHrPayroll) {
      return this.dedupeModulesByName(visibleModules);
    }

    const fallbackModules: Module[] = [...visibleModules];
    if (!hasHrPayroll) {
      fallbackModules.push(this.getFallbackHrPayrollModule());
    }
    return this.dedupeModulesByName(fallbackModules);
  }

  getVisiblePages(module: Module): Page[] {
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

  isPageActive(page: Page): boolean {
    const expectedPath = `/${this.roleRoot}/${this.formatRoute(page.pageName)}`.toLowerCase();
    return this.currentPath.toLowerCase() === expectedPath;
  }

  isModuleActive(module: Module): boolean {
    return this.getVisiblePages(module).some(page => this.isPageActive(page));
  }

  // ✅ Logout function (best practice)
  logout() {
    // Clear all sessionStorage
    sessionStorage.clear();

    // Reset sidebar state using service method
    this.sidebarService.resetSidebar();

    // Navigate to signin and reload to fully reset components
    this.router.navigateByUrl('/signin', { skipLocationChange: false }).then(() => {
      window.location.reload();
    });
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
      'salary issued': 'receipt_long',
      'leave management': 'event_note'
    };
    return map[key] || 'menu';
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
      attendance: 'how_to_reg',
      'leave management': 'event_note'
    };

    return map[key] || 'folder';
  }

  private getFallbackHrPayrollModule(): Module {
    return {
      id: '999999',
      moduleName: 'HR & Payroll',
      pages: [
        this.createFallbackPage('900001', 'Payroll Head'),
        this.createFallbackPage('900002', 'Payment Mode'),
        this.createFallbackPage('900003', 'Salary Settings'),
        this.createFallbackPage('900004', 'Advance Salary'),
        this.createFallbackPage('900005', 'Salary Pay'),
        this.createFallbackPage('900006', 'Salary Issued')
      ]
    };
  }

  private createFallbackPage(id: string, pageName: string): Page {
    return {
      id,
      pageName,
      moduleID: '999999',
      canView: '1',
      canAdd: '1',
      canEdit: '1',
      canDelete: '1'
    };
  }

  private dedupeModulesByName(modules: Module[]): Module[] {
    const seen = new Set<string>();
    const deduped: Module[] = [];
    for (const module of modules) {
      const key = (module.moduleName || '').trim().toLowerCase();
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push(module);
    }
    return deduped;
  }

  // Navigation for admin or school users
  navigate(page: Page, event?: Event) {
    if (event) event.stopPropagation();
    const path = `/${this.roleRoot}/${this.formatRoute(page.pageName)}`;
    this.router.navigate([path]).then(success => {
      this.currentPath = path;
      this.openedSubmenu = page.moduleID?.toString() || this.openedSubmenu;
      if (this.isMobileViewport()) {
        this.sidebarService.setMobileMenuOpen(false);
      }
      if (!success) console.error('Navigation failed:', path);
    });
  }

  private isMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 768;
  }
}





// import { Component, OnInit } from '@angular/core';
// import { MenuServiceService, Module, Page } from '../../Services/menu-service.service';
// import { Router, RouterOutlet } from '@angular/router';
// import { ReactiveFormsModule } from '@angular/forms';
// import { NgIf, NgFor, NgClass } from '@angular/common';
// import { MatIconModule } from '@angular/material/icon';
// import { SideBarServiceService } from '../../Services/side-bar-service.service';

// @Component({
//   selector: 'app-side-bar-component',
//   templateUrl: './side-bar-component.component.html',
//   styleUrls: ['./side-bar-component.component.css'],
//   standalone: true,
//   imports: [
//     RouterOutlet,
//     NgIf,
//     NgFor,
//     NgClass,
//     ReactiveFormsModule,
//     MatIconModule
//   ]
// })
// export class SideBarComponentComponent implements OnInit {

//   menu: Module[] = [];
//   isExpanded = false;
//   openedSubmenu: string | null = null;

//   schoolName: string | null = null;
//   roleRoot!: string;

//   constructor(
//     public menuService: MenuServiceService,
//     private router: Router,
//     private sidebarService: SideBarServiceService
//   ) {}

//   ngOnInit(): void {
//     // Sidebar toggle
//     this.sidebarService.isExpanded$
//       .subscribe(value => this.isExpanded = value);

//     const email = sessionStorage.getItem('email');
//     const roleId = sessionStorage.getItem('RollID');
//     this.schoolName = sessionStorage.getItem('schoolName');

//     if (!email) {
//       this.router.navigate(['/signin']);
//       return;
//     }

//     // ✅ YOUR RULE
//     this.roleRoot = roleId === '1'
//       ? 'Admin'
//       : (this.schoolName ?? '');

//     // Safety check for non-admin
//     if (roleId !== '1' && !this.roleRoot) {
//       this.router.navigate(['/signin']);
//       return;
//     }

//     // Load menu by ROLE
//     this.menuService.loadMenu(roleId || '1')
//       .subscribe(menu => {
//         this.menu = menu;
//         this.menuService.setMenu(menu);
//       });
//   }

//   toggleSubmenu(moduleId: number | string) {
//     const id = moduleId.toString();
//     this.openedSubmenu = this.openedSubmenu === id ? null : id;
//   }

//   formatRoute(name: string): string {
//     return name.replace(/\s+/g, '');
//   }

//   logout() {
//     sessionStorage.clear();
//     this.router.navigate(['/signin']);
//   }

//   getPageIcon(pageName: string): string {
//     const map: { [key: string]: string } = {
//       Dashboard: 'dashboard',
//       Staff: 'supervisor_account',
//       'Academic Year': 'calendar_month',
//       Syllabus: 'library_books',
//       Class: 'class',
//       Division: 'account_tree',
//       Modules: 'apps',
//       Pages: 'pageview',
//       Roles: 'badge',
//       'School Details': 'domain'
//     };
//     return map[pageName] || 'menu';
//   }

//   // ✅ HYBRID NAVIGATION (Admin OR School)
//   navigate(page: Page, event?: Event) {
//     if (event) event.stopPropagation();

//     const path = `/${this.roleRoot}/${this.formatRoute(page.pageName)}`;
//     console.log('Navigating to:', path);

//     this.router.navigate([path]).then(success => {
//       if (!success) {
//         console.error('Navigation failed:', path);
//       }
//     });
//   }
// }
