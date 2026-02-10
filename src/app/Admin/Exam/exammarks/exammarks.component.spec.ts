import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExammarksComponent } from './exammarks.component';

describe('ExammarksComponent', () => {
  let component: ExammarksComponent;
  let fixture: ComponentFixture<ExammarksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExammarksComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExammarksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
