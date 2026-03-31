import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';

import { ViewAttendanceComponent } from './view-attendance.component';
import { ApiServiceService } from '../../../Services/api-service.service';
import { LoaderService } from '../../../Services/loader.service';
import { MenuServiceService } from '../../../Services/menu-service.service';

describe('ViewAttendanceComponent', () => {
  let component: ViewAttendanceComponent;
  let fixture: ComponentFixture<ViewAttendanceComponent>;

  const apiServiceMock = {
    post: jasmine.createSpy('post').and.returnValue(of({ data: [] }))
  };

  const menuServiceMock = {
    getPageByName: jasmine.createSpy('getPageByName').and.returnValue({
      id: '1',
      pageName: 'ViewAttendance',
      moduleID: '1',
      canView: '1',
      canAdd: '1',
      canEdit: '1',
      canDelete: '1'
    })
  };

  const routerMock = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(async () => {
    sessionStorage.setItem('RollID', '1');

    await TestBed.configureTestingModule({
      imports: [ViewAttendanceComponent],
      providers: [
        { provide: ApiServiceService, useValue: apiServiceMock },
        { provide: MenuServiceService, useValue: menuServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: LoaderService, useValue: {} }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewAttendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  afterEach(() => {
    sessionStorage.removeItem('RollID');
  });
});
