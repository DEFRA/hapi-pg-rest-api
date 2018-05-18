/* Replace with your SQL commands */
ALTER TABLE sessions
  DROP COLUMN session_data;

ALTER TABLE sessions
  ADD COLUMN session_data jsonb;
