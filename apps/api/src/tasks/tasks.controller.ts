import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import {
  ApplyTaskDto,
  CreateCommentDto,
  CreateSubmissionDto,
  CreateTaskDto,
  ReviewApplicationDto,
  ReviewSubmissionDto,
  UpdateTaskDto
} from "./dto";
import { TasksService } from "./tasks.service";

@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("tasks")
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(@CurrentUser() user: CurrentUser) {
    return this.tasks.list(user);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: CurrentUser) {
    return this.tasks.findOne(id, user);
  }

  @Roles("ADMIN")
  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: CurrentUser) {
    return this.tasks.create(dto, user);
  }

  @Roles("ADMIN")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(id, dto);
  }

  @Roles("ADMIN")
  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.tasks.delete(id);
  }

  @Roles("ADMIN")
  @Post(":id/complete")
  complete(@Param("id") id: string) {
    return this.tasks.complete(id);
  }

  @Roles("EMPLOYEE")
  @Post(":id/applications")
  apply(
    @Param("id") id: string,
    @Body() dto: ApplyTaskDto,
    @CurrentUser() user: CurrentUser
  ) {
    return this.tasks.apply(id, dto, user);
  }

  @Roles("ADMIN")
  @Patch(":taskId/applications/:applicationId")
  reviewApplication(
    @Param("taskId") taskId: string,
    @Param("applicationId") applicationId: string,
    @Body() dto: ReviewApplicationDto
  ) {
    return this.tasks.reviewApplication(taskId, applicationId, dto);
  }

  @Roles("EMPLOYEE")
  @Post(":id/submissions")
  submit(
    @Param("id") id: string,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: CurrentUser
  ) {
    return this.tasks.submit(id, dto, user);
  }

  @Roles("ADMIN")
  @Patch(":taskId/submissions/:submissionId")
  reviewSubmission(
    @Param("taskId") taskId: string,
    @Param("submissionId") submissionId: string,
    @Body() dto: ReviewSubmissionDto
  ) {
    return this.tasks.reviewSubmission(taskId, submissionId, dto);
  }

  @Post(":id/comments")
  addComment(
    @Param("id") id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: CurrentUser
  ) {
    return this.tasks.addComment(id, dto, user);
  }
}
