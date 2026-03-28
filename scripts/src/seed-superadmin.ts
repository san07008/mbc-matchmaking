import { db, pool } from "@workspace/db";
import { usersTable, sessionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const SUPER_ADMIN_EMAIL = process.env.VITE_SUPER_ADMIN_EMAIL;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

if (!SUPER_ADMIN_EMAIL) {
  console.error("VITE_SUPER_ADMIN_EMAIL is not set");
  process.exit(1);
}
if (!SUPER_ADMIN_PASSWORD) {
  console.error("SUPER_ADMIN_PASSWORD is not set");
  process.exit(1);
}

async function main() {
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, SUPER_ADMIN_EMAIL!)).limit(1);

  if (existing.length > 0) {
    const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD!, 10);
    await db.delete(sessionsTable).where(eq(sessionsTable.userId, existing[0].id));
    await db.update(usersTable).set({ role: "superadmin", passwordHash }).where(eq(usersTable.id, existing[0].id));
    console.log(`Updated existing super admin account: ${SUPER_ADMIN_EMAIL}`);
  } else {
    const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD!, 10);
    await db.insert(usersTable).values({
      email: SUPER_ADMIN_EMAIL!,
      passwordHash,
      role: "superadmin",
      displayName: "",
    });
    console.log(`Created super admin account: ${SUPER_ADMIN_EMAIL}`);
  }

  const oldAdmins = await db.select().from(usersTable).where(eq(usersTable.email, "nostrax1@gmail.com"));
  for (const old of oldAdmins) {
    await db.delete(sessionsTable).where(eq(sessionsTable.userId, old.id));
    await db.delete(usersTable).where(eq(usersTable.id, old.id));
    console.log(`Removed old test account: nostrax1@gmail.com`);
  }

  await pool.end();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
