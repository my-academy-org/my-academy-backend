import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateLessonDto } from './create-lesson.dto.js';

// A lesson never moves to another course.
export class UpdateLessonDto extends PartialType(
  OmitType(CreateLessonDto, ['courseId'] as const),
) {}
