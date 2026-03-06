import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeeDiscountComponent } from './fee-discount.component';

describe('FeeDiscountComponent', () => {
  let component: FeeDiscountComponent;
  let fixture: ComponentFixture<FeeDiscountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeeDiscountComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeeDiscountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
