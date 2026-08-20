-- SystemSettings: singleton facility-wide config (branding, photo limits).
-- NotificationSetting: per-NotificationType on/off toggle — a missing row
-- means "enabled", matching the current hardcoded always-on behaviour, so
-- no backfill is needed for existing notification types.

CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "organizationName" TEXT,
    "logoUrl" TEXT,
    "maxPhotoSizeMb" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationSetting" (
    "type" "NotificationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("type")
);
