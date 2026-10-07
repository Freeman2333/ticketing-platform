import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import {
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_TTL_MS,
} from './auth.constants';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.register(
      dto.email,
      dto.password,
      dto.role,
    );
    const tokens = await this.authService.issueTokens(user);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException();

    const tokens = await this.authService.issueTokens(user);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, user };
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_TTL_MS,
    });
  }
}
