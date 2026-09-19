import { Test, TestingModule } from '@nestjs/testing';
import { LessonsController } from './lessons.controller.js';
import { LessonsService } from './lessons.service.js';

describe('LessonsController', () => {
  let controller: LessonsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonsController],
      providers: [LessonsService],
    }).compile();

    controller = module.get<LessonsController>(LessonsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
