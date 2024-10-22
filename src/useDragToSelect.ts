import {
  useRef,
  useState,
  useEffect,
  useCallback,
  PointerEvent,
  KeyboardEvent,
  UIEvent,
} from "react";

class DOMVector {
  constructor(
    readonly x: number,
    readonly y: number,
    readonly magnitudeX: number,
    readonly magnitudeY: number
  ) {
    this.x = x;
    this.y = y;
    this.magnitudeX = magnitudeX;
    this.magnitudeY = magnitudeY;
  }

  getDiagonalLength(): number {
    return Math.sqrt(
      Math.pow(this.magnitudeX, 2) + Math.pow(this.magnitudeY, 2)
    );
  }

  toDOMRect(): DOMRect {
    return new DOMRect(
      Math.min(this.x, this.x + this.magnitudeX),
      Math.min(this.y, this.y + this.magnitudeY),
      Math.abs(this.magnitudeX),
      Math.abs(this.magnitudeY)
    );
  }

  toTerminalPoint(): DOMPoint {
    return new DOMPoint(this.x + this.magnitudeX, this.y + this.magnitudeY);
  }

  add(vector: DOMVector): DOMVector {
    return new DOMVector(
      this.x + vector.x,
      this.y + vector.y,
      this.magnitudeX + vector.magnitudeX,
      this.magnitudeY + vector.magnitudeY
    );
  }

  clamp(vector: DOMRect): DOMVector {
    return new DOMVector(
      this.x,
      this.y,
      Math.min(vector.width - this.x, this.magnitudeX),
      Math.min(vector.height - this.y, this.magnitudeY)
    );
  }
}

function intersect(rect1: DOMRect, rect2: DOMRect): boolean {
  if (rect1.right < rect2.left || rect2.right < rect1.left) return false;

  if (rect1.bottom < rect2.top || rect2.bottom < rect1.top) return false;

  return true;
}

function shallowEqual(x: Record<string, boolean>, y: Record<string, boolean>) {
  return (
    Object.keys(x).length === Object.keys(y).length &&
    Object.keys(x).every((key) => x[key] === y[key])
  );
}

export const useDragToSelect = () => {
  const [isDragging, setIsDragging] = useState(false);

  const [dragVector, setDragVector] = useState<DOMVector | null>(null);
  const [scrollVector, setScrollVector] = useState<DOMVector | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(
    {}
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const updateSelectedItems = useCallback(
    function updateSelectedItems(
      dragVector: DOMVector,
      scrollVector: DOMVector
    ) {
      if (containerRef.current == null) return;
      const next: Record<string, boolean> = {};
      const containerRect = containerRef.current.getBoundingClientRect();
      containerRef.current.querySelectorAll("[data-item]").forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        if (containerRef.current == null) return;

        const itemRect = el.getBoundingClientRect();
        const translatedItemRect = new DOMRect(
          itemRect.x - containerRect.x + containerRef.current.scrollLeft,
          itemRect.y - containerRect.y + containerRef.current.scrollTop,
          itemRect.width,
          itemRect.height
        );

        if (
          !intersect(
            dragVector.add(scrollVector).toDOMRect(),
            translatedItemRect
          )
        )
          return;

        if (el.dataset.item && typeof el.dataset.item === "string") {
          next[el.dataset.item] = true;
        }
      });
      if (!shallowEqual(next, selectedItems)) {
        setSelectedItems(next);
      }
    },
    [selectedItems]
  );

  useEffect(() => {
    if (!isDragging || containerRef.current == null) return;

    let handle = requestAnimationFrame(scrollTheLad);

    return () => cancelAnimationFrame(handle);

    function clamp(num: number, min: number, max: number) {
      return Math.min(Math.max(num, min), max);
    }

    function scrollTheLad() {
      if (containerRef.current == null || dragVector == null) return;

      const currentPointer = dragVector.toTerminalPoint();
      const containerRect = containerRef.current.getBoundingClientRect();

      const shouldScrollRight = containerRect.width - currentPointer.x < 20;
      const shouldScrollLeft = currentPointer.x < 20;
      const shouldScrollDown = containerRect.height - currentPointer.y < 20;
      const shouldScrollUp = currentPointer.y < 20;

      const left = shouldScrollRight
        ? clamp(20 - containerRect.width + currentPointer.x, 0, 20)
        : shouldScrollLeft
        ? -1 * clamp(20 - currentPointer.x, 0, 20)
        : undefined;

      const top = shouldScrollDown
        ? clamp(20 - containerRect.height + currentPointer.y, 0, 20)
        : shouldScrollUp
        ? -1 * clamp(20 - currentPointer.y, 0, 20)
        : undefined;

      if (top === undefined && left === undefined) {
        handle = requestAnimationFrame(scrollTheLad);
        return;
      }

      containerRef.current.scrollBy({
        left,
        top,
      });

      handle = requestAnimationFrame(scrollTheLad);
    }
  }, [isDragging, dragVector, updateSelectedItems]);

  const onScroll = (e: UIEvent) => {
    if (dragVector == null || scrollVector == null) return;

    const { scrollLeft, scrollTop } = e.currentTarget;

    const nextScrollVector = new DOMVector(
      scrollVector.x,
      scrollVector.y,
      scrollLeft - scrollVector.x,
      scrollTop - scrollVector.y
    );

    setScrollVector(nextScrollVector);
    updateSelectedItems(dragVector, nextScrollVector);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;

    const containerRect = e.currentTarget.getBoundingClientRect();
    setDragVector(
      new DOMVector(
        e.clientX - containerRect.x,
        e.clientY - containerRect.y,
        0,
        0
      )
    );

    setScrollVector(
      new DOMVector(e.currentTarget.scrollLeft, e.currentTarget.scrollTop, 0, 0)
    );

    // only react to the pointer that started the drag, ignore others like hover, etc...
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (dragVector == null || scrollVector == null) return;

    const containerRect = e.currentTarget.getBoundingClientRect();

    const nextDragVector = new DOMVector(
      dragVector.x,
      dragVector.y,
      e.clientX - containerRect.x - dragVector.x,
      e.clientY - containerRect.y - dragVector.y
    );
    const selection = document.getSelection();
    const elementFromPoint = document.elementFromPoint(e.clientX, e.clientY);

    if (!isDragging && nextDragVector.getDiagonalLength() < 10) return;
    if (
      !selection?.isCollapsed &&
      selection?.focusNode?.textContent === elementFromPoint?.textContent
    ) {
      setDragVector(null);
      return;
    }

    setIsDragging(true);

    selection?.removeAllRanges();

    setDragVector(nextDragVector);
    updateSelectedItems(nextDragVector, scrollVector);
  };

  const onPointerUp = () => {
    if (!isDragging) {
      setSelectedItems({});
      setDragVector(null);
      setScrollVector(null);
    } else {
      setDragVector(null);
      setScrollVector(null);
      setIsDragging(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setSelectedItems({});
      setDragVector(null);
      setScrollVector(null);
      setIsDragging(false);
    }
  };

  return {
    containerRef,
    isDragging,
    dragVector,
    scrollVector,
    selectedItems,
    handlers: {
      onScroll,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onKeyDown,
    },
  };
};
