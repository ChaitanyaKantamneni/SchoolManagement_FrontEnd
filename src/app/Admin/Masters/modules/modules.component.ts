import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';

@Component({
  selector: 'app-modules',
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './modules.component.html',
  styleUrl: './modules.component.css'
})
export class ModulesComponent {
  IsAddNewClicked:boolean=false;
  IsActiveStatus:boolean=false;
  ViewModuleClicked:boolean=false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  ModuleList: any[] =[];
  AminityInsStatus: any = '';
  isModalOpen = false;
  ModuleCount: number = 0;
  ActiveUserId:string=localStorage.getItem('email')?.toString() || '';

  constructor(private router: Router,private apiurl:ApiServiceService) {}

  ngOnInit(): void {
    this.FetchModuleList();
  };

  ModuleForm: any = new FormGroup({
    ID: new FormControl(),
    Name: new FormControl(),
    Description: new FormControl()
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
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewModuleClicked=false;
  };

  SubmitModule(){
    if(this.ModuleForm.invalid){
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        ModuleName: this.ModuleForm.get('Name')?.value,
        Description: this.ModuleForm.get('Description')?.value,
        IsActive:IsActiveStatusNumeric,
        Flag: '1'
      };

      this.apiurl.post("Tbl_Modules_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            // this.AminityInsStatus = response.status;
            this.isModalOpen = true;
            this.AminityInsStatus = "Module Details Submitted!";
            this.ModuleForm.reset();
            this.ModuleForm.markAsPristine();
          }
        },
        error: (error) => {
          this.AminityInsStatus = "Error Updating Aminity.";
          this.isModalOpen = true;
        },
        complete: () => {
        }
      });
    }
  };

  FetchModuleList() {
    const requestData = { Flag: '2' };

    this.apiurl.post<any>('Tbl_Modules_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.ModuleList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.moduleName,
                IsActive: isActiveString
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

    this.apiurl.post<any>("Tbl_Modules_CRUD_Operations", data).subscribe(
      (response: any) => {
        const item = response?.data?.[0];
        if (item) {
          const isActiveString = item.isActive === "1" ? true : false;
          this.ModuleForm.patchValue({
            ID: item.id,
            Name: item.moduleName,
            Description: item.description
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
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        ID:this.ModuleForm.get('ID')?.value || '',
        ModuleName: this.ModuleForm.get('Name')?.value || '',
        Description: this.ModuleForm.get('Description')?.value || '',
        IsActive:IsActiveStatusNumeric,
        Flag: '4'
      };

      console.log('data',data);
      this.apiurl.post("Tbl_Modules_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            // this.AminityInsStatus = response.status;
            this.isModalOpen = true;
            this.AminityInsStatus = "Module Details Updated!";
            this.ModuleForm.reset();
            this.ModuleForm.markAsPristine();
          }
        },
        error: (error) => {
          this.AminityInsStatus = "Error Updating Aminity.";
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
}
