import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';


export const enum Plan {
  BASIC = 'BASIC',
  PREMIUM = 'PRO',
}

export const enum roles {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ACADEMIC_ADMIN = 'ACADEMY_ADMIN',
  STUDENT = 'STUDENT',
}
export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsOptional()
  @IsString()
  plan?: Plan;
}