import { FormControl, FormLabel } from '@invoke-ai/ui-library';
import { EMPTY_ARRAY } from 'app/store/constants';
import { createMemoizedSelector } from 'app/store/createMemoizedSelector';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { InformationalPopover } from 'common/components/InformationalPopover/InformationalPopover';
import type { GroupStatusMap } from 'common/components/Picker/Picker';
import { loraAdded, selectLoRAsSlice } from 'features/controlLayers/store/lorasSlice';
import { selectBase } from 'features/controlLayers/store/paramsSlice';
import { ModelPicker } from 'features/parameters/components/ModelPicker';
import { API_BASE_MODELS } from 'features/parameters/types/constants';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLoRAModels } from 'services/api/hooks/modelsByType';
import type { LoRAModelConfig } from 'services/api/types';

const selectLoRAModelKeys = createMemoizedSelector(selectLoRAsSlice, ({ loras }) =>
  loras.map(({ model }) => model.key)
);

const LoRASelect = () => {
  const dispatch = useAppDispatch();
  const [modelConfigs, { isLoading }] = useLoRAModels();
  const { t } = useTranslation();
  const addedLoRAModelKeys = useAppSelector(selectLoRAModelKeys);

  const currentBaseModel = useAppSelector(selectBase);

  // Filter to only show compatible LoRAs
  const compatibleLoRAs = useMemo(() => {
    if (!currentBaseModel) {
      return EMPTY_ARRAY;
    }
    return modelConfigs.filter((model) => model.base === currentBaseModel);
  }, [modelConfigs, currentBaseModel]);

  const getIsDisabled = useCallback(
    (model: LoRAModelConfig): boolean => {
      const isAdded = addedLoRAModelKeys.includes(model.key);
      return isAdded;
    },
    [addedLoRAModelKeys]
  );

  const onChange = useCallback(
    (model: LoRAModelConfig | null) => {
      if (!model) {
        return;
      }
      dispatch(loraAdded({ model }));
    },
    [dispatch]
  );

  const placeholder = useMemo(() => {
    if (isLoading) {
      return t('common.loading');
    }

    if (compatibleLoRAs.length === 0) {
      return currentBaseModel ? t('models.noCompatibleLoRAs') : t('models.selectModel');
    }

    return t('models.addLora');
  }, [isLoading, compatibleLoRAs.length, currentBaseModel, t]);

  // Calculate initial group states to default to the current base model architecture
  const initialGroupStates = useMemo(() => {
    if (!currentBaseModel) {
      return undefined;
    }

    // Determine the group ID for the current base model
    const groupId = API_BASE_MODELS.includes(currentBaseModel) ? 'api' : currentBaseModel;

    // Return a map with only the current base model group enabled
    return { [groupId]: true } satisfies GroupStatusMap;
  }, [currentBaseModel]);

  return (
    <FormControl gap={2}>
      <InformationalPopover feature="lora">
        <FormLabel>{t('models.concepts')} </FormLabel>
      </InformationalPopover>
      <ModelPicker
        pickerId="lora-select"
        modelConfigs={compatibleLoRAs}
        onChange={onChange}
        grouped={false}
        selectedModelConfig={undefined}
        allowEmpty
        placeholder={placeholder}
        getIsOptionDisabled={getIsDisabled}
        initialGroupStates={initialGroupStates}
        noOptionsText={currentBaseModel ? t('models.noCompatibleLoRAs') : t('models.selectModel')}
      />
    </FormControl>
  );
};

export default memo(LoRASelect);
