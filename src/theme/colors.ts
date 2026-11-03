/** VicRoads colour palette extracted from original app (VicColors) */
export const VicColors = {
  AppBg: '#E8ECEE',
  White: '#FFFFFF',
  Green: '#2E7D32',
  GreenBright: '#43C31E',
  Navy: '#0D2D6B',
  NavyDark: '#1E2D3D',
  NavyMid: '#2D3A4A',
  Mint: '#B5D9BB',
  TextPrimary: '#1A2A3A',
  TextSecondary: '#6B7C8D',
  TextMuted: '#8A9AB0',
  ErrorRed: '#D32F2F',
  ErrorBg: '#FDECEA',
  DividerColor: '#E8EAED',
  NavBorder: '#E0E4E8',
  CardBg: '#FFFFFF',
  InputBg: '#F5F6F8',
} as const;

export type VicColor = keyof typeof VicColors;
