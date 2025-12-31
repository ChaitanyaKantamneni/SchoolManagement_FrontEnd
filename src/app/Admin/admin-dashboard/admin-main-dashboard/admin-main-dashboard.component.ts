import { Component } from '@angular/core';
import { MatIcon } from "@angular/material/icon";
import { DashboardTopNavComponent } from "../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component";

@Component({
  selector: 'app-admin-main-dashboard',
  imports: [MatIcon, DashboardTopNavComponent],
  templateUrl: './admin-main-dashboard.component.html',
  styleUrl: './admin-main-dashboard.component.css'
})
export class AdminMainDashboardComponent {

}
