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

## Onde ficam os dados

Os dados ficam salvos no navegador (localStorage) de cada aparelho. Não há servidor nem login.
Use **Exportar tudo** para gerar um backup `.json` e **Importar backup** para restaurar ou levar para outro aparelho.

## Rodar no computador

Requer Node.js 18 ou superior.

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (normalmente http://localhost:5173).

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
