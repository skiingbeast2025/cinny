import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_NAMEPLATE,
  FREE_NAMEPLATE_PRESETS,
  getContrastTextColor,
  getNameplateInlineStyle,
  isPureNameplateMemberChange,
  isValidHexColor,
  isValidMxcUri,
  NAMEPLATE_EVENT_TYPE,
  parseNameplate,
} from './nameplate';

test('isValidHexColor accepts strict 6-digit hex colors and rejects CSS injection', () => {
  assert.equal(isValidHexColor('#0284c7'), true);
  assert.equal(isValidHexColor('#ABCDEF'), true);
  assert.equal(isValidHexColor('#fff'), false);
  assert.equal(isValidHexColor('red'), false);
  assert.equal(isValidHexColor('#112233; background-image: url(https://evil.test)'), false);
});

test('isValidMxcUri validates Matrix media URIs and rejects traversal/XSS', () => {
  assert.equal(isValidMxcUri('mxc://matrix.org/AbCdEf12345_'), true);
  assert.equal(isValidMxcUri('mxc://example.org:8448/media-1'), true);
  assert.equal(isValidMxcUri('https://evil.example/banner.png'), false);
  assert.equal(isValidMxcUri(`${'java'}script:alert(1)`), false);
  assert.equal(isValidMxcUri('mxc://matrix.org/../etc/passwd'), false);
  assert.equal(isValidMxcUri('mxc://matrix.org/id" onclick="alert(1)'), false);
});

test('parseNameplate sanitizes untrusted m.room.member payloads', () => {
  const malicious = {
    version: 1,
    mode: 'gradient',
    presetId: '<script>alert(1)</script>',
    colorA: 'url(https://evil.test/track)',
    colorB: '#10b981',
    finish: 'expression(alert(1))',
    textColor: 'red',
    imageMxc: 'https://evil.test/bg.png',
    updatedAt: 1700000000,
  };
  const parsed = parseNameplate(malicious);
  assert.ok(parsed);
  assert.equal(parsed.mode, 'gradient');
  assert.equal(parsed.presetId, undefined);
  assert.equal(parsed.colorA, '#2563eb');
  assert.equal(parsed.colorB, '#10b981');
  assert.equal(parsed.finish, 'clean');
  assert.equal(parsed.textColor, undefined);
  assert.equal(parsed.imageMxc, undefined);

  const badImageMode = parseNameplate({ mode: 'image', imageMxc: 'https://evil.test/x.png' });
  assert.equal(badImageMode?.mode, 'none');
  assert.equal(parseNameplate(null), undefined);
  assert.equal(parseNameplate({ mode: 'arbitrary' }), undefined);
});

test('getContrastTextColor switches between light and dark text based on luminance', () => {
  assert.equal(getContrastTextColor('#0f172a', '#1e293b'), '#ffffff');
  assert.equal(getContrastTextColor('#fde047', '#fef08a'), '#0f172a');
  assert.equal(getContrastTextColor('#bae6fd', '#e0f2fe'), '#0f172a');
});

test('getNameplateInlineStyle computes background without unsafe CSS strings', () => {
  assert.equal(getNameplateInlineStyle(DEFAULT_NAMEPLATE), undefined);
  const style = getNameplateInlineStyle({
    version: 1,
    mode: 'gradient',
    colorA: '#0284c7',
    colorB: '#06b6d4',
    finish: 'split',
    updatedAt: 1,
  });
  assert.ok(style?.backgroundImage?.includes('#0284c7'));
  assert.ok(style?.backgroundImage?.includes('#06b6d4'));

  const imgStyle = getNameplateInlineStyle(
    {
      version: 1,
      mode: 'image',
      imageMxc: 'mxc://matrix.org/abc123',
      imageOverlay: true,
      updatedAt: 1,
    },
    'https://matrix.org/_matrix/media/v3/download/matrix.org/abc123'
  );
  assert.ok(imgStyle?.backgroundImage?.includes('url("https://matrix.org/'));
});

test('isPureNameplateMemberChange filters nameplate-only updates cleanly', () => {
  const base = {
    membership: 'join',
    displayname: 'Aidric',
    avatar_url: 'mxc://example.org/ava',
  };
  assert.equal(
    isPureNameplateMemberChange(base, {
      ...base,
      [NAMEPLATE_EVENT_TYPE]: { version: 1, mode: 'solid', colorA: '#0284c7', updatedAt: 10 },
    }),
    true
  );
  assert.equal(
    isPureNameplateMemberChange(base, {
      ...base,
      displayname: 'Aidric New',
      [NAMEPLATE_EVENT_TYPE]: { version: 1, mode: 'solid', colorA: '#0284c7', updatedAt: 10 },
    }),
    false
  );
  assert.equal(isPureNameplateMemberChange(base, base), false);
});

test('FREE_NAMEPLATE_PRESETS are all parseable and include Classic', () => {
  assert.ok(FREE_NAMEPLATE_PRESETS.length >= 10);
  assert.equal(FREE_NAMEPLATE_PRESETS[0].config.mode, 'none');
  FREE_NAMEPLATE_PRESETS.forEach((preset) => {
    const parsed = parseNameplate({ ...preset.config, updatedAt: 123 });
    assert.ok(parsed);
    assert.equal(parsed.presetId, preset.id);
  });
});
