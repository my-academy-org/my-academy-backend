import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RedeemEnrollmentCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  code: string;
}
