import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  ApplicationStatus,
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
  assignee: { select: publicUserSelect },
  roleRequirements: {
    include: {
      roleTag: true,
      skillTags: {
        include: {
          skillTag: true
        },
        orderBy: { skillTag: { name: "asc" as const } }
      },
      assignee: { select: publicUserSelect }
    },
    orderBy: { createdAt: "asc" as const }
  },
  applications: {
    include: {
      applicant: { select: publicUserSelect },
      roleRequirement: {
        include: {
          roleTag: true,
          skillTags: {
            include: {
              skillTag: true
            },
            orderBy: { skillTag: { name: "asc" as const } }
          },
          assignee: { select: publicUserSelect }
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
    const isVisibleMarketplaceTask =
      task.status === TaskStatus.OPEN || task.status === TaskStatus.APPLIED;
    if (
      user.role === "EMPLOYEE" &&
      !isVisibleMarketplaceTask &&
      task.assigneeId !== user.id &&
      !task.applications.some((application) => application.applicantId === user.id)
    ) {
      throw new ForbiddenException("You cannot view this task");
    }
    return task;
  }

  async create(dto: CreateTaskDto, user: CurrentUser) {
    await this.validateRoleRequirements(dto.roleRequirements);
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        reward: dto.reward,
        difficulty: dto.difficulty ?? TaskDifficulty.MEDIUM,
        xpReward: dto.xpReward ?? this.defaultXpReward(dto.difficulty),
        status: dto.status ?? TaskStatus.DRAFT,
        creatorId: user.id,
        roleRequirements: dto.roleRequirements
            ? {
              create: dto.roleRequirements.map((item) => ({
                roleTagId: item.roleTagId,
                headcount: item.headcount,
                budgetPercent: item.budgetPercent,
                xpPercent: item.xpPercent,
                skillTags: item.skillTagIds?.length
                  ? {
                      create: item.skillTagIds.map((skillTagId) => ({
                        skillTagId
                      }))
                    }
                  : undefined
              }))
            }
          : undefined
      },
      include: taskInclude
    });
  }

  async update(id: string, dto: UpdateTaskDto) {
    await this.ensureTask(id);
    await this.validateRoleRequirements(dto.roleRequirements);
    return this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        reward: dto.reward,
        difficulty: dto.difficulty,
        xpReward: dto.xpReward,
        status: dto.status,
        ...(dto.roleRequirements
          ? {
              roleRequirements: {
                deleteMany: {},
                create: dto.roleRequirements.map((item) => ({
                  roleTagId: item.roleTagId,
                  headcount: item.headcount,
                  budgetPercent: item.budgetPercent,
                  xpPercent: item.xpPercent,
                  skillTags: item.skillTagIds?.length
                    ? {
                        create: item.skillTagIds.map((skillTagId) => ({
                          skillTagId
                        }))
                      }
                    : undefined
                }))
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
      include: { roleRequirements: true }
    });
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    if (task.status !== TaskStatus.OPEN && task.status !== TaskStatus.APPLIED) {
      throw new BadRequestException("Task is not open for applications");
    }
    if (task.roleRequirements.length > 0 && !dto.roleRequirementId) {
      throw new BadRequestException("Please select a position to apply for");
    }
    const roleRequirement = dto.roleRequirementId
      ? task.roleRequirements.find((item) => item.id === dto.roleRequirementId)
      : null;
    if (dto.roleRequirementId && !roleRequirement) {
      throw new BadRequestException("Position requirement does not belong to this task");
    }
    if (roleRequirement) {
      const acceptedForRole = await this.prisma.taskApplication.count({
        where: {
          taskId: id,
          roleRequirementId: roleRequirement.id,
          status: ApplicationStatus.ACCEPTED
        }
      });
      if (acceptedForRole >= roleRequirement.headcount) {
        throw new BadRequestException("This position is already full");
      }
    }

    const existingApplication = await this.prisma.taskApplication.findFirst({
      where: {
        taskId: id,
        applicantId: user.id,
        roleRequirementId: dto.roleRequirementId ?? null
      }
    });
    if (existingApplication) {
      throw new BadRequestException("You have already applied for this position");
    }

    const application = await this.prisma.taskApplication.create({
      data: {
        taskId: id,
        applicantId: user.id,
        message: dto.message,
        roleRequirementId: dto.roleRequirementId
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
      include: { roleRequirement: true }
    });
    if (!application || application.taskId !== taskId) {
      throw new NotFoundException("Application not found");
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.taskApplication.update({
        where: { id: applicationId },
        data: { status: dto.status as ApplicationStatus }
      });

      if (dto.status === ApplicationStatus.ACCEPTED) {
        if (application.roleRequirementId) {
          const acceptedForRole = await tx.taskApplication.count({
            where: {
              taskId,
              roleRequirementId: application.roleRequirementId,
              status: ApplicationStatus.ACCEPTED
            }
          });
          if (
            application.roleRequirement &&
            acceptedForRole > application.roleRequirement.headcount
          ) {
            throw new BadRequestException("This position is already full");
          }
          if (acceptedForRole === 1) {
            await tx.taskRoleRequirement.update({
              where: { id: application.roleRequirementId },
              data: { assigneeId: application.applicantId }
            });
          }
          if (
            application.roleRequirement &&
            acceptedForRole >= application.roleRequirement.headcount
          ) {
            await tx.taskApplication.updateMany({
              where: {
                taskId,
                id: { not: applicationId },
                roleRequirementId: application.roleRequirementId,
                status: ApplicationStatus.PENDING
              },
              data: { status: ApplicationStatus.REJECTED }
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
        const roleRequirements = await tx.taskRoleRequirement.findMany({
          where: { taskId },
          select: { id: true, headcount: true }
        });
        const acceptedCounts = await Promise.all(
          roleRequirements.map((role) =>
            tx.taskApplication.count({
              where: {
                taskId,
                roleRequirementId: role.id,
                status: ApplicationStatus.ACCEPTED
              }
            })
          )
        );
        const allRolesFilled = roleRequirements.every(
          (role, index) => acceptedCounts[index] >= role.headcount
        );
        await tx.task.update({
          where: { id: taskId },
          data: {
            assigneeId: application.applicantId,
            status: allRolesFilled ? TaskStatus.IN_PROGRESS : TaskStatus.APPLIED
          }
        });
      }

      return updated;
    });
  }

  async allocate(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        roleRequirements: {
          include: {
            skillTags: true,
            applications: {
              where: { status: ApplicationStatus.PENDING },
              include: {
                applicant: {
                  include: {
                    profileTags: { include: { tag: true } },
                    assignedTasks: { select: { status: true } }
                  }
                }
              },
              orderBy: { createdAt: "asc" }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    if (task.roleRequirements.length === 0) {
      throw new BadRequestException("This task does not have position requirements");
    }

    const acceptedUserIds = new Set<string>();
    const acceptedApplicationIds = new Set<string>();
    const scoreUpdates: Array<{
      id: string;
      skillMatchScore: number;
      workloadScore: number;
      completionRateScore: number;
      finalScore: number;
      assignedBudget: number;
      assignedXp: number;
    }> = [];

    for (const role of task.roleRequirements) {
      const assignedBudget = this.calculateShare(
        task.reward ?? 0,
        role.budgetPercent,
        role.headcount
      );
      const assignedXp = this.calculateShare(
        task.xpReward,
        role.xpPercent,
        role.headcount
      );
      const ranked = role.applications
        .map((application) => {
          const scores = this.scoreApplication(
            role.skillTags.map((item) => item.skillTagId),
            application.applicant
          );
          return {
            application,
            ...scores,
            assignedBudget,
            assignedXp
          };
        })
        .sort((a, b) => b.finalScore - a.finalScore);

      let acceptedForRole = 0;
      for (const candidate of ranked) {
        const alreadyAccepted = acceptedUserIds.has(candidate.application.applicantId);
        const shouldAccept = !alreadyAccepted && acceptedForRole < role.headcount;
        if (shouldAccept) {
          acceptedUserIds.add(candidate.application.applicantId);
          acceptedApplicationIds.add(candidate.application.id);
          acceptedForRole += 1;
        }

        scoreUpdates.push({
          id: candidate.application.id,
          skillMatchScore: candidate.skillMatchScore,
          workloadScore: candidate.workloadScore,
          completionRateScore: candidate.completionRateScore,
          finalScore: candidate.finalScore,
          assignedBudget: candidate.assignedBudget,
          assignedXp: candidate.assignedXp
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const update of scoreUpdates) {
        const status = acceptedApplicationIds.has(update.id)
          ? ApplicationStatus.ACCEPTED
          : ApplicationStatus.WAITLIST;
        await tx.taskApplication.update({
          where: { id: update.id },
          data: {
            status,
            skillMatchScore: update.skillMatchScore,
            workloadScore: update.workloadScore,
            completionRateScore: update.completionRateScore,
            finalScore: update.finalScore,
            assignedBudget: status === ApplicationStatus.ACCEPTED ? update.assignedBudget : null,
            assignedXp: status === ApplicationStatus.ACCEPTED ? update.assignedXp : null
          }
        });
      }

      for (const userId of acceptedUserIds) {
        await tx.taskApplication.updateMany({
          where: {
            taskId,
            applicantId: userId,
            id: { notIn: [...acceptedApplicationIds] },
            status: ApplicationStatus.WAITLIST
          },
          data: { status: ApplicationStatus.REJECTED }
        });
      }

      for (const role of task.roleRequirements) {
        const accepted = await tx.taskApplication.findFirst({
          where: {
            taskId,
            roleRequirementId: role.id,
            status: ApplicationStatus.ACCEPTED
          },
          orderBy: { finalScore: "desc" }
        });
        await tx.taskRoleRequirement.update({
          where: { id: role.id },
          data: { assigneeId: accepted?.applicantId ?? null }
        });
      }

      if (acceptedApplicationIds.size > 0) {
        await tx.task.update({
          where: { id: taskId },
          data: {
            assigneeId: [...acceptedUserIds][0],
            status: TaskStatus.IN_PROGRESS
          }
        });
      }
    });

    return this.findOne(taskId, { id: task.creatorId, email: "", role: "ADMIN" });
  }

  async submit(taskId: string, dto: CreateSubmissionDto, user: CurrentUser) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { roleRequirements: true }
    });
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    const isRoleAssignee = task.roleRequirements.some(
      (item) => item.assigneeId === user.id
    );
    if (task.assigneeId !== user.id && !isRoleAssignee) {
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

    const updated = await this.prisma.taskSubmission.update({
      where: { id: submissionId },
      data: { status: dto.status as SubmissionStatus }
    });
    if (dto.status === SubmissionStatus.ACCEPTED) {
      await this.gamification.completeTask(taskId);
      return updated;
    }
    await this.prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.IN_PROGRESS }
    });
    return updated;
  }

  complete(taskId: string) {
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

  private async validateRoleRequirements(
    roleRequirements?: {
      roleTagId: string;
      headcount: number;
      budgetPercent: number;
      xpPercent: number;
      skillTagIds?: string[];
    }[]
  ) {
    if (!roleRequirements) {
      return;
    }
    if (roleRequirements.length === 0) {
      return;
    }

    const totalBudgetPercent = roleRequirements.reduce(
      (sum, item) => sum + item.budgetPercent,
      0
    );
    if (totalBudgetPercent !== 100) {
      throw new BadRequestException("Position budget percentages must equal 100");
    }

    const totalXpPercent = roleRequirements.reduce(
      (sum, item) => sum + item.xpPercent,
      0
    );
    if (totalXpPercent !== 100) {
      throw new BadRequestException("Position XP percentages must equal 100");
    }

    if (roleRequirements.some((item) => item.headcount < 1)) {
      throw new BadRequestException("Position headcount must be at least 1");
    }

    const roleTagIds = roleRequirements.map((item) => item.roleTagId);
    const uniqueRoleTagIds = [...new Set(roleTagIds)];
    if (uniqueRoleTagIds.length !== roleTagIds.length) {
      throw new BadRequestException("Each position can only be added once");
    }

    const tags = await this.prisma.profileTag.findMany({
      where: {
        id: { in: uniqueRoleTagIds },
        type: "ROLE"
      },
      select: { id: true }
    });
    if (tags.length !== uniqueRoleTagIds.length) {
      throw new BadRequestException("Task positions must use position profile tags");
    }

    const skillTagIds = [
      ...new Set(roleRequirements.flatMap((item) => item.skillTagIds ?? []))
    ];
    if (skillTagIds.length > 0) {
      const skillTags = await this.prisma.profileTag.findMany({
        where: {
          id: { in: skillTagIds },
          type: "SKILL"
        },
        select: { id: true }
      });
      if (skillTags.length !== skillTagIds.length) {
        throw new BadRequestException("Skill requirements must use skill profile tags");
      }
    }
  }

  private scoreApplication(
    requiredSkillTagIds: string[],
    applicant: {
      profileTags: Array<{ tagId: string }>;
      assignedTasks: Array<{ status: TaskStatus }>;
    }
  ) {
    const applicantSkillIds = new Set(applicant.profileTags.map((item) => item.tagId));
    const matchedSkillCount = requiredSkillTagIds.filter((id) =>
      applicantSkillIds.has(id)
    ).length;
    const skillMatchScore =
      requiredSkillTagIds.length === 0
        ? 100
        : Math.round((matchedSkillCount / requiredSkillTagIds.length) * 100);

    const activeTaskCount = applicant.assignedTasks.filter((task) =>
      task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.REVIEW
    ).length;
    const workloadScore = Math.max(0, 100 - activeTaskCount * 25);

    const assignedTaskCount = applicant.assignedTasks.length;
    const completedTaskCount = applicant.assignedTasks.filter(
      (task) => task.status === TaskStatus.DONE
    ).length;
    const completionRateScore =
      assignedTaskCount === 0
        ? 100
        : Math.round((completedTaskCount / assignedTaskCount) * 100);

    const finalScore = Math.round(
      (skillMatchScore * 0.5 + workloadScore * 0.3 + completionRateScore * 0.2) *
        100
    ) / 100;

    return {
      skillMatchScore,
      workloadScore,
      completionRateScore,
      finalScore
    };
  }

  private calculateShare(total: number, percent: number, headcount: number) {
    return Math.round((total * percent) / 100 / headcount);
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
