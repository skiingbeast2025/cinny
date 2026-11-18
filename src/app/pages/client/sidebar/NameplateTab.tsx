import React from 'react';
import { Icon, Icons } from 'folds';
import { useAtom } from 'jotai';
import { SidebarAvatar, SidebarItem, SidebarItemTooltip } from '../../../components/sidebar';
import { Modal500 } from '../../../components/Modal500';
import { Settings, SettingsPages } from '../../../features/settings';
import { nameplatesModalAtom } from '../../../state/nameplatesModal';

export function NameplateTab() {
  const [open, setOpen] = useAtom(nameplatesModalAtom);
  const closeModal = () => setOpen(false);

  return (
    <SidebarItem active={open}>
      <SidebarItemTooltip tooltip="Name Plates">
        {(triggerRef) => (
          <SidebarAvatar
            as="button"
            ref={triggerRef}
            outlined
            aria-label="Name Plates"
            data-testid="sidebar-nameplate-tab"
            onClick={() => setOpen(true)}
          >
            <Icon src={Icons.Star} filled={open} />
          </SidebarAvatar>
        )}
      </SidebarItemTooltip>
      {open && (
        <Modal500 requestClose={closeModal}>
          <Settings initialPage={SettingsPages.NameplatesPage} requestClose={closeModal} />
        </Modal500>
      )}
    </SidebarItem>
  );
}
