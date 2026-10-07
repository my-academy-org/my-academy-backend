import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVideoUploadUrlDto {
  // The course the lesson will be created in.
  @IsInt()
  courseId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  fileName: string;

  @Matches(/^video\/[\w.+-]+$/, { message: 'contentType must be a video type' })
  contentType: string;
}

export class SaveVideoDto {
  // The `key` returned with the upload URL.
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  key: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  fileName?: string;

  // Seconds.
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;
}
