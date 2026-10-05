import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CourseStatus,
  TenantStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { CreateLandingPageDto } from './dto/create-landing-page.dto.js';
import { UpdateLandingPageDto } from './dto/update-landing-page.dto.js';
import { LandingPageResponseDto } from './dto/landing-page-response.dto.js';

export interface AuthUser {
  userId: number;
  role: UserRole;
  tenantId: number | null;
}

@Injectable()
export class LandingPageService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    createLandingPageDto: CreateLandingPageDto,
    user: AuthUser,
    id: number,
  ) {
    if (!user.tenantId && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('You are not assigned to an academy');
    }

    // A super admin has no tenant and may create a landing page for any
    // academy; an academy admin only for the academy of their own tenant.
    const academy = await this.prismaService.academy.findFirst({
      where:
        user.role === UserRole.SUPER_ADMIN
          ? { id }
          : { id, tenantId: user.tenantId! },
      select: {
        id: true,
        landingPage: { select: { id: true } },
        tenant: { select: { id: true, plan: true } },
      },
    });

    if (!academy) {
      throw new NotFoundException('Academy not found');
    }

    if (academy.landingPage) {
      throw new ConflictException('This academy already has a landing page');
    }

    const userPlan = academy.tenant;

    if (userPlan?.plan === 'BASIC'&& user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Your current plan does not allow creating a landing page. Please upgrade your plan to create a landing page.',
      );
    }

    const landingPage = await this.prismaService.landingPage.create({
      data: { ...createLandingPageDto, academyId: academy.id },
    });

    return { message: 'Landing page created successfully', landingPage };
  }

  findAll(user: AuthUser) {
    // A super admin has no tenant and sees every academy's landing page.
    const where: Prisma.LandingPageWhereInput =
      user.role === UserRole.SUPER_ADMIN ? {} : this.tenantFilter(user);

    return this.prismaService.landingPage.findMany({
      where,
      include: {
        academy: {
          select: { id: true, name: true, tenant: { select: { slug: true } } },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async findBySlug(slug: string): Promise<LandingPageResponseDto> {
    const tenant = await this.prismaService.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        status: true,
        academy: {
          select: {
            id: true,
            name: true,
            description: true,
            logoUrl: true,
            phone: true,
            email: true,
            address: true,
            template: {
              select: { type: true, name: true },
            },
            landingPage: {
              select: {
                published: true,
                heroTitle: true,
                heroDescription: true,
                heroImageUrl: true,
                aboutTitle: true,
                aboutDescription: true,
                instructorName: true,
                instructorBio: true,
                instructorImage: true,
                qualifications: true,
                experienceYears: true,
                features: true,
                contactEmail: true,
                contactPhone: true,
                contactAddress: true,
                footerText: true,
              },
            },
          },
        },
        courses: {
          where: { status: CourseStatus.PUBLISHED },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            order: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Academy "${slug}" not found`);
    }

    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new ForbiddenException(`Academy "${slug}" is not available`);
    }

    const { academy } = tenant;
    if (!academy) {
      throw new NotFoundException(`Tenant "${slug}" has no academy yet`);
    }

    const { template, landingPage, ...academyInfo } = academy;

    let publicLandingPage: LandingPageResponseDto['landingPage'] = null;
    if (landingPage?.published) {
      const { published: _published, ...content } = landingPage;
      publicLandingPage = content;
    }

    return {
      tenantId: tenant.id,
      academy: academyInfo,
      template,
      landingPage: publicLandingPage,
      courses: tenant.courses,
    };
  }

  async update(
    id: number,
    updateLandingPageDto: UpdateLandingPageDto,
    user: AuthUser,
  ) {
    // A super admin has no tenant and may edit any academy's landing page.
    const where: Prisma.LandingPageWhereInput =
      user.role === UserRole.SUPER_ADMIN
        ? { id }
        : { id, ...this.tenantFilter(user) };

    const { count } = await this.prismaService.landingPage.updateMany({
      where,
      data: updateLandingPageDto,
    });
    if (!count) {
      throw new NotFoundException(`Landing page #${id} not found`);
    }

    return { message: 'Landing page updated successfully' };
  }

  async remove(id: number, user: AuthUser) {
    // A super admin has no tenant and may delete any academy's landing page.
    const where: Prisma.LandingPageWhereInput =
      user.role === UserRole.SUPER_ADMIN
        ? { id }
        : { id, ...this.tenantFilter(user) };

    const { count } = await this.prismaService.landingPage.deleteMany({
      where,
    });
    if (!count) {
      throw new NotFoundException(`Landing page #${id} not found`);
    }

    return { message: 'Landing page deleted successfully' };
  }

  private tenantFilter(user: AuthUser): Prisma.LandingPageWhereInput {
    if (!user.tenantId) {
      throw new ForbiddenException('You are not assigned to an academy');
    }
    return { academy: { tenantId: user.tenantId } };
  }
}
