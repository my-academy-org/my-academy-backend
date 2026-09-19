import { Module } from '@nestjs/common';
import { EnrollmentCodesService } from './enrollment-codes.service.js';
import { EnrollmentCodesController } from './enrollment-codes.controller.js';

@Module({
  controllers: [EnrollmentCodesController],
  providers: [EnrollmentCodesService],
})
export class EnrollmentCodesModule {}
