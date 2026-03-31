import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeeDuesComponent } from './fee-dues.component';

describe('FeeDuesComponent', () => {
  let component: FeeDuesComponent;
  let fixture: ComponentFixture<FeeDuesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeeDuesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeeDuesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

