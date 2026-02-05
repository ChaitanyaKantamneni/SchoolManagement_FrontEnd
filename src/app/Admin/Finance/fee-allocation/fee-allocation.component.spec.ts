import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeeAllocationComponent } from './fee-allocation.component';

describe('FeeAllocationComponent', () => {
  let component: FeeAllocationComponent;
  let fixture: ComponentFixture<FeeAllocationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeeAllocationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeeAllocationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
