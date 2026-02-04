import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';

@Component({
  selector: 'app-subject-staff',
  imports: [NgIf,NgFor,NgClass,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './subject-staff.component.html',
  styleUrl: './subject-staff.component.css'
})
export class SubjectStaffComponent {
  IsAddNewClicked:boolean=false;
  IsActiveStatus:boolean=false;
  ViewModuleClicked:boolean=false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  ModuleList: any[] =[];
  StaffList: any[] =[];
  StaffListNotAssigned: any[] =[];
  AminityInsStatus: any = '';
  isModalOpen = false;
  ModuleCount: number = 0;
  ActiveUserId:string=sessionStorage.getItem('email')?.toString() || '';

categories:any[] = [];

selectedCategories: string[] = []; // s
dropdownOpen: boolean = false;

toggleSelection(value: string) {
  const index = this.selectedCategories.indexOf(value);
  if (index > -1) {
    this.selectedCategories.splice(index, 1); // remove if already selected
  } else {
    this.selectedCategories.push(value); // add if not selected
  }

  this.ModuleForm.get('Class')?.setValue(this.selectedCategories);
}



  constructor(private router: Router,private apiurl:ApiServiceService) {}

  ngOnInit(): void {
    this.FetchStaffList();
    this.FetchClassList();
    this.FetchModuleList();
  };

  ModuleForm: any = new FormGroup({
    ID: new FormControl(),
    Name: new FormControl(),
    Class:new FormControl()
  });

  getPaginatedModuleLists() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.ListedModuleList.slice(start, start + this.pageSize);
  };

  get ListedModuleList() {
    return this.ModuleList.filter(Module =>
      Module.Name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  };

  AddNewClicked(){
    this.ModuleForm.reset();
    this.selectedCategories = [];
    this.ModuleForm.get('Name')?.patchValue('0');
    this.FetchStaffListThatAreNotAssigned();
    this.FetchClassList();
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewModuleClicked=false;
  };

  SubmitModule(){
    if(this.ModuleForm.invalid){
      return;
    }
    else{
      const data = {
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

  FetchModuleList() {
    const requestData = { Flag: '2' };

    this.apiurl.post<any>('Tbl_SubjectStaff_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.ModuleList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Class:item.class,
                Name: item.staffName
              };
            });
            this.ModuleCount = this.ModuleList.length;
          } else {
            this.ModuleList = [];
          }
        },
        (error) => {
          this.ModuleList = [];
        }
      );
  };

  FetchModuleDetByID(ModuleID: string) {
    const data = {
      ID: ModuleID,
      Flag: "3"
    };

    this.apiurl.post<any>("Tbl_SubjectStaff_CRUD_Operations", data).subscribe(
      (response: any) => {
        const item = response?.data?.[0];
        this.selectedCategories = item.class ? item.class.split(',').map((ID: string) => ID.trim()) : [];
        if (item) {
          const isActiveString = item.isActive === "1" ? true : false;
          this.ModuleForm.patchValue({
            ID: item.id,
            Class:item.class,
            Name: item.staffName
          });
          this.IsActiveStatus = isActiveString;
        } else {
          this.ModuleForm.reset();
        }

        this.IsAddNewClicked=true;
      },
      error => {
      }
    );
  };

  UpdateModule(){
    if(this.ModuleForm.invalid){
      return;
    }
    else{
      const data = {
        ID: this.ModuleForm.get('ID')?.value,
        StaffName: this.ModuleForm.get('Name')?.value,
        Class:this.ModuleForm.get('Class')?.value.join(','),
        Flag: '4'
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

  editreview(ModuleID: string): void {
    this.FetchModuleDetByID(ModuleID);
    this.ViewModuleClicked=true;
  };

  toggleChange(){
    if(this.IsActiveStatus){
      this.IsActiveStatus=false
    }
    else if(!this.IsActiveStatus){
      this.IsActiveStatus=true;
    }
  };

  onSearchChange(): void {
    this.currentPage = 1;
    this.getPaginatedModuleLists();
  };

  closeModal() {
    this.isModalOpen = false;
  };

  handleOk() {
    this.isModalOpen = false;
    this.FetchModuleList();
  };

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
    return Math.ceil(this.ModuleCount / this.pageSize);  // Calculate total pages based on page size
  };

  FetchClassList() {
    const requestData = { Flag: '9' };

    this.apiurl.post<any>('Tbl_Subject_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.categories = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.sNo.toString(),
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

  getClassName(staffType: string | string[]): string {
    if (typeof staffType === 'string' && staffType.includes(',')) {
      staffType = staffType.split(',').map(item => item.trim());
    }

    if (typeof staffType === 'string' || typeof staffType === 'number') {
      const staffTypeStr = staffType.toString();
      const syllabus = this.categories.find(s => s.ID === staffTypeStr);
      return syllabus?.Name ?? 'N/A';
    }

    if (Array.isArray(staffType)) {
      const names = staffType
        .map(id => {
          const idStr = id.toString();
          const syllabus = this.categories.find(s => s.ID === idStr);
          return syllabus?.Name;
        })
        .filter(name => name != null);

      return names.join(', ') || 'N/A';
    }

    return 'N/A';
  };

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
    const requestData = { Flag: '6' };

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
    const requestData = { Flag: '7' };

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
          this.StaffListNotAssigned = [];
        }
      );
  };

}
