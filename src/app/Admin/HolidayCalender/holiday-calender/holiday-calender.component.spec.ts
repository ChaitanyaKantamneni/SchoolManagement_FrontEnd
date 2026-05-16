import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HolidayCalenderComponent } from './holiday-calender.component';

describe('HolidayCalenderComponent', () => {
  let component: HolidayCalenderComponent;
  let fixture: ComponentFixture<HolidayCalenderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HolidayCalenderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HolidayCalenderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
