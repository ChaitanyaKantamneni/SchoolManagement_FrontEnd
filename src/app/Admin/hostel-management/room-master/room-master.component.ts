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
import { RoomMasterService } from './room-master.service';
import { RoomMaster } from './room-master.model';

@Component({
  selector: 'app-room-master',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './room-master.component.html',
  styleUrls: ['./room-master.component.css']
})
export class RoomMasterComponent extends BasePermissionComponent implements OnInit {
  pageName = 'Room Master';

  IsAddNewClicked = false;
  IsActiveStatus = false;
  ViewRoomClicked = false;

  currentPage = 1;
  pageSize = 5;
  visiblePageCount = 3;
  searchQuery = '';
  private searchTimer: any;
  private readonly SEARCH_MIN_LENGTH = 3;
  private readonly SEARCH_DEBOUNCE = 300;

  RoomList: any[] = [];
  RoomCount = 0;
  ActiveRoomsCount = 0;
  TotalBedCapacity = 0;
  TotalAvailableBeds = 0;

  isViewMode = false;
  viewRoom: any = null;
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
  hostelList: any[] = [];
  
  selectedSchoolID = '';
  AdminselectedSchoolID = '';
  SchoolSelectionChange = false;

  RoomForm = new FormGroup({
    ID: new FormControl(),
    RoomNumber: new FormControl('', Validators.required),
    BedCapacity: new FormControl(0, [Validators.required, Validators.min(0)]),
    HostelID: new FormControl('0', [Validators.required, Validators.min(1)]),
    AcademicYear: new FormControl('0', [Validators.required, Validators.min(1)]),
    Occupied: new FormControl(false),
    Remarks: new FormControl(''),
    School: new FormControl('0')
  });

  constructor(
    router: Router,
    public loader: LoaderService,
    private apiurl: ApiServiceService,
    private roomService: RoomMasterService,
    menuService: MenuServiceService
  ) {
    super(menuService, router);
  }

  ngOnInit(): void {
    this.checkViewPermission();
    this.SchoolSelectionChange = false;
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
            ID: item.id || item.ID,
            Name: item.name || item.Name
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
            ID: item.id || item.ID,
            Name: item.name || item.Name
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

  FetchHostelsList(schoolId: string, academicYearId?: string) {
    const requestData: any = { SchoolID: schoolId || '', Flag: '3' };
    if (academicYearId && academicYearId !== '0') {
      requestData.AcademicYear = academicYearId;
    }

    this.apiurl.post<any>('Tbl_HostelMaster_CRUD_Operations', requestData).subscribe({
      next: (response: any) => {
        if (response && Array.isArray(response.data)) {
          this.hostelList = response.data.map((item: any) => ({
            ID: item.id || item.ID,
            HostelName: item.hostelName || item.HostelName,
            BedCapacity: item.bedCapacity || item.BedCapacity || 0
          }));
        } else {
          this.hostelList = [];
        }
      },
      error: () => {
        this.hostelList = [];
      }
    });
  }

  FetchRoomCount(isSearch: boolean) {
    let SchoolIdSelected = '';
    if (this.SchoolSelectionChange || this.selectedSchoolID) {
      SchoolIdSelected = this.selectedSchoolID.trim();
    }

    const payload: any = {
      Flag: isSearch ? '8' : '6',
      SchoolID: SchoolIdSelected || null
    };

    if (isSearch) {
      payload.RoomNumber = this.searchQuery.trim();
    }

    return this.roomService.crudOperations(payload);
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

    this.FetchRoomCount(isSearch).subscribe({
      next: (countResp: any) => {
        this.RoomCount = countResp?.data?.[0]?.totalcount ?? 0;

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

        if (isSearch) {
          payload.RoomNumber = this.searchQuery.trim();
        }

        this.roomService.crudOperations(payload).subscribe({
          next: (response: any) => {
            const data = response?.data || [];
            this.mapRooms(response);

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
            this.RoomList = [];
            this.loader.hide();
          }
        });
      },
      error: () => {
        this.RoomList = [];
        this.RoomCount = 0;
        this.loader.hide();
      }
    });
  }

  mapRooms(response: any) {
    const data = response?.data || [];
    this.ActiveRoomsCount = 0;
    this.TotalBedCapacity = 0;
    this.TotalAvailableBeds = 0;

    this.RoomList = data.map((item: any) => {
      const isActive = item.isActive === '1' || item.isActive === 1 || item.IsActive === '1' || item.isActive === 'True' || item.isActive === 'true' || item.isActive === true || item.IsActive === 'True' || item.IsActive === true;
      const bedCap = Number(item.bedCapacity || item.BedCapacity || 0);
      const availBeds = Number(item.availableBeds || item.AvailableBeds || 0);
      const occBeds = Number(item.occupiedBeds || item.OccupiedBeds || 0);
      const isOccupiedFlag = item.occupied === '1' || item.occupied === 1 || item.Occupied === '1' || item.occupied === true || item.Occupied === true;

      if (isActive) {
        this.ActiveRoomsCount++;
        this.TotalBedCapacity += bedCap;
        this.TotalAvailableBeds += availBeds;
      }

      return {
        ID: item.id || item.ID,
        SchoolID: item.schoolID || item.SchoolID,
        AcademicYear: item.academicYear || item.AcademicYear,
        HostelID: item.hostelID || item.HostelID,
        RoomNumber: item.roomNumber || item.RoomNumber,
        BedCapacity: bedCap,
        Occupied: isOccupiedFlag,
        Remarks: item.remarks || item.Remarks,
        HostelName: item.hostelName || item.HostelName,
        SchoolName: item.schoolName || item.SchoolName,
        AcademicYearName: item.academicYearName || item.AcademicYearName,
        OccupiedBeds: occBeds,
        AvailableBeds: availBeds,
        IsActive: isActive ? 'Active' : 'InActive'
      };
    });
  }

  AddNewClicked() {
    if (this.isAdmin) {
      this.RoomForm.get('School')?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      this.RoomForm.get('School')?.clearValidators();
      const userSchoolId = sessionStorage.getItem('SchoolID')?.toString() || '';
      this.FetchAcademicYearsList(userSchoolId);
      this.FetchHostelsList(userSchoolId);
    }
    this.RoomForm.reset();
    this.RoomForm.get('School')?.patchValue('0');
    this.RoomForm.get('AcademicYear')?.patchValue('0');
    this.RoomForm.get('HostelID')?.patchValue('0');
    this.RoomForm.get('RoomNumber')?.patchValue('');
    this.RoomForm.get('BedCapacity')?.patchValue(0);
    this.RoomForm.get('Occupied')?.patchValue(false);
    this.RoomForm.get('Remarks')?.patchValue('');

    this.IsAddNewClicked = !this.IsAddNewClicked;
    this.IsActiveStatus = true;
    this.ViewRoomClicked = false;
    this.RoomForm.get('BedCapacity')?.enable(); // Ensure it's enabled for fresh start if needed, but will be disabled on hostel select
  }

  SubmitRoom() {
    if (this.RoomForm.invalid) {
      this.RoomForm.markAllAsTouched();
      return;
    }

    // Duplicate check before submit
    const roomNo = this.RoomForm.get('RoomNumber')?.value?.trim();
    const hostelId = this.RoomForm.get('HostelID')?.value;
    const schoolId = this.isAdmin ? this.RoomForm.get('School')?.value : sessionStorage.getItem('SchoolID');

    const checkPayload = {
      Flag: '8', // Search flag to check existence
      RoomNumber: roomNo,
      HostelID: hostelId,
      SchoolID: schoolId
    };

    this.roomService.crudOperations(checkPayload).subscribe({
      next: (checkResp: any) => {
        // If it's a new entry (no ID) and we found a match, it's a duplicate.
        // If it's an edit, we should check if the found ID is different from current ID.
        const existingRoom = checkResp?.data?.[0];
        const currentID = this.RoomForm.get('ID')?.value;
        
        if (existingRoom && (!currentID || String(existingRoom.ID || existingRoom.id) !== String(currentID))) {
          this.AminityInsStatus = 'Room Number already exists in this Hostel. Please use a unique number.';
          this.isModalOpen = true;
          return;
        }

        // Proceed with submission if not duplicate
        const payload: any = {
          RoomNumber: roomNo,
          BedCapacity: (this.RoomForm.getRawValue().BedCapacity || 0).toString(),
          HostelID: hostelId,
          AcademicYear: this.RoomForm.get('AcademicYear')?.value,
          Occupied: this.RoomForm.get('Occupied')?.value ? '1' : '0',
          Remarks: this.RoomForm.get('Remarks')?.value?.trim() || '',
          IsActive: this.IsActiveStatus ? '1' : '0',
          Flag: '1',
          SchoolID: schoolId
        };

        this.roomService.crudOperations(payload).subscribe({
          next: (response: any) => {
            this.isModalOpen = true;
            this.AminityInsStatus = 'Room Details Submitted Successfully!';
            this.currentPage = 1;
            this.pageCursors = [];
            this.RoomForm.reset();
            this.FetchInitialData();
            this.IsAddNewClicked = false;
          },
          error: (err: any) => {
            this.AminityInsStatus = err.error?.message || 'Unexpected error occurred while saving room.';
            this.isModalOpen = true;
          }
        });
      },
      error: () => {
        this.AminityInsStatus = 'Error validating room number.';
        this.isModalOpen = true;
      }
    });
  }

  FetchRoomDetByID(RoomID: string, mode: 'view' | 'edit') {
    const payload: any = {
      ID: RoomID,
      Flag: '4'
    };

    this.roomService.crudOperations(payload).subscribe({
      next: (response: any) => {
        const item = response?.data?.[0];
        if (!item) {
          this.RoomForm.reset();
          this.viewRoom = null;
          return;
        }

        const isActive = item.isActive === '1' || item.isActive === 1 || item.IsActive === '1' || item.isActive === 'True' || item.isActive === 'true' || item.isActive === true || item.IsActive === 'True' || item.IsActive === true;
        const isOccupiedFlag = item.occupied === '1' || item.occupied === 1 || item.Occupied === '1' || item.occupied === true || item.Occupied === true;

        if (mode === 'view') {
          this.isViewMode = true;
          this.viewRoom = {
            ID: item.id || item.ID,
            RoomNumber: item.roomNumber || item.RoomNumber,
            BedCapacity: item.bedCapacity || item.BedCapacity,
            Occupied: isOccupiedFlag,
            Remarks: item.remarks || item.Remarks,
            HostelName: item.hostelName || item.HostelName,
            SchoolName: item.schoolName || item.SchoolName,
            AcademicYearName: item.academicYearName || item.AcademicYearName,
            OccupiedBeds: item.occupiedBeds || item.OccupiedBeds || 0,
            AvailableBeds: item.availableBeds || item.AvailableBeds || 0,
            IsActive: isActive
          };
          this.isViewModalOpen = true;
        }

        if (mode === 'edit') {
          this.isViewMode = false;
          const schoolId = item.schoolID || item.SchoolID;
          if (schoolId) {
            this.FetchAcademicYearsList(schoolId);
            this.FetchHostelsList(schoolId);
          }

          this.RoomForm.patchValue({
            ID: item.id || item.ID,
            RoomNumber: item.roomNumber || item.RoomNumber,
            BedCapacity: item.bedCapacity || item.BedCapacity,
            HostelID: item.hostelID || item.HostelID,
            AcademicYear: item.academicYear || item.AcademicYear,
            Occupied: isOccupiedFlag,
            Remarks: item.remarks || item.Remarks,
            School: schoolId
          });

          // Sync BedCapacity from Hostel Metadata
          const selectedHostel = this.hostelList.find(h => String(h.ID) === String(item.hostelID || item.HostelID));
          if (selectedHostel) {
            this.RoomForm.patchValue({ BedCapacity: selectedHostel.BedCapacity });
          }

          if (this.isAdmin) {
            this.AdminselectedSchoolID = schoolId;
          }

          this.IsActiveStatus = isActive;
          this.IsAddNewClicked = true;
          this.ViewRoomClicked = true;
          this.RoomForm.get('BedCapacity')?.disable(); // Block field in edit mode
        }
      },
      error: (err) => {
        console.error('Error fetching room details by id', err);
      }
    });
  }

  UpdateRoom() {
    if (this.RoomForm.invalid) {
      this.RoomForm.markAllAsTouched();
      return;
    }

    const payload: any = {
      ID: this.RoomForm.get('ID')?.value?.toString(),
      RoomNumber: this.RoomForm.get('RoomNumber')?.value?.trim(),
      BedCapacity: (this.RoomForm.getRawValue().BedCapacity || 0).toString(),
      HostelID: this.RoomForm.get('HostelID')?.value,
      AcademicYear: this.RoomForm.get('AcademicYear')?.value,
      Occupied: this.RoomForm.get('Occupied')?.value ? '1' : '0',
      Remarks: this.RoomForm.get('Remarks')?.value?.trim() || '',
      IsActive: this.IsActiveStatus ? '1' : '0',
      Flag: '5'
    };

    if (this.isAdmin) {
      payload.SchoolID = this.RoomForm.get('School')?.value;
    }

    this.roomService.crudOperations(payload).subscribe({
      next: () => {
        this.isModalOpen = true;
        this.AminityInsStatus = 'Room Details Updated Successfully!';
        this.currentPage = 1;
        this.pageCursors = [];
        this.RoomForm.reset();
        this.FetchInitialData();
        this.IsAddNewClicked = false;
      },
      error: (err: any) => {
        if (err.status === 400 && err.error?.message) {
          this.AminityInsStatus = err.error.message;
        } else if (err.status === 500 && err.error?.message) {
          this.AminityInsStatus = err.error.message;
        } else {
          this.AminityInsStatus = 'Unexpected error occurred while updating room.';
        }
        this.isModalOpen = true;
      }
    });
  }

  editreview(RoomID: string) {
    if (this.isAdmin) {
      this.RoomForm.get('School')?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      this.RoomForm.get('School')?.clearValidators();
    }
    this.editclicked = true;
    this.FetchRoomDetByID(RoomID, 'edit');
  }

  viewReview(RoomID: string) {
    this.FetchRoomDetByID(RoomID, 'view');
  }

  toggleChange() {
    this.IsActiveStatus = !this.IsActiveStatus;
  }

  onAdminSchoolChange(event: Event) {
    this.academicYearList = [];
    this.hostelList = [];
    this.RoomForm.get('AcademicYear')?.patchValue('0');
    this.RoomForm.get('HostelID')?.patchValue('0');
    const target = event.target as HTMLSelectElement;
    const schoolID = target.value;
    if (schoolID === '0') {
      this.AdminselectedSchoolID = '';
    } else {
      this.AdminselectedSchoolID = schoolID;
      this.FetchAcademicYearsList(schoolID);
    }
  }

  onAcademicYearChange(event: Event) {
    this.hostelList = [];
    this.RoomForm.get('HostelID')?.patchValue('0');
    const target = event.target as HTMLSelectElement;
    const academicYearID = target.value;
    const schoolID = this.isAdmin ? this.RoomForm.get('School')?.value : sessionStorage.getItem('SchoolID');

    if (schoolID && schoolID !== '0' && academicYearID && academicYearID !== '0') {
      this.FetchHostelsList(schoolID, academicYearID);
    }
  }

  onHostelChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const hostelID = target.value;
    const selectedHostel = this.hostelList.find(h => String(h.ID) === String(hostelID));
    if (selectedHostel) {
      this.RoomForm.patchValue({ BedCapacity: selectedHostel.BedCapacity });
      this.RoomForm.get('BedCapacity')?.disable(); // Block the field
    } else {
      this.RoomForm.get('BedCapacity')?.enable();
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
    return Math.ceil(this.RoomCount / this.pageSize);
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
      this.viewRoom = null;
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
    return this.RoomCount === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
  }

  pageEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.RoomCount);
  }
}
