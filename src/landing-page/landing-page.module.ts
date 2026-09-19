import { Module } from '@nestjs/common';
import { LandingPageService } from './landing-page.service.js';
import { LandingPageController } from './landing-page.controller.js';

@Module({
  controllers: [LandingPageController],
  providers: [LandingPageService],
})
export class LandingPageModule {}
