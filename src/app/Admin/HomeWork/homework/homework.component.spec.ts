import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeworkComponent } from './homework.component';

describe('HomeworkComponent', () => {
  let component: HomeworkComponent;
  let fixture: ComponentFixture<HomeworkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeworkComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeworkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
