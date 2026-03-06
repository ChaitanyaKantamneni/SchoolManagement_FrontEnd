import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeeCollectionComponent } from './fee-collection.component';

describe('FeeCollectionComponent', () => {
  let component: FeeCollectionComponent;
  let fixture: ComponentFixture<FeeCollectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeeCollectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeeCollectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
