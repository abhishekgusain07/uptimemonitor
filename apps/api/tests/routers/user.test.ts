import { userRouter } from '../../src/routers/user';
import { createCallerFactory } from '../../src/trpc';

describe('User Router', () => {
  const createCaller = createCallerFactory(userRouter);
  const caller = createCaller({});

  describe('getUser', () => {
    it('should return user data for valid ID', async () => {
      const result = await caller.getUser({ id: 'test-id' });
      
      expect(result).toEqual({
        id: 'test-id',
        name: 'User test-id',
        email: 'usertest-id@example.com',
        createdAt: expect.any(Date),
      });
    });

    it('should handle different user IDs', async () => {
      const result = await caller.getUser({ id: '123' });
      
      expect(result.id).toBe('123');
      expect(result.name).toBe('User 123');
      expect(result.email).toBe('user123@example.com');
    });
  });

  describe('getAllUsers', () => {
    it('should return list of users', async () => {
      const result = await caller.getAllUsers();
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: expect.any(Date),
      });
      expect(result[1]).toEqual({
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        createdAt: expect.any(Date),
      });
    });
  });

  describe('createUser', () => {
    it('should create a new user with valid input', async () => {
      const input = {
        name: 'Test User',
        email: 'test@example.com',
      };
      
      const result = await caller.createUser(input);
      
      expect(result).toEqual({
        id: expect.any(String),
        name: 'Test User',
        email: 'test@example.com',
        createdAt: expect.any(Date),
      });
      expect(result.id.length).toBeGreaterThan(0); // Random ID
    });

    it('should throw error for invalid email', async () => {
      const input = {
        name: 'Test User',
        email: 'invalid-email',
      };
      
      await expect(caller.createUser(input)).rejects.toThrow();
    });

    it('should throw error for empty name', async () => {
      const input = {
        name: '',
        email: 'test@example.com',
      };
      
      await expect(caller.createUser(input)).rejects.toThrow();
    });
  });

  describe('updateUser', () => {
    it('should update user with new data', async () => {
      const input = {
        id: 'test-id',
        name: 'Updated Name',
        email: 'updated@example.com',
      };
      
      const result = await caller.updateUser(input);
      
      expect(result).toEqual({
        id: 'test-id',
        name: 'Updated Name',
        email: 'updated@example.com',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should update user with partial data', async () => {
      const input = {
        id: 'test-id',
        name: 'Only Name Updated',
      };
      
      const result = await caller.updateUser(input);
      
      expect(result.name).toBe('Only Name Updated');
      expect(result.email).toBe('usertest-id@example.com'); // Falls back to default
    });

    it('should throw error for invalid email in update', async () => {
      const input = {
        id: 'test-id',
        email: 'invalid-email',
      };
      
      await expect(caller.updateUser(input)).rejects.toThrow();
    });
  });
});