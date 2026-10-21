import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsModule } from '../events/events.module';
import { AuthController } from './internal/auth.controller';
import { AuthService } from './internal/auth.service';
import { PasswordHasherService } from './internal/password-hasher.service';
import { RefreshTokensRepository } from './internal/refresh-tokens.repository';
import { UsersRepository } from './internal/users.repository';
import { AUTH_API } from './public/auth-api.interface';

@Module({
  imports: [
    EventsModule,
    JwtModule.registerAsync({
      global: true,
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
    { provide: AUTH_API, useExisting: AuthService },
  ],
  exports: [AUTH_API],
})
export class AuthModule {}
