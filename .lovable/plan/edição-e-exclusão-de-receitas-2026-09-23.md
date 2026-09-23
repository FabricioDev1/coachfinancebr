# Edição e exclusão de receitas

## Entregas
- Exibir as receitas cadastradas na área de Planejamento.
- Adicionar uma ação de editar em cada receita, reutilizando o formulário com os dados atuais.
- Salvar alterações sem criar uma nova receita.
- Adicionar exclusão com confirmação para evitar remoções acidentais.
- Atualizar os totais dos meses imediatamente após editar ou excluir.
- Manter cada operação restrita à conta conectada e compatível com os dados de demonstração.

## Detalhes técnicos
- Criar operações de atualização e exclusão no provedor financeiro, filtradas pelo usuário autenticado.
- Adaptar o formulário para os modos de criação e edição.
- Usar os componentes de diálogo e confirmação já existentes no projeto.
- Validar os três fluxos na tela de Planejamento.