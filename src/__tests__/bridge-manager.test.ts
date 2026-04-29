import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { _testOnly } from '../bridge-manager.js';

const { isBridgeCommand, isNumericPermissionShortcut } = _testOnly;

describe('bridge-manager slash routing', () => {
  it('intercepts built-in bridge commands', () => {
    assert.equal(isBridgeCommand('/help'), true);
    assert.equal(isBridgeCommand('/status'), true);
    assert.equal(isBridgeCommand('/perm allow abc123'), true);
  });

  it('passes unknown slash skill commands through to Claude', () => {
    assert.equal(isBridgeCommand('/meeting-minutes 帮我整理会议纪要'), false);
    assert.equal(isBridgeCommand('/browse https://example.com'), false);
  });

  it('normalizes @bot suffixes for built-in commands', () => {
    assert.equal(isBridgeCommand('/help@claude_bot'), true);
    assert.equal(isBridgeCommand('/meeting-minutes@claude_bot test'), false);
  });
});

describe('bridge-manager numeric permission shortcuts', () => {
  it('only treats Feishu/QQ 1/2/3 as permission shortcuts when pending links exist', () => {
    const globals = globalThis as typeof globalThis & { __bridge_context__?: unknown };
    const original = globals.__bridge_context__;
    globals.__bridge_context__ = {
      store: {
        listPendingPermissionLinksByChat(chatId: string) {
          return chatId === 'chat-with-pending' ? [{ permissionRequestId: 'perm-1' }] : [];
        },
      },
    };

    try {
      assert.equal(isNumericPermissionShortcut('feishu', '1', 'chat-with-pending'), true);
      assert.equal(isNumericPermissionShortcut('qq', '２', 'chat-with-pending'), true);
      assert.equal(isNumericPermissionShortcut('feishu', '1', 'chat-without-pending'), false);
      assert.equal(isNumericPermissionShortcut('telegram', '1', 'chat-with-pending'), false);
      assert.equal(isNumericPermissionShortcut('feishu', 'approve', 'chat-with-pending'), false);
    } finally {
      if (original === undefined) {
        delete globals.__bridge_context__;
      } else {
        globals.__bridge_context__ = original;
      }
    }
  });
});
