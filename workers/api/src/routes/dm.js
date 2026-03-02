import { Hono } from 'hono'
import { getDB } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'
import { pushToUser, createNotification } from '../lib/push.js'

const dm = new Hono()

// Get all conversations for current user (latest message per partner)
dm.get('/conversations', requireAuth, async (c) => {
  const user = c.get('user')
  const db   = getDB(c.env.DB)

  const rows = await db.all(`
    SELECT 
      d.*,
      u.username AS partner_username,
      u.avatar_color AS partner_color,
      u.role AS partner_role,
      u.last_active AS partner_last_active
    FROM (
      SELECT *,
        CASE WHEN from_id = ? THEN to_id ELSE from_id END AS partner_id,
        ROW_NUMBER() OVER (
          PARTITION BY CASE WHEN from_id = ? THEN to_id ELSE from_id END
          ORDER BY created_at DESC
        ) AS rn
      FROM direct_messages
      WHERE from_id = ? OR to_id = ?
    ) d
    JOIN users u ON u.id = d.partner_id
    WHERE d.rn = 1
    ORDER BY d.created_at DESC
  `, [user.sub, user.sub, user.sub, user.sub])

  // Count unread per partner
  const unreadRows = await db.all(
    `SELECT from_id, COUNT(*) as cnt
     FROM direct_messages
     WHERE to_id = ? AND read = 0
     GROUP BY from_id`,
    [user.sub]
  )
  const unreadMap = {}
  for (const r of unreadRows) unreadMap[r.from_id] = r.cnt

  const convos = rows.map(r => ({
    partnerId:       r.partner_id,
    partnerUsername:  r.partner_username,
    partnerColor:    r.partner_color,
    partnerRole:     r.partner_role,
    partnerOnline:   r.partner_last_active && (Date.now() - r.partner_last_active) < 5 * 60 * 1000,
    lastMessage:     r.content,
    lastMessageAt:   r.created_at,
    unread:          unreadMap[r.partner_id] ?? 0,
  }))

  return c.json({ conversations: convos })
})

// Get messages with a specific user
dm.get('/:userId', requireAuth, async (c) => {
  const user    = c.get('user')
  const partner = c.req.param('userId')
  const { limit = 50, before } = c.req.query()
  const db = getDB(c.env.DB)

  let query = `
    SELECT d.*, u.username, u.avatar_color, u.role
    FROM direct_messages d
    JOIN users u ON u.id = d.from_id
    WHERE ((d.from_id = ? AND d.to_id = ?) OR (d.from_id = ? AND d.to_id = ?))
  `
  const params = [user.sub, partner, partner, user.sub]

  if (before) {
    query += ` AND d.created_at < ?`
    params.push(+before)
  }

  query += ` ORDER BY d.created_at DESC LIMIT ?`
  params.push(+limit)

  const rows = await db.all(query, params)

  // Mark as read
  await db.run(
    `UPDATE direct_messages SET read = 1 WHERE to_id = ? AND from_id = ? AND read = 0`,
    [user.sub, partner]
  )

  return c.json({ messages: rows.reverse() })
})

// Send a DM
dm.post('/:userId', requireAuth, async (c) => {
  const user    = c.get('user')
  const partner = c.req.param('userId')
  const { content } = await c.req.json()
  if (!content?.trim()) return c.json({ error: 'content required' }, 400)
  if (partner === user.sub) return c.json({ error: 'cannot message yourself' }, 400)

  const db = getDB(c.env.DB)

  // Verify partner exists
  const partnerRow = await db.first('SELECT id FROM users WHERE id = ?', [partner])
  if (!partnerRow) return c.json({ error: 'User not found' }, 404)

  const id  = crypto.randomUUID()
  const now = Date.now()
  await db.run(
    `INSERT INTO direct_messages (id, from_id, to_id, content, read, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [id, user.sub, partner, content.trim(), now]
  )

  // Push real-time DM event to recipient
  await pushToUser(c.env, partner, {
    type: 'dm',
    payload: {
      id,
      fromId:    user.sub,
      fromUser:  user.username,
      fromColor: user.avatarColor ?? '#38BDF8',
      content:   content.trim(),
      createdAt: now,
    },
  })

  // Create notification for recipient
  await createNotification(c.env, db, {
    userId: partner,
    type:   'dm',
    title:  `New message from @${user.username}`,
    body:   content.trim().slice(0, 100),
    link:   `/app/messages/${user.sub}`,
  })

  return c.json({ id }, 201)
})

export default dm
