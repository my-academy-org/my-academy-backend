import { IsEmail, IsString } from "class-validator";
import { roles } from "../../tenants/dto/create-tenant.dto.js";

export class CreateUserDto {
    @IsString()
    name?: any;
    @IsEmail()
    email: string;
}
