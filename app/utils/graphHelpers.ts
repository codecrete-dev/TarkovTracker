import Graph from 'graphology';
export function getPredecessors(graph: Graph, nodeId: string): string[] {
  const allPredecessors = new Set<string>();
  const visited = new Set<string>();
  function traverse(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);
    try {
      const parents = graph.inNeighbors(id);
      for (const parent of parents) {
        allPredecessors.add(parent);
        traverse(parent);
      }
    } catch (error) {
      console.error(`Error getting predecessors for node ${id}:`, error);
    }
  }
  traverse(nodeId);
  return Array.from(allPredecessors);
}
export function getSuccessors(graph: Graph, nodeId: string): string[] {
  const allSuccessors = new Set<string>();
  const visited = new Set<string>();
  function traverse(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);
    try {
      const children = graph.outNeighbors(id);
      for (const child of children) {
        allSuccessors.add(child);
        traverse(child);
      }
    } catch (error) {
      console.error(`Error getting successors for node ${id}:`, error);
    }
  }
  traverse(nodeId);
  return Array.from(allSuccessors);
}
export function getParents(graph: Graph, nodeId: string): string[] {
  try {
    return graph.inNeighbors(nodeId);
  } catch (error) {
    console.error(`Error getting parents for node ${nodeId}:`, error);
    return [];
  }
}
export function getChildren(graph: Graph, nodeId: string): string[] {
  try {
    return graph.outNeighbors(nodeId);
  } catch (error) {
    console.error(`Error getting children for node ${nodeId}:`, error);
    return [];
  }
}
export function safeAddNode(graph: Graph, nodeId: string): void {
  try {
    graph.mergeNode(nodeId);
  } catch (error) {
    console.error(`Error adding node ${nodeId} to graph:`, error);
  }
}
/**
 * Check if adding an edge would create a cycle in the graph.
 * Returns true if adding sourceId -> targetId would create a cycle.
 */
export function wouldCreateCycle(graph: Graph, sourceId: string, targetId: string): boolean {
  if (sourceId === targetId) return true;
  // If targetId can already reach sourceId, adding sourceId -> targetId creates a cycle
  const successorsOfTarget = getSuccessors(graph, targetId);
  return successorsOfTarget.includes(sourceId);
}
export function safeAddEdge(graph: Graph, sourceId: string, targetId: string): void {
  try {
    if (!graph.hasNode(sourceId) || !graph.hasNode(targetId)) {
      if (import.meta.dev) {
        console.warn(
          `Cannot add edge from ${sourceId} to ${targetId}: one or both nodes don't exist`
        );
      }
      return;
    }
    // Check for cycles before adding
    if (wouldCreateCycle(graph, sourceId, targetId)) {
      console.warn(
        `[Graph] Cycle detected: Cannot add edge from ${sourceId} to ${targetId}. Skipping.`
      );
      return;
    }
    graph.mergeEdge(sourceId, targetId);
  } catch (error) {
    console.error(`Error adding edge from ${sourceId} to ${targetId}:`, error);
  }
}
export function createGraph(): Graph {
  return new Graph();
}
export function hasNode(graph: Graph, nodeId: string): boolean {
  try {
    return graph.hasNode(nodeId);
  } catch (error) {
    console.error(`Error checking if node ${nodeId} exists:`, error);
    return false;
  }
}
export function getAllNodes(graph: Graph): string[] {
  try {
    return graph.nodes();
  } catch (error) {
    console.error('Error getting all nodes:', error);
    return [];
  }
}
export function clearGraph(graph: Graph): void {
  try {
    graph.clear();
  } catch (error) {
    console.error('Error clearing graph:', error);
  }
}
