import { Component, OnInit } from '@angular/core';
import { MenuServiceService, Module, Page } from '../../Services/menu-service.service';
import { Router, RouterOutlet, ActivatedRoute, NavigationEnd } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SideBarServiceService } from '../../Services/side-bar-service.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-side-bar-component',
  templateUrl: './side-bar-component.component.html',
  styleUrls: ['./side-bar-component.component.css'],
  standalone: true,
  imports: [
    RouterOutlet,
    NgIf,
    NgFor,
    NgClass,
    ReactiveFormsModule,
    MatIconModule
  ]
})
export class SideBarComponentComponent implements OnInit {

  menu: Module[] = [];
  isExpanded = false;
  openedSubmenu: string | null = null;

  schoolName: string | null = null;
  roleRoot!: string;
  private roleId!: string;

  constructor(
    public menuService: MenuServiceService,
    private router: Router,
    private route: ActivatedRoute,
    private sidebarService: SideBarServiceService
  ) {}

  ngOnInit(): void {
    // Sidebar toggle subscription
    this.sidebarService.isExpanded$.subscribe(value => this.isExpanded = value);

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
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.roleId !== '1') {
        const routeSchool = this.route.snapshot.paramMap.get('schoolName');
        // If user manually changes schoolName in URL, redirect to correct one
        if (routeSchool && routeSchool !== this.schoolName) {
          this.router.navigate([`/${this.schoolName}/dashboard`], { replaceUrl: true });
        }
      }

      // Always reload menu for current role
      this.loadMenu(this.roleId);
    });

    // Initial menu load
    this.loadMenu(this.roleId);
  }

  // Load menu for role
  private loadMenu(roleId: string) {
    this.menuService.loadMenu(roleId).subscribe(menu => {
      this.menu = menu;
      this.menuService.setMenu(menu);
    });
  }

  toggleSubmenu(moduleId: number | string) {
    const id = moduleId.toString();
    this.openedSubmenu = this.openedSubmenu === id ? null : id;
  }

  formatRoute(name: string): string {
    return name.replace(/\s+/g, '');
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
    const map: { [key: string]: string } = {
      Dashboard: 'dashboard',
      Staff: 'supervisor_account',
      'Academic Year': 'calendar_month',
      Syllabus: 'library_books',
      Class: 'class',
      Division: 'account_tree',
      Modules: 'apps',
      Pages: 'pageview',
      Roles: 'badge',
      'School Details': 'domain'
    };
    return map[pageName] || 'menu';
  }

  // Navigation for admin or school users
  navigate(page: Page, event?: Event) {
    if (event) event.stopPropagation();
    const path = `/${this.roleRoot}/${this.formatRoute(page.pageName)}`;
    this.router.navigate([path]).then(success => {
      if (!success) console.error('Navigation failed:', path);
    });
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
