import { describe, expect, it } from 'vitest';
import {
  aggregateTeamTaskStatus,
  getRelevantTeamIds,
  getTaskStatusesForTeam,
  getTaskStatusForUser,
  isTaskAvailableForUser,
  isTaskInvalid,
  isTaskLockedForUser,
  taskMatchesFaction,
  TaskStatusPredicates,
  type TaskStatusProgressData,
} from '@/utils/taskStatusChecker';
describe('taskStatusChecker', () => {
  const createProgressData = (
    overrides: Partial<TaskStatusProgressData> = {}
  ): TaskStatusProgressData => ({
    unlockedTasks: {},
    tasksCompletions: {},
    tasksFailed: {},
    invalidTasks: {},
    playerFaction: {},
    visibleTeamStores: {},
    ...overrides,
  });
  describe('getTaskStatusForUser', () => {
    it('returns unlocked status correctly', () => {
      const progress = createProgressData({
        unlockedTasks: { task1: { user1: true } },
      });
      const status = getTaskStatusForUser('task1', 'user1', progress);
      expect(status.isUnlocked).toBe(true);
      expect(status.isCompleted).toBe(false);
      expect(status.isFailed).toBe(false);
    });
    it('returns completed status correctly', () => {
      const progress = createProgressData({
        tasksCompletions: { task1: { user1: true } },
      });
      const status = getTaskStatusForUser('task1', 'user1', progress);
      expect(status.isCompleted).toBe(true);
    });
    it('returns failed status correctly', () => {
      const progress = createProgressData({
        tasksFailed: { task1: { user1: true } },
      });
      const status = getTaskStatusForUser('task1', 'user1', progress);
      expect(status.isFailed).toBe(true);
    });
    it('returns false for missing task', () => {
      const progress = createProgressData();
      const status = getTaskStatusForUser('nonexistent', 'user1', progress);
      expect(status.isUnlocked).toBe(false);
      expect(status.isCompleted).toBe(false);
      expect(status.isFailed).toBe(false);
    });
  });
  describe('isTaskAvailableForUser', () => {
    it('returns true when task is unlocked and not completed or failed', () => {
      const progress = createProgressData({
        unlockedTasks: { task1: { user1: true } },
      });
      expect(isTaskAvailableForUser('task1', 'user1', progress)).toBe(true);
    });
    it('returns false when task is completed', () => {
      const progress = createProgressData({
        unlockedTasks: { task1: { user1: true } },
        tasksCompletions: { task1: { user1: true } },
      });
      expect(isTaskAvailableForUser('task1', 'user1', progress)).toBe(false);
    });
    it('returns false when task is failed', () => {
      const progress = createProgressData({
        unlockedTasks: { task1: { user1: true } },
        tasksFailed: { task1: { user1: true } },
      });
      expect(isTaskAvailableForUser('task1', 'user1', progress)).toBe(false);
    });
    it('returns false when task is not unlocked', () => {
      const progress = createProgressData();
      expect(isTaskAvailableForUser('task1', 'user1', progress)).toBe(false);
    });
  });
  describe('isTaskLockedForUser', () => {
    it('returns true when task is not unlocked, completed, or failed', () => {
      const progress = createProgressData();
      expect(isTaskLockedForUser('task1', 'user1', progress)).toBe(true);
    });
    it('returns false when task is unlocked', () => {
      const progress = createProgressData({
        unlockedTasks: { task1: { user1: true } },
      });
      expect(isTaskLockedForUser('task1', 'user1', progress)).toBe(false);
    });
  });
  describe('isTaskInvalid', () => {
    it('returns true for invalid task for specific user', () => {
      const progress = createProgressData({
        invalidTasks: { task1: { user1: true } },
      });
      expect(isTaskInvalid('task1', 'user1', progress)).toBe(true);
    });
    it('returns false for non-invalid task', () => {
      const progress = createProgressData();
      expect(isTaskInvalid('task1', 'user1', progress)).toBe(false);
    });
    it('returns true for all view when invalid for all team members', () => {
      const progress = createProgressData({
        invalidTasks: { task1: { user1: true, user2: true } },
        visibleTeamStores: { user1: {}, user2: {} },
      });
      expect(isTaskInvalid('task1', 'all', progress)).toBe(true);
    });
    it('returns false for all view when not invalid for all team members', () => {
      const progress = createProgressData({
        invalidTasks: { task1: { user1: true } },
        visibleTeamStores: { user1: {}, user2: {} },
      });
      expect(isTaskInvalid('task1', 'all', progress)).toBe(false);
    });
  });
  describe('getRelevantTeamIds', () => {
    it('returns all team members for Any faction task', () => {
      const progress = createProgressData({
        playerFaction: { user1: 'USEC', user2: 'BEAR' },
      });
      const result = getRelevantTeamIds('Any', ['user1', 'user2'], progress);
      expect(result).toEqual(['user1', 'user2']);
    });
    it('returns only matching faction members', () => {
      const progress = createProgressData({
        playerFaction: { user1: 'USEC', user2: 'BEAR' },
      });
      const result = getRelevantTeamIds('USEC', ['user1', 'user2'], progress);
      expect(result).toEqual(['user1']);
    });
  });
  describe('getTaskStatusesForTeam', () => {
    it('returns statuses for all team members', () => {
      const progress = createProgressData({
        unlockedTasks: { task1: { user1: true } },
        tasksCompletions: { task1: { user2: true } },
      });
      const result = getTaskStatusesForTeam('task1', ['user1', 'user2'], progress);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        teamId: 'user1',
        isUnlocked: true,
        isCompleted: false,
        isFailed: false,
      });
      expect(result[1]).toEqual({
        teamId: 'user2',
        isUnlocked: false,
        isCompleted: true,
        isFailed: false,
      });
    });
  });
  describe('aggregateTeamTaskStatus', () => {
    it('correctly aggregates availability across team', () => {
      const progress = createProgressData({
        unlockedTasks: { task1: { user1: true } },
      });
      const result = aggregateTeamTaskStatus('task1', ['user1', 'user2'], progress);
      expect(result.isAvailableForAny).toBe(true);
      expect(result.isCompletedByAll).toBe(false);
      expect(result.isFailedForAny).toBe(false);
      expect(result.usersWhoNeedTask).toEqual(['user1']);
    });
    it('correctly identifies when completed by all', () => {
      const progress = createProgressData({
        unlockedTasks: { task1: { user1: true, user2: true } },
        tasksCompletions: { task1: { user1: true, user2: true } },
      });
      const result = aggregateTeamTaskStatus('task1', ['user1', 'user2'], progress);
      expect(result.isCompletedByAll).toBe(true);
      expect(result.usersWhoNeedTask).toEqual([]);
    });
    it('uses display name mapper when provided', () => {
      const progress = createProgressData({
        unlockedTasks: { task1: { user1: true } },
      });
      const getDisplayName = (id: string) => `Player ${id}`;
      const result = aggregateTeamTaskStatus('task1', ['user1'], progress, getDisplayName);
      expect(result.usersWhoNeedTask).toEqual(['Player user1']);
    });
  });
  describe('TaskStatusPredicates', () => {
    it('isAvailable returns true for available status', () => {
      expect(
        TaskStatusPredicates.isAvailable({ isUnlocked: true, isCompleted: false, isFailed: false })
      ).toBe(true);
      expect(
        TaskStatusPredicates.isAvailable({ isUnlocked: true, isCompleted: true, isFailed: false })
      ).toBe(false);
    });
    it('isLocked returns true for locked status', () => {
      expect(
        TaskStatusPredicates.isLocked({ isUnlocked: false, isCompleted: false, isFailed: false })
      ).toBe(true);
      expect(
        TaskStatusPredicates.isLocked({ isUnlocked: true, isCompleted: false, isFailed: false })
      ).toBe(false);
    });
    it('isCompleted returns true for completed status', () => {
      expect(
        TaskStatusPredicates.isCompleted({ isUnlocked: true, isCompleted: true, isFailed: false })
      ).toBe(true);
      expect(
        TaskStatusPredicates.isCompleted({ isUnlocked: true, isCompleted: true, isFailed: true })
      ).toBe(false);
    });
    it('isFailed returns true for failed status', () => {
      expect(
        TaskStatusPredicates.isFailed({ isUnlocked: true, isCompleted: false, isFailed: true })
      ).toBe(true);
      expect(
        TaskStatusPredicates.isFailed({ isUnlocked: true, isCompleted: false, isFailed: false })
      ).toBe(false);
    });
  });
  describe('taskMatchesFaction', () => {
    it('returns true for Any faction', () => {
      expect(taskMatchesFaction('Any', 'USEC')).toBe(true);
      expect(taskMatchesFaction('Any', 'BEAR')).toBe(true);
      expect(taskMatchesFaction('Any', undefined)).toBe(true);
    });
    it('returns true when factions match', () => {
      expect(taskMatchesFaction('USEC', 'USEC')).toBe(true);
      expect(taskMatchesFaction('BEAR', 'BEAR')).toBe(true);
    });
    it('returns false when factions do not match', () => {
      expect(taskMatchesFaction('USEC', 'BEAR')).toBe(false);
      expect(taskMatchesFaction('BEAR', 'USEC')).toBe(false);
    });
  });
});
