import { Test, TestingModule } from '@nestjs/testing';
import { LandingPageController } from './landing-page.controller.js';
import { LandingPageService } from './landing-page.service.js';

describe('LandingPageController', () => {
  let controller: LandingPageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LandingPageController],
      providers: [LandingPageService],
    }).compile();

    controller = module.get<LandingPageController>(LandingPageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
