import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';

@Component({
  selector: 'app-class',
  imports: [NgIf,NgFor,NgClass,NgStyle,MatIconModule,DashboardTopNavComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './class.component.html',
  styleUrl: './class.component.css'
})
export class ClassComponent {
  IsAddNewClicked:boolean=false;
  IsActiveStatus:boolean=false;
  ViewClassClicked:boolean=false;
  currentPage = 1;
  pageSize = 5;
  visiblePageCount: number = 3;
  searchQuery: string = '';
  ClassList: any[] =[];
  SyllabusList: any[] =[];
  AminityInsStatus: any = '';
  isModalOpen = false;
  ClassCount: number = 0;
  ActiveUserId:string=localStorage.getItem('email')?.toString() || '';

  constructor(private router: Router,private apiurl:ApiServiceService) {}

  ngOnInit(): void {
    this.SyllabusList=[];
    this.FetchSyllabusList();
    this.FetchClassList();
  };

  ClassForm: any = new FormGroup({
    ID: new FormControl(),
    Name: new FormControl(),
    Syllabus:new FormControl(),
    Description: new FormControl()
  });

  getPaginatedClassLists() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.ListedClassList.slice(start, start + this.pageSize);
  };

  get ListedClassList() {
    return this.ClassList.filter(Class =>
      Class.Name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  };

  AddNewClicked(){
    this.ClassForm.get('Syllabus')?.patchValue('0');
    this.FetchSyllabusList();
    this.IsAddNewClicked=!this.IsAddNewClicked;
    this.IsActiveStatus=true;
    this.ViewClassClicked=false;
  };

  SubmitClass(){
    if(this.ClassForm.invalid){
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        Name: this.ClassForm.get('Name')?.value,
        Syllabus: this.ClassForm.get('Syllabus')?.value,
        Description: this.ClassForm.get('Description')?.value,
        IsActive:IsActiveStatusNumeric,
        Flag: '1'
      };

      this.apiurl.post("Tbl_Class_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            // this.AminityInsStatus = response.status;
            this.isModalOpen = true;
            this.AminityInsStatus = "Class Details Submitted!";
            this.ClassForm.reset();
            this.ClassForm.markAsPristine();
          }
        },
        error: (error) => {
          this.AminityInsStatus = "Error Updating Class.";
          this.isModalOpen = true;
        },
        complete: () => {
        }
      });
    }
  };

  FetchClassList() {
    const requestData = { Flag: '3' };

    this.apiurl.post<any>('Tbl_Class_CRUD_Operations', requestData)
      .subscribe(
        (response: any) => {
          if (response && Array.isArray(response.data)) {
            this.ClassList = response.data.map((item: any) => {
              const isActiveString = item.isActive === "1" ? "Active" : "InActive";
              return {
                ID: item.id,
                Name: item.name,
                Syllabus: item.syllabus,
                IsActive: isActiveString
              };
            });
            this.ClassCount = this.ClassList.length;
            console.log('this.ClassList',this.ClassList.length);
          } else {
            this.ClassList = [];
            this.ClassCount = 0;
          }
        },
        (error) => {
          this.ClassList = [];
          this.ClassCount = 0;
        }
      );
  };

  FetchClassDetByID(ClassID: string) {
    const data = {
      ID: ClassID,
      Flag: "4"
    };

    this.apiurl.post<any>("Tbl_Class_CRUD_Operations", data).subscribe(
      (response: any) => {
        const item = response?.data?.[0];
        if (item) {
          const isActiveString = item.isActive === "1" ? true : false;
          this.ClassForm.patchValue({
            ID: item.id,
            Name: item.name,
            Syllabus:item.syllabus,
            Description: item.description
          });
          this.IsActiveStatus = isActiveString;
        } else {
          this.ClassForm.reset();
        }

        this.IsAddNewClicked=true;
      },
      error => {
      }
    );
  };

  UpdateClass(){
    if(this.ClassForm.invalid){
      return;
    }
    else{
      const IsActiveStatusNumeric = this.IsActiveStatus ? "1" : "0";
      const data = {
        ID:this.ClassForm.get('ID')?.value || '',
        Name: this.ClassForm.get('Name')?.value || '',
        Syllabus: this.ClassForm.get('Syllabus')?.value || '',
        Description: this.ClassForm.get('Description')?.value || '',
        IsActive:IsActiveStatusNumeric,
        Flag: '5'
      };

      console.log('data',data);
      this.apiurl.post("Tbl_Class_CRUD_Operations", data).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.IsAddNewClicked=!this.IsAddNewClicked;
            // this.AminityInsStatus = response.status;
            this.isModalOpen = true;
            this.AminityInsStatus = "Class Details Updated!";
            this.ClassForm.reset();
            this.ClassForm.markAsPristine();
          }
        },
        error: (error) => {
          this.AminityInsStatus = "Error Updating Class.";
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
                Name: item.name
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

  editreview(ClassID: string): void {
    this.SyllabusList=[];
    this.FetchSyllabusList();
    this.FetchClassDetByID(ClassID);
    this.ViewClassClicked=true;
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
    this.getPaginatedClassLists();
  };

  copyTable() {
    const headers = ['SI.No', 'Name', 'Syllabus', 'Status'];

    const colWidths = headers.map((h, i) => {
      const dataLengths = this.ListedClassList.map((c, idx) => {
        if (i === 0) return (idx + 1).toString().length;
        if (i === 1) return c.Name.length;
        if (i === 2) return this.getSyllabusName(c.Syllabus).length;
        if (i === 3) return c.IsActive.length;
        return 0;
      });
      return Math.max(h.length, ...dataLengths);
    });

    let tableText = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ') + '\n';
    tableText += colWidths.map(w => '-'.repeat(w)).join('-|-') + '\n';

    this.ListedClassList.forEach((c, i) => {
      const row = [
        (i + 1).toString().padEnd(colWidths[0]),
        c.Name.padEnd(colWidths[1]),
        this.getSyllabusName(c.Syllabus).padEnd(colWidths[2]),
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
        this.ListedClassList.map((c, i) => ({
          'SI.No': i + 1,
          Name: c.Name,
          Syllabus: this.getSyllabusName(c.Syllabus),
          Status: c.IsActive
        }))
      );
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ClassList.xlsx';
      a.click();
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
    this.FetchClassList();
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
    return Math.ceil(this.ClassCount / this.pageSize);  // Calculate total pages based on page size
  };
}
