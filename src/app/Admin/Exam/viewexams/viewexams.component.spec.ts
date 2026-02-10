import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewexamsComponent } from './viewexams.component';

describe('ViewexamsComponent', () => {
  let component: ViewexamsComponent;
  let fixture: ComponentFixture<ViewexamsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewexamsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewexamsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
