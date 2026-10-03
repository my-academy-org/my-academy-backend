import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { generateOtp } from '../helpers/generateOtp.js';
import { RedisService } from '../redis/redis.service.js';
import { MailService } from '../mail/mail.service.js';
import {
  TenantStatus,
  UserRole,
  UserStatus,
} from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import { QueryAcademyAdminsDto } from './dto/query-academy-admins.dto.js';
import { UpdateAcademyAdminDto } from './dto/update-academy-admin.dto.js';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const adminAcademySelect = {
  id: true,
  name: true,
  tenant: { select: { slug: true, status: true } },
} satisfies Prisma.AcademySelect;

const academyAdminSelect = {
  id: true,
  name: true,
  email: true,
  status: true,
  createdAt: true,
  academyAdminAcademy: { select: adminAcademySelect },
} satisfies Prisma.UserSelect;

// Academy.academyAdminId is the source of truth for who owns an academy.
const academyWithAdminSelect = {
  id: true,
  name: true,
  tenant: { select: { slug: true, status: true } },
  academyAdmin: {
    select: { id: true, name: true, email: true, status: true, createdAt: true },
  },
} satisfies Prisma.AcademySelect;

type AcademyAdminRow = Prisma.UserGetPayload<{
  select: typeof academyAdminSelect;
}>;

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

    const existingAdmin = await this.prismaService.user.findFirst({
      where: { tenantId: existingTenant.id, role: 'ACADEMY_ADMIN' },
      select: { id: true },
    });

    if (existingAdmin) {
      throw new UnprocessableEntityException(
        'This academy already has an admin',
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


    const verifyUrl = `https://my-academy.online/verify-otp?email=${encodeURIComponent(email)}&role=ACADEMY_ADMIN`;

    const emailOptions = {
      to: email,
      subject: 'Your OTP for Academy Admin Registration',
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
    await this.mailService.sendMail(emailOptions);
    return {
      message: 'OTP sent to email. Please verify within 5 minutes.',
    };
  }



  async findAcademyAdmins(query: QueryAcademyAdminsDto) {
    const { status, page, limit } = query;
    const search = query.search?.trim();
    // Academies without an admin are left out.
    const where: Prisma.AcademyWhereInput = { academyAdminId: { not: null } };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { academyAdmin: { name: { contains: search } } },
        { academyAdmin: { email: { contains: search } } },
      ];
    }

    // Single query: academies joined with their admin.
    // Counts, status filter and pagination are derived from this one result.
    const academies = await this.prismaService.academy.findMany({
      where,
      select: academyWithAdminSelect,
      orderBy: { createdAt: 'desc' },
    });

    const countByStatus = (userStatus: UserStatus) =>
      academies.filter((academy) => academy.academyAdmin?.status === userStatus)
        .length;

    const filtered = status
      ? academies.filter((academy) => academy.academyAdmin?.status === status)
      : academies;
    const total = filtered.length;

    return {
      counts: {
        all: academies.length,
        active: countByStatus(UserStatus.ACTIVE),
        pending: countByStatus(UserStatus.INACTIVE),
        suspended: countByStatus(UserStatus.SUSPENDED),
      },
      data: filtered
        .slice((page - 1) * limit, page * limit)
        .map(({ tenant, ...academy }) => ({
          ...academy,
          slug: tenant.slug,
          status: tenant.status,
        })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateAcademyAdmin(id: number, dto: UpdateAcademyAdminDto) {
    await this.getAcademyAdmin(id);

    try {
      const admin = await this.prismaService.user.update({
        where: { id },
        data: { name: dto.name, email: dto.email },
        select: academyAdminSelect,
      });

      return {
        message: 'Academy admin updated successfully',
        admin: this.toAcademyAdminItem(admin),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(`Email "${dto.email}" is already in use`);
      }
      throw error;
    }
  }

  // Only for admins who have not logged in yet: issues a new password.
  async resendAcademyAdminInvitation(id: number) {
    const admin = await this.getAcademyAdmin(id);

    if (admin.status !== UserStatus.INACTIVE) {
      throw new UnprocessableEntityException(
        'Invitation can only be resent to an admin who has not logged in yet',
      );
    }

    const password = randomBytes(9).toString('base64url');

    await this.prismaService.user.update({
      where: { id },
      data: { password: await bcrypt.hash(password, 10) },
    });

    await this.mailService.sendMail({
      to: admin.email,
      subject: 'Your Account Has Been Created',
      text: `Your account has been created successfully.
                 Your login details are:
                  Email:${admin.email}
                  Password:${password}`,
    });

    return { message: 'Invitation resent successfully' };
  }

  async setAcademyAdminStatus(
    id: number,
    status: typeof UserStatus.ACTIVE | typeof UserStatus.SUSPENDED,
  ) {
    const admin = await this.getAcademyAdmin(id);
    const academy = admin.academyAdminAcademy;

    if (
      status === UserStatus.ACTIVE &&
      academy?.tenant.status === TenantStatus.SUSPENDED
    ) {
      throw new UnprocessableEntityException(
        'The academy is suspended. Activate the academy to restore its admin.',
      );
    }

    await this.prismaService.user.update({ where: { id }, data: { status } });

    return {
      message:
        status === UserStatus.ACTIVE
          ? 'Account activated successfully'
          : 'Account suspended successfully',
      id,
      status,
    };
  }

  private async getAcademyAdmin(id: number) {
    const admin = await this.prismaService.user.findFirst({
      where: { id, role: UserRole.ACADEMY_ADMIN },
      select: academyAdminSelect,
    });
    if (!admin) {
      throw new NotFoundException(`Academy admin #${id} not found`);
    }
    return admin;
  }

  private toAcademyAdminItem(admin: AcademyAdminRow) {
    const { academyAdminAcademy: academy, ...rest } = admin;

    return {
      ...rest,
      // null = not linked to an academy.
      academy: academy && {
        id: academy.id,
        name: academy.name,
        slug: academy.tenant.slug,
      },
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
