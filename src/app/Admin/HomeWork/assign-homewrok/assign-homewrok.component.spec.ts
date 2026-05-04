import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignHomewrokComponent } from './assign-homewrok.component';

describe('AssignHomewrokComponent', () => {
  let component: AssignHomewrokComponent;
  let fixture: ComponentFixture<AssignHomewrokComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignHomewrokComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignHomewrokComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
