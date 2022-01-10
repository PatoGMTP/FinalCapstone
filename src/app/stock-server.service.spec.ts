import { TestBed } from '@angular/core/testing';

import { StockServerService } from './stock-server.service';

describe('StockServerService', () => {
  let service: StockServerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StockServerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
