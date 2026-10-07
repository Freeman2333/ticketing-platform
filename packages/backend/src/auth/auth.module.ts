import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './internal/auth.controller';
import { AuthService } from './internal/auth.service';
import { PasswordHasherService } from './internal/password-hasher.service';
import { RefreshTokensRepository } from './internal/refresh-tokens.repository';
import { UsersRepository } from './internal/users.repository';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersRepository,
    RefreshTokensRepository,
    PasswordHasherService,
  ],
})
export class AuthModule {}
