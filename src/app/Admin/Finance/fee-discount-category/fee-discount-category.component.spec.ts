import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeeDiscountCategoryComponent } from './fee-discount-category.component';

describe('FeeDiscountCategoryComponent', () => {
  let component: FeeDiscountCategoryComponent;
  let fixture: ComponentFixture<FeeDiscountCategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeeDiscountCategoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeeDiscountCategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
