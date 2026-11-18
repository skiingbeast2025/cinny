import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ClientEvent,
  ClientEventHandlerMap,
  MatrixClient,
  MatrixEvent,
  Room,
  RoomMember,
  RoomMemberEvent,
  RoomMemberEventHandlerMap,
  RoomStateEvent,
  RoomStateEventHandlerMap,
  SyncState,
} from 'matrix-js-sdk';
import {
  areNameplatesEqual,
  DEFAULT_NAMEPLATE,
  NAMEPLATE_EVENT_TYPE,
  NameplateConfig,
  parseNameplate,
} from '../utils/nameplate';
import { useMatrixClient } from './useMatrixClient';
import { Membership, StateEvent } from '../../types/matrix/room';

const ROOM_SYNC_THROTTLE_MS = 150;
const LOCAL_CACHE_PREFIX = 'lunamix_nameplate:';

const waitMs = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function getCachedOwnNameplate(userId: string | null | undefined): NameplateConfig | undefined {
  if (!userId) return undefined;
  try {
    const raw = window.localStorage.getItem(`${LOCAL_CACHE_PREFIX}${userId}`);
    if (!raw) return undefined;
    return parseNameplate(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function setCachedOwnNameplate(userId: string | null | undefined, config: NameplateConfig): void {
  if (!userId) return;
  try {
    window.localStorage.setItem(`${LOCAL_CACHE_PREFIX}${userId}`, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}

function getOwnAccountDataNameplate(mx: MatrixClient): NameplateConfig | undefined {
  const fromMatrix = parseNameplate(mx.getAccountData(NAMEPLATE_EVENT_TYPE)?.getContent());
  const cached = getCachedOwnNameplate(mx.getUserId());
  if (fromMatrix && cached) {
    return cached.updatedAt > fromMatrix.updatedAt ? cached : fromMatrix;
  }
  return fromMatrix ?? cached;
}

async function syncRoomMemberNameplate(
  mx: MatrixClient,
  room: Room,
  userId: string,
  config: NameplateConfig
): Promise<void> {
  const member = room.getMember(userId);
  const currentContent = (member?.events.member?.getContent() ?? {}) as Record<string, unknown>;
  const existing = parseNameplate(currentContent[NAMEPLATE_EVENT_TYPE]);
  if (areNameplatesEqual(existing, config)) return;

  const nextContent: Record<string, unknown> = {
    ...currentContent,
    membership: Membership.Join,
    [NAMEPLATE_EVENT_TYPE]: config,
  };
  await mx.sendStateEvent(room.roomId, StateEvent.RoomMember, nextContent, userId);
}

/**
 * Subscribe to the signed-in user's active nameplate from Matrix account data
 * (`org.lunamix.nameplate`) and save changes across both account data and all
 * joined rooms.
 */
export function useOwnNameplate() {
  const mx = useMatrixClient();
  const [nameplate, setNameplate] = useState<NameplateConfig>(
    () => getOwnAccountDataNameplate(mx) ?? DEFAULT_NAMEPLATE
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const refreshFromMatrix = () => {
      const resolved = getOwnAccountDataNameplate(mx) ?? DEFAULT_NAMEPLATE;
      setNameplate(resolved);
    };
    refreshFromMatrix();

    const handleAccountData: ClientEventHandlerMap[ClientEvent.AccountData] = (event) => {
      if (event.getType() !== NAMEPLATE_EVENT_TYPE) return;
      const parsed = parseNameplate(event.getContent()) ?? DEFAULT_NAMEPLATE;
      setCachedOwnNameplate(mx.getUserId(), parsed);
      setNameplate(parsed);
    };
    const handleSync: ClientEventHandlerMap[ClientEvent.Sync] = (state) => {
      if (state === SyncState.Prepared) {
        const remote = parseNameplate(mx.getAccountData(NAMEPLATE_EVENT_TYPE)?.getContent());
        if (remote) {
          setCachedOwnNameplate(mx.getUserId(), remote);
          setNameplate(remote);
        }
      }
    };

    mx.on(ClientEvent.AccountData, handleAccountData);
    mx.on(ClientEvent.Sync, handleSync);
    return () => {
      mx.removeListener(ClientEvent.AccountData, handleAccountData);
      mx.removeListener(ClientEvent.Sync, handleSync);
    };
  }, [mx]);

  const saveNameplate = useCallback(
    async (draft: NameplateConfig): Promise<NameplateConfig> => {
      const sanitized = parseNameplate({
        ...draft,
        version: 1,
        updatedAt: Date.now(),
      }) ?? {
        ...DEFAULT_NAMEPLATE,
        updatedAt: Date.now(),
      };

      setSaving(true);
      setError(undefined);
      try {
        setCachedOwnNameplate(mx.getUserId(), sanitized);
        await mx.setAccountData(
          NAMEPLATE_EVENT_TYPE,
          sanitized as unknown as Record<string, unknown>
        );
        setNameplate(sanitized);

        const userId = mx.getUserId();
        if (userId) {
          const joinedRooms = mx
            .getRooms()
            .filter((room) => room.getMyMembership() === Membership.Join);

          await joinedRooms.reduce(
            (chain, room, idx) =>
              chain.then(async () => {
                if (idx > 0) await waitMs(ROOM_SYNC_THROTTLE_MS);
                try {
                  await syncRoomMemberNameplate(mx, room, userId, sanitized);
                } catch {
                  // Ignore single-room state event errors so remaining rooms still sync.
                }
              }),
            Promise.resolve()
          );
        }
        return sanitized;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save nameplate';
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [mx]
  );

  return { nameplate, saving, error, saveNameplate };
}

/**
 * Reactively read a member's equipped nameplate from `m.room.member` in `room`,
 * falling back to the signed-in user's account data nameplate for self.
 */
export function useRoomMemberNameplate(
  room: Room | undefined,
  userId: string
): NameplateConfig | undefined {
  const mx = useMatrixClient();
  const isSelf = mx.getUserId() === userId;

  const readPlate = useCallback((): NameplateConfig | undefined => {
    const memberContent = room?.getMember(userId)?.events.member?.getContent() as
      | Record<string, unknown>
      | undefined;
    const memberPlate = parseNameplate(memberContent?.[NAMEPLATE_EVENT_TYPE]);
    if (isSelf) {
      const ownPlate = getOwnAccountDataNameplate(mx);
      if (ownPlate && (!memberPlate || ownPlate.updatedAt >= memberPlate.updatedAt)) {
        return ownPlate;
      }
    }
    return memberPlate;
  }, [mx, room, userId, isSelf]);

  const [nameplate, setNameplate] = useState<NameplateConfig | undefined>(() => readPlate());

  useEffect(() => {
    setNameplate(readPlate());
    if (!room) return undefined;

    const handleMemberUpdate: RoomStateEventHandlerMap[RoomStateEvent.Members] = (
      _event: MatrixEvent,
      stateMember: RoomMember
    ) => {
      if (stateMember.userId !== userId) return;
      setNameplate(readPlate());
    };
    const handleStateUpdate: RoomStateEventHandlerMap[RoomStateEvent.Update] = () => {
      setNameplate(readPlate());
    };
    const handleAccountData: ClientEventHandlerMap[ClientEvent.AccountData] = (event) => {
      if (!isSelf || event.getType() !== NAMEPLATE_EVENT_TYPE) return;
      setNameplate(readPlate());
    };
    const handleSync: ClientEventHandlerMap[ClientEvent.Sync] = (state) => {
      if (state === SyncState.Prepared) setNameplate(readPlate());
    };

    room.currentState.on(RoomStateEvent.Members, handleMemberUpdate);
    room.currentState.on(RoomStateEvent.Update, handleStateUpdate);
    if (isSelf) {
      mx.on(ClientEvent.AccountData, handleAccountData);
      mx.on(ClientEvent.Sync, handleSync);
    }
    return () => {
      room.currentState.removeListener(RoomStateEvent.Members, handleMemberUpdate);
      room.currentState.removeListener(RoomStateEvent.Update, handleStateUpdate);
      if (isSelf) {
        mx.removeListener(ClientEvent.AccountData, handleAccountData);
        mx.removeListener(ClientEvent.Sync, handleSync);
      }
    };
  }, [mx, room, userId, isSelf, readPlate]);

  return nameplate;
}

/**
 * Automatically propagate the signed-in user's active account-data nameplate
 * whenever they join a room whose `m.room.member` state lacks it.
 */
export function useSyncNameplateOnJoin(): void {
  const mx = useMatrixClient();
  const syncedRoomsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const userId = mx.getUserId();
    if (!userId) return undefined;

    const handleMembership: RoomMemberEventHandlerMap[RoomMemberEvent.Membership] = (
      _event: MatrixEvent,
      member: RoomMember
    ) => {
      if (member.userId !== userId || member.membership !== Membership.Join) return;
      const room = mx.getRoom(member.roomId);
      const ownPlate = getOwnAccountDataNameplate(mx);
      if (!room || !ownPlate || ownPlate.mode === 'none') return;

      const lastSyncedAt = syncedRoomsRef.current.get(room.roomId);
      if (lastSyncedAt === ownPlate.updatedAt) return;

      const memberContent = member.events.member?.getContent() as
        | Record<string, unknown>
        | undefined;
      const roomPlate = parseNameplate(memberContent?.[NAMEPLATE_EVENT_TYPE]);
      if (areNameplatesEqual(roomPlate, ownPlate)) return;

      syncedRoomsRef.current.set(room.roomId, ownPlate.updatedAt);
      syncRoomMemberNameplate(mx, room, userId, ownPlate).catch(() => {
        syncedRoomsRef.current.delete(room.roomId);
      });
    };

    mx.on(RoomMemberEvent.Membership, handleMembership);
    return () => {
      mx.removeListener(RoomMemberEvent.Membership, handleMembership);
    };
  }, [mx]);
}
