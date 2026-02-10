import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetexamComponent } from './setexam.component';

describe('SetexamComponent', () => {
  let component: SetexamComponent;
  let fixture: ComponentFixture<SetexamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetexamComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetexamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
