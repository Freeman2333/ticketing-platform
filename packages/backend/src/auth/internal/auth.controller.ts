import { Body, Controller, Post, Res } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import {
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_TTL_MS,
} from './auth.constants';
import { AuthService } from './auth.service';
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
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_TTL_MS,
    });
    return { accessToken: tokens.accessToken, user };
  }
}
