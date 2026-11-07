# 💰 Coach Finance BR

**Controle financeiro pessoal que entende cartão de crédito.** Registre gastos em vários cartões, Pix, débito e dinheiro, e veja cada compra cair na fatura certa, de acordo com o dia de fechamento e de vencimento de cada cartão.

🔗 **Acesse:** https://coachfinancebr.lovable.app

> [!NOTE]
> O projeto está em **fase beta**. Qualquer pessoa pode explorar o **modo demonstração** sem criar conta. Contas novas ficam pendentes até o acesso ser liberado pelo administrador; assim que isso acontece, a pessoa vê o aviso "Seu acesso foi liberado".

<!-- Sugestão: adicione aqui 2 ou 3 prints (início, lançamentos e cartões) salvos em docs/prints/ -->

---

## 📌 Por que este projeto existe

Quem usa **mais de um cartão de crédito**, além de Pix, débito e dinheiro, perde fácil a noção de quanto já gastou e do que ainda vai vencer. Uma compra feita depois do fechamento só entra na fatura do mês seguinte, e as parcelas se espalham por vários meses.

O Coach Finance BR centraliza tudo isso em um só lugar e faz as contas de fatura, parcelas e saldo por você.

O projeto também é um laboratório prático do meu **MBA em Inteligência Artificial**: ele foi construído com desenvolvimento assistido por IA (Lovable) e tem um assistente de IA dentro do próprio app.

---

## ✨ Funcionalidades

### Lançamentos
- Receitas e despesas com **data de competência** e **data de vencimento**
- **Parcelamentos** com divisão exata em centavos
- **Recorrências** mensais, com os próximos meses gerados automaticamente
- Edição e exclusão com confirmação
- Filtros por mês, cartão, categoria e faixa de valor

### Cartões e faturas
- Vários cartões, cada um com dia de fechamento, vencimento, limite e cor
- Cálculo automático da **fatura correta** para cada compra
- Consulta da fatura de cada cartão por mês de vencimento e dos gastos futuros

### Planejamento
- Comparação entre o mês atual e o próximo
- Acompanhamento de contas e faturas futuras
- **Reserva de emergência** separada do saldo disponível

### Categorias
- Categorias personalizadas por usuário, com um conjunto padrão no primeiro acesso
- Renomear uma categoria atualiza todos os lançamentos ligados a ela
- Gráficos de gastos por categoria

### 🤖 Assistente de lançamentos (IA)
- Escreva ou **fale** algo como "gastei 45 reais no mercado no cartão Nubank" e o assistente monta o lançamento
- Você **confere e confirma** antes de salvar; nada é gravado sem a sua aprovação
- Por enquanto registra apenas despesas, com limite de 30 usos por dia

### Conta e privacidade
- Cadastro, login e recuperação de senha
- **Exportação** dos dados em CSV
- **Exclusão da conta** com remoção de todos os dados financeiros
- Cada usuário só enxerga os próprios dados (Row Level Security no banco)

### 📱 Uso no celular
- Layout responsivo, testado em smartphones
- **App instalável (PWA):** no iPhone, abra no Safari e toque em *Compartilhar → Adicionar à Tela de Início*; no Android, use *Instalar app* no menu do Chrome

---

## 🛠️ Tecnologias

| Camada | Ferramentas |
|---|---|
| Front-end | React 19, TanStack Start e Router, TypeScript |
| Interface | Tailwind CSS 4, shadcn/ui, Recharts |
| Back-end e dados | Supabase (PostgreSQL, autenticação e RLS), funções de servidor do TanStack Start |
| IA | Gateway de IA da Lovable, usado pelo assistente de lançamentos |
| Desenvolvimento | Lovable, com o código sincronizado neste repositório |

---

## 🚀 Como rodar localmente

Pré-requisitos: [Bun](https://bun.sh) (ou Node.js 20+) e um projeto no Supabase.

```bash
git clone https://github.com/FabricioDev1/coachfinancebr.git
cd coachfinancebr
bun install
```

Crie um arquivo `.env` na raiz com as credenciais do seu Supabase:

```bash
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # usado só no servidor (exclusão de conta)
```

Aplique as migrações da pasta `supabase/migrations` no seu banco e inicie o projeto:

```bash
bun run dev
```

> O assistente de IA depende do gateway da Lovable e só funciona no ambiente publicado.

---

## 📂 Estrutura do projeto

```
src/
├── routes/        # Páginas (início, lançamentos, cartões, planejamento, categorias, conta, acessos)
├── components/    # Componentes de interface (finance/ e ui/)
├── lib/           # Regras de negócio: datas, faturas, parcelas, cálculos, categorias, CSV e assistente
└── integrations/  # Clientes do Supabase e da Lovable
supabase/
└── migrations/    # Estrutura do banco, políticas de segurança e gatilhos
```

As regras financeiras ficam centralizadas em `src/lib` como funções puras, para que todas as telas usem exatamente o mesmo cálculo de fatura e saldo. Os testes ficam ao lado delas (`*.test.ts`).

---

## 🗺️ Roadmap

O histórico completo está em [`roadmap.md`](roadmap.md). Próximas ideias:

- 🔔 Lembretes de contas e faturas antes do vencimento
- 🎯 Orçamento por categoria com alerta de limite
- 📥 Importação de extrato bancário (OFX ou CSV)
- 💹 Registro de receitas pelo assistente
- 📧 Resumo mensal por e-mail
- 🐷 Metas de economia ligadas à reserva de emergência

---

## 👨‍💻 Desenvolvedor

**Fabrício Santos**: aluno do MBA em Inteligência Artificial, explorando como transformar problemas reais em produtos digitais com apoio de IA.

🔗 GitHub: [@FabricioDev1](https://github.com/FabricioDev1)

Sugestões e relatos de erro são bem-vindos pelas [Issues](https://github.com/FabricioDev1/coachfinancebr/issues).

---

## 📄 Licença

© 2026 Fabrício Santos. Todos os direitos reservados.

O código está público para fins de estudo e portfólio: você pode ler, estudar e se inspirar nele. A cópia, redistribuição ou uso comercial do código ou da marca Coach Finance BR depende de autorização do autor.
