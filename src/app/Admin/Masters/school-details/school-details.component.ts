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
import { FileService } from '../../../Services/file.service';

@Component({
  selector: 'app-school-details',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './school-details.component.html',
  styleUrls: ['./school-details.component.css']
})
/**
 * Class Responsibility: Handles view logic and user interactions for SchoolDetailsComponent.
 */
export class SchoolDetailsComponent extends BasePermissionComponent {
  pageName = 'School Details';

  constructor(
    private http: HttpClient,
    router: Router,
    public loader: LoaderService,
    private apiurl: ApiServiceService,
    menuService: MenuServiceService,
    private fileService: FileService
  ) {
    super(menuService, router);
  }

  /**
   * Lifecycle hook: Initializes component parameters and loads default page datasets.
   */
  ngOnInit(): void {
    this.checkViewPermission();
    this.SchoolSelectionChange=false;
    this.FetchInitialData();
  };

  IsAddNewClicked:boolean=false;
  IsActiveStatus:boolean=false;
  ViewSyllabusClicked:boolean=false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;
  SchoolsList: any[] =[];
  SchoolsCount: number = 0;
  SchoolsActiveCount:number=0;
  SchoolsInActiveCount:number=0;
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
  SchoolID:string='';

  SchoolsForm: any = new FormGroup({
    ID: new FormControl(),
    Name: new FormControl('', [Validators.required,Validators.pattern('^[a-zA-Z ]+$')]),
    PhoneNumber: new FormControl('', [Validators.required,Validators.pattern(/^[0-9]{10}$/)]),
    Email: new FormControl('', [Validators.required,Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]),
    Website: new FormControl('', Validators.required),
    Address: new FormControl('', Validators.required)
  });

  /**
   * Executes the operation: allowAlphaAndSpecial
   * Parameters: event: KeyboardEvent
   * Rationale: Standard operational controller for the active view.
   */
  allowAlphaAndSpecial(event: KeyboardEvent) {
    const allowedRegex = /^[a-zA-Z ]$/;
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

  /**
   * Executes the operation: allowOnlyNumbers
   * Parameters: event: KeyboardEvent
   * Rationale: Standard operational controller for the active view.
   */
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

  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  /**
   * Executes the operation: FetchAcademicYearCount
   * Parameters: isSearch: boolean
   * Rationale: Standard operational controller for the active view.
   */
  FetchAcademicYearCount(isSearch: boolean) {
    let SchoolIdSelected = '';

    if (this.SchoolSelectionChange) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    return this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', {
      Flag: isSearch ? '8' : '6',
      SchoolID:SchoolIdSelected,
      Name: isSearch ? this.searchQuery.trim() : null
    });
  }

  /**
   * Executes the operation: FetchInitialData
   * Parameters: extra: any = {}
   * Rationale: Standard operational controller for the active view.
   */
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
        this.SchoolsCount = countResp?.data?.[0]?.totalcount ?? 0;
        this.SchoolsActiveCount=countResp?.data?.[0]?.activeCount ?? 0;
        this.SchoolsInActiveCount=countResp?.data?.[0]?.inactiveCount ?? 0;

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

        this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', payload).subscribe({
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
            this.SchoolsList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.SchoolsList = [];
        this.SchoolsCount = 0;
        this.loader.hide();
      }
    });
  };

  /**
   * Executes the operation: mapAcademicYears
   * Parameters: response: any
   * Rationale: Standard operational controller for the active view.
   */
  mapAcademicYears(response: any) {
    this.SchoolsList = (response.data || []).map((item: any) => ({
      ID: item.id,
      Name: item.name,
      Phonenumber:item.mobileNo,
      Email:item.email,
      WebsiteUrl:item.website,
      Address:item.address,
      IsActive: item.isActive === '1' ? 'Active' : 'InActive'
    }));
  };

  /**
   * Executes the operation: AddNewClicked
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  AddNewClicked(){
    this.FetchLatestSchoolID();
    this.SchoolsForm.reset();
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewSyllabusClicked=false;
  };

  /**
   * Executes the operation: FetchLatestSchoolID
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  FetchLatestSchoolID(){
    const data = {
        Flag: '9'
      };

      this.apiurl.post("Tbl_SchoolDetails_CRUD", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.SchoolID=response?.data?.[0].id;
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
        },
        complete: () => {
        }
      });
  }

  /**
   * Executes the operation: SubmitSyllabus
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  SubmitSyllabus(){
    if(this.SchoolsForm.invalid){
      this.SchoolsForm.markAllAsTouched();
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        Name: this.SchoolsForm.get('Name')?.value,
        MobileNo: this.SchoolsForm.get('PhoneNumber')?.value,
        Email: this.SchoolsForm.get('Email')?.value,
        Website: this.SchoolsForm.get('Website')?.value,
        Address: this.SchoolsForm.get('Address')?.value,
        IsActive:IsActiveStatusNumeric,
        Flag: '1'
      };

      this.apiurl.post("Tbl_SchoolDetails_CRUD", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            this.isModalOpen = true;
            this.AminityInsStatus = "School Details Submitted!";
            this.currentPage=1;
            this.SchoolsForm.reset();
            this.SchoolsForm.markAsPristine();
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

  /**
   * Executes the operation: FetchSyllabusDetByID
   * Parameters: SyllabusID: string, mode: 'view' | 'edit'
   * Rationale: Standard operational controller for the active view.
   */
  FetchSyllabusDetByID(SyllabusID: string, mode: 'view' | 'edit') {
    const data = {
      ID: SyllabusID,
      Flag: "4"
    };

    this.apiurl.post<any>("Tbl_SchoolDetails_CRUD", data).subscribe(
      (response: any) => {

        const item = response?.data?.[0];
        if (!item) {
          this.SchoolsForm.reset();
          this.viewSyllabus = null;
          return;
        }

        const isActive = item.isActive === "1";

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewSyllabus = {
            ID: item.id,
            Name: item.name,
            PhoneNumber: item.mobileNo,
            Email: item.email,
            Website: item.website,
            Address: item.address,
            IsActive: isActive
          };
          this.isViewModalOpen = true;
        }

        if (mode === 'edit') {
          this.isViewMode = false;
          this.SchoolsForm.patchValue({
            ID: item.id,
            Name: item.name,
            PhoneNumber: item.mobileNo,
            Email: item.email,
            Website: item.website,
            Address: item.address
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

  /**
   * Executes the operation: UpdateSyllabus
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  UpdateSyllabus(){
    if(this.SchoolsForm.invalid){
      this.SchoolsForm.markAllAsTouched();
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        ID:this.SchoolsForm.get('ID')?.value || '',
        Name: this.SchoolsForm.get('Name')?.value || '',
        MobileNo: this.SchoolsForm.get('PhoneNumber')?.value || '',
        Email: this.SchoolsForm.get('Email')?.value || '',
        Website: this.SchoolsForm.get('Website')?.value || '',
        Address: this.SchoolsForm.get('Address')?.value || '',
        IsActive:IsActiveStatusNumeric,
        Flag: '5'
      };

      this.apiurl.post("Tbl_SchoolDetails_CRUD", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            this.isModalOpen = true;
            this.AminityInsStatus = "School Details Updated!";
            this.currentPage=1;
            this.SchoolsForm.reset();
            this.SchoolsForm.markAsPristine();
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

  /**
   * Executes the operation: previousPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  };

  /**
   * Executes the operation: nextPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  nextPage() {
    if (this.currentPage < this.totalPages()) {
      this.goToPage(this.currentPage + 1);
    }
  };

  /**
   * Executes the operation: firstPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  firstPage() {
    this.goToPage(1);
  };

  /**
   * Executes the operation: lastPage
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  lastPage() {
    this.goToPage(this.totalPages());
  };

  /**
   * Executes the operation: goToPage
   * Parameters: pageNumber: number
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: totalPages
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  totalPages() {
    return Math.ceil(this.SchoolsCount / this.pageSize);
  };

  /**
   * Executes the operation: getVisiblePageNumbers
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  getVisiblePageNumbers() {
    const totalPages = this.totalPages();
    const pages = [];
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount/2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, totalPages);
    if (end - start < this.visiblePageCount - 1) start = Math.max(end - this.visiblePageCount + 1, 1);
    for (let i=start; i<=end; i++) pages.push(i);
    return pages;
  };

  /**
   * Executes the operation: onSearchChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: formatDateYYYYMMDD
   * Parameters: dateStr: string | null
   * Rationale: Standard operational controller for the active view.
   */
  formatDateYYYYMMDD(dateStr: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
  };

  /**
   * Executes the operation: formatDateDDMMYYYY
   * Parameters: dateStr: string | null
   * Rationale: Standard operational controller for the active view.
   */
  formatDateDDMMYYYY(dateStr: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
  };

  /**
   * Executes the operation: closeModal
   * Parameters: type: 'view' | 'status'
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: handleOk
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  handleOk() {
    this.isModalOpen = false;
    this.FetchInitialData();
  };

  /**
   * Executes the operation: editreview
   * Parameters: SyllabusID: string
   * Rationale: Standard operational controller for the active view.
   */
  editreview(SyllabusID: string): void {
    this.editclicked=true;
    this.SchoolID=SyllabusID.toString();
    this.FetchSyllabusDetByID(SyllabusID,'edit');
    this.loadLogo();
    this.ViewSyllabusClicked=true;
  };

  /**
   * Executes the operation: toggleChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  toggleChange(){
    this.IsActiveStatus = !this.IsActiveStatus;
  };

  /**
   * Executes the operation: sort
   * Parameters: column: string
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: onSchoolChange
   * Parameters: event: Event
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: exportToExcel
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: exportSyllabus
   * Parameters: type: 'pdf' | 'excel' | 'print'
   * Rationale: Standard operational controller for the active view.
   */
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

  /**
   * Executes the operation: viewReview
   * Parameters: SyllabusID: string
   * Rationale: Standard operational controller for the active view.
   */
  viewReview(SyllabusID: string): void {
    this.FetchSyllabusDetByID(SyllabusID,'view');
    this.isViewModalOpen=true;
  };

  /**
   * Executes the operation: pageStartIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageStartIndex(): number {
    return this.SchoolsCount === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
  }

  /**
   * Executes the operation: pageEndIndex
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  pageEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.SchoolsCount);
  }

  schoolLogo: any = null;
  schoolLogoFromDb: any = null;
  isLogoUploading = false;

  /**
   * Executes the operation: loadLogo
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  loadLogo() {
    this.fileService.getSchoolLogo(this.SchoolID)
      .subscribe((res: any) => {
        this.schoolLogoFromDb = res;
      });
  }

  /**
   * Executes the operation: onLogoSelected
   * Parameters: event: any
   * Rationale: Standard operational controller for the active view.
   */
  onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      alert('Only image allowed');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Max 2MB');
      return;
    }

    this.schoolLogo = {
      file,
      preview: URL.createObjectURL(file)
    };
  }

  // async uploadLogo() {
  //   if (!this.schoolLogo) {
  //     alert('Select logo');
  //     return;
  //   }

  //   this.isLogoUploading = true;

  //   const fd = new FormData();
  //   fd.append('File', this.schoolLogo.file);
  //   fd.append('SchoolId', this.SchoolID);

  //   await firstValueFrom(this.fileService.uploadSchoolLogo(fd));

  //   this.schoolLogo = null;
  //   // this.loadLogo();
  //   this.isLogoUploading = false;
  // }

  /**
   * Executes the operation: uploadLogo
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  async uploadLogo() {
    if (!this.schoolLogo) {
      alert('Select logo');
      return;
    }

    this.isLogoUploading = true;

    try {
      const fd = new FormData();
      fd.append('File', this.schoolLogo.file);
      fd.append('SchoolId', this.SchoolID);

      const res: any = await firstValueFrom(
        this.fileService.uploadSchoolLogo(fd)
      );

      // console.log('Uploaded:', res);

      // // update UI immediately
      // if (res?.filePath) {
      //   this.logoUrl = this.fileService.getFullFileUrl(res.filePath);
      // }

      this.schoolLogo = null;
      this.loadLogo(); // optional but recommended
      if(this.editclicked){
        window.location.reload();
      }      

    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      this.isLogoUploading = false; // ✅ ALWAYS runs
    }
  }

  /**
   * Executes the operation: getFileUrl
   * Parameters: path: string
   * Rationale: Standard operational controller for the active view.
   */
  getFileUrl(path: string) {
    return this.fileService.getFullLogoFileUrl(path);
  }

  /**
   * Executes the operation: CancelSyllabus
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  CancelSyllabus(){
    this.IsAddNewClicked=false;
    this.FetchInitialData();
  }

  /**
   * Executes the operation: onRowsCountChange
   * Parameters: none
   * Rationale: Standard operational controller for the active view.
   */
  onRowsCountChange() {
    this.currentPage = 1;
    this.FetchInitialData();
  }
}
