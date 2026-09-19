import { PartialType } from '@nestjs/mapped-types';
import { CreateAcademyDto } from './create-academy.dto.js';

export class UpdateAcademyDto extends PartialType(CreateAcademyDto) {}
