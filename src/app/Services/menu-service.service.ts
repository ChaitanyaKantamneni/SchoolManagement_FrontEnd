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
  private loadedRoleId: string | null = null;
  private menuLoadedSource = new BehaviorSubject<boolean>(false);
  menuLoaded$ = this.menuLoadedSource;

  constructor(private http: HttpClient, private apiService: ApiServiceService) {
    this.loadMenuFromStorage();
  }

  /** Load menu from sessionStorage if available */
  private loadMenuFromStorage() {
    const storedMenu = sessionStorage.getItem('menu');
    const storedRoleId = sessionStorage.getItem('menuRoleId');
    if (storedMenu) {
      try {
        this.menu = JSON.parse(storedMenu);
        this.loadedRoleId = storedRoleId;
        this.ensureHostelPermissions(this.menu, this.loadedRoleId);
        this.menuLoadedSource.next(true);
      } catch (err) {
        console.error('Error parsing stored menu', err);
        sessionStorage.removeItem('menu');
        sessionStorage.removeItem('menuRoleId');
        this.loadedRoleId = null;
        this.menuLoadedSource.next(false);
      }
    }
  }

  /** Fetch menu from API and store locally */
  loadMenu(roleId: string): Observable<Module[]> {
    if (this.menuLoadedSource.value && this.loadedRoleId === roleId) {
      return of(this.menu);
    }

    if (this.loadedRoleId && this.loadedRoleId !== roleId) {
      this.clearMenu();
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
            canView: this.toPermissionFlag(page.canView),
            canAdd: this.toPermissionFlag(page.canAdd),
            canEdit: this.toPermissionFlag(page.canEdit),
            canDelete: this.toPermissionFlag(page.canDelete)
          }))
        }));

        // Ensure Hostel Management is fully available for Admin (1) and School Admins (2, 8)
        this.ensureHostelPermissions(modules, roleId);

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
    this.loadedRoleId = sessionStorage.getItem('RollID');
    try {
      sessionStorage.setItem('menu', JSON.stringify(modules));
      if (this.loadedRoleId) {
        sessionStorage.setItem('menuRoleId', this.loadedRoleId);
      } else {
        sessionStorage.removeItem('menuRoleId');
      }
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
    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const target = normalize(pageName);
    // Also try alternate calendar/calender spelling
    const alternates = new Set([target,
      target.replace('calendar', 'calender'),
      target.replace('calender', 'calendar')
    ]);
    for (const module of this.menu) {
      const page = module.pages.find(p => alternates.has(normalize(p.pageName)));
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
    this.loadedRoleId = null;
    sessionStorage.removeItem('menu');
    sessionStorage.removeItem('menuRoleId');
    this.menuLoadedSource.next(false);
  }

  private toPermissionFlag(value: unknown): '1' | '0' {
    const normalized = `${value ?? ''}`.trim().toLowerCase();
    return ['true', '1', 'yes'].includes(normalized) ? '1' : '0';
  }

  private ensureHostelPermissions(modules: Module[], roleId: string | null) {
    if (!roleId) return;
    if (roleId === '1' || roleId === '2' || roleId === '8') {
      // First, clean up any pre-existing duplicate hostel management modules from the list
      let firstIndex = -1;
      for (let i = 0; i < modules.length; i++) {
        const name = (modules[i].moduleName || '').trim().toLowerCase().replace(/\s+/g, '');
        if (name === 'hostelmanagement') {
          if (firstIndex === -1) {
            firstIndex = i;
          } else {
            modules.splice(i, 1);
            i--; // Adjust index since we removed an item
          }
        }
      }

      let hostelModule = firstIndex !== -1 ? modules[firstIndex] : null;

      if (!hostelModule) {
        hostelModule = {
          id: 'hostel_mgr',
          moduleName: 'Hostel Management',
          pages: []
        };
        modules.push(hostelModule);
      } else {
        hostelModule.moduleName = 'Hostel Management';
      }

      const requiredPages = [
        { id: 'hostel_master', pageName: 'Hostel Master' },
        { id: 'room_master', pageName: 'Room Master' },
        { id: 'room_allotment', pageName: 'Room Allotment' },
        { id: 'outpass', pageName: 'Outpass' }
      ];

      requiredPages.forEach(req => {
        let firstPageIdx = -1;
        for (let i = 0; i < hostelModule!.pages.length; i++) {
          const pName = (hostelModule!.pages[i].pageName || '').trim().toLowerCase().replace(/\s+/g, '');
          const reqName = req.pageName.toLowerCase().replace(/\s+/g, '');
          if (pName === reqName) {
            if (firstPageIdx === -1) {
              firstPageIdx = i;
            } else {
              hostelModule!.pages.splice(i, 1);
              i--; // Adjust index
            }
          }
        }

        let page = firstPageIdx !== -1 ? hostelModule!.pages[firstPageIdx] : null;

        if (!page) {
          page = {
            id: req.id,
            pageName: req.pageName,
            moduleID: hostelModule!.id,
            canView: '1',
            canAdd: '1',
            canEdit: '1',
            canDelete: '1'
          };
          hostelModule!.pages.push(page);
        } else {
          // Keep the existing page and make sure its name matches the standard 'Outpass' or other required standard names
          page.pageName = req.pageName;
          page.canView = '1';
          page.canAdd = '1';
          page.canEdit = '1';
          page.canDelete = '1';
        }
      });
    }
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
