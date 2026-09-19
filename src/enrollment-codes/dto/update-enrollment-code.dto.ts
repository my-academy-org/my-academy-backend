import { PartialType } from '@nestjs/mapped-types';
import { CreateEnrollmentCodeDto } from './create-enrollment-code.dto.js';

export class UpdateEnrollmentCodeDto extends PartialType(CreateEnrollmentCodeDto) {}
