import { TestBed } from '@angular/core/testing';

import { EdfParserService } from './edf-parser.service';

describe('EdfParserService', () => {
  let service: EdfParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EdfParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
