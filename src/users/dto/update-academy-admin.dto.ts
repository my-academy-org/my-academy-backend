import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateAcademyAdminDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
