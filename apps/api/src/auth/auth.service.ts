import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@licoreria/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name as UserRole,
    };

    return { user: authUser, tokens: this.issueTokens(authUser) };
  }

  async refresh(
    refreshToken: string | undefined,
  ): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token ausente');
    }

    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario inactivo o inexistente');
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name as UserRole,
    };
    return { user: authUser, tokens: this.issueTokens(authUser) };
  }

  private issueTokens(user: AuthenticatedUser): AuthTokens {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES') ?? '15m',
    });

    // Rotación de refresh token: cada refresh emite uno nuevo
    const refreshToken = this.jwt.sign(
      { sub: user.id },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES') ?? '7d',
      },
    );

    return { accessToken, refreshToken };
  }
}
