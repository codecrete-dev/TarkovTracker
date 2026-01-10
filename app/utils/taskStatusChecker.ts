/**
 * TaskStatusChecker - Utility for checking task status across users/teams
 *
 * Eliminates duplicate task status checking patterns found throughout the codebase.
 * Provides a clean, testable interface for determining task status states.
 */
/** Task status for a single user */
export interface TaskStatus {
  isUnlocked: boolean;
  isCompleted: boolean;
  isFailed: boolean;
}
/** Progress data structure matching useProgress store shape */
export interface TaskStatusProgressData {
  unlockedTasks: Record<string, Record<string, boolean>>;
  tasksCompletions: Record<string, Record<string, boolean>>;
  tasksFailed: Record<string, Record<string, boolean>>;
  invalidTasks?: Record<string, Record<string, boolean>>;
  playerFaction: Record<string, string>;
  visibleTeamStores?: Record<string, unknown>;
}
/**
 * Get task status for a specific user
 */
export function getTaskStatusForUser(
  taskId: string,
  userId: string,
  progress: TaskStatusProgressData
): TaskStatus {
  return {
    isUnlocked: progress.unlockedTasks?.[taskId]?.[userId] === true,
    isCompleted: progress.tasksCompletions?.[taskId]?.[userId] === true,
    isFailed: progress.tasksFailed?.[taskId]?.[userId] === true,
  };
}
/**
 * Check if a task is available (unlocked, not completed, not failed) for a user
 */
export function isTaskAvailableForUser(
  taskId: string,
  userId: string,
  progress: TaskStatusProgressData
): boolean {
  const status = getTaskStatusForUser(taskId, userId, progress);
  return status.isUnlocked && !status.isCompleted && !status.isFailed;
}
/**
 * Check if a task is locked (not unlocked, not completed, not failed) for a user
 */
export function isTaskLockedForUser(
  taskId: string,
  userId: string,
  progress: TaskStatusProgressData
): boolean {
  const status = getTaskStatusForUser(taskId, userId, progress);
  return !status.isUnlocked && !status.isCompleted && !status.isFailed;
}
/**
 * Check if a task is invalid (permanently blocked) for a user or all team members
 */
export function isTaskInvalid(
  taskId: string,
  userView: string,
  progress: TaskStatusProgressData
): boolean {
  if (userView === 'all') {
    const teamIds = Object.keys(progress.visibleTeamStores || {});
    if (teamIds.length === 0) return false;
    return teamIds.every((teamId) => progress.invalidTasks?.[taskId]?.[teamId] === true);
  }
  return progress.invalidTasks?.[taskId]?.[userView] === true;
}
/**
 * Get team member IDs relevant for a task based on faction matching
 */
export function getRelevantTeamIds(
  taskFaction: string,
  teamIds: string[],
  progress: TaskStatusProgressData
): string[] {
  return teamIds.filter((teamId) => {
    const userFaction = progress.playerFaction[teamId];
    return taskMatchesFaction(taskFaction, userFaction);
  });
}
/**
 * Get task statuses for all team members
 */
export function getTaskStatusesForTeam(
  taskId: string,
  teamIds: string[],
  progress: TaskStatusProgressData
): Array<TaskStatus & { teamId: string }> {
  return teamIds.map((teamId) => ({
    teamId,
    ...getTaskStatusForUser(taskId, teamId, progress),
  }));
}
/** Team task aggregation result */
export interface TeamTaskStatusAggregation {
  isAvailableForAny: boolean;
  isCompletedByAll: boolean;
  isFailedForAny: boolean;
  usersWhoNeedTask: string[];
}
/**
 * Aggregate task status across team members
 * Useful for team view task filtering
 */
export function aggregateTeamTaskStatus(
  taskId: string,
  teamIds: string[],
  progress: TaskStatusProgressData,
  getDisplayName?: (teamId: string) => string
): TeamTaskStatusAggregation {
  const statuses = teamIds.map((teamId) => ({
    teamId,
    ...getTaskStatusForUser(taskId, teamId, progress),
  }));
  const usersWhoNeedTask = statuses
    .filter(({ isUnlocked, isCompleted, isFailed }) => isUnlocked && !isCompleted && !isFailed)
    .map(({ teamId }) => (getDisplayName ? getDisplayName(teamId) : teamId));
  return {
    isAvailableForAny: statuses.some(
      ({ isUnlocked, isCompleted, isFailed }) => isUnlocked && !isCompleted && !isFailed
    ),
    isCompletedByAll:
      statuses.length > 0 && statuses.every(({ isCompleted, isFailed }) => isCompleted && !isFailed),
    isFailedForAny: statuses.some(({ isFailed }) => isFailed),
    usersWhoNeedTask,
  };
}
/**
 * Task status filter predicates for common filtering scenarios
 */
export const TaskStatusPredicates = {
  /** Task is available: unlocked AND not completed AND not failed */
  isAvailable: (status: TaskStatus): boolean =>
    status.isUnlocked && !status.isCompleted && !status.isFailed,
  /** Task is locked: not unlocked AND not completed AND not failed */
  isLocked: (status: TaskStatus): boolean =>
    !status.isUnlocked && !status.isCompleted && !status.isFailed,
  /** Task is completed: completed AND not failed */
  isCompleted: (status: TaskStatus): boolean => status.isCompleted && !status.isFailed,
  /** Task is failed */
  isFailed: (status: TaskStatus): boolean => status.isFailed,
} as const;
/**
 * Check if task matches faction requirement for a user
 */
export function taskMatchesFaction(taskFaction: string, userFaction: string | undefined): boolean {
  return taskFaction === 'Any' || taskFaction === userFaction;
}
