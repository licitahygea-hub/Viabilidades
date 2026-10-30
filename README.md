# Sistema de Viabilidade de Licitações (React + Vite)

Sistema web responsivo (celular e computador) montado a partir da planilha
`planilha/Parametros_Modelo_Viabilidade.xlsx`.

## Como rodar

```bash
npm install
npm run dev          # abre em http://localhost:5173 (e na rede local, para testar no celular)
npm run build        # gera a pasta dist/ para hospedar
npm run build:arquivo-unico   # gera um único dist/index.html que abre direto no navegador
```

Requer Node.js 18 ou superior.

## Como a planilha vira o sistema

| Coluna da planilha | Uso no sistema |
|---|---|
| **B** – Bloco (aba) | Itens do menu lateral, grupo "Cadastro" (Processo, TR, Premissas, Margem, Concorrentes) |
| **C** – Seção | Quadros dentro de cada tela de cadastro |
| **D** – Parâmetro | Campos a preencher |
| **E** – Célula | Mostrada em cada campo (ex.: `Processo!C14`) para referência ao modelo Excel |
| **F** – Vai pra onde | De/para: cada campo alimenta automaticamente a(s) tela(s) Cliente, Margem e/ou Agenda |
| **G** – Tipo | Controle e validação do campo (texto, número, R$, %, data, hora, lista) |
| **H** – Opções | Únicos valores aceitos nas listas |
| **I** – Preenchimento | Obrigatório (marcado com *), Se houver, Opcional ou Fórmula padrão |
| **K / L** – Exemplo / Observação | Texto de exemplo e ajuda abaixo do campo |

Quando o mesmo campo aparece em mais de uma linha com destinos diferentes (ex.: Data da sessão → margem
e agenda), ele é preenchido uma vez só e enviado para todos os destinos.

A ordem do menu segue a lista "Bloco (aba)" da aba `Planilha1`.

### Atualizar depois de editar a planilha

1. Salve a planilha nova em `planilha/Parametros_Modelo_Viabilidade.xlsx` (ou passe o caminho).
2. Rode `npm run config` (ou `npm run config -- caminho/da/planilha.xlsx`).
3. O arquivo `src/config/parametros.json` é regenerado e o sistema passa a usar os novos campos.

## Padronização das entradas

- Listas aceitam somente as opções da coluna H.
- Município/UF: nome do município + UF escolhida numa lista das 27 UFs; a capital é preenchida automaticamente pela UF.
- CNPJ: máscara e conferência dos dígitos verificadores.
- Números, R$ e % no formato brasileiro (1.234,56); percentuais entre 0% e 100%.
- "Qtd informada" aceita número ou conta simples (ex.: `=2920/12`).
- "Valor unit. ESTIMADO" aceita valor em R$ ou a marcação Sigiloso.
- Campos de fórmula padrão ficam em branco e mostram o valor automático (Qtd/mês = horas do TR;
  Valor estimado global = estimado mensal × 12; Reajuste dos indiretos = IPCA).

## Telas

- **Dashboard**: filtros de Estado e Município (vindos do cadastro de clientes) e, por especialidade:
  data de abertura, especialidade, valor hora, valor global, margem e empresa arrematante
  (o concorrente com status "Vencedor").
- **Processos**: criar, abrir, duplicar, excluir, exportar e importar backup (.json).
- **Cadastro**: uma tela por bloco da coluna B, com contador de obrigatórios no menu.
- **Telas alimentadas**: Cliente, Margem (com a composição de preço, resultado e limites para a disputa,
  pelas mesmas fórmulas do modelo Margem Médicos) e Agenda (sessões de todos os processos).

Os dados ficam salvos no navegador (localStorage). Para compartilhar entre pessoas ou aparelhos,
use Exportar/Importar backup ou ligue o sistema a um banco de dados (ponto de troca: `src/lib/armazenamento.js`).

O processo de exemplo usa os dados reais do PE 037/2026 FAMESP (Botucatu/SP) e reproduz a margem de 7,32% da planilha.
