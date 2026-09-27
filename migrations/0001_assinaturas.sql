CREATE TABLE assinaturas (
  id        integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo      text NOT NULL CHECK (tipo IN ('tema', 'autor')),
  valor     text NOT NULL CHECK (length(valor) > 0),
  criada_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, valor)
);
