import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { AcademiesModule } from './academies/academies.module.js';
import { CoursesModule } from './courses/courses.module.js';
import { LessonsModule } from './lessons/lessons.module.js';
import { EnrollmentCodesModule } from './enrollment-codes/enrollment-codes.module.js';
import { EnrollmentsModule } from './enrollments/enrollments.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { LandingPageModule } from './landing-page/landing-page.module.js';
import { UploadsModule } from './uploads/uploads.module.js';
import { TenantsModule } from './tenants/tenants.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: '%Vxkbh3K$yu&mIMA',
      appSecret: '4OApWvmd1CBHE$CKN^9I5aD0cmcKEZSxm&S&H%^c^MzMi',
      serviceId: 'my-academy',
    }),
    AuthModule,
    UsersModule,
    AcademiesModule,
    CoursesModule,
    LessonsModule,
    EnrollmentCodesModule,
    EnrollmentsModule,
    AttendanceModule,
    NotificationsModule,
    LandingPageModule,
    UploadsModule,
    TenantsModule,
    // PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
