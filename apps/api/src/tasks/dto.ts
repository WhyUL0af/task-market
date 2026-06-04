import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

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
  @IsEnum(["EASY", "MEDIUM", "HARD"])
  difficulty?: "EASY" | "MEDIUM" | "HARD";

  @IsOptional()
  @IsInt()
  @Min(0)
  xpReward?: number;

  @IsEnum(["DRAFT", "OPEN"])
  status?: "DRAFT" | "OPEN";
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
  @IsEnum(["EASY", "MEDIUM", "HARD"])
  difficulty?: "EASY" | "MEDIUM" | "HARD";

  @IsOptional()
  @IsInt()
  @Min(0)
  xpReward?: number;

  @IsOptional()
  @IsEnum(["DRAFT", "OPEN", "CANCELLED"])
  status?: "DRAFT" | "OPEN" | "CANCELLED";
}

export class ApplyTaskDto {
  @IsOptional()
  @IsString()
  message?: string;
}

export class ReviewApplicationDto {
  @IsEnum(["APPROVED", "REJECTED"])
  status!: "APPROVED" | "REJECTED";
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
