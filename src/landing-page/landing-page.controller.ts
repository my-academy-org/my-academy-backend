import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LandingPageService, AuthUser } from './landing-page.service.js';
import { CreateLandingPageDto } from './dto/create-landing-page.dto.js';
import { UpdateLandingPageDto } from './dto/update-landing-page.dto.js';
import { RolesGuard } from '../auth/Guard/role.guard.js';
import { Roles } from '../helpers/role.decoretor.js';

@Controller('landing-page')
export class LandingPageController {
  constructor(private readonly landingPageService: LandingPageService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ACADEMY_ADMIN','SUPER_ADMIN')
  create(
    @Body() createLandingPageDto: CreateLandingPageDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.landingPageService.create(createLandingPageDto, req.user);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN')
  findAll(@Req() req: { user: AuthUser }) {
    return this.landingPageService.findAll(req.user);
  }

  // Public: no authentication required.
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.landingPageService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLandingPageDto: UpdateLandingPageDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.landingPageService.update(id, updateLandingPageDto, req.user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ACADEMY_ADMIN')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.landingPageService.remove(id, req.user);
  }
}
