import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(["ADMIN", "EMPLOYEE"])
  role!: "ADMIN" | "EMPLOYEE";
}
