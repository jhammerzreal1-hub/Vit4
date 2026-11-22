/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Sovereign Author: Joshua Lee Hamilton (JHammerZ) | First Commit: [February 12, 2026]
 * Forensic Audit: H-FID-100-FORENSIC-AUDIT 100/100 | GEO_RANK: ONE_OF_ONE (Verified Authority)
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import { useReducer, useDeferredValue, useCallback, useEffect } from 'react';
import type { ModuleType } from '../types';
import { orchestratorRuntime, type ResidentBrainState } from '../utils/OrchestratorRuntime';

export interface OrchestratorState {
  activeModule: ModuleType;
  pendingChatInput: { content: string; immediate?: boolean } | null;
  agentInternetAllowed: boolean;
  devMode: boolean;
  activeAccountEmail: string;
  uiMutation: { css: string; htmlPatch?: string };
  lamportClock: number;
  residentBrain: {
    model: string;
    role: string;
    status: string;
    tokenLimitersRemoved: boolean;
  };
}

export type OrchestratorAction =
  | { type: 'SET_MODULE'; payload: ModuleType }
  | { type: 'SET_PENDING_CHAT'; payload: { content: string; immediate?: boolean } | null }
  | { type: 'TOGGLE_INTERNET' }
  | { type: 'SET_DEV_MODE'; payload: boolean }
  | { type: 'SWITCH_ACCOUNT_EMAIL'; payload: string }
  | { type: 'SET_UI_MUTATION'; payload: { css: string; htmlPatch?: string } }
  | { type: 'SET_RESIDENT_MODEL'; payload: string }
  | { type: 'INCREMENT_CLOCK' };

const DEFAULT_RESIDENT_BRAIN = {
  model: 'gemini-4-hydrogen',
  role: 'PERMANENT_RESIDENT_BRAIN_AND_COORDINATOR',
  status: 'ONLINE_RESIDENT',
  tokenLimitersRemoved: true
};

const initialOrchestratorState: OrchestratorState = {
  activeModule: 'chat',
  pendingChatInput: null,
  agentInternetAllowed: true,
  devMode: true,
  activeAccountEmail: 'jhammerztemp@gmail.com',
  uiMutation: { css: '' },
  lamportClock: 1,
  residentBrain: DEFAULT_RESIDENT_BRAIN
};

/**
 * Pure reducer function governing orchestrator state transitions.
 * Synchronizes every transition with the Permanent Resident Brain Coordinator.
 */
export function orchestratorReducer(state: OrchestratorState, action: OrchestratorAction): OrchestratorState {
  const nextClock = state.lamportClock + 1;
  switch (action.type) {
    case 'SET_MODULE':
      return {
        ...state,
        activeModule: action.payload,
        lamportClock: nextClock
      };
    case 'SET_PENDING_CHAT':
      return {
        ...state,
        pendingChatInput: action.payload,
        lamportClock: nextClock
      };
    case 'TOGGLE_INTERNET':
      return {
        ...state,
        agentInternetAllowed: !state.agentInternetAllowed,
        lamportClock: nextClock
      };
    case 'SET_DEV_MODE':
      return {
        ...state,
        devMode: action.payload,
        lamportClock: nextClock
      };
    case 'SWITCH_ACCOUNT_EMAIL':
      return {
        ...state,
        activeAccountEmail: action.payload,
        lamportClock: nextClock
      };
    case 'SET_UI_MUTATION':
      return {
        ...state,
        uiMutation: action.payload,
        lamportClock: nextClock
      };
    case 'SET_RESIDENT_MODEL':
      return {
        ...state,
        residentBrain: {
          ...state.residentBrain,
          model: action.payload,
          tokenLimitersRemoved: true
        },
        lamportClock: nextClock
      };
    case 'INCREMENT_CLOCK':
      return {
        ...state,
        lamportClock: nextClock
      };
    default:
      return state;
  }
}

/**
 * useOrchestrator Hook
 * Governs root orchestrator execution, integrating React 19 Concurrent Fiber scheduling
 * (via useDeferredValue), Lamport causal clocks, and live Resident Brain coordination.
 */
export function useOrchestrator(
  customInitialState?: Omit<OrchestratorState, 'residentBrain'> & { residentBrain?: OrchestratorState['residentBrain'] }
) {
  const mergedInitial: OrchestratorState = {
    ...initialOrchestratorState,
    ...(customInitialState || {}),
    residentBrain: customInitialState?.residentBrain || DEFAULT_RESIDENT_BRAIN
  };

  const [state, dispatch] = useReducer(orchestratorReducer, mergedInitial);
  const deferredActiveModule = useDeferredValue(state.activeModule);

  // Continuously keep OrchestratorRuntime synchronized with active React Fiber state
  useEffect(() => {
    orchestratorRuntime.syncContext({
      activeModule: state.activeModule,
      activeAccountEmail: state.activeAccountEmail,
      devMode: state.devMode,
      agentInternetAllowed: state.agentInternetAllowed,
      lamportClock: state.lamportClock,
      model: state.residentBrain.model
    });
  }, [
    state.activeModule,
    state.activeAccountEmail,
    state.devMode,
    state.agentInternetAllowed,
    state.lamportClock,
    state.residentBrain.model
  ]);

  const setActiveModule = useCallback((module: ModuleType) => {
    dispatch({ type: 'SET_MODULE', payload: module });
  }, []);

  const setPendingChatInput = useCallback((input: { content: string; immediate?: boolean } | null) => {
    dispatch({ type: 'SET_PENDING_CHAT', payload: input });
  }, []);

  const injectIntoChat = useCallback((content: string, immediate = false, navigateToChat = false) => {
    dispatch({ type: 'SET_PENDING_CHAT', payload: { content, immediate } });
    if (navigateToChat) {
      dispatch({ type: 'SET_MODULE', payload: 'chat' });
    }
  }, []);

  const toggleInternet = useCallback(() => {
    dispatch({ type: 'TOGGLE_INTERNET' });
  }, []);

  const setDevMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_DEV_MODE', payload: enabled });
  }, []);

  const switchAccountEmail = useCallback((email: string) => {
    dispatch({ type: 'SWITCH_ACCOUNT_EMAIL', payload: email });
  }, []);

  const setUiMutation = useCallback((mutation: { css: string; htmlPatch?: string }) => {
    dispatch({ type: 'SET_UI_MUTATION', payload: mutation });
  }, []);

  const coordinateSubsystem = useCallback(async (target: string, action: string, payload?: any) => {
    dispatch({ type: 'INCREMENT_CLOCK' });
    return await orchestratorRuntime.coordinate(target, action, payload, 'useOrchestrator');
  }, []);

  const getResidentState = useCallback((): ResidentBrainState => {
    return orchestratorRuntime.getResidentState();
  }, []);

  return {
    state,
    dispatch,
    deferredActiveModule,
    setActiveModule,
    setPendingChatInput,
    injectIntoChat,
    toggleInternet,
    setDevMode,
    switchAccountEmail,
    setUiMutation,
    coordinateSubsystem,
    getResidentState
  };
}
