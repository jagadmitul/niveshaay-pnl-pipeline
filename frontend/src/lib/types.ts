// Shape returned by the n8n workflow after Validate Math + Respond Success.

export type QuarterType = 'standard' | 'extended';

export type PnLRow = string[];

export interface PnLData {
  company_name: string;
  quarter_type: QuarterType;
  // row1, row2, row3, ... — flexible because P&L line items vary by company.
  [rowKey: `row${number}`]: PnLRow;
}

export interface ValidationIssue {
  row: string;
  column: string;
  expected: string;
  got: string;
  diff_pp: string;
}

export interface ValidationReport {
  passed: boolean;
  issues_count: number;
  issues: ValidationIssue[];
}

export interface PipelineMeta {
  model_used: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  finish_reason: string;
}

export interface PipelineSuccess {
  success: true;
  data: PnLData;
  meta: PipelineMeta;
  validation?: ValidationReport;
}

export interface PipelineNoPnL {
  success: false;
  reason: 'no_pnl_found';
  message: string;
}

export interface PipelineError {
  success: false;
  error: {
    message: string;
    status: number;
    timestamp: string;
  };
}

export type PipelineResponse = PipelineSuccess | PipelineNoPnL | PipelineError;

export function isSuccess(r: PipelineResponse): r is PipelineSuccess {
  return r.success === true;
}

export function isNoPnL(r: PipelineResponse): r is PipelineNoPnL {
  return r.success === false && 'reason' in r && r.reason === 'no_pnl_found';
}

export function isError(r: PipelineResponse): r is PipelineError {
  return r.success === false && 'error' in r;
}
