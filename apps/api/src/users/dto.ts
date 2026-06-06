import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MinLength
} from "class-validator";

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

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsEnum(["ADMIN", "EMPLOYEE"])
  role?: "ADMIN" | "EMPLOYEE";
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillTagIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredRoleIds?: string[];

  @IsOptional()
  @IsObject()
  notificationSettings?: {
    email?: boolean;
    taskUpdates?: boolean;
    reviewResults?: boolean;
  };
}

export class NotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  taskUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  reviewResults?: boolean;
}

export class CreateProfileTagDto {
  @IsString()
  name!: string;

  @IsEnum(["SKILL", "ROLE"])
  type!: "SKILL" | "ROLE";
}

export class UpdateProfileTagDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(["SKILL", "ROLE"])
  type?: "SKILL" | "ROLE";
}
