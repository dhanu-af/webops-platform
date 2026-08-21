-- NotificationRecipient: additional per-type recipients on top of whatever
-- the triggering code already targets (a role broadcast or a specific
-- person) — the "choose who receives it" piece the Settings page has
-- promised since the on/off toggle shipped.

CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationRecipient_type_userId_key" ON "NotificationRecipient"("type", "userId");

CREATE INDEX "NotificationRecipient_type_idx" ON "NotificationRecipient"("type");

ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
