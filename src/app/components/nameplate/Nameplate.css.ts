import { globalStyle, style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const NameplatePill = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: config.space.S100,
  padding: `${toRem(1)} ${config.space.S200}`,
  borderRadius: config.radii.R300,
  border: '1px solid rgb(255 255 255 / 0.24)',
  boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.16), 0 1px 2px rgb(0 0 0 / 0.16)',
  maxWidth: '100%',
  minWidth: 0,
  overflow: 'hidden',
  lineHeight: 1.35,
  verticalAlign: 'middle',
});

export const NameplateBanner = style({
  position: 'relative',
  borderRadius: config.radii.R400,
  border: '1px solid rgb(255 255 255 / 0.22)',
  boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.14), 0 1px 4px rgb(0 0 0 / 0.2)',
  overflow: 'hidden',
});

globalStyle(`${NameplatePill} > *`, {
  color: 'inherit',
  minWidth: 0,
});

globalStyle(`${NameplateBanner} [data-nameplate-text="true"]`, {
  color: 'inherit',
});
