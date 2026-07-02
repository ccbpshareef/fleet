export function asFleetList(value) {
  return Array.isArray(value) ? value : [];
}

export function upsertFleetItem(items, item) {
  if (!item?.id) {
    return items;
  }
  return [item, ...items.filter((row) => row.id !== item.id)];
}
