import { STAGE_IDS, type Analysis, type DecisionInput, type PreviousOutputs, type StageId } from '../../shared/schemas';
import { runStage } from './api';

export type StageState = 'pending' | 'working' | 'done' | 'failed';

export interface RunHandlers {
  onStage: (stage: StageId, state: StageState) => void;
  onResult: (stage: StageId, data: unknown) => void;
}

/**
 * Runs the stages in order, starting from the first one without a result.
 * No automatic retries: a failure stops the run and the caller decides
 * (the user must explicitly press "retry"), which keeps API spend predictable.
 * Throws the ApiClientError of the failing stage.
 */
export async function runPipeline(
  input: DecisionInput,
  existing: PreviousOutputs & { report?: unknown },
  accessCode: string,
  handlers: RunHandlers,
  signal?: AbortSignal,
): Promise<Analysis> {
  const results: Record<string, unknown> = { ...existing };
  for (const stage of STAGE_IDS) {
    if (results[stage]) {
      handlers.onStage(stage, 'done');
      continue;
    }
    handlers.onStage(stage, 'working');
    try {
      const { report: _r, ...previous } = results as any;
      const data = await runStage(stage, input, previous as PreviousOutputs, accessCode, signal);
      results[stage] = data;
      handlers.onResult(stage, data);
      handlers.onStage(stage, 'done');
    } catch (e) {
      handlers.onStage(stage, 'failed');
      throw e;
    }
  }
  return results as unknown as Analysis;
}
