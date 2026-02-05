import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamTypeComponent } from './exam-type.component';

describe('ExamTypeComponent', () => {
  let component: ExamTypeComponent;
  let fixture: ComponentFixture<ExamTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamTypeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
