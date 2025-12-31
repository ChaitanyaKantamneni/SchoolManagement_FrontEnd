import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllotClassTeacherComponent } from './allot-class-teacher.component';

describe('AllotClassTeacherComponent', () => {
  let component: AllotClassTeacherComponent;
  let fixture: ComponentFixture<AllotClassTeacherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllotClassTeacherComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllotClassTeacherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
