import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

export class TaskRequirementDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsInt()
  @Min(1)
  headcount!: number;

  @IsInt()
  @Min(0)
  budgetPercent!: number;

  @IsInt()
  @Min(0)
  xpPercent!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillTagIds?: string[];
}

export class CreateTaskDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  reward?: number;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsEnum(["EASY", "MEDIUM", "HARD"])
  difficulty?: "EASY" | "MEDIUM" | "HARD";

  @IsOptional()
  @IsInt()
  @Min(0)
  xpReward?: number;

  @IsEnum(["DRAFT", "OPEN"])
  status?: "DRAFT" | "OPEN";

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskRequirementDto)
  requirements?: TaskRequirementDto[];
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  reward?: number;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsEnum(["EASY", "MEDIUM", "HARD"])
  difficulty?: "EASY" | "MEDIUM" | "HARD";

  @IsOptional()
  @IsInt()
  @Min(0)
  xpReward?: number;

  @IsOptional()
  @IsEnum(["DRAFT", "OPEN", "CANCELLED"])
  status?: "DRAFT" | "OPEN" | "CANCELLED";

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskRequirementDto)
  requirements?: TaskRequirementDto[];
}

export class ApplyTaskDto {
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  requirementId?: string;
}

export class ReviewApplicationDto {
  @IsEnum(["ACCEPTED", "REJECTED"])
  status!: "ACCEPTED" | "REJECTED";
}

export class CreateSubmissionDto {
  @IsString()
  content!: string;
}

export class ReviewSubmissionDto {
  @IsEnum(["ACCEPTED", "REJECTED"])
  status!: "ACCEPTED" | "REJECTED";
}

export class CreateCommentDto {
  @IsString()
  content!: string;
}
