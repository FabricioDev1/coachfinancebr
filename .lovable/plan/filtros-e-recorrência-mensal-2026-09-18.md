# Filtros e recorrência mensal

## Entregas
- Adicionar filtros por cartão e por faixa de valor na tela de lançamentos.
- Manter os filtros atuais e permitir combiná-los com cartão e valor.
- Corrigir a criação mensal para gerar também o lançamento do mês seguinte.
- Preservar parcelas e séries existentes sem duplicar ou alterar lançamentos antigos.
- Validar os filtros e a criação recorrente em computador e celular.

## Detalhes técnicos
- Usar o cartão vinculado ao lançamento para o filtro, incluindo uma opção para lançamentos sem cartão.
- Aplicar valor mínimo e máximo com validação tolerante a campos vazios.
- Na criação, gerar a quantidade adequada de registros mensais com competência e vencimento avançados mês a mês.
