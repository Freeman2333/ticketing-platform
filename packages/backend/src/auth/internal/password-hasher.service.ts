import { Injectable } from '@nestjs/common';
import { hash, verify, argon2id } from 'argon2';

// backend-design.md §2/§7: argon2id, not bcrypt.
@Injectable()
export class PasswordHasherService {
  hash(plainPassword: string): Promise<string> {
    return hash(plainPassword, { type: argon2id });
  }

  verify(passwordHash: string, plainPassword: string): Promise<boolean> {
    return verify(passwordHash, plainPassword);
  }
}
