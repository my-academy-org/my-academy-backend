import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-course.dto.js';

// A course never moves to another tenant.
export class UpdateCourseDto extends PartialType(
  OmitType(CreateCourseDto, ['tenantId'] as const),
) {}
