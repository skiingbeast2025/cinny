import React, { useState } from 'react';
import { Box, Button, Text, Chip } from 'folds';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { copyToClipboard } from '../../../utils/dom';
import { getMxIdServer } from '../../../utils/matrix';
import { clientDefaultServer, useClientConfig } from '../../../hooks/useClientConfig';
import { switchHomeserverSession } from '../../../../client/initMatrix';

export function MatrixId() {
  const mx = useMatrixClient();
  const clientConfig = useClientConfig();
  const userId = mx.getSafeUserId();
  const currentServer = getMxIdServer(userId);
  const defaultServer = clientDefaultServer(clientConfig);
  const [switching, setSwitching] = useState(false);

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Matrix ID</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title={userId}
          after={
            <Box alignItems="Center" gap="200">
              <Chip variant="Secondary" radii="Pill" onClick={() => copyToClipboard(userId)}>
                <Text size="T200">Copy</Text>
              </Chip>
              {currentServer && currentServer !== defaultServer && (
                <Button
                  size="300"
                  variant="Primary"
                  fill="Soft"
                  outlined
                  radii="300"
                  disabled={switching}
                  data-testid="account-switch-homeserver-btn"
                  onClick={() => {
                    setSwitching(true);
                    switchHomeserverSession(mx, defaultServer);
                  }}
                >
                  <Text size="B300">Switch to {defaultServer}</Text>
                </Button>
              )}
            </Box>
          }
        />
      </SequenceCard>
    </Box>
  );
}
