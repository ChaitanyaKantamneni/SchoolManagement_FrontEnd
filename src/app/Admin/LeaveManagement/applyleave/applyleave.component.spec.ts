import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { ApplyleaveComponent } from './applyleave.component';
import { MenuServiceService } from '../../../Services/menu-service.service';
import { ApiServiceService } from '../../../Services/api-service.service';

describe('ApplyleaveComponent', () => {
  let component: ApplyleaveComponent;
  let fixture: ComponentFixture<ApplyleaveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplyleaveComponent, RouterTestingModule],
      providers: [
        {
          provide: MenuServiceService,
          useValue: {
            getPageByName: () => ({
              canView: '1',
              canAdd: '1',
              canEdit: '1',
              canDelete: '1'
            })
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

    fixture = TestBed.createComponent(ApplyleaveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
