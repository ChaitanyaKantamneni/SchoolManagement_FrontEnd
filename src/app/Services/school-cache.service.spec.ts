import { TestBed } from '@angular/core/testing';

import { SchoolCacheService } from './school-cache.service';

describe('SchoolCacheService', () => {
  let service: SchoolCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SchoolCacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
