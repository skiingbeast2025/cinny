import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const PreviewStage = style({
  padding: config.space.S400,
  borderRadius: config.radii.R400,
  backgroundColor: color.Surface.Container,
  border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
});

export const PreviewMemberRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  padding: `${config.space.S200} ${config.space.S300}`,
  width: '100%',
});

export const PresetsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gap: config.space.S200,
});

export const PresetCardButton = style({
  display: 'flex',
  flexDirection: 'column',
  gap: config.space.S100,
  padding: config.space.S200,
  borderRadius: config.radii.R400,
  border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
  backgroundColor: color.Surface.Container,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'border-color 140ms ease, transform 140ms ease',
  selectors: {
    '&:hover': {
      borderColor: color.Primary.Main,
      transform: 'translateY(-1px)',
    },
    '&[aria-pressed="true"]': {
      borderColor: color.Primary.Main,
      boxShadow: `0 0 0 2px ${color.Primary.Container}`,
    },
  },
});

export const PresetSwatch = style({
  width: '100%',
  height: toRem(34),
  borderRadius: config.radii.R300,
  display: 'flex',
  alignItems: 'center',
  padding: `0 ${config.space.S200}`,
  fontSize: toRem(12),
  fontWeight: 600,
  overflow: 'hidden',
});

export const ColorInput = style({
  width: toRem(44),
  height: toRem(32),
  padding: toRem(2),
  borderRadius: config.radii.R300,
  border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
  backgroundColor: color.Surface.Container,
  cursor: 'pointer',
});

export const FinishGrid = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: config.space.S200,
});
