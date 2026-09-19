# Revisão das exclusões

## Objetivo
Tornar a remoção de cartões e lançamentos segura, clara e consistente com os dados salvos.

## Entregas
- Adicionar exclusão de cartões com confirmação.
- Bloquear a exclusão quando o cartão possuir lançamentos vinculados, preservando o histórico.
- Confirmar a exclusão de lançamentos simples antes de removê-los.
- Em parcelas ou recorrências, permitir escolher entre excluir somente o item selecionado ou toda a série.
- Exibir retorno de sucesso ou erro após cada operação.
- Garantir o mesmo comportamento para dados de demonstração e dados da conta.

## Detalhes técnicos
- Registrar o vínculo entre itens de uma série usando o campo de relacionamento já existente nos lançamentos.
- Manter as regras atuais de acesso por usuário no banco de dados.
- Validar os fluxos de confirmação, bloqueio e atualização das listas.
