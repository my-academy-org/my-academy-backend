import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { UpdateAuthDto } from './dto/update-auth.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LoginAuthDto } from './dto/login-auth-dto.js';
import * as bcrypt from 'bcrypt';
import { env } from 'prisma/config';
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

  async createStudentAccount(dto: CreateAuthDto, tenantId: number) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('user with this email already exists');
    }

    const hashedPassword = bcrypt.hashSync(dto.password, 10);

    const redisKey = `student:${dto.email}`;

    await this.redis.set(
      redisKey,
      JSON.stringify({ ...dto, password: hashedPassword }),
      3600,
    );

    const otp = generateOtp();

    const verifyUrl = `https://myacademy.com/verify-otp?email=${encodeURIComponent(dto.email)}`;

    const options = {
      to: dto.email,
      subject: 'Verify your student account',
      text: `Your student account has been created. Your OTP is: ${otp}.`,
      html: `
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

    await this.mail.sendMail(options);

    return {
      message:
        'Student account created successfully. Please check your email for verification.',
    };

    //   data: {
    //     name: dto.name,
    //     email: dto.email,
    //     password: hashedPassword,
    //     role: 'STUDENT',
    //     tenantId: tenantId,
    //   },
    // });
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
          email: user.email,
          role: user.role,
          tenantId: user.tenantId || null,
        },
      };
    } catch (error) {
      console.error('LOGIN ERROR:', error);

      throw new UnauthorizedException('Invalid email or password');
    }
  }

  async verifyStudentOtp(email: string, otp: string) {
    const storedOtp = await this.redis.get(`student:${email}`);

    if (!storedOtp) {
      throw new BadRequestException('OTP has expired');
    }

    const parsedOtp = JSON.parse(storedOtp);

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
      const storedOtp = await this.redis.get(`otp:${email}`);
  
      if (!storedOtp) {
        throw new UnprocessableEntityException('OTP has expired');
      }
      const parsedOtp = JSON.parse(storedOtp);
  
      if (parsedOtp.otp !== otp) {
        throw new UnprocessableEntityException('Invalid OTP');
      }
      const password = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(password, 10);
  
      if (parsedOtp.otp === otp) {
        await this.redis.del(`otp:${email}`);
  
        await this.prisma.user.create({
          data: {
            email,
            role: 'ACADEMY_ADMIN',
            password: hashedPassword,
            name: parsedOtp.name,
            tenantId: parseInt(parsedOtp.tenantId),
          },
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
