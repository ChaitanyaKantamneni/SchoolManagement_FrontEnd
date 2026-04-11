import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { LeavedetailsComponent } from './leavedetails.component';
import { SideBarServiceService } from '../../../Services/side-bar-service.service';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { ApiServiceService } from '../../../Services/api-service.service';

describe('LeavedetailsComponent', () => {
  let component: LeavedetailsComponent;
  let fixture: ComponentFixture<LeavedetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeavedetailsComponent, RouterTestingModule],
      providers: [
        {
          provide: SideBarServiceService,
          useValue: {
            isExpanded$: of(true),
            toggleMobileMenu: () => {},
            toggleSidebar: () => {}
          }
        },
        {
          provide: MenuServiceService,
          useValue: {
            menuLoaded$: of(true),
            getMenu: () => [],
            clearMenu: () => {}
          }
        },
        {
          provide: ApiServiceService,
          useValue: {
            post: () => of({ data: [] })
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeavedetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
