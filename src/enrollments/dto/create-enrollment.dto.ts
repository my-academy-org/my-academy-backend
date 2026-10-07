import { IsInt } from 'class-validator';

// Manual enrollment by an admin, without an enrollment code.
export class CreateEnrollmentDto {
  @IsInt()
  studentId: number;

  @IsInt()
  courseId: number;
}
