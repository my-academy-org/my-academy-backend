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

  async create(createLandingPageDto: CreateLandingPageDto, user: AuthUser) {

    if (!user.tenantId) {
      throw new ForbiddenException('You are not assigned to an academy');
    }

    const academy = await this.prismaService.academy.findUnique({
      where: { tenantId: user.tenantId },
      select: { id: true, landingPage: { select: { id: true } } },
    });
    
    if (!academy) {
      throw new NotFoundException('Academy not found');
    }
    if (academy.landingPage) {
      throw new ConflictException('This academy already has a landing page');
    }

    const landingPage = await this.prismaService.landingPage.create({
      data: { ...createLandingPageDto, academyId: academy.id },
    });

    return { message: 'Landing page created successfully', landingPage };
  }

  findAll(user: AuthUser) {
    return this.prismaService.landingPage.findMany({
      where: this.tenantFilter(user),
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
    const { count } = await this.prismaService.landingPage.updateMany({
      where: { id, ...this.tenantFilter(user) },
      data: updateLandingPageDto,
    });
    if (!count) {
      throw new NotFoundException(`Landing page #${id} not found`);
    }

    return { message: 'Landing page updated successfully' };
  }

  async remove(id: number, user: AuthUser) {
    const { count } = await this.prismaService.landingPage.deleteMany({
      where: { id, ...this.tenantFilter(user) },
    });
    if (!count) {
      throw new NotFoundException(`Landing page #${id} not found`);
    }

    return { message: 'Landing page deleted successfully' };
  }


  private tenantFilter(user: AuthUser): Prisma.LandingPageWhereInput {
    if (user.role === UserRole.SUPER_ADMIN) return {};
    if (!user.tenantId) {
      throw new ForbiddenException('You are not assigned to an academy');
    }
    return { academy: { tenantId: user.tenantId } };
  }
}
