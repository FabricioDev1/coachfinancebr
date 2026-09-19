# Edição e datas dos lançamentos

## Entregas
- Adicionar uma ação de editar em cada lançamento existente.
- Reutilizar o formulário de lançamento para abrir os dados atuais, permitir alterações e salvar sem criar duplicatas.
- Incluir a data de emissão/competência separada da data de vencimento/pagamento.
- Exibir as duas datas na listagem para facilitar a consulta.
- Manter a edição restrita ao lançamento selecionado, inclusive quando ele fizer parte de parcelas ou recorrências.
- Salvar a nova data com segurança e manter os registros existentes compatíveis.

## Detalhes técnicos
- Adicionar `issue_date` aos lançamentos, preenchendo registros antigos inicialmente com a data de vencimento.
- Criar a operação de atualização com validação e filtro pela conta autenticada.
- Adaptar tipos, consultas e formulário para carregar e persistir o novo campo.
- Validar criação, edição e visualização em computador e celular.
