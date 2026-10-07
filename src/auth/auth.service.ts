import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { UpdateAuthDto } from './dto/update-auth.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LoginAuthDto } from './dto/login-auth-dto.js';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RedisService } from '../redis/redis.service.js';
import { MailService } from '../mail/mail.service.js';
import { generateOtp } from '../helpers/generateOtp.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
  ) {}

  async createStudentAccount(dto: CreateAuthDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });

    if (!existingTenant) {
      throw new BadRequestException('Invalid tenant ID');
    }

    if (existingTenant.status !== 'ACTIVE') {
      throw new ForbiddenException('This academy is not available');
    }

    if (existingUser) {
      throw new BadRequestException('user with this email already exists');
    }
    const existingOtp = await this.redis.get(`student:${dto.email}`);

    if (existingOtp) {
      throw new UnprocessableEntityException('OTP already sent for this email');
    }

    const hashedPassword = bcrypt.hashSync(dto.password, 10);

    const redisKey = `student:${dto.email}`;

    const otp = await generateOtp();

    const redisValue: {
      otp: string;
      email: string;
      password: string;
      tenantId: number;
      name: string;
    } = {
      otp: otp,
      email: dto.email,
      password: hashedPassword,
      tenantId: dto.tenantId,
      name: dto.name,
    };

    await this.redis.set(redisKey, JSON.stringify(redisValue), 300);

    const verifyUrl = `https://my-academy.online/verify-otp?email=${encodeURIComponent(dto.email)}&role=STUDENT`;

    const emailOptions = {
      to: dto.email,
      subject: 'Your OTP for student Registration',
      text: `Your OTP is: ${otp}. It will expire in 5 minutes. Verify your email here: ${verifyUrl}`,
      html: `
    <p>Your OTP is: <strong>${otp}</strong>. It will expire in 5 minutes.</p>
    <a
      href="${verifyUrl}"
      style="
        display: inline-block;
        padding: 12px 24px;
        background-color: #2563eb;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
      "
    >
      Verify Your Email
    </a>
  `,
    };

    await this.mail.sendMail(emailOptions);

    return {
      message:
        'Student account created successfully. Please check your email for verification.',
    };
  }

  async login(loginDto: LoginAuthDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email: loginDto.email,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      if (user.status === 'SUSPENDED') {
        throw new ForbiddenException('Your account is suspended');
      }

      // An invited academy admin stays INACTIVE until the first login.
      if (user.role === 'ACADEMY_ADMIN' && user.status === 'INACTIVE') {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { status: 'ACTIVE' },
        });
      }

      const token = jwt.sign(
        {
          userId: user.id,
          role: user.role,
          tenantId: user.tenantId || null,
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' },
      );

      return {
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId || null,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      console.error('LOGIN ERROR:', error);

      throw new UnauthorizedException('Invalid email or password');
    }
  }

  async getCurrentUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        tenantId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid session');
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('Your account is suspended');
    }

    return { user };
  }

  async verifyStudentOtp(email: string, otp: string) {
    const existingOtp = await this.redis.get(`student:${email}`);

    if (!existingOtp) {
      throw new BadRequestException('OTP has expired');
    }

    const parsedOtp = JSON.parse(existingOtp);

    if (parsedOtp.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    const hashedPassword = parsedOtp.password;

    await this.prisma.user.create({
      data: {
        name: parsedOtp.name,
        email: parsedOtp.email,
        password: hashedPassword,
        role: 'STUDENT',
        tenantId: parsedOtp.tenantId,
      },
    });

    return {
      message:
        'Email verified successfully. your account has been activated. You can now log in.',
    };
  }

  async verifyAcademyAdminOtp(email: string, otp: string) {
    const existingOtp = await this.redis.get(`otp:${email}`);

    if (!existingOtp) {
      throw new UnprocessableEntityException('OTP has expired');
    }
    const parsedOtp = JSON.parse(existingOtp);

    if (parsedOtp.otp !== otp) {
      throw new UnprocessableEntityException('Invalid OTP');
    }
    const password = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(password, 10);

    if (parsedOtp.otp === otp) {
      await this.redis.del(`otp:${email}`);

      const user = await this.prisma.user.create({
        data: {
          email,
          role: 'ACADEMY_ADMIN',
          // Becomes ACTIVE on first login.
          status: 'INACTIVE',
          password: hashedPassword,
          name: parsedOtp.name,
          tenantId: parseInt(parsedOtp.tenantId),
          academyAdminAcademy: {
            connect: { tenantId: parseInt(parsedOtp.tenantId) },
          },
        },
      });

      await this.prisma.academy.update({
        where: { tenantId: parseInt(parsedOtp.tenantId) },
        data: { academyAdminId: user.id },
      });

      const emailOptions = {
        to: email,
        subject: 'Your Account Has Been Created',
        text: `Your account has been created successfully.
                 Your login details are:
                  Email:${email}
                  Password:${password}`,
      };

      await this.mail.sendMail(emailOptions);

      return {
        message:
          'email verified successfully, account created. Please check your email for login details.',
      };
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
