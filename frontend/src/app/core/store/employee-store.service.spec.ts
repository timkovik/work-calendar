import { TestBed } from '@angular/core/testing';

import { EmployeeStoreService } from './employee-store.service';

describe('EmployeeStoreService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: EmployeeStoreService = TestBed.inject(EmployeeStoreService);
    expect(service).toBeTruthy();
  });
});
