import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateAuthDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsEnum(['STUDENT'])
  role: 'STUDENT';
  
  @IsEnum(['ACTIVE', 'INACTIVE','SUSPENDED'])
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}
