import { TokensDto } from './dto/tokens.dto';
import { UserDto } from './dto/user.dto';

export interface AuthApi {
  validateUser(email: string, password: string): Promise<UserDto | null>;
  issueTokens(user: UserDto): Promise<TokensDto>;
  getUserById(id: string): Promise<UserDto | null>;
}

export const AUTH_API = Symbol('AUTH_API');
