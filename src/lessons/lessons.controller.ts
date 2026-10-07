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
  Res,
  Headers,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { pipeline } from 'node:stream';
import { AuthGuard } from '@nestjs/passport';
import { LessonsService } from './lessons.service.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
import { QueryLessonsDto } from './dto/query-lessons.dto.js';
import {
  CreateVideoUploadUrlDto,
  SaveVideoDto,
} from './dto/lesson-video.dto.js';
import { RolesGuard } from '../auth/Guard/role.guard.js';
import { Roles } from '../helpers/role.decoretor.js';
import type { AuthUser } from '../landing-page/landing-page.service.js';

@Controller('lessons')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN')
  create(
    @Body() createLessonDto: CreateLessonDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.lessonsService.create(createLessonDto, req.user);
  }

  // A lesson needs its video first: get an upload URL, PUT the file to it,
  // save it here, then create the lesson with the returned media id.
  @Post('video/upload-url')
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN')
  createVideoUploadUrl(
    @Body() dto: CreateVideoUploadUrlDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.lessonsService.createVideoUploadUrl(dto, req.user);
  }

  @Post('video')
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN')
  saveVideo(@Body() dto: SaveVideoDto, @Req() req: { user: AuthUser }) {
    return this.lessonsService.saveVideo(dto, req.user);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN', 'STUDENT')
  findAll(@Query() query: QueryLessonsDto, @Req() req: { user: AuthUser }) {
    return this.lessonsService.findAll(query, req.user);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN', 'STUDENT')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.lessonsService.findOne(id, req.user);
  }


  @Get(':id/video')
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN', 'STUDENT')
  async streamVideo(
    @Param('id', ParseIntPipe) id: number,
    @Headers('range') range: string | undefined,
    @Req() req: { user: AuthUser },
    @Res() res: Response,
  ) {
    const video = await this.lessonsService.openVideo(id, req.user, range);

    res.status(video.range ? 206 : 200).set({
      'Content-Type': video.type ?? 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-store',
      ...(video.size !== undefined && { 'Content-Length': String(video.size) }),
      ...(video.range && { 'Content-Range': video.range }),
    });
    // Stops reading from storage as soon as the player disconnects.
    pipeline(video.body, res, () => {});
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLessonDto: UpdateLessonDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.lessonsService.update(id, updateLessonDto, req.user);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.lessonsService.remove(id, req.user);
  }
}
