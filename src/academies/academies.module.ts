import { Module } from '@nestjs/common';
import { AcademiesService } from './academies.service.js';
import { AcademiesController } from './academies.controller.js';

@Module({
  controllers: [AcademiesController],
  providers: [AcademiesService],
})
export class AcademiesModule {}
