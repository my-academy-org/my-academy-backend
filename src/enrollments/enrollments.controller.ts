import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EnrollmentsService } from './enrollments.service.js';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto.js';
import { RedeemEnrollmentCodeDto } from './dto/redeem-enrollment-code.dto.js';
import { QueryEnrollmentsDto } from './dto/query-enrollments.dto.js';
import { RolesGuard } from '../auth/Guard/role.guard.js';
import { Roles } from '../helpers/role.decoretor.js';
import type { AuthUser } from '../landing-page/landing-page.service.js';

@Controller('enrollments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN')
  create(
    @Body() createEnrollmentDto: CreateEnrollmentDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.enrollmentsService.create(createEnrollmentDto, req.user);
  }

  @Post('redeem')
  @Roles('STUDENT')
  redeem(
    @Body() redeemEnrollmentCodeDto: RedeemEnrollmentCodeDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.enrollmentsService.redeem(
      redeemEnrollmentCodeDto.code,
      req.user,
    );
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN', 'STUDENT')
  findAll(
    @Query() query: QueryEnrollmentsDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.enrollmentsService.findAll(query, req.user);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN', 'STUDENT')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.enrollmentsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.enrollmentsService.update(id, updateEnrollmentDto, req.user);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.enrollmentsService.remove(id, req.user);
  }
}
