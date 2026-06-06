import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ApplicationStatus, Prisma, TaskStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const LEVEL_THRESHOLDS = [0, 300, 700, 1200, 1800];

type CompletionAward = {
  userId: string;
  name: string;
  exp: number;
  roleName?: string;
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
          return level;
        }
        return index + 1;
      }
    }
    return 1;
  }

  nextLevelExp(level: number) {
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
        titles: { include: { title: true }, orderBy: { earnedAt: "desc" } },
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
      titles: user.titles,
      activeTitle: user.titles.find((item) => item.active)?.title ?? null,
      recentExp: user.expTransactions
    };
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
        roleRequirements: {
          include: {
            roleTag: true,
            applications: {
              where: { status: ApplicationStatus.ACCEPTED },
              include: { applicant: true }
            }
          }
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
          reason: `Completed task: ${task.title}`,
          roleName: award.roleName
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

  async roleLeaderboard(roleName: string) {
    const rows = await this.prisma.taskApplication.groupBy({
      by: ["applicantId"],
      where: {
        status: ApplicationStatus.ACCEPTED,
        completedAt: { not: null },
        roleRequirement: { roleTag: { name: roleName } }
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: rows.map((row) => row.applicantId) } },
      select: { id: true, name: true, email: true, level: true, xp: true }
    });
    return rows.map((row) => ({
      user: users.find((user) => user.id === row.applicantId),
      score: row._count.id
    }));
  }

  async onTimeLeaderboard() {
    const users = await this.prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      select: {
        id: true,
        name: true,
        email: true,
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
            completedAt: { not: null },
            task: { roleRequirements: { some: { headcount: { gt: 1 } } } }
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
                completedAt: { not: null },
                task: { roleRequirements: { some: { headcount: { gt: 1 } } } }
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
    roleRequirements: Array<{
      xpPercent: number;
      headcount: number;
      roleTag: { name: string };
      applications: Array<{ applicantId: string; applicant: { name: string } }>;
    }>;
  }) {
    if (task.roleRequirements.length === 0) {
      return [];
    }
    const awards: CompletionAward[] = [];
    for (const role of task.roleRequirements) {
      const accepted = role.applications;
      if (accepted.length === 0) {
        continue;
      }
      const roleExp = Math.round((task.xpReward * role.xpPercent) / 100);
      const expPerPerson = Math.round(roleExp / accepted.length);
      for (const application of accepted) {
        awards.push({
          userId: application.applicantId,
          name: application.applicant.name,
          exp: expPerPerson,
          roleName: role.roleTag.name
        });
      }
    }
    return awards;
  }

  private async applyExp(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
    data: { taskId?: string; reason: string; roleName?: string }
  ) {
    if (amount <= 0) {
      return;
    }
    await tx.expTransaction.create({
      data: {
        userId,
        taskId: data.taskId,
        amount,
        reason: data.reason,
        roleName: data.roleName
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
        },
        include: {
          roleRequirement: { include: { roleTag: true } }
        }
      });
      const completed = completedApplications.length;
      const onTime = completedApplications.filter((application) => application.onTime).length;
      const teamTasks = await this.prisma.taskApplication.count({
        where: {
          applicantId: userId,
          status: ApplicationStatus.ACCEPTED,
          completedAt: { not: null },
          task: { roleRequirements: { some: { headcount: { gt: 1 } } } }
        }
      });
      const roleCounts = completedApplications.reduce<Record<string, number>>((counts, application) => {
        const roleName = application.roleRequirement?.roleTag.name;
        if (!roleName) {
          return counts;
        }
        counts[roleName] = (counts[roleName] ?? 0) + 1;
        return counts;
      }, {});
      const hasRoleExpertRole = Object.values(roleCounts).some((count) => count >= 10);

      const badgeCodes = [
        completed >= 1 ? "FIRST_TASK" : null,
        onTime >= 10 ? "ON_TIME_MASTER" : null,
        teamTasks >= 5 ? "TEAM_PLAYER" : null,
        hasRoleExpertRole ? "ROLE_EXPERT" : null
      ].filter((code): code is string => !!code);

      for (const code of badgeCodes) {
        await this.awardBadge(userId, code);
      }

      const titleCodes = [
        completed >= 1 ? "NEW_ADVENTURER" : null,
        onTime >= 10 ? "ON_TIME_PRO" : null,
        this.hasRoleCount(roleCounts, ["frontend", "前端"], 10) ? "FRONTEND_EXPERT" : null,
        this.hasRoleCount(roleCounts, ["backend", "後端"], 10) ? "BACKEND_EXPERT" : null,
        teamTasks >= 5 ? "TEAM_CORE" : null,
        completed >= 20 ? "TASK_MASTER" : null
      ].filter((code): code is string => !!code);
      for (const code of titleCodes) {
        await this.awardTitle(userId, code);
      }
    }
  }

  private async awardBadge(userId: string, code: string) {
    const badge = await this.prisma.badge.findUnique({ where: { code } });
    if (!badge) {
      return;
    }
    await this.prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      update: {},
      create: { userId, badgeId: badge.id }
    });
  }

  private async awardTitle(userId: string, code: string) {
    const title = await this.prisma.title.findUnique({ where: { code } });
    if (!title) {
      return;
    }
    const activeTitle = await this.prisma.userTitle.findFirst({
      where: { userId, active: true },
      select: { id: true }
    });
    await this.prisma.userTitle.upsert({
      where: { userId_titleId: { userId, titleId: title.id } },
      update: {},
      create: { userId, titleId: title.id, active: !activeTitle }
    });
  }

  private async ensureDefaults() {
    const badges = [
      ["FIRST_TASK", "First Task", "首次完成任務", "1st"],
      ["ON_TIME_MASTER", "On Time Master", "準時完成 10 次任務", "10x"],
      ["TEAM_PLAYER", "Team Player", "參與 5 次多人任務", "Team"],
      ["ROLE_EXPERT", "Role Expert", "同一角色完成 10 次任務", "Role"],
      ["WEEKLY_CHALLENGER", "Weekly Challenger", "完成每週挑戰", "Week"]
    ];
    for (const [code, name, description, icon] of badges) {
      await this.prisma.badge.upsert({
        where: { code },
        update: { name, description, icon },
        create: { code, name, description, icon }
      });
    }

    const titles = [
      ["NEW_ADVENTURER", "新人冒險者", "完成第一個任務"],
      ["ON_TIME_PRO", "準時達人", "準時完成任務的可靠夥伴"],
      ["FRONTEND_EXPERT", "Frontend 專家", "前端角色完成度達標"],
      ["BACKEND_EXPERT", "Backend 專家", "後端角色完成度達標"],
      ["TEAM_CORE", "團隊核心", "多人協作任務表現穩定"],
      ["TASK_MASTER", "任務大師", "累積完成大量任務"]
    ];
    for (const [code, name, description] of titles) {
      await this.prisma.title.upsert({
        where: { code },
        update: { name, description },
        create: { code, name, description }
      });
    }

    const challenges = [
      ["WEEKLY_COMPLETE_2", "本週完成 2 個任務", "完成任務數達到 2", "completed_tasks", 2, 100],
      ["WEEKLY_ON_TIME_1", "本週準時完成 1 個任務", "準時完成任務數達到 1", "on_time_tasks", 1, 50],
      ["WEEKLY_TEAM_1", "本週參與 1 個多人任務", "多人協作任務完成數達到 1", "team_tasks", 1, 80]
    ];
    for (const [code, title, description, metric, target, expReward] of challenges) {
      await this.prisma.weeklyChallenge.upsert({
        where: { code: String(code) },
        update: {
          title: String(title),
          description: String(description),
          metric: String(metric),
          target: Number(target),
          expReward: Number(expReward),
          active: true
        },
        create: {
          code: String(code),
          title: String(title),
          description: String(description),
          metric: String(metric),
          target: Number(target),
          expReward: Number(expReward),
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
          task: { roleRequirements: { some: { headcount: { gt: 1 } } } }
        }
      });
    }
    return this.prisma.taskApplication.count({ where });
  }

  private hasRoleCount(roleCounts: Record<string, number>, keywords: string[], target: number) {
    return Object.entries(roleCounts).some(([roleName, count]) => {
      const normalized = roleName.toLowerCase();
      return count >= target && keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
    });
  }
}
