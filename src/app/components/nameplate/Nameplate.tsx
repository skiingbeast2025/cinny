import React, { CSSProperties, isValidElement, ReactElement, ReactNode } from 'react';
import classNames from 'classnames';
import * as css from './Nameplate.css';
import {
  getNameplateInlineStyle,
  isNameplateActive,
  NameplateConfig,
  resolveNameplateImageUrl,
} from '../../utils/nameplate';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';

export type NameplateProps = {
  nameplate?: NameplateConfig;
  variant?: 'pill' | 'banner';
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  'data-testid'?: string;
  children: ReactNode;
};

/**
 * Render an HBU2-style styled backdrop (`pill` around timeline usernames or
 * `banner` around member rows, profile cards, and previews). Returns children
 * untouched when inactive or disabled.
 */
export function Nameplate({
  nameplate,
  variant = 'pill',
  disabled = false,
  className,
  style,
  'data-testid': testId,
  children,
}: NameplateProps): ReactElement {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();

  if (disabled || !isNameplateActive(nameplate)) {
    return isValidElement(children) ? children : <span>{children}</span>;
  }

  const imageUrl = resolveNameplateImageUrl(
    mx,
    nameplate,
    useAuthentication,
    variant === 'pill' ? 280 : 520,
    variant === 'pill' ? 72 : 120
  );
  const inlinePlateStyle = getNameplateInlineStyle(nameplate, imageUrl);
  const variantClass = variant === 'banner' ? css.NameplateBanner : css.NameplatePill;

  return (
    <span
      data-testid={testId}
      data-nameplate-mode={nameplate.mode}
      data-nameplate-finish={nameplate.finish ?? 'clean'}
      className={classNames(variantClass, className)}
      style={{ ...inlinePlateStyle, ...style }}
    >
      {children}
    </span>
  );
}
