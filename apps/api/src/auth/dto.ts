import { IsEmail, IsEnum, IsString, Matches, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: "Password must contain at least one letter and one number"
  })
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
