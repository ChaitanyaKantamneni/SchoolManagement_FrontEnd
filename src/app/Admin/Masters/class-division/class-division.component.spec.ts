import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassDivisionComponent } from './class-division.component';

describe('ClassDivisionComponent', () => {
  let component: ClassDivisionComponent;
  let fixture: ComponentFixture<ClassDivisionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassDivisionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClassDivisionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
