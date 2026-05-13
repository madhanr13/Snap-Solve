import sqlite3

conn = sqlite3.connect('users.db')
conn.row_factory = sqlite3.Row
rows = conn.execute('SELECT id, username, display_name, password_hash, created_at FROM users').fetchall()

print(f"Total users: {len(rows)}")
print("-" * 60)
for r in rows:
    print(f"ID          : {r['id']}")
    print(f"Username    : {r['username']}")
    print(f"Display Name: {r['display_name']}")
    print(f"Created At  : {r['created_at']}")
    print(f"Password    : {r['password_hash'][:30]}... (bcrypt hashed)")
    print("-" * 60)

conn.close()
