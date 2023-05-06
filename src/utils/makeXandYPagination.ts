import getPageItems from "./getPageItems";

export interface PaginationOptions<T> {
  pageSize: number;
  itemsArray: Array<T>;
  itemIdFromCustomId: string;
  pageFromCustomId?: string;
}

export interface PaginationResult<T> {
  totalPages: number;
  currentPage: number;
  previousPage: number;
  nextPage: number;
  pageItems: Array<T>;
  selectedItemId: string;
  previousItemId: string;
  nextItemId: string;
  currentlySelectedItem: T;
}

export default function makeXYPagination<T extends { id: string }>({
                                                                     pageSize,
                                                                     itemsArray,
                                                                     itemIdFromCustomId,
                                                                     pageFromCustomId
                                                                   }: PaginationOptions<T>): PaginationResult<T> {
  const totalPages = Math.ceil(itemsArray.length / pageSize);
  const currentPage = pageFromCustomId ? parseInt(pageFromCustomId) : 1;

  const previousPage = Math.max(0, currentPage - 1);
  const nextPage = Math.min(totalPages, currentPage + 1);
  const pageItems = getPageItems(itemsArray, currentPage, pageSize);

  const foundItem = pageItems.find((item) => item.id === itemIdFromCustomId) ?? pageItems[0];
  const selectedItemId = foundItem.id;
  const itemIndex = pageItems.findIndex((item) => item.id === selectedItemId);
  const previousItemId = pageItems.at(itemIndex - 1)?.id ?? pageItems.at(-1)?.id;
  const nextItemId = pageItems.at(itemIndex + 1)?.id ?? pageItems.at(0)?.id;

  if (!previousItemId || !nextItemId) {
    throw new Error("Could not find previous or next item id");
  }

  return {
    totalPages,
    currentPage,
    previousPage,
    nextPage,
    pageItems,
    selectedItemId,
    previousItemId,
    nextItemId,
    currentlySelectedItem: foundItem
  };
}
