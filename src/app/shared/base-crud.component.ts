// import { Directive } from '@angular/core';
// import { Router } from '@angular/router';
// import { MenuServiceService, Page } from '../Services/menu-service.service';

// @Directive()
// export abstract class BasePermissionComponent {

//   abstract pageName: string;

//   // protected isAdmin: boolean;
//   protected get isAdmin(): boolean {
//     return sessionStorage.getItem('RollID') === '1';
//   }

//   constructor(
//     protected menuService: MenuServiceService,
//     protected router: Router
//   ) {
//     // this.isAdmin = sessionStorage.getItem('RollID') === '1';
//   }

//   // private get page(): Page | undefined {
//   //   return this.menuService.getPageByName(this.pageName);
//   // }

//   // canView(): boolean {
//   //   if (this.isAdmin) return true;
//   //   return this.page?.canView === '1';
//   // }

//   // canAdd(): boolean {
//   //   if (this.isAdmin) return true;
//   //   return this.page?.canAdd === '1';
//   // }

//   // canEdit(): boolean {
//   //   if (this.isAdmin) return true;
//   //   return this.page?.canEdit === '1';
//   // }

//   // canDelete(): boolean {
//   //   if (this.isAdmin) return true;
//   //   return this.page?.canDelete === '1';
//   // }

//   // checkViewPermission(): void {
//   //   if (!this.canView()) {
//   //     alert('You do not have permission to view this page');
//   //     this.router.navigate(['/']);
//   //   }
//   // }

//   private get page(): Page | undefined {
//     const page = this.menuService.getPageByName(this.pageName);
//     console.log('Current Page:', page);
//     return page;
//   }

//   canView(): boolean {
//     const result = this.isAdmin || this.page?.canView === '1';
//     console.log('Can View:', result);
//     return result;
//   }

//   canAdd(): boolean {
//     const result = this.isAdmin || this.page?.canAdd === '1';
//     console.log('Can Add:', result);
//     return result;
//   }

//   canEdit(): boolean {
//     const result = this.isAdmin || this.page?.canEdit === '1';
//     console.log('Can Edit:', result);
//     return result;
//   }

//   canDelete(): boolean {
//     const result = this.isAdmin || this.page?.canDelete === '1';
//     console.log('Can Delete:', result);
//     return result;
//   }


//   checkViewPermission(): void {
//     console.log('Checking view permission for page:', this.pageName);

//     if (!this.canView()) {
//       console.warn('Permission denied for page:', this.pageName);
//       alert('You do not have permission to view this page');
//       this.router.navigate(['/']);
//     }
//   }

// }


import { Directive } from '@angular/core';
import { Router } from '@angular/router';
import { filter, first } from 'rxjs/operators';
import { MenuServiceService, Page } from '../Services/menu-service.service';

@Directive()
export abstract class BasePermissionComponent {

  abstract pageName: string;

  protected get isAdmin(): boolean {
    return sessionStorage.getItem('RollID') === '1';
  }

  constructor(
    protected menuService: MenuServiceService,
    protected router: Router
  ) {}

  private get page(): Page | undefined {
    // Admin bypasses page lookup
    if (this.isAdmin) return {
      id: 'admin',
      pageName: this.pageName,
      moduleID: 'admin',
      canView: '1',
      canAdd: '1',
      canEdit: '1',
      canDelete: '1'
    };

    return this.menuService.getPageByName(this.pageName);
  }

  /**
   * Executes the operation: canView
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  canView(): boolean {
    const result = this.isAdmin || this.page?.canView === '1';
    console.log('Can View:', result, 'Page:', this.pageName);
    return result;
  }

  /**
   * Executes the operation: canAdd
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  canAdd(): boolean {
    const result = this.isAdmin || this.page?.canAdd === '1';
    console.log('Can Add:', result, 'Page:', this.pageName);
    return result;
  }

  /**
   * Executes the operation: canEdit
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  canEdit(): boolean {
    const result = this.isAdmin || this.page?.canEdit === '1';
    console.log('Can Edit:', result, 'Page:', this.pageName);
    return result;
  }

  /**
   * Executes the operation: canDelete
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  canDelete(): boolean {
    const result = this.isAdmin || this.page?.canDelete === '1';
    console.log('Can Delete:', result, 'Page:', this.pageName);
    return result;
  }

  /**
   * Executes the operation: checkViewPermission
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  checkViewPermission(): void {
    if (this.menuService.menuLoaded$.value) {
      this._doCheck();
      return;
    }
    this.menuService.menuLoaded$.pipe(
      filter(loaded => loaded),
      first()
    ).subscribe(() => this._doCheck());
  }

  /**
   * Executes the operation: _doCheck
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  private _doCheck(): void {
    if (!this.canView()) {
      alert('You do not have permission to view this page');
      this.router.navigate(['/']);
    }
  }
}
