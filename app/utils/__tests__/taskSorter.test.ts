import { describe, expect, it } from 'vitest';
import type { Task } from '@/types/tarkov';
import {
  buildImpactScores,
  buildTeammateAvailableCounts,
  buildTraderOrderMap,
  sortTasksByImpact,
  sortTasksByLevel,
  sortTasksByName,
  sortTasksByTeammatesAvailable,
  sortTasksByTrader,
} from '@/utils/taskSorter';
describe('taskSorter', () => {
  const createTask = (overrides: Partial<Task> = {}): Task => {
    const { id = 'task1', name = 'Test Task', ...rest } = overrides;
    return {
      id,
      name,
      ...rest,
    };
  };
  describe('buildImpactScores', () => {
    it('returns 0 for tasks with no successors', () => {
      const tasks = [createTask({ id: 'task1', successors: [] })];
      const data = { tasksCompletions: {}, tasksFailed: {} };
      const scores = buildImpactScores(tasks, ['user1'], data);
      expect(scores.get('task1')).toBe(0);
    });
    it('counts incomplete successors', () => {
      const tasks = [createTask({ id: 'task1', successors: ['task2', 'task3'] })];
      const data = {
        tasksCompletions: { task2: { user1: true } },
        tasksFailed: {},
      };
      const scores = buildImpactScores(tasks, ['user1'], data);
      expect(scores.get('task1')).toBe(1); // task3 is incomplete
    });
    it('treats failed tasks as complete for impact', () => {
      const tasks = [createTask({ id: 'task1', successors: ['task2'] })];
      const data = {
        tasksCompletions: {},
        tasksFailed: { task2: { user1: true } },
      };
      const scores = buildImpactScores(tasks, ['user1'], data);
      expect(scores.get('task1')).toBe(0);
    });
    it('returns 0 for all tasks when no team members', () => {
      const tasks = [createTask({ id: 'task1', successors: ['task2'] })];
      const scores = buildImpactScores(tasks, [], { tasksCompletions: {}, tasksFailed: {} });
      expect(scores.get('task1')).toBe(0);
    });
  });
  describe('buildTeammateAvailableCounts', () => {
    it('counts teammates with task available', () => {
      const tasks = [createTask({ id: 'task1' })];
      const data = {
        unlockedTasks: { task1: { user1: true, user2: true } },
        tasksCompletions: { task1: { user2: true } },
        tasksFailed: {},
        visibleTeamStores: { user1: {}, user2: {} },
      };
      const counts = buildTeammateAvailableCounts(tasks, data);
      expect(counts.get('task1')).toBe(1); // Only user1 has it available
    });
    it('returns 0 when no team stores', () => {
      const tasks = [createTask({ id: 'task1' })];
      const data = {
        unlockedTasks: {},
        tasksCompletions: {},
        tasksFailed: {},
        visibleTeamStores: {},
      };
      const counts = buildTeammateAvailableCounts(tasks, data);
      expect(counts.get('task1')).toBe(0);
    });
  });
  describe('buildTraderOrderMap', () => {
    it('maps traders to their order index', () => {
      const traders = [
        { id: 't1', name: 'Prapor', normalizedName: 'prapor' },
        { id: 't2', name: 'Therapist', normalizedName: 'therapist' },
      ];
      const order = ['prapor', 'therapist', 'fence'] as const;
      const map = buildTraderOrderMap(traders, order);
      expect(map.get('t1')).toBe(0);
      expect(map.get('t2')).toBe(1);
    });
    it('uses default order for unknown traders', () => {
      const traders = [{ id: 't1', name: 'Unknown', normalizedName: 'unknown' }];
      const order = ['prapor', 'therapist'] as const;
      const map = buildTraderOrderMap(traders, order);
      expect(map.get('t1')).toBe(2); // order.length
    });
  });
  describe('sortTasksByName', () => {
    it('sorts alphabetically in ascending order', () => {
      const tasks = [
        createTask({ id: '1', name: 'Charlie' }),
        createTask({ id: '2', name: 'Alpha' }),
        createTask({ id: '3', name: 'Bravo' }),
      ];
      const sorted = sortTasksByName(tasks, 'asc');
      expect(sorted.map((t) => t.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });
    it('sorts alphabetically in descending order', () => {
      const tasks = [
        createTask({ id: '1', name: 'Alpha' }),
        createTask({ id: '2', name: 'Charlie' }),
        createTask({ id: '3', name: 'Bravo' }),
      ];
      const sorted = sortTasksByName(tasks, 'desc');
      expect(sorted.map((t) => t.name)).toEqual(['Charlie', 'Bravo', 'Alpha']);
    });
    it('uses ID as tiebreaker for same name', () => {
      const tasks = [createTask({ id: 'b', name: 'Same' }), createTask({ id: 'a', name: 'Same' })];
      const sorted = sortTasksByName(tasks, 'asc');
      expect(sorted.map((t) => t.id)).toEqual(['a', 'b']);
    });
  });
  describe('sortTasksByLevel', () => {
    it('sorts by minimum player level', () => {
      const tasks = [
        createTask({ id: '1', name: 'High', minPlayerLevel: 30 }),
        createTask({ id: '2', name: 'Low', minPlayerLevel: 5 }),
        createTask({ id: '3', name: 'Mid', minPlayerLevel: 15 }),
      ];
      const sorted = sortTasksByLevel(tasks, 'asc');
      expect(sorted.map((t) => t.minPlayerLevel)).toEqual([5, 15, 30]);
    });
    it('treats undefined level as 0', () => {
      const tasks = [
        createTask({ id: '1', name: 'HasLevel', minPlayerLevel: 10 }),
        createTask({ id: '2', name: 'NoLevel' }),
      ];
      const sorted = sortTasksByLevel(tasks, 'asc');
      expect(sorted[0]?.name).toBe('NoLevel');
    });
    it('uses name as tiebreaker', () => {
      const tasks = [
        createTask({ id: '1', name: 'Bravo', minPlayerLevel: 10 }),
        createTask({ id: '2', name: 'Alpha', minPlayerLevel: 10 }),
      ];
      const sorted = sortTasksByLevel(tasks, 'asc');
      expect(sorted.map((t) => t.name)).toEqual(['Alpha', 'Bravo']);
    });
  });
  describe('sortTasksByImpact', () => {
    it('sorts by impact score', () => {
      const tasks = [
        createTask({ id: 'low', name: 'Low', successors: [] }),
        createTask({ id: 'high', name: 'High', successors: ['s1', 's2', 's3'] }),
        createTask({ id: 'mid', name: 'Mid', successors: ['s1'] }),
      ];
      const data = { tasksCompletions: {}, tasksFailed: {} };
      const sorted = sortTasksByImpact(tasks, ['user1'], data, 'desc');
      expect(sorted.map((t) => t.id)).toEqual(['high', 'mid', 'low']);
    });
    it('accounts for partially completed successors', () => {
      const tasks = [
        createTask({ id: 'high', name: 'High', successors: ['s1', 's2', 's3'] }),
        createTask({ id: 'mid', name: 'Mid', successors: ['s4'] }),
        createTask({ id: 'low', name: 'Low', successors: [] }),
      ];
      const data = {
        tasksCompletions: {
          s1: { user1: true },
        },
        tasksFailed: {},
      };
      const sorted = sortTasksByImpact(tasks, ['user1'], data, 'desc');
      expect(sorted.map((t) => t.id)).toEqual(['high', 'mid', 'low']);
    });
  });
  describe('sortTasksByTrader', () => {
    it('sorts by trader order', () => {
      const tasks = [
        createTask({ id: '1', name: 'T1', trader: { id: 'therapist' } as Task['trader'] }),
        createTask({ id: '2', name: 'T2', trader: { id: 'prapor' } as Task['trader'] }),
      ];
      const traderMap = new Map([
        ['prapor', 0],
        ['therapist', 1],
      ]);
      const sorted = sortTasksByTrader(tasks, traderMap, 999, 'asc');
      expect(sorted.map((t) => t.trader?.id)).toEqual(['prapor', 'therapist']);
    });
    it('sorts unknown traders after known ones', () => {
      const tasks = [
        createTask({ id: 'known', name: 'Known', trader: { id: 'prapor' } as Task['trader'] }),
        createTask({
          id: 'unknown',
          name: 'Unknown',
          trader: { id: 'skier' } as Task['trader'],
        }),
      ];
      const traderMap = new Map([['prapor', 0]]);
      const sorted = sortTasksByTrader(tasks, traderMap, 999, 'asc');
      expect(sorted.map((t) => t.id)).toEqual(['known', 'unknown']);
    });
  });
  describe('sortTasksByTeammatesAvailable', () => {
    it('sorts by number of teammates with task available', () => {
      const tasks = [
        createTask({ id: 'few', name: 'Few' }),
        createTask({ id: 'many', name: 'Many' }),
      ];
      const data = {
        unlockedTasks: {
          few: { user1: true },
          many: { user1: true, user2: true, user3: true },
        },
        tasksCompletions: {},
        tasksFailed: {},
        visibleTeamStores: { user1: {}, user2: {}, user3: {} },
      };
      const sorted = sortTasksByTeammatesAvailable(tasks, data, 'desc');
      expect(sorted.map((t) => t.id)).toEqual(['many', 'few']);
    });
  });
});
