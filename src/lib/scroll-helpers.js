export function scrollChildIntoContainer(container, child) {
  if (!container || !child) return;

  const containerRect = container.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();

  const deltaLeft = childRect.left < containerRect.left
    ? childRect.left - containerRect.left
    : childRect.right > containerRect.right
      ? childRect.right - containerRect.right
      : 0;
  const deltaTop = childRect.top < containerRect.top
    ? childRect.top - containerRect.top
    : childRect.bottom > containerRect.bottom
      ? childRect.bottom - containerRect.bottom
      : 0;

  if (deltaLeft) container.scrollLeft += deltaLeft;
  if (deltaTop) container.scrollTop += deltaTop;
}
