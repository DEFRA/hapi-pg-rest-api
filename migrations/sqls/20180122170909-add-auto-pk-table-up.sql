/* Replace with your SQL commands */

-- Table: public.autopk_test

-- DROP TABLE public.autopk_test;


CREATE TABLE autopk_test
(
    id BIGSERIAL NOT NULL,
    name character varying COLLATE pg_catalog."default",
    CONSTRAINT autopk_test_pkey PRIMARY KEY (id)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;
