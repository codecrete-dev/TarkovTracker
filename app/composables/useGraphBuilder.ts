import type {
  HideoutModule,
  HideoutStation,
  NeededItemHideoutModule,
  NeededItemTaskObjective,
  ObjectiveGPSInfo,
  ObjectiveMapInfo,
  Task,
  TaskObjective,
  TaskRequirement,
} from '@/types/tarkov';
import {
  createGraph,
  getChildren,
  getParents,
  getPredecessors,
  getSuccessors,
  safeAddEdge,
  safeAddNode,
} from '@/utils/graphHelpers';
import { logger } from '@/utils/logger';
import type { AbstractGraph } from 'graphology-types';
/**
 * Composable for building task and hideout dependency graphs
 * Extracts complex graph algorithms from the metadata store
 */
export function useGraphBuilder() {
  const getTaskObjectives = (task: Task): TaskObjective[] => {
    if (Array.isArray(task.objectives)) {
      return task.objectives.filter(Boolean);
    }
    if (task.objectives && typeof task.objectives === 'object') {
      return Object.values(task.objectives as Record<string, TaskObjective>).filter(Boolean);
    }
    return [];
  };
  /**
   * Builds the task graph from task requirements
   */
  function buildTaskGraph(taskList: Task[]): AbstractGraph {
    const newGraph = createGraph();
    const activeRequirements: { task: Task; requirement: TaskRequirement }[] = [];
    // Add all tasks as nodes and process non-active requirements
    taskList.forEach((task) => {
      safeAddNode(newGraph, task.id);
      task.taskRequirements?.forEach((requirement) => {
        if (requirement?.task?.id) {
          if (requirement.status?.includes('active')) {
            activeRequirements.push({ task, requirement });
          } else {
            // Ensure the required task exists before adding edge
            if (taskList.some((t) => t.id === requirement.task.id)) {
              safeAddNode(newGraph, requirement.task.id);
              safeAddEdge(newGraph, requirement.task.id, task.id);
            }
          }
        }
      });
    });
    // Handle active requirements by linking predecessors
    activeRequirements.forEach(({ task, requirement }) => {
      const requiredTaskNodeId = requirement.task.id;
      if (newGraph.hasNode(requiredTaskNodeId)) {
        const predecessors = getParents(newGraph, requiredTaskNodeId);
        predecessors.forEach((predecessorId) => {
          safeAddEdge(newGraph, predecessorId, task.id);
        });
      }
    });
    return newGraph;
  }
  /**
   * Processes tasks to extract map, GPS, and item information
   */
  function processTaskRelationships(taskList: Task[]) {
    const tempMapTasks: { [mapId: string]: string[] } = {};
    const tempObjectiveMaps: { [taskId: string]: ObjectiveMapInfo[] } = {};
    const tempObjectiveGPS: { [taskId: string]: ObjectiveGPSInfo[] } = {};
    const tempAlternativeTasks: { [taskId: string]: string[] } = {};
    const tempNeededObjectives: NeededItemTaskObjective[] = [];
    taskList.forEach((task) => {
      // Process finish rewards for alternative tasks
      if (Array.isArray(task.finishRewards)) {
        task.finishRewards.forEach((reward) => {
          if (
            reward?.__typename === 'QuestStatusReward' &&
            reward.status === 'Fail' &&
            reward.quest?.id
          ) {
            if (!tempAlternativeTasks[reward.quest.id]) {
              tempAlternativeTasks[reward.quest.id] = [];
            }
            tempAlternativeTasks[reward.quest.id]!.push(task.id);
          }
        });
      }
      // Process objectives
      getTaskObjectives(task).forEach((objective) => {
        // Map and location data
        if (objective?.location?.id) {
          const mapId = objective.location.id;
          if (!tempMapTasks[mapId]) {
            tempMapTasks[mapId] = [];
          }
          if (!tempMapTasks[mapId].includes(task.id)) {
            tempMapTasks[mapId].push(task.id);
          }
          if (!tempObjectiveMaps[task.id]) {
            tempObjectiveMaps[task.id] = [];
          }
          tempObjectiveMaps[task.id]!.push({
            objectiveID: String(objective.id),
            mapID: String(mapId),
          });
          // GPS coordinates
          if (objective.x !== undefined && objective.y !== undefined) {
            if (!tempObjectiveGPS[task.id]) {
              tempObjectiveGPS[task.id] = [];
            }
            tempObjectiveGPS[task.id]!.push({
              objectiveID: objective.id,
              x: objective.x,
              y: objective.y,
            });
          }
        }
        // Item requirements
        // Exclude "findItem" and "findQuestItem" objectives as they are passive checks that auto-complete
        // when the player acquires the items for the corresponding "giveItem"/"giveQuestItem" objective
        if (
          (objective?.item?.id || objective?.markerItem?.id) &&
          objective.type !== 'findItem' &&
          objective.type !== 'findQuestItem'
        ) {
          tempNeededObjectives.push({
            id: objective.id,
            needType: 'taskObjective',
            taskId: task.id,
            type: objective.type,
            item: objective.item!,
            markerItem: objective.markerItem,
            count: objective.count ?? 1,
            foundInRaid: objective.foundInRaid ?? false,
          });
        }
      });
    });
    return {
      tempMapTasks,
      tempObjectiveMaps,
      tempObjectiveGPS,
      tempAlternativeTasks,
      tempNeededObjectives,
    };
  }
  /**
   * Enhances tasks with graph relationship data
   */
  function enhanceTasksWithRelationships(taskList: Task[], graph: AbstractGraph): Task[] {
    return taskList.map((task) => ({
      ...task,
      traderIcon: task.trader?.imageLink,
      predecessors: getPredecessors(graph, task.id),
      successors: getSuccessors(graph, task.id),
      parents: getParents(graph, task.id),
      children: getChildren(graph, task.id),
    }));
  }
  /**
   * Builds the hideout dependency graph from station level requirements
   */
  function buildHideoutGraph(stations: HideoutStation[]): AbstractGraph {
    const newGraph = createGraph();
    stations.forEach((station) => {
      station.levels.forEach((level) => {
        safeAddNode(newGraph, level.id);
        level.stationLevelRequirements?.forEach((requirement) => {
          if (requirement?.station?.id) {
            // Find the required level's ID
            const requiredStation = stations.find((s) => s.id === requirement.station.id);
            const requiredLevel = requiredStation?.levels.find(
              (l) => l.level === requirement.level
            );
            if (requiredLevel?.id) {
              safeAddNode(newGraph, requiredLevel.id);
              safeAddEdge(newGraph, requiredLevel.id, level.id);
            } else {
              logger.warn(
                `[GraphBuilder] Could not find required level ID for station ${requirement.station.id} ` +
                  `level ${requirement.level} needed by ${level.id}`
              );
            }
          }
        });
      });
    });
    return newGraph;
  }
  /**
   * Converts hideout levels to modules with relationship data
   */
  function createHideoutModules(stations: HideoutStation[], graph: AbstractGraph): HideoutModule[] {
    const modules: HideoutModule[] = [];
    stations.forEach((station) => {
      station.levels.forEach((level) => {
        const moduleData: HideoutModule = {
          ...level,
          stationId: station.id,
          predecessors: getPredecessors(graph, level.id),
          successors: getSuccessors(graph, level.id),
          parents: getParents(graph, level.id),
          children: getChildren(graph, level.id),
        };
        modules.push(moduleData);
      });
    });
    return modules;
  }
  /**
   * Extracts item requirements from hideout modules
   */
  function extractItemRequirements(modules: HideoutModule[]): NeededItemHideoutModule[] {
    const neededItems: NeededItemHideoutModule[] = [];
    modules.forEach((module) => {
      module.itemRequirements?.forEach((req) => {
        if (req?.item?.id) {
          // Parse FIR status from attributes field
          let foundInRaid = false;
          if (req.attributes && Array.isArray(req.attributes)) {
            const firAttribute = req.attributes.find(
              (attr) => attr.type === 'foundInRaid' || attr.name === 'foundInRaid'
            );
            if (firAttribute) {
              foundInRaid = firAttribute.value === 'true';
            }
          }
          neededItems.push({
            id: req.id,
            needType: 'hideoutModule',
            hideoutModule: { ...module },
            item: req.item,
            count: req.count,
            foundInRaid,
          });
        }
      });
    });
    return neededItems;
  }
  /**
   * Processes task data and returns enhanced tasks with graph relationships
   * and all derived data structures
   */
  function processTaskData(taskList: Task[]) {
    if (taskList.length === 0) {
      return {
        tasks: [],
        taskGraph: createGraph(),
        mapTasks: {},
        objectiveMaps: {},
        objectiveGPS: {},
        alternativeTasks: {},
        neededItemTaskObjectives: [],
      };
    }
    const newGraph = buildTaskGraph(taskList);
    const processedData = processTaskRelationships(taskList);
    const enhancedTasks = enhanceTasksWithRelationships(taskList, newGraph);
    return {
      tasks: enhancedTasks,
      taskGraph: newGraph,
      mapTasks: processedData.tempMapTasks,
      objectiveMaps: processedData.tempObjectiveMaps,
      objectiveGPS: processedData.tempObjectiveGPS,
      alternativeTasks: processedData.tempAlternativeTasks,
      neededItemTaskObjectives: processedData.tempNeededObjectives,
    };
  }
  /**
   * Processes hideout data and returns modules with graph relationships
   * and item requirements
   */
  function processHideoutData(stationList: HideoutStation[]) {
    if (stationList.length === 0) {
      return {
        hideoutModules: [],
        hideoutGraph: createGraph(),
        neededItemHideoutModules: [],
      };
    }
    const newGraph = buildHideoutGraph(stationList);
    const newModules = createHideoutModules(stationList, newGraph);
    const newNeededItems = extractItemRequirements(newModules);
    return {
      hideoutModules: newModules,
      hideoutGraph: newGraph,
      neededItemHideoutModules: newNeededItems,
    };
  }
  return {
    // Individual graph building functions
    buildTaskGraph,
    processTaskRelationships,
    enhanceTasksWithRelationships,
    buildHideoutGraph,
    createHideoutModules,
    extractItemRequirements,
    // High-level processing functions
    processTaskData,
    processHideoutData,
  };
}
export type UseGraphBuilderReturn = ReturnType<typeof useGraphBuilder>;
