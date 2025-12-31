import { Component, OnInit } from '@angular/core';
import { MenuServiceService, Module, Page } from '../../Services/menu-service.service';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SideBarServiceService } from '../../Services/side-bar-service.service';

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
  roleRoot: string = 'Admin'; // Default route prefix

  constructor(
    public menuService: MenuServiceService,
    private router: Router,
    private sidebarService: SideBarServiceService
  ) {}

  ngOnInit(): void {
    // Sidebar toggle state
    this.sidebarService.isExpanded$.subscribe(value => this.isExpanded = value);

    // Check login
    const email = localStorage.getItem('email');
    const roleId = localStorage.getItem('RollID');

    if (!email) {
      this.router.navigate(['/signin']);
      return;
    }

    // Set role-based route root
    this.roleRoot = roleId === '1' ? 'Admin' : 'OthersSideBar';

    // Load menu
    this.menuService.loadMenu(roleId || '1').subscribe(menu => {
      this.menu = menu;
      this.menuService.setMenu(menu);
    });
  }

  toggleSubmenu(moduleId: number | string) {
    const id = moduleId.toString(); // ensure string comparison
    this.openedSubmenu = this.openedSubmenu === id ? null : id;
  }

  formatRoute(name: string): string {
    return name.replace(/\s+/g, ''); // remove spaces for route matching
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/signin']);
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
      Role: 'badge',
      'School Details': 'domain'
    };
    return map[pageName] || 'menu';
  }

  // ✅ Updated navigate: no canView check, stops propagation, logs target, navigates to child route
  navigate(page: Page, event?: Event) {
    if (event) event.stopPropagation(); // prevent parent toggle

    const path = `/${this.roleRoot}/${this.formatRoute(page.pageName)}`;
    console.log('Navigating to:', path);

    this.router.navigate([path]).then(success => {
      if (!success) {
        console.error('Navigation failed! Check route path:', path);
      }
    });
  }
}
