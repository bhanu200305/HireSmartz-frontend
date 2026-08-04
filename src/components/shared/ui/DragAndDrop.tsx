import { useDrag, useDrop } from 'react-dnd';
import { useRef } from 'react';
import { HiDotsVertical } from 'react-icons/hi';

type DraggableItemProps = {
  item: any;
  index: number;
  moveItem: (fromIndex: number, toIndex: number) => void;
  children: (props: { isOver: boolean }) => React.ReactNode;
  renderDragHandle?: boolean;
};

type DragItem = {
  index: number;
  id: string;
  type: string;
};

export const DraggableItem = ({
  item,
  index,
  moveItem,
  children,
  renderDragHandle = true,
}: DraggableItemProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'ITEM',
    item: { index, id: item.id.toString() },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'ITEM',
    drop(item: DragItem) {
      if (item.index !== index) {
        moveItem(item.index, index);
      }
    },
    // hover(item: DragItem, monitor) {
    //   if (!ref.current) return
    //   const hoverBoundingRect = ref.current.getBoundingClientRect()
    //   const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
    //   const clientOffset = monitor.getClientOffset()
    //   const hoverClientY = (clientOffset?.y ?? 0) - hoverBoundingRect.top
    //   if (item.index < index && hoverClientY < hoverMiddleY) return
    //   if (item.index > index && hoverClientY > hoverMiddleY) return
    //   const scrollThreshold = 100
    //   const scrollSpeed = 10

    //   if (hoverClientY < scrollThreshold) {
    //     window.scrollBy(0, -scrollSpeed)
    //   } else if (hoverClientY > window.innerHeight - scrollThreshold) {
    //     window.scrollBy(0, scrollSpeed)
    //   }
    // },
    hover(_, monitor) {
      if (!ref.current) return;

      const clientOffset = monitor.getClientOffset();

      if (!clientOffset) return;

      const scrollThreshold = 300;
      const scrollSpeed = 20;

      const viewportHeight = window.innerHeight;

      const { y } = clientOffset;

      if (y < scrollThreshold) {
        window.scrollBy({ top: -scrollSpeed, behavior: 'smooth' });
      }

      if (y > viewportHeight - scrollThreshold) {
        window.scrollBy({ top: scrollSpeed, behavior: 'smooth' });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`relative transition-all duration-200 ${
        isDragging ? 'opacity-50 shadow-xl' : 'opacity-100'
      }`}
      style={{
        transform: isDragging ? 'scale(1.02)' : 'none',
        zIndex: isDragging ? 100 : 'auto',
      }}
    >
      {renderDragHandle && (
        <div className="mr-3 cursor-move flex items-center justify-center bg-[#E5E5E5] rounded-full p-2 shadow-sm h-8 w-8">
          <div className="relative" style={{ width: '12px', height: '20px' }}>
            <HiDotsVertical className="absolute left-0" style={{ fontSize: '20px' }} />
            <HiDotsVertical className="absolute right-0" style={{ fontSize: '20px' }} />
          </div>
        </div>
      )}
      {children({ isOver })}
    </div>
  );
};
