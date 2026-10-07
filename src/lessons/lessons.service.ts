import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import {
  CourseStatus,
  EnrollmentStatus,
  LessonStatus,
  MediaProvider,
  MediaType,
  UserRole,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../landing-page/landing-page.service.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
import { QueryLessonsDto } from './dto/query-lessons.dto.js';
import {
  CreateVideoUploadUrlDto,
  SaveVideoDto,
} from './dto/lesson-video.dto.js';

const UPLOAD_URL_TTL = 60 * 60; 

// Used by the list: leaves out the lesson body and the video.
const lessonSummarySelect = {
  id: true,
  tenantId: true,
  courseId: true,
  title: true,
  description: true,
  duration: true,
  order: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LessonSelect;

const lessonDetailSelect = {
  ...lessonSummarySelect,
  content: true,
  videoUrl: true,
  videoId: true,
  videoType: true,
  mediaId: true,
  course: { select: { id: true, title: true } },
} satisfies Prisma.LessonSelect;

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async create(createLessonDto: CreateLessonDto, user: AuthUser) {
    const { courseId, mediaId, ...data } = createLessonDto;

    const course = await this.findCourse(courseId, user);
    // No lesson without a video that is already saved in the media table.
    const media = await this.findVideo(mediaId, course.tenantId);

    const lesson = await this.prismaService.lesson.create({
      data: {
        ...data,
        duration: data.duration ?? media.duration,
        courseId: course.id,
        tenantId: course.tenantId,
        mediaId: media.id,
        videoId: media.publicId,
        videoType: media.provider,
      },
      select: lessonDetailSelect,
    });

    return { message: 'Lesson created successfully', lesson };
  }

  async findAll(query: QueryLessonsDto, user: AuthUser) {
    const { page, limit } = query;
    const search = query.search?.trim();
    const isStudent = user.role === UserRole.STUDENT;

    const where: Prisma.LessonWhereInput = {
      ...this.scope(user),
      ...(search ? { title: { contains: search } } : {}),
    };
    
    if (query.courseId !== undefined) {
      where.courseId = query.courseId;
    }
    // Students are already limited to published lessons by scope().
    if (!isStudent && query.status) {
      where.status = query.status;
    }

    const [lessons, total] = await this.prismaService.$transaction([
      this.prismaService.lesson.findMany({
        where,
        select: lessonSummarySelect,
        orderBy: [{ courseId: 'asc' }, { order: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.lesson.count({ where }),
    ]);

    const meta = { total, page, limit, totalPages: Math.ceil(total / limit) };
    if (!isStudent) {
      return { data: lessons, meta };
    }

    // Tells the student which lessons they can already open: enrolling in a
    // course unlocks all of its lessons.
    const enrollments = await this.prismaService.enrollment.findMany({
      where: {
        studentId: user.userId,
        courseId: { in: [...new Set(lessons.map((l) => l.courseId))] },
        status: { not: EnrollmentStatus.CANCELLED },
      },
      select: { courseId: true },
    });
    const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));

    return {
      data: lessons.map((lesson) => ({
        ...lesson,
        enrolled: enrolledCourseIds.has(lesson.courseId),
      })),
      meta,
    };
  }

  async findOne(id: number, user: AuthUser) {
    const lesson = await this.prismaService.lesson.findFirst({
      where: { id, ...this.scope(user) },
      select: lessonDetailSelect,
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson #${id} not found`);
    }

    // The lesson body and video are only for students enrolled in its course.
    if (user.role === UserRole.STUDENT) {
      const enrollment = await this.prismaService.enrollment.findFirst({
        where: {
          studentId: user.userId,
          courseId: lesson.courseId,
          status: { not: EnrollmentStatus.CANCELLED },
        },
        select: { id: true },
      });
      if (!enrollment) {
        throw new ForbiddenException('You are not enrolled in this course');
      }
    }

    // Backblaze videos are private and never linked to directly: the player
    // loads them from this API (a path relative to the API base URL).
    if (lesson.videoType === MediaProvider.BACKBLAZE && lesson.videoId) {
      lesson.videoUrl = `/lessons/${lesson.id}/video`;
    }

    return lesson;
  }

  // Opens the lesson's video for streaming. `range` is the request's Range
  // header, which the player sends to seek.
  async openVideo(id: number, user: AuthUser, range?: string) {
    // Applies the same access rules as reading the lesson.
    const lesson = await this.findOne(id, user);
    if (lesson.videoType !== MediaProvider.BACKBLAZE || !lesson.videoId) {
      throw new NotFoundException(`Lesson #${id} has no video`);
    }

    const video = await this.storageService.read(lesson.videoId, range);
    if (!video) {
      throw new NotFoundException(`Lesson #${id} has no video`);
    }
    return video;
  }

  // Step 1 of a video upload: the browser PUTs the file straight to Backblaze
  // with the returned URL, then calls saveVideo() with the key.
  async createVideoUploadUrl(dto: CreateVideoUploadUrlDto, user: AuthUser) {
    const course = await this.findCourse(dto.courseId, user);

    const extension = extname(dto.fileName).toLowerCase();
    const key =
      `tenants/${course.tenantId}/courses/${course.id}/videos/` +
      randomUUID() +
      (/^\.[a-z0-9]{1,5}$/.test(extension) ? extension : '');

    return {
      uploadUrl: await this.storageService.getUploadUrl(
        key,
        dto.contentType,
        UPLOAD_URL_TTL,
      ),
      method: 'PUT',
      headers: { 'Content-Type': dto.contentType },
      key,
      expiresIn: UPLOAD_URL_TTL,
    };
  }


  async saveVideo(dto: SaveVideoDto, user: AuthUser) {
    // Only a key issued by createVideoUploadUrl() is accepted.
    const tenantId = Number(
      /^tenants\/(\d+)\/courses\/\d+\/videos\/[^/]+$/.exec(dto.key)?.[1],
    );
    if (
      !tenantId ||
      (user.role !== UserRole.SUPER_ADMIN &&
        tenantId !== this.requireTenantId(user))
    ) {
      throw new BadRequestException('This key is not valid');
    }

    const file = await this.storageService.head(dto.key);
    if (!file?.size) {
      throw new BadRequestException('The video has not been uploaded yet');
    }

    // Saving the same upload twice returns the same row.
    const media =
      (await this.prismaService.media.findFirst({
        where: { tenantId, publicId: dto.key },
      })) ??
      (await this.prismaService.media.create({
        data: {
          tenantId,
          type: MediaType.VIDEO,
          provider: MediaProvider.BACKBLAZE,
          url: this.storageService.objectUrl(dto.key),
          publicId: dto.key,
          fileName: dto.fileName,
          mimeType: file.type,
          size: file.size,
          duration: dto.duration,
        },
      }));

    return {
      message: 'Video saved successfully',
      // BigInt cannot be sent as JSON.
      media: { ...media, size: Number(media.size) },
    };
  }

  async update(id: number, updateLessonDto: UpdateLessonDto, user: AuthUser) {
    const { mediaId, ...data } = updateLessonDto;

    const lesson = await this.prismaService.lesson.findFirst({
      where: { id, ...this.scope(user) },
      select: { tenantId: true, mediaId: true, videoId: true, videoType: true },
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson #${id} not found`);
    }

    // Replacing the video goes through the media table as well.
    const replaced = mediaId !== undefined && mediaId !== lesson.mediaId;
    const media = replaced
      ? await this.findVideo(mediaId, lesson.tenantId)
      : null;

    await this.prismaService.lesson.update({
      where: { id },
      data: media
        ? {
            ...data,
            mediaId: media.id,
            videoId: media.publicId,
            videoType: media.provider,
            videoUrl: null,
          }
        : data,
    });
    
    if (replaced) {
      await this.deleteVideo(lesson);
    }

    return {
      message: 'Lesson updated successfully',
      lesson: await this.findOne(id, user),
    };
  }

  async remove(id: number, user: AuthUser) {
    const lesson = await this.prismaService.lesson.findFirst({
      where: { id, ...this.scope(user) },
      select: {
        mediaId: true,
        videoId: true,
        videoType: true,
        _count: { select: { progress: true, exams: true } },
      },
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson #${id} not found`);
    }

    // The schema has no cascading deletes, and deleting would wipe student
    // progress, so a lesson in use is archived, not deleted.
    if (lesson._count.progress || lesson._count.exams) {
      throw new ConflictException(
        'This lesson has student progress or exams. Archive it instead.',
      );
    }

    await this.prismaService.lesson.delete({ where: { id } });
    await this.deleteVideo(lesson);

    return { message: 'Lesson deleted successfully', id };
  }

  // An academy admin may only use a course of their own tenant.
  private async findCourse(courseId: number, user: AuthUser) {
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
    return course;
  }

  // The media row of an uploaded video that no lesson uses yet.
  private async findVideo(mediaId: number, tenantId: number) {
    const media = await this.prismaService.media.findFirst({
      where: { id: mediaId, tenantId, type: MediaType.VIDEO },
      select: {
        id: true,
        provider: true,
        publicId: true,
        duration: true,
        lesson: { select: { id: true } },
      },
    });
    if (!media) {
      throw new BadRequestException(
        `Video #${mediaId} not found. Upload the video first.`,
      );
    }
    if (media.lesson) {
      throw new ConflictException(
        `Video #${mediaId} is already used by lesson #${media.lesson.id}`,
      );
    }
    return media;
  }

  // Removes a lesson's old video: its media row and its file. A file left
  // behind on Backblaze must not fail the request.
  private async deleteVideo(lesson: {
    mediaId: number | null;
    videoId: string | null;
    videoType: MediaProvider | null;
  }) {
    if (lesson.mediaId) {
      await this.prismaService.media.delete({ where: { id: lesson.mediaId } });
    }
    if (lesson.videoType !== MediaProvider.BACKBLAZE || !lesson.videoId) {
      return;
    }
    try {
      await this.storageService.delete(lesson.videoId);
    } catch (error) {
      this.logger.warn(`Could not delete video ${lesson.videoId}: ${error}`);
    }
  }

  // Limits a query to what the user may see: a super admin everything, an
  // academy admin their tenant, a student their tenant's published lessons
  // of published courses.
  private scope(user: AuthUser): Prisma.LessonWhereInput {
    if (user.role === UserRole.SUPER_ADMIN) {
      return {};
    }

    const tenantId = this.requireTenantId(user);
    return user.role === UserRole.STUDENT
      ? {
          tenantId,
          status: LessonStatus.PUBLISHED,
          course: { status: CourseStatus.PUBLISHED },
        }
      : { tenantId };
  }

  private requireTenantId(user: AuthUser): number {
    if (!user.tenantId) {
      throw new ForbiddenException('You are not assigned to an academy');
    }
    return user.tenantId;
  }
}
