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
  selector: 'app-buses',
  standalone:true,
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './buses.component.html',
  styleUrls: ['./buses.component.css']
})
export class BusesComponent extends BasePermissionComponent {
  pageName = 'Bus';

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
    this.FetchSchoolsList();
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
  SyllabusList: any[] =[];
  isViewMode = false;
  viewSyllabus: any = null;
  AminityInsStatus: any = '';
  isModalOpen = false;
  isViewModalOpen= false;
  SyllabusCount: number = 0;
  ActiveUserId:string=localStorage.getItem('email')?.toString() || '';
  roleId = localStorage.getItem('RollID');

  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
  lastCreatedDate: string | null = null;
  lastID: number | null = null;

  sortColumn: string = 'Name'; 
  sortDirection: 'asc' | 'desc' = 'desc';
  editclicked:boolean=false;
  schoolList: any[] = [];
  selectedSchoolID: string = '';
  SchoolSelectionChange:boolean=false;

  SyllabusForm: any = new FormGroup({
    ID: new FormControl(),
    Name: new FormControl('', Validators.required),
    RegNo:new FormControl('', Validators.required),
    Driver: new FormControl('', Validators.required),
    AssistantName: new FormControl('', Validators.required),
    AssistantMobNo: new FormControl('', Validators.required),
    OtherDetails: new FormControl(),
    MorningStartTime: new FormControl('', Validators.required),
    EveningStartTime: new FormControl('', Validators.required),
    DistanceCostPerKM: new FormControl('', Validators.required),
    MaxCapacity: new FormControl('', Validators.required),
    Description: new FormControl()
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

    return this.apiurl.post<any>('Tbl_Bus_CRUD_Operations', {
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

        this.apiurl.post<any>('Tbl_Bus_CRUD_Operations', payload).subscribe({
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
      // SchoolName: schoolMap[item.schoolID] ?? `School-${item.schoolID}`,
      SchoolName:item.schoolName,
      Name: item.name,
      RegNo: item.regNo,
      Driver: item.driver,
      AssistantName: item.assistantName,
      AssistantMobNo: item.assistantMobNo,
      OtherDetails: item.otherDetails,
      MorningStartTime: item.morningStartTime,
      EveningStartTime: item.eveningStartTime,
      DistanceCostPerKM: item.distanceCostPerKM,
      MaxCapacity: item.maxCapacity,
      Description:item.Description,
      IsActive: item.isActive === "True" ? 'Active' : 'InActive',
      AcademicYearName:item.academicYearName
    }));
  };

  AddNewClicked(){
    this.SyllabusForm.reset();
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewSyllabusClicked=false;
  };

  SubmitSyllabus(){
    if(this.SyllabusForm.invalid){
      this.SyllabusForm.markAllAsTouched();
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        ID: this.SyllabusForm.get('ID')?.value,
        Name: this.SyllabusForm.get('Name')?.value,
        RegNo: this.SyllabusForm.get('RegNo')?.value,
        Driver: this.SyllabusForm.get('Driver')?.value,
        AssistantName: this.SyllabusForm.get('AssistantName')?.value,
        AssistantMobNo: this.SyllabusForm.get('AssistantMobNo')?.value,
        OtherDetails: this.SyllabusForm.get('OtherDetails')?.value,
        MorningStartTime: this.formatTime(this.SyllabusForm.get('MorningStartTime')?.value),
        EveningStartTime: this.formatTime(this.SyllabusForm.get('EveningStartTime')?.value),  
        DistanceCostPerKM: this.SyllabusForm.get('DistanceCostPerKM')?.value,
        MaxCapacity: this.SyllabusForm.get('MaxCapacity')?.value,
        Description: this.SyllabusForm.get('Description')?.value,
        IsActive:IsActiveStatusNumeric,
        AcademicYear: this.SyllabusForm.get('AcademicYear')?.value,

        Flag: '1'
      };

      this.apiurl.post("Tbl_Bus_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            this.isModalOpen = true;
            this.AminityInsStatus = "Bus Details Submitted!";
            this.SyllabusForm.reset();
            this.SyllabusForm.markAsPristine();
          }
        },
        error: (error) => {
          this.AminityInsStatus = "Error Updating Bus.";
          this.isModalOpen = true;
        },
        complete: () => {
        }
      });
    }
  };

  formatTime(time: string | null): string | null {
    if (!time) return null;
    return time.length === 5 ? time + ":00" : time; // converts HH:mm → HH:mm:ss
  }


  FetchSyllabusDetByID(SyllabusID: string, mode: 'view' | 'edit') {
    const data = {
      ID: SyllabusID,
      Flag: "4"
    };

    this.apiurl.post<any>("Tbl_Bus_CRUD_Operations", data).subscribe(
      (response: any) => {

        const item = response?.data?.[0];
        if (!item) {
          this.SyllabusForm.reset();
          this.viewSyllabus = null;
          return;
        }

        const isActive = item.isActive === "True";
        console.log('item.isActive',item.isActive);

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewSyllabus = {
            ID: item.id,
            // SchoolName: schoolMap[item.schoolID] ?? `School-${item.schoolID}`,
            SchoolName:item.schoolName,
            Name: item.name,
            RegNo: item.regNo,
            Driver: item.driver,
            AssistantName: item.assistantName,
            AssistantMobNo: item.assistantMobNo,
            OtherDetails: item.otherDetails,
            MorningStartTime: item.morningStartTime,
            EveningStartTime: item.eveningStartTime,
            DistanceCostPerKM: item.distanceCostPerKM,
            MaxCapacity: item.maxCapacity,
            Description:item.Description,
            AcademicYearName:item.academicYearName,
            IsActive: isActive
          };
          this.isViewModalOpen = true;
        }

        if (mode === 'edit') {
          this.isViewMode = false;
          this.SyllabusForm.patchValue({
            ID: item.id,
            // SchoolName: schoolMap[item.schoolID] ?? `School-${item.schoolID}`,
            SchoolName:item.schoolName,
            Name: item.name,
            RegNo: item.regNo,
            Driver: item.driver,
            AssistantName: item.assistantName,
            AssistantMobNo: item.assistantMobNo,
            OtherDetails: item.otherDetails,
            MorningStartTime: item.morningStartTime,
            EveningStartTime: item.eveningStartTime,
            DistanceCostPerKM: item.distanceCostPerKM,
            MaxCapacity: item.maxCapacity,
            Description:item.Description
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

  UpdateSyllabus(){
    if(this.SyllabusForm.invalid){
      this.SyllabusForm.markAllAsTouched();
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        ID:this.SyllabusForm.get('ID')?.value || '',
        Name: this.SyllabusForm.get('Name')?.value || '',
        RegNo: this.SyllabusForm.get('RegNo')?.value || '',
        Driver: this.SyllabusForm.get('Driver')?.value || '',
        AssistantName: this.SyllabusForm.get('AssistantName')?.value || '',
        AssistantMobNo: this.SyllabusForm.get('AssistantMobNo')?.value || '',
        OtherDetails: this.SyllabusForm.get('OtherDetails')?.value || '',
        MorningStartTime: this.SyllabusForm.get('MorningStartTime')?.value || '',
        EveningStartTime: this.SyllabusForm.get('EveningStartTime')?.value || '',
        DistanceCostPerKM: this.SyllabusForm.get('DistanceCostPerKM')?.value || '',
        MaxCapacity: this.SyllabusForm.get('MaxCapacity')?.value || '',
        Description: this.SyllabusForm.get('Description')?.value || '',
        IsActive:IsActiveStatusNumeric,
        AcademicYear: this.SyllabusForm.get('AcademicYear')?.value,

        Flag: '5'
      };

      this.apiurl.post("Tbl_Bus_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            this.isModalOpen = true;
            this.AminityInsStatus = "Bus Details Updated!";
            this.SyllabusForm.reset();
            this.SyllabusForm.markAsPristine();
          }
        },
        error: (error) => {
          this.AminityInsStatus = "Error Updating Bus.";
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
    this.ViewSyllabusClicked=true;
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
}
