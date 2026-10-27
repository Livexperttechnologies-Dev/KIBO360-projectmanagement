ALTER TABLE "refresh_tokens"
ADD COLUMN "two_factor_verified" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "user_two_factors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "encrypted_secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_verified_step" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_two_factors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_two_factors_user_id_key" ON "user_two_factors"("user_id");

ALTER TABLE "user_two_factors"
ADD CONSTRAINT "user_two_factors_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "security_settings" (
    "id" TEXT NOT NULL,
    "global_two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "security_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "security_settings" ("id", "global_two_factor_enabled", "updated_at")
VALUES ('global', false, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
