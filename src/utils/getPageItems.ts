export default function getPageItems<T extends Array<any>>(
  itemsArray: T,
  currentPage: number,
  PAGE_SIZE: number
): T[number][] {
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  let pageItems = itemsArray.slice(startIndex, endIndex).filter((item) => Boolean(item));
  if (!pageItems.length) {
    pageItems = itemsArray.slice(0, PAGE_SIZE).filter((item) => Boolean(item));
  }
  return pageItems;
}
