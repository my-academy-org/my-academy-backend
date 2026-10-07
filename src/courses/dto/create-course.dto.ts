import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { CourseStatus } from '../../../generated/prisma/enums.js';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  // Only used by a super admin, who has no tenant of their own.
  @IsOptional()
  @IsInt()
  tenantId?: number;
}
