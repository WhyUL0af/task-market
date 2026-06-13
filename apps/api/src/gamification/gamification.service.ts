import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ApplicationStatus, Prisma, TaskStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const LEVEL_THRESHOLDS = [0, 300, 700, 1200, 1800];
const MAX_LEVEL = 8;

type CompletionAward = {
  userId: string;
  name: string;
  exp: number;
};

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  calculateLevel(exp: number) {
    for (let index = LEVEL_THRESHOLDS.length - 1; index >= 0; index -= 1) {
      if (exp >= LEVEL_THRESHOLDS[index]) {
        if (index === LEVEL_THRESHOLDS.length - 1) {
          let level = LEVEL_THRESHOLDS.length;
          let threshold = LEVEL_THRESHOLDS[index];
          let step = 700;
          while (exp >= threshold + step) {
            threshold += step;
            step += 100;
            level += 1;
          }
          return Math.min(level, MAX_LEVEL);
        }
        return index + 1;
      }
    }
    return 1;
  }

  nextLevelExp(level: number) {
    if (level >= MAX_LEVEL) {
      let threshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
      let step = 700;
      for (let current = LEVEL_THRESHOLDS.length; current < MAX_LEVEL; current += 1) {
        threshold += step;
        step += 100;
      }
      return threshold;
    }
    if (level < LEVEL_THRESHOLDS.length) {
      return LEVEL_THRESHOLDS[level];
    }
    let threshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    let step = 700;
    for (let current = LEVEL_THRESHOLDS.length; current < level + 1; current += 1) {
      threshold += step;
      step += 100;
    }
    return threshold;
  }

  async profile(employeeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: employeeId },
      include: {
        badges: { include: { badge: true }, orderBy: { earnedAt: "desc" } },
        expTransactions: { orderBy: { createdAt: "desc" }, take: 10 }
      }
    });
    if (!user) {
      throw new NotFoundException("Employee not found");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      exp: user.xp,
      level: user.level,
      nextLevelExp: this.nextLevelExp(user.level),
      badges: user.badges,
      activeBadge: user.badges.find((item) => item.active)?.badge ?? null,
      recentExp: user.expTransactions
    };
  }

  async equipBadge(userId: string, badgeId: string | null) {
    if (badgeId) {
      const userBadge = await this.prisma.userBadge.findUnique({
        where: {
          userId_badgeId: {
            userId,
            badgeId
          }
        }
      });
      if (!userBadge) {
        throw new BadRequestException("雿??芾圾??銝??迨?停");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userBadge.updateMany({
        where: { userId },
        data: { active: false }
      });

      if (badgeId) {
        await tx.userBadge.update({
          where: {
            userId_badgeId: {
              userId,
              badgeId
            }
          },
          data: { active: true }
        });
      }
    });

    return this.profile(userId);
  }

  async badges() {
    await this.ensureDefaults();
    return this.prisma.badge.findMany({ orderBy: { name: "asc" } });
  }

  async weeklyChallenges(userId?: string) {
    await this.ensureDefaults();
    const weekStart = this.weekStart(new Date());
    const challenges = await this.prisma.weeklyChallenge.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" }
    });
    if (!userId) {
      return challenges.map((challenge) => ({
        ...challenge,
        progress: 0,
        completed: false
      }));
    }

    return Promise.all(
      challenges.map(async (challenge) => {
        const value = await this.challengeValue(userId, challenge.metric, weekStart);
        const completed = value >= challenge.target;
        const existing = await this.prisma.userChallengeProgress.findUnique({
          where: {
            userId_challengeId_weekStart: {
              userId,
              challengeId: challenge.id,
              weekStart
            }
          }
        });
        const progress = await this.prisma.userChallengeProgress.upsert({
          where: {
            userId_challengeId_weekStart: {
              userId,
              challengeId: challenge.id,
              weekStart
            }
          },
          update: {
            value,
            completed,
            completedAt: completed ? new Date() : null
          },
          create: {
            userId,
            challengeId: challenge.id,
            weekStart,
            value,
            completed,
            completedAt: completed ? new Date() : null
          }
        });
        if (completed && !existing?.completed) {
          await this.prisma.$transaction(async (tx) => {
            await this.applyExp(tx, userId, challenge.expReward, {
              reason: `Weekly challenge: ${challenge.title}`
            });
          });
          await this.awardBadge(userId, "WEEKLY_CHALLENGER");
        }
        return { ...challenge, progress: progress.value, completed: progress.completed };
      })
    );
  }

  async completeTask(taskId: string) {
    const completedAt = new Date();
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        requirements: true,
        applications: {
          where: { status: ApplicationStatus.ACCEPTED },
          include: { applicant: true, requirement: true }
        }
      }
    });
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    if (task.status === TaskStatus.DONE) {
      throw new BadRequestException("Task is already completed");
    }

    const awards = this.buildCompletionAwards(task);
    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: { status: TaskStatus.DONE }
      });
      await tx.taskApplication.updateMany({
        where: { taskId, status: ApplicationStatus.ACCEPTED },
        data: {
          completedAt,
          onTime: task.dueAt ? completedAt <= task.dueAt : true
        }
      });

      for (const award of awards) {
        await this.applyExp(tx, award.userId, award.exp, {
          taskId,
          reason: `Completed task: ${task.title}`
        });
      }
    });

    await this.refreshAchievements(awards.map((award) => award.userId));
    await Promise.all(awards.map((award) => this.weeklyChallenges(award.userId)));

    return { taskId, awards };
  }

  async monthlyExpLeaderboard() {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const rows = await this.prisma.expTransaction.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: start } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 20
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: rows.map((row) => row.userId) } },
      select: { id: true, name: true, email: true, level: true, xp: true }
    });
    return rows.map((row) => ({
      user: users.find((user) => user.id === row.userId),
      score: row._sum.amount ?? 0
    }));
  }

  async completionLeaderboard() {
    return this.prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      select: {
        id: true,
        name: true,
        email: true,
        level: true,
        xp: true,
        _count: {
          select: {
            applications: {
              where: {
                status: ApplicationStatus.ACCEPTED,
                completedAt: { not: null }
              }
            }
          }
        }
      },
      orderBy: [{ xp: "desc" }, { name: "asc" }],
      take: 20
    });
  }

  async onTimeLeaderboard() {
    const users = await this.prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      select: {
        id: true,
        name: true,
        email: true,
        level: true,
        xp: true,
        applications: {
          where: {
            status: ApplicationStatus.ACCEPTED,
            completedAt: { not: null }
          },
          select: { id: true, onTime: true }
        }
      }
    });
    return users
      .map((user) => {
        const onTime = user.applications.filter((application) => application.onTime).length;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          level: user.level,
          xp: user.xp,
          score: user.applications.length === 0 ? 0 : Math.round((onTime / user.applications.length) * 100),
          completed: user.applications.length
        };
      })
      .sort((a, b) => b.score - a.score || b.completed - a.completed)
      .slice(0, 20);
  }

  async collaborationLeaderboard() {
    return this.prisma.user.findMany({
      where: {
        role: "EMPLOYEE",
        applications: {
          some: {
            status: ApplicationStatus.ACCEPTED,
            completedAt: { not: null }
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            applications: {
              where: {
                status: ApplicationStatus.ACCEPTED,
                completedAt: { not: null }
              }
            }
          }
        }
      },
      take: 20
    });
  }

  private buildCompletionAwards(task: {
    id: string;
    title: string;
    xpReward: number;
    requirements: Array<{ id: string; xpPercent: number }>;
    applications: Array<{
      applicantId: string;
      requirementId: string | null;
      applicant: { name: string };
    }>;
  }) {
    if (task.applications.length === 0) {
      return [];
    }
    if (task.requirements.length > 0) {
      return task.requirements.flatMap((requirement) => {
        const members = task.applications.filter(
          (application) => application.requirementId === requirement.id
        );
        if (members.length === 0) {
          return [];
        }
        const expPerPerson = Math.round(
          ((task.xpReward * requirement.xpPercent) / 100) / members.length
        );
        return members.map((application) => ({
          userId: application.applicantId,
          name: application.applicant.name,
          exp: expPerPerson
        }));
      });
    }
    const expPerPerson = Math.round(task.xpReward / task.applications.length);
    return task.applications.map((application) => ({
      userId: application.applicantId,
      name: application.applicant.name,
      exp: expPerPerson
    }));
  }

  private async applyExp(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
    data: { taskId?: string; reason: string }
  ) {
    if (amount <= 0) {
      return;
    }
    await tx.expTransaction.create({
      data: {
        userId,
        taskId: data.taskId,
        amount,
        reason: data.reason
      }
    });
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { xp: true }
    });
    if (!user) {
      return;
    }
    const nextExp = user.xp + amount;
    await tx.user.update({
      where: { id: userId },
      data: {
        xp: nextExp,
        level: this.calculateLevel(nextExp)
      }
    });
  }

  private async refreshAchievements(userIds: string[]) {
    await this.ensureDefaults();
    for (const userId of [...new Set(userIds)]) {
      const completedApplications = await this.prisma.taskApplication.findMany({
        where: {
          applicantId: userId,
          status: ApplicationStatus.ACCEPTED,
          completedAt: { not: null }
        }
      });
      const completed = completedApplications.length;
      const onTime = completedApplications.filter((application) => application.onTime).length;

      const badgeCodes = [
        completed >= 1 ? "FIRST_TASK" : null,
        onTime >= 10 ? "ON_TIME_MASTER" : null
      ].filter((code): code is string => !!code);

      for (const code of badgeCodes) {
        await this.awardBadge(userId, code);
      }
    }
  }

  private async awardBadge(userId: string, code: string) {
    const badge = await this.prisma.badge.findUnique({ where: { code } });
    if (!badge) {
      return;
    }
    const activeBadge = await this.prisma.userBadge.findFirst({
      where: { userId, active: true },
      select: { id: true }
    });
    await this.prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      update: {},
      create: { userId, badgeId: badge.id, active: !activeBadge }
    });
  }

  private async ensureDefaults() {
    const badges = [
      ["FIRST_TASK", "首次完成", "第一次完成並通過驗收的任務。", "1st"],
      ["ON_TIME_MASTER", "準時達人", "準時完成 10 次任務。", "10x"],
      ["TEAM_PLAYER", "團隊核心", "參與並完成 5 次多人任務。", "Team"],
      ["ROLE_EXPERT", "技能專家", "在同類技能需求中累積完成 10 次任務。", "Skill"],
      ["WEEKLY_CHALLENGER", "每週挑戰者", "完成任一每週挑戰。", "Week"],
      ["RELIABLE_WORKER", "穩定能手", "完成 5 次任務。", "5x"],
      ["HIGH_VALUE", "高價值貢獻", "累積取得大量 EXP。", "HV"]
    ] as const;

    for (const [code, name, description, icon] of badges) {
      await this.prisma.badge.upsert({
        where: { code },
        update: { name, description, icon },
        create: { code, name, description, icon }
      });
    }

    const challenges = [
      ["WEEKLY_COMPLETE_2", "本週完成 2 個任務", "本週完成並通過驗收 2 個任務。", "completed_tasks", 2, 100],
      ["WEEKLY_ON_TIME_1", "本週準時完成 1 個任務", "本週準時完成並通過驗收 1 個任務。", "on_time_tasks", 1, 50],
      ["WEEKLY_TEAM_1", "本週參與 1 個多人任務", "本週完成 1 個多人協作任務。", "team_tasks", 1, 80]
    ] as const;

    for (const [code, title, description, metric, target, expReward] of challenges) {
      await this.prisma.weeklyChallenge.upsert({
        where: { code },
        update: {
          title,
          description,
          metric,
          target,
          expReward,
          active: true
        },
        create: {
          code,
          title,
          description,
          metric,
          target,
          expReward,
          active: true
        }
      });
    }
  }

  private weekStart(date: Date) {
    const next = new Date(date);
    const day = next.getDay() || 7;
    next.setDate(next.getDate() - day + 1);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private challengeValue(userId: string, metric: string, weekStart: Date) {
    const where = {
      applicantId: userId,
      status: ApplicationStatus.ACCEPTED,
      completedAt: { gte: weekStart }
    };
    if (metric === "on_time_tasks") {
      return this.prisma.taskApplication.count({
        where: {
          ...where,
          onTime: true
        }
      });
    }
    if (metric === "team_tasks") {
      return this.prisma.taskApplication.count({
        where: {
          ...where,
          task: {
            applications: {
              some: {
                status: ApplicationStatus.ACCEPTED,
                applicantId: { not: userId }
              }
            }
          }
        }
      });
    }
    return this.prisma.taskApplication.count({ where });
  }
}

