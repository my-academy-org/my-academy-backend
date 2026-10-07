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
import { CoursesService } from './courses.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { QueryCoursesDto } from './dto/query-courses.dto.js';
import { RolesGuard } from '../auth/Guard/role.guard.js';
import { Roles } from '../helpers/role.decoretor.js';
import type { AuthUser } from '../landing-page/landing-page.service.js';

@Controller('courses')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN')
  create(
    @Body() createCourseDto: CreateCourseDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.coursesService.create(createCourseDto, req.user);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN', 'STUDENT')
  findAll(@Query() query: QueryCoursesDto, @Req() req: { user: AuthUser }) {
    return this.coursesService.findAll(query, req.user);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN', 'STUDENT')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.coursesService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCourseDto: UpdateCourseDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.coursesService.update(id, updateCourseDto, req.user);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.coursesService.remove(id, req.user);
  }
}
