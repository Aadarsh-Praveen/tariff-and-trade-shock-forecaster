-- Create user_settings table for storing user preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            TEXT NOT NULL DEFAULT 'default',
    refresh_interval   INT,
    critical_threshold INT,
    high_threshold     INT,
    medium_threshold   INT,
    email_alerts       BOOLEAN,
    push_notifications BOOLEAN,
    critical_only      BOOLEAN,
    daily_digest       BOOLEAN,
    weekly_report      BOOLEAN,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Insert default settings
INSERT INTO user_settings (user_id, refresh_interval, critical_threshold, high_threshold, medium_threshold, email_alerts, push_notifications, critical_only, daily_digest, weekly_report)
VALUES ('default', 15, 75, 50, 25, true, true, false, true, true)
ON CONFLICT (user_id) DO NOTHING;
