import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { CreateUserDto, UpdateUserDto } from "./dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
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
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });
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
        createdAt: true
      }
    });

    return user;
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

    return this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        ...(dto.password
          ? { passwordHash: await bcrypt.hash(dto.password, 10) }
          : {})
      },
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
        createdAt: true
      }
    });
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
}
