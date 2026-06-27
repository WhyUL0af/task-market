import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  ApplicationStatus,
  Prisma,
  SubmissionStatus,
  TaskDifficulty,
  TaskStatus
} from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { GamificationService } from "../gamification/gamification.service";
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

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  xp: true,
  level: true,
  badges: {
    include: {
      badge: true
    },
    orderBy: { earnedAt: "desc" as const }
  }
};

const taskInclude = {
  creator: { select: publicUserSelect },
  requirements: {
    include: {
      skills: {
        include: { skillTag: true },
        orderBy: { skillTag: { name: "asc" as const } }
      }
    },
    orderBy: { createdAt: "asc" as const }
  },
  applications: {
    include: {
      applicant: { select: publicUserSelect },
      requirement: {
        include: {
          skills: {
            include: { skillTag: true },
            orderBy: { skillTag: { name: "asc" as const } }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" as const }
  },
  submissions: {
    include: {
      employee: { select: publicUserSelect }
    },
    orderBy: { createdAt: "desc" as const }
  },
  comments: {
    include: {
      author: { select: publicUserSelect }
    },
    orderBy: { createdAt: "asc" as const }
  }
};

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService
  ) {}

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
    const isVisibleMarketplaceTask =
      task.status === TaskStatus.OPEN || task.status === TaskStatus.APPLIED;
    if (
      user.role === "EMPLOYEE" &&
      !isVisibleMarketplaceTask &&
      !task.applications.some((application) => application.applicantId === user.id)
    ) {
      throw new ForbiddenException("You cannot view this task");
    }
    return task;
  }

  async create(dto: CreateTaskDto, user: CurrentUser) {
    await this.validateRequirements(dto.requirements);
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        reward: dto.reward,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        difficulty: dto.difficulty ?? TaskDifficulty.MEDIUM,
        xpReward: dto.xpReward ?? this.defaultXpReward(dto.difficulty),
        status: dto.status ?? TaskStatus.DRAFT,
        creatorId: user.id,
        requirements: dto.requirements?.length
          ? { create: dto.requirements.map((requirement) => this.requirementCreateData(requirement)) }
          : undefined
      },
      include: taskInclude
    });
  }

  async update(id: string, dto: UpdateTaskDto) {
    await this.ensureTask(id);
    await this.validateRequirements(dto.requirements);
    return this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        reward: dto.reward,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        difficulty: dto.difficulty,
        xpReward: dto.xpReward,
        status: dto.status,
        ...(dto.requirements
          ? {
              requirements: {
                deleteMany: {},
                create: dto.requirements.map((requirement) =>
                  this.requirementCreateData(requirement)
                )
              }
            }
          : {})
      },
      include: taskInclude
    });
  }

  async delete(id: string) {
    await this.ensureTask(id);
    await this.prisma.task.delete({ where: { id } });
    return { ok: true };
  }

  async apply(id: string, dto: ApplyTaskDto, user: CurrentUser) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { requirements: { include: { skills: true } } }
    });
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    if (task.status !== TaskStatus.OPEN && task.status !== TaskStatus.APPLIED) {
      throw new BadRequestException("Task is not open for applications");
    }
    const existingApplication = await this.prisma.taskApplication.findFirst({
      where: {
        taskId: id,
        applicantId: user.id
      }
    });
    if (existingApplication) {
      throw new BadRequestException("You have already applied for this task");
    }

    let selectedRequirement:
      | (typeof task.requirements)[number]
      | undefined;
    if (task.requirements.length > 0) {
      selectedRequirement = task.requirements.find((item) => item.id === dto.requirementId);
      if (!selectedRequirement) {
        throw new BadRequestException("Please select a recruitment requirement");
      }
      const acceptedCount = await this.prisma.taskApplication.count({
        where: {
          taskId: id,
          requirementId: selectedRequirement.id,
          status: ApplicationStatus.ACCEPTED
        }
      });
      if (acceptedCount >= selectedRequirement.headcount) {
        throw new BadRequestException("This requirement is already full");
      }
    }

    const skillMatchScore = await this.calculateSkillMatchScore(
      user.id,
      selectedRequirement?.skills.map((item) => item.skillTagId) ?? []
    );

    const application = await this.prisma.taskApplication.create({
      data: {
        taskId: id,
        applicantId: user.id,
        message: dto.message,
        skillMatchScore,
        requirementId: selectedRequirement?.id
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
      where: { id: applicationId },
      include: {
        task: { include: { requirements: true } },
        requirement: true
      }
    });
    if (!application || application.taskId !== taskId) {
      throw new NotFoundException("Application not found");
    }

    return this.prisma.$transaction(async (tx) => {
      let assignedBudget: number | undefined;
      let assignedXp: number | undefined;
      if (dto.status === ApplicationStatus.ACCEPTED && application.requirement) {
        const acceptedCount = await tx.taskApplication.count({
          where: {
            taskId,
            requirementId: application.requirementId,
            status: ApplicationStatus.ACCEPTED,
            id: { not: applicationId }
          }
        });
        if (acceptedCount >= application.requirement.headcount) {
          throw new BadRequestException("This requirement is already full");
        }
        assignedBudget = this.calculateRequirementShare(
          application.task.reward ?? 0,
          application.requirement.budgetPercent,
          application.requirement.headcount
        );
        assignedXp = this.calculateRequirementShare(
          application.task.xpReward,
          application.requirement.xpPercent,
          application.requirement.headcount
        );
      }

      const updated = await tx.taskApplication.update({
        where: { id: applicationId },
        data: {
          status: dto.status as ApplicationStatus,
          assignedBudget,
          assignedXp
        }
      });

      if (dto.status === ApplicationStatus.ACCEPTED) {
        if (application.requirementId) {
          const acceptedForRequirement = await tx.taskApplication.count({
            where: {
              taskId,
              requirementId: application.requirementId,
              status: ApplicationStatus.ACCEPTED
            }
          });
          if (acceptedForRequirement >= (application.requirement?.headcount ?? 1)) {
            await tx.taskApplication.updateMany({
              where: {
                taskId,
                requirementId: application.requirementId,
                status: ApplicationStatus.PENDING
              },
              data: { status: ApplicationStatus.WAITLIST }
            });
          }
        }
        await tx.taskApplication.updateMany({
          where: {
            taskId,
            applicantId: application.applicantId,
            id: { not: applicationId },
            status: ApplicationStatus.PENDING
          },
          data: { status: ApplicationStatus.REJECTED }
        });
        const shouldStartTask = await this.isTaskFullyAssigned(tx, taskId);
        await tx.task.update({
          where: { id: taskId },
          data: {
            status: shouldStartTask ? TaskStatus.IN_PROGRESS : TaskStatus.APPLIED
          }
        });
      }

      return updated;
    });
  }

  async submit(taskId: string, dto: CreateSubmissionDto, user: CurrentUser) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        applications: {
          where: { applicantId: user.id, status: ApplicationStatus.ACCEPTED },
          select: { id: true }
        },
        submissions: {
          orderBy: { createdAt: "desc" }
        }
      }
    });
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    if (task.applications.length === 0) {
      throw new ForbiddenException("Only accepted members can submit work");
    }
    if (task.status !== TaskStatus.IN_PROGRESS && task.status !== TaskStatus.REVIEW) {
      throw new BadRequestException("Task is not in progress");
    }
    if (task.submissions[0]?.status === SubmissionStatus.PENDING) {
      throw new BadRequestException("The latest submission is waiting for review");
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

    const updated = await this.prisma.taskSubmission.update({
      where: { id: submissionId },
      data: { status: dto.status as SubmissionStatus }
    });
    if (dto.status === SubmissionStatus.ACCEPTED) {
      await this.syncTaskReviewStatus(taskId);
      return updated;
    }
    await this.prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.IN_PROGRESS }
    });
    return updated;
  }

  async complete(taskId: string) {
    await this.ensureTaskReadyToClose(taskId);
    return this.gamification.completeTask(taskId);
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

  private async syncTaskReviewStatus(taskId: string) {
    const latestSubmission = await this.prisma.taskSubmission.findFirst({
      where: { taskId },
      select: { status: true },
      orderBy: { createdAt: "desc" }
    });

    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: latestSubmission?.status === SubmissionStatus.REJECTED
          ? TaskStatus.IN_PROGRESS
          : TaskStatus.REVIEW
      }
    });
  }

  private async ensureTaskReadyToClose(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        applications: {
          where: { status: ApplicationStatus.ACCEPTED },
          select: { applicantId: true }
        },
        submissions: {
          select: { status: true, createdAt: true },
          orderBy: { createdAt: "desc" }
        }
      }
    });
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    if (task.status === TaskStatus.DONE) {
      throw new BadRequestException("Task is already completed");
    }

    const acceptedUserIds = [...new Set(task.applications.map((item) => item.applicantId))];
    if (acceptedUserIds.length === 0) {
      throw new BadRequestException("No accepted members to close this task");
    }

    if (task.submissions[0]?.status !== SubmissionStatus.ACCEPTED) {
      throw new BadRequestException("The latest submission must be accepted before closing the task");
    }
  }

  private requirementCreateData(requirement: {
    name?: string;
    headcount: number;
    budgetPercent: number;
    xpPercent: number;
    skillTagIds?: string[];
  }) {
    const skillTagIds = [...new Set(requirement.skillTagIds ?? [])];
    return {
      name: requirement.name?.trim() || undefined,
      headcount: requirement.headcount,
      budgetPercent: requirement.budgetPercent,
      xpPercent: requirement.xpPercent,
      skills: skillTagIds.length
        ? {
            create: skillTagIds.map((skillTagId) => ({
              skillTagId
            }))
          }
        : undefined
    };
  }

  private async validateRequirements(
    requirements?: Array<{
      headcount: number;
      budgetPercent: number;
      xpPercent: number;
      skillTagIds?: string[];
    }>
  ) {
    if (!requirements || requirements.length === 0) {
      return;
    }
    const budgetTotal = requirements.reduce((total, item) => total + item.budgetPercent, 0);
    const xpTotal = requirements.reduce((total, item) => total + item.xpPercent, 0);
    if (budgetTotal !== 100) {
      throw new BadRequestException("Recruitment requirement budget percentages must total 100");
    }
    if (xpTotal !== 100) {
      throw new BadRequestException("Recruitment requirement EXP percentages must total 100");
    }
    const skillTagIds = requirements.flatMap((item) => item.skillTagIds ?? []);
    await this.validateSkillTags(skillTagIds);
  }

  private async validateSkillTags(skillTagIds?: string[]) {
    if (!skillTagIds || skillTagIds.length === 0) {
      return;
    }
    const uniqueSkillTagIds = [...new Set(skillTagIds)];
    const tags = await this.prisma.profileTag.findMany({
      where: {
        id: { in: uniqueSkillTagIds },
        type: "SKILL"
      },
      select: { id: true }
    });
    if (tags.length !== uniqueSkillTagIds.length) {
      throw new BadRequestException("Task skill requirements must use skill tags");
    }
  }

  private async calculateSkillMatchScore(userId: string, requiredSkillTagIds: string[]) {
    if (requiredSkillTagIds.length === 0) {
      return null;
    }
    const userTags = await this.prisma.userProfileTag.findMany({
      where: {
        userId,
        tag: { type: "SKILL" }
      },
      select: { tagId: true }
    });
    const userSkillIds = new Set(userTags.map((item) => item.tagId));
    const matched = requiredSkillTagIds.filter((id) => userSkillIds.has(id)).length;
    return Math.round((matched / requiredSkillTagIds.length) * 100);
  }

  private calculateRequirementShare(total: number, percent: number, headcount: number) {
    if (total <= 0 || percent <= 0 || headcount <= 0) {
      return 0;
    }
    return Math.round((total * percent) / 100 / headcount);
  }

  private async isTaskFullyAssigned(tx: Prisma.TransactionClient, taskId: string) {
    const requirements = await tx.taskRequirement.findMany({
      where: { taskId },
      select: { id: true, headcount: true }
    });
    if (requirements.length === 0) {
      return true;
    }
    const acceptedCounts = await Promise.all(
      requirements.map(async (requirement) => ({
        requirementId: requirement.id,
        required: requirement.headcount,
        accepted: await tx.taskApplication.count({
          where: {
            taskId,
            requirementId: requirement.id,
            status: ApplicationStatus.ACCEPTED
          }
        })
      }))
    );
    return acceptedCounts.every((item) => item.accepted >= item.required);
  }

  private defaultXpReward(difficulty?: "EASY" | "MEDIUM" | "HARD") {
    const rewards = {
      EASY: 100,
      MEDIUM: 250,
      HARD: 500
    };
    return rewards[difficulty ?? "MEDIUM"];
  }

}
