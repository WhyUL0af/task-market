import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength
} from "class-validator";

export class CreateUserDto {
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
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: "Password must contain at least one letter and one number"
  })
  password?: string;

  @IsOptional()
  @IsEnum(["ADMIN", "EMPLOYEE"])
  role?: "ADMIN" | "EMPLOYEE";

  @IsOptional()
  @IsInt()
  @Min(0)
  xp?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  level?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillTagIds?: string[];
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  bio?: string;

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

  @IsEnum(["SKILL"])
  type!: "SKILL";
}

export class UpdateProfileTagDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(["SKILL"])
  type?: "SKILL";
}
