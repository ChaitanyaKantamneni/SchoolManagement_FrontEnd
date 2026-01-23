// import { Component } from '@angular/core';
// import { MatIconModule } from '@angular/material/icon';
// import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
// import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
// import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
// import { Router } from '@angular/router';
// import { ApiServiceService } from '../../../Services/api-service.service';
// import { delay, forkJoin } from 'rxjs';
// import { SchoolCacheService } from '../../../Services/school-cache.service';
// import { LoaderService } from '../../../Services/loader.service';

// @Component({
//   selector: 'app-academic-year',
//   standalone:true,
//   imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
//   templateUrl: './academic-year.component.html',
//   styleUrl: './academic-year.component.css'
// })
// export class AcademicYearComponent {
//   IsAddNewClicked:boolean=false;
//   IsActiveStatus:boolean=false;
//   ViewAcademicYearClicked:boolean=false;
//   currentPage = 1;
//   pageSize = 5;
//   visiblePageCount: number = 3;
//   searchQuery: string = '';
//   AcademicYearList: any[] =[];
//   SchoolsList: any[] = [];
//   AminityInsStatus: any = '';
//   isModalOpen = false;
//   AcademicYearCount: number = 0;
//   ActiveUserId:string=localStorage.getItem('email')?.toString() || '';

//   constructor(private router: Router,private apiurl:ApiServiceService,private schoolCache: SchoolCacheService,public loader: LoaderService) {}

//   ngOnInit(): void {
//     this.FetchInitialData();
//   };

//   roleId: string | null = localStorage.getItem('RollID');

//   isAdmin(): boolean {
//     return this.roleId === '1';
//   }

//   FetchInitialData() {
//     const academicReq = this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', { Flag: '3' })
//           .pipe(delay(500));

//     this.loader.show();

//     if (this.schoolCache.hasData()) {
//       academicReq.subscribe({
//         next: res => {
//           this.mapAcademicYears(res);
//           this.loader.hide();
//         },
//         error: () => this.loader.hide()
//       });
//       return;
//     }

//     forkJoin({
//       schools: this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', { Flag: '2' }),
//       academics: academicReq
//     }).subscribe({
//       next: ({ schools, academics }) => {
//         if (schools?.data?.length) this.schoolCache.setSchools(schools.data);
//         this.mapAcademicYears(academics);
//         this.loader.hide();
//       },
//       error: () => this.loader.hide()
//     });
//   };

//   mapAcademicYears(response: any) {
//     const schoolMap = this.schoolCache.getSchoolMap();

//     this.AcademicYearList = (response?.data || []).map((item: any) => ({
//       ID: item.id,
//       Name: item.name,
//       SchoolName: schoolMap[item.schoolID] ?? 'Admin',
//       StartDate: this.formatDateDDMMYYYY(item.startDate),
//       EndDate: this.formatDateDDMMYYYY(item.endDate),
//       IsActive: item.isActive === '1' ? 'Active' : 'InActive'
//     }));

//     this.AcademicYearCount = this.AcademicYearList.length;
//   };

//   AcademicYearForm: any = new FormGroup({
//     ID: new FormControl(),
//     Name: new FormControl(),
//     StartDate:new FormControl(),
//     EndDate:new FormControl(),
//     Description: new FormControl()
//   });

//   getPaginatedAcademicYearLists() {
//     const start = (this.currentPage - 1) * this.pageSize;
//     return this.ListedAcademicYearList.slice(start, start + this.pageSize);
//   };

//   get ListedAcademicYearList() {
//     return this.AcademicYearList.filter(AcademicYear =>
//       AcademicYear.Name.toLowerCase().includes(this.searchQuery.toLowerCase())
//     );
//   };

//   AddNewClicked(){
//     this.IsAddNewClicked=!this.IsAddNewClicked;
//     this.IsActiveStatus=true;
//     this.ViewAcademicYearClicked=false;
//   };

//   SubmitAcademicYear(){
//     if(this.AcademicYearForm.invalid){
//       return;
//     }
//     else{
//       const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
//       const data = {
//         Name: this.AcademicYearForm.get('Name')?.value,
//         StartDate: this.AcademicYearForm.get('StartDate')?.value,
//         EndDate: this.AcademicYearForm.get('EndDate')?.value,
//         Description: this.AcademicYearForm.get('Description')?.value,
//         IsActive:IsActiveStatusNumeric,
//         Flag: '1'
//       };

//       this.apiurl.post("Tbl_AcademicYear_CRUD_Operations", data).subscribe({
//         next: (response: any) => {
//           if (response.statusCode === 200) {
//             this.IsAddNewClicked=!this.IsAddNewClicked;
//             // this.AminityInsStatus = response.status;
//             this.isModalOpen = true;
//             this.AminityInsStatus = "Academic Year Details Submitted!";
//             this.AcademicYearForm.reset();
//             this.AcademicYearForm.markAsPristine();
//           }
//         },
//         error: (error) => {
//           this.AminityInsStatus = "Error Updating Aminity.";
//           this.isModalOpen = true;
//         },
//         complete: () => {
//         }
//       });
//     }
//   };

//   FetchAcademicYearDetByID(AcademicYearID: string) {
//     const data = {
//       ID: AcademicYearID,
//       Flag: "4"
//     };

//     this.apiurl.post<any>("Tbl_AcademicYear_CRUD_Operations", data).subscribe(
//       (response: any) => {
//         const item = response?.data?.[0];
//         if (item) {
//           const isActiveString = item.isActive === "1" ? true : false;
//           this.AcademicYearForm.patchValue({
//             ID: item.id,
//             Name: item.name,
//             StartDate: this.formatDateYYYYMMDD(item.startDate),
//             EndDate: this.formatDateYYYYMMDD(item.endDate),
//             Description: item.description
//           });
//           this.IsActiveStatus = isActiveString;
//         } else {
//           this.AcademicYearForm.reset();
//         }

//         this.IsAddNewClicked=true;
//       },
//       error => {
//       }
//     );
//   };

//   UpdateAcademicYear(){
//     if(this.AcademicYearForm.invalid){
//       return;
//     }
//     else{
//       const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
//       const data = {
//         ID:this.AcademicYearForm.get('ID')?.value || '',
//         Name: this.AcademicYearForm.get('Name')?.value || '',
//         StartDate: this.AcademicYearForm.get('StartDate')?.value || '',
//         EndDate: this.AcademicYearForm.get('EndDate')?.value || '',
//         Description: this.AcademicYearForm.get('Description')?.value || '',
//         IsActive:IsActiveStatusNumeric,
//         Flag: '5'
//       };

//       console.log('data',data);
//       this.apiurl.post("Tbl_AcademicYear_CRUD_Operations", data).subscribe({
//         next: (response: any) => {
//           if (response.statusCode === 200) {
//             this.IsAddNewClicked=!this.IsAddNewClicked;
//             // this.AminityInsStatus = response.status;
//             this.isModalOpen = true;
//             this.AminityInsStatus = "Academic Year Details Updated!";
//             this.AcademicYearForm.reset();
//             this.AcademicYearForm.markAsPristine();
//           }
//         },
//         error: (error) => {
//           this.AminityInsStatus = "Error Updating Aminity.";
//           this.isModalOpen = true;
//         },
//         complete: () => {
//         }
//       });
//     }
//   };

//   formatDateYYYYMMDD(dateStr: string | null): string {
//     const convertToYYYYMMDD = (dateStr: string | null): string => {
//       if (!dateStr) return '';
//       const date = new Date(dateStr);
//       if (isNaN(date.getTime())) return '';
//       const year = date.getFullYear();
//       const month = String(date.getMonth() + 1).padStart(2, '0');
//       const day = String(date.getDate()).padStart(2, '0');
//       return `${year}-${month}-${day}`;
//     };
//     return convertToYYYYMMDD(dateStr);
//   };

//   formatDateDDMMYYYY(dateStr: string | null): string {
//     const convertToDDMMYYYY = (dateStr: string | null): string => {
//             if (!dateStr) return '';
//             const date = new Date(dateStr);
//             if (isNaN(date.getTime())) return '';
//             const day = String(date.getDate()).padStart(2, '0');
//             const month = String(date.getMonth() + 1).padStart(2, '0');
//             const year = date.getFullYear();
//             return `${day}-${month}-${year}`;
//     };
//     return convertToDDMMYYYY(dateStr);
//   };

//   editreview(AcademicYearID: string): void {
//     this.FetchAcademicYearDetByID(AcademicYearID);
//     this.ViewAcademicYearClicked=true;
//   };

//   toggleChange(){
//     if(this.IsActiveStatus){
//       this.IsActiveStatus=false
//     }
//     else if(!this.IsActiveStatus){
//       this.IsActiveStatus=true;
//     }
//   };

//   onSearchChange(): void {
//     this.currentPage = 1;
//     this.getPaginatedAcademicYearLists();
//   };

//   closeModal() {
//     this.isModalOpen = false;
//   };

//   handleOk() {
//     this.isModalOpen = false;
//     this.FetchInitialData();
//   };

//   previousPage() {
//     if (this.currentPage > 1) {
//       this.currentPage--;
//     }
//   };

//   nextPage() {
//     if (this.currentPage < this.totalPages()) {
//       this.currentPage++;
//     }
//   };


//   goToPage(pageNumber: number) {
//     if (pageNumber >= 1 && pageNumber <= this.totalPages()) {
//       this.currentPage = pageNumber;
//     }
//   };


//   getVisiblePageNumbers() {
//     const totalPages = this.totalPages();
//     const visiblePages = [];

//     let startPage = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
//     let endPage = Math.min(startPage + this.visiblePageCount - 1, totalPages);

//     if (endPage - startPage < this.visiblePageCount - 1) {
//       startPage = Math.max(endPage - this.visiblePageCount + 1, 1);
//     }

//     for (let i = startPage; i <= endPage; i++) {
//       visiblePages.push(i);
//     }

//     return visiblePages;
//   };


//   totalPages() {
//     return Math.ceil(this.AcademicYearCount / this.pageSize);
//   };
// }



import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { tap } from 'rxjs';
import { SchoolCacheService } from '../../../Services/school-cache.service';
import { LoaderService } from '../../../Services/loader.service';

@Component({
  selector: 'app-academic-year',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './academic-year.component.html',
  styleUrls: ['./academic-year.component.css']
})
export class AcademicYearComponent {
  IsAddNewClicked = false;
  IsActiveStatus = false;
  ViewAcademicYearClicked = false;

  currentPage = 1;
  pageSize = 5;
  visiblePageCount = 3;
  searchQuery = '';

  AcademicYearList: any[] = [];
  AminityInsStatus = '';
  isModalOpen = false;
  AcademicYearCount = 0;

  ActiveUserId = localStorage.getItem('SchoolID')?.toString() || '';
  roleId = localStorage.getItem('RollID');

  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
  lastCreatedDate: string | null = null;
  lastID: number | null = null;



  AcademicYearForm = new FormGroup({
    ID: new FormControl(),
    Name: new FormControl(),
    StartDate: new FormControl(),
    EndDate: new FormControl(),
    Description: new FormControl()
  });

  constructor(
    private router: Router,
    private apiurl: ApiServiceService,
    private schoolCache: SchoolCacheService,
    public loader: LoaderService
  ) {}

  ngOnInit(): void {
    this.FetchInitialData();
  }

  isAdmin(): boolean {
    return this.roleId === '1';
  }

  FetchAcademicYearCount() {
    return this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', {
      Flag: '6'
    });
  }

  // FetchInitialData() {
  //   this.loader.show();
  //   this.FetchAcademicYearCount().subscribe({
  //     next: (countResponse: any) => {
  //       this.AcademicYearCount = countResponse?.data?.[0]?.totalcount ?? 0;
  //       if (this.currentPage > this.totalPages()) this.currentPage = this.totalPages() || 1;

  //       this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', {
  //         Flag: '3',
  //         Limit: this.pageSize,
  //         Offset: (this.currentPage - 1) * this.pageSize
  //       }).subscribe({
  //         next: (response: any) => {
  //           this.mapAcademicYears(response ?? { data: [] });
  //           this.loader.hide();
  //         },
  //         error: () => {
  //           this.AcademicYearList = [];
  //           this.loader.hide();
  //         }
  //       });
  //     },
  //     error: () => {
  //       this.AcademicYearList = [];
  //       this.AcademicYearCount = 0;
  //       this.loader.hide();
  //     }
  //   });
  // }

FetchInitialData() {
  this.loader.show();

  // Fetch total count first
  this.FetchAcademicYearCount().subscribe({
    next: (countResponse: any) => {
      this.AcademicYearCount = countResponse?.data?.[0]?.totalcount ?? 0;

      // Ensure current page is valid
      if (this.currentPage > this.totalPages()) {
        this.currentPage = this.totalPages() || 1;
      }

      // Determine cursor for current page
      let cursor: { lastCreatedDate: any; lastID: number } | null = null;
      if (this.currentPage > 1) {
        cursor = this.pageCursors[this.currentPage - 2] || null; // previous page's last row
      }

      // Fetch data for current page
      this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', {
        Flag: '3',
        Limit: this.pageSize,
        LastCreatedDate: cursor?.lastCreatedDate ?? null,
        LastID: cursor?.lastID ?? null
      }).subscribe({
        next: (response: any) => {
          const data = response?.data || [];
          this.mapAcademicYears(response);

          // Store cursor for **this page** if not already stored
          if (data.length > 0 && !this.pageCursors[this.currentPage - 1]) {
            const lastRow = data[data.length - 1];
            this.pageCursors[this.currentPage - 1] = {
              lastCreatedDate: lastRow.createdDate,
              lastID: Number(lastRow.id)
            };
          }

          this.loader.hide();
        },
        error: () => {
          this.AcademicYearList = [];
          this.loader.hide();
        }
      });
    },
    error: () => {
      this.AcademicYearList = [];
      this.AcademicYearCount = 0;
      this.loader.hide();
    }
  });
}


  mapAcademicYears(response: any) {
    const schoolMap = this.schoolCache.getSchoolMap() || {};
    this.AcademicYearList = (response.data || []).map((item: any) => ({
      ID: item.id,
      Name: item.name,
      SchoolName: schoolMap[item.schoolID] ?? `School-${item.schoolID}`,
      StartDate: this.formatDateDDMMYYYY(item.startDate),
      EndDate: this.formatDateDDMMYYYY(item.endDate),
      IsActive: item.isActive === '1' ? 'Active' : 'InActive'
    }));
  }

  AddNewClicked() {
    this.IsAddNewClicked = !this.IsAddNewClicked;
    this.IsActiveStatus = true;
    this.ViewAcademicYearClicked = false;
  }

  SubmitAcademicYear() {
    if(this.AcademicYearForm.invalid) return;

    const data = {
      Name: this.AcademicYearForm.get('Name')?.value,
      StartDate: this.AcademicYearForm.get('StartDate')?.value,
      EndDate: this.AcademicYearForm.get('EndDate')?.value,
      Description: this.AcademicYearForm.get('Description')?.value,
      IsActive: this.IsActiveStatus ? "1" : "0",
      SchoolID: this.ActiveUserId,
      Flag: '1'
    };

    this.apiurl.post("Tbl_AcademicYear_CRUD_Operations", data).subscribe({
      next: () => {
        this.isModalOpen = true;
        this.AminityInsStatus = "Academic Year Details Submitted!";
        this.AcademicYearForm.reset();
        this.FetchInitialData();
        this.IsAddNewClicked = false;
      },
      error: () => {
        this.isModalOpen = true;
        this.AminityInsStatus = "Error Submitting Academic Year!";
      }
    });
  }

  FetchAcademicYearDetByID(AcademicYearID: string) {
    this.apiurl.post<any>("Tbl_AcademicYear_CRUD_Operations", { ID: AcademicYearID, Flag: "4" }).subscribe({
      next: (response: any) => {
        const item = response?.data?.[0];
        if (item) {
          this.AcademicYearForm.patchValue({
            ID: item.id,
            Name: item.name,
            StartDate: this.formatDateYYYYMMDD(item.startDate),
            EndDate: this.formatDateYYYYMMDD(item.endDate),
            Description: item.description
          });
          this.IsActiveStatus = item.isActive === "1";
        }
        this.IsAddNewClicked = true;
        this.ViewAcademicYearClicked = true;
      }
    });
  }

  UpdateAcademicYear() {
    if(this.AcademicYearForm.invalid) return;

    const data = {
      ID: this.AcademicYearForm.get('ID')?.value || '',
      Name: this.AcademicYearForm.get('Name')?.value || '',
      StartDate: this.AcademicYearForm.get('StartDate')?.value || '',
      EndDate: this.AcademicYearForm.get('EndDate')?.value || '',
      Description: this.AcademicYearForm.get('Description')?.value || '',
      IsActive: this.IsActiveStatus ? "1" : "0",
      SchoolID: this.ActiveUserId,
      Flag: '5'
    };

    this.apiurl.post("Tbl_AcademicYear_CRUD_Operations", data).subscribe({
      next: () => {
        this.isModalOpen = true;
        this.AminityInsStatus = "Academic Year Details Updated!";
        this.AcademicYearForm.reset();
        this.FetchInitialData();
        this.IsAddNewClicked = false;
      },
      error: () => {
        this.isModalOpen = true;
        this.AminityInsStatus = "Error Updating Academic Year!";
      }
    });
  }

previousPage() {
  if (this.currentPage > 1) {
    this.currentPage--;
    this.FetchInitialData();
  }
}

nextPage() {
  if (this.currentPage < this.totalPages()) {
    this.currentPage++;
    this.FetchInitialData();
  }
}




  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.totalPages()) {
      this.currentPage = pageNumber;
      this.FetchInitialData();
    }
  }

  totalPages() {
    return Math.ceil(this.AcademicYearCount / this.pageSize);
  }

  getVisiblePageNumbers() {
    const totalPages = this.totalPages();
    const pages = [];
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount/2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, totalPages);
    if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
    for (let i=start; i<=end; i++) pages.push(i);
    return pages;
  }

  onSearchChange() {
    this.currentPage = 1;
    this.FetchInitialData();
  }

  formatDateYYYYMMDD(dateStr: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
  }

  formatDateDDMMYYYY(dateStr: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  handleOk() {
    this.isModalOpen = false;
    this.FetchInitialData();
  }

  editreview(AcademicYearID: string) {
    this.FetchAcademicYearDetByID(AcademicYearID);
  }

  toggleChange() {
    this.IsActiveStatus = !this.IsActiveStatus;
  }
}


