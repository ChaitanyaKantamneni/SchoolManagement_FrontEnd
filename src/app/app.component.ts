import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoaderService } from './Services/loader.service';
import { CommonModule } from '@angular/common';
import { PwaInstallPromptComponent } from './components/pwa-install-prompt/pwa-install-prompt.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, PwaInstallPromptComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'SchoolManagementApplication';
  constructor(public loader: LoaderService) {}
}
