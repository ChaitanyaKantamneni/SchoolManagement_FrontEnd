import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransferStudentsComponent } from './transfer-students.component';

describe('TransferStudentsComponent', () => {
  let component: TransferStudentsComponent;
  let fixture: ComponentFixture<TransferStudentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransferStudentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransferStudentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
