import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { generateOtp } from '../helpers/generateOtp.js';
import { RedisService } from '../redis/redis.service.js';
import { MailService } from '../mail/mail.service.js';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  async addAcademyAdmin(createUserDto: CreateUserDto, tenantId: string) {
    const { name, email } = createUserDto;
    const otp = generateOtp();
    const redisValue: {
      otp: string;
      email: string;
      tenantId: string;
      name: string;
    } = {
      otp: otp,
      email: email,
      tenantId: tenantId,
      name: name,
    };

    const existingTenant = await this.prismaService.tenant.findUnique({
      where: { id: parseInt(tenantId) },
    });

    if (!existingTenant || existingTenant.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        'Tenant is not active or does not exist',
      );
    }
    const externalUser = await this.redisService.get(`otp:${email}`);

    if (externalUser) {
      throw new UnprocessableEntityException(
        'OTP already sent. Please verify within 5 minutes.',
      );
    }
 
    await this.redisService.set(
      `otp:${email}`,
      JSON.stringify(redisValue),
      300,
    );

    const verifyUrl = `https://myacademy.com/verify-otp?email=${encodeURIComponent(email)}`;

    const emailOptions = {
      to: email,
      subject: 'Your OTP for Academy Admin Registration',
      text: `Your OTP is: ${otp}. It will expire in 5 minutes.`,
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
    await this.mailService.sendMail(emailOptions);
    return {
      message: 'OTP sent to email. Please verify within 5 minutes.',
    };
  }



  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
