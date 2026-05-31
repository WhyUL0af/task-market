import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ApplicationStatus, SubmissionStatus, TaskStatus } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import {
  ApplyTaskDto,
  CreateCommentDto,
  CreateSubmissionDto,
  CreateTaskDto,
  ReviewApplicationDto,
  ReviewSubmissionDto,
  UpdateTaskDto
} from "./dto";

const taskInclude = {
  creator: { select: { id: true, name: true, email: true, role: true } },
  assignee: { select: { id: true, name: true, email: true, role: true } },
  applications: {
    include: {
      applicant: { select: { id: true, name: true, email: true, role: true } }
    },
    orderBy: { createdAt: "desc" as const }
  },
  submissions: {
    include: {
      employee: { select: { id: true, name: true, email: true, role: true } }
    },
    orderBy: { createdAt: "desc" as const }
  },
  comments: {
    include: {
      author: { select: { id: true, name: true, email: true, role: true } }
    },
    orderBy: { createdAt: "asc" as const }
  }
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: CurrentUser) {
    if (user.role === "ADMIN") {
      return this.prisma.task.findMany({
        include: taskInclude,
        orderBy: { createdAt: "desc" }
      });
    }

    return this.prisma.task.findMany({
      where: {
        OR: [
          { status: { in: [TaskStatus.OPEN, TaskStatus.APPLIED] } },
          { assigneeId: user.id },
          { applications: { some: { applicantId: user.id } } }
        ]
      },
      include: taskInclude,
      orderBy: { createdAt: "desc" }
    });
  }

  async findOne(id: string, user: CurrentUser) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: taskInclude
    });
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    if (
      user.role === "EMPLOYEE" &&
      task.status !== TaskStatus.OPEN &&
      task.assigneeId !== user.id &&
      !task.applications.some((application) => application.applicantId === user.id)
    ) {
      throw new ForbiddenException("You cannot view this task");
    }
    return task;
  }

  create(dto: CreateTaskDto, user: CurrentUser) {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        reward: dto.reward,
        status: dto.status ?? TaskStatus.DRAFT,
        creatorId: user.id
      },
      include: taskInclude
    });
  }

  async update(id: string, dto: UpdateTaskDto) {
    await this.ensureTask(id);
    return this.prisma.task.update({
      where: { id },
      data: dto,
      include: taskInclude
    });
  }

  async delete(id: string) {
    await this.ensureTask(id);
    await this.prisma.task.delete({ where: { id } });
    return { ok: true };
  }

  async apply(id: string, dto: ApplyTaskDto, user: CurrentUser) {
    const task = await this.ensureTask(id);
    if (task.status !== TaskStatus.OPEN && task.status !== TaskStatus.APPLIED) {
      throw new BadRequestException("Task is not open for applications");
    }

    const application = await this.prisma.taskApplication.create({
      data: {
        taskId: id,
        applicantId: user.id,
        message: dto.message
      }
    });

    if (task.status === TaskStatus.OPEN) {
      await this.prisma.task.update({
        where: { id },
        data: { status: TaskStatus.APPLIED }
      });
    }

    return application;
  }

  async reviewApplication(
    taskId: string,
    applicationId: string,
    dto: ReviewApplicationDto
  ) {
    const application = await this.prisma.taskApplication.findUnique({
      where: { id: applicationId }
    });
    if (!application || application.taskId !== taskId) {
      throw new NotFoundException("Application not found");
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.taskApplication.update({
        where: { id: applicationId },
        data: { status: dto.status as ApplicationStatus }
      });

      if (dto.status === ApplicationStatus.APPROVED) {
        await tx.taskApplication.updateMany({
          where: { taskId, id: { not: applicationId } },
          data: { status: ApplicationStatus.REJECTED }
        });
        await tx.task.update({
          where: { id: taskId },
          data: {
            assigneeId: application.applicantId,
            status: TaskStatus.IN_PROGRESS
          }
        });
      }

      return updated;
    });
  }

  async submit(taskId: string, dto: CreateSubmissionDto, user: CurrentUser) {
    const task = await this.ensureTask(taskId);
    if (task.assigneeId !== user.id) {
      throw new ForbiddenException("Only the assignee can submit work");
    }
    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException("Task is not in progress");
    }

    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.taskSubmission.create({
        data: {
          taskId,
          employeeId: user.id,
          content: dto.content
        }
      });
      await tx.task.update({
        where: { id: taskId },
        data: { status: TaskStatus.REVIEW }
      });
      return submission;
    });
  }

  async reviewSubmission(
    taskId: string,
    submissionId: string,
    dto: ReviewSubmissionDto
  ) {
    const submission = await this.prisma.taskSubmission.findUnique({
      where: { id: submissionId }
    });
    if (!submission || submission.taskId !== taskId) {
      throw new NotFoundException("Submission not found");
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.taskSubmission.update({
        where: { id: submissionId },
        data: { status: dto.status as SubmissionStatus }
      });
      await tx.task.update({
        where: { id: taskId },
        data: {
          status:
            dto.status === SubmissionStatus.ACCEPTED
              ? TaskStatus.DONE
              : TaskStatus.IN_PROGRESS
        }
      });
      return updated;
    });
  }

  addComment(taskId: string, dto: CreateCommentDto, user: CurrentUser) {
    return this.prisma.comment.create({
      data: {
        taskId,
        authorId: user.id,
        content: dto.content
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } }
      }
    });
  }

  private async ensureTask(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    return task;
  }
}
