import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';

@Component({
  selector: 'app-staff',
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.css'
})
export class StaffComponent {
  IsAddNewClicked:boolean=false;
  IsActiveStatus:boolean=false;
  ViewStaffClicked:boolean=false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  StaffList: any[] =[];
  StaffTypeList:any[]=[];
  AminityInsStatus: any = '';
  isModalOpen = false;
  StaffCount: number = 0;
  ActiveUserId:string=localStorage.getItem('email')?.toString() || '';

  constructor(private router: Router,private apiurl:ApiServiceService,private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.FetchRoleList();
    this.FetchStaffList();
  };

  StaffForm: any = new FormGroup({
    ID: new FormControl(),
    StaffType: new FormControl([]),
    FirstName: new FormControl(),
    MiddleName:new FormControl(),
    LastName: new FormControl(),
    MobileNumber: new FormControl(),
    Email: new FormControl(),
    DateOfBirth:new FormControl(),
    Qualification: new FormControl()
  });

  getPaginatedStaffLists() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.ListedStaffList.slice(start, start + this.pageSize);
  };

  get ListedStaffList() {
    return this.StaffList.filter(Staff =>
      Staff.Name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  };

  // AddNewClicked(){
  //   this.selectedCategories = [];
  //   this.StaffForm.reset();
  //   // this.StaffForm.get('Class')?.patchValue('0');
  //   this.IsAddNewClicked=!this.IsAddNewClicked;
  //   this.IsActiveStatus=true;
  //   this.ViewStaffClicked=false;
  // };

  AddNewClicked() {
    this.selectedCategories = [];
    this.FetchStaffList();
    this.StaffForm.reset();
    this.StaffForm.get('StaffType')?.setValue([]);
    this.IsActiveStatus = true;
    this.ViewStaffClicked = false;
    this.dropdownOpen = false;
    this.cdr.detectChanges();
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewStaffClicked=false;
  };

  SubmitStaff(){
    if(this.StaffForm.invalid){
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
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

  FetchStaffList() {
    const requestData = { Flag: '3' };

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
                Name: item.firstName + ' ' + item.middleName + ' ' + item.lastName,
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
            console.log('this.StaffList', this.StaffList);  // Log the StaffList to check if the transformation worked
            this.StaffCount = this.StaffList.length;
          } else {
            this.StaffList = [];
            this.StaffCount = 0;
          }
        },
        (error) => {
          this.StaffList = [];
          this.StaffCount = 0;
        }
      );
  };

  FetchStaffDetByID(StaffID: string) {
    const data = {
      ID: StaffID,
      Flag: "4"
    };

    this.apiurl.post<any>("Tbl_Staff_CRUD_Operations", data).subscribe(
      (response: any) => {
        const item = response?.data?.[0];
        if (item) {
          const isActiveString = item.isActive === "1" ? true : false;
          console.log('isActiveString:', isActiveString);
          this.selectedCategories = item.staffType ? item.staffType.split(',').map((id: string) => id.trim()) : [];
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
          });
          this.IsActiveStatus = isActiveString;
        } else {
          this.StaffForm.reset();
        }

        this.IsAddNewClicked=true;
      },
      error => {
      }
    );
  };

  UpdateStaff(){
    if(this.StaffForm.invalid){
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        StaffType: this.StaffForm.get('StaffType')?.value,
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

  editreview(StaffID: string): void {
    this.FetchStaffDetByID(StaffID);
    this.ViewStaffClicked=true;
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
    this.getPaginatedStaffLists();
  };

  copyTable() {
    const headers = ['SI.No', 'Staff Type', 'Name', 'Email', 'MobileNumber', 'Status'];

    const colWidths = headers.map((h, i) => {
      const dataLengths = this.ListedStaffList.map((c, idx) => {
        switch(i) {
          case 0: return ((idx + 1).toString().length);
          case 1: return (this.getSyllabusName(c.StaffType)?.length || 0);
          case 2: return (c.Name?.length || 0);
          case 3: return (c.Email?.length || 0);
          case 4: return (c.MobileNumber?.length || 0);
          case 5: return (c.IsActive?.length || 0);
          default: return 0;
        }
      });
      return Math.max(h.length, ...dataLengths);
    });

    let tableText = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ') + '\n';
    tableText += colWidths.map(w => '-'.repeat(w)).join('-|-') + '\n';

    this.ListedStaffList.forEach((c, i) => {
      const row = [
        (i + 1).toString().padEnd(colWidths[0]),
        this.getSyllabusName(c.StaffType).padEnd(colWidths[1]),
        c.Name.padEnd(colWidths[2]),
        c.Email.padEnd(colWidths[3]),
        c.MobileNumber.padEnd(colWidths[4]),
        c.IsActive.padEnd(colWidths[5])
      ];
      tableText += row.join(' | ') + '\n';
    });

    const temp = document.createElement('textarea');
    temp.value = tableText;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);

    alert('Table copied! Works in Notepad, Word, and Excel.');
  };

  exportToExcel() {
    import('xlsx').then((XLSX) => {
      const data = this.ListedStaffList.map((c, i) => ({
        'SI.No': i + 1,
        'Staff Type': this.getSyllabusName(c.StaffType),
        'Name': c.Name,
        'Email': c.Email,
        'MobileNumber': c.MobileNumber,
        'Status': c.IsActive
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'StaffList');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'StaffList.xlsx';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  };

  printTable() {
    const tableElement = document.getElementById('classTable');
    if (!tableElement) return;

    const cloneTable = tableElement.cloneNode(true) as HTMLTableElement;

    const ths = cloneTable.querySelectorAll('thead th');
    if (ths.length > 0) {
      ths[0].remove(); // remove hidden Academic Year ID
      ths[ths.length - 1].remove(); // remove Actions
    }

    const rows = cloneTable.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length > 0) {
        cells[0].remove(); // remove hidden Academic Year ID
        cells[cells.length - 1].remove(); // remove Actions
      }
    });

    const popupWin = window.open('', '_blank', 'width=800,height=600');
    popupWin?.document.write(`
      <html>
        <head>
          <title>Print Staff List</title>
          <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>
          ${cloneTable.outerHTML}
        </body>
      </html>
    `);
    popupWin?.document.close();
    popupWin?.print();
  };

  closeModal() {
    this.isModalOpen = false;
  };

  handleOk() {
    this.isModalOpen = false;
    this.FetchStaffList();
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
    return Math.ceil(this.StaffCount / this.pageSize);  // Calculate total pages based on page size
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

    formData.append('FirstName', this.StaffForm.get('FirstName')?.value ?? '');
    formData.append('LastName', this.StaffForm.get('LastName')?.value ?? '');
    formData.append('MobileNo', this.StaffForm.get('MobileNumber')?.value ?? '');
    formData.append('Email', this.StaffForm.get('Email')?.value ?? '');
    formData.append('RollId', this.StaffForm.get('StaffType')?.value.join(','));
    formData.append('Password', 'Welcome@2025');
    formData.append('IsActive', IsActiveStatusNumeric);
    formData.append('Flag', '1');

  // Optional: if you have files
  // this.selectedFiles.forEach(file => {
  //   formData.append('files', file);
  // });
      // const data = {
      //   FirstName: this.StaffForm.get('FirstName')?.value,
      //   LastName: this.StaffForm.get('LastName')?.value,
      //   MobileNo: this.StaffForm.get('MobileNumber')?.value,
      //   Email: this.StaffForm.get('Email')?.value,
      //   RollId:this.StaffForm.get('StaffType')?.value.join(','),
      //   Password:'Welcome@2025',
      //   IsActive:IsActiveStatusNumeric,
      //   Flag: '1'
      // };

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
