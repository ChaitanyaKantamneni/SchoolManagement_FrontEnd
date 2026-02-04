import { Component } from '@angular/core';
import { MatIcon } from "@angular/material/icon";
import { SideBarServiceService } from '../../Services/side-bar-service.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-top-nav',
  imports: [MatIcon],
  templateUrl: './dashboard-top-nav.component.html',
  styleUrl: './dashboard-top-nav.component.css'
})
export class DashboardTopNavComponent {
  constructor(private sidebarService:SideBarServiceService,private router: Router) {}
  toggleSidebar() {
    this.sidebarService.toggleSidebar();
  }

  logout() {
    sessionStorage.clear();
    this.router.navigate(['../signin']);
  }
}
