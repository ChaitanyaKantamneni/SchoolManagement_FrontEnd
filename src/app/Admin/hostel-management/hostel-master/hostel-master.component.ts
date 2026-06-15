import { Component, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { LoaderService } from '../../../Services/loader.service';
import { HostelMasterService } from './hostel-master.service';
import { HostelMaster } from './hostel-master.model';

@Component({
  selector: 'app-hostel-master',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './hostel-master.component.html',
  styleUrls: ['./hostel-master.component.css']
})
export class HostelMasterComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Hostel Master';

  IsAddNewClicked = false;
  IsActiveStatus = false;
  ViewHostelClicked = false;

  currentPage = 1;
  pageSize = 5;
  visiblePageCount = 3;
  searchQuery = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;

  HostelList: any[] = [];
  HostelCount = 0;
  ActiveHostelsCount = 0;
  TotalBedCapacity = 0;

  isViewMode = false;
  viewHostel: any = null;
  AminityInsStatus = '';
  isModalOpen = false;
  isViewModalOpen = false;

  ActiveUserId = sessionStorage.getItem('email')?.toString() || '';
  roleId = sessionStorage.getItem('RollID');

  pageCursors: { lastCreatedDate: any; lastID: number }[] = [];
  lastCreatedDate: string | null = null;
  lastID: number | null = null;

  sortColumn = 'CreatedDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  editclicked = false;

  schoolList: any[] = [];
  academicYearList: any[] = [];
  selectedSchoolID = '';
  AdminselectedSchoolID = '';
  SchoolSelectionChange = false;
  selectedAcademicYearID = '';
  SchoolAcademicYearChange = false;
  AdminSelectedActiveAcademicYearID = sessionStorage.getItem('ActiveAcademicYearID') || '';

  HostelForm = new FormGroup({
    ID: new FormControl(),
    HostelName: new FormControl('', Validators.required),
    HostelType: new FormControl('', Validators.required),
    TotalRooms: new FormControl(0, [Validators.min(0)]),
    BedCapacity: new FormControl(0, [Validators.min(0)]),
    Address: new FormControl(''),
    Remarks: new FormControl(''),
    School: new FormControl('0'),
    AcademicYear: new FormControl(sessionStorage.getItem('ActiveAcademicYearID') || '0', [Validators.required, Validators.min(1)])
  });

  constructor(
    router: Router,
    public loader: LoaderService,
    private apiurl: ApiServiceService,
    private hostelService: HostelMasterService,
    menuService: MenuServiceService
  ) {
    super(menuService, router);
  }

  ngOnInit(): void {
    this.checkViewPermission();
    this.SchoolSelectionChange = false;
    if (!this.isAdmin) {
      this.HostelForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
    this.FetchSchoolsList();
    this.FetchInitialData();
  }

  protected override get isAdmin(): boolean {
    const role = sessionStorage.getItem('RollID') || localStorage.getItem('RollID');
    return role === '1';
  }

  FetchSchoolsList() {
    const requestData = { Flag: '2' };
    this.apiurl.post<any>('Tbl_SchoolDetails_CRUD', requestData).subscribe({
      next: (response: any) => {
        if (response && Array.isArray(response.data)) {
          this.schoolList = response.data.map((item: any) => ({
            ID: item.id,
            Name: item.name
          }));
        } else {
          this.schoolList = [];
        }
      },
      error: () => {
        this.schoolList = [];
      }
    });
  }

  FetchAcademicYearsList(schoolId: string) {
    const requestData = { SchoolID: schoolId || '', Flag: '2' };
    this.apiurl.post<any>('Tbl_AcademicYear_CRUD_Operations', requestData).subscribe({
      next: (response: any) => {
        if (response && Array.isArray(response.data)) {
          this.academicYearList = response.data.map((item: any) => ({
            ID: item.id,
            Name: item.name
          }));
        } else {
          this.academicYearList = [];
        }
      },
      error: () => {
        this.academicYearList = [];
      }
    });
  }

  FetchHostelCount(isSearch: boolean) {
    let SchoolIdSelected = '';
    if (this.SchoolSelectionChange || this.selectedSchoolID) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    const payload: any = {
      Flag: isSearch ? '8' : '6',
      SchoolID: SchoolIdSelected || null
    };

    if (!this.isAdmin) {
      payload.AcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
    }

    if (isSearch) {
      payload.HostelName = this.searchQuery.trim();
    }

    return this.hostelService.crudOperations(payload);
  }

  FetchInitialData(extra: any = {}) {
    const isSearch = !!this.searchQuery?.trim();
    const flag = isSearch ? '7' : '2';

    let SchoolIdSelected = '';
    if (this.SchoolSelectionChange || this.selectedSchoolID) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    const cursor = !extra.offset && this.currentPage > 1 ? this.pageCursors[this.currentPage - 2] || null : null;

    this.loader.show();

    this.FetchHostelCount(isSearch).subscribe({
      next: (countResp: any) => {
        this.HostelCount = countResp?.data?.[0]?.totalcount ?? 0;

        const payload: any = {
          Flag: flag,
          Limit: this.pageSize,
          SortColumn: this.sortColumn,
          SortDirection: this.sortDirection,
          LastCreatedDate: cursor?.lastCreatedDate ?? null,
          LastID: cursor?.lastID ?? null,
          SchoolID: SchoolIdSelected || null,
          ...extra
        };

        if (!this.isAdmin) {
          payload.AcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
        }

        if (isSearch) {
          payload.HostelName = this.searchQuery.trim();
        }

        this.hostelService.crudOperations(payload).subscribe({
          next: (response: any) => {
            const data = response?.data || [];
            this.mapHostels(response);

            if (data.length > 0 && !this.pageCursors[this.currentPage - 1]) {
              const lastRow = data[data.length - 1];
              this.pageCursors[this.currentPage - 1] = {
                lastCreatedDate: lastRow.createdDate || lastRow.CreatedDate,
                lastID: Number(lastRow.id || lastRow.ID)
              };
            }

            this.loader.hide();
          },
          error: () => {
            this.HostelList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.HostelList = [];
        this.HostelCount = 0;
        this.loader.hide();
      }
    });
  }

  mapHostels(response: any) {
    const data = response?.data || [];
    this.ActiveHostelsCount = 0;
    this.TotalBedCapacity = 0;

    this.HostelList = data.map((item: any) => {
      const isActive = item.isActive === '1' || item.isActive === 1 || item.IsActive === '1' || item.isActive === 'True' || item.isActive === 'true' || item.isActive === true || item.IsActive === 'True' || item.IsActive === true;
      const bedCap = Number(item.bedCapacity || item.BedCapacity || 0);

      if (isActive) {
        this.ActiveHostelsCount++;
        this.TotalBedCapacity += bedCap;
      }

      return {
        ID: item.id || item.ID,
        HostelName: item.hostelName || item.HostelName,
        HostelType: item.hostelType || item.HostelType,
        TotalRooms: item.totalRooms || item.TotalRooms || 0,
        BedCapacity: bedCap,
        Address: item.address || item.Address,
        Remarks: item.remarks || item.Remarks,
        SchoolName: item.schoolName || item.SchoolName,
        AcademicYearName: item.academicYearName || item.AcademicYearName,
        SchoolID: item.schoolID || item.SchoolID,
        AcademicYear: item.academicYear || item.AcademicYear,
        IsActive: isActive ? 'Active' : 'InActive'
      };
    });
  }

  AddNewClicked() {
    if (this.isAdmin) {
      this.HostelForm.get('School')?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      this.HostelForm.get('School')?.clearValidators();
      // Fetch Academic Years automatically for non-admin school context
      const userSchoolId = sessionStorage.getItem('SchoolID')?.toString() || '';
      this.FetchAcademicYearsList(userSchoolId);
    }
    this.HostelForm.reset();
    this.HostelForm.get('School')?.patchValue('0');
    this.HostelForm.get('AcademicYear')?.patchValue(sessionStorage.getItem('ActiveAcademicYearID') || '0');
    if (!this.isAdmin) {
      this.HostelForm.get('AcademicYear')?.disable({ emitEvent: false });
    }
    this.HostelForm.get('HostelType')?.patchValue('');
    this.HostelForm.get('TotalRooms')?.patchValue(0);
    this.HostelForm.get('BedCapacity')?.patchValue(0);

    this.IsAddNewClicked = !this.IsAddNewClicked;
    this.IsActiveStatus = true;
    this.ViewHostelClicked = false;
  }

  SubmitHostel() {
    if (this.HostelForm.invalid) {
      this.HostelForm.markAllAsTouched();
      return;
    }

    const payload: any = {
      HostelName: this.HostelForm.get('HostelName')?.value?.trim(),
      HostelType: this.HostelForm.get('HostelType')?.value,
      TotalRooms: (this.HostelForm.get('TotalRooms')?.value || 0).toString(),
      BedCapacity: (this.HostelForm.get('BedCapacity')?.value || 0).toString(),
      Address: this.HostelForm.get('Address')?.value?.trim() || '',
      Remarks: this.HostelForm.get('Remarks')?.value?.trim() || '',
      AcademicYear: this.HostelForm.get('AcademicYear')?.value,
      IsActive: this.IsActiveStatus ? '1' : '0',
      Flag: '1'
    };

    if (this.isAdmin) {
      payload.SchoolID = this.HostelForm.get('School')?.value;
    } else {
      payload.SchoolID = sessionStorage.getItem('SchoolID')?.toString() || '';
      payload.AcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
    }

    this.hostelService.crudOperations(payload).subscribe({
      next: (response: any) => {
        this.isModalOpen = true;
        this.AminityInsStatus = 'Hostel Details Submitted Successfully!';
        this.currentPage = 1;
        this.HostelForm.reset();
        this.HostelForm.get('AcademicYear')?.patchValue(sessionStorage.getItem('ActiveAcademicYearID') || '0');
        this.FetchInitialData();
        this.IsAddNewClicked = false;
      },
      error: (err: any) => {
        if (err.status === 400 && err.error?.message) {
          this.AminityInsStatus = err.error.message;
        } else if (err.status === 500 && err.error?.message) {
          this.AminityInsStatus = err.error.message;
        } else {
          this.AminityInsStatus = 'Unexpected error occurred while saving hostel.';
        }
        this.isModalOpen = true;
      }
    });
  }

  FetchHostelDetByID(HostelID: string, mode: 'view' | 'edit') {
    const payload: any = {
      ID: HostelID,
      Flag: '4'
    };

    this.hostelService.crudOperations(payload).subscribe({
      next: (response: any) => {
        const item = response?.data?.[0];
        if (!item) {
          this.HostelForm.reset();
          this.viewHostel = null;
          return;
        }

        const isActive = item.isActive === '1' || item.isActive === 1 || item.IsActive === '1' || item.isActive === 'True' || item.isActive === 'true' || item.isActive === true || item.IsActive === 'True' || item.IsActive === true;

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewHostel = {
            ID: item.id || item.ID,
            HostelName: item.hostelName || item.HostelName,
            HostelType: item.hostelType || item.HostelType,
            TotalRooms: item.totalRooms || item.TotalRooms,
            BedCapacity: item.bedCapacity || item.BedCapacity,
            Address: item.address || item.Address,
            Remarks: item.remarks || item.Remarks,
            SchoolName: item.schoolName || item.SchoolName,
            AcademicYearName: item.academicYearName || item.AcademicYearName,
            IsActive: isActive
          };
          this.isViewModalOpen = true;
        }

        if (mode === 'edit') {
          this.isViewMode = false;
          const schoolId = item.schoolID || item.SchoolID;
          if (schoolId) {
            this.FetchAcademicYearsList(schoolId);
          }

          this.HostelForm.patchValue({
            ID: item.id || item.ID,
            HostelName: item.hostelName || item.HostelName,
            HostelType: item.hostelType || item.HostelType,
            TotalRooms: item.totalRooms || item.TotalRooms,
            BedCapacity: item.bedCapacity || item.BedCapacity,
            Address: item.address || item.Address,
            Remarks: item.remarks || item.Remarks,
            School: schoolId,
            AcademicYear: item.academicYear || item.AcademicYear
          });

          if (!this.isAdmin) {
            this.HostelForm.get('AcademicYear')?.disable({ emitEvent: false });
          }

          if (this.isAdmin) {
            this.AdminselectedSchoolID = schoolId;
          }

          this.IsActiveStatus = isActive;
          this.IsAddNewClicked = true;
          this.ViewHostelClicked = true;
        }
      },
      error: (err) => {
        console.error('Error fetching hostel details by id', err);
      }
    });
  }

  UpdateHostel() {
    if (this.HostelForm.invalid) {
      this.HostelForm.markAllAsTouched();
      return;
    }

    const payload: any = {
      ID: this.HostelForm.get('ID')?.value?.toString(),
      HostelName: this.HostelForm.get('HostelName')?.value?.trim(),
      HostelType: this.HostelForm.get('HostelType')?.value,
      TotalRooms: (this.HostelForm.get('TotalRooms')?.value || 0).toString(),
      BedCapacity: (this.HostelForm.get('BedCapacity')?.value || 0).toString(),
      Address: this.HostelForm.get('Address')?.value?.trim() || '',
      Remarks: this.HostelForm.get('Remarks')?.value?.trim() || '',
      AcademicYear: this.HostelForm.get('AcademicYear')?.value,
      IsActive: this.IsActiveStatus ? '1' : '0',
      Flag: '5'
    };

    if (this.isAdmin) {
      payload.SchoolID = this.HostelForm.get('School')?.value;
    } else {
      payload.SchoolID = sessionStorage.getItem('SchoolID')?.toString() || '';
      payload.AcademicYear = sessionStorage.getItem('ActiveAcademicYearID') || '';
    }

    this.hostelService.crudOperations(payload).subscribe({
      next: () => {
        this.isModalOpen = true;
        this.AminityInsStatus = 'Hostel Details Updated Successfully!';
        this.currentPage = 1;
        this.HostelForm.reset();
        this.HostelForm.get('AcademicYear')?.patchValue(sessionStorage.getItem('ActiveAcademicYearID') || '0');
        this.FetchInitialData();
        this.IsAddNewClicked = false;
      },
      error: (err: any) => {
        if (err.status === 400 && err.error?.message) {
          this.AminityInsStatus = err.error.message;
        } else if (err.status === 500 && err.error?.message) {
          this.AminityInsStatus = err.error.message;
        } else {
          this.AminityInsStatus = 'Unexpected error occurred while updating hostel.';
        }
        this.isModalOpen = true;
      }
    });
  }

  editreview(HostelID: string) {
    if (this.isAdmin) {
      this.HostelForm.get('School')?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      this.HostelForm.get('School')?.clearValidators();
    }
    this.editclicked = true;
    this.FetchHostelDetByID(HostelID, 'edit');
  }

  viewReview(HostelID: string) {
    this.FetchHostelDetByID(HostelID, 'view');
  }

  toggleChange() {
    this.IsActiveStatus = !this.IsActiveStatus;
  }

  onAdminSchoolChange(event: Event) {
    this.academicYearList = [];
    this.HostelForm.get('AcademicYear')?.patchValue(sessionStorage.getItem('ActiveAcademicYearID') || '0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if (schoolID === '0') {
      this.AdminselectedSchoolID = '';
    } else {
      this.AdminselectedSchoolID = schoolID;
      this.FetchAcademicYearsList(schoolID);
    }
  }

  onSchoolChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if (schoolID === '0') {
      this.selectedSchoolID = '';
    } else {
      this.selectedSchoolID = schoolID;
    }
    this.SchoolSelectionChange = true;
    this.currentPage = 1;
    this.pageCursors = [];
    this.FetchInitialData();
  }

  onSearchChange() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      const value = this.searchQuery?.trim() || '';
      if (value.length === 0) {
        this.currentPage = 1;
        this.pageSize = 5;
        this.visiblePageCount = 3;
        this.FetchInitialData();
        return;
      }
      if (value.length < this.SEARCH_MIN_LENGTH) {
        return;
      }
      this.currentPage = 1;
      this.pageSize = 5;
      this.visiblePageCount = 3;
      this.FetchInitialData();
    }, this.SEARCH_DEBOUNCE);
  }

  sort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }
    this.currentPage = 1;
    this.pageCursors = [];
    this.FetchInitialData();
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages()) {
      this.goToPage(this.currentPage + 1);
    }
  }

  goToPage(pageNumber: number) {
    const total = this.totalPages();
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > total) pageNumber = total;

    this.currentPage = pageNumber;

    const isBoundaryPage = pageNumber === 1 || pageNumber === total || !this.pageCursors[pageNumber - 2];
    if (isBoundaryPage) {
      const offset = (pageNumber - 1) * this.pageSize;
      this.FetchInitialData({ offset });
    } else {
      this.FetchInitialData();
    }
  }

  totalPages() {
    return Math.ceil(this.HostelCount / this.pageSize);
  }

  getVisiblePageNumbers() {
    const totalPages = this.totalPages();
    const pages = [];
    let start = Math.max(this.currentPage - Math.floor(this.visiblePageCount / 2), 1);
    let end = Math.min(start + this.visiblePageCount - 1, totalPages);
    if (end - start < this.visiblePageCount - 1) {
      start = Math.max(end - this.visiblePageCount + 1, 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  closeModal(type: 'view' | 'status') {
    if (type === 'view') {
      this.isViewModalOpen = false;
      this.viewHostel = null;
    }
    if (type === 'status') {
      this.isModalOpen = false;
    }
  }

  handleOk() {
    this.isModalOpen = false;
    this.FetchInitialData();
  }

  pageStartIndex(): number {
    return this.HostelCount === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
  }

  pageEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.HostelCount);
  }

  onRowsCountChange() {
    this.currentPage = 1;
    this.pageCursors = [];
    this.FetchInitialData();
  }
}
