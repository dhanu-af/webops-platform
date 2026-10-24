-- Staff sign in with a User ID instead of an email address.
-- 1. add loginId, 2. backfill every existing user (employeeId if set, else the
-- part of the email before the @, cleaned and made unique), 3. enforce it,
-- 4. make email optional. Nobody is deleted and no password changes.
ALTER TABLE "User" ADD COLUMN "loginId" TEXT;

WITH base AS (
  SELECT id,
         lower(regexp_replace(coalesce(nullif("employeeId", ''), split_part("email", '@', 1)), '[^A-Za-z0-9._-]', '', 'g')) AS b
  FROM "User"
), cleaned AS (
  SELECT id,
         CASE WHEN length(b) < 3 OR b !~ '^[a-z0-9]' THEN 'user' || substr(id, 1, 6) ELSE substr(b, 1, 32) END AS b
  FROM base
), ranked AS (
  SELECT id, b, row_number() OVER (PARTITION BY b ORDER BY id) AS rn FROM cleaned
)
UPDATE "User" u
SET "loginId" = CASE WHEN r.rn = 1 THEN r.b ELSE substr(r.b, 1, 25) || '-' || substr(u.id, 1, 6) END
FROM ranked r
WHERE u.id = r.id;

ALTER TABLE "User" ALTER COLUMN "loginId" SET NOT NULL;
CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
