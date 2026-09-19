import { PartialType } from '@nestjs/mapped-types';
import { CreateEnrollmentDto } from './create-enrollment.dto.js';

export class UpdateEnrollmentDto extends PartialType(CreateEnrollmentDto) {}
