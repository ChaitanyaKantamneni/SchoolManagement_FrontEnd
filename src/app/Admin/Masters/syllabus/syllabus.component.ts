import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent  } from '../../../shared/base-crud.component';


@Component({
  selector: 'app-syllabus',
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './syllabus.component.html',
  styleUrl: './syllabus.component.css'
})
export class SyllabusComponent extends BasePermissionComponent  {
  pageName = 'Syllabus';

  constructor(
    router: Router,
    private apiurl: ApiServiceService,
    menuService: MenuServiceService
  ) {
    super(menuService, router);
  }

  ngOnInit(): void {
    this.checkViewPermission();
    this.FetchSyllabusList();
  };

  IsAddNewClicked:boolean=false;
  IsActiveStatus:boolean=false;
  ViewSyllabusClicked:boolean=false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  SyllabusList: any[] =[];
  AminityInsStatus: any = '';
  isModalOpen = false;
  SyllabusCount: number = 0;
  ActiveUserId:string=localStorage.getItem('email')?.toString() || '';

  // constructor(protected router: Router,private apiurl:ApiServiceService,protected menuService: MenuServiceService) {}

  // ngOnInit(): void {
  //   this.FetchSyllabusList();
  // };

  SyllabusForm: any = new FormGroup({
    ID: new FormControl(),
    Name: new FormControl(),
    AvailableFrom:new FormControl(),
    Description: new FormControl()
  });

  getPaginatedSyllabusLists() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.ListedSyllabusList.slice(start, start + this.pageSize);
  };

  get ListedSyllabusList() {
    return this.SyllabusList.filter(Syllabus =>
      Syllabus.Name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  };

  AddNewClicked(){
    this.SyllabusForm.reset();
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewSyllabusClicked=false;
  };

  SubmitSyllabus(){
    if(this.SyllabusForm.invalid){
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        Name: this.SyllabusForm.get('Name')?.value,
        AvailableFrom: this.SyllabusForm.get('AvailableFrom')?.value,
        Description: this.SyllabusForm.get('Description')?.value,
        IsActive:IsActiveStatusNumeric,
        Flag: '1'
      };

      this.apiurl.post("Tbl_Syllabus_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            // this.AminityInsStatus = response.status;
            this.isModalOpen = true;
            this.AminityInsStatus = "Syllabus Details Submitted!";
            this.SyllabusForm.reset();
            this.SyllabusForm.markAsPristine();
          }
        },
        error: (error) => {
          this.AminityInsStatus = "Error Updating Syllabus.";
          this.isModalOpen = true;
        },
        complete: () => {
        }
      });
    }
  };

  FetchSyllabusList() {
    const requestData = { Flag: '3' };

    this.apiurl.post<any>('Tbl_Syllabus_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.SyllabusList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.name,
                AvailableFrom: this.formatDateDDMMYYYY(item.availableFrom),
                IsActive: isActiveString
              };
            });
            this.SyllabusCount = this.SyllabusList.length;
            console.log('this.SyllabusList',this.SyllabusList.length);
          } else {
            this.SyllabusList = [];
            this.SyllabusCount = 0;
          }
        },
        (error) => {
          this.SyllabusList = [];
          this.SyllabusCount = 0;
        }
      );
  };

  FetchSyllabusDetByID(SyllabusID: string) {
    const data = {
      ID: SyllabusID,
      Flag: "4"
    };

    this.apiurl.post<any>("Tbl_Syllabus_CRUD_Operations", data).subscribe(
      (response: any) => {
        const item = response?.data?.[0];
        if (item) {
          const isActiveString = item.isActive === "1" ? true : false;
          this.SyllabusForm.patchValue({
            ID: item.id,
            Name: item.name,
            AvailableFrom: this.formatDateYYYYMMDD(item.availableFrom),
            Description: item.description
          });
          this.IsActiveStatus = isActiveString;
        } else {
          this.SyllabusForm.reset();
        }

        this.IsAddNewClicked=true;
      },
      error => {
      }
    );
  };

  UpdateSyllabus(){
    if(this.SyllabusForm.invalid){
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        ID:this.SyllabusForm.get('ID')?.value || '',
        Name: this.SyllabusForm.get('Name')?.value || '',
        AvailableFrom: this.SyllabusForm.get('AvailableFrom')?.value || '',
        Description: this.SyllabusForm.get('Description')?.value || '',
        IsActive:IsActiveStatusNumeric,
        Flag: '5'
      };

      console.log('data',data);
      this.apiurl.post("Tbl_Syllabus_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            // this.AminityInsStatus = response.status;
            this.isModalOpen = true;
            this.AminityInsStatus = "Syllabus Details Updated!";
            this.SyllabusForm.reset();
            this.SyllabusForm.markAsPristine();
          }
        },
        error: (error) => {
          this.AminityInsStatus = "Error Updating Syllabus.";
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

  editreview(SyllabusID: string): void {
    this.FetchSyllabusDetByID(SyllabusID);
    this.ViewSyllabusClicked=true;
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
    this.getPaginatedSyllabusLists();
  };

  copyTable() {
    const headers = ['SI.No', 'Name', 'Available From', 'Status'];

    const colWidths = headers.map((h, i) => {
      const dataLengths = this.ListedSyllabusList.map((c, idx) => {
        if (i === 0) return (idx + 1).toString().length;
        if (i === 1) return c.Name.length;
        if (i === 2) return c.AvailableFrom.length;
        if (i === 3) return c.IsActive.length;
        return 0;
      });
      return Math.max(h.length, ...dataLengths);
    });

    let tableText = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ') + '\n';
    tableText += colWidths.map(w => '-'.repeat(w)).join('-|-') + '\n';

    this.ListedSyllabusList.forEach((c, i) => {
      const row = [
        (i + 1).toString().padEnd(colWidths[0]),
        c.Name.padEnd(colWidths[1]),
        c.AvailableFrom.padEnd(colWidths[2]),
        c.IsActive.padEnd(colWidths[3])
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
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(
        this.ListedSyllabusList.map((c, i) => ({
          'SI.No': i + 1,
          Name: c.Name,
          'Available From': c.AvailableFrom,
          Status: c.IsActive
        }))
      );
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'SyllabusList.xlsx';
      a.click();
    });
  };

  // exportToExcel() {
  //   import('xlsx').then((XLSX) => {

  //     // Step 1 — Convert list to JSON for Excel
  //     const excelData = this.ListedSyllabusList.map((c, i) => ({
  //       'SI.No': i + 1,
  //       Name: c.Name,
  //       'Available From': c.AvailableFrom,
  //       Status: c.IsActive
  //     }));

  //     const worksheet = XLSX.utils.json_to_sheet(excelData);

  //     // Step 2 — Auto Adjust Column Widths
  //     const columnWidths = Object.keys(excelData[0]).map(key => ({
  //       wch: Math.max(
  //         key.length,
  //         ...excelData.map(row => (row[key] ? row[key].toString().length : 0))
  //       ) + 2 // padding
  //     }));

  //     worksheet['!cols'] = columnWidths;

  //     // Step 3 — Create workbook
  //     const workbook = {
  //       Sheets: { data: worksheet },
  //       SheetNames: ['data'],
  //     };

  //     // Step 4 — Export
  //     const excelBuffer = XLSX.write(workbook, {
  //       bookType: 'xlsx',
  //       type: 'array'
  //     });

  //     const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  //     const link = document.createElement('a');
  //     link.href = URL.createObjectURL(blob);
  //     link.download = 'SyllabusList.xlsx';
  //     link.click();
  //   });
  // };



  printTable() {
    const tableElement = document.getElementById('classTable');
    if (!tableElement) return;

    const cloneTable = tableElement.cloneNode(true) as HTMLTableElement;

    const ths = cloneTable.querySelectorAll('thead th');
    if (ths.length > 0) {
      ths[0].remove(); // remove hidden ID
      ths[ths.length - 1].remove(); // remove Actions
    }

    const rows = cloneTable.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length > 0) {
        cells[0].remove(); // remove hidden ID
        cells[cells.length - 1].remove(); // remove Actions
      }
    });
    const popupWin = window.open('', '_blank', 'width=800,height=600');
    popupWin?.document.write(`
      <html>
        <head>
          <title>Print Class List</title>
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
    this.FetchSyllabusList();
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
    return Math.ceil(this.SyllabusCount / this.pageSize);  // Calculate total pages based on page size
  };
}
