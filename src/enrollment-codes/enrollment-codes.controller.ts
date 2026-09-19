import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EnrollmentCodesService } from './enrollment-codes.service.js';
import { CreateEnrollmentCodeDto } from './dto/create-enrollment-code.dto.js';
import { UpdateEnrollmentCodeDto } from './dto/update-enrollment-code.dto.js';

@Controller('enrollment-codes')
export class EnrollmentCodesController {
  constructor(private readonly enrollmentCodesService: EnrollmentCodesService) {}

  @Post()
  create(@Body() createEnrollmentCodeDto: CreateEnrollmentCodeDto) {
    return this.enrollmentCodesService.create(createEnrollmentCodeDto);
  }

  @Get()
  findAll() {
    return this.enrollmentCodesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.enrollmentCodesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEnrollmentCodeDto: UpdateEnrollmentCodeDto) {
    return this.enrollmentCodesService.update(+id, updateEnrollmentCodeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.enrollmentCodesService.remove(+id);
  }
}
