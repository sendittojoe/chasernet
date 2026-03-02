/**
 * Push a real-time event to a user's UserPresenceDO.
 *
 * Usage:
 *   await pushToUser(env, userId, { type:'dm', payload:{...} })
 *   await pushToUser(env, userId, { type:'notification', payload:{...} })
 *   await pushToUser(env, userId, { type:'model_alert', payload:{...} })
 *
 * Non-blocking — if the DO is unreachable, logs a warning and continues.
 */
export async function pushToUser(env, userId, event) {
  const origin = env.CHAT_ORIGIN ?? 'https://chat.chasernet.com'
  try {
    const res = await fetch(`${origin}/user/${userId}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...event, timestamp: event.timestamp ?? Date.now() }),
    })
    return await res.json()
  } catch (err) {
    console.warn(`[pushToUser] ${userId} failed:`, err.message)
    return { delivered: false, error: err.message }
  }
}

/**
 * Create a notification in D1 AND push it in real-time.
 */
export async function createNotification(env, db, { userId, type, title, body, link }) {
  const id  = crypto.randomUUID()
  const now = Date.now()

  await db.run(
    `INSERT INTO notifications (id, user_id, type, title, body, link, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, userId, type, title, body ?? null, link ?? null, now]
  )

  // Push real-time
  await pushToUser(env, userId, {
    type: 'notification',
    payload: { id, type, title, body, link, read: 0, created_at: now },
  })

  return id
}
