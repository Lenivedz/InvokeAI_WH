import { IconButton } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { selectWorkflowMode, workflowModeChanged } from 'features/nodes/store/workflowLibrarySlice';
import { navigationApi } from 'features/ui/layouts/navigation-api';
import { VIEWER_PANEL_ID, WORKSPACE_PANEL_ID } from 'features/ui/layouts/shared';
import type { MouseEventHandler } from 'react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PiEyeBold, PiPencilSimpleFill } from 'react-icons/pi';

export const WorkflowViewEditToggleButton = memo(() => {
  const dispatch = useAppDispatch();
  const mode = useAppSelector(selectWorkflowMode);
  const { t } = useTranslation();

  const onClickEdit = useCallback<MouseEventHandler<HTMLButtonElement>>(
    (e) => {
      e.stopPropagation();
      // Navigate to workflows tab and focus the Workflow Editor panel
      dispatch(workflowModeChanged('edit'));
      // Focus the Workflow Editor panel
      navigationApi.focusPanel('workflows', WORKSPACE_PANEL_ID);
    },
    [dispatch]
  );

  const onClickView = useCallback<MouseEventHandler<HTMLButtonElement>>(
    (e) => {
      e.stopPropagation();
      // Navigate to workflows tab and focus the Image Viewer panel
      dispatch(workflowModeChanged('view'));
      // Focus the Image Viewer panel
      navigationApi.focusPanel('workflows', VIEWER_PANEL_ID);
    },
    [dispatch]
  );

  if (mode === 'view') {
    return (
      <IconButton
        aria-label={t('nodes.editMode')}
        tooltip={t('nodes.editMode')}
        onClick={onClickEdit}
        icon={<PiPencilSimpleFill />}
        variant="ghost"
        size="sm"
      />
    );
  }

  // mode === 'edit'
  return (
    <IconButton
      aria-label={t('nodes.viewMode')}
      tooltip={t('nodes.viewMode')}
      onClick={onClickView}
      icon={<PiEyeBold />}
      variant="ghost"
      size="sm"
    />
  );
});

WorkflowViewEditToggleButton.displayName = 'WorkflowViewEditToggleButton';
