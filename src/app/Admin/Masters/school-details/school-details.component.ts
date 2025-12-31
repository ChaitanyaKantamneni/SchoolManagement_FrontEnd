import { Component } from '@angular/core';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-school-details',
  imports: [MatIconModule,DashboardTopNavComponent],
  templateUrl: './school-details.component.html',
  styleUrl: './school-details.component.css'
})
export class SchoolDetailsComponent {

}
