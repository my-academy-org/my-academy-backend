import { Test, TestingModule } from '@nestjs/testing';
import { LandingPageController } from './landing-page.controller.js';
import { LandingPageService } from './landing-page.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('LandingPageController', () => {
  let controller: LandingPageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LandingPageController],
      providers: [LandingPageService, { provide: PrismaService, useValue: {} }],
    }).compile();

    controller = module.get<LandingPageController>(LandingPageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
