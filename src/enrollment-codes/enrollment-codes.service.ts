import { Injectable } from '@nestjs/common';
import { CreateEnrollmentCodeDto } from './dto/create-enrollment-code.dto.js';
import { UpdateEnrollmentCodeDto } from './dto/update-enrollment-code.dto.js';

@Injectable()
export class EnrollmentCodesService {
  create(createEnrollmentCodeDto: CreateEnrollmentCodeDto) {
    return 'This action adds a new enrollmentCode';
  }

  findAll() {
    return `This action returns all enrollmentCodes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} enrollmentCode`;
  }

  update(id: number, updateEnrollmentCodeDto: UpdateEnrollmentCodeDto) {
    return `This action updates a #${id} enrollmentCode`;
  }

  remove(id: number) {
    return `This action removes a #${id} enrollmentCode`;
  }
}
