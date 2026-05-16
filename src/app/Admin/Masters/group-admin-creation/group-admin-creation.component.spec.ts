import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupAdminCreationComponent } from './group-admin-creation.component';

describe('GroupAdminCreationComponent', () => {
  let component: GroupAdminCreationComponent;
  let fixture: ComponentFixture<GroupAdminCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupAdminCreationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupAdminCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
