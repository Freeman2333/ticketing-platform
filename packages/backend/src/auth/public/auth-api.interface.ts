import { TokensDto } from './dto/tokens.dto';
import { UserDto } from './dto/user.dto';

// Cross-module contract (backend-design.md §2/§4). Other modules depend on
// this interface via the AUTH_API DI token, never on AuthService directly -
// same pattern as EventsApi/EVENTS_API.
export interface AuthApi {
  validateUser(email: string, password: string): Promise<UserDto | null>;
  issueTokens(user: UserDto): Promise<TokensDto>;
  getUserById(id: string): Promise<UserDto | null>;
}

export const AUTH_API = Symbol('AUTH_API');
