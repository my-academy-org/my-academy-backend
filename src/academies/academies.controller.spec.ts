import { Test, TestingModule } from '@nestjs/testing';
import { AcademiesController } from './academies.controller.js';
import { AcademiesService } from './academies.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('AcademiesController', () => {
  let controller: AcademiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AcademiesController],
      providers: [AcademiesService, { provide: PrismaService, useValue: {} }],
    }).compile();

    controller = module.get<AcademiesController>(AcademiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
