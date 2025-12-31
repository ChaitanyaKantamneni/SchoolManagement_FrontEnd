import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolDetailsComponent } from './school-details.component';

describe('SchoolDetailsComponent', () => {
  let component: SchoolDetailsComponent;
  let fixture: ComponentFixture<SchoolDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchoolDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SchoolDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
