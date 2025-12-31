import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NgClass, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from "../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component";
import { SideBarServiceService } from '../../Services/side-bar-service.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterOutlet, ReactiveFormsModule, RouterLink, NgIf, NgClass, MatIconModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent {
  isExpanded: boolean = false;
  openedSubmenu: string | null = null;
  constructor(private router: Router,private sidebarService: SideBarServiceService) {}
  ngOnInit(): void {

    this.sidebarService.isExpanded$.subscribe(value => {
      this.isExpanded = value;
    });

    if(! localStorage.getItem("email")){
      this.router.navigate(['/signin'])
    }
  }

  // isExpanded = true;
  // toggleSidebar() {
  //   this.isExpanded = !this.isExpanded;
  // }

  logout() {
    this.router.navigate(['/signin'])
    localStorage.clear();
  }

  toggleSubmenu(menuName: string) {
    if (this.openedSubmenu === menuName) {
      this.openedSubmenu = null;
    } else {
      this.openedSubmenu = menuName;
    }
  }

  closeAllSubmenus() {
    this.openedSubmenu = null;
  }
}
