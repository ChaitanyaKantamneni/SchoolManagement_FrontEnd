import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { delay, forkJoin, Observable, tap } from 'rxjs';
import { SchoolCacheService } from '../../../Services/school-cache.service';
import { LoaderService } from '../../../Services/loader.service';

interface Permission {
  moduleId: string;
  pageId: string;
  roleID: string;
  CanView: string;
  CanAdd: string;
  CanEdit: string;
  CanDelete: string;
  flag: string;
  status: string;
}


@Component({
  selector: 'app-roles',
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.css']
})
export class RolesComponent {
  selectedRoleId: string = '';
  selectedModuleName: string = '';
  IsAddNewClicked: boolean = false;
  IsActiveStatus: boolean = false;
  ViewRoleClicked: boolean = false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  RoleList: any[] = [];
  SchoolsList: any[] = [];
  PagesList: any[] = [];
  PagesListFromDB: any[] = [];
  AminityInsStatus: any = '';
  isModalOpen = false;
  RoleCount: number = 0;
  ActiveUserId: string = sessionStorage.getItem('email')?.toString() || '';
  modules: any[] = [];
  selectedModule: string = '';
  expandedModuleId: string | null = null;
  permissionsList: any[] = [];

  constructor(private router: Router, private apiurl: ApiServiceService,private schoolCache: SchoolCacheService,public loader: LoaderService) {}

  ngOnInit(): void {
    this.FetchInitialData();
    this.FetchPageList();
  };

  roleId: string | null = sessionStorage.getItem('RollID');

  isAdmin(): boolean {
    return this.roleId === '1';
  }

  // FetchInitialData() {
  //   const rolesReq = this.apiurl.post<any>(
  //     'Tbl_Roles_CRUD_Operations',
  //     { Flag: '2' }
  //   );

  //   if (!this.isAdmin()) {
  //     rolesReq.subscribe(res => this.mapRoles(res));
  //     return;
  //   }

  //   if (this.schoolCache.hasData()) {
  //     rolesReq.subscribe(res => this.mapRoles(res));
  //     return;
  //   }

  //   forkJoin({
  //     schools: this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }),
  //     roles: rolesReq
  //   }).subscribe(({ schools, roles }) => {

  //     if (schools?.data?.length) {
  //       this.schoolCache.setSchools(schools.data);
  //     }

  //     this.mapRoles(roles);
  //   });
  // };

  FetchInitialData() {
    const rolesReq = this.apiurl
      .post<any>('Tbl_Roles_CRUD_Operations', { Flag: '2' })
      .pipe(delay(500));

    this.loader.show();

    if (!this.isAdmin()) {
      rolesReq.subscribe({
        next: res => {
          this.mapRoles(res);
          this.loader.hide();
        },
        error: () => this.loader.hide()
      });
      return;
    }

    if (this.schoolCache.hasData()) {
      rolesReq.subscribe({
        next: res => {
          this.mapRoles(res);
          this.loader.hide();
        },
        error: () => this.loader.hide()
      });
      return;
    }

    forkJoin({
      schools: this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }),
      roles: rolesReq
    }).subscribe({
      next: ({ schools, roles }) => {
        if (schools?.data?.length) {
          this.schoolCache.setSchools(schools.data);
        }
        this.mapRoles(roles);
        this.loader.hide();
      },
      error: () => this.loader.hide()
    });
  };

  mapRoles(response: any) {
    const schoolMap = this.isAdmin()
      ? this.schoolCache.getSchoolMap()
      : {};

    if (response && Array.isArray(response.data)) {
      this.RoleList = response.data.map((item: any) => ({
        ID: item.id,
        Name: item.roleName,
        SchoolName: this.isAdmin()
          ? (schoolMap[item.schoolID] ?? 'Admin')
          : null,
        IsActive: item.isActive === '1' ? 'Active' : 'InActive'
      }));

      this.RoleCount = this.RoleList.length;
    } else {
      this.RoleList = [];
      this.RoleCount = 0;
    }
  };



  RoleForm: any = new FormGroup({
    ID: new FormControl(),
    Name: new FormControl(),
    Description: new FormControl()
  });

  getPaginatedRoleLists() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.ListedRoleList.slice(start, start + this.pageSize);
  };

  get ListedRoleList() {
    return this.RoleList.filter(Role =>
      Role.Name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  };

  AddNewClicked() {
    this.fetchNewRoleId();
    this.fetchModulesFromDB();
    this.RoleForm.reset();
    this.PagesList=[];
    this.updatedPermissionsList=[];
    this.selectedRoleId='';
    this.selectedModuleName='';
    this.expandedModuleId=null;
    this.IsAddNewClicked = !this.IsAddNewClicked;
    this.IsActiveStatus = true;
    this.ViewRoleClicked = false;
  };

  SubmitRole() {
    if (this.RoleForm.invalid) {
      return;
    } else {
      const IsActiveStatusNumeric = this.IsActiveStatus ? '1' : '0';
      const data = {
        RoleName: this.RoleForm.get('Name')?.value,
        Description: this.RoleForm.get('Description')?.value,
        IsActive: IsActiveStatusNumeric,
        Flag: '1'
      };

      this.apiurl.post("Tbl_Roles_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            this.isModalOpen = true;
            this.AminityInsStatus = "Role Details Submitted!";
            this.RoleForm.reset();
            this.RoleForm.markAsPristine();
            this.submitpermission();
            this.FetchInitialData();
          }
        },
        error: (error: any) => {
          if (error.status === 409) {
            this.AminityInsStatus = error.error?.Message || "Role name already exists";
          } else if (error.status === 400) {
            this.AminityInsStatus = error.error?.Message || "Operation failed";
          } else {
            this.AminityInsStatus = "Unexpected error occurred";
          }
          this.isModalOpen = true;
        },
        complete: () => {
        }
      });

      this.isModalOpen = true;
      this.AminityInsStatus = 'Academic Year Details Submitted!';
      this.RoleForm.reset();
      this.RoleForm.markAsPristine();
    }
  };

  FetchRoleDetByID(RoleID: string) {
    const data = {
      ID: RoleID,
      Flag: "3"
    };

    this.apiurl.post<any>("Tbl_Roles_CRUD_Operations", data).subscribe(
      (response: any) => {
        this.fetchModulesFromDB();
        this.FetchPermissionByRoleID(RoleID,"");
        const item = response?.data?.[0];
        if (item) {
          const isActiveString = item.isActive === "1" ? true : false;
          this.RoleForm.patchValue({
            ID: item.id,
            Name: item.roleName,
            Description: item.description
          });
          this.IsActiveStatus = isActiveString;
        } else {
          this.RoleForm.reset();
        }

        this.IsAddNewClicked=true;
      },
      error => {
      }
    );
  };

  UpdateRole() {
    if (this.RoleForm.invalid) {
      return;
    } else {
      const IsActiveStatusNumeric = this.IsActiveStatus ? '1' : '0';
      const data = {
        ID:this.selectedRoleId,
        RoleName: this.RoleForm.get('Name')?.value,
        Description: this.RoleForm.get('Description')?.value,
        IsActive: IsActiveStatusNumeric,
        Flag: '4'
      };

      this.apiurl.post("Tbl_Roles_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            this.isModalOpen = true;
            this.AminityInsStatus = "Role Details Submitted!";
            this.RoleForm.reset();
            this.RoleForm.markAsPristine();
            this.updatepermission(this.selectedRoleId)
          }
        },
        error: (error: any) => {
          if (error.status === 409) {
            this.AminityInsStatus = error.error?.Message || "Role name already exists";
          } else if (error.status === 400) {
            this.AminityInsStatus = error.error?.Message || "Operation failed";
          } else {
            this.AminityInsStatus = "Unexpected error occurred";
          }
          this.isModalOpen = true;
        },
        complete: () => {
        }
      });

      this.isModalOpen = true;
      this.AminityInsStatus = 'Academic Year Details Submitted!';
      this.RoleForm.reset();
      this.RoleForm.markAsPristine();
    }
  };

  formatDateYYYYMMDD(dateStr: string | null): string {
    const convertToYYYYMMDD = (dateStr: string | null): string => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    return convertToYYYYMMDD(dateStr);
  };

  formatDateDDMMYYYY(dateStr: string | null): string {
    const convertToDDMMYYYY = (dateStr: string | null): string => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };
    return convertToDDMMYYYY(dateStr);
  };

  editreview(RoleID: string): void {
    this.updatedPermissionsList=[];
    this.FetchRoleDetByID(RoleID);
    this.selectedRoleId=RoleID;
    this.ViewRoleClicked = true;
  };

  toggleChange() {
    this.IsActiveStatus = !this.IsActiveStatus;
  };

  onSearchChange(): void {
    this.currentPage = 1;
    this.getPaginatedRoleLists();
  };

  closeModal() {
    this.isModalOpen = false;
  };

  handleOk() {
    this.isModalOpen = false;
    this.FetchInitialData();
  };

  fetchModulesFromDB(){
    const requestData = { Flag: '2' };

    this.apiurl.post<any>('Tbl_Modules_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.modules = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.moduleName,
                IsActive: isActiveString
              };
            });
          } else {
            this.modules = [];
          }
        },
        (error) => {
          this.modules = [];
        }
      );
  };

  FetchPageList() {
    const requestData = { Flag: '2' };

    this.apiurl.post<any>('Tbl_Pages_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.PagesListFromDB = response.data.map((item: any) => {
              return {
                ID: item.id,
                Class: item.moduleID,
                Name: item.pageName
              };
            });
          } else {
            this.PagesListFromDB = [];
          }
        },
        (error) => {
          this.PagesListFromDB = [];
        }
      );
  };

  ModuleClick(moduleId: string) {
    console.log('this.selectedRoleId',this.selectedRoleId);
    if (this.expandedModuleId === moduleId) {
      this.expandedModuleId = null;
      this.PagesList = [];
    } else {
      if(this.selectedRoleId!='' || this.selectedRoleId!=null){
        this.FetchPermissionByRoleID(this.selectedRoleId,moduleId);
      }
      else{
        this.expandedModuleId = moduleId;
        this.selectedModuleName = this.modules.find(module => module.ID === moduleId)?.Name || '';
        this.fetchPagesByModule(moduleId);
      }
    }
  };

  // fetchPagesByModule(moduleId: string) {
  //   const pagesForModule = this.PagesListFromDB.filter(
  //     page => page.Class?.toString() === moduleId
  //   );

  //   this.PagesList = pagesForModule.map(page => {
  //     const pageItem = {
  //       ID: page.ID,
  //       Name: page.Name,
  //       CanView: false,
  //       CanAdd: false,
  //       CanEdit: false,
  //       CanDelete: false
  //     };

  //     const permission = this.permissionsList.find(
  //       p => p.pageId?.toString() === page.ID?.toString()
  //     );

  //     if (permission) {
  //       pageItem.CanView = permission.CanView === '1';
  //       pageItem.CanAdd = permission.CanAdd === '1';
  //       pageItem.CanEdit = permission.CanEdit === '1';
  //       pageItem.CanDelete = permission.CanDelete === '1';
  //     }

  //     return pageItem;
  //   });
  // };

  fetchPagesByModule(moduleId: string) {
    const pagesForModule = this.PagesListFromDB.filter(
      page => page.Class?.toString() === moduleId
    );

    this.PagesList = pagesForModule.map(page => {
      const permission = this.permissionsList.find(
        p => p.pageId?.toString() === page.ID?.toString()
      );

      // Return the page with default permissions
      return {
        ID: page.ID,
        Name: page.Name,
        CanView: permission?.CanView === '1' || false,
        CanAdd: permission?.CanAdd === '1' || false,
        CanEdit: permission?.CanEdit === '1' || false,
        CanDelete: permission?.CanDelete === '1' || false
      };
    });
  };


  // togglePagePermission(page: any, permission: 'CanView' | 'CanAdd' | 'CanEdit' | 'CanDelete', moduleId: string, pageId: string): void {
  //   page[permission] = !page[permission];
  //   this.updatePermissionsList(moduleId, pageId, permission, page[permission]);
  // };

  // updatePermissionsList(moduleId: string, pageId: string, permission: string, status: boolean): void {
  //   console.log('Toggling permission:', { moduleId, pageId, permission, status });
  //   console.log('Current permissionsList before update:', this.permissionsList);
  //   const existingPermission = this.permissionsList.find(
  //     (p) => p.moduleId === moduleId && p.pageId === pageId
  //   );

  //   if (existingPermission) {
  //     if(this.selectedRoleId || this.selectedRoleId!='' || this.selectedRoleId!=null){
  //       existingPermission[permission] = status ? "0" : "1";
  //     }
  //     else{
  //       existingPermission[permission] = status ? "1" : "0";
  //     }

  //   } else {
  //     const newPermission: Permission = {
  //       moduleId,
  //       pageId,
  //       roleID: '1',
  //       canView: "0",
  //       canAdd: "0",
  //       canEdit: "0",
  //       canDelete: "0",
  //       flag: "1",
  //       status: "1"
  //     };

  //     newPermission[permission] = status ? "1" : "0";
  //     this.permissionsList.push(newPermission);

  //   console.log('Updated permissionsList:', this.permissionsList);
  //   }
  // };


// new array for updated toggles
updatedPermissionsList: Permission[] = [];

// togglePagePermission(page: any, permission: string, moduleId: string, pageId: string): void {
//   // Type assertion here ensures 'permission' is one of the valid strings
//   const validPermission: "CanView" | "CanAdd" | "CanEdit" | "CanDelete" = permission as "CanView" | "CanAdd" | "CanEdit" | "CanDelete";

//   const newValue = !page[validPermission];  // Toggle the permission value
//   page[validPermission] = newValue;

//   console.log('Toggling permission:', { moduleId, pageId, validPermission, newValue });

//   if (this.selectedRoleId) {
//     this.updateUpdatedPermissionsList(moduleId, pageId, validPermission, newValue);
//   } else {
//     this.updatePermissionsList(moduleId, pageId, validPermission, newValue);
//   }
// }

// updateUpdatedPermissionsList(
//   moduleId: string,
//   pageId: string,
//   permission: 'CanView' | 'CanAdd' | 'CanEdit' | 'CanDelete',
//   status: boolean
// ): void {

//   // Define a mapping from lowercase strings to actual keys of Permission interface
//   const permissionMap: { [key: string]: keyof Permission } = {
//     'canview': 'CanView',
//     'canadd': 'CanAdd',
//     'canedit': 'CanEdit',
//     'candelete': 'CanDelete'
//   };

//   // Use the permission value to find the correct permission key
//   const permKey = permissionMap[permission.toLowerCase()];

//   // Convert the boolean status to "1" for true and "0" for false
//   const stringValue = status ? "1" : "0";

//   // Convert moduleId and pageId to strings
//   const moduleIdStr = moduleId?.toString();
//   const pageIdStr = pageId?.toString();

//   // Default roleId to '1' if it's not provided
//   const roleIdStr = this.selectedRoleId?.toString() || '1';

//   // Check if the permission for the given moduleId, pageId, and roleId already exists
//   let existing = this.updatedPermissionsList.find(
//     p => p.moduleId === moduleIdStr && p.pageId === pageIdStr && p.roleID === roleIdStr
//   );

//   // If the permission entry already exists, update it
//   if (existing) {
//     existing[permKey] = stringValue;  // Update the correct permission
//     existing.flag = "1";  // Mark as updated
//   } else {
//     // If the permission entry doesn't exist, create a new one
//     const newPermission: Permission = {
//       moduleId: moduleIdStr,
//       pageId: pageIdStr,
//       roleID: roleIdStr,
//       CanView: permKey === "CanView" ? stringValue : "0",
//       CanAdd: permKey === "CanAdd" ? stringValue : "0",
//       CanEdit: permKey === "CanEdit" ? stringValue : "0",
//       CanDelete: permKey === "CanDelete" ? stringValue : "0",
//       flag: "1", // Mark as active
//       status: "1" // Default status to active
//     };

//     console.log('New permission to add:', newPermission);

//     // Add the new permission to the list
//     this.updatedPermissionsList.push(newPermission);
//     const updatedPermissionList=this.getUpdatedFinalList();
//     console.log('Updated Permission List after addition:', updatedPermissionList);
//   }

//   // Log the updated permissions list for debugging
//   console.log('Updated toggled permissions:', this.updatedPermissionsList);
// };


togglePagePermission(page: any, permission: string, moduleId: string, pageId: string): void {
  const validPermission: "CanView" | "CanAdd" | "CanEdit" | "CanDelete" = permission as any;

  const newValue = !page[validPermission];
  page[validPermission] = newValue;

  console.log('Toggling permission:', { moduleId, pageId, validPermission, newValue });

  if (this.selectedRoleId) {
    this.updateUpdatedPermissionsList(moduleId, pageId, validPermission, newValue, page);
  } else {
    this.updatePermissionsList(moduleId, pageId, validPermission, newValue, page);
  }
}

updateUpdatedPermissionsList(
  moduleId: string,
  pageId: string,
  permission: 'CanView' | 'CanAdd' | 'CanEdit' | 'CanDelete',
  status: boolean,
  page: any // pass the current page object from toggle
): void {
  const permKey = permission;

  const stringValue = status ? "1" : "0";
  const moduleIdStr = moduleId?.toString();
  const pageIdStr = pageId?.toString();
  const roleIdStr = this.selectedRoleId?.toString() || '1';

  let existing = this.updatedPermissionsList.find(
    p => p.moduleId === moduleIdStr && p.pageId === pageIdStr && p.roleID === roleIdStr
  );

  if (existing) {
    existing[permKey] = stringValue;
    existing.flag = "1";
  } else {
    const newPermission: Permission = {
      moduleId: moduleIdStr,
      pageId: pageIdStr,
      roleID: roleIdStr,
      CanView: permKey === 'CanView' ? stringValue : (page.CanView ? "1" : "0"),
      CanAdd: permKey === 'CanAdd' ? stringValue : (page.CanAdd ? "1" : "0"),
      CanEdit: permKey === 'CanEdit' ? stringValue : (page.CanEdit ? "1" : "0"),
      CanDelete: permKey === 'CanDelete' ? stringValue : (page.CanDelete ? "1" : "0"),
      flag: "1",
      status: "1"
    };

    console.log('New permission to add:', newPermission);
    this.updatedPermissionsList.push(newPermission);
  }

  console.log('Updated toggled permissions:', this.updatedPermissionsList);
  const updatedPermissionList=this.getUpdatedFinalList();
  console.log('Updated Permission List after addition:', updatedPermissionList);
}





// updateUpdatedPermissionsList(
//   moduleId: string,
//   pageId: string,
//   permission: string, // may come as 'CanDelete' or 'canDelete'
//   status: boolean
// ): void {
//   const moduleIdStr = moduleId?.toString();
//   const pageIdStr = pageId?.toString();
//   const roleIdStr = this.selectedRoleId?.toString() || '1';
//   const stringValue = status ? "1" : "0";

//   // Normalize permission key to lowercase
//   const permKey = permission.charAt(0).toLowerCase() + permission.slice(1);

//   let existing = this.updatedPermissionsList.find(
//     (p) => p.moduleId === moduleIdStr && p.pageId === pageIdStr && p.roleID === roleIdStr
//   );

//   if (existing) {
//     existing[permKey] = stringValue;
//     existing.flag = "1";
//   } else {
//     const newPermission: Permission = {
//       moduleId: moduleIdStr,
//       pageId: pageIdStr,
//       roleID: roleIdStr,
//       canView: permKey === 'canView' ? stringValue : "1",
//       canAdd: permKey === 'canAdd' ? stringValue : "1",
//       canEdit: permKey === 'canEdit' ? stringValue : "1",
//       canDelete: permKey === 'canDelete' ? stringValue : "1",
//       flag: "1",
//       status: "1"
//     };
//     this.updatedPermissionsList.push(newPermission);
//   }

//   console.log('Updated toggled permissions:', this.updatedPermissionsList);
// }




// original permissionsList update
  updatePermissionsList(
    moduleId: string,
    pageId: string,
    permission: 'CanView' | 'CanAdd' | 'CanEdit' | 'CanDelete',
    status: boolean,
    page: any):void
  {
    const permKey = permission;

    const stringValue = status ? "1" : "0";
    const moduleIdStr = moduleId?.toString();
    const pageIdStr = pageId?.toString();
    const roleIdStr = this.RoleForm.get('ID')?.value;

    let existing = this.permissionsList.find(
      p => p.moduleId === moduleIdStr && p.pageId === pageIdStr && p.roleID === roleIdStr
    );

    if (existing) {
      existing[permKey] = stringValue;
      existing.flag = "1";
    } else {
      const newPermission: Permission = {
        moduleId: moduleIdStr,
        pageId: pageIdStr,
        roleID: roleIdStr,
        CanView: permKey === 'CanView' ? stringValue : (page.CanView ? "1" : "0"),
        CanAdd: permKey === 'CanAdd' ? stringValue : (page.CanAdd ? "1" : "0"),
        CanEdit: permKey === 'CanEdit' ? stringValue : (page.CanEdit ? "1" : "0"),
        CanDelete: permKey === 'CanDelete' ? stringValue : (page.CanDelete ? "1" : "0"),
        flag: "1",
        status: "1"
      };

      console.log('New permission to add:', newPermission);
      this.permissionsList.push(newPermission);
    }
    this.permissionsList = this.permissionsList.filter(
      p => p.roleID != null && p.moduleId != null && p.pageId != null
    );

    console.log('Updated toggled permissions:', this.permissionsList);

    // const moduleIdStr = moduleId?.toString();
    // const pageIdStr = pageId?.toString();
    // const stringValue = status ? "1" : "0";

    // let existing = this.permissionsList.find(
    //   p => p.moduleId === moduleIdStr && p.pageId === pageIdStr
    // );

    // if (existing) {
    //   existing[permission] = stringValue;
    //   existing.flag = "4";  // Mark as "No Update"
    // } else {
    //   const newPermission: Permission = {
    //     moduleId: moduleIdStr,
    //     pageId: pageIdStr,
    //     roleID: '1',  // Default to role '1' if no role is selected
    //     CanView: permission === 'CanView' ? stringValue : "0",
    //     CanAdd: permission === 'CanAdd' ? stringValue : "0",
    //     CanEdit: permission === 'CanEdit' ? stringValue : "0",
    //     CanDelete: permission === 'CanDelete' ? stringValue : "0",
    //     flag: "1",  // Flag as "Active"
    //     status: "1"  // Default to active
    //   };

    //   this.permissionsList.push(newPermission);
    // }

    // console.log('Updated permissionsList:', this.permissionsList);
  };

  submitpermission() {

    if (!this.permissionsList || this.permissionsList.length === 0) {
      this.AminityInsStatus = "No permissions to submit.";
      this.isModalOpen = true;
      return;
    }

    // Map the updatedPermissionsList correctly, since values are strings "0" or "1"
    const permissionPayload = this.permissionsList.map(permission => ({
      roleID: permission.roleID,
      pageID: permission.pageId,
      canView: permission.CanView?.toString() || "0",
      canAdd: permission.CanAdd?.toString() || "0",
      canEdit: permission.CanEdit?.toString() || "0",
      canDelete: permission.CanDelete?.toString() || "0",
      flag: permission.flag || "1"
    }));

    console.log("Permission payload being sent:", permissionPayload);

    this.apiurl.post("Tbl_RolePermissions_CRUD_Operations", permissionPayload).subscribe({
      next: (response: any) => {
        if (response.statusCode === 200) {
          this.isModalOpen = true;
          this.AminityInsStatus = "Permissions Submitted Successfully!";
          this.updatedPermissionsList = [];
        } else {
          this.isModalOpen = true;
          this.AminityInsStatus = `Error: ${response.Message || 'Failed to update permissions.'}`;
        }
      },
      error: (error) => {
        console.error('Error during API call:', error);
        this.isModalOpen = true;
        this.AminityInsStatus = "Error updating permissions.";
      }
    });
  };

  FetchPermissionByRoleID(roleID: string,modueID:string) {
    const payload = {
      RoleID: roleID,
      PageID: "0",
      CanView: "0",
      CanAdd: "0",
      CanEdit: "0",
      CanDelete: "0",
      Flag: "2"
    };

    this.apiurl.post<any>("GetPermissionsByRole", payload).subscribe({
      next: (response: any) => {
        if (response.statusCode === 200) {
          this.permissionsList = response.data.map((permission: any) => ({
            ...permission,
            canView: permission.canView === "True",
            canAdd: permission.canAdd === "True",
            canEdit: permission.canEdit === "True",
            canDelete: permission.canDelete === "True"
          }));
          this.fetchPagesByModule(modueID);
          this.expandedModuleId = modueID;
          this.selectedModuleName = this.modules.find(module => module.ID === modueID)?.Name || '';

          this.PagesList.forEach(page => {
            const permission = this.permissionsList.find(p => p.pageID === page.ID);

            if (permission) {
              page.CanView = permission.canView;
              page.CanAdd = permission.canAdd;
              page.CanEdit = permission.canEdit;
              page.CanDelete = permission.canDelete;
            } else {
              page.CanView = false;
              page.CanAdd = false;
              page.CanEdit = false;
              page.CanDelete = false;
            }
          });

          console.log('PermissionsList after fetching permissions:', this.permissionsList);
          console.log('PagesList after fetching permissions:', this.PagesList);
        } else {
          // If the statusCode is not 200, set an error message
          this.AminityInsStatus = response.Message || "Error fetching permissions.";
          this.isModalOpen = true;
        }
      },
      error: (error) => {
        this.AminityInsStatus = "Error fetching permissions.";
        this.isModalOpen = true;
      }
    });
  };





  // FetchPermissionByRoleID(roleID: string, moduleID: string) {
  //   const payload = {
  //     RoleID: roleID,
  //     PageID: "0",
  //     CanView: "0",
  //     CanAdd: "0",
  //     CanEdit: "0",
  //     CanDelete: "0",
  //     Flag: "2"
  //   };

  //   this.apiurl.post<any>("GetPermissionsByRole", payload).subscribe({
  //     next: (response: any) => {
  //       if (response.statusCode === 200) {
  //         this.permissionsList = response.data.map((permission: any) => ({
  //           ...permission,
  //           CanView: permission.CanView === "True",
  //           CanAdd: permission.CanAdd === "True",
  //           CanEdit: permission.CanEdit === "True",
  //           CanDelete: permission.CanDelete === "True"
  //         }));
  //         this.fetchPagesByModule(moduleID);
  //         this.expandedModuleId = moduleID;
  //         this.selectedModuleName = this.modules.find(module => module.ID === moduleID)?.Name || '';
  //       } else {
  //         this.showError(response.Message || "Error fetching permissions.");
  //       }
  //     },
  //     error: () => this.showError("Error fetching permissions.")
  //   });
  // };

  showError(message: string) {
    this.AminityInsStatus = message;
    this.isModalOpen = true;
  };



  // updatepermission(RollId:string) {
  //   if (this.permissionsList.length === 0) {
  //     this.AminityInsStatus = "No permissions to submit.";
  //     this.isModalOpen = true;
  //     return;
  //   }

  //   const groupedPermissions: { [key: string]: { [key: string]: any } } = {};

  //   this.permissionsList.forEach(permission => {
  //     const { moduleId, pageId, canView, canAdd, canEdit, canDelete } = permission;

  //     if (!groupedPermissions[moduleId]) {
  //       groupedPermissions[moduleId] = {};
  //     }

  //     if (!groupedPermissions[moduleId][pageId]) {
  //       groupedPermissions[moduleId][pageId] = {
  //         roleID: RollId,
  //         pageID: pageId,
  //         canView: canView || "1",
  //         canAdd: canAdd || "1",
  //         canEdit: canEdit || "1",
  //         canDelete: canDelete || "1",
  //         flag: "4",
  //       };
  //     }

  //     groupedPermissions[moduleId][pageId].canView = canView;
  //     groupedPermissions[moduleId][pageId].canAdd = canAdd;
  //     groupedPermissions[moduleId][pageId].canEdit = canEdit;
  //     groupedPermissions[moduleId][pageId].canDelete = canDelete;
  //   });

  //   const permissionPayload = [];
  //   for (const moduleId in groupedPermissions) {
  //     for (const pageId in groupedPermissions[moduleId]) {
  //       permissionPayload.push(groupedPermissions[moduleId][pageId]);
  //     }
  //   }

  //   this.apiurl.post("Tbl_RolePermissions_CRUD_Operations", permissionPayload).subscribe({
  //     next: (response: any) => {
  //       console.log('API response:', response);
  //       if (response.statusCode === 200) {
  //         this.isModalOpen = true;
  //         this.AminityInsStatus = "Permissions Submitted Successfully!";
  //         this.permissionsList = [];
  //       } else {
  //         this.isModalOpen = true;
  //         this.AminityInsStatus = `Error: ${response.Message}`;
  //       }
  //     },
  //     error: (error) => {
  //       console.error('Error during API call:', error);
  //       this.isModalOpen = true;
  //       this.AminityInsStatus = "Error updating permissions.";
  //     }
  //   });
  // };

updatepermission(RollId: string) {
  if (!this.updatedPermissionsList || this.updatedPermissionsList.length === 0) {
    this.AminityInsStatus = "No permissions to submit.";
    this.isModalOpen = true;
    return;
  }

  // Map the updatedPermissionsList correctly, since values are strings "0" or "1"
  const permissionPayload = this.updatedPermissionsList.map(permission => ({
    roleID: RollId,
    pageID: permission.pageId,
    canView: permission.CanView?.toString() || "0",
    canAdd: permission.CanAdd?.toString() || "0",
    canEdit: permission.CanEdit?.toString() || "0",
    canDelete: permission.CanDelete?.toString() || "0",
    flag: permission.flag || "4"
  }));

  console.log("Permission payload being sent:", permissionPayload);

  this.apiurl.post("Tbl_RolePermissions_CRUD_Operations", permissionPayload).subscribe({
    next: (response: any) => {
      if (response.statusCode === 200) {
        this.isModalOpen = true;
        this.AminityInsStatus = "Permissions Updated Successfully!";
        this.updatedPermissionsList = [];
      } else {
        this.isModalOpen = true;
        this.AminityInsStatus = `Error: ${response.Message || 'Failed to update permissions.'}`;
      }
    },
    error: (error) => {
      console.error('Error during API call:', error);
      this.isModalOpen = true;
      this.AminityInsStatus = "Error updating permissions.";
    }
  });
}


// Merge permissionsList (UI booleans) with updatedPermissionsList (string toggles)
getUpdatedFinalList(): Permission[] {
  if (!this.permissionsList || this.permissionsList.length === 0) {
    console.warn('permissionsList is empty!');
    return [];
  }

  return this.permissionsList.map(uiPerm => {
    const updated = this.updatedPermissionsList.find(
      upd => upd.pageId === uiPerm.pageID && upd.roleID === uiPerm.roleID
    );

    return {
      moduleId: updated?.moduleId || uiPerm.moduleId || "0",
      pageId: uiPerm.pageID,
      roleID: uiPerm.roleID,
      // If updated exists, use its value ("0"/"1"), else use uiPerm boolean
      CanView: updated ? updated.CanView : (uiPerm.canView ? "1" : "0"),
      CanAdd: updated ? updated.CanAdd : (uiPerm.canAdd ? "1" : "0"),
      CanEdit: updated ? updated.CanEdit : (uiPerm.canEdit ? "1" : "0"),
      CanDelete: updated ? updated.CanDelete : (uiPerm.canDelete ? "1" : "0"),
      flag: "1",
      status: "1"
    };
  });
}

fetchNewRoleId(){
  const data = {
      Flag: "6"
    };

    this.apiurl.post<any>("Tbl_Roles_CRUD_Operations", data).subscribe(
      (response: any) => {
        const item = response?.data?.[0];
        if (item) {
          this.RoleForm.patchValue({
            ID: item.id
          });
        } else {
          this.RoleForm.reset();
        }
      },
      error => {
      }
    );
}


// fetchNewRoleId(): Observable<any> {
//   const data = { Flag: "6" };
//   return this.apiurl.post<any>("Tbl_Roles_CRUD_Operations", data).pipe(
//     tap((response: any) => {
//       const item = response?.data?.[0];
//       if (item) {
//         this.RoleForm.patchValue({
//           ID: item.id // patch the new ID
//         });
//       } else {
//         this.RoleForm.reset();
//       }
//     })
//   );
// }

previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;  // Decrease the current page number
    }
  };

  nextPage() {
    if (this.currentPage < this.totalPages()) {
      this.currentPage++;  // Increase the current page number
    }
  };


  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.totalPages()) {
      this.currentPage = pageNumber;  // Set currentPage to the selected page number
    }
  };


  getVisiblePageNumbers() {
    const totalPages = this.totalPages();
    const visiblePages = [];

    let startPage = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
    let endPage = Math.min(startPage + this.visiblePageCount - 1, totalPages);

    // Adjust the start page if there are not enough pages to display
    if (endPage - startPage < this.visiblePageCount - 1) {
      startPage = Math.max(endPage - this.visiblePageCount + 1, 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      visiblePages.push(i);
    }

    return visiblePages;
  };


  totalPages() {
    return Math.ceil(this.RoleCount / this.pageSize);  // Calculate total pages based on page size
  };

}
