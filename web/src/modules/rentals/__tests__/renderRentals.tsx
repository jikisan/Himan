import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RentalsPage } from '../presentation/pages/RentalsPage';

const tileName = (title: string) => new RegExp(`^${title}(,|$)`);
const isHub = (href: string | null) => /^\/rentals\/[^/]+$/.test(href ?? '');

/** Renders rentals at an address under the real route; with none, opens the first property's To do, where the old single screen landed. */
export function renderRentals(at?: string) {
  const view = render(<MemoryRouter initialEntries={[at ?? '/rentals']}>
    <Routes><Route path="/rentals/:propertyId?/:section?" element={<RentalsPage />} /></Routes>
  </MemoryRouter>);
  if (!at) {
    const first = screen.queryAllByRole('link').find((l) => isHub(l.getAttribute('href')));
    if (first) {
      fireEvent.click(first);
      fireEvent.click(screen.getByRole('link', { name: tileName('To do') }));
    }
  }
  return view;
}

/** Opens a section from the property screen, going back to it first from another section. */
export function openSection(title: 'To do' | 'Rooms' | 'Tenants' | 'Bills' | 'Analytics') {
  if (!screen.queryByRole('link', { name: tileName(title) })) {
    const hub = screen.queryAllByRole('link').find((l) => isHub(l.getAttribute('href')));
    if (hub) fireEvent.click(hub);
  }
  fireEvent.click(screen.getByRole('link', { name: tileName(title) }));
}

/** Back to the property screen from a section. */
export function goToProperty() {
  const hub = screen.queryAllByRole('link').find((l) => isHub(l.getAttribute('href')));
  if (hub) fireEvent.click(hub);
}

/** Picks an item from the property screen's More menu (owners only). */
export function propertyAction(item: 'Edit property' | 'Share' | 'Archive' | 'Unarchive') {
  goToProperty();
  fireEvent.pointerDown(screen.getByRole('button', { name: 'More property actions' }), { button: 0, ctrlKey: false });
  fireEvent.click(screen.getByRole('menuitem', { name: item }));
}
