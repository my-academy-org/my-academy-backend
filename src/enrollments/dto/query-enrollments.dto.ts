import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { EnrollmentStatus } from '../../../generated/prisma/enums.js';

export class QueryEnrollmentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  courseId?: number;

  // Ignored for a student, who only ever sees their own enrollments.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  studentId?: number;

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}
