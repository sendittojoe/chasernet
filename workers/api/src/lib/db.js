// lib/db.js — D1 query helpers
// Wraps the D1 binding with slightly more ergonomic methods.

export function getDB(binding) {
  return {
    first:  (sql, params=[]) => binding.prepare(sql).bind(...params).first(),
    all:    (sql, params=[]) => binding.prepare(sql).bind(...params).all().then(r => r.results),
    run:    (sql, params=[]) => binding.prepare(sql).bind(...params).run(),
    batch:  (stmts)          => binding.batch(stmts),
  }
}
