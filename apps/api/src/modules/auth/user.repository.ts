import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services';
import { newId } from '@learn/db';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.client.user.findFirst({ where: { email, deletedAt: null } });
  }

  findById(id: string) {
    return this.prisma.client.user.findFirst({ where: { id, deletedAt: null } });
  }

  async create(input: {
    email: string;
    passwordHash: string;
    displayName: string;
    locale: string;
  }) {
    return this.prisma.client.user.create({ data: { id: newId(), ...input } });
  }

  async update(id: string, data: { displayName?: string; locale?: 'vi' | 'en' }) {
    return this.prisma.client.user.update({ where: { id }, data });
  }

  async updatePasswordHash(id: string, passwordHash: string) {
    return this.prisma.client.user.update({ where: { id }, data: { passwordHash } });
  }
}
