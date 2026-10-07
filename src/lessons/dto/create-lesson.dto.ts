import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { LessonStatus } from '../../../generated/prisma/enums.js';

export class CreateLessonDto {
  // The lesson inherits its tenant from the course.
  @IsInt()
  courseId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  // The `id` returned by POST /lessons/video once the video is uploaded.
  @IsInt()
  mediaId: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsEnum(LessonStatus)
  status?: LessonStatus;
}
