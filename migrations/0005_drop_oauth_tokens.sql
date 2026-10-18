-- Google tokens are no longer stored (src/server/auth/account.ts); clear the ones saved before.
UPDATE "Account"
SET "access_token" = NULL, "refresh_token" = NULL, "id_token" = NULL, "expires_at" = NULL,
    "token_type" = NULL, "scope" = NULL, "session_state" = NULL, "refresh_token_expires_in" = NULL;
