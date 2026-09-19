import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AcademiesService } from './academies.service.js';
import { CreateAcademyDto } from './dto/create-academy.dto.js';
import { UpdateAcademyDto } from './dto/update-academy.dto.js';

@Controller('academies')
export class AcademiesController {
  constructor(private readonly academiesService: AcademiesService) {}

  @Post()
  create(@Body() createAcademyDto: CreateAcademyDto) {
    return this.academiesService.create(createAcademyDto);
  }

  @Get()
  findAll() {
    return this.academiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.academiesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAcademyDto: UpdateAcademyDto) {
    return this.academiesService.update(+id, updateAcademyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.academiesService.remove(+id);
  }
}
