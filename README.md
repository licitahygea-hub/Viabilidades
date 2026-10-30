# Viabilidade Médicos

Sistema web (React + Vite) que reproduz a planilha **Viabilidade_Medicos_NOVO MODELO.xlsx**, feito para usar no celular e no computador.

## O que tem

| Seção | Equivale à aba | O que faz |
|---|---|---|
| Painel | Painel | Veredito (viável / atenção / inviável), régua de margem, KPIs, limites da disputa, composição do faturamento, checklist do comitê, mercado |
| Processo | Processo | Identificação, valores e prazos, regras do edital, equipe técnica, empresa atual, pesquisa de preço, comitê |
| TR | TR | Quadro de itens com conversão de carga (h/dia, h/semana, plantões) e botão para levar os itens à Margem |
| Margem | Margem | Itens (estimado, proposto, a pagar), custos indiretos, resultado consolidado e limites para a disputa |
| Simulador de lances | Simulador de Lances | Tabela de descontos (passo e limite ajustáveis) e teste de um lance específico |
| Concorrentes | Concorrentes | Ranking com valor mensal, desconto e a nossa margem em cada preço |
| Projeção 10 anos | Projeção 10 anos | 12 meses e 10 anos com reajustes, detalhamento opcional de tributos e itens |
| Quadro do comitê | TR Apresentação | Quadro pronto para copiar e colar no slide ou no Excel |
| Premissas | Premissas | ISS, PIS, COFINS, CSLL, IR, reajustes e margem mínima |

Os cálculos seguem as mesmas fórmulas da planilha (conferidos célula a célula com um cenário de teste).

Cada viabilidade é um lote. Para outro lote do mesmo edital, use **Duplicar** na tela inicial.

## Automações (sem custo, sem IA)

- **Edital e anexos (Painel):** anexe PDF, DOCX, TXT ou ZIP. O texto é extraído no próprio navegador e um leitor por regras (`src/lib/extrator.js`) procura os dados do Processo: órgão, CNPJ, município/UF e capital, modalidade, número do edital e do processo, data e horário da sessão, critério de julgamento, modo de disputa, objeto, locais de execução, valor estimado, vigência, prorrogação, garantias, participação de cooperativas/consórcios/OS/OSCIP, subcontratação, EPI, alimentação, coordenação/RT, cursos (ACLS, ATLS, PALS…), RQE/título/pós-graduação e as especialidades citadas. Antes de aplicar você confere cada valor; depois, cada campo mostra a **fonte** (arquivo, página e trecho) e abre o documento na página. Campos não encontrados são listados para preenchimento manual. PDFs digitalizados (imagem, sem texto) não são lidos.
- **Empresa atual (Processo):** a função `/api/empresa-atual` consulta os contratos publicados no PNCP pelo órgão (CNPJ) e pelos órgãos do município, escolhe os contratos de serviços médicos, prioriza os vigentes e completa porte, sede e sócio-administrador pela BrasilAPI (dados da Receita Federal). Há também atalhos de pesquisa para portal da transparência, tribunal de contas e diário oficial.
- **Especialidades (Processo → Equipe técnica):** as 55 especialidades do CFM (Resolução CFM nº 2.380/2024), com “Com RQE” ou “Com Pós”, e opção de incluir especialidades próprias (ficam salvas no navegador).
- **Comitê de precificação:** a data prevista é sugerida automaticamente na terça ou quinta anterior à data da disputa (ex.: disputa sexta 30/10/2026, comitê quinta 29/10/2026). Se você mudar a data à mão, ela deixa de ser recalculada; apague a data para voltar à sugestão.
- **Enviar para precificação (fim da Margem):** monta o e-mail para licitacao@doccsc.com.br com o descritivo e a data do comitê. Sem configuração extra, abre o e-mail pronto no seu aplicativo de e-mail; com Resend configurado, envia direto.

### Variáveis de ambiente (opcionais — Vercel → Settings → Environment Variables)

| Variável | Para quê |
|---|---|
| `APP_ACCESS_KEY` | Senha simples que protege as funções do servidor. Se definir, informe a mesma em **Configurações** na tela inicial do app |
| `RESEND_API_KEY` e `EMAIL_FROM` | Envio direto do e-mail de precificação (ex.: `EMAIL_FROM="Viabilidade <avisos@seudominio.com.br>"`, domínio verificado no Resend) |

Depois de criar ou mudar variáveis, faça um novo deploy (Deployments → Redeploy). Se você tinha criado `ANTHROPIC_API_KEY`, pode apagá-la: não é mais usada.

## Onde ficam os dados

Os dados ficam salvos no navegador (localStorage) de cada aparelho, e os arquivos do edital no IndexedDB do mesmo navegador. Não há banco de dados nem login. O backup `.json` leva os dados, mas não os arquivos anexados.
Use **Exportar tudo** para gerar um backup `.json` e **Importar backup** para restaurar ou levar para outro aparelho.

## Rodar no computador

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (normalmente http://localhost:5173).

`npm run dev` não executa as funções da pasta `api/` (busca da empresa atual e envio direto de e-mail). Para testá-las no computador, use a CLI da Vercel: `npm i -g vercel`, `vercel link` e `vercel dev`. A leitura do edital funciona normalmente com `npm run dev`.

## Publicar no GitHub

```bash
git init
git add .
git commit -m "Viabilidade médicos: primeira versão"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/viabilidade-medicos.git
git push -u origin main
```

(Crie antes o repositório vazio `viabilidade-medicos` no GitHub.)

## Publicar na Vercel

1. Entre em https://vercel.com e clique em **Add New → Project**.
2. Importe o repositório do GitHub.
3. A Vercel detecta Vite sozinha (o `vercel.json` já define `npm run build` e a pasta `dist`). Clique em **Deploy**.

A cada `git push` na branch `main`, a Vercel publica a nova versão automaticamente.

No celular, abra o link e use **Adicionar à tela inicial** para ter um atalho com ícone.

## Personalizar

- Listas de opções (empresas, modalidades, status etc.): `src/lib/lists.js`
- Premissas padrão (alíquotas, reajustes, margem mínima): `DEFAULT_PREMISSAS` em `src/lib/model.js`
- Campos da aba Processo: `PROCESSO_SECTIONS` em `src/lib/model.js`
- Fórmulas: `src/lib/calc.js`
- Cores e layout: `src/styles.css`
- Especialidades do CFM: `src/lib/especialidades.js`
- Regras de leitura do edital (padrões procurados em cada campo): `src/lib/extrator.js`
- Regra da data do comitê (terças e quintas): `src/lib/comite.js`
- Texto do e-mail de precificação: `src/components/EnviarPrecificacao.jsx`
