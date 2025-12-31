import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AcademicYearComponent } from './academic-year.component';

describe('AcademicYearComponent', () => {
  let component: AcademicYearComponent;
  let fixture: ComponentFixture<AcademicYearComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademicYearComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AcademicYearComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
