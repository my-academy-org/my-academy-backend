import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CourseStatus, UserRole } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../landing-page/landing-page.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { QueryCoursesDto } from './dto/query-courses.dto.js';

const courseSelect = {
  id: true,
  tenantId: true,
  title: true,
  description: true,
  imageUrl: true,
  status: true,
  order: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { lessons: true, exams: true } },
} satisfies Prisma.CourseSelect;

@Injectable()
export class CoursesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createCourseDto: CreateCourseDto, user: AuthUser) {
    const { tenantId: requestedTenantId, ...data } = createCourseDto;
    let tenantId: number;

    // A super admin has no tenant and must say which one the course is for;
    // an academy admin always creates inside their own tenant.
    if (user.role === UserRole.SUPER_ADMIN) {
      if (!requestedTenantId) {
        throw new BadRequestException('tenantId is required');
      }
      const tenant = await this.prismaService.tenant.findUnique({
        where: { id: requestedTenantId },
        select: { id: true },
      });
      if (!tenant) {
        throw new NotFoundException(`Tenant #${requestedTenantId} not found`);
      }
      tenantId = tenant.id;
    } else {
      tenantId = this.requireTenantId(user);
    }

    const course = await this.prismaService.course.create({
      data: { ...data, tenantId },
      select: courseSelect,
    });

    return { message: 'Course created successfully', course };
  }

  async findAll(query: QueryCoursesDto, user: AuthUser) {
    const { page, limit } = query;
    const search = query.search?.trim();

    const where: Prisma.CourseWhereInput = {
      ...this.scope(user),
      ...(search ? { title: { contains: search } } : {}),
    };
    if (user.role === UserRole.SUPER_ADMIN && query.tenantId !== undefined) {
      where.tenantId = query.tenantId;
    }
    // Students are already limited to published courses by scope().
    if (user.role !== UserRole.STUDENT && query.status) {
      where.status = query.status;
    }

    const [courses, total] = await this.prismaService.$transaction([
      this.prismaService.course.findMany({
        where,
        select: courseSelect,
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.course.count({ where }),
    ]);

    return {
      data: courses,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number, user: AuthUser) {
    const course = await this.prismaService.course.findFirst({
      where: { id, ...this.scope(user) },
      select: courseSelect,
    });

    if (!course) {
      throw new NotFoundException(`Course #${id} not found`);
    }

    return course;
  }

  async update(id: number, updateCourseDto: UpdateCourseDto, user: AuthUser) {
    const { count } = await this.prismaService.course.updateMany({
      where: { id, ...this.scope(user) },
      data: updateCourseDto,
    });
    if (!count) {
      throw new NotFoundException(`Course #${id} not found`);
    }

    return {
      message: 'Course updated successfully',
      course: await this.findOne(id, user),
    };
  }

  async remove(id: number, user: AuthUser) {
    const course = await this.prismaService.course.findFirst({
      where: { id, ...this.scope(user) },
      select: {
        _count: {
          select: {
            lessons: true,
            exams: true,
            enrollments: true,
            enrollmentCodes: true,
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException(`Course #${id} not found`);
    }

    // The schema has no cascading deletes, and deleting would wipe student
    // enrollments, so a course in use is archived, not deleted.
    if (Object.values(course._count).some(Boolean)) {
      throw new ConflictException(
        'This course has lessons, exams, enrollments or enrollment codes. Archive it instead.',
      );
    }

    await this.prismaService.course.delete({ where: { id } });

    return { message: 'Course deleted successfully', id };
  }

  // Limits a query to what the user may see: a super admin everything, an
  // academy admin their tenant, a student their tenant's published courses.
  private scope(user: AuthUser): Prisma.CourseWhereInput {
    if (user.role === UserRole.SUPER_ADMIN) {
      return {};
    }

    const tenantId = this.requireTenantId(user);
    return user.role === UserRole.STUDENT
      ? { tenantId, status: CourseStatus.PUBLISHED }
      : { tenantId };
  }

  private requireTenantId(user: AuthUser): number {
    if (!user.tenantId) {
      throw new ForbiddenException('You are not assigned to an academy');
    }
    return user.tenantId;
  }
}
