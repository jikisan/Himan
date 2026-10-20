import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShareListDialog } from '../presentation/components/ShareListDialog';
import { AddShopperDialog } from '../presentation/components/AddShopperDialog';
import { SessionTabsContent } from '../presentation/components/SessionTabsContent';
import { StartSessionDialog } from '../presentation/components/StartSessionDialog';
import { ItemDetailSheet } from '../presentation/components/ItemDetailSheet';
import type { GroceryListType } from '../domain';

const marked = (input: HTMLElement) => document.querySelector(`label[for="${input.id}"] [aria-hidden="true"]`)?.textContent;

describe('ShareListDialog invite errors', () => {
  const open = (onInvite = vi.fn()) => render(<ShareListDialog open onOpenChange={vi.fn()} listName="Weekly"
    members={[{ id: 'm', userId: 'me', role: 'owner', joinedAt: new Date() }]} invitations={[]} currentUserId="me"
    onInvite={onInvite} onCancelInvitation={vi.fn()} onRemoveMember={vi.fn()} />);

  it('focuses an invalid email and shows the message under it', async () => {
    const onInvite = vi.fn();
    open(onInvite);
    const email = screen.getByLabelText(/Email address/);
    expect(email).toBeRequired();
    expect(marked(email)).toContain('*');
    fireEvent.change(email, { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: /Invite/ }));
    await waitFor(() => expect(document.activeElement).toBe(email));
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('share-email-error')).toHaveTextContent('Please enter a valid email address');
    expect(onInvite).not.toHaveBeenCalled();
    fireEvent.change(email, { target: { value: 'a@b.co' } });
    expect(email).not.toHaveAttribute('aria-invalid');
  });
  it('shows a refused invitation under the email', async () => {
    open(vi.fn().mockRejectedValue(new Error('dup')));
    fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: 'a@b.co' } });
    fireEvent.click(screen.getByRole('button', { name: /Invite/ }));
    await waitFor(() => expect(document.getElementById('share-email-error')).toHaveTextContent('Failed to send invitation'));
  });
});

describe('AddShopperDialog errors', () => {
  const open = (onAddShopper = vi.fn()) => render(<AddShopperDialog open onOpenChange={vi.fn()} members={[]} participants={[]}
    currentUserId="me" startedBy="me" onAddShopper={onAddShopper} onRemoveShopper={vi.fn()} isAdding={false} />);

  it('focuses the empty email and shows the message under it', async () => {
    open();
    const email = screen.getByLabelText(/Shopper email/);
    expect(email).toBeRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Add shopper' }));
    await waitFor(() => expect(document.activeElement).toBe(email));
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('shopper-email-error')).toHaveTextContent('Enter an email address');
  });
  it('shows an unknown shopper under the email', async () => {
    open(vi.fn().mockRejectedValue(new Error('User not found')));
    fireEvent.change(screen.getByLabelText(/Shopper email/), { target: { value: 'a@b.co' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add shopper' }));
    await waitFor(() => expect(document.getElementById('shopper-email-error')).toHaveTextContent('User not found with that email'));
    expect(document.activeElement).toBe(screen.getByLabelText(/Shopper email/));
  });
});

describe('SessionTabsContent add item errors', () => {
  const open = (addSessionItem = vi.fn()) => {
    const props = { activeSession: { items: [] } as unknown as ComponentProps<typeof SessionTabsContent>['activeSession'],
      sessionItemsByListAndCategory: new Map(), purchasedSessionItems: [], sessionCollapseStamp: null, addSessionItem,
      isAddingSessionItem: false, purchaseItem: vi.fn(), unpurchaseItem: vi.fn(), triggerSessionCollapse: vi.fn() };
    render(<SessionTabsContent {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Add item/i }));
  };
  it('focuses the empty item name and shows the message under it', async () => {
    const add = vi.fn();
    open(add);
    const name = screen.getByLabelText(/Item name/);
    expect(name).toBeRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(document.activeElement).toBe(name));
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('session-item-name-error')).toHaveTextContent('Enter an item name');
    expect(add).not.toHaveBeenCalled();
  });
  it('shows a failed add in the banner at the top', async () => {
    open(vi.fn().mockRejectedValue(new Error('x')));
    fireEvent.change(screen.getByLabelText(/Item name/), { target: { value: 'Milk' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to add item');
  });
});

describe('StartSessionDialog errors', () => {
  const list = { id: 'l', name: 'Weekly', isArchived: false, itemCount: 2 } as GroceryListType;
  it('focuses the list picker first, then the store name', async () => {
    const onStart = vi.fn();
    render(<StartSessionDialog open onOpenChange={vi.fn()} lists={[list]} recentStores={[]} onStart={onStart} isStarting={false} />);
    const store = screen.getByLabelText(/Store name/);
    expect(store).toBeRequired();
    expect(marked(store)).toContain('*');
    fireEvent.click(screen.getByRole('button', { name: /Start Shopping/ }));
    const picker = screen.getByRole('group', { name: /Select lists to shop/ });
    await waitFor(() => expect(document.activeElement).toBe(picker));
    expect(document.getElementById('session-lists-error')).toHaveTextContent('Select at least one list');
    expect(document.getElementById('store-name-error')).toHaveTextContent('Enter a store name');
    fireEvent.click(screen.getByRole('button', { name: /Weekly/ }));
    expect(document.getElementById('session-lists-error')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Start Shopping/ }));
    await waitFor(() => expect(document.activeElement).toBe(store));
    expect(store).toHaveAttribute('aria-invalid', 'true');
    expect(onStart).not.toHaveBeenCalled();
  });
});

describe('ItemDetailSheet errors', () => {
  it('focuses the empty name instead of silently ignoring the save', async () => {
    const onAdd = vi.fn();
    render(<ItemDetailSheet open onOpenChange={vi.fn()} item={null} mode="add" listId="l" onSave={vi.fn()} onAdd={onAdd} onDelete={vi.fn()} />);
    const name = screen.getByLabelText(/^Name/);
    expect(name).toBeRequired();
    expect(marked(name)).toContain('*');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(document.activeElement).toBe(name));
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('item-name-error')).toHaveTextContent('Enter an item name');
    expect(onAdd).not.toHaveBeenCalled();
  });
});
