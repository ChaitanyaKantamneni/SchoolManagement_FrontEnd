import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewstaffattendanceComponent } from './viewstaffattendance.component';

describe('ViewstaffattendanceComponent', () => {
  let component: ViewstaffattendanceComponent;
  let fixture: ComponentFixture<ViewstaffattendanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewstaffattendanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewstaffattendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
