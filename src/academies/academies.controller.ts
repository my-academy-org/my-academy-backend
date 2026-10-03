import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AcademiesService } from './academies.service.js';
import { UpdateAcademyDto } from './dto/update-academy.dto.js';
import { QueryAcademiesDto } from './dto/query-academies.dto.js';
import { RolesGuard } from '../auth/Guard/role.guard.js';
import { Roles } from '../helpers/role.decoretor.js';
import { TenantStatus } from '../../generated/prisma/enums.js';

@Controller('academies')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN')
export class AcademiesController {
  constructor(private readonly academiesService: AcademiesService) {}

  @Get()
  findAll(@Query() query: QueryAcademiesDto) {
    return this.academiesService.findAll(query);
  }

  @Get('statistics')
  getStatistics() {
    return this.academiesService.getStatistics();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.academiesService.findOne(id);
  }

  @Post(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAcademyDto: UpdateAcademyDto,
  ) {
    return this.academiesService.update(id, updateAcademyDto);
  }

  @Post(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.academiesService.setStatus(id, TenantStatus.ACTIVE);
  }

  @Post(':id/suspend')
  suspend(@Param('id', ParseIntPipe) id: number) {
    return this.academiesService.setStatus(id, TenantStatus.SUSPENDED);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.academiesService.remove(id);
  }
}
