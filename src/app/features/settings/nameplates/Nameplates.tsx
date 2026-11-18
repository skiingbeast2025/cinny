import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  color,
  Icon,
  IconButton,
  Icons,
  Scroll,
  Spinner,
  Switch,
  Text,
} from 'folds';
import * as css from './Nameplates.css';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../../utils/matrix';
import { nameInitials } from '../../../utils/common';
import { UserAvatar } from '../../../components/user-avatar';
import { Nameplate } from '../../../components/nameplate';
import { useOwnNameplate } from '../../../hooks/useNameplate';
import { useFilePicker } from '../../../hooks/useFilePicker';
import { createUploadAtom, UploadSuccess } from '../../../state/upload';
import { CompactUploadCardRenderer } from '../../../components/upload-card';
import {
  areNameplatesEqual,
  DEFAULT_NAMEPLATE,
  FREE_NAMEPLATE_PRESETS,
  getNameplateInlineStyle,
  NAMEPLATE_ALLOWED_IMAGE_TYPES,
  NAMEPLATE_FINISHES,
  NAMEPLATE_MAX_IMAGE_BYTES,
  NameplateConfig,
  NameplateFinish,
  NameplateMode,
  NameplatePreset,
} from '../../../utils/nameplate';

const MODE_OPTIONS: { id: NameplateMode; label: string }[] = [
  { id: 'none', label: 'Classic' },
  { id: 'solid', label: 'Solid Color' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'image', label: 'Custom Image' },
];

type TextColorChoice = 'auto' | '#ffffff' | '#0f172a';

type NameplatesProps = {
  requestClose: () => void;
};

export function Nameplates({ requestClose }: NameplatesProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const userId = mx.getSafeUserId();
  const profile = useUserProfile(userId);
  const displayName = profile.displayName ?? getMxIdLocalPart(userId) ?? userId;
  const avatarUrl = profile.avatarUrl
    ? mxcUrlToHttp(mx, profile.avatarUrl, useAuthentication, 96, 96, 'crop') ?? undefined
    : undefined;

  const { nameplate, saving, error, saveNameplate } = useOwnNameplate();
  const [draft, setDraft] = useState<NameplateConfig>(nameplate);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [uploadError, setUploadError] = useState<string>();
  const [imageFile, setImageFile] = useState<File>();

  useEffect(() => {
    setDraft(nameplate);
  }, [nameplate]);

  const uploadAtom = useMemo(() => {
    if (imageFile) return createUploadAtom(imageFile);
    return undefined;
  }, [imageFile]);

  const handleSelectImageFile = useCallback((file: File) => {
    setUploadError(undefined);
    const allowedSet: ReadonlySet<string> = new Set(NAMEPLATE_ALLOWED_IMAGE_TYPES);
    if (!allowedSet.has(file.type)) {
      setUploadError('Unsupported format. Choose a PNG, JPG, WEBP, or GIF image.');
      return;
    }
    if (file.size > NAMEPLATE_MAX_IMAGE_BYTES) {
      setUploadError('Image exceeds the 2 MB limit. Choose a smaller image.');
      return;
    }
    setImageFile(file);
  }, []);

  const pickFile = useFilePicker(handleSelectImageFile, false);

  const handleRemoveUpload = useCallback(() => {
    setImageFile(undefined);
  }, []);

  const handleCommit = useCallback(
    async (next: NameplateConfig, feedbackText = 'Saved & synced across rooms!') => {
      setStatusMessage(undefined);
      try {
        await saveNameplate(next);
        setStatusMessage(feedbackText);
      } catch {
        // Error state is handled by useOwnNameplate
      }
    },
    [saveNameplate]
  );

  const handleUploaded = useCallback(
    (upload: UploadSuccess) => {
      const next: NameplateConfig = {
        version: 1,
        mode: 'image',
        imageMxc: upload.mxc,
        imageOverlay: draft.imageOverlay ?? true,
        textColor: draft.textColor,
        updatedAt: Date.now(),
      };
      setDraft(next);
      handleRemoveUpload();
      handleCommit(next, 'Custom image uploaded & applied!');
    },
    [draft.imageOverlay, draft.textColor, handleCommit, handleRemoveUpload]
  );

  const handleApplyPreset = (preset: NameplatePreset) => {
    const next: NameplateConfig = {
      ...preset.config,
      updatedAt: Date.now(),
    };
    setDraft(next);
    handleCommit(next, `Applied "${preset.name}" nameplate!`);
  };

  const handleModeChange = (mode: NameplateMode) => {
    setStatusMessage(undefined);
    if (mode === 'none') {
      setDraft({ ...DEFAULT_NAMEPLATE, updatedAt: Date.now() });
      return;
    }
    setDraft((prev) => ({
      ...prev,
      version: 1,
      mode,
      presetId: undefined,
      colorA: prev.colorA ?? '#2563eb',
      colorB: mode === 'gradient' ? prev.colorB ?? '#7c3aed' : prev.colorB,
      finish: prev.finish ?? 'clean',
      imageOverlay: prev.imageOverlay ?? true,
      updatedAt: Date.now(),
    }));
  };

  const handleTextColorChoice = (choice: TextColorChoice) => {
    setStatusMessage(undefined);
    setDraft((prev) => ({
      ...prev,
      textColor: choice === 'auto' ? undefined : choice,
      presetId: undefined,
      updatedAt: Date.now(),
    }));
  };

  const handleResetClassic = () => {
    const next: NameplateConfig = { ...DEFAULT_NAMEPLATE, updatedAt: Date.now() };
    setDraft(next);
    setImageFile(undefined);
    setUploadError(undefined);
    handleCommit(next, 'Reset to Classic look.');
  };

  const dirty = !areNameplatesEqual(draft, nameplate);
  const currentTextChoice: TextColorChoice =
    draft.textColor === '#ffffff' || draft.textColor === '#0f172a' ? draft.textColor : 'auto';

  const avatarEl = (
    <Avatar size="300">
      <UserAvatar
        userId={userId}
        src={avatarUrl}
        renderFallback={() => <Text size="T300">{nameInitials(displayName)}</Text>}
      />
    </Avatar>
  );

  const memberPreviewAvatar = (
    <Avatar size="200">
      <UserAvatar
        userId={userId}
        src={avatarUrl}
        renderFallback={() => <Text size="T200">{nameInitials(displayName)}</Text>}
      />
    </Avatar>
  );

  return (
    <Page data-testid="nameplates-studio-page">
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              Name Plates
            </Text>
            <Badge variant="Success" fill="Soft" radii="Pill" size="300">
              <Text size="T200">Free</Text>
            </Badge>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface" aria-label="Close">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="600">
              <Box direction="Column" gap="200">
                <Text size="L400">Live Preview</Text>
                <div className={css.PreviewStage} data-testid="nameplate-live-preview">
                  <Box direction="Column" gap="400">
                    <Box direction="Column" gap="100">
                      <Text size="T200" priority="300">
                        Chat Message Header
                      </Text>
                      <Box alignItems="Center" gap="300">
                        {avatarEl}
                        <Box direction="Column" gap="100">
                          <Box alignItems="Center" gap="200">
                            <Nameplate variant="pill" nameplate={draft}>
                              <Text as="span" size="T400" style={{ fontWeight: 600 }}>
                                {displayName}
                              </Text>
                            </Nameplate>
                            <Text size="T200" priority="300">
                              Today at 12:00 PM
                            </Text>
                          </Box>
                          <Text size="T300">Hey everyone, check out my new name plate!</Text>
                        </Box>
                      </Box>
                    </Box>

                    <Box direction="Column" gap="100">
                      <Text size="T200" priority="300">
                        Members List Banner Row
                      </Text>
                      <Nameplate variant="banner" nameplate={draft}>
                        <div className={css.PreviewMemberRow}>
                          {memberPreviewAvatar}
                          <Text
                            as="span"
                            size="T400"
                            data-nameplate-text="true"
                            style={{ fontWeight: 600 }}
                            truncate
                          >
                            {displayName}
                          </Text>
                        </div>
                      </Nameplate>
                    </Box>
                  </Box>
                </div>

                <Box alignItems="Center" justifyContent="SpaceBetween" gap="200" wrap="Wrap">
                  <Box alignItems="Center" gap="200">
                    <Button
                      size="400"
                      variant={dirty ? 'Primary' : 'Success'}
                      fill="Solid"
                      radii="300"
                      disabled={
                        saving ||
                        (!dirty && draft.mode !== 'image') ||
                        (draft.mode === 'image' && !draft.imageMxc)
                      }
                      onClick={() => handleCommit(draft)}
                      data-testid="nameplate-save-btn"
                    >
                      {saving && <Spinner size="200" variant="Primary" fill="Solid" />}
                      <Text size="B300">{saving ? 'Saving...' : 'Save Name Plate'}</Text>
                    </Button>
                    <Button
                      size="400"
                      variant="Secondary"
                      fill="Soft"
                      outlined
                      radii="300"
                      disabled={saving || draft.mode === 'none'}
                      onClick={handleResetClassic}
                      data-testid="nameplate-reset-btn"
                    >
                      <Text size="B300">Reset to Classic</Text>
                    </Button>
                  </Box>
                  {(statusMessage || error) && (
                    <Text
                      size="T300"
                      style={{ color: error ? color.Critical.Main : color.Success.Main }}
                      data-testid="nameplate-status-text"
                    >
                      {error ?? statusMessage}
                    </Text>
                  )}
                </Box>
              </Box>

              <Box direction="Column" gap="200">
                <Text size="L400">Free Presets</Text>
                <div className={css.PresetsGrid}>
                  {FREE_NAMEPLATE_PRESETS.map((preset) => {
                    const selected =
                      draft.presetId === preset.id ||
                      (preset.id === 'classic' && draft.mode === 'none');
                    const swatchStyle =
                      preset.config.mode === 'none'
                        ? undefined
                        : getNameplateInlineStyle({ ...preset.config, updatedAt: 0 });
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={css.PresetCardButton}
                        aria-pressed={selected}
                        data-testid={`nameplate-preset-${preset.id}`}
                        onClick={() => handleApplyPreset(preset)}
                      >
                        <div className={css.PresetSwatch} style={swatchStyle}>
                          <span>{displayName}</span>
                        </div>
                        <Box alignItems="Center" justifyContent="SpaceBetween" gap="100">
                          <Text size="T300" truncate>
                            {preset.name}
                          </Text>
                          {selected && <Icon size="100" src={Icons.Check} />}
                        </Box>
                      </button>
                    );
                  })}
                </div>
              </Box>

              <Box direction="Column" gap="200">
                <Text size="L400">Custom Color, Finish & Image</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <SettingTile
                    title="Style Mode"
                    description="All styles are 100% free for everyone."
                  >
                    <div className={css.FinishGrid}>
                      {MODE_OPTIONS.map((opt) => (
                        <Chip
                          key={opt.id}
                          variant={draft.mode === opt.id ? 'Primary' : 'Secondary'}
                          fill={draft.mode === opt.id ? 'Soft' : 'None'}
                          outlined
                          radii="300"
                          aria-pressed={draft.mode === opt.id}
                          data-testid={`nameplate-mode-${opt.id}`}
                          onClick={() => handleModeChange(opt.id)}
                        >
                          <Text size="B300">{opt.label}</Text>
                        </Chip>
                      ))}
                    </div>
                  </SettingTile>

                  {(draft.mode === 'solid' || draft.mode === 'gradient') && (
                    <>
                      <SettingTile
                        title="Colors"
                        description="Pick one color for solid or two for a gradient."
                      >
                        <Box alignItems="Center" gap="400" wrap="Wrap">
                          <Box alignItems="Center" gap="200">
                            <input
                              id="np-color-a"
                              type="color"
                              className={css.ColorInput}
                              value={draft.colorA ?? '#2563eb'}
                              aria-label="Primary Color"
                              data-testid="nameplate-color-a"
                              onChange={(evt) => {
                                const val = evt.currentTarget.value;
                                setStatusMessage(undefined);
                                setDraft((prev) => ({
                                  ...prev,
                                  presetId: undefined,
                                  colorA: val,
                                  updatedAt: Date.now(),
                                }));
                              }}
                            />
                            <Text as="label" htmlFor="np-color-a" size="T300">
                              Primary
                            </Text>
                          </Box>
                          {draft.mode === 'gradient' && (
                            <Box alignItems="Center" gap="200">
                              <input
                                id="np-color-b"
                                type="color"
                                className={css.ColorInput}
                                value={draft.colorB ?? '#7c3aed'}
                                aria-label="Secondary Color"
                                data-testid="nameplate-color-b"
                                onChange={(evt) => {
                                  const val = evt.currentTarget.value;
                                  setStatusMessage(undefined);
                                  setDraft((prev) => ({
                                    ...prev,
                                    presetId: undefined,
                                    colorB: val,
                                    updatedAt: Date.now(),
                                  }));
                                }}
                              />
                              <Text as="label" htmlFor="np-color-b" size="T300">
                                Secondary
                              </Text>
                            </Box>
                          )}
                        </Box>
                      </SettingTile>

                      <SettingTile
                        title="Surface Finish"
                        description="Choose an HBU2-inspired texture overlay."
                      >
                        <div className={css.FinishGrid}>
                          {NAMEPLATE_FINISHES.map((fin) => {
                            const active = (draft.finish ?? 'clean') === fin.id;
                            return (
                              <Chip
                                key={fin.id}
                                variant={active ? 'Primary' : 'Secondary'}
                                fill={active ? 'Soft' : 'None'}
                                outlined
                                radii="300"
                                aria-pressed={active}
                                data-testid={`nameplate-finish-${fin.id}`}
                                onClick={() => {
                                  setStatusMessage(undefined);
                                  setDraft((prev) => ({
                                    ...prev,
                                    presetId: undefined,
                                    finish: fin.id as NameplateFinish,
                                    updatedAt: Date.now(),
                                  }));
                                }}
                              >
                                <Text size="B300">{fin.label}</Text>
                              </Chip>
                            );
                          })}
                        </div>
                      </SettingTile>
                    </>
                  )}

                  {draft.mode === 'image' && (
                    <>
                      <SettingTile
                        title="Custom Image Upload"
                        description="Upload a PNG, JPG, WEBP, or GIF banner image up to 2 MB."
                      >
                        {uploadAtom ? (
                          <Box direction="Column" gap="200">
                            <CompactUploadCardRenderer
                              uploadAtom={uploadAtom}
                              onRemove={handleRemoveUpload}
                              onComplete={handleUploaded}
                            />
                          </Box>
                        ) : (
                          <Box direction="Column" gap="200">
                            <Box alignItems="Center" gap="200" wrap="Wrap">
                              <Button
                                size="300"
                                variant="Primary"
                                fill="Soft"
                                outlined
                                radii="300"
                                onClick={() => pickFile(NAMEPLATE_ALLOWED_IMAGE_TYPES.join(','))}
                                data-testid="nameplate-upload-image-btn"
                              >
                                <Text size="B300">
                                  {draft.imageMxc ? 'Replace Image' : 'Upload Image'}
                                </Text>
                              </Button>
                              {draft.imageMxc && (
                                <Button
                                  size="300"
                                  variant="Critical"
                                  fill="None"
                                  radii="300"
                                  onClick={handleResetClassic}
                                >
                                  <Text size="B300">Remove Image</Text>
                                </Button>
                              )}
                            </Box>
                            {uploadError && (
                              <Text size="T200" style={{ color: color.Critical.Main }}>
                                {uploadError}
                              </Text>
                            )}
                          </Box>
                        )}
                      </SettingTile>
                      <SettingTile
                        title="Dark Readability Overlay"
                        description="Add a subtle dark gradient over your custom image so your username stays legible."
                        after={
                          <Switch
                            variant="Primary"
                            value={draft.imageOverlay !== false}
                            onChange={(checked) => {
                              setStatusMessage(undefined);
                              setDraft((prev) => ({
                                ...prev,
                                imageOverlay: checked,
                                updatedAt: Date.now(),
                              }));
                            }}
                          />
                        }
                      />
                    </>
                  )}

                  {draft.mode !== 'none' && (
                    <SettingTile
                      title="Text Contrast"
                      description="Auto chooses black or white text from background brightness."
                    >
                      <div className={css.FinishGrid}>
                        {(
                          [
                            { id: 'auto', label: 'Auto' },
                            { id: '#ffffff', label: 'Light Text' },
                            { id: '#0f172a', label: 'Dark Text' },
                          ] as { id: TextColorChoice; label: string }[]
                        ).map((opt) => (
                          <Chip
                            key={opt.id}
                            variant={currentTextChoice === opt.id ? 'Primary' : 'Secondary'}
                            fill={currentTextChoice === opt.id ? 'Soft' : 'None'}
                            outlined
                            radii="300"
                            aria-pressed={currentTextChoice === opt.id}
                            onClick={() => handleTextColorChoice(opt.id)}
                          >
                            <Text size="B300">{opt.label}</Text>
                          </Chip>
                        ))}
                      </div>
                    </SettingTile>
                  )}
                </SequenceCard>
              </Box>
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
