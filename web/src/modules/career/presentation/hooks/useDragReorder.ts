import { useState } from 'react';
import type { DragEvent } from 'react';

// Native HTML5 drag-and-drop — no dnd library needed for a plain vertical
// list reorder. Spread dragHandleProps(index) onto the grip handle (starts
// the drag) and dropTargetProps(index) onto the row (accepts the drop).
export function useDragReorder<T>(items: T[], onChange: (items: T[]) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const dragHandleProps = (index: number) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.setData('text/plain', '');
      setDragIndex(index);
    },
    onDragEnd: () => setDragIndex(null),
  });

  const dropTargetProps = (index: number) => ({
    onDragOver: (e: DragEvent) => e.preventDefault(),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === index) return;
      const next = [...items];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      onChange(next);
      setDragIndex(null);
    },
  });

  return { dragIndex, dragHandleProps, dropTargetProps };
}
