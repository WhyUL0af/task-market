import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser } from "../auth/current-user.decorator";
import {
  CreateProfileTagDto,
  CreateUserDto,
  UpdateProfileDto,
  UpdateProfileTagDto,
  UpdateUserDto
} from "./dto";

const userSelect = {
  id: true,
  email: true,
  name: true,
  bio: true,
  notificationSettings: true,
  role: true,
  xp: true,
  level: true,
  badges: {
    include: { badge: true },
    orderBy: { earnedAt: "desc" as const }
  },
  profileTags: {
    include: { tag: true },
    orderBy: { tag: { name: "asc" as const } }
  },
  createdAt: true
};

type SelectedUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;

function serializeUser(user: SelectedUser) {
  const { profileTags, ...rest } = user;
  const tags = profileTags.map((item) => item.tag);

  return {
    ...rest,
    skillTags: tags.filter((tag) => tag.type === "SKILL")
  };
}

function normalizeTagName(name: string) {
  return name.trim();
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: "desc" }
    });
    return users.map(serializeUser);
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });
    if (exists) {
      throw new BadRequestException("Email already exists");
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        passwordHash: await bcrypt.hash(dto.password, 10)
      },
      select: userSelect
    });

    return serializeUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (dto.email && dto.email !== user.email) {
      const exists = await this.prisma.user.findUnique({
        where: { email: dto.email }
      });
      if (exists) {
        throw new BadRequestException("Email already exists");
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          email: dto.email,
          name: dto.name,
          role: dto.role,
          xp: dto.xp,
          level: dto.level,
          ...(dto.password
            ? { passwordHash: await bcrypt.hash(dto.password, 10) }
            : {})
        },
        select: userSelect
      });

      if (dto.skillTagIds) {
        await this.replaceUserSkillTags(tx, id, dto.skillTagIds);
      }

      return tx.user.findUniqueOrThrow({
        where: { id },
        select: userSelect
      });
    });
    return serializeUser(updated);
  }

  async me(currentUser: CurrentUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      select: userSelect
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const [
      assignedCount,
      completedCount,
      inProgressCount,
      reviewCount,
      applicationCount,
      submissionCount
    ] = await Promise.all([
      this.prisma.task.count({ where: { assigneeId: currentUser.id } }),
      this.prisma.task.count({
        where: { assigneeId: currentUser.id, status: "DONE" }
      }),
      this.prisma.task.count({
        where: { assigneeId: currentUser.id, status: "IN_PROGRESS" }
      }),
      this.prisma.task.count({
        where: { assigneeId: currentUser.id, status: "REVIEW" }
      }),
      this.prisma.taskApplication.count({
        where: { applicantId: currentUser.id }
      }),
      this.prisma.taskSubmission.count({
        where: { employeeId: currentUser.id }
      })
    ]);

    return {
      ...serializeUser(user),
      stats: {
        assignedCount,
        completedCount,
        inProgressCount,
        reviewCount,
        applicationCount,
        submissionCount,
        completionRate:
          assignedCount === 0 ? 0 : Math.round((completedCount / assignedCount) * 100)
      }
    };
  }

  async updateMe(currentUser: CurrentUser, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { notificationSettings: true }
    });
    if (!existing) {
      throw new NotFoundException("User not found");
    }
    const currentSettings =
      typeof existing.notificationSettings === "object" &&
      existing.notificationSettings !== null &&
      !Array.isArray(existing.notificationSettings)
        ? existing.notificationSettings
        : {};

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: currentUser.id },
        data: {
          name: dto.name,
          bio: dto.bio,
          ...(dto.notificationSettings
            ? {
                notificationSettings: {
                  ...currentSettings,
                  ...dto.notificationSettings
                }
              }
            : {})
        }
      });
    });

    return this.me(currentUser);
  }

  profileTags() {
    return this.prisma.profileTag.findMany({
      where: { type: "SKILL" },
      orderBy: [{ type: "asc" }, { name: "asc" }]
    });
  }

  async createProfileTag(dto: CreateProfileTagDto) {
    const name = normalizeTagName(dto.name);
    if (!name) {
      throw new BadRequestException("Tag name is required");
    }

    return this.prisma.profileTag.create({
      data: {
        name,
        type: "SKILL"
      }
    });
  }

  async updateProfileTag(id: string, dto: UpdateProfileTagDto) {
    await this.ensureProfileTag(id);
    const name = dto.name ? normalizeTagName(dto.name) : undefined;
    if (dto.name !== undefined && !name) {
      throw new BadRequestException("Tag name is required");
    }

    return this.prisma.profileTag.update({
      where: { id },
      data: {
        name,
        type: "SKILL"
      }
    });
  }

  async deleteProfileTag(id: string) {
    const tag = await this.prisma.profileTag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });
    if (!tag) {
      throw new NotFoundException("Profile tag not found");
    }
    if (tag._count.users > 0) {
      throw new BadRequestException("Cannot delete a tag that is in use");
    }

    await this.prisma.profileTag.delete({ where: { id } });
    return { ok: true };
  }

  leaderboard() {
    return this.prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        xp: true,
        level: true,
        badges: {
          include: { badge: true },
          orderBy: { earnedAt: "desc" }
        },
        _count: {
          select: {
            assignedTasks: { where: { status: "DONE" } }
          }
        }
      },
      orderBy: [{ xp: "desc" }, { level: "desc" }, { name: "asc" }],
      take: 20
    });
  }

  async delete(id: string, currentUser: CurrentUser) {
    if (id === currentUser.id) {
      throw new BadRequestException("You cannot delete your own account");
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            createdTasks: true,
            assignedTasks: true,
            applications: true,
            submissions: true,
            comments: true
          }
        }
      }
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const hasHistory = Object.values(user._count).some((count) => count > 0);
    if (hasHistory) {
      throw new BadRequestException(
        "Cannot delete a user that has task history"
      );
    }

    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureProfileTag(id: string) {
    const tag = await this.prisma.profileTag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException("Profile tag not found");
    }
    return tag;
  }

  private async replaceUserSkillTags(
    tx: Prisma.TransactionClient,
    userId: string,
    tagIds: string[]
  ) {
    const uniqueTagIds = [...new Set(tagIds)];
    const tags = await tx.profileTag.findMany({
      where: {
        id: { in: uniqueTagIds },
        type: "SKILL"
      },
      select: { id: true }
    });

    if (tags.length !== uniqueTagIds.length) {
      throw new BadRequestException("Invalid skill tag selection");
    }

    await tx.userProfileTag.deleteMany({
      where: {
        userId,
        tag: { type: "SKILL" }
      }
    });

    if (uniqueTagIds.length > 0) {
      await tx.userProfileTag.createMany({
        data: uniqueTagIds.map((tagId) => ({ userId, tagId })),
        skipDuplicates: true
      });
    }
  }

}
