/* Replace with your SQL commands */
/* Replace with your SQL commands */
-- Table: test.sessions

-- DROP TABLE test.sessions;


CREATE TABLE numericpk_test
(
    id BIGINT NOT NULL,
    name character varying COLLATE pg_catalog."default",
    CONSTRAINT numericpk_test_pkey PRIMARY KEY (id)
)
