import { TestBed } from '@angular/core/testing';

import { EdfDataService } from './edf-data.service';

describe('EdfDataService', () => {
  let service: EdfDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EdfDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
