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
/**
 * Class Responsibility: Handles view logic and user interactions for AppComponent.
 */
export class AppComponent {

  title = 'SchoolManagementApplication';
  isLoading = false;

  constructor(public loader: LoaderService) {}

  /**
   * Lifecycle hook: Initializes component parameters and loads default page datasets.
   */
  ngOnInit() {
    this.loader.loading$.subscribe(val => {
      this.isLoading = val;
    });
  }
}