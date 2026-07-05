export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type TBreakpointKey = keyof typeof BREAKPOINTS;
