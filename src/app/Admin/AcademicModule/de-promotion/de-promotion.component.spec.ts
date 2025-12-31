import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DePromotionComponent } from './de-promotion.component';

describe('DePromotionComponent', () => {
  let component: DePromotionComponent;
  let fixture: ComponentFixture<DePromotionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DePromotionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DePromotionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
