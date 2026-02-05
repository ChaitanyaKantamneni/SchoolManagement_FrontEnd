import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkingDaysComponent } from './working-days.component';

describe('WorkingDaysComponent', () => {
  let component: WorkingDaysComponent;
  let fixture: ComponentFixture<WorkingDaysComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkingDaysComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkingDaysComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
