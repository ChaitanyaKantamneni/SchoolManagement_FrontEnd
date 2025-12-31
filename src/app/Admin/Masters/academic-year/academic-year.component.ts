import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';

@Component({
  selector: 'app-academic-year',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './academic-year.component.html',
  styleUrl: './academic-year.component.css'
})
export class AcademicYearComponent {
  IsAddNewClicked:boolean=false;
  IsActiveStatus:boolean=false;
  ViewAcademicYearClicked:boolean=false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  AcademicYearList: any[] =[];
  AminityInsStatus: any = '';
  isModalOpen = false;
  AcademicYearCount: number = 0;
  ActiveUserId:string=localStorage.getItem('email')?.toString() || '';

  constructor(private router: Router,private apiurl:ApiServiceService) {}

  ngOnInit(): void {
    this.FetchAcademicYearList();
  };

  AcademicYearForm: any = new FormGroup({
    ID: new FormControl(),
    Name: new FormControl(),
    StartDate:new FormControl(),
    EndDate:new FormControl(),
    Description: new FormControl()
  });

  getPaginatedAcademicYearLists() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.ListedAcademicYearList.slice(start, start + this.pageSize);
  };

  get ListedAcademicYearList() {
    return this.AcademicYearList.filter(AcademicYear =>
      AcademicYear.Name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  };

  AddNewClicked(){
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewAcademicYearClicked=false;
  };

  SubmitAcademicYear(){
    if(this.AcademicYearForm.invalid){
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        Name: this.AcademicYearForm.get('Name')?.value,
        StartDate: this.AcademicYearForm.get('StartDate')?.value,
        EndDate: this.AcademicYearForm.get('EndDate')?.value,
        Description: this.AcademicYearForm.get('Description')?.value,
        IsActive:IsActiveStatusNumeric,
        Flag: '1'
      };

      this.apiurl.post("Tbl_AcademicYear_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            // this.AminityInsStatus = response.status;
            this.isModalOpen = true;
            this.AminityInsStatus = "Academic Year Details Submitted!";
            this.AcademicYearForm.reset();
            this.AcademicYearForm.markAsPristine();
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

  FetchAcademicYearList() {
    const requestData = { Flag: '3' };

    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.AcademicYearList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.name,
                StartDate: this.formatDateDDMMYYYY(item.startDate),
                EndDate: this.formatDateDDMMYYYY(item.endDate),
                IsActive: isActiveString
              };
            });
            this.AcademicYearCount = this.AcademicYearList.length;
          } else {
            this.AcademicYearList = [];
          }
        },
        (error) => {
          this.AcademicYearList = [];
        }
      );
  };

  FetchAcademicYearDetByID(AcademicYearID: string) {
    const data = {
      ID: AcademicYearID,
      Flag: "4"
    };

    this.apiurl.post<any>("Tbl_AcademicYear_CRUD_Operations", data).subscribe(
      (response: any) => {
        const item = response?.data?.[0];
        if (item) {
          const isActiveString = item.isActive === "1" ? true : false;
          this.AcademicYearForm.patchValue({
            ID: item.id,
            Name: item.name,
            StartDate: this.formatDateYYYYMMDD(item.startDate),
            EndDate: this.formatDateYYYYMMDD(item.endDate),
            Description: item.description
          });
          this.IsActiveStatus = isActiveString;
        } else {
          this.AcademicYearForm.reset();
        }

        this.IsAddNewClicked=true;
      },
      error => {
      }
    );
  };

  UpdateAcademicYear(){
    if(this.AcademicYearForm.invalid){
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        ID:this.AcademicYearForm.get('ID')?.value || '',
        Name: this.AcademicYearForm.get('Name')?.value || '',
        StartDate: this.AcademicYearForm.get('StartDate')?.value || '',
        EndDate: this.AcademicYearForm.get('EndDate')?.value || '',
        Description: this.AcademicYearForm.get('Description')?.value || '',
        IsActive:IsActiveStatusNumeric,
        Flag: '5'
      };

      console.log('data',data);
      this.apiurl.post("Tbl_AcademicYear_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            // this.AminityInsStatus = response.status;
            this.isModalOpen = true;
            this.AminityInsStatus = "Academic Year Details Updated!";
            this.AcademicYearForm.reset();
            this.AcademicYearForm.markAsPristine();
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

  editreview(AcademicYearID: string): void {
    this.FetchAcademicYearDetByID(AcademicYearID);
    this.ViewAcademicYearClicked=true;
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
    this.getPaginatedAcademicYearLists();
  };

  closeModal() {
    this.isModalOpen = false;
  };

  handleOk() {
    this.isModalOpen = false;
    this.FetchAcademicYearList();
  };

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  };

  nextPage() {
    if (this.currentPage < this.totalPages()) {
      this.currentPage++;
    }
  };


  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.totalPages()) {
      this.currentPage = pageNumber;
    }
  };


  getVisiblePageNumbers() {
    const totalPages = this.totalPages();
    const visiblePages = [];

    let startPage = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
    let endPage = Math.min(startPage + this.visiblePageCount - 1, totalPages);

    if (endPage - startPage < this.visiblePageCount - 1) {
      startPage = Math.max(endPage - this.visiblePageCount + 1, 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      visiblePages.push(i);
    }

    return visiblePages;
  };


  totalPages() {
    return Math.ceil(this.AcademicYearCount / this.pageSize);
  };
}
