import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CourseStatus } from '../../../generated/prisma/enums.js';

export class QueryCoursesDto {
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  // Only applied for a super admin; everyone else is limited to their tenant.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  // Matches course title.
  @IsOptional()
  @IsString()
  search?: string;

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
