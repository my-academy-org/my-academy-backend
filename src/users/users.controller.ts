import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/Guard/role.guard.js';
import { Roles } from '../helpers/role.decoretor.js';
import { QueryAcademyAdminsDto } from './dto/query-academy-admins.dto.js';
import { UpdateAcademyAdminDto } from './dto/update-academy-admin.dto.js';
import { UserStatus } from '../../generated/prisma/enums.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('add-academy-admin/:tenant_id')
  create(
    @Body() createUserDto: CreateUserDto,
    @Param('tenant_id') tenantId: string,
  ) {
    return this.usersService.addAcademyAdmin(createUserDto, tenantId);
  }

 

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('academy-admins')
  findAcademyAdmins(@Query() query: QueryAcademyAdminsDto) {
    return this.usersService.findAcademyAdmins(query);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('academy-admins/:id')
  updateAcademyAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAcademyAdminDto,
  ) {
    return this.usersService.updateAcademyAdmin(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('academy-admins/:id/resend-invitation')
  resendAcademyAdminInvitation(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.resendAcademyAdminInvitation(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('academy-admins/:id/suspend')
  suspendAcademyAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.setAcademyAdminStatus(id, UserStatus.SUSPENDED);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('academy-admins/:id/activate')
  activateAcademyAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.setAcademyAdminStatus(id, UserStatus.ACTIVE);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
