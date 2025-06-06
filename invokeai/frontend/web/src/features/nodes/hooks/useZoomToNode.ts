import { logger } from 'app/logging/logger';
import { $flow } from 'features/nodes/store/reactFlowInstance';
import { useCallback } from 'react';

const log = logger('workflows');

export const useZoomToNode = (nodeId: string) => {
  const zoomToNode = useCallback(() => {
    const flow = $flow.get();
    if (!flow) {
      log.warn('No flow instance found, cannot zoom to node');
      return;
    }
    flow.fitView({ duration: 300, maxZoom: 1.5, nodes: [{ id: nodeId }] });
  }, [nodeId]);
  return zoomToNode;
};
