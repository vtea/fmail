# FMail

基于 React Router Framework Mode + Cloudflare Workers 的临时邮箱服务。

[Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https://github.com/vtea/smail-main)

下列域名与资源名均为**示范**，部署时换成你自己的。不要把文档里的示例值抄进生产。

| 项 | 示范值 |
| --- | --- |
| 网站 | `https://mail.example.com`（`/` 英文，`/zh` 中文） |
| Worker | `wrangler.jsonc` 的 `name`，默认 `fmail` |
| Custom Domain | `mail.example.com`（写进 `wrangler.jsonc` 的 `routes`） |
| D1 | 绑定名必须是 `D1`；默认库名 `fmail`，把返回的 `<database-id>` 写进配置 |
| R2 | 绑定名必须是 `R2`；默认桶名 `fmail` |
| 默认收信域 | Secret `MAIL_DOMAIN` = `inbox.example` |
| 全部收信域 | Secret `MAIL_DOMAINS` = `inbox.example,mail.example` |

绑了 Custom Domain 后，`*.workers.dev` 默认关闭，请用网站域名访问。收信域名只配 Worker Secret，不要写进 `mail.ts` / `wrangler.jsonc` 的 `vars`。首页下拉**只读** Secret，不读 Email Routing，也不读网站 Custom Domain。

面向低风险场景：生成临时地址、即时看收件箱，用于注册验证、OTP、一次性下载。从签发/恢复时刻起约 24 小时后，当前会话看不到该地址；D1 / R2 **不会**自动物理删除。不建议用于银行、工作、政务、法律与关键账号找回。

---

## 完整配置教程

按顺序做完，页面能开、地址能签、验证码能进。只改代码或只点 Deploy 按钮，**不等于能收信**。

推荐首次上线顺序：

1. 本机 `pnpm install`，`pnpm wrangler login`
2. 换站时改 `BASE_URL` 和 `wrangler.jsonc` 的 `routes`；收信域名用 Secret，不要改代码
3. D1 / R2 必须是**你账号里的**资源。fork / 一键部署后，把新库的 ID 写回 `wrangler.jsonc`，不要沿用仓库里别人的 UUID
4. `pnpm run build` → `pnpm run deploy`（生产迁移 + 发布 Worker）
5. 三项 Secret：`SESSION_SECRETS`、`MAIL_DOMAIN`、`MAIL_DOMAINS`
6. Custom Domain 与 `BASE_URL` 一致（示范：`https://mail.example.com`）
7. `MAIL_DOMAINS` 里每个域在 **计算 → 电子邮件服务 → 电子邮件路由** 开全收，送到你的 Worker（`wrangler.jsonc` 的 `name`）
8. 按 **G** 节验收

前提：网站域、收信域都在**同一个** Cloudflare 账号（NS 已切过来）。本机需要 Node.js 20+ 与 pnpm。

### A. 先分清两套域名

| 用途 | 示范值 | 改哪里 | 还要在 Cloudflare 做什么 |
| --- | --- | --- | --- |
| 网站域名 | `mail.example.com` | [`app/seo.config.ts`](app/seo.config.ts) 的 `BASE_URL` + `wrangler.jsonc` 的 `routes` | Worker Custom Domain |
| 收信域名 | `inbox.example`（默认）、`mail.example` | Worker Secret `MAIL_DOMAIN` / `MAIL_DOMAINS` | 每个域 Email Routing **全收** → 你的 Worker |

`mail.example.com` 只解决打开页面，不要当收信域。根域若也在 `MAIL_DOMAINS` 里，还要让该域 MX 变成 Cloudflare Email Routing；公网 MX 仍指向 Google Workspace、飞书等其它提供商时，`xxx@该根域` 进不了本服务。

首页下拉只读运行时 Secret。没配则下拉为空、签发禁用。`.dev.vars.example` 里的 `your-mail-domain.example` 也是占位符，本地复制后改成自己的域。

### B. 要改的配置

#### 0. 运行时参数

这些值**不进 git**。Builds 里的同名变量**不会**变成运行时 Secret。

| 参数 | 类型 | 配在哪 | 示范 / 格式 | 不配会怎样 |
| --- | --- | --- | --- | --- |
| `SESSION_SECRETS` | Secret（必做） | Worker（`wrangler.jsonc` 的 `name`）→ Settings → Variables and Secrets，或 `pnpm wrangler secret put SESSION_SECRETS` | 长随机串。本地生成：`openssl rand -base64 32`。轮换：`新密钥,旧密钥`（最左侧签名） | 首页 / 签发 / 详情 500 |
| `MAIL_DOMAIN` | Secret | 同上 | `inbox.example`。主机名，不要 `https://`、`@`、引号、中文逗号 | 下拉没有默认项 |
| `MAIL_DOMAINS` | Secret | 同上 | `inbox.example,mail.example` | 下拉为空并提示未配置；入站不在列表会被 `setReject` |
| `BASE_URL` | 代码常量 | [`app/seo.config.ts`](app/seo.config.ts) | `https://mail.example.com`（有协议、无末尾 `/`） | sitemap / canonical / OG 指错站 |
| D1 `D1` | `wrangler.jsonc` | `database_name` / `database_id` | `fmail` / `<database-id>` | 读写失败或打到错库 |
| R2 `R2` | `wrangler.jsonc` | `bucket_name` | `fmail`（object key = 邮件 `id`） | 能进列表、打不开正文 |
| Custom Domain | `wrangler.jsonc` `routes` | `{ "pattern": "mail.example.com", "custom_domain": true }` | 部署时绑定 | 只能走 `*.workers.dev`（绑自定义域后默认会关掉） |

`secrets.required` 为上述三项。`keep_vars: true`，`pnpm run deploy` 带 `--keep-vars`，不会用仓库覆盖控制台明文变量。不要把 Secret 写进 `vars`。

**控制台：**

1. Dashboard → **Workers & Pages** → 你的 Worker → **Settings** → **Variables and Secrets**
2. **Add** → **Secret**
3. `SESSION_SECRETS` = `openssl rand -base64 32` 的一整行
4. `MAIL_DOMAIN` = `inbox.example`
5. `MAIL_DOMAINS` = `inbox.example,mail.example`
6. 改 Secret **即时生效**，不必为换收信域重新 deploy。Edit 覆盖整段；清空下拉则 Delete（Secret 和明文都要看）

**命令行（交互式粘贴，不要把密钥写进 argv）：**

```bash
pnpm wrangler login
pnpm wrangler secret put SESSION_SECRETS
pnpm wrangler secret put MAIL_DOMAIN
# inbox.example
pnpm wrangler secret put MAIL_DOMAINS
# inbox.example,mail.example
```

`MAIL_DOMAIN` 若不在 `MAIL_DOMAINS` 里，运行时会并进列表并作为默认。签发、恢复、入站只认合并后的列表。

#### 1. 网站对外 URL

```ts
export const BASE_URL = "https://mail.example.com";
```

带 `https://`，不要末尾 `/`。写进 canonical、hreflang、`/sitemap.xml`、`/robots.txt`、OG、JSON-LD。改完必须重新部署。

#### 2. 收信域名

只配环境变量。本地三项写进 `.dev.vars`（从 [`.dev.vars.example`](.dev.vars.example) 复制后改成自己的域）。存在 `.dev.vars` 时 Wrangler 不读 `.env`。`pnpm run build` 会删掉 `build/server/.dev.vars`；`pnpm run preview` 再从项目根拷回一份。

不要把 Cloudflare API Token 写进 `.dev.vars.example`（会进 git）。本机 Token 用 `.dev.vars` 的 `CLOUDFLARE_API_TOKEN`，或本机 `wrangler login`。

### C. 本地开发

```bash
pnpm install
cp .dev.vars.example .dev.vars
# 把 MAIL_* 改成你的域后再：
pnpm run dev
```

- [http://localhost:5173](http://localhost:5173)、[http://localhost:5173/zh](http://localhost:5173/zh)
- `predev` / `prepreview` 会跑 `migrate:local`（`migrations/*.sql`）。已在跑的开发服不会自动补表，可再跑一次 `pnpm run migrate:local`

```bash
pnpm run typecheck
pnpm run build
pnpm run preview
```

本地默认收不到真信。联调请把 Email Routing 指到已部署的 Worker（`wrangler.jsonc` 的 `name`）。

### D. Cloudflare 基础设施

```bash
pnpm wrangler login
pnpm wrangler whoami
```

#### 1. D1 / R2

绑定名必须是 `D1`、`R2`。fork / 新账号需要自己创建：

```bash
pnpm wrangler d1 create fmail
pnpm wrangler r2 bucket create fmail
```

把返回的 `database_id` 写进 [`wrangler.jsonc`](wrangler.jsonc)。若自己加 preview 库，必须是**另一个** ID，且 `pnpm run migrate` 用 `--no-preview` 打生产。

没有 cron / `scheduled`。约 24 小时只挡会话访问，不会物理删 D1 / R2。

#### 2. 部署

```bash
pnpm run build
pnpm run deploy
```

`deploy` = `migrate`（`--no-preview`）+ `wrangler deploy --keep-vars`，**不含** build。`--keep-vars` 不创建 Secret。

加了 `routes` 自定义域后，未显式写 `workers_dev = true` 时 `*.workers.dev` 会关掉。

#### 3. Workers Builds

| 项 | 值 |
| --- | --- |
| Build command | `pnpm run build` |
| Deploy command | `pnpm run deploy` |
| Production branch | `main` |

不要把 Deploy 再包一层 `build`。Builds Variables 只放占位消警告，**不要**填真实收信域。日志出现 `Using secrets defined in process.env` 时，插件会写 `build/server/.dev.vars`，当前 `build` 脚本随后会删掉。

部署结束看 `env.D1` 的库名/ID，必须等于 `wrangler.jsonc` 的 `database_id`。种子仓库 / 一键部署新建的库，要把新 ID 写回仓库，不要沿用别人的 UUID。

#### 4. 生产 D1 迁移

```bash
pnpm run migrate
```

即 `wrangler d1 migrations apply D1 --remote --no-preview`。仓库里的迁移文件：

- `migrations/20260211_create_emails.sql`
- `migrations/20260212_email_indexes.sql`
- `migrations/20260830_issued_addresses.sql`

跑完后表应有 `emails`、`issued_addresses`。

### E. 网站域名

把 `wrangler.jsonc` 的 `routes` 改成你的网站域，例如：

```jsonc
"routes": [
  { "pattern": "mail.example.com", "custom_domain": true }
]
```

该域须在本账号 Cloudflare DNS 里。部署后打开 `https://mail.example.com` 与 `/zh`。这只解决 HTTP。

### F. 收信域名（Email Routing）

**不写** `wrangler.jsonc`。区域侧栏「电子邮件」里往往只有 DMARC / 电子邮件安全，**没有**路由。到**账号级**：

1. 退出单个网站，回到账号首页
2. **计算 / Compute → 电子邮件服务 / Email Service → 电子邮件路由 / Email Routing**
3. 或打开：`https://dash.cloudflare.com/<ACCOUNT_ID>/email/routing`
4. 接入/选中域名 → **路由规则** → **全收（Catch-all）** 打开 → 动作 **发送到 Worker** → 选 `wrangler.jsonc` 的 `name` → 保存

启用会改 MX。控制台一般会自动加：

- MX `@` → `route1.mx.cloudflare.net` / `route2` / `route3`（priority 以控制台为准）
- TXT `@` → `v=spf1 include:_spf.mx.cloudflare.net ~all`（该域还要对外发信时，把原 SPF 合并进同一条 TXT）

送到 Worker **不必**验证个人邮箱。自定义地址规则可空着。

示范用途（换成你自己的域）：

| 域名 | 用途 | 全收 |
| --- | --- | --- |
| `inbox.example` | 默认收信 | → 你的 Worker |
| `mail.example` | 额外收信 | → 你的 Worker |
| `mail.example.com` | 仅网站 | 不要当收信域 |
| `example.com`（可选） | 根域若也收信 | MX 必须是 Cloudflare Email Routing；仍指向其它提供商则收不到 |

加域：先改 Secret `MAIL_DOMAINS`（不必 deploy）→ 再对该域做全收 → 用站外邮箱发测试信。

### G. 验收清单

- [ ] `https://mail.example.com` 与 `/zh` 能打开
- [ ] 下拉为 `inbox.example`（默认）、`mail.example`
- [ ] 空用户名得到 `name-xxxxxx@所选域名`
- [ ] 填用户名能签发 `用户名@所选域名`
- [ ] 「恢复邮箱」能打开已签发过的合法地址
- [ ] 对 MX 已是 Cloudflare 的收信域各发一封测试信，刷新能打开正文
- [ ] `/sitemap.xml` 的 `<loc>` 前缀是 `https://mail.example.com`
- [ ] `/about` 301 到 `/`，`/zh/about` 301 到 `/zh`，`/es` 301 到 `/`

### H. 出问题对照

| 现象 | 先查 |
| --- | --- |
| 首页 / 签发 500 | 运行时有没有 `SESSION_SECRETS` |
| 签发 500 / no such table | 没对 **Worker 绑定的那套** D1 跑迁移 |
| 下拉没有域名 | Secret `MAIL_*` 未配或格式错 |
| 下拉域和 Routing 列表不一致 | 下拉只认 Secret，去 Worker 改 `MAIL_*` |
| 能签发、收不到 | 该域全收是否指向你的 Worker；公网 MX 是否 `route1/2/3.mx.cloudflare.net`（仍指向 Workspace / 飞书等则进不来） |
| 列表有信、打不开正文 | R2 绑定是否是你配置的桶 |
| `*.workers.dev` 404 | 已绑 Custom Domain，改用网站域名（示范：`mail.example.com`） |
| 区域侧栏找不到 Email Routing | 到 **计算 → 电子邮件服务 → 电子邮件路由**，不要在站点「电子邮件」里找 |
| 24 小时后还能「恢复」看到旧信 | 只挡会话，库内未物理删除 |

---

## 一键部署注意点

按钮部署到**你自己的**账号。点成功只说明 Worker 在。仍须做完 Secret、绑定/迁移、Custom Domain、每个收信域的全收。种子流程可能改 Worker 名、新建 D1，要把新 ID 写回 `wrangler.jsonc`。

---

## 技术栈

- React 19 + React Router 7（Framework Mode，SSR）
- Cloudflare Workers（`fetch` + `email`）
- Cloudflare D1 / R2
- Signed Cookie Session
- Tailwind CSS 4
- Markdoc

## 核心功能

- 首页：自定义或随机签发、域名下拉、恢复、收件箱
- `/api/email/:id`：校验会话归属与约 24h 会话窗口
- `/`、`/zh`
- `/robots.txt`、`/sitemap.xml`、条款与长尾 Markdown

## 数据流

1. 入站走 Worker `email`（`workers/app.ts`）
2. 元数据进 D1 `emails`；原文进 R2（key = `id`）
3. 首页按 Cookie 里的地址读列表；签发写入 `issued_addresses`
4. 详情接口校验会话地址未过约 24 小时后读 R2

「24 小时」是 Session / 接口访问窗口，不会物理删库。用「恢复邮箱」会重开 24 小时窗口，库里还在的信仍可能看见。

## 目录结构

```text
app/
  routes/              # home、md、api、sitemap、robots
  md/                  # 中英 SEO Markdown
  i18n/
  .server/             # Session、地址签发
  utils/               # mail 域名、meta、retention
workers/
  app.ts               # fetch + email
migrations/
  *.sql
wrangler.jsonc         # D1 / R2 / Custom Domain（收信域走 Secret）
```

## 常用命令

- `pnpm run dev`：本地开发（启动前 `migrate:local`）
- `pnpm run build`：生产构建（并删除 `build/server/.dev.vars`）
- `pnpm run preview`：预览构建产物
- `pnpm run typecheck`：`wrangler types` + Router 类型 + `tsc`
- `pnpm run cf-typegen`：重新生成 Cloudflare 环境类型
- `pnpm run migrate`：远端生产 D1 迁移（`--no-preview`）
- `pnpm run migrate:local`：本机 Miniflare D1 迁移
- `pnpm run deploy`：生产迁移 + `wrangler deploy --keep-vars`（不含 build）

```bash
pnpm run typecheck
pnpm run build
```
