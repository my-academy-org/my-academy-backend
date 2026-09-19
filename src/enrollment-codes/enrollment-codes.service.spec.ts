import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentCodesService } from './enrollment-codes.service.js';

describe('EnrollmentCodesService', () => {
  let service: EnrollmentCodesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnrollmentCodesService],
    }).compile();

    service = module.get<EnrollmentCodesService>(EnrollmentCodesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
