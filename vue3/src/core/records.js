export function filterRecords(
  tasks,
  {
    deviceId,
    status = "pending",
    query = "",
    priority = "all",
    floor = "all",
    descending = true,
  },
) {
  return tasks
    .filter(
      (t) =>
        t.deviceId === deviceId &&
        (status === "completed"
          ? t.status === "completed"
          : t.status !== "completed") &&
        t.id.toLowerCase().includes(query.toLowerCase()) &&
        (priority === "all" || t.priority === priority) &&
        (floor === "all" ||
          t.origin === Number(floor) ||
          t.destination === Number(floor)),
    )
    .sort((a, b) =>
      descending
        ? b.created.localeCompare(a.created)
        : a.created.localeCompare(b.created),
    );
}
export function recordsCsv(rows) {
  const cell = (value) => {
    let text = String(value ?? "");
    if (/^[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const lines = [
    [
      "指令编号",
      "设备",
      "起点楼层",
      "目标楼层",
      "状态",
      "优先级",
      "下发时间",
      "耗时",
    ],
    ...rows.map((t) => [
      t.id,
      t.deviceId,
      t.origin,
      t.destination,
      t.status,
      t.priority,
      t.created,
      t.duration,
    ]),
  ];
  return "\uFEFF" + lines.map((row) => row.map(cell).join(",")).join("\r\n");
}
