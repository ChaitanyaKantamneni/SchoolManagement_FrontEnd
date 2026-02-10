import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamattendenceComponent } from './examattendence.component';

describe('ExamattendenceComponent', () => {
  let component: ExamattendenceComponent;
  let fixture: ComponentFixture<ExamattendenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamattendenceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamattendenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
