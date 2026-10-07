import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role, User } from '../../generated/prisma/client';
import { TokensDto } from '../public/dto/tokens.dto';
import { UserDto } from '../public/dto/user.dto';
import { generateRefreshToken, hashRefreshToken } from './hash-refresh-token.util';
import { PasswordHasherService } from './password-hasher.service';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { UsersRepository } from './users.repository';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly passwordHasher: PasswordHasherService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    email: string,
    password: string,
    role: Role,
  ): Promise<UserDto> {
    const passwordHash = await this.passwordHasher.hash(password);
    try {
      const user = await this.usersRepository.create(
        email,
        passwordHash,
        role,
      );
      return this.toUserDto(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserDto | null> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) return null;

    const isValid = await this.passwordHasher.verify(
      user.passwordHash,
      password,
    );
    if (!isValid) return null;

    return this.toUserDto(user);
  }

  async issueTokens(user: UserDto): Promise<TokensDto> {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      role: user.role,
    });

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await this.refreshTokensRepository.create(
      user.id,
      hashRefreshToken(refreshToken),
      expiresAt,
    );

    return { accessToken, refreshToken };
  }

  async rotateRefreshToken(refreshToken: string): Promise<TokensDto> {
    const existing = await this.refreshTokensRepository.findByHash(
      hashRefreshToken(refreshToken),
    );
    if (!existing || existing.expiresAt < new Date()) {
      throw new UnauthorizedException();
    }

    await this.refreshTokensRepository.deleteById(existing.id);
    return this.issueTokens(this.toUserDto(existing.user));
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const existing = await this.refreshTokensRepository.findByHash(
      hashRefreshToken(refreshToken),
    );
    if (existing) {
      await this.refreshTokensRepository.deleteById(existing.id);
    }
  }

  private toUserDto(user: User): UserDto {
    return { id: user.id, email: user.email, role: user.role };
  }
}
