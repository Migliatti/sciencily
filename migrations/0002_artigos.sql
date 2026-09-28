-- Identidade do artigo: ID do arXiv sem versão (2401.12345 ou hep-th/9901001).
-- A versão é atributo, não parte da chave (decisão 1 de 0005).
CREATE TABLE artigos (
  arxiv_id      text PRIMARY KEY,
  versao        integer NOT NULL CHECK (versao >= 1),
  titulo        text NOT NULL,
  resumo        text NOT NULL,
  autores       text[] NOT NULL,
  publicado_em  timestamptz NOT NULL,
  atualizado_em timestamptz NOT NULL,
  ingerido_em   timestamptz NOT NULL DEFAULT now()
);

-- Registro append-only do que o arXiv devolveu, por ingestão (decisão 2 de 0005).
CREATE TABLE artigos_crus (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  arxiv_id      text NOT NULL,
  assinatura_id integer NOT NULL REFERENCES assinaturas (id),
  xml           text NOT NULL,
  recebido_em   timestamptz NOT NULL DEFAULT now()
);
