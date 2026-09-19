import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LandingPageService } from './landing-page.service.js';
import { CreateLandingPageDto } from './dto/create-landing-page.dto.js';
import { UpdateLandingPageDto } from './dto/update-landing-page.dto.js';

@Controller('landing-page')
export class LandingPageController {
  constructor(private readonly landingPageService: LandingPageService) {}

  @Post()
  create(@Body() createLandingPageDto: CreateLandingPageDto) {
    return this.landingPageService.create(createLandingPageDto);
  }

  @Get()
  findAll() {
    return this.landingPageService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.landingPageService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLandingPageDto: UpdateLandingPageDto) {
    return this.landingPageService.update(+id, updateLandingPageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.landingPageService.remove(+id);
  }
}
