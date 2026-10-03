import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { LoginAuthDto } from './dto/login-auth-dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  createStudentAccount(@Body() dto: CreateAuthDto, tenantId: number) {
    return this.authService.createStudentAccount(dto, tenantId);
  }

  @Post('login')
  login(@Body() loginDto: LoginAuthDto) {
    return this.authService.login(loginDto);
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
