import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeachersTimeTableComponent } from './teachers-time-table.component';

describe('TeachersTimeTableComponent', () => {
  let component: TeachersTimeTableComponent;
  let fixture: ComponentFixture<TeachersTimeTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeachersTimeTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeachersTimeTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
