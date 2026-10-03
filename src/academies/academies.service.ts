import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TenantStatus, UserRole, UserStatus } from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import { UpdateAcademyDto } from './dto/update-academy.dto.js';
import { QueryAcademiesDto } from './dto/query-academies.dto.js';

const ownerSelect = { id: true, name: true, email: true } as const;

const tenantSelect = {
  id: true,
  slug: true,
  plan: true,
  status: true,
  // Fallback owner when academyAdminId is not linked yet.
  users: {
    where: { role: UserRole.ACADEMY_ADMIN },
    orderBy: { id: 'asc' },
    take: 1,
    select: ownerSelect,
  },
} satisfies Prisma.TenantSelect;

// Shared by the list and details views.
const academySelect = {
  id: true,
  name: true,
  logoUrl: true,
  createdAt: true,
  template: { select: { id: true, name: true, type: true } },
  academyAdmin: { select: ownerSelect },
  tenant: { select: tenantSelect },
} satisfies Prisma.AcademySelect;

type AcademyRow = Prisma.AcademyGetPayload<{ select: typeof academySelect }>;

@Injectable()
export class AcademiesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(query: QueryAcademiesDto) {
    const { status, page, limit } = query;
    const baseWhere = this.buildWhere(query);
    const withStatus = (tenantStatus: TenantStatus): Prisma.AcademyWhereInput => ({
      AND: [baseWhere, { tenant: { status: tenantStatus } }],
    });
    const where = status ? withStatus(status) : baseWhere;

    // Counts ignore the status filter so the tabs always show every status.
    const [academies, total, all, active, inactive, suspended] =
      await this.prismaService.$transaction([
        this.prismaService.academy.findMany({
          where,
          select: academySelect,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prismaService.academy.count({ where }),
        this.prismaService.academy.count({ where: baseWhere }),
        this.prismaService.academy.count({
          where: withStatus(TenantStatus.ACTIVE),
        }),
        this.prismaService.academy.count({
          where: withStatus(TenantStatus.INACTIVE),
        }),
        this.prismaService.academy.count({
          where: withStatus(TenantStatus.SUSPENDED),
        }),
      ]);

    return {
      counts: { all, active, inactive, suspended },
      data: academies.map((academy) => this.toListItem(academy)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Platform-wide numbers for the super admin dashboard.
  async getStatistics() {
    const [tenantsByStatus, owners, pendingOwners, students, courses] =
      await this.prismaService.$transaction([
        this.prismaService.tenant.groupBy({
          by: ['status'],
          where: { academy: { isNot: null } },
          orderBy: { status: 'asc' },
          _count: { _all: true },
        }),
        this.prismaService.user.count({
          where: { role: UserRole.ACADEMY_ADMIN },
        }),
        this.prismaService.user.count({
          where: { role: UserRole.ACADEMY_ADMIN, status: UserStatus.INACTIVE },
        }),
        this.prismaService.user.count({ where: { role: UserRole.STUDENT } }),
        this.prismaService.course.count(),
      ]);

    const academiesWith = (status: TenantStatus) =>
      tenantsByStatus.find((group) => group.status === status)?._count._all ??
      0;
    const active = academiesWith(TenantStatus.ACTIVE);
    const inactive = academiesWith(TenantStatus.INACTIVE);
    const suspended = academiesWith(TenantStatus.SUSPENDED);
    const total = active + inactive + suspended;

    return {
      academies: {
        total,
        active,
        inactive,
        suspended,
        activePercentage: total ? Math.round((active / total) * 100) : 0,
      },
      owners: { total: owners, pendingFirstLogin: pendingOwners },
      students: { total: students },
      courses: {
        total: courses,
        averagePerAcademy: total ? Math.round(courses / total) : 0,
      },
    };
  }

  async findOne(id: number) {
    const academy = await this.prismaService.academy.findUnique({
      where: { id },
      select: {
        ...academySelect,
        description: true,
        phone: true,
        email: true,
        address: true,
        updatedAt: true,
        landingPage: { select: { id: true, published: true } },
        tenant: {
          select: {
            ...tenantSelect,
            _count: {
              select: {
                courses: true,
                lessons: true,
                enrollments: true,
                users: { where: { role: UserRole.STUDENT } },
              },
            },
          },
        },
      },
    });

    if (!academy) {
      throw new NotFoundException(`Academy #${id} not found`);
    }

    const { description, phone, email, address, updatedAt, landingPage } =
      academy;
    const { users: students, ...counts } = academy.tenant._count;

    return {
      ...this.toListItem(academy),
      description,
      phone,
      email,
      address,
      updatedAt,
      landingPage,
      stats: { ...counts, students },
    };
  }

  async update(id: number, updateAcademyDto: UpdateAcademyDto) {
    const { slug, plan, templateId, name, ...academyData } = updateAcademyDto;
    await this.getTenantId(id);

    if (templateId !== undefined) {
      const template = await this.prismaService.template.findUnique({
        where: { id: templateId },
        select: { id: true },
      });
      if (!template) {
        throw new BadRequestException(`Template #${templateId} not found`);
      }
    }

    try {
      await this.prismaService.academy.update({
        where: { id },
        data: {
          ...academyData,
          name,
          template: templateId ? { connect: { id: templateId } } : undefined,
          tenant: { update: { name, slug, plan } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(`Slug "${slug}" is already taken`);
      }
      throw error;
    }

    return {
      message: 'Academy updated successfully',
      academy: await this.findOne(id),
    };
  }

  async setStatus(id: number, status: TenantStatus) {
    const tenantId = await this.getTenantId(id);

    const activating = status === TenantStatus.ACTIVE;

    // The owner is suspended and restored together with the academy.
    await this.prismaService.$transaction([
      this.prismaService.tenant.update({
        where: { id: tenantId },
        data: { status },
      }),
      this.prismaService.user.updateMany({
        where: {
          tenantId,
          role: UserRole.ACADEMY_ADMIN,
          status: activating
            ? UserStatus.SUSPENDED
            : { not: UserStatus.SUSPENDED },
        },
        data: {
          status: activating ? UserStatus.ACTIVE : UserStatus.SUSPENDED,
        },
      }),
    ]);

    return {
      message:
        status === TenantStatus.ACTIVE
          ? 'Academy activated successfully'
          : 'Academy suspended successfully',
      id,
      status,
    };
  }

  // Permanently deletes the academy, its tenant and everything that belongs to it.
  async remove(id: number) {
    const tenantId = await this.getTenantId(id);
    const prisma = this.prismaService;

    // Children first: the schema has no cascading deletes.
    await prisma.$transaction([
      prisma.examAnswer.deleteMany({ where: { attempt: { tenantId } } }),
      prisma.examAttempt.deleteMany({ where: { tenantId } }),
      prisma.questionOption.deleteMany({
        where: { question: { exam: { tenantId } } },
      }),
      prisma.question.deleteMany({ where: { exam: { tenantId } } }),
      prisma.exam.deleteMany({ where: { tenantId } }),
      prisma.lessonProgress.deleteMany({ where: { tenantId } }),
      prisma.enrollment.deleteMany({ where: { tenantId } }),
      prisma.enrollmentCode.deleteMany({ where: { tenantId } }),
      prisma.lesson.deleteMany({ where: { tenantId } }),
      prisma.course.deleteMany({ where: { tenantId } }),
      prisma.notification.deleteMany({ where: { tenantId } }),
      prisma.media.deleteMany({ where: { tenantId } }),
      prisma.contentChangeRequest.deleteMany({ where: { tenantId } }),
      prisma.landingPage.deleteMany({ where: { academyId: id } }),
      prisma.academy.delete({ where: { id } }),
      prisma.user.deleteMany({ where: { tenantId } }),
      prisma.tenant.delete({ where: { id: tenantId } }),
    ]);

    return { message: 'Academy deleted successfully', id };
  }

  // returns the tenantId of the academy, or throws NotFoundException if the academy does not exist.
  private async getTenantId(id: number) {
    const academy = await this.prismaService.academy.findUnique({
      where: { id },
      select: { tenantId: true },
    });
    if (!academy) {
      throw new NotFoundException(`Academy #${id} not found`);
    }
    return academy.tenantId;
  }

  private buildWhere(query: QueryAcademiesDto): Prisma.AcademyWhereInput {
    const where: Prisma.AcademyWhereInput = {};
    const search = query.search?.trim();

    if (query.templateId !== undefined) {
      where.templateId = query.templateId;
    }

    if (search) {
      const owner: Prisma.UserWhereInput = {
        OR: [{ name: { contains: search } }, { email: { contains: search } }],
      };
      where.OR = [
        { name: { contains: search } },
        { tenant: { slug: { contains: search } } },
        { academyAdmin: owner },
        {
          tenant: {
            users: { some: { role: UserRole.ACADEMY_ADMIN, ...owner } },
          },
        },
      ];
    }

    return where;
  }

  private toListItem(academy: AcademyRow) {
    const { tenant, academyAdmin, ...rest } = academy;

    return {
      ...rest,
      tenantId: tenant.id,
      slug: tenant.slug,
      plan: tenant.plan,
      status: tenant.status,
      owner: academyAdmin ?? tenant.users[0] ?? null,
    };
  }
}
