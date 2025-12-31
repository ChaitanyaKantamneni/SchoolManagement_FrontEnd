import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';

@Component({
  selector: 'app-pages',
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './pages.component.html',
  styleUrl: './pages.component.css'
})
export class PagesComponent {
  IsAddNewClicked:boolean=false;
  IsActiveStatus:boolean=false;
  ViewPageClicked:boolean=false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  PageList: any[] =[];
  SyllabusList: any[] =[];
  AminityInsStatus: any = '';
  isModalOpen = false;
  PageCount: number = 0;
  ActiveUserId:string=localStorage.getItem('email')?.toString() || '';

  constructor(private router: Router,private apiurl:ApiServiceService) {}

  ngOnInit(): void {
    this.SyllabusList=[];
    this.FetchModuleList();
    this.FetchPageList();
  };

  PageForm: any = new FormGroup({
    ID: new FormControl(),
    Class: new FormControl(),
    Name: new FormControl(),
    Strength:new FormControl(),
    Description: new FormControl()
  });

  getPaginatedPageLists() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.ListedPageList.slice(start, start + this.pageSize);
  };

  get ListedPageList() {
    return this.PageList.filter(Page =>
      Page.Name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  };

  AddNewClicked(){
    this.PageForm.get('Class')?.patchValue('0');
    this.FetchModuleList();
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewPageClicked=false;
  };

  SubmitPage(){
    if(this.PageForm.invalid){
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        ModuleID: this.PageForm.get('Class')?.value,
        PageName: this.PageForm.get('Name')?.value,
        Description: this.PageForm.get('Description')?.value,
        IsActive:IsActiveStatusNumeric,
        Flag: '1'
      };

      this.apiurl.post("Tbl_Pages_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            // this.AminityInsStatus = response.status;
            this.isModalOpen = true;
            this.AminityInsStatus = "Page Details Submitted!";
            this.PageForm.reset();
            this.PageForm.markAsPristine();
          }
        },
        error: (error: any) => {
          if (error.status === 409) {
            this.AminityInsStatus = error.error?.Message || "Division name already exists";
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

  FetchPageList() {
    const requestData = { Flag: '2' };

    this.apiurl.post<any>('Tbl_Pages_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.PageList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Class: item.moduleID,
                Name: item.pageName,
                IsActive: isActiveString
              };
            });
            this.PageCount = this.PageList.length;
            console.log('this.PageList',this.PageList.length);
          } else {
            this.PageList = [];
            this.PageCount = 0;
          }
        },
        (error) => {
          this.PageList = [];
          this.PageCount = 0;
        }
      );
  };

  FetchPageDetByID(PageID: string) {
    const data = {
      ID: PageID,
      Flag: "3"
    };

    this.apiurl.post<any>("Tbl_Pages_CRUD_Operations", data).subscribe(
      (response: any) => {
        const item = response?.data?.[0];
        if (item) {
          const isActiveString = item.isActive === "1" ? true : false;
          this.PageForm.patchValue({
            ID: item.id,
            Class: item.moduleID,
            Name: item.pageName,
            Description: item.description
          });
          this.IsActiveStatus = isActiveString;
        } else {
          this.PageForm.reset();
        }

        this.IsAddNewClicked=true;
      },
      error => {
      }
    );
  };

  UpdatePage(){
    if(this.PageForm.invalid){
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        ID:this.PageForm.get('ID')?.value || '',
        ModuleID: this.PageForm.get('Class')?.value,
        PageName: this.PageForm.get('Name')?.value,
        Description: this.PageForm.get('Description')?.value,
        IsActive:IsActiveStatusNumeric,
        Flag: '4'
      };

      console.log('data',data);
      this.apiurl.post("Tbl_Pages_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            // this.AminityInsStatus = response.status;
            this.isModalOpen = true;
            this.AminityInsStatus = "Page Details Updated!";
            this.PageForm.reset();
            this.PageForm.markAsPristine();
          }
        },
        error: (error) => {
          this.AminityInsStatus = "Error Updating Page.";
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
            this.SyllabusList = response.data.map((item: any) => {
              return {
                ID: item.id,
                Name: item.moduleName
              };
            });
          } else {
            this.SyllabusList = [];
          }
        },
        (error) => {
          this.SyllabusList = [];
        }
      );
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

  editreview(PageID: string): void {
    this.SyllabusList=[];
    this.FetchModuleList();
    this.FetchPageDetByID(PageID);
    this.ViewPageClicked=true;
  };

  getSyllabusName(syllabusId: any): string {
    const syllabus = this.SyllabusList.find(s => s.ID === syllabusId);
    return syllabus ? syllabus.Name : 'N/A';
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
    this.getPaginatedPageLists();
  };

  copyTable() {
    const headers = ['SI.No', 'Class', 'Name', 'Strength', 'Status'];

    const colWidths = headers.map((h, i) => {
      const dataLengths = this.ListedPageList.map((c, idx) => {
        switch(i) {
          case 0: return (idx + 1).toString().length;
          case 1: return (this.getSyllabusName(c.Class)?.length || 0);
          case 2: return (c.Name?.length || 0);
          case 3: return (c.Strength?.length || 0);
          case 4: return (c.IsActive?.length || 0);
          default: return 0;
        }
      });
      return Math.max(h.length, ...dataLengths);
    });

    let tableText = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ') + '\n';
    tableText += colWidths.map(w => '-'.repeat(w)).join('-|-') + '\n';

    this.ListedPageList.forEach((c, i) => {
      const row = [
        (i + 1).toString().padEnd(colWidths[0]),
        this.getSyllabusName(c.Class).padEnd(colWidths[1]),
        c.Name.padEnd(colWidths[2]),
        c.Strength.padEnd(colWidths[3]),
        c.IsActive.padEnd(colWidths[4])
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
      const data = this.ListedPageList.map((c, i) => ({
        'SI.No': i + 1,
        'Class': this.getSyllabusName(c.Class),
        'Name': c.Name,
        'Strength': c.Strength,
        'Status': c.IsActive
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'PageList');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'PageList.xlsx';
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
          <title>Print Division List</title>
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
    this.FetchPageList();
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
    return Math.ceil(this.PageCount / this.pageSize);  // Calculate total pages based on page size
  };
}
