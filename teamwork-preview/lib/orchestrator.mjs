/**
 * Serial Multi-Role Orchestrator for "รู้ทันหนังสือราชการ"
 * Enforces strict serial pipeline: Interpreter -> Risk Checker -> Action Planner -> Final Synthesizer
 */
import {
  ROLES,
  buildInterpreterPrompt,
  buildRiskCheckerPrompt,
  buildActionPlannerPrompt,
  buildFinalSynthesizerPrompt,
} from './prompts.mjs';
import { streamBridgeCompletion, createTemporaryConversation } from './bridge-client.mjs';
import { streamMockRoleResponse } from './mock-bridge.mjs';

export const ORDERED_ROLE_IDS = ['interpreter', 'risk_checker', 'action_planner', 'final_synthesizer'];

/**
 * Builds the appropriate prompt for a given role based on the accumulated pipeline state.
 * @param {string} roleId
 * @param {string} goal
 * @param {Object} stepsSoFar
 * @param {boolean} [hasAttachment=false]
 * @returns {string}
 */
export function buildPromptForRole(roleId, goal, stepsSoFar = {}, hasAttachment = false) {
  switch (roleId) {
    case 'interpreter':
      return buildInterpreterPrompt(goal, hasAttachment);
    case 'risk_checker':
      return buildRiskCheckerPrompt(goal, stepsSoFar.interpreter || '');
    case 'action_planner':
      return buildActionPlannerPrompt(goal, stepsSoFar.interpreter || '', stepsSoFar.risk_checker || '');
    case 'final_synthesizer':
      return buildFinalSynthesizerPrompt(
        goal,
        stepsSoFar.interpreter || '',
        stepsSoFar.risk_checker || '',
        stepsSoFar.action_planner || ''
      );
    default:
      throw new Error(`Unknown role: ${roleId}`);
  }
}

/**
 * Executes a single role in the pipeline.
 * @param {Object} params
 * @param {string} params.roleId
 * @param {string} params.goal
 * @param {Object} [params.attachment]
 * @param {Object} params.stepsSoFar
 * @param {string} [params.model]
 * @param {boolean} [params.isDemo=false]
 * @param {Function} params.onChunk
 * @param {Function} [params.onActivity]
 * @param {boolean} [params.simulateError=false]
 * @param {string} [params.baseUrl]
 * @returns {Promise<string>}
 */
export async function executeRole({
  roleId,
  goal,
  attachment = null,
  stepsSoFar = {},
  model,
  isDemo = false,
  onChunk,
  onActivity,
  simulateError = false,
  baseUrl,
  signal = null,
}) {
  if (signal?.aborted) {
    throw new Error(`Execution aborted for role: ${roleId}`);
  }

  if (simulateError) {
    throw new Error(`Simulated failure in role: ${roleId}`);
  }

  const hasAttachment = !!(attachment && attachment.dataUri);
  const prompt = buildPromptForRole(roleId, goal, stepsSoFar, hasAttachment);

  if (isDemo) {
    return await streamMockRoleResponse(roleId, goal, onChunk);
  }

  // Pass file attachment only to the first role (Interpreter) to avoid massive repeated payloads
  const fileForThisRole = roleId === 'interpreter' ? attachment : null;

  return await streamBridgeCompletion({
    prompt,
    attachment: fileForThisRole,
    model,
    baseUrl,
    onChunk,
    onActivity,
    signal,
  });
}

/**
 * Executes the full serial workflow from Interpreter -> Risk Checker -> Action Planner -> Final Synthesizer.
 * @param {Object} params
 * @param {string} params.goal
 * @param {Object} [params.attachment]
 * @param {string} [params.model]
 * @param {boolean} [params.isDemo=false]
 * @param {string} [params.simulateErrorAtRole]
 * @param {string} [params.baseUrl]
 * @param {Function} params.onEvent
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<Object>}
 */
export async function runSerialPipeline({
  goal,
  attachment = null,
  model,
  isDemo = false,
  simulateErrorAtRole = null,
  baseUrl,
  onEvent,
  signal = null,
}) {
  const steps = {
    interpreter: '',
    risk_checker: '',
    action_planner: '',
    final_synthesizer: '',
  };

  onEvent('pipeline_start', {
    goal,
    hasAttachment: !!attachment,
    filename: attachment?.filename || null,
    model,
    isDemo,
    roles: ORDERED_ROLE_IDS.map((id) => ROLES[id.toUpperCase()]),
    startedAt: new Date().toISOString(),
  });

  // Fail-closed privacy guarantee: Live pipeline MUST successfully create a temporary session
  // before running any completions. If it fails, halt immediately to prevent leaking to permanent history.
  if (!isDemo) {
    if (signal?.aborted) {
      throw new Error('Pipeline aborted by client');
    }
    const tempConv = await createTemporaryConversation(baseUrl, model, signal);
    onEvent('conversation_init', {
      temporary: true,
      conversationId: tempConv?.id || null,
    });
  }

  for (const roleId of ORDERED_ROLE_IDS) {
    if (signal?.aborted) {
      throw new Error('Pipeline aborted by client');
    }

    const roleMeta = ROLES[roleId.toUpperCase()];
    onEvent('role_start', { roleId, roleMeta });

    try {
      let accumulated = '';
      const shouldSimulateError = simulateErrorAtRole === roleId;

      accumulated = await executeRole({
        roleId,
        goal,
        attachment,
        stepsSoFar: steps,
        model,
        isDemo,
        baseUrl,
        simulateError: shouldSimulateError,
        signal,
        onChunk: (chunk) => {
          accumulated += chunk;
          onEvent('chunk', { roleId, chunk });
        },
        onActivity: (activity) => {
          onEvent('activity', { roleId, activity });
        },
      });

      steps[roleId] = accumulated;
      onEvent('role_done', { roleId, text: accumulated });

      // After interpreter completes, free memory by dereferencing raw dataUri
      if (roleId === 'interpreter' && attachment && attachment.dataUri) {
        attachment.dataUri = null;
      }
    } catch (err) {
      onEvent('role_error', {
        roleId,
        error: err.message,
        recoverable: true,
      });
      throw err;
    }
  }

  const result = {
    goal,
    hasAttachment: !!attachment,
    filename: attachment?.filename || null,
    attachment: attachment
      ? { filename: attachment.filename, mimeType: attachment.mimeType }
      : null,
    model,
    isDemo,
    steps,
    completedAt: new Date().toISOString(),
  };

  onEvent('complete', result);
  return result;
}

/**
 * Retries a specific failed role.
 * @param {Object} params
 * @param {string} params.roleId
 * @param {string} params.goal
 * @param {Object} [params.attachment]
 * @param {Object} params.stepsSoFar
 * @param {string} [params.model]
 * @param {boolean} [params.isDemo=false]
 * @param {string} [params.baseUrl]
 * @param {Function} params.onEvent
 * @returns {Promise<string>}
 */
export async function retryRole({
  roleId,
  goal,
  attachment = null,
  stepsSoFar = {},
  model,
  isDemo = false,
  baseUrl,
  onEvent,
  resumeDownstream = true,
  signal = null,
}) {
  if (!roleId || !ORDERED_ROLE_IDS.includes(roleId)) {
    const err = new Error(`Unknown role: ${roleId}`);
    onEvent('role_error', { roleId, error: err.message, recoverable: false });
    throw err;
  }

  // Fail-closed privacy guarantee for retry: Live retry MUST create a fresh temporary session
  // before running any completions. If it fails, halt immediately to prevent leaking to permanent history.
  if (!isDemo) {
    if (signal?.aborted) {
      throw new Error('Retry aborted by client');
    }
    const tempConv = await createTemporaryConversation(baseUrl, model, signal);
    onEvent('conversation_init', {
      temporary: true,
      conversationId: tempConv?.id || null,
      isRetry: true,
    });
  }

  const steps = { ...stepsSoFar };
  const startIndex = ORDERED_ROLE_IDS.indexOf(roleId);
  const rolesToRun = resumeDownstream ? ORDERED_ROLE_IDS.slice(startIndex) : [roleId];

  for (let i = 0; i < rolesToRun.length; i++) {
    if (signal?.aborted) {
      throw new Error('Retry aborted by client');
    }

    const currentRoleId = rolesToRun[i];
    const roleMeta = ROLES[currentRoleId.toUpperCase()];
    const isFirstInRetry = i === 0;

    onEvent('role_start', { roleId: currentRoleId, roleMeta, isRetry: isFirstInRetry });

    try {
      let accumulated = '';
      accumulated = await executeRole({
        roleId: currentRoleId,
        goal,
        attachment,
        stepsSoFar: steps,
        model,
        isDemo,
        baseUrl,
        simulateError: false,
        signal,
        onChunk: (chunk) => {
          accumulated += chunk;
          onEvent('chunk', { roleId: currentRoleId, chunk });
        },
        onActivity: (activity) => {
          onEvent('activity', { roleId: currentRoleId, activity });
        },
      });

      steps[currentRoleId] = accumulated;
      onEvent('role_done', { roleId: currentRoleId, text: accumulated });

      if (currentRoleId === 'interpreter' && attachment && attachment.dataUri) {
        attachment.dataUri = null;
      }
    } catch (err) {
      onEvent('role_error', { roleId: currentRoleId, error: err.message, recoverable: true });
      throw err;
    }
  }

  if (resumeDownstream && rolesToRun[rolesToRun.length - 1] === 'final_synthesizer') {
    const result = {
      goal,
      hasAttachment: !!attachment,
      filename: attachment?.filename || null,
      attachment: attachment
        ? { filename: attachment.filename, mimeType: attachment.mimeType }
        : null,
      model,
      isDemo,
      steps,
      completedAt: new Date().toISOString(),
    };
    onEvent('complete', result);
    return result;
  }

  return steps[roleId];
}
