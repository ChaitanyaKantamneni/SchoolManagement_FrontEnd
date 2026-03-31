import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendanceSettingsComponent } from './attendance-settings.component';

describe('AttendanceSettingsComponent', () => {
  let component: AttendanceSettingsComponent;
  let fixture: ComponentFixture<AttendanceSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceSettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendanceSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
