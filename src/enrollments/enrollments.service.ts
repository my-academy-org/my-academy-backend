import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CourseStatus,
  EnrollmentCodeStatus,
  EnrollmentStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../landing-page/landing-page.service.js';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto.js';
import { QueryEnrollmentsDto } from './dto/query-enrollments.dto.js';

const enrollmentSelect = {
  id: true,
  tenantId: true,
  status: true,
  enrolledAt: true,
  completedAt: true,
  course: { select: { id: true, title: true, imageUrl: true } },
  student: { select: { id: true, name: true, email: true } },
  enrollmentCode: { select: { id: true, code: true } },
} satisfies Prisma.EnrollmentSelect;

interface EnrollInput {
  tenantId: number;
  studentId: number;
  courseId: number;
  enrollmentCodeId?: number;
}

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prismaService: PrismaService) {}

  // Manual enrollment by an admin, without an enrollment code.
  async create(createEnrollmentDto: CreateEnrollmentDto, user: AuthUser) {
    const { studentId, courseId } = createEnrollmentDto;

    // An academy admin may only enroll into a course of their own tenant.
    const course = await this.prismaService.course.findFirst({
      where:
        user.role === UserRole.SUPER_ADMIN
          ? { id: courseId }
          : { id: courseId, tenantId: this.requireTenantId(user) },
      select: { id: true, tenantId: true },
    });
    if (!course) {
      throw new NotFoundException(`Course #${courseId} not found`);
    }

    const student = await this.prismaService.user.findFirst({
      where: {
        id: studentId,
        role: UserRole.STUDENT,
        tenantId: course.tenantId,
      },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException(`Student #${studentId} not found`);
    }

    const enrollment = await this.enroll(this.prismaService, {
      tenantId: course.tenantId,
      studentId: student.id,
      courseId: course.id,
    });

    return { message: 'Student enrolled successfully', enrollment };
  }

  // A student enrolls themselves in a course with an enrollment code.
  async redeem(code: string, user: AuthUser) {
    const tenantId = this.requireTenantId(user);

    const enrollmentCode = await this.prismaService.enrollmentCode.findFirst({
      where: { code: code.trim(), tenantId },
      select: {
        id: true,
        status: true,
        courseId: true,
        course: { select: { status: true } },
      },
    });
    if (!enrollmentCode) {
      throw new NotFoundException('Invalid enrollment code');
    }
    if (enrollmentCode.status !== EnrollmentCodeStatus.AVAILABLE) {
      throw new ConflictException('This enrollment code is no longer valid');
    }
    if (enrollmentCode.course.status !== CourseStatus.PUBLISHED) {
      throw new ConflictException('This course is not available');
    }

    const enrollment = await this.prismaService.$transaction(async (tx) => {
      // Claims the code only if it is still available, so two requests
      // racing on the same code cannot both succeed.
      const { count } = await tx.enrollmentCode.updateMany({
        where: {
          id: enrollmentCode.id,
          status: EnrollmentCodeStatus.AVAILABLE,
        },
        data: {
          status: EnrollmentCodeStatus.USED,
          studentId: user.userId,
          usedAt: new Date(),
        },
      });
      if (!count) {
        throw new ConflictException('This enrollment code is no longer valid');
      }

      // A failure here rolls the code back to AVAILABLE.
      return this.enroll(tx, {
        tenantId,
        studentId: user.userId,
        courseId: enrollmentCode.courseId,
        enrollmentCodeId: enrollmentCode.id,
      });
    });

    return { message: 'Enrolled successfully', enrollment };
  }

  async findAll(query: QueryEnrollmentsDto, user: AuthUser) {
    const { page, limit } = query;

    const where: Prisma.EnrollmentWhereInput = { ...this.scope(user) };
    if (query.courseId !== undefined) {
      where.courseId = query.courseId;
    }
    if (user.role !== UserRole.STUDENT && query.studentId !== undefined) {
      where.studentId = query.studentId;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [enrollments, total] = await this.prismaService.$transaction([
      this.prismaService.enrollment.findMany({
        where,
        select: enrollmentSelect,
        orderBy: { enrolledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.enrollment.count({ where }),
    ]);

    return {
      data: enrollments,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number, user: AuthUser) {
    const enrollment = await this.prismaService.enrollment.findFirst({
      where: { id, ...this.scope(user) },
      select: enrollmentSelect,
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment #${id} not found`);
    }

    return enrollment;
  }

  async update(
    id: number,
    updateEnrollmentDto: UpdateEnrollmentDto,
    user: AuthUser,
  ) {
    const { status } = updateEnrollmentDto;

    const { count } = await this.prismaService.enrollment.updateMany({
      where: { id, ...this.scope(user) },
      data: {
        status,
        completedAt: status === EnrollmentStatus.COMPLETED ? new Date() : null,
      },
    });
    if (!count) {
      throw new NotFoundException(`Enrollment #${id} not found`);
    }

    return {
      message: 'Enrollment updated successfully',
      enrollment: await this.findOne(id, user),
    };
  }

  async remove(id: number, user: AuthUser) {
    const { count } = await this.prismaService.enrollment.deleteMany({
      where: { id, ...this.scope(user) },
    });
    if (!count) {
      throw new NotFoundException(`Enrollment #${id} not found`);
    }

    return { message: 'Enrollment deleted successfully', id };
  }


  private async enroll(
    client: Prisma.TransactionClient,
    { tenantId, studentId, courseId, enrollmentCodeId }: EnrollInput,
  ) {
    const existing = await client.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      select: { id: true, status: true },
    });

    if (existing && existing.status !== EnrollmentStatus.CANCELLED) {
      throw new ConflictException('Student is already enrolled in this course');
    }

    if (existing) {
      return client.enrollment.update({
        where: { id: existing.id },
        data: {
          status: EnrollmentStatus.ACTIVE,
          enrolledAt: new Date(),
          completedAt: null,
          enrollmentCodeId,
        },
        select: enrollmentSelect,
      });
    }

    try {
      return await client.enrollment.create({
        data: { tenantId, studentId, courseId, enrollmentCodeId },
        select: enrollmentSelect,
      });
    } catch (error) {
      // Two requests enrolling the same student at the same time.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Student is already enrolled in this course',
        );
      }
      throw error;
    }
  }

  // Limits a query to what the user may see: a super admin everything, an
  // academy admin their tenant, a student their own enrollments.
  private scope(user: AuthUser): Prisma.EnrollmentWhereInput {
    if (user.role === UserRole.SUPER_ADMIN) {
      return {};
    }
    if (user.role === UserRole.STUDENT) {
      return { studentId: user.userId };
    }
    return { tenantId: this.requireTenantId(user) };
  }

  private requireTenantId(user: AuthUser): number {
    if (!user.tenantId) {
      throw new ForbiddenException('You are not assigned to an academy');
    }
    return user.tenantId;
  }
}
