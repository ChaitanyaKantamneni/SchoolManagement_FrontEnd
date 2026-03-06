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
  selector: 'app-fee-discount',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './fee-discount.component.html',
  styleUrls: ['./fee-discount.component.css']
})
export class FeeDiscountComponent extends BasePermissionComponent {
  pageName = 'Fee Discount';

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
    this.SyllabusList=[];
    this.FetchSchoolsList();
    this.FetchInitialData();
  };

  IsAddNewClicked:boolean=false;
  IsActiveStatus:boolean=false;
  ViewClassClicked:boolean=false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;
  ClassList: any[] =[];
  ClassCount: number = 0;
  SyllabusList: any[] =[];
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

  sortColumn: string = 'FeeCategory'; 
  sortDirection: 'asc' | 'desc' = 'desc';
  editclicked:boolean=false;
  schoolList: any[] = [];
  selectedSchoolID: string = '';
  SchoolSelectionChange:boolean=false;
  academicYearList:any[] = [];
  feecategorylist:any[] = [];
  AdminselectedSchoolID:string = '';
  AdminselectedAcademivYearID:string = '';
  FineCollectionTypePercentage:boolean=false;
  studentList: any[] = [];

  ClassForm: any = new FormGroup({
    ID: new FormControl(),
    SchoolID: new FormControl(),
    StudentName: new FormControl('',Validators.required),
    // StartDate: new FormControl('',Validators.required),
    // EndDate: new FormControl('',Validators.required),
    Class: new FormControl('',Validators.required),
    Division: new FormControl('',Validators.required),
    DiscountCategory: new FormControl('',Validators.required),
    DiscountType: new FormControl('',Validators.required),
    DiscountValue: new FormControl('',Validators.required),
    FeeCategory: new FormControl(0,[Validators.required,Validators.min(1)]),
    Description: new FormControl(),
    School: new FormControl(),
    AcademicYear: new FormControl(0,[Validators.required,Validators.min(1)])
  });

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
  
   FetchFeeCategoryList() {
    const requestData = { 
      SchoolID:this.AdminselectedSchoolID||'',
      AcademicYear: this.AdminselectedAcademivYearID,
      Flag: '3'
     };

    this.apiurl.post<any>('Tbl_FeeCategory_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.feecategorylist = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.feeCategoryName,
                IsActive: isActiveString
              };
            });            
          } else {
            this.feecategorylist = [];
          }
        },
        (error) => {
          this.feecategorylist = [];
        }
      );
  };

  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  FetchAcademicYearCount(isSearch: boolean) {
    let SchoolIdSelected = '';

    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    return this.apiurl.post<any>('Tbl_FeeDiscount_CRUD_Operations', {
      Flag: isSearch ? '8' : '6',
      SchoolID:SchoolIdSelected,
      FeeCategoryName: isSearch ? this.searchQuery.trim() : null
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
        this.ClassCount = countResp?.data?.[0]?.totalcount ?? 0;

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

        this.apiurl.post<any>('Tbl_FeeDiscount_CRUD_Operations', payload).subscribe({
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
            this.ClassList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.ClassList = [];
        this.ClassCount = 0;
        this.loader.hide();
      }
    });
  };


  mapAcademicYears(response: any) {
    this.ClassList = (response.data || []).map((item: any) => ({
      ID: item.id,
      SchoolID:item.schoolID,
      Name: item.name,
      // StartDate: item.startDate,
      // EndDate: item.endDate,\
      Class: item.class,
      Division: item.division,
      // DivisionCategory: item.divisionCategory,
      DiscountType: item.discountType,
      DiscountValue: item.discountValue,
      FeeCategory:item.feeCategory,
      // Description:item.description,
      IsActive: item.isActive === "True" ? 'Active' : 'InActive',
      AcademicYearName:item.academicYearName,
      SchoolName:item.schoolName,
    }));
  };

  AddNewClicked(){
    if (this.isAdmin) {
      this.ClassForm.get('School')?.setValidators([Validators.required,Validators.min(1)]);
    } else {
      this.ClassForm.get('School')?.clearValidators();
    }
    if(this.AdminselectedSchoolID==''){
      this.FetchAcademicYearsList();
    }
    this.ClassForm.reset();  
    // this.ClassForm.get('SchoolID').patchValue('0');
    // this.ClassForm.get('Name').patchValue('0');
    // this.ClassForm.get('Class').patchValue('0');
    // this.ClassForm.get('Division').patchValue('0');
    // this.ClassForm.get('DivisionCategory').patchValue('0');
    // this.ClassForm.get('DiscountType').patchValue('0');
    // this.ClassForm.get('DiscountValue').patchValue('0');
    // this.ClassForm.get('FeeCategory').patchValue('0');
    // this.ClassForm.get('SchoolName').patchValue('0');
    // this.ClassForm.get('Description').patchValue('0');
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewClassClicked=false;
    
  };

  // FetchSyllabusList() {
  //   const requestData = { Flag: '3' };

  //   this.apiurl.post<any>('Tbl_FeeCategory_CRUD_Operations', requestData)
  //     .subscribe(
  //       (response: any) => {
  //         if (response && Array.isArray(response.data)) {
  //           this.SyllabusList = response.data.map((item: any) => {
  //             const isActiveString = item.isActive === "1" ? "Active" : "InActive";
  //             return {
  //               ID: item.id,
  //               Name: item.name
  //             };
  //           });
  //         } else {
  //           this.SyllabusList = [];
  //         }
  //       },
  //       (error) => {
  //         this.SyllabusList = [];
  //       }
  //     );
  // };

  SubmitClass(){
    if(this.ClassForm.invalid){
      this.ClassForm.markAllAsTouched();
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        Name: this.ClassForm.get('Name')?.value,
        Class: this.ClassForm.get('Class')?.value,
        Division: this.ClassForm.get('Division')?.value,
        // DivisionCategory: this.ClassForm.get('DivisionCategory')?.value,
        DiscountType: this.ClassForm.get('DiscountType')?.value,
        DiscountValue: this.ClassForm.get('DiscountValue')?.value,
        DiscountValuePerInstallment: this.ClassForm.get('FeeCategory')?.value,
        FeeCategory: this.ClassForm.get('Description')?.value,
        SchoolID: this.ClassForm.get('SchoolName')?.value,
        AcademicYear: this.ClassForm.get('AcademicYear')?.value,
        IsActive:IsActiveStatusNumeric,
        Flag: '1'
      };

      this.apiurl.post("Tbl_FeeDiscount_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            this.isModalOpen = true;
            this.AminityInsStatus = "Fee Discount Details Submitted!";
            this.ClassForm.reset();
            this.ClassForm.markAsPristine();

          }
        },
        error: (err:any) => {
          if (err.status === 400 && err.error?.message) {
            this.AminityInsStatus = err.error.message;  // School Name Already Exists!
          } else if (err.status === 500 && err.error?.Message) {
            this.AminityInsStatus = err.error.Message;  // Database or internal error
          } else {
            this.AminityInsStatus = "Unexpected error occurred.";
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

    this.apiurl.post<any>("Tbl_FeeDiscount_CRUD_Operations", data).subscribe(
      (response: any) => {

        const item = response?.data?.[0];
        if (!item) {
          this.ClassForm.reset();
          this.viewSyllabus = null;
          return;
        }

        // ✅ normalize once
        const isActive = item.isActive === "True";

        if (mode === 'view') {
          this.isViewMode = true;

          this.viewSyllabus = {
            ID: item.id,
            SchoolID: item.schoolID,
            Name: item.name,
            Class: item.class,
            Division: item.division,
            // DivisionCategory:item.divisionCategory,
            DiscountType:item.discountType,
            MinAmountForDiscount:item.minAmountForDiscount,
            DiscountValuePerInstallment:item.discountValuePerInstallment,
            FineIncrementIn:item.fineIncrementIn,
            Description:item.description,
            SchoolName: item.schoolName,
            AcademicYearName: item.academicYearName,
            FeeCategoryName:item.feeCategoryName,
            IsActive: isActive 
          };

          this.isViewModalOpen = true;
        }


        if (mode === 'edit') {
          this.isViewMode = false;
          this.ClassForm.patchValue({
            ID: item.id,
            SchoolID: item.schoolID,
            Name: item.name,
            StartDate: this.formatDateYYYYMMDD(item.startDate),
            EndDate:this.formatDateYYYYMMDD( item.endDate),
            FeeCategory:item.feeCategory,
            DiscountType:item.discountType,
            MinAmountForDiscount:item.minAmountForDiscount,
            DiscountValuePerInstallment:item.discountValuePerInstallment,
            FineIncrementIn:item.fineIncrementIn,
            Description:item.description,
            SchoolName:item.schoolID,
            AcademicYear:item.academicYear
          });
          this.AdminselectedSchoolID=item.schoolID;
          this.AdminselectedAcademivYearID=item.academicYear;
          this.FetchAcademicYearsList();
          this.FetchFeeCategoryList();
          this.IsActiveStatus = isActive;
          this.IsAddNewClicked = true;
        }

      },
      error => {
        console.error(error);
      }
    );
  };

  UpdateClass(){
    if(this.ClassForm.invalid){
      this.ClassForm.markAllAsTouched();
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        ID:this.ClassForm.get('ID')?.value || '',
        Name: this.ClassForm.get('Name')?.value,
        Class: this.ClassForm.get('Class')?.value,
        Division: this.ClassForm.get('Division')?.value,
        // DiscountCategory: this.ClassForm.get('DivisionCategory')?.value,
        DiscountType: this.ClassForm.get('DiscountType')?.value,
        DiscountValue: this.ClassForm.get('DiscountValue')?.value,
        FeeCategory: this.ClassForm.get('FeeCategory')?.value,
        // Description: this.ClassForm.get('Description')?.value,
        SchoolID: this.ClassForm.get('School')?.value,
        AcademicYear: this.ClassForm.get('AcademicYear')?.value,
        IsActive:IsActiveStatusNumeric,
        Flag: '5'
      };

      this.apiurl.post("Tbl_FeeDiscount_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            this.isModalOpen = true;
            this.AminityInsStatus = "FeeDiscount Details Updated!";
            this.ClassForm.reset();
            this.ClassForm.markAsPristine();
          }
        },
        error: (err:any) => {
          if (err.status === 400 && err.error?.message) {
            this.AminityInsStatus = err.error.message;  // School Name Already Exists!
          } else if (err.status === 500 && err.error?.Message) {
            this.AminityInsStatus = err.error.Message;  // Database or internal error
          } else {
            this.AminityInsStatus = "Unexpected error occurred.";
          }
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
    return Math.ceil(this.ClassCount / this.pageSize);
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
    this.ViewClassClicked=true;
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

  onAdminSchoolChange(event: Event) {
    this.academicYearList=[];
    this.ClassForm.get('AcademicYear').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if(schoolID=="0"){
      this.AdminselectedSchoolID="";
    }else{
      this.AdminselectedSchoolID = schoolID;
    }   
    this.FetchAcademicYearsList();
  };


  onAdminAcademicyearChange(event: Event){
    this.feecategorylist=[];
     this.ClassForm.get('FeeCategory').patchValue('0');
    const target = event.target as HTMLSelectElement;
    const AcademicYearID = target.value;
    if(AcademicYearID=="0"){
      this.AdminselectedAcademivYearID="";
    }else{
      this.AdminselectedAcademivYearID = AcademicYearID;
    }   
    this.FetchFeeCategoryList();
  }


  onFineTypeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    this.ClassForm.get('FineIncrementIn').patchValue('0');
    if(schoolID=="Percentage"){
      this.FineCollectionTypePercentage=true;
      this.ClassForm.get('FineIncrementIn')?.setValidators([Validators.required,Validators.min(1)]);
    }else{
      this.FineCollectionTypePercentage=false;
      this.ClassForm.get('FineIncrementIn')?.clearValidators();
    }   
    this.ClassForm.get('FineIncrementIn')?.updateValueAndValidity();
  };
}
