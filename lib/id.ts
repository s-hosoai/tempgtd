// UnixTime(ms) をIDとして採番する。衝突時は1msずつずらす。
let lastId = 0

export function generateId(): number {
  const now = Date.now()
  if (now > lastId) {
    lastId = now
  } else {
    lastId += 1
  }
  return lastId
}
