import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Prisma, Role } from '../../generated/prisma/client';
import { AuthService } from './auth.service';
import { hashRefreshToken } from './hash-refresh-token.util';
import { PasswordHasherService } from './password-hasher.service';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { UsersRepository } from './users.repository';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: { create: jest.Mock; findByEmail: jest.Mock };
  let refreshTokensRepository: {
    create: jest.Mock;
    findByHash: jest.Mock;
    deleteById: jest.Mock;
  };
  let passwordHasher: { hash: jest.Mock; verify: jest.Mock };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    usersRepository = { create: jest.fn(), findByEmail: jest.fn() };
    refreshTokensRepository = {
      create: jest.fn(),
      findByHash: jest.fn(),
      deleteById: jest.fn(),
    };
    passwordHasher = { hash: jest.fn(), verify: jest.fn() };
    jwtService = { sign: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: RefreshTokensRepository, useValue: refreshTokensRepository },
        { provide: PasswordHasherService, useValue: passwordHasher },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('hashes the password and returns a UserDto without the hash', async () => {
      passwordHasher.hash.mockResolvedValue('hashed-password');
      usersRepository.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: Role.attendee,
        createdAt: new Date(),
      });

      const result = await service.register(
        'test@example.com',
        'plain-password',
        Role.attendee,
      );

      expect(passwordHasher.hash).toHaveBeenCalledWith('plain-password');
      expect(usersRepository.create).toHaveBeenCalledWith(
        'test@example.com',
        'hashed-password',
        Role.attendee,
      );
      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        role: Role.attendee,
      });
    });

    it('throws ConflictException when the email is already taken', async () => {
      passwordHasher.hash.mockResolvedValue('hashed-password');
      usersRepository.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.10.0',
        }),
      );

      await expect(
        service.register('test@example.com', 'plain-password', Role.attendee),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows unrelated errors', async () => {
      passwordHasher.hash.mockResolvedValue('hashed-password');
      usersRepository.create.mockRejectedValue(new Error('connection lost'));

      await expect(
        service.register('test@example.com', 'plain-password', Role.attendee),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('validateUser', () => {
    it('returns a UserDto when the email exists and the password matches', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: Role.attendee,
        createdAt: new Date(),
      });
      passwordHasher.verify.mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'plain-password',
      );

      expect(passwordHasher.verify).toHaveBeenCalledWith(
        'hashed-password',
        'plain-password',
      );
      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        role: Role.attendee,
      });
    });

    it('returns null when no user has that email', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser(
        'nobody@example.com',
        'plain-password',
      );

      expect(passwordHasher.verify).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('returns null when the password does not match', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: Role.attendee,
        createdAt: new Date(),
      });
      passwordHasher.verify.mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrong-password',
      );

      expect(result).toBeNull();
    });
  });

  describe('issueTokens', () => {
    it('signs an access token with sub/role and stores a hashed refresh token', async () => {
      jwtService.sign.mockReturnValue('signed-access-token');
      const user = { id: 'user-1', email: 'test@example.com', role: Role.attendee };

      const result = await service.issueTokens(user);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        role: Role.attendee,
      });
      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken).toMatch(/^[0-9a-f]{128}$/);

      expect(refreshTokensRepository.create).toHaveBeenCalledTimes(1);
      const [userId, storedHash, expiresAt] =
        refreshTokensRepository.create.mock.calls[0];
      expect(userId).toBe('user-1');
      expect(storedHash).toBe(hashRefreshToken(result.refreshToken));
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('rotateRefreshToken', () => {
    const storedRow = {
      id: 'token-1',
      user: { id: 'user-1', email: 'test@example.com', role: Role.attendee },
      expiresAt: new Date(Date.now() + 1000),
    };

    it('deletes the old token and issues a new pair when it is valid', async () => {
      refreshTokensRepository.findByHash.mockResolvedValue(storedRow);
      jwtService.sign.mockReturnValue('signed-access-token');

      const result = await service.rotateRefreshToken('raw-refresh-token');

      expect(refreshTokensRepository.deleteById).toHaveBeenCalledWith(
        'token-1',
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        role: Role.attendee,
      });
      expect(result.accessToken).toBe('signed-access-token');
    });

    it('throws UnauthorizedException when the token is not found', async () => {
      refreshTokensRepository.findByHash.mockResolvedValue(null);

      await expect(
        service.rotateRefreshToken('raw-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
      expect(refreshTokensRepository.deleteById).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the token is expired', async () => {
      refreshTokensRepository.findByHash.mockResolvedValue({
        ...storedRow,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.rotateRefreshToken('raw-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
      expect(refreshTokensRepository.deleteById).not.toHaveBeenCalled();
    });
  });

  describe('revokeRefreshToken', () => {
    it('deletes the token when it exists', async () => {
      refreshTokensRepository.findByHash.mockResolvedValue({ id: 'token-1' });

      await service.revokeRefreshToken('raw-refresh-token');

      expect(refreshTokensRepository.deleteById).toHaveBeenCalledWith(
        'token-1',
      );
    });

    it('does nothing when the token does not exist', async () => {
      refreshTokensRepository.findByHash.mockResolvedValue(null);

      await service.revokeRefreshToken('raw-refresh-token');

      expect(refreshTokensRepository.deleteById).not.toHaveBeenCalled();
    });
  });
});
