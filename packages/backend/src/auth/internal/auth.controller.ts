import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';

// Routes (register/login/refresh/logout/me, backend-design.md §5) land
// here in a later step of this plan, once AuthService has methods to call.
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
