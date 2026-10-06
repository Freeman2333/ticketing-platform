import { Module } from '@nestjs/common';
import { AuthController } from './internal/auth.controller';
import { AuthService } from './internal/auth.service';
import { RefreshTokensRepository } from './internal/refresh-tokens.repository';
import { UsersRepository } from './internal/users.repository';

// Controllers/services/repositories land under internal/ (never imported
// from outside this module); the AuthApi interface + DTOs other modules
// are allowed to depend on land under public/ (backend-design.md §3).
@Module({
  controllers: [AuthController],
  providers: [AuthService, UsersRepository, RefreshTokensRepository],
})
export class AuthModule {}
