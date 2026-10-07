import { Controller, Get, Post, Body, Req, Res, UseGuards, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { LoginAuthDto } from './dto/login-auth-dto.js';
import {
  AUTH_COOKIE,
  AUTH_COOKIE_MAX_AGE_MS,
  authCookieOptions,
} from './auth-cookie.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  createStudentAccount(@Body() dto: CreateAuthDto) {
    return this.authService.createStudentAccount(dto);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() loginDto: LoginAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, ...result } = await this.authService.login(loginDto);

    // The token only travels in an httpOnly cookie; it is never exposed to JS.
    res.cookie(AUTH_COOKIE, token, {
      ...authCookieOptions(),
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
    });

    return result;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE, authCookieOptions());
    return { message: 'Logout successful' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req: Request & { user: { userId: number } }) {
    return this.authService.getCurrentUser(req.user.userId);
  }

  @Post('/student/verify-otp')
  verifyStudentOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyStudentOtp(body.email, body.otp);
  }

  @Post('/academy-admin/verify-otp')
  verifyAcademyAdminOtp(
    @Body() body: { email: string; otp: string }
  ) {
    return this.authService.verifyAcademyAdminOtp(body.email, body.otp);
  }
}
