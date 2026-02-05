import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeTableComponent } from './time-table.component';

describe('TimeTableComponent', () => {
  let component: TimeTableComponent;
  let fixture: ComponentFixture<TimeTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
