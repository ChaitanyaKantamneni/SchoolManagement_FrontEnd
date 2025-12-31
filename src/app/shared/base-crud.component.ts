import { Directive } from '@angular/core';
import { Router } from '@angular/router';
import { MenuServiceService, Page } from '../Services/menu-service.service';

@Directive()
export abstract class BasePermissionComponent {

  abstract pageName: string;

  protected isAdmin: boolean;

  constructor(
    protected menuService: MenuServiceService,
    protected router: Router
  ) {
    this.isAdmin = localStorage.getItem('RollID') === '1';
  }

  private get page(): Page | undefined {
    return this.menuService.getPageByName(this.pageName);
  }

  canView(): boolean {
    if (this.isAdmin) return true;
    return this.page?.canView === '1';
  }

  canAdd(): boolean {
    if (this.isAdmin) return true;
    return this.page?.canAdd === '1';
  }

  canEdit(): boolean {
    if (this.isAdmin) return true;
    return this.page?.canEdit === '1';
  }

  canDelete(): boolean {
    if (this.isAdmin) return true;
    return this.page?.canDelete === '1';
  }

  checkViewPermission(): void {
    if (!this.canView()) {
      alert('You do not have permission to view this page');
      this.router.navigate(['/']);
    }
  }
}
