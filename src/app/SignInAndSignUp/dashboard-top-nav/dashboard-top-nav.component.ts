import { Component } from '@angular/core';
import { MatIcon } from "@angular/material/icon";
import { SideBarServiceService } from '../../Services/side-bar-service.service';
import { Router } from '@angular/router';
import { MenuServiceService } from '../../Services/menu-service.service';

@Component({
  selector: 'app-dashboard-top-nav',
  imports: [MatIcon],
  templateUrl: './dashboard-top-nav.component.html',
  styleUrl: './dashboard-top-nav.component.css'
})
export class DashboardTopNavComponent {
  constructor(private sidebarService:SideBarServiceService,private router: Router,protected menuService: MenuServiceService) {}
  toggleSidebar() {
    this.sidebarService.toggleSidebar();
  }

  logout() {
    this.menuService.clearMenu(); 
    sessionStorage.clear();
    this.router.navigate(['../signin']);
  }
}
