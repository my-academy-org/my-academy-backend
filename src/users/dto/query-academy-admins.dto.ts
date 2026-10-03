import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { UserStatus } from '../../../generated/prisma/enums.js';

export class QueryAcademyAdminsDto {
  // INACTIVE = invited but has not logged in yet.
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  // Matches owner name, email or academy name.
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}
