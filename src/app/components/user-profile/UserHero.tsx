import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Icon,
  Icons,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Text,
} from 'folds';
import classNames from 'classnames';
import FocusTrap from 'focus-trap-react';
import * as css from './styles.css';
import { UserAvatar } from '../user-avatar';
import colorMXID from '../../../util/colorMXID';
import { getMxIdLocalPart } from '../../utils/matrix';
import { BreakWord, LineClamp3 } from '../../styles/Text.css';
import { UserPresence } from '../../hooks/useUserPresence';
import { AvatarPresence, PresenceBadge } from '../presence';
import { ImageViewer } from '../image-viewer';
import { stopPropagation } from '../../utils/keyboard';
import { Nameplate } from '../nameplate';
import { NameplateConfig } from '../../utils/nameplate';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';

type UserHeroProps = {
  userId: string;
  avatarUrl?: string;
  presence?: UserPresence;
};
export function UserHero({ userId, avatarUrl, presence }: UserHeroProps) {
  const [viewAvatar, setViewAvatar] = useState<string>();

  return (
    <Box direction="Column" className={css.UserHero}>
      <div
        className={css.UserHeroCoverContainer}
        style={{
          backgroundColor: colorMXID(userId),
          filter: avatarUrl ? undefined : 'brightness(50%)',
        }}
      >
        {avatarUrl && (
          <img className={css.UserHeroCover} src={avatarUrl} alt={userId} draggable="false" />
        )}
      </div>
      <div className={css.UserHeroAvatarContainer}>
        <AvatarPresence
          className={css.UserAvatarContainer}
          badge={
            presence && <PresenceBadge presence={presence.presence} status={presence.status} />
          }
        >
          <Avatar
            as={avatarUrl ? 'button' : 'div'}
            onClick={avatarUrl ? () => setViewAvatar(avatarUrl) : undefined}
            className={css.UserHeroAvatar}
            size="500"
          >
            <UserAvatar
              className={css.UserHeroAvatarImg}
              userId={userId}
              src={avatarUrl}
              alt={userId}
              renderFallback={() => <Icon size="500" src={Icons.User} filled />}
            />
          </Avatar>
        </AvatarPresence>
        {viewAvatar && (
          <Overlay open backdrop={<OverlayBackdrop />}>
            <OverlayCenter>
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  onDeactivate: () => setViewAvatar(undefined),
                  clickOutsideDeactivates: true,
                  escapeDeactivates: stopPropagation,
                }}
              >
                <Modal size="500" onContextMenu={(evt: any) => evt.stopPropagation()}>
                  <ImageViewer
                    src={viewAvatar}
                    alt={userId}
                    requestClose={() => setViewAvatar(undefined)}
                  />
                </Modal>
              </FocusTrap>
            </OverlayCenter>
          </Overlay>
        )}
      </div>
    </Box>
  );
}

type UserHeroNameProps = {
  displayName?: string;
  userId: string;
  nameplate?: NameplateConfig;
};
export function UserHeroName({ displayName, userId, nameplate }: UserHeroNameProps) {
  const username = getMxIdLocalPart(userId);
  const [showNameplates] = useSetting(settingsAtom, 'showNameplates');

  return (
    <Box grow="Yes" direction="Column" gap="100">
      <Box alignItems="Baseline" gap="200" wrap="Wrap">
        <Nameplate
          variant="pill"
          nameplate={nameplate}
          disabled={!showNameplates}
          data-testid="profile-nameplate"
        >
          <Text
            size="H4"
            className={classNames(BreakWord, LineClamp3)}
            title={displayName ?? username}
          >
            {displayName ?? username ?? userId}
          </Text>
        </Nameplate>
      </Box>
      <Box alignItems="Center" gap="100" wrap="Wrap">
        <Text size="T200" className={classNames(BreakWord, LineClamp3)} title={username}>
          @{username}
        </Text>
      </Box>
    </Box>
  );
}
