import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTopNavComponent } from '../../../SignInAndSignUp/dashboard-top-nav/dashboard-top-nav.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../../Services/api-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { BasePermissionComponent } from '../../../shared/base-crud.component';
import { LoaderService } from '../../../Services/loader.service';

@Component({
  selector: 'app-academic-year-transition',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, MatIconModule, DashboardTopNavComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './academic-year-transition.component.html',
  styleUrls: ['./academic-year-transition.component.css']
})
/**
 * Class Responsibility: Handles view logic and user interactions for AcademicYearTransitionComponent.
 * Designed to let Super Admins and School Admins migrate individual configurations from a source academic year to a target year.
 */
export class AcademicYearTransitionComponent extends BasePermissionComponent implements OnInit {
  pageName = 'AcademicYearTransition';
  academicYears: any[] = [];
  schools: any[] = [];
  AdminselectedSchoolID: string = '';

  /**
   * Form Group controls to capture selected school, academic years, and specific modular sub-components.
   */
  transitionForm = new FormGroup({
    schoolId: new FormControl(''),
    sourceYearId: new FormControl('', [Validators.required]),
    targetYearId: new FormControl('', [Validators.required]),
    
    // Masters Module sub-components
    transferSyllabus: new FormControl(false),
    transferClass: new FormControl(false),
    transferDivision: new FormControl(false),
    transferSubject: new FormControl(false),
    transferSubjectStaff: new FormControl(false),
    transferModules: new FormControl(false),
    transferPages: new FormControl(false),
    transferRoles: new FormControl(false),
    transferStaff: new FormControl(false),
    transferGroupAdmin: new FormControl(false),

    // Transportation Module sub-components
    transferBus: new FormControl(false),
    transferRoutes: new FormControl(false),
    transferStops: new FormControl(false),
    transferFares: new FormControl(false)
  });

  constructor(
    router: Router,
    public loader: LoaderService,
    private apiService: ApiServiceService,
    menuService: MenuServiceService
  ) {
    super(menuService, router);
  }

  /**
   * Lifecycle hook: Initializes component parameters, fetches schools list for Super Admin, and loads default page datasets.
   */
  ngOnInit(): void {
    this.checkViewPermission();
    if (this.isAdmin) {
      this.FetchSchoolsList();
      this.transitionForm.get('schoolId')?.setValidators([Validators.required]);
      this.transitionForm.get('schoolId')?.updateValueAndValidity();
    } else {
      this.AdminselectedSchoolID = sessionStorage.getItem('SchoolID') || '';
      this.FetchAcademicYearsList(this.AdminselectedSchoolID);
    }
  }

  /**
   * Retrieves list of schools from the database for the Super Admin dropdown selection.
   */
  FetchSchoolsList(): void {
    this.loader.show();
    this.apiService.post('Tbl_SchoolDetails_CRUD', { Flag: '2' }).subscribe({
      next: (res: any) => {
        this.loader.hide();
        if (res && Array.isArray(res.data)) {
          this.schools = res.data.map((item: any) => ({
            id: item.id,
            name: item.name
          }));
        }
      },
      error: (err: any) => {
        this.loader.hide();
        console.error('Failed to load schools', err);
      }
    });
  }

  /**
   * Listens to school changes to re-fetch relevant academic years and clear current year selectors.
   * @param event HTML select change event containing the school ID.
   */
  onSchoolChange(event: any): void {
    const schoolId = event.target.value;
    this.academicYears = [];
    this.transitionForm.patchValue({
      sourceYearId: '',
      targetYearId: ''
    });
    if (schoolId) {
      this.FetchAcademicYearsList(schoolId);
    }
  }

  /**
   * Retrieves academic years list from database filtered by the selected school ID.
   * @param schoolId The ID of the school to load years for.
   */
  FetchAcademicYearsList(schoolId: string): void {
    const requestData = { 
      SchoolID: schoolId, 
      Flag: '2' 
    };

    this.loader.show();
    this.apiService.post('Tbl_AcademicYear_CRUD_Operations', requestData)
      .subscribe({
        next: (response: any) => {
          this.loader.hide();
          if (response && Array.isArray(response.data)) {
            this.academicYears = response.data.map((item: any) => ({
              ID: item.id,
              Name: item.name
            }));
          }
        },
        error: (err: any) => {
          this.loader.hide();
          console.error('Failed to load academic years', err);
        }
      });
  }

  /**
   * Handles form submission: Validates inputs and fires the academic year data transition operation.
   */
  onSubmit(): void {
    if (this.transitionForm.invalid) return;

    const source = this.transitionForm.value.sourceYearId;
    const target = this.transitionForm.value.targetYearId;
    const selectedSchool = this.isAdmin ? this.transitionForm.value.schoolId : this.AdminselectedSchoolID;

    if (source === target) {
      alert('Source and Target academic years cannot be the same.');
      return;
    }

    const confirmMsg = 'Are you sure you want to transition data? This will copy selected masters to the target academic year. Past years will remain unchanged.';
    if (!confirm(confirmMsg)) {
      return;
    }

    const payload = {
      SchoolID: selectedSchool,
      SourceYearID: source,
      TargetYearID: target,
      TransferSyllabus: this.transitionForm.value.transferSyllabus ? '1' : '0',
      TransferClass: this.transitionForm.value.transferClass ? '1' : '0',
      TransferDivision: this.transitionForm.value.transferDivision ? '1' : '0',
      TransferSubject: this.transitionForm.value.transferSubject ? '1' : '0',
      TransferSubjectStaff: this.transitionForm.value.transferSubjectStaff ? '1' : '0',
      TransferModules: this.transitionForm.value.transferModules ? '1' : '0',
      TransferPages: this.transitionForm.value.transferPages ? '1' : '0',
      TransferRoles: this.transitionForm.value.transferRoles ? '1' : '0',
      TransferStaff: this.transitionForm.value.transferStaff ? '1' : '0',
      TransferGroupAdmin: this.transitionForm.value.transferGroupAdmin ? '1' : '0',
      TransferBus: this.transitionForm.value.transferBus ? '1' : '0',
      TransferRoutes: this.transitionForm.value.transferRoutes ? '1' : '0',
      TransferStops: this.transitionForm.value.transferStops ? '1' : '0',
      TransferFares: this.transitionForm.value.transferFares ? '1' : '0'
    };

    this.loader.show();
    this.apiService.post('TransitionAcademicYearData', payload).subscribe({
      next: (res: any) => {
        this.loader.hide();
        if (res && res.success) {
          alert('Academic year transition initiated successfully.');
          this.resetForm();
        } else {
          alert(res.message || 'Failed to process academic year transition.');
        }
      },
      error: (err: any) => {
        this.loader.hide();
        console.error('Transition error:', err);
        alert('An error occurred during academic year transition.');
      }
    });
  }

  /**
   * Resets form values and clears the loaded academic years list.
   */
  resetForm(): void {
    this.transitionForm.reset({
      schoolId: '',
      sourceYearId: '',
      targetYearId: '',
      transferSyllabus: false,
      transferClass: false,
      transferDivision: false,
      transferSubject: false,
      transferSubjectStaff: false,
      transferModules: false,
      transferPages: false,
      transferRoles: false,
      transferStaff: false,
      transferGroupAdmin: false,
      transferBus: false,
      transferRoutes: false,
      transferStops: false,
      transferFares: false
    });
    this.academicYears = [];
  }
}
