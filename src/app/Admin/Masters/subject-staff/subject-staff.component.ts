import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule,Validators  } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { tap } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent  } from '../../../shared/base-crud.component';
import { SchoolCacheService } from '../../../Services/school-cache.service';
import { LoaderService } from '../../../Services/loader.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-subject-staff',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './subject-staff.component.html',
  styleUrls: ['./subject-staff.component.css']
})
export class SubjectStaffComponent extends BasePermissionComponent {
  pageName = 'Subject Staff';

  constructor(
    private http: HttpClient,
    router: Router,
    public loader: LoaderService,
    private apiurl: ApiServiceService,
    menuService: MenuServiceService
  ) {
    super(menuService, router);
  }

  ngOnInit(): void {
    this.checkViewPermission();
    this.SchoolSelectionChange=false;
    this.FetchStaffList();
    this.FetchClassList();
    this.FetchSchoolsList();
    this.FetchInitialData();
  };

  IsAddNewClicked:boolean=false;
  IsActiveStatus:boolean=false;
  ViewModuleClicked:boolean=false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;
  SyllabusList: any[] =[];
  ModuleList: any[] =[];
  StaffList: any[] =[];
  StaffListNotAssigned: any[] =[];
  isViewMode = false;
  viewSyllabus: any = null;
  AminityInsStatus: any = '';
  isModalOpen = false;
  isViewModalOpen= false;
  SyllabusCount: number = 0;
  ActiveUserId:string=sessionStorage.getItem('email')?.toString() || '';
  roleId = sessionStorage.getItem('RollID');

  categories:any[] = [];
  categoriesInitialFetch:any[] = [];

  selectedCategories: string[] = [];
  dropdownOpen: boolean = false;

  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
  lastCreatedDate: string | null = null;
  lastID: number | null = null;

  sortColumn: string = 'Name'; 
  sortDirection: 'asc' | 'desc' = 'desc';
  editclicked:boolean=false;
  schoolList: any[] = [];
  selectedSchoolID: string = '';
  SchoolSelectionChange:boolean=false;
  academicYearList:any[] = [];
  AdminselectedSchoolID:string = '';
  AdminselectedAcademivYearID:string = '';

  // toggleSelection(value: string) {
  //   const index = this.selectedCategories.indexOf(value);
  //   if (index > -1) {
  //     this.selectedCategories.splice(index, 1); // remove if already selected
  //   } else {
  //     this.selectedCategories.push(value); // add if not selected
  //   }

  //   this.ModuleForm.get('Class')?.setValue(this.selectedCategories);
  // }

  toggleSelection(uniqueID: string) {
    const index = this.selectedCategories.indexOf(uniqueID);
    if (index > -1) {
      this.selectedCategories.splice(index, 1); // uncheck
    } else {
      this.selectedCategories.push(uniqueID);  // check
    }

    this.ModuleForm.get('Class')?.setValue(this.selectedCategories);
  }


  ModuleForm: any = new FormGroup({
    ID: new FormControl(),
    Name: new FormControl(0, Validators.min(1)),
    Class:new FormControl([],Validators.required),
    School: new FormControl(),
    AcademicYear: new FormControl(0,[Validators.required,Validators.min(1)])
  });

  FetchSchoolsList() {
    const requestData = { Flag: '2' };

    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.schoolList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.name,
                IsActive: isActiveString
              };
            });            
          } else {
            this.schoolList = [];
          }
        },
        (error) => {
          this.schoolList = [];
        }
      );
  };

  // protected override get isAdmin(): boolean {
  //   return this.roleId === '1';
  // }

  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  FetchAcademicYearCount(isSearch: boolean) {
    let SchoolIdSelected = '';

    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    return this.apiurl.post<any>('Tbl_SubjectStaff_CRUD_Operations', {
      Flag: isSearch ? '8' : '6',
      SchoolID:SchoolIdSelected,
      Name: isSearch ? this.searchQuery.trim() : null
    });
  }

  FetchInitialData(extra: any = {}) {
    const isSearch = !!this.searchQuery?.trim();
    const flag = isSearch ? '7' : '2';

    let SchoolIdSelected = '';

    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    const cursor =
      !extra.offset && this.currentPage > 1
        ? this.pageCursors[this.currentPage - 2] || null
        : null;

    this.loader.show();

    this.FetchAcademicYearCount(isSearch).subscribe({
      next: (countResp: any) => {
        this.SyllabusCount = countResp?.data?.[0]?.totalcount ?? 0;

        const payload: any = {
          Flag: flag,
          Limit: this.pageSize,
          SortColumn: this.sortColumn,
          SortDirection: this.sortDirection,
          LastCreatedDate: cursor?.lastCreatedDate ?? null,
          LastID: cursor?.lastID ?? null,
          SchoolID:SchoolIdSelected,
          ...extra
        };

        if (isSearch) payload.Name = this.searchQuery.trim();

        this.apiurl.post<any>('Tbl_SubjectStaff_CRUD_Operations', payload).subscribe({
          next: (response: any) => {
            const data = response?.data || [];
            this.mapAcademicYears(response);

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
            this.SyllabusList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.SyllabusList = [];
        this.SyllabusCount = 0;
        this.loader.hide();
      }
    });
  };

  mapAcademicYears(response: any) {
    this.SyllabusList = (response.data || []).map((item: any) => ({
      ID: item.id,
      Class:item.class,
      Name: item.staffName,
      SchoolName:item.schoolName,
      AcademicYearName:item.academicYearName,
      IsActive: item.isActive === true ? 'Active' : 'InActive'
    }));
  };

  AddNewClicked(){
    if (this.isAdmin) {
      this.ModuleForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
    } else {
      this.ModuleForm.get('School')?.clearValidators();
    }
    if(this.AdminselectedSchoolID==''){
      this.FetchAcademicYearsList();
    }
    this.ModuleForm.reset();
    this.selectedCategories = [];
    this.ModuleForm.get('Name')?.patchValue('0');
    this.ModuleForm.get('School').patchValue('0');
    this.ModuleForm.get('AcademicYear').patchValue('0');
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewModuleClicked=false;
  };

  SubmitModule(){
    if(this.ModuleForm.invalid){
      this.ModuleForm.markAllAsTouched();
      return;
    }
    else{
      const data = {
        SchoolID: this.ModuleForm.get('School')?.value,
        AcademicYear: this.ModuleForm.get('AcademicYear')?.value,
        StaffName: this.ModuleForm.get('Name')?.value,
        Class:this.ModuleForm.get('Class')?.value.join(','),
        Flag: '1'
      };

      this.apiurl.post("Tbl_SubjectStaff_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            // this.AminityInsStatus = response.status;
            this.isModalOpen = true;
            this.AminityInsStatus = "Subject Staff Details Submitted!";
            this.ModuleForm.reset();
            this.ModuleForm.markAsPristine();
          }
        },
        error: (error) => {
          this.AminityInsStatus = "Error Updating Subject Staff.";
          this.isModalOpen = true;
        },
        complete: () => {
        }
      });
    }
  };


  FetchSyllabusDetByID(SyllabusID: string, mode: 'view' | 'edit') {
    const data = {
      ID: SyllabusID,
      Flag: "4"
    };

    this.apiurl.post<any>("Tbl_SubjectStaff_CRUD_Operations", data).subscribe(
      (response: any) => {

        const item = response?.data?.[0];
        if (!item) {
          this.ModuleForm.reset();
          this.viewSyllabus = null;
          return;
        }

        const isActive = item.isActive === true;

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewSyllabus = {
            ID: item.id,
            Class:item.class,
            Name: item.staffName,
            SchoolName:item.schoolName,
            AcademicYearName:item.academicYearName,
            IsActive: isActive
          };
          this.isViewModalOpen = true;
        }

        if (mode === 'edit') {
          this.selectedCategories = item.class ? item.class.split(',').map((ID: string) => ID.trim()) : [];
          this.isViewMode = false;
          this.ModuleForm.patchValue({
            ID: item.id,
            Class:item.class,
            Name: item.staffName,
            School:item.schoolID,
            AcademicYear:item.academicYear
          });
          this.categories = this.categories || [];
          this.AdminselectedSchoolID=item.schoolID;
          this.AdminselectedAcademivYearID=item.academicYear;
          this.FetchStaffList();
          this.FetchAcademicYearsList();
          this.FetchStaffListThatAreNotAssigned();
          this.FetchClassListByschoolIDAndAcademicYearID();
          this.IsActiveStatus = isActive;
          this.IsAddNewClicked = true;
        }

      },
      error => {
        console.error(error);
      }
    );
  };

  UpdateModule(){
    if(this.ModuleForm.invalid){
      this.ModuleForm.markAllAsTouched();
      return;
    }
    else{
      const data = {
        ID: this.ModuleForm.get('ID')?.value,
        SchoolID: this.ModuleForm.get('School')?.value,
        AcademicYear: this.ModuleForm.get('AcademicYear')?.value,
        StaffName: this.ModuleForm.get('Name')?.value,
        Class:this.ModuleForm.get('Class')?.value.join(','),
        Flag: '5'
      };

      console.log('data',data);
      this.apiurl.post("Tbl_SubjectStaff_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            // this.AminityInsStatus = response.status;
            this.isModalOpen = true;
            this.AminityInsStatus = "Subject Staff Details Updated!";
            this.ModuleForm.reset();
            this.ModuleForm.markAsPristine();
          }
        },
        error: (error) => {
          this.AminityInsStatus = "Error Updating Subject Staff.";
          this.isModalOpen = true;
        },
        complete: () => {
        }
      });
    }
  };

  FetchClassList() {
    const requestData = { 
      SchoolID:this.AdminselectedSchoolID,
      AcademicYear:this.AdminselectedAcademivYearID,
      Flag: '9' };

    this.apiurl.post<any>('Tbl_Subject_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.categoriesInitialFetch = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                SubjectID: item.subjectID.toString(),
                ClassID: item.classID.toString(),
                SyllabusID: item.syllabusID.toString(),
                UniqueID: `${item.subjectID}_${item.classID}_${item.syllabusID}`,
                Name: item.syllabusClassName
              };
            });
            console.log('Fetched categories:', this.categories); // Debugging line
          } else {
            this.categoriesInitialFetch = [];
          }
        },
        (error) => {
          this.categoriesInitialFetch = [];
        }
      );
  };

  FetchClassListByschoolIDAndAcademicYearID() {
    const requestData = { 
      SchoolID:this.AdminselectedSchoolID,
      AcademicYear:this.AdminselectedAcademivYearID,
      Flag: '9' };

    this.apiurl.post<any>('Tbl_Subject_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.categories = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                SubjectID: item.subjectID.toString(),
                ClassID: item.classID.toString(),
                SyllabusID: item.syllabusID.toString(),
                UniqueID: `${item.subjectID}_${item.classID}_${item.syllabusID}`,
                Name: item.syllabusClassName
              };
            });
            console.log('Fetched categories:', this.categories); // Debugging line
          } else {
            this.categories = [];
          }
        },
        (error) => {
          this.categories = [];
        }
      );
  };

  // getClassName(staffType: string | string[]): string {
  //   if (typeof staffType === 'string' && staffType.includes(',')) {
  //     staffType = staffType.split(',').map(item => item.trim());
  //   }

  //   if (typeof staffType === 'string' || typeof staffType === 'number') {
  //     const staffTypeStr = staffType.toString();
  //     const syllabus = this.categoriesInitialFetch.find(s => s.ID === staffTypeStr);
  //     return syllabus?.Name ?? 'N/A';
  //   }

  //   if (Array.isArray(staffType)) {
  //     const names = staffType
  //       .map(id => {
  //         const idStr = id.toString();
  //         const syllabus = this.categoriesInitialFetch.find(s => s.ID === idStr);
  //         return syllabus?.Name;
  //       })
  //       .filter(name => name != null);

  //     return names.join(', ') || 'N/A';
  //   }

  //   return 'N/A';
  // };

getClassName(uniqueID: string | string[]): string {
  if (typeof uniqueID === 'string' && uniqueID.includes(',')) {
    uniqueID = uniqueID.split(',').map(item => item.trim());
  }

  if (typeof uniqueID === 'string' || typeof uniqueID === 'number') {
    const idStr = uniqueID.toString();
    const subject = this.categoriesInitialFetch.find(s => s.UniqueID === idStr);
    return subject?.Name ?? 'N/A';
  }

  if (Array.isArray(uniqueID)) {
    const names = uniqueID
      .map(id => {
        const subject = this.categoriesInitialFetch.find(s => s.UniqueID === id.toString());
        return subject?.Name;
      })
      .filter(name => name != null);

    return names.join(', ') || 'N/A';
  }

  return 'N/A';
}



  getStaffName(staffType: string | string[]): string {
    if (typeof staffType === 'string' && staffType.includes(',')) {
      staffType = staffType.split(',').map(item => item.trim());
    }

    if (typeof staffType === 'string' || typeof staffType === 'number') {
      const staffTypeStr = staffType.toString();
      const syllabus = this.StaffList.find(s => s.ID === staffTypeStr);
      return syllabus?.Name ?? 'N/A';
    }

    if (Array.isArray(staffType)) {
      const names = staffType
        .map(id => {
          const idStr = id.toString();
          const syllabus = this.StaffList.find(s => s.ID === idStr);
          return syllabus?.Name;
        })
        .filter(name => name != null);

      return names.join(', ') || 'N/A';
    }

    return 'N/A';
  };

  FetchStaffList() {
    const requestData = { 
      SchoolID:this.AdminselectedSchoolID||'',
      AcademicYear:this.AdminselectedAcademivYearID||'',Flag: '9' };

    this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.StaffList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";

              // Check if staffType is a comma-separated string and convert it to an array
              const staffTypeArray = item.staffType ? item.staffType.split(',').map((id: string) => id.trim()) : [];

              return {
                ID: item.id,
                StaffType: staffTypeArray, // Ensure StaffType is always an array
                Name: item.firstName + ' ' + item.middleName + ' ' + item.lastName + ' ' + '-' + ' ' + item.email,
                FirstName: item.firstName,
                MiddleName: item.middleName,
                LastName: item.lastName,
                MobileNumber: item.mobileNumber,
                Email: item.email,
                DateOfBirth: item.dateOfBirth,
                Qualification: item.qualification,
                IsActive: isActiveString
              };
            });
          } else {
            this.StaffList = [];
          }
        },
        (error) => {
          this.StaffList = [];
        }
      );
  };

  FetchStaffListThatAreNotAssigned() {
    const requestData = { 
      SchoolID:this.AdminselectedSchoolID,
      AcademicYear:this.AdminselectedAcademivYearID,
      Flag: '10' };

    this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.StaffListNotAssigned = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";

              // Check if staffType is a comma-separated string and convert it to an array
              const staffTypeArray = item.staffType ? item.staffType.split(',').map((id: string) => id.trim()) : [];

              return {
                ID: item.id,
                StaffType: staffTypeArray, // Ensure StaffType is always an array
                Name: item.firstName + ' ' + item.middleName + ' ' + item.lastName + ' ' + '-' + ' ' + item.email,
                FirstName: item.firstName,
                MiddleName: item.middleName,
                LastName: item.lastName,
                MobileNumber: item.mobileNumber,
                Email: item.email,
                DateOfBirth: item.dateOfBirth,
                Qualification: item.qualification,
                IsActive: isActiveString
              };
            });
          } else {
            this.StaffListNotAssigned = [];
          }
        },
        (error) => {
          if (error?.status === 500) {
            this.StaffListNotAssigned = [];
          }
        }
      );
  };


  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  };

  nextPage() {
    if (this.currentPage < this.totalPages()) {
      this.goToPage(this.currentPage + 1);
    }
  };

  firstPage() {
    this.goToPage(1);
  };

  lastPage() {
    this.goToPage(this.totalPages());
  };

  goToPage(pageNumber: number) {
    const total = this.totalPages();

    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > total) pageNumber = total;

    this.currentPage = pageNumber;

    const isBoundaryPage =
      pageNumber === 1 ||
      pageNumber === total ||
      !this.pageCursors[pageNumber - 2];

    if (isBoundaryPage) {
      const offset = (pageNumber - 1) * this.pageSize;
      this.FetchInitialData({ offset });
    } else {
      this.FetchInitialData();
    }
  };

  totalPages() {
    return Math.ceil(this.SyllabusCount / this.pageSize);
  };

  getVisiblePageNumbers() {
    const totalPages = this.totalPages();
    const pages = [];
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount/2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, totalPages);
    if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
    for (let i=start; i<=end; i++) pages.push(i);
    return pages;
  };

  onSearchChange() {
    clearTimeout(this.searchTimer);

    this.searchTimer = setTimeout(() => {
      const value = this.searchQuery?.trim() || '';

      if (value.length === 0) {
        this.currentPage = 1;
        this.pageSize=5;
        this.visiblePageCount=3;
        this.FetchInitialData();
        return;
      }

      if (value.length < this.SEARCH_MIN_LENGTH) {
        return;
      }
      
      this.currentPage = 1;
      this.pageSize=5;
      this.visiblePageCount=3;
      this.FetchInitialData();

    }, this.SEARCH_DEBOUNCE);
  };

  formatDateYYYYMMDD(dateStr: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
  };

  formatDateDDMMYYYY(dateStr: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
  };

  closeModal(type: 'view' | 'status') {
    console.log('type',type);
    if (type === 'view') {
      this.isViewModalOpen = false;
      this.viewSyllabus = null;
    }

    if (type === 'status') {
      this.isModalOpen = false;
    }
  };

  handleOk() {
    this.isModalOpen = false;
    this.FetchInitialData();
  };

  editreview(SyllabusID: string): void {
    this.editclicked=true;
    this.FetchSyllabusDetByID(SyllabusID,'edit');
    this.ViewModuleClicked=true;
  };

  toggleChange(){
    this.IsActiveStatus = !this.IsActiveStatus;
  };

  sort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;
    this.pageCursors = [];
    this.FetchInitialData();
  };

  onSchoolChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if(schoolID=="0"){
      this.selectedSchoolID="";
    }else{
      this.selectedSchoolID = schoolID;
    }    
    this.SchoolSelectionChange = true;
    this.FetchInitialData();
  };

  exportToExcel() {
      const isSearch = !!this.searchQuery?.trim();
      const flag = isSearch ? '7' : '2';

      const payload: any = {
        Flag: flag,
        SchoolID: this.selectedSchoolID || null,
        Name: isSearch ? this.searchQuery.trim() : null
      };

      this.loader.show();

      this.http.post(`${this.apiurl.api_url}/ExportSyllabusToExcel`, payload, { responseType: 'blob' })
        .subscribe({
          next: (blob: Blob) => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'Syllabus.xlsx';
            a.click();
            URL.revokeObjectURL(a.href);
            this.loader.hide();
          },
          error: () => {
            alert('Excel export failed. Please try again.');
            this.loader.hide();
          }
        });
  };

  exportSyllabus(type: 'pdf' | 'excel' | 'print') {
    const isSearch = !!this.searchQuery?.trim();
    const flag = isSearch ? '7' : '2';
    const payload: any = {
      Flag: flag,
      SchoolID: this.selectedSchoolID || null,
      Name: isSearch ? this.searchQuery.trim() : null
    };

    this.loader.show();

    const url = `${this.apiurl.api_url}/ExportSyllabus?type=${type}`;

    this.http.post(url, payload, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const fileNameBase = `Syllabus_${new Date().toISOString().replace(/[:.]/g,'')}`;

        if (type === 'pdf' || type === 'print') {
          const fileURL = URL.createObjectURL(blob);

          if (type === 'print') {
            const printWindow = window.open(fileURL);
            printWindow?.focus();
            printWindow?.print();
          } else {
            const a = document.createElement('a');
            a.href = fileURL;
            a.download = `${fileNameBase}.pdf`;
            a.click();
          }

          // Release URL after use
          setTimeout(() => URL.revokeObjectURL(fileURL), 1000);
        } 
        else if (type === 'excel') {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${fileNameBase}.xlsx`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }

        this.loader.hide();
      },
      error: () => {
        alert(`${type.toUpperCase()} export failed. Please try again.`);
        this.loader.hide();
      }
    });
  };

  viewReview(SyllabusID: string): void {
    this.FetchSyllabusDetByID(SyllabusID,'view');
    this.isViewModalOpen=true;
  };

  FetchAcademicYearsList() {
    const requestData = { SchoolID:this.AdminselectedSchoolID||'',Flag: '2' };

    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.academicYearList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.name,
                IsActive: isActiveString
              };
            });            
          } else {
            this.academicYearList = [];
          }
        },
        (error) => {
          this.academicYearList = [];
        }
      );
  };

  onAdminSchoolChange(event: Event) {
    this.academicYearList=[];
    this.SyllabusList = [];
    this.ModuleForm.get('Class').patchValue('0');
    this.ModuleForm.get('AcademicYear').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if(schoolID=="0"){
      this.AdminselectedSchoolID="";
    }else{
      this.AdminselectedSchoolID = schoolID;
    }   
    this.FetchAcademicYearsList();
  };

  onAdminAcademicYearChange(event: Event) {
    this.categories=[];
    this.selectedCategories=[];
    this.ModuleForm.get('Class').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if(schoolID=="0"){
      this.AdminselectedAcademivYearID="";
    }else{
      this.AdminselectedAcademivYearID = schoolID;
    }    
    this.FetchStaffListThatAreNotAssigned();
    this.FetchClassListByschoolIDAndAcademicYearID();
  };
}
