"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { FileWorkspaceRow, type FileWorkspaceRowItem } from "@/components/workspace/FileWorkspaceRow";

function SortableWorkspaceRow({
  canMoveDown,
  canMoveUp,
  item,
  index,
  onMoveDown,
  onMoveUp,
  onRemove,
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  item: FileWorkspaceRowItem;
  index: number;
  onMoveDown?: () => void;
  onMoveUp?: () => void;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <FileWorkspaceRow
        dragAttributes={attributes}
        dragListeners={listeners}
        dragging={isDragging}
        index={index}
        item={item}
        canMoveDown={canMoveDown}
        canMoveUp={canMoveUp}
        onMoveDown={onMoveDown}
        onMoveUp={onMoveUp}
        onRemove={onRemove}
      />
    </div>
  );
}

export function FileWorkspaceGrid({
  items,
  onMove,
  onRemove,
  onReorder,
}: {
  items: FileWorkspaceRowItem[];
  onMove?: (itemId: string, direction: -1 | 1) => void;
  onRemove?: (itemId: string) => void;
  onReorder: (itemIds: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    onReorder(arrayMove(items, oldIndex, newIndex).map((item) => item.id));
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="grid gap-3">
          {items.map((item, index) => (
            <SortableWorkspaceRow
              index={index}
              item={item}
              canMoveDown={index < items.length - 1}
              canMoveUp={index > 0}
              key={item.id}
              onMoveDown={onMove ? () => onMove(item.id, 1) : undefined}
              onMoveUp={onMove ? () => onMove(item.id, -1) : undefined}
              onRemove={onRemove ? () => onRemove(item.id) : undefined}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
