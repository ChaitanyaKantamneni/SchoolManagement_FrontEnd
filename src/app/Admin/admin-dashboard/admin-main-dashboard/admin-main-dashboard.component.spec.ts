import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminMainDashboardComponent } from './admin-main-dashboard.component';

describe('AdminMainDashboardComponent', () => {
  let component: AdminMainDashboardComponent;
  let fixture: ComponentFixture<AdminMainDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminMainDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminMainDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
