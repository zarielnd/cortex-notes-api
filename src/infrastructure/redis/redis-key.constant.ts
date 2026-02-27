export const RedisKeys = {
  user: (id: string) => `user:${id}`,
  selection: (id: string) => `selection:${id}`,
  selectionMembers: (id: string) => `selection:${id}:members`,
  note: (id: string) => `note:${id}`,
  ability: (userId: string, selectionId: string) =>
    `ability:${userId}:${selectionId}`,
  resetToken: (hash: string) => `reset-token:${hash}`,
  refreshFamily: (userId: string) => `refresh-family:${userId}`,
} as const;

export const RedisTtl = {
  USER: 600, // 10 min
  SELECTION: 300, // 5 min
  NOTE: 180, // 3 min
  ABILITY: 300, // 5 min
  RESET_TOKEN: 600, // 10 min
} as const;
