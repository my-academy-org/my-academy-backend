import { IsEnum } from 'class-validator';
import { EnrollmentStatus } from '../../../generated/prisma/enums.js';

// Only the status changes; the student and the course are fixed.
export class UpdateEnrollmentDto {
  @IsEnum(EnrollmentStatus)
  status: EnrollmentStatus;
}
