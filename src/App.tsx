import clsx from "clsx";
import { useDragToSelect } from "./useDragToSelect";

const items = Array.from({ length: 300 }, (_, i) => i + "");

export function App() {
  const {
    containerRef,
    dragVector,
    handlers,
    isDragging,
    scrollVector,
    selectedItems,
  } = useDragToSelect();

  const selectionRect =
    dragVector && scrollVector && containerRef.current
      ? dragVector
          .add(scrollVector)
          .clamp(
            new DOMRect(
              0,
              0,
              containerRef.current.scrollWidth,
              containerRef.current.scrollHeight
            )
          )
          .toDOMRect()
      : null;

  return (
    <div>
      <div className="relative z-10 flex flex-row justify-between">
        <div className="px-2 border-2 border-black bg-white">
          selectable area
        </div>
        {Object.keys(selectedItems).length > 0 && (
          <div className="px-2 border-2 border-black bg-white">
            count: {Object.keys(selectedItems).length}
          </div>
        )}
      </div>
      <div
        className="container relative z-0 border-2 border-black grid grid-cols-[repeat(20,min-content)] gap-4 p-4 max-h-96 overflow-auto focus:outline-none focus:border-dashed -translate-y-0.5"
        ref={containerRef}
        tabIndex={-1}
        {...handlers}
      >
        {items.map((item) => (
          <Item key={item} id={item} isSelected={selectedItems[item]} />
        ))}
        {selectionRect && isDragging && (
          <div
            className="absolute border-black border-2 bg-black/30"
            style={{
              top: selectionRect.y,
              left: selectionRect.x,
              width: selectionRect.width,
              height: selectionRect.height,
            }}
          />
        )}
      </div>
    </div>
  );
}

export function Item({
  id,
  isSelected = false,
}: {
  id: string;
  isSelected?: boolean;
}) {
  return (
    <div
      data-item={id}
      className={clsx(
        "border-2 size-10 border-black flex justify-center items-center",
        isSelected ? "bg-black text-white" : "bg-white text-black"
      )}
    >
      {id}
    </div>
  );
}
