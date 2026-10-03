import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import type { Prisma } from '../../../generated/prisma/client.js';

export class CreateLandingPageDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  heroTitle?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  heroDescription?: string;

  @IsOptional()
  @IsUrl()
  @IsNotEmpty()
  heroImageUrl?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  aboutTitle?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  aboutDescription?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  instructorName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  instructorBio?: string;

  @IsOptional()
  @IsUrl()
  @IsNotEmpty()
  instructorImage?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  qualifications?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  experienceYears?: number;

  @IsOptional()
  @IsArray()
  @IsNotEmpty()
  features?: Prisma.InputJsonValue[];

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactAddress?: string;

  @IsOptional()
  @IsString()
  footerText?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
