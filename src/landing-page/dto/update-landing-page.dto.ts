import { PartialType } from '@nestjs/mapped-types';
import { CreateLandingPageDto } from './create-landing-page.dto.js';

export class UpdateLandingPageDto extends PartialType(CreateLandingPageDto) {}
