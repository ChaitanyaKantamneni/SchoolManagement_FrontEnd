// // src/app/Services/menu-service.service.ts
// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable, map } from 'rxjs';
// import { ApiServiceService } from './api-service.service';

// export interface Page {
//   id: string;
//   pageName: string;
//   moduleID: string;
//   canView: string;
//   canAdd: string;
//   canEdit: string;
//   canDelete: string;
// }

// export interface Module {
//   id: string;
//   moduleName: string;
//   pages: Page[];
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class MenuServiceService {
//   private menu: Module[] = [];

//   constructor(private http: HttpClient, private apiService: ApiServiceService) {}

//   loadMenu(roleId: string): Observable<Module[]> {
//     const url = `${this.apiService.api_url}/Tbl_GetRoleMenuPermissions/${roleId}`;
//     return this.http.get<{ data: any[] }>(url).pipe(
//       map(response =>
//         response.data.map(module => ({
//           id: module.id,
//           moduleName: module.moduleName,
//           pages: module.pages.map((page: any) => ({
//             id: page.id,
//             pageName: page.pageName,
//             moduleID: page.moduleID,
//             canView: page.canView === 'True' ? '1' : '0',   // API CanView
//             canAdd: page.canAdd === 'True' ? '1' : '0',    // API CanAdd
//             canEdit: page.canEdit === 'True' ? '1' : '0',  // API CanEdit
//             canDelete: page.canDelete === 'True' ? '1' : '0' // API CanDelete
//           }))
//         }))
//       )
//     );
//   }

//   setMenu(modules: Module[]) {
//     this.menu = modules;
//   }

//   getMenu(): Module[] {
//     return this.menu;
//   }

//   getPageByName(pageName: string): Page | undefined {
//     for (const module of this.menu) {
//       const page = module.pages.find(p => p.pageName === pageName);
//       if (page) return page;
//     }
//     return undefined;
//   }

//   isAnyChildVisible(children: any[]): boolean {
//     return children.some(child => {
//       const page = this.getPageByName(child.pageName);
//       return page?.canView === '1';
//     });
//   };


//   canView(page: Page): boolean { return page.canView === '1'; }
//   canAdd(page: Page): boolean { return page.canAdd === '1'; }
//   canEdit(page: Page): boolean { return page.canEdit === '1'; }
//   canDelete(page: Page): boolean { return page.canDelete === '1'; }
// }



// src/app/Services/menu-service.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiServiceService } from './api-service.service';

export interface Page {
  id: string;
  pageName: string;
  moduleID: string;
  canView: string;
  canAdd: string;
  canEdit: string;
  canDelete: string;
}

export interface Module {
  id: string;
  moduleName: string;
  pages: Page[];
}

@Injectable({
  providedIn: 'root'
})
export class MenuServiceService {
  private menu: Module[] = [];
  private menuLoadedSource = new BehaviorSubject<boolean>(false);
  menuLoaded$ = this.menuLoadedSource.asObservable();

  constructor(private http: HttpClient, private apiService: ApiServiceService) {
    this.loadMenuFromStorage();
  }

  /** Load menu from sessionStorage if available */
  private loadMenuFromStorage() {
    const storedMenu = sessionStorage.getItem('menu');
    if (storedMenu) {
      try {
        this.menu = JSON.parse(storedMenu);
        this.menuLoadedSource.next(true);
      } catch (err) {
        console.error('Error parsing stored menu', err);
        sessionStorage.removeItem('menu');
        this.menuLoadedSource.next(false);
      }
    }
  }

  /** Fetch menu from API and store locally */
  loadMenu(roleId: string): Observable<Module[]> {
    // If menu is already loaded, return it as Observable
    if (this.menuLoadedSource.value) {
      return of(this.menu);
    }

    const url = `${this.apiService.api_url}/Tbl_GetRoleMenuPermissions/${roleId}`;
    return this.http.get<{ data: any[] }>(url).pipe(
      map(response => {
        const modules = response.data.map(module => ({
          id: module.id,
          moduleName: module.moduleName,
          pages: module.pages.map((page: any) => ({
            id: page.id,
            pageName: page.pageName,
            moduleID: page.moduleID,
            canView: page.canView === 'True' ? '1' : '0',
            canAdd: page.canAdd === 'True' ? '1' : '0',
            canEdit: page.canEdit === 'True' ? '1' : '0',
            canDelete: page.canDelete === 'True' ? '1' : '0'
          }))
        }));

        this.setMenu(modules);
        return modules;
      }),
      tap({
        error: err => {
          console.error('Failed to load menu from API', err);
        }
      })
    );
  }

  /** Save menu to sessionStorage and emit loaded state */
  setMenu(modules: Module[]) {
    this.menu = modules;
    try {
      sessionStorage.setItem('menu', JSON.stringify(modules));
    } catch (err) {
      console.warn('Unable to save menu to sessionStorage', err);
    }
    this.menuLoadedSource.next(true);
  }

  /** Get menu */
  getMenu(): Module[] {
    return this.menu;
  }

  /** Get a page by name */
  getPageByName(pageName: string): Page | undefined {
    for (const module of this.menu) {
      const page = module.pages.find(p => p.pageName === pageName);
      if (page) return page;
    }
    return undefined;
  }

  /** Check if any child pages are visible */
  isAnyChildVisible(children: any[]): boolean {
    return children.some(child => {
      const page = this.getPageByName(child.pageName);
      return page?.canView === '1';
    });
  }

  /** Permission helpers */
  canView(page: Page): boolean { return page.canView === '1'; }
  canAdd(page: Page): boolean { return page.canAdd === '1'; }
  canEdit(page: Page): boolean { return page.canEdit === '1'; }
  canDelete(page: Page): boolean { return page.canDelete === '1'; }

  clearMenu() {
    this.menu = [];
    sessionStorage.removeItem('menu');
    this.menuLoadedSource.next(false);
  }
}





// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { ApiServiceService } from './api-service.service';

// export interface Page {
//   ID: string;
//   PageName: string;
//   ModuleID: string;
//   CanView: string;
//   CanAdd: string;
//   CanEdit: string;
//   CanDelete: string;
// }

// export interface Module {
//   ID: string;
//   ModuleName: string;
//   Pages: Page[];
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class MenuServiceService {
//   private menu: Module[] = [];

//   // Use a proper name for the injected ApiService
//   constructor(private http: HttpClient, private apiService: ApiServiceService) {}

//   loadMenu(roleId: string): Observable<Module[]> {
//     // Correct usage of apiService
//     const url = `${this.apiService.api_url}/Tbl_GetRoleMenuPermissions/${roleId}`;
//     return this.http.get<Module[]>(url);
//   }

//   setMenu(modules: Module[]) {
//     this.menu = modules;
//   }

//   getMenu(): Module[] {
//     return this.menu;
//   }

//   canView(page: Page): boolean { return page.CanView === '1'; }
//   canAdd(page: Page): boolean { return page.CanAdd === '1'; }
//   canEdit(page: Page): boolean { return page.CanEdit === '1'; }
//   canDelete(page: Page): boolean { return page.CanDelete === '1'; }
// }
