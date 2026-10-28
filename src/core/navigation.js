export function detailQuery(search, kind, commandId) {
  const query = new URLSearchParams(search);
  query.delete("command");
  query.delete("cabin");
  if (kind === "command") query.set("command", commandId);
  else if (["floorCodes", "cargo", "agv"].includes(kind))
    query.set("cabin", kind);
  return query.toString();
}
