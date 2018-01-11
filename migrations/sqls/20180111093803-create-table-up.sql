/* Replace with your SQL commands */
-- Table: test.sessions

-- DROP TABLE test.sessions;

CREATE TABLE sessions
(
    session_id character varying COLLATE pg_catalog."default" NOT NULL,
    session_data character varying COLLATE pg_catalog."default" NOT NULL,
    ip character varying COLLATE pg_catalog."default" NOT NULL,
    date_created timestamp with time zone NOT NULL,
    date_updated timestamp with time zone,
    CONSTRAINT sessions_pkey PRIMARY KEY (session_id)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE sessions
    OWNER to postgres;
