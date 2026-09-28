# Rastreador de literatura científica

Acompanha publicações novas do arXiv sobre os temas e autores que o usuário assina. Single-user.

## Language

### Assinaturas

**Assinatura**:
Interesse registrado do usuário, de tipo **tema** ou **autor**, com um valor de texto. O par (tipo, valor) é único.
_Avoid_: inscrição, subscription, alerta

**Tema**:
Assinatura cujo valor é uma frase buscada no arXiv. A busca do arXiv reduz palavras ao radical, então um tema de uma palavra traz artigos fora do assunto (ADR 0005).
_Avoid_: tópico, palavra-chave, query

**Autor**:
Assinatura cujo valor é um nome de pessoa. Ainda sem identidade própria além do nome (fatia 5).
_Avoid_: pesquisador

### Artigos

**Artigo**:
Publicação do arXiv no domínio, identificada pelo ID do arXiv **sem** versão (`2401.12345`, `hep-th/9901001`).
_Avoid_: paper, publicação, entrada (quando se fala do domínio)

**Versão**:
Número da revisão de um artigo no arXiv (v1, v2…). É atributo do artigo, não parte da identidade. O artigo guarda só a mais recente e nunca volta para uma anterior; as outras ficam nos artigos crus (ADR 0006).
_Avoid_: revisão

**Artigo cru**:
O XML de uma entrada exatamente como o arXiv devolveu, gravado a cada ingestão, append-only. Permite reprocessar sem buscar de novo.
_Avoid_: raw, cache

**Entrada**:
Um `<entry>` do feed Atom do arXiv, antes de virar artigo.
_Avoid_: item, registro

### Operações

**Ingestão**:
Buscar no arXiv as entradas de uma assinatura e gravar artigos e artigos crus.
_Avoid_: importação, sync, coleta

**Fatia**:
Unidade de trabalho vertical (domínio → persistência → HTTP → teste), rastreada como sub-issue do plano de fatias.
_Avoid_: sprint, etapa, camada
