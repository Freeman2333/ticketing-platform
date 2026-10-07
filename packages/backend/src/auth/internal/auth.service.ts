import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokensDto } from '../public/dto/tokens.dto';
import { UserDto } from '../public/dto/user.dto';
import { generateRefreshToken, hashRefreshToken } from './hash-refresh-token.util';
import { RefreshTokensRepository } from './refresh-tokens.repository';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly jwtService: JwtService,
  ) {}

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
}
