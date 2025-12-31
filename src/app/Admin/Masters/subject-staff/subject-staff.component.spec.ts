import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubjectStaffComponent } from './subject-staff.component';

describe('SubjectStaffComponent', () => {
  let component: SubjectStaffComponent;
  let fixture: ComponentFixture<SubjectStaffComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectStaffComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubjectStaffComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
