# SQL Migrations

This directory contains SQL scripts for creating and updating database tables.

## Applying Migrations

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of the SQL file
4. Paste and run the query

### Option 2: Using psql
```bash
psql -h <your-supabase-host> -U postgres -d postgres -f sql/create_user_settings_table.sql
```

## Migration Files

- `create_user_settings_table.sql` - Creates the user_settings table for storing user preferences

## Table Descriptions

### user_settings
Stores user preferences and configuration settings for the dashboard.

Columns:
- `user_id`: Unique identifier for the user (default: 'default')
- `refresh_interval`: Auto-refresh interval in minutes
- `critical_threshold`: Risk score threshold for critical alerts
- `high_threshold`: Risk score threshold for high alerts
- `medium_threshold`: Risk score threshold for medium alerts
- `email_alerts`: Enable/disable email alerts
- `push_notifications`: Enable/disable push notifications
- `critical_only`: Only send notifications for critical alerts
- `daily_digest`: Enable/disable daily digest emails
- `weekly_report`: Enable/disable weekly reports
- `updated_at`: Timestamp of last update
