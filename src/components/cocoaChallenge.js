// The spill budget ends an attempt while the cup is still mostly full.
// Height is a lightweight volume proxy for the existing tapered cup mesh.
export const COCOA_INITIAL_FILL = 1.88;
export const COCOA_SPILL_ALLOWANCE = 0.30;
export const COCOA_END_FILL = COCOA_INITIAL_FILL - COCOA_SPILL_ALLOWANCE;
export const cocoaAttemptFinished = fill => fill <= COCOA_END_FILL + 1e-9;
export const cocoaSpillProgress = fill => Math.max(0, Math.min(100, (COCOA_INITIAL_FILL - fill) / COCOA_SPILL_ALLOWANCE * 100));
export const cocoaRemainingAllowance = fill => Math.max(0, fill - COCOA_END_FILL);
