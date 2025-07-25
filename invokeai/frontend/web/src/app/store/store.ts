import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { autoBatchEnhancer, combineReducers, configureStore } from '@reduxjs/toolkit';
import { logger } from 'app/logging/logger';
import { idbKeyValDriver } from 'app/store/enhancers/reduxRemember/driver';
import { errorHandler } from 'app/store/enhancers/reduxRemember/errors';
import { deepClone } from 'common/util/deepClone';
import { keys, mergeWith, omit, pick } from 'es-toolkit/compat';
import { changeBoardModalSlice } from 'features/changeBoardModal/store/slice';
import { canvasSettingsPersistConfig, canvasSettingsSlice } from 'features/controlLayers/store/canvasSettingsSlice';
import { canvasPersistConfig, canvasSlice, canvasUndoableConfig } from 'features/controlLayers/store/canvasSlice';
import {
  canvasSessionSlice,
  canvasStagingAreaPersistConfig,
} from 'features/controlLayers/store/canvasStagingAreaSlice';
import { lorasPersistConfig, lorasSlice } from 'features/controlLayers/store/lorasSlice';
import { paramsPersistConfig, paramsSlice } from 'features/controlLayers/store/paramsSlice';
import { refImagesPersistConfig, refImagesSlice } from 'features/controlLayers/store/refImagesSlice';
import { dynamicPromptsPersistConfig, dynamicPromptsSlice } from 'features/dynamicPrompts/store/dynamicPromptsSlice';
import { galleryPersistConfig, gallerySlice } from 'features/gallery/store/gallerySlice';
import { modelManagerV2PersistConfig, modelManagerV2Slice } from 'features/modelManagerV2/store/modelManagerV2Slice';
import { nodesPersistConfig, nodesSlice, nodesUndoableConfig } from 'features/nodes/store/nodesSlice';
import { workflowLibraryPersistConfig, workflowLibrarySlice } from 'features/nodes/store/workflowLibrarySlice';
import { workflowSettingsPersistConfig, workflowSettingsSlice } from 'features/nodes/store/workflowSettingsSlice';
import { upscalePersistConfig, upscaleSlice } from 'features/parameters/store/upscaleSlice';
import { queueSlice } from 'features/queue/store/queueSlice';
import { stylePresetPersistConfig, stylePresetSlice } from 'features/stylePresets/store/stylePresetSlice';
import { configSlice } from 'features/system/store/configSlice';
import { systemPersistConfig, systemSlice } from 'features/system/store/systemSlice';
import { uiPersistConfig, uiSlice } from 'features/ui/store/uiSlice';
import { diff } from 'jsondiffpatch';
import dynamicMiddlewares from 'redux-dynamic-middlewares';
import type { SerializeFunction, UnserializeFunction } from 'redux-remember';
import { rememberEnhancer, rememberReducer } from 'redux-remember';
import undoable, { newHistory } from 'redux-undo';
import { serializeError } from 'serialize-error';
import { api } from 'services/api';
import { authToastMiddleware } from 'services/api/authToastMiddleware';
import type { JsonObject } from 'type-fest';

import { STORAGE_PREFIX } from './constants';
import { actionSanitizer } from './middleware/devtools/actionSanitizer';
import { actionsDenylist } from './middleware/devtools/actionsDenylist';
import { stateSanitizer } from './middleware/devtools/stateSanitizer';
import { listenerMiddleware } from './middleware/listenerMiddleware';

const log = logger('system');

const allReducers = {
  [api.reducerPath]: api.reducer,
  [gallerySlice.name]: gallerySlice.reducer,
  [nodesSlice.name]: undoable(nodesSlice.reducer, nodesUndoableConfig),
  [systemSlice.name]: systemSlice.reducer,
  [configSlice.name]: configSlice.reducer,
  [uiSlice.name]: uiSlice.reducer,
  [dynamicPromptsSlice.name]: dynamicPromptsSlice.reducer,
  [changeBoardModalSlice.name]: changeBoardModalSlice.reducer,
  [modelManagerV2Slice.name]: modelManagerV2Slice.reducer,
  [queueSlice.name]: queueSlice.reducer,
  [canvasSlice.name]: undoable(canvasSlice.reducer, canvasUndoableConfig),
  [workflowSettingsSlice.name]: workflowSettingsSlice.reducer,
  [upscaleSlice.name]: upscaleSlice.reducer,
  [stylePresetSlice.name]: stylePresetSlice.reducer,
  [paramsSlice.name]: paramsSlice.reducer,
  [canvasSettingsSlice.name]: canvasSettingsSlice.reducer,
  [canvasSessionSlice.name]: canvasSessionSlice.reducer,
  [lorasSlice.name]: lorasSlice.reducer,
  [workflowLibrarySlice.name]: workflowLibrarySlice.reducer,
  [refImagesSlice.name]: refImagesSlice.reducer,
};

const rootReducer = combineReducers(allReducers);

const rememberedRootReducer = rememberReducer(rootReducer);

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type PersistConfig<T = any> = {
  /**
   * The name of the slice.
   */
  name: keyof typeof allReducers;
  /**
   * The initial state of the slice.
   */
  initialState: T;
  /**
   * Migrate the state to the current version during rehydration.
   * @param state The rehydrated state.
   * @returns A correctly-shaped state.
   */
  migrate: (state: unknown) => T;
  /**
   * Keys to omit from the persisted state.
   */
  persistDenylist: (keyof T)[];
};

const persistConfigs: { [key in keyof typeof allReducers]?: PersistConfig } = {
  [galleryPersistConfig.name]: galleryPersistConfig,
  [nodesPersistConfig.name]: nodesPersistConfig,
  [systemPersistConfig.name]: systemPersistConfig,
  [uiPersistConfig.name]: uiPersistConfig,
  [dynamicPromptsPersistConfig.name]: dynamicPromptsPersistConfig,
  [modelManagerV2PersistConfig.name]: modelManagerV2PersistConfig,
  [canvasPersistConfig.name]: canvasPersistConfig,
  [workflowSettingsPersistConfig.name]: workflowSettingsPersistConfig,
  [upscalePersistConfig.name]: upscalePersistConfig,
  [stylePresetPersistConfig.name]: stylePresetPersistConfig,
  [paramsPersistConfig.name]: paramsPersistConfig,
  [canvasSettingsPersistConfig.name]: canvasSettingsPersistConfig,
  [canvasStagingAreaPersistConfig.name]: canvasStagingAreaPersistConfig,
  [lorasPersistConfig.name]: lorasPersistConfig,
  [workflowLibraryPersistConfig.name]: workflowLibraryPersistConfig,
  [refImagesSlice.name]: refImagesPersistConfig,
};

const unserialize: UnserializeFunction = (data, key) => {
  const persistConfig = persistConfigs[key as keyof typeof persistConfigs];
  if (!persistConfig) {
    throw new Error(`No persist config for slice "${key}"`);
  }
  let state;
  try {
    const { initialState, migrate } = persistConfig;
    const parsed = JSON.parse(data);

    // strip out old keys
    const stripped = pick(deepClone(parsed), keys(initialState));
    // run (additive) migrations
    const migrated = migrate(stripped);
    /*
     * Merge in initial state as default values, covering any missing keys. You might be tempted to use _.defaultsDeep,
     * but that merges arrays by index and partial objects by key. Using an identity function as the customizer results
     * in behaviour like defaultsDeep, but doesn't overwrite any values that are not undefined in the migrated state.
     */
    const transformed = mergeWith(migrated, initialState, (objVal) => objVal);

    log.debug(
      {
        persistedData: parsed,
        rehydratedData: transformed,
        diff: diff(parsed, transformed) as JsonObject, // this is always serializable
      },
      `Rehydrated slice "${key}"`
    );
    state = transformed;
  } catch (err) {
    log.warn(
      { error: serializeError(err as Error) },
      `Error rehydrating slice "${key}", falling back to default initial state`
    );
    state = persistConfig.initialState;
  }

  // If the slice is undoable, we need to wrap it in a new history - only nodes and canvas are undoable at the moment.
  // TODO(psyche): make this automatic & remove the hard-coding for specific slices.
  if (key === nodesSlice.name || key === canvasSlice.name) {
    return newHistory([], state, []);
  } else {
    return state;
  }
};

const serialize: SerializeFunction = (data, key) => {
  const persistConfig = persistConfigs[key as keyof typeof persistConfigs];
  if (!persistConfig) {
    throw new Error(`No persist config for slice "${key}"`);
  }
  // Heuristic to determine if the slice is undoable - could just hardcode it in the persistConfig
  const isUndoable = 'present' in data && 'past' in data && 'future' in data && '_latestUnfiltered' in data;
  const result = omit(isUndoable ? data.present : data, persistConfig.persistDenylist);
  return JSON.stringify(result);
};

export const createStore = (uniqueStoreKey?: string, persist = true) =>
  configureStore({
    reducer: rememberedRootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: import.meta.env.MODE === 'development',
        immutableCheck: import.meta.env.MODE === 'development',
      })
        .concat(api.middleware)
        .concat(dynamicMiddlewares)
        .concat(authToastMiddleware)
        // .concat(getDebugLoggerMiddleware())
        .prepend(listenerMiddleware.middleware),
    enhancers: (getDefaultEnhancers) => {
      const _enhancers = getDefaultEnhancers().concat(autoBatchEnhancer());
      if (persist) {
        _enhancers.push(
          rememberEnhancer(idbKeyValDriver, keys(persistConfigs), {
            persistDebounce: 300,
            serialize,
            unserialize,
            prefix: uniqueStoreKey ? `${STORAGE_PREFIX}${uniqueStoreKey}-` : STORAGE_PREFIX,
            errorHandler,
          })
        );
      }
      return _enhancers;
    },
    devTools: {
      actionSanitizer,
      stateSanitizer,
      trace: true,
      predicate: (state, action) => {
        if (actionsDenylist.includes(action.type)) {
          return false;
        }
        return true;
      },
    },
  });

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore['getState']>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppThunkDispatch = ThunkDispatch<RootState, any, UnknownAction>;
export type AppDispatch = ReturnType<typeof createStore>['dispatch'];
export type AppGetState = ReturnType<typeof createStore>['getState'];
