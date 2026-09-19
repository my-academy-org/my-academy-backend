import { Test, TestingModule } from '@nestjs/testing';
import { UploadsController } from './uploads.controller.js';
import { UploadsService } from './uploads.service.js';

describe('UploadsController', () => {
  let controller: UploadsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [UploadsService],
    }).compile();

    controller = module.get<UploadsController>(UploadsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
