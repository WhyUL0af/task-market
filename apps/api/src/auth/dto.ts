import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";

export class RegisterDto {
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

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
