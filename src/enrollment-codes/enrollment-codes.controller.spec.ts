import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentCodesController } from './enrollment-codes.controller.js';
import { EnrollmentCodesService } from './enrollment-codes.service.js';

describe('EnrollmentCodesController', () => {
  let controller: EnrollmentCodesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollmentCodesController],
      providers: [EnrollmentCodesService],
    }).compile();

    controller = module.get<EnrollmentCodesController>(EnrollmentCodesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
