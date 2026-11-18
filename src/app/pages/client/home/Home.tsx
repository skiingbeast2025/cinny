import React, { MouseEventHandler, forwardRef, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Icon,
  IconButton,
  Icons,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Text,
  color,
  config,
  toRem,
} from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import FocusTrap from 'focus-trap-react';
import { factoryRoomIdByActivity, factoryRoomIdByAtoZ } from '../../../utils/sort';
import {
  NavButton,
  NavCategory,
  NavCategoryHeader,
  NavEmptyCenter,
  NavEmptyLayout,
  NavItem,
  NavItemContent,
  NavLink,
} from '../../../components/nav';
import {
  encodeSearchParamValueArray,
  getExplorePath,
  getHomeCreatePath,
  getHomeRoomPath,
  getHomeSearchPath,
  withSearchParam,
} from '../../pathUtils';
import {
  getCanonicalAliasOrRoomId,
  getCanonicalAliasRoomId,
  getMxIdLocalPart,
} from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import {
  useHomeCreateSelected,
  useHomeSearchSelected,
} from '../../../hooks/router/useHomeSelected';
import { useHomeRooms } from './useHomeRooms';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomNavCategoryButton, RoomNavItem } from '../../../features/room-nav';
import { makeNavCategoryId } from '../../../state/closedNavCategories';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { useCategoryHandler } from '../../../hooks/useCategoryHandler';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { PageNav, PageNavHeader, PageNavContent } from '../../../components/page';
import { useRoomsUnread } from '../../../state/hooks/unread';
import { markAsRead } from '../../../utils/notifications';
import { useClosedNavCategoriesAtom } from '../../../state/hooks/closedNavCategories';
import { stopPropagation } from '../../../utils/keyboard';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import {
  getRoomNotificationMode,
  useRoomsNotificationPreferencesContext,
} from '../../../hooks/useRoomsNotificationPreferences';
import { UseStateProvider } from '../../../components/UseStateProvider';
import { JoinAddressPrompt } from '../../../components/join-address-prompt';
import { _RoomSearchParams } from '../../paths';
import { useClientConfig } from '../../../hooks/useClientConfig';
import { useOwnNameplate } from '../../../hooks/useNameplate';
import { Nameplate } from '../../../components/nameplate';
import { nameplatesModalAtom } from '../../../state/nameplatesModal';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { isNameplateActive } from '../../../utils/nameplate';

type HomeMenuProps = {
  requestClose: () => void;
};
const HomeMenu = forwardRef<HTMLDivElement, HomeMenuProps>(({ requestClose }, ref) => {
  const orphanRooms = useHomeRooms();
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const unread = useRoomsUnread(orphanRooms, roomToUnreadAtom);
  const mx = useMatrixClient();

  const handleMarkAsRead = () => {
    if (!unread) return;
    orphanRooms.forEach((rId) => markAsRead(mx, rId, hideActivity));
    requestClose();
  };

  return (
    <Menu ref={ref} style={{ maxWidth: toRem(160), width: '100vw' }}>
      <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
        <MenuItem
          onClick={handleMarkAsRead}
          size="300"
          after={<Icon size="100" src={Icons.CheckTwice} />}
          radii="300"
          aria-disabled={!unread}
        >
          <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
            Mark as Read
          </Text>
        </MenuItem>
      </Box>
    </Menu>
  );
});

function HomeHeader({ isLuma }: { isLuma: boolean }) {
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const cords = evt.currentTarget.getBoundingClientRect();
    setMenuAnchor((currentState) => {
      if (currentState) return undefined;
      return cords;
    });
  };

  return (
    <>
      <PageNavHeader>
        <Box alignItems="Center" grow="Yes" gap="300">
          <Box grow="Yes">
            <Text size="H4" truncate>
              {isLuma ? 'Global & Rooms' : 'Home'}
            </Text>
          </Box>
          <Box>
            <IconButton aria-pressed={!!menuAnchor} variant="Background" onClick={handleOpenMenu}>
              <Icon src={Icons.VerticalDots} size="200" />
            </IconButton>
          </Box>
        </Box>
      </PageNavHeader>
      <PopOut
        anchor={menuAnchor}
        position="Bottom"
        align="End"
        offset={6}
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              returnFocusOnDeactivate: false,
              onDeactivate: () => setMenuAnchor(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
              isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
              escapeDeactivates: stopPropagation,
            }}
          >
            <HomeMenu requestClose={() => setMenuAnchor(undefined)} />
          </FocusTrap>
        }
      />
    </>
  );
}

function HomeEmpty() {
  const navigate = useNavigate();

  return (
    <NavEmptyCenter>
      <NavEmptyLayout
        icon={<Icon size="600" src={Icons.Hash} />}
        title={
          <Text size="H5" align="Center">
            No Rooms
          </Text>
        }
        content={
          <Text size="T300" align="Center">
            You do not have any rooms yet.
          </Text>
        }
        options={
          <>
            <Button onClick={() => navigate(getHomeCreatePath())} variant="Secondary" size="300">
              <Text size="B300" truncate>
                Create Room
              </Text>
            </Button>
            <Button
              onClick={() => navigate(getExplorePath())}
              variant="Secondary"
              fill="Soft"
              size="300"
            >
              <Text size="B300" truncate>
                Explore Community Rooms
              </Text>
            </Button>
          </>
        }
      />
    </NavEmptyCenter>
  );
}

const DEFAULT_CATEGORY_ID = makeNavCategoryId('home', 'room');
export function Home() {
  const mx = useMatrixClient();
  useNavToActivePathMapper('home');
  const scrollRef = useRef<HTMLDivElement>(null);
  const rooms = useHomeRooms();
  const notificationPreferences = useRoomsNotificationPreferencesContext();
  const roomToUnread = useAtomValue(roomToUnreadAtom);
  const navigate = useNavigate();
  const { lunamix } = useClientConfig();
  const [layoutMode] = useSetting(settingsAtom, 'layoutMode');
  const [showNameplates] = useSetting(settingsAtom, 'showNameplates');
  const isLuma = layoutMode === 'luma';
  const globalAlias = lunamix?.globalRoomAlias;
  const setNameplatesModalOpen = useSetAtom(nameplatesModalAtom);
  const { nameplate: ownNameplate } = useOwnNameplate();
  const myUserId = mx.getUserId() ?? '';
  const myProfile = useUserProfile(myUserId);
  const myDisplayName = myProfile.displayName ?? getMxIdLocalPart(myUserId) ?? myUserId;
  const hasActivePlate = showNameplates && isNameplateActive(ownNameplate);

  const selectedRoomId = useSelectedRoom();
  const createRoomSelected = useHomeCreateSelected();
  const searchSelected = useHomeSearchSelected();
  const [closedCategories, setClosedCategories] = useAtom(useClosedNavCategoriesAtom());

  const globalRoom = useMemo(() => {
    if (!isLuma || !globalAlias) return undefined;
    const canonicalRoomId = getCanonicalAliasRoomId(mx, globalAlias);
    const matched = canonicalRoomId
      ? mx.getRoom(canonicalRoomId)
      : mx
          .getRooms()
          .find(
            (r) =>
              (r.getCanonicalAlias() === globalAlias || r.getAltAliases().includes(globalAlias)) &&
              r.getMyMembership() === 'join'
          );
    if (!matched || matched.getMyMembership() !== 'join') return undefined;
    return matched;
  }, [isLuma, globalAlias, mx, rooms]);

  const noRoomToDisplay = rooms.length === 0 && !(isLuma && globalAlias);

  const sortedRooms = useMemo(() => {
    const baseRooms =
      isLuma && globalRoom ? rooms.filter((rId) => rId !== globalRoom.roomId) : rooms;
    const items = Array.from(baseRooms).sort(
      closedCategories.has(DEFAULT_CATEGORY_ID)
        ? factoryRoomIdByActivity(mx)
        : factoryRoomIdByAtoZ(mx)
    );
    if (closedCategories.has(DEFAULT_CATEGORY_ID)) {
      return items.filter((rId) => roomToUnread.has(rId) || rId === selectedRoomId);
    }
    return items;
  }, [mx, rooms, isLuma, globalRoom, closedCategories, roomToUnread, selectedRoomId]);

  const virtualizer = useVirtualizer({
    count: sortedRooms.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 38,
    overscan: 10,
  });

  const handleCategoryClick = useCategoryHandler(setClosedCategories, (categoryId) =>
    closedCategories.has(categoryId)
  );

  return (
    <PageNav>
      <HomeHeader isLuma={isLuma} />
      {isLuma && (
        <Box style={{ padding: `0 ${config.space.S200} ${config.space.S200}` }} shrink="No">
          <button
            type="button"
            onClick={() => setNameplatesModalOpen(true)}
            data-testid="home-nameplate-card"
            style={{
              width: '100%',
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'block',
            }}
          >
            <Nameplate
              variant="banner"
              nameplate={ownNameplate}
              disabled={!showNameplates}
              style={{ display: 'block', width: '100%' }}
            >
              <Box
                alignItems="Center"
                justifyContent="SpaceBetween"
                gap="200"
                style={{
                  padding: `${config.space.S200} ${config.space.S300}`,
                  borderRadius: hasActivePlate ? undefined : config.radii.R400,
                  border: hasActivePlate
                    ? undefined
                    : `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
                  backgroundColor: hasActivePlate ? undefined : color.Surface.Container,
                }}
              >
                <Box alignItems="Center" gap="200" style={{ minWidth: 0 }}>
                  <Icon size="100" src={Icons.Star} filled />
                  <Box direction="Column" style={{ minWidth: 0 }}>
                    <Text
                      size="T300"
                      data-nameplate-text={hasActivePlate ? 'true' : undefined}
                      style={{ fontWeight: 600 }}
                      truncate
                    >
                      {myDisplayName}
                    </Text>
                    <Text
                      size="T200"
                      data-nameplate-text={hasActivePlate ? 'true' : undefined}
                      priority={hasActivePlate ? undefined : '300'}
                      truncate
                    >
                      Your Name Plate
                    </Text>
                  </Box>
                </Box>
                <Badge variant="Secondary" fill="Soft" radii="Pill" size="300">
                  <Text size="T200">Edit</Text>
                </Badge>
              </Box>
            </Nameplate>
          </button>
        </Box>
      )}
      {noRoomToDisplay ? (
        <HomeEmpty />
      ) : (
        <PageNavContent scrollRef={scrollRef}>
          <Box direction="Column" gap="300">
            {isLuma && globalAlias && (
              <NavCategory data-testid="pinned-global-chat">
                <NavCategoryHeader>
                  <Box alignItems="Center" gap="200" style={{ padding: `0 ${config.space.S200}` }}>
                    <Icon size="100" src={Icons.Pin} />
                    <Text size="O400" priority="300">
                      Global Chat
                    </Text>
                    <Badge variant="Primary" fill="Soft" radii="Pill" size="200">
                      <Text size="T200">Global</Text>
                    </Badge>
                  </Box>
                </NavCategoryHeader>
                {globalRoom ? (
                  <RoomNavItem
                    room={globalRoom}
                    selected={selectedRoomId === globalRoom.roomId}
                    linkPath={getHomeRoomPath(getCanonicalAliasOrRoomId(mx, globalRoom.roomId))}
                    notificationMode={getRoomNotificationMode(
                      notificationPreferences,
                      globalRoom.roomId
                    )}
                  />
                ) : (
                  <NavItem variant="Background" radii="400">
                    <NavButton onClick={() => navigate(getHomeRoomPath(globalAlias))}>
                      <NavItemContent>
                        <Box as="span" grow="Yes" alignItems="Center" gap="200">
                          <Avatar size="200" radii="400">
                            <Icon src={Icons.Hash} size="100" />
                          </Avatar>
                          <Box as="span" grow="Yes">
                            <Text as="span" size="Inherit" truncate>
                              Join Global Chat
                            </Text>
                          </Box>
                        </Box>
                      </NavItemContent>
                    </NavButton>
                  </NavItem>
                )}
              </NavCategory>
            )}
            <NavCategory>
              <NavItem variant="Background" radii="400" aria-selected={createRoomSelected}>
                <NavButton onClick={() => navigate(getHomeCreatePath())}>
                  <NavItemContent>
                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                      <Avatar size="200" radii="400">
                        <Icon src={Icons.Plus} size="100" />
                      </Avatar>
                      <Box as="span" grow="Yes">
                        <Text as="span" size="Inherit" truncate>
                          Create Room
                        </Text>
                      </Box>
                    </Box>
                  </NavItemContent>
                </NavButton>
              </NavItem>
              <UseStateProvider initial={false}>
                {(open, setOpen) => (
                  <>
                    <NavItem variant="Background" radii="400">
                      <NavButton onClick={() => setOpen(true)}>
                        <NavItemContent>
                          <Box as="span" grow="Yes" alignItems="Center" gap="200">
                            <Avatar size="200" radii="400">
                              <Icon src={Icons.Link} size="100" />
                            </Avatar>
                            <Box as="span" grow="Yes">
                              <Text as="span" size="Inherit" truncate>
                                Join with Address
                              </Text>
                            </Box>
                          </Box>
                        </NavItemContent>
                      </NavButton>
                    </NavItem>
                    {open && (
                      <JoinAddressPrompt
                        onCancel={() => setOpen(false)}
                        onOpen={(roomIdOrAlias, viaServers, eventId) => {
                          setOpen(false);
                          const path = getHomeRoomPath(roomIdOrAlias, eventId);
                          navigate(
                            viaServers
                              ? withSearchParam<_RoomSearchParams>(path, {
                                  viaServers: encodeSearchParamValueArray(viaServers),
                                })
                              : path
                          );
                        }}
                      />
                    )}
                  </>
                )}
              </UseStateProvider>
              <NavItem variant="Background" radii="400" aria-selected={searchSelected}>
                <NavLink to={getHomeSearchPath()}>
                  <NavItemContent>
                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                      <Avatar size="200" radii="400">
                        <Icon src={Icons.Search} size="100" filled={searchSelected} />
                      </Avatar>
                      <Box as="span" grow="Yes">
                        <Text as="span" size="Inherit" truncate>
                          Message Search
                        </Text>
                      </Box>
                    </Box>
                  </NavItemContent>
                </NavLink>
              </NavItem>
            </NavCategory>
            <NavCategory>
              <NavCategoryHeader>
                <RoomNavCategoryButton
                  closed={closedCategories.has(DEFAULT_CATEGORY_ID)}
                  data-category-id={DEFAULT_CATEGORY_ID}
                  onClick={handleCategoryClick}
                >
                  Rooms
                </RoomNavCategoryButton>
              </NavCategoryHeader>
              <div
                style={{
                  position: 'relative',
                  height: virtualizer.getTotalSize(),
                }}
              >
                {virtualizer.getVirtualItems().map((vItem) => {
                  const roomId = sortedRooms[vItem.index];
                  const room = mx.getRoom(roomId);
                  if (!room) return null;
                  const selected = selectedRoomId === roomId;

                  return (
                    <VirtualTile
                      virtualItem={vItem}
                      key={vItem.index}
                      ref={virtualizer.measureElement}
                    >
                      <RoomNavItem
                        room={room}
                        selected={selected}
                        linkPath={getHomeRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}
                        notificationMode={getRoomNotificationMode(
                          notificationPreferences,
                          room.roomId
                        )}
                      />
                    </VirtualTile>
                  );
                })}
              </div>
            </NavCategory>
          </Box>
        </PageNavContent>
      )}
    </PageNav>
  );
}
