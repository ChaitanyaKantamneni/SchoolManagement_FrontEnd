import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
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
  selector: 'app-staff',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.css'
})
export class StaffComponent extends BasePermissionComponent {
  pageName = 'Staff';

  constructor(
    private http: HttpClient,
    router: Router,
    public loader: LoaderService,
    private apiurl: ApiServiceService,
    menuService: MenuServiceService,
    private cdr: ChangeDetectorRef
  ) {
    super(menuService, router);
  }

  ngOnInit(): void {
    this.checkViewPermission();
    this.SchoolSelectionChange=false;
    this.FetchRoleList();
    this.FetchSchoolsList();
    this.FetchInitialData();
  };

  IsAddNewClicked:boolean=false;
  IsActiveStatus:boolean=false;
  ViewStaffClicked:boolean=false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;
  StaffList: any[] =[];
  StaffCount: number = 0;
  StaffTypeList:any[]=[];
  isViewMode = false;
  viewSyllabus: any = null;
  AminityInsStatus: any = '';
  isModalOpen = false;
  isViewModalOpen= false;
  ActiveUserId:string=sessionStorage.getItem('email')?.toString() || '';
  roleId = sessionStorage.getItem('RollID');

  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
  lastCreatedDate: string | null = null;
  lastID: number | null = null;

  sortColumn: string = 'Name'; 
  sortDirection: 'asc' | 'desc' = 'desc';
  editclicked:boolean=false;
  schoolList: any[] = [];
  selectedSchoolID: string = '';
  SchoolSelectionChange:boolean=false;

  StaffForm: any = new FormGroup({
    ID: new FormControl(),
    StaffType: new FormControl([], Validators.required),
    FirstName: new FormControl('',[Validators.required,Validators.pattern('^[a-zA-Z!@#$%^&*()_+\\-=\\[\\]{};:\'",.<>/?|`~]+$')]),
    MiddleName:new FormControl('',[Validators.pattern('^[a-zA-Z!@#$%^&*()_+\\-=\\[\\]{};:\'",.<>/?|`~]+$')]),
    LastName: new FormControl('',[Validators.pattern('^[a-zA-Z!@#$%^&*()_+\\-=\\[\\]{};:\'",.<>/?|`~]+$')]),
    MobileNumber: new FormControl('', [Validators.required,Validators.pattern(/^[0-9]{10}$/)]),
    Email: new FormControl('', [Validators.required,Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]),
    DateOfBirth:new FormControl('', Validators.required),
    Qualification: new FormControl('', Validators.required),
    School:new FormControl()
  });

  allowAlphaAndSpecial(event: KeyboardEvent) {
    const allowedRegex = /^[a-zA-Z!@#$%^&*()_+\-=\[\]{};:'",.<>/?|`~]$/;
    if (
      event.key === 'Backspace' ||
      event.key === 'Tab' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'Delete'
    ) {
      return;
    }

    if (!allowedRegex.test(event.key)) {
      event.preventDefault();
    }
  }

  allowOnlyNumbers(event: KeyboardEvent) {
    if (
      event.key === 'Backspace' ||
      event.key === 'Tab' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'Delete'
    ) {
      return;
    }

    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

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

  protected override get isAdmin(): boolean {
    return this.roleId === '1';
  }

  FetchAcademicYearCount(isSearch: boolean) {
    let SchoolIdSelected = '';

    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    return this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', {
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
        this.StaffCount = countResp?.data?.[0]?.totalCount ?? 0;
        console.log('this.StaffCount',this.StaffCount);
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

        this.apiurl.post<any>('Tbl_Staff_CRUD_Operations', payload).subscribe({
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
            this.StaffList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.StaffList = [];
        this.StaffCount = 0;
        this.loader.hide();
      }
    });
  };

  mapAcademicYears(response: any) {
    this.StaffList = (response.data || []).map((item: any) => {

      const staffTypeArray = item.staffType
        ? item.staffType.split(',').map((id: string) => id.trim())
        : [];

      return {
        ID: item.id,
        StaffType: staffTypeArray,

        // Full name (same logic as backend CONCAT)
        Name: [
          item.firstName,
          item.middleName,
          item.lastName
        ].filter(Boolean).join(' '),

        FirstName: item.firstName,
        MiddleName: item.middleName,
        LastName: item.lastName,

        MobileNumber: item.mobileNumber,
        Email: item.email,
        DateOfBirth: item.dateOfBirth,
        Qualification: item.qualification,
        Schoolname:item.schoolName,
        AcademicYearName:item.academicYearName,

        IsActive: item.isActive === '1' || item.isActive === true
          ? 'Active'
          : 'Inactive'
      };
    });
  }


  AddNewClicked(){
    this.selectedCategories = [];
    this.StaffForm.get('StaffType')?.setValue([]);
    this.dropdownOpen = false;
    // this.cdr.detectChanges();
    this.StaffForm.reset();
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewStaffClicked=false;
  };

  SubmitStaff(){
    if(this.StaffForm.invalid){
      this.StaffForm.markAllAsTouched();
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        SchoolID:this.StaffForm.get('School')?.value,
        StaffType: this.StaffForm.get('StaffType')?.value.join(','),
        FirstName: this.StaffForm.get('FirstName')?.value,
        MiddleName: this.StaffForm.get('MiddleName')?.value,
        LastName: this.StaffForm.get('LastName')?.value,
        MobileNumber: this.StaffForm.get('MobileNumber')?.value,
        Email: this.StaffForm.get('Email')?.value,
        DateOfBirth: this.StaffForm.get('DateOfBirth')?.value,
        Qualification: this.StaffForm.get('Qualification')?.value,
        IsActive:IsActiveStatusNumeric,
        Flag: '1'
      };

      this.apiurl.post("Tbl_Staff_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.SubmitUser();
            this.IsAddNewClicked=!this.IsAddNewClicked;
            // this.AminityInsStatus = response.status;
            this.isModalOpen = true;
            this.AminityInsStatus = "Staff Details Submitted!";
            this.StaffForm.reset();
            this.StaffForm.markAsPristine();
          }
        },
        error: (error: any) => {
          if (error.status === 409) {
            this.AminityInsStatus = error.error?.Message || "Staff already exists";
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
    }
  };

  FetchSyllabusDetByID(SyllabusID: string, mode: 'view' | 'edit') {
    const data = {
      ID: SyllabusID,
      Flag: "4"
    };

    this.apiurl.post<any>("Tbl_Staff_CRUD_Operations", data).subscribe(
      (response: any) => {

        const item = response?.data?.[0];
        if (!item) {
          this.StaffForm.reset();
          this.viewSyllabus = null;
          return;
        }

        const isActive = item.isActive === '1';
        const staffTypeArray = item.staffType ? item.staffType.split(',').map((id: string) => id.trim()) : [];
        this.selectedCategories = item.staffType ? item.staffType.split(',').map((id: string) => id.trim()) : [];

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewSyllabus = {
            ID: item.id,
            StaffType: staffTypeArray,
            Name: item.firstName + ' ' + item.middleName + ' ' + item.lastName,
            FirstName: item.firstName,
            MiddleName: item.middleName,
            LastName: item.lastName,
            MobileNumber: item.mobileNumber,
            Email: item.email,
            DateOfBirth: item.dateOfBirth,
            Qualification: item.qualification,
            IsActive: isActive
          };
          this.isViewModalOpen = true;
        }

        if (mode === 'edit') {
          this.isViewMode = false;
          this.StaffForm.patchValue({
            ID: item.id,
            StaffType: this.selectedCategories,
            FirstName: item.firstName,
            MiddleName: item.middleName,
            LastName: item.lastName,
            MobileNumber: item.mobileNumber,
            Email: item.email,
            DateOfBirth: this.formatDateYYYYMMDD(item.dateOfBirth),
            Qualification: item.qualification,
            School:item.schoolID
          });
          this.IsActiveStatus = isActive;
          this.IsAddNewClicked = true;
        }

      },
      error => {
        console.error(error);
      }
    );
  };

  UpdateStaff(){
    if(this.StaffForm.invalid){
      this.StaffForm.markAllAsTouched();
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        ID:this.StaffForm.get('ID')?.value,
        SchoolID:this.StaffForm.get('School')?.value,
        StaffType: this.StaffForm.get('StaffType')?.value.join(','),
        FirstName: this.StaffForm.get('FirstName')?.value,
        MiddleName: this.StaffForm.get('MiddleName')?.value,
        LastName: this.StaffForm.get('LastName')?.value,
        MobileNumber: this.StaffForm.get('MobileNumber')?.value,
        Email: this.StaffForm.get('Email')?.value,
        DateOfBirth: this.StaffForm.get('DateOfBirth')?.value,
        Qualification: this.StaffForm.get('Qualification')?.value,
        IsActive:IsActiveStatusNumeric,
        Flag: '5'
      };

      console.log('data',data);
      this.apiurl.post("Tbl_Staff_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.UpdateUser();
            this.IsAddNewClicked=!this.IsAddNewClicked;
            // this.AminityInsStatus = response.status;
            this.isModalOpen = true;
            this.AminityInsStatus = "Staff Details Updated!";
            this.StaffForm.reset();
            this.StaffForm.markAsPristine();
          }
        },
        error: (error) => {
          this.AminityInsStatus = "Error Updating Staff.";
          this.isModalOpen = true;
        },
        complete: () => {
        }
      });
    }
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
    return Math.ceil(this.StaffCount / this.pageSize);
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
    this.ViewStaffClicked=true;
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

  getSyllabusName(staffType: string | string[]): string {
    console.log('staffType:', staffType); // Debugging line

    // If it's a single staff type ID
    if (typeof staffType === 'string') {
      console.log('Looking for ID:', staffType); // Debugging line
      const syllabus = this.StaffTypeList.find(s => s.ID === staffType);
      console.log('Found syllabus:', syllabus); // Debugging line
      return syllabus?.Name ?? 'N/A';
    }

    // If it's an array of staff type IDs
    if (Array.isArray(staffType)) {
      const names = staffType
        .map(id => {
          console.log('Looking for ID:', id); // Debugging line
          const syllabus = this.StaffTypeList.find(s => s.ID === id);
          console.log('Found syllabus:', syllabus); // Debugging line
          return syllabus?.Name;
        })
        .filter(name => name != null);

      return names.join(', ') || 'N/A';
    }

    return 'N/A';
  };

  selectedCategories: string[] = []; // s
  dropdownOpen: boolean = false;

  toggleSelection(value: string) {
    const index = this.selectedCategories.indexOf(value);
    if (index > -1) {
      this.selectedCategories.splice(index, 1); // remove if already selected
    } else {
      this.selectedCategories.push(value); // add if not selected
    }

    this.StaffForm.get('StaffType')?.setValue(this.selectedCategories);
  };

  closeDropdown(){
    this.dropdownOpen = false;
  };

  FetchRoleList() {
    const requestData = { Flag: '2' };
    this.apiurl.post<any>('Tbl_Roles_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.StaffTypeList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.roleName,
                IsActive: isActiveString
              };
            });
          } else {
            this.StaffTypeList = [];
          }
        },
        (error) => {
          this.StaffTypeList = [];
        }
      );
  };

  SubmitUser(){
    const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
    const formData = new FormData();
    formData.append('SchoolID', this.StaffForm.get('School')?.value ?? '');
    formData.append('FirstName', this.StaffForm.get('FirstName')?.value ?? '');
    formData.append('LastName', this.StaffForm.get('LastName')?.value ?? '');
    formData.append('MobileNo', this.StaffForm.get('MobileNumber')?.value ?? '');
    formData.append('Email', this.StaffForm.get('Email')?.value ?? '');
    formData.append('RollId', this.StaffForm.get('StaffType')?.value.join(','));
    formData.append('Password', 'Welcome@2025');
    formData.append('IsActive', IsActiveStatusNumeric);
    formData.append('Flag', '1');

      this.apiurl.post("Tbl_Users_CRUD_Operations", formData).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.StaffForm.reset();
            this.StaffForm.markAsPristine();
          }
        },
        error: (error: any) => {
          if (error.status === 409) {
            this.AminityInsStatus = error.error?.Message || "Staff already exists";
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
  };

  UpdateUser(){
    const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
    const formData = new FormData();
    formData.append('SchoolID', this.StaffForm.get('School')?.value ?? '');
    formData.append('FirstName', this.StaffForm.get('FirstName')?.value ?? '');
    formData.append('LastName', this.StaffForm.get('LastName')?.value ?? '');
    formData.append('MobileNo', this.StaffForm.get('MobileNumber')?.value ?? '');
    formData.append('Email', this.StaffForm.get('Email')?.value ?? '');
    formData.append('RollId', this.StaffForm.get('StaffType')?.value.join(','));
    formData.append('IsActive', IsActiveStatusNumeric);
    formData.append('Flag', '7');

      this.apiurl.post("Tbl_Users_CRUD_Operations", formData).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.StaffForm.reset();
            this.StaffForm.markAsPristine();
          }
        },
        error: (error: any) => {
          if (error.status === 409) {
            this.AminityInsStatus = error.error?.Message || "Staff already exists";
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
  };
}
