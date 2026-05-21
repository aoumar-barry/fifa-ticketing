const { lockSeat, unlockSeat, isLocked, _internals } = require('../../services/seatLockService');

// ---------------------------------------------------------------------------
// We test against the in-memory fallback so that CI/dev doesn't need Redis.
// The in-memory store behaves identically to SET NX EX / DEL / GET.
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Clear the in-memory store between tests
  _internals.memoryStore.clear();
  for (const timer of _internals.memoryTimers.values()) {
    clearTimeout(timer);
  }
  _internals.memoryTimers.clear();
});

describe('seatLockService', () => {
  const seatId = '665a1b2c3d4e5f6a7b8c9d00';
  const userId1 = 'user-aaa-111';
  const userId2 = 'user-bbb-222';

  // ---------- TC-SEAT-001 ----------
  describe('lockSeat — cas nominal', () => {
    it('should acquire the lock and return true', async () => {
      const result = await lockSeat(seatId, userId1);
      expect(result).toBe(true);
    });

    it('should store the userId under the seat key', async () => {
      await lockSeat(seatId, userId1);
      const holder = await isLocked(seatId);
      expect(holder).toBe(userId1);
    });
  });

  // ---------- TC-SEAT-002 ----------
  describe('lockSeat — siège déjà pris', () => {
    it('should throw AppError 409 when the seat is already locked', async () => {
      await lockSeat(seatId, userId1);

      await expect(lockSeat(seatId, userId2)).rejects.toMatchObject({
        status: 409,
        code: 'SEAT_LOCKED',
      });
    });

    it('should throw AppError 409 even for the same user', async () => {
      await lockSeat(seatId, userId1);

      await expect(lockSeat(seatId, userId1)).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  // ---------- TC-SEAT-003 ----------
  describe('unlockSeat — libération du verrou', () => {
    it('should release the lock so the seat is free again', async () => {
      await lockSeat(seatId, userId1);
      await unlockSeat(seatId);

      const holder = await isLocked(seatId);
      expect(holder).toBeNull();
    });

    it('should allow a new lock after unlock', async () => {
      await lockSeat(seatId, userId1);
      await unlockSeat(seatId);

      const result = await lockSeat(seatId, userId2);
      expect(result).toBe(true);

      const holder = await isLocked(seatId);
      expect(holder).toBe(userId2);
    });

    it('should not throw when unlocking an already-free seat', async () => {
      await expect(unlockSeat(seatId)).resolves.toBeUndefined();
    });
  });

  // ---------- TC-SEAT-004 ----------
  describe('isLocked — vérification d\'état', () => {
    it('should return null for an unlocked seat', async () => {
      const holder = await isLocked(seatId);
      expect(holder).toBeNull();
    });

    it('should return the userId when the seat is locked', async () => {
      await lockSeat(seatId, userId1);
      const holder = await isLocked(seatId);
      expect(holder).toBe(userId1);
    });
  });

  // ---------- Multiple seats ----------
  describe('multiple seats', () => {
    const seatId2 = '665a1b2c3d4e5f6a7b8c9d01';

    it('should lock different seats independently', async () => {
      await lockSeat(seatId, userId1);
      await lockSeat(seatId2, userId2);

      expect(await isLocked(seatId)).toBe(userId1);
      expect(await isLocked(seatId2)).toBe(userId2);
    });

    it('should unlock one seat without affecting another', async () => {
      await lockSeat(seatId, userId1);
      await lockSeat(seatId2, userId2);

      await unlockSeat(seatId);

      expect(await isLocked(seatId)).toBeNull();
      expect(await isLocked(seatId2)).toBe(userId2);
    });
  });
});
