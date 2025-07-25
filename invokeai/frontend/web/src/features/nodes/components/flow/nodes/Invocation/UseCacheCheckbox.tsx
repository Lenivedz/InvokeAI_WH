import { Checkbox, FormControl, FormLabel } from '@invoke-ai/ui-library';
import { useAppDispatch } from 'app/store/storeHooks';
import { useUseCache } from 'features/nodes/hooks/useUseCache';
import { nodeUseCacheChanged } from 'features/nodes/store/nodesSlice';
import { NO_FIT_ON_DOUBLE_CLICK_CLASS, NO_PAN_CLASS } from 'features/nodes/types/constants';
import type { ChangeEvent } from 'react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const UseCacheCheckbox = ({ nodeId }: { nodeId: string }) => {
  const dispatch = useAppDispatch();
  const useCache = useUseCache();
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      dispatch(
        nodeUseCacheChanged({
          nodeId,
          useCache: e.target.checked,
        })
      );
    },
    [dispatch, nodeId]
  );
  const { t } = useTranslation();
  return (
    <FormControl className={NO_FIT_ON_DOUBLE_CLICK_CLASS}>
      <FormLabel m={0}>{t('invocationCache.useCache')}</FormLabel>
      <Checkbox className={NO_PAN_CLASS} onChange={handleChange} isChecked={useCache} />
    </FormControl>
  );
};

export default memo(UseCacheCheckbox);
