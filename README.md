# FMail（smail-v3）

基于 React Router Framework Mode + Cloudflare Workers 的临时邮箱服务。页面品牌为 **FMail**，Worker 部署名仍是 `smail-app`。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/vtea/smail-main)

当前仓库默认值：

- 网站对外 URL：`https://mice.pub`（`app/seo.config.ts` 的 `BASE_URL`）
- Worker 名称：`smail-app`（`wrangler.jsonc` 的 `name`）
- 语言：`en`（默认，无前缀）、`zh`（`/zh`）
- 收信域名：只在 Cloudflare 配 `MAIL_DOMAIN` / `MAIL_DOMAINS`，不要写进 `mail.ts` / `wrangler.jsonc` 的 `vars`

面向低风险场景：生成临时地址、即时看收件箱，用于注册验证、OTP、一次性下载。邮件约 24 小时后不可再从会话访问。不建议用于银行、工作、政务、法律与关键账号找回。

---

## 完整配置教程

按顺序做完，页面能开、地址能签、验证码能进。只改代码或只点 Deploy 按钮，**不等于能收信**。

推荐首次上线顺序：

1. 本机 `pnpm install`，`pnpm wrangler login`（浏览器授权当前 Cloudflare 账号）
2. 需要换站时改 `BASE_URL`；收信域名**不要**改代码，后面用 Secret
3. 确认 D1 / R2 是**你账号里的**资源，ID 写进 `wrangler.jsonc`（仓库里的 ID 是本项目现用账号，别人 fork 必须换成自己的）
4. `pnpm run build` → `pnpm run deploy`（会打生产迁移并发布 Worker `smail-app`）
5. 给 Worker 配三项 Secret：`SESSION_SECRETS`、`MAIL_DOMAIN`、`MAIL_DOMAINS`
6. Worker Custom Domain 绑网站域名（与 `BASE_URL` 一致）
7. `MAIL_DOMAINS` 里每个域名启用 Email Routing，catch-all 送到 `smail-app`
8. 按 **G** 节验收

前提：网站域名、收信域名都要加在**同一个** Cloudflare 账号里（NS 已切过来）。`*.workers.dev` 只能打开页面，不能当收信域名。本机需要 Node.js 20+ 与 pnpm。

### A. 先分清两套域名

| 用途 | 改哪里 | 还要在 Cloudflare 做什么 | 不配会怎样 |
| --- | --- | --- | --- |
| 网站域名 | `app/seo.config.ts` 的 `BASE_URL` | Worker Custom Domain | 页面打不开，或 sitemap / canonical 指向错站 |
| 收信域名 | Cloudflare Worker Secret：`MAIL_DOMAIN`、`MAIL_DOMAINS` | 每个域名开 Email Routing，catch-all 指向 Worker | 能签发地址，信进不来 |

两者可以相同（本仓库网站与默认邮箱都是 `mice.pub`），也可以网站一个、邮箱多个。`*.workers.dev` 只能打开页面，**不能当收信域名**。

### B. 要改的配置

#### 0. 运行时参数一览（部署前必须配齐）

这些值**不进 git**。生产只认 Worker 运行时环境，Builds 里的同名变量**不会**自动变成运行时 Secret。

| 参数 | 类型 | 配在哪 | 格式与示例 | 不配会怎样 |
| --- | --- | --- | --- | --- |
| `SESSION_SECRETS` | Secret（必做） | Worker → Settings → Variables and Secrets，或 `pnpm wrangler secret put SESSION_SECRETS` | 长随机串，不要空格。生成本地：`openssl rand -base64 32`。轮换：`新密钥,旧密钥`（**最左侧**签名，右侧只验旧 Cookie） | 首页 / 签发 / 邮件详情 500 |
| `MAIL_DOMAIN` | Secret（建议）或明文 Variable | 同上 | 单个主机名：`mice.pub`。不要 `https://`、不要 `@`、不要中文逗号、不要引号 | 下拉没有默认项；`MAIL_DOMAINS` 也为空则无法签发 |
| `MAIL_DOMAINS` | Secret（建议）或明文 Variable | 同上 | 英文逗号或空格分隔：`mice.pub,micejia.com,laiyouwan.com,xjpcp.top`。不要引号、不要 `，` | 下拉为空；入站域名不在列表里会被 `setReject` |
| `BASE_URL` | 代码常量 | [`app/seo.config.ts`](app/seo.config.ts) | `https://mice.pub`（有协议、无末尾 `/`） | sitemap / canonical / OG 指错站 |
| D1 绑定 `D1` | `wrangler.jsonc` | `database_name` / `database_id` / `preview_database_id` | 生产与 preview **两个不同 ID** | 读写失败或打到错库 |
| R2 绑定 `R2` | `wrangler.jsonc` | `bucket_name`：`smailv3` | 对象 key = 邮件 `id` | 能进列表、打不开正文 |

`wrangler.jsonc` 已声明 `secrets.required`：`SESSION_SECRETS`、`MAIL_DOMAIN`、`MAIL_DOMAINS`。已开 `keep_vars: true`，`pnpm run deploy` 带 `--keep-vars`，**不会**用仓库覆盖你在控制台加过的明文变量。不要把这三项写进 `vars`，否则下次 deploy 可能盖掉控制台。

**控制台逐步操作：**

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → `smail-app` → **Settings** → **Variables and Secrets**
2. **Add** → 选 **Secret**（加密，部署不覆盖）
3. 名称填 `SESSION_SECRETS`，Type 选 **Secret**，值填 `openssl rand -base64 32` 的输出（一整行、无空格）→ Save
4. 再 Add Secret：名称 `MAIL_DOMAIN`，值 `mice.pub`
5. 再 Add Secret：名称 `MAIL_DOMAINS`，值 `mice.pub,micejia.com,laiyouwan.com,xjpcp.top`（英文逗号，空格可有可无）
6. 改完 Secret **即时生效**，不必为改域名重新 deploy。编辑已有 Secret：点该项 → Edit → 覆盖整段值 → Save

**命令行等价（交互式，粘贴后回车；不要把密钥写进命令行参数）：**

```bash
pnpm wrangler login
pnpm wrangler secret put SESSION_SECRETS
# 粘贴 openssl rand -base64 32 的输出

pnpm wrangler secret put MAIL_DOMAIN
# 输入：mice.pub

pnpm wrangler secret put MAIL_DOMAINS
# 输入：mice.pub,micejia.com,laiyouwan.com,xjpcp.top
```

`MAIL_DOMAIN` 若不在 `MAIL_DOMAINS` 里，运行时会自动并进列表并作为默认项。签发、恢复、入站都只认合并后的列表。

加域名：只改 `MAIL_DOMAINS`（控制台 Edit 或再 `secret put` 覆盖整串），然后对该新域名做 **F** 节 Email Routing。删域名：从列表去掉后，该域名新签发会失败，已在途的信会被 `setReject`。

#### 1. 网站对外 URL

文件：[`app/seo.config.ts`](app/seo.config.ts)

```ts
export const BASE_URL = "https://mice.pub";
```

要求：带 `https://`，不要末尾 `/`。会写进 canonical、hreflang、`/sitemap.xml`、`/robots.txt`、Open Graph、JSON-LD。改完必须重新部署才生效。

#### 2. 收信域名

只配环境变量，不要改 `mail.ts` / 不要往 `wrangler.jsonc` 的 `vars` 写域名。具体名称、格式、控制台与 `secret put` 见上面 **B.0**。

本地把同样三项写进 [`.dev.vars`](.dev.vars.example)（可从 `.dev.vars.example` 复制）。存在 `.dev.vars` 时 Wrangler **不会**再读 `.env`。

只改 Secret、不配 MX / Email Routing，页面能选出该域名，验证码仍收不到。

### C. 本地开发

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm run dev
```

- 访问：<http://localhost:5173>（英文）、<http://localhost:5173/zh>（中文）
- 本地密钥与收信域名写在 `.dev.vars`：`SESSION_SECRETS`、`MAIL_DOMAIN`、`MAIL_DOMAINS`
- 也可以用 `.env`。存在 `.dev.vars` 时，Wrangler 本地开发**不会**再读 `.env`
- 签发、恢复、收件箱读本机 Miniflare D1。`pnpm run dev` / `pnpm run preview` 启动前会自动执行 `migrate:local`（三份 `migrations/*.sql`）。已在跑的开发服不会自动补表，可单独跑 `pnpm run migrate:local`

```bash
pnpm run typecheck
pnpm run build
pnpm run preview
```

本地能签发地址，但默认收不到真实邮件（没有指向本机的 MX）。要联调收信，把域名 Email Routing 指到已部署的 Worker，或用已配置好的线上环境。

### D. Cloudflare 基础设施（每个账号做一次）

先登录，再碰远端资源：

```bash
pnpm wrangler login
pnpm wrangler whoami
```

#### 1. 自建 D1 / R2（fork 或新账号必做）

绑定名必须与代码一致：`env.D1`、`env.R2`。名称可改，但要把 `wrangler.jsonc` 里三项一起改掉。

```bash
pnpm wrangler d1 create smail-v3
pnpm wrangler d1 create smail-v3-preview
pnpm wrangler r2 bucket create smailv3
```

把两条 `database_id` 写进 [`wrangler.jsonc`](wrangler.jsonc)：

| 字段 | 绑定 / 名称 | 当前仓库值 | 说明 |
| --- | --- | --- | --- |
| `d1_databases[0].binding` | `D1` | `D1` | 不要改，代码读 `env.D1` |
| `database_name` | 生产库名 | `smail-v3` | 与 `d1 create` 输出一致 |
| `database_id` | 生产库 UUID | `8a38551f-5eab-4095-b69b-2f4a87e9d8d1` | **你账号里** `d1 create` 打印的 ID |
| `preview_database_id` | preview 库 UUID | `3e874660-d45c-480e-abe8-65441d848882` | 必须是另一个库，不能等于生产 ID |
| `r2_buckets[0].binding` | `R2` | `R2` | 不要改，代码读 `env.R2` |
| `bucket_name` | 桶名 | `smailv3` | 与 `r2 bucket create` 一致 |

两套 D1 ID 不得相同，否则 `--preview` / 部分本地场景会打到生产数据。到 Dashboard → Worker `smail-app` → Settings → Bindings 核对绑定名就是 `D1`、`R2`。

`triggers.crons` 现为 `*/30 * * * *`，`scheduled` 入口已留，**物理清理未实现**，不必为收信去改 cron。

#### 2. 部署 Worker

两种方式：

- 点上方 Deploy to Cloudflare（仓库需公开）。按钮会按 `wrangler.jsonc` 创建 D1 / R2；创建后仍要把**你账号的** ID 写回仓库，并做 Secret / 域名 / Email Routing。
- 或本地（推荐，步骤可控）：

```bash
pnpm run build
pnpm run deploy
```

`pnpm run deploy` = 生产 D1 迁移 + `wrangler deploy --keep-vars`，**不含** build。漏掉 `build` 会把旧产物或空产物推上去。`--keep-vars` 保留控制台已有明文变量，**不会**保留或创建 Secret，Secret 仍要单独 `put`。

#### 3. 运行时 Secret（必做）

三项怎么填见 **B.0**。首页、签发、邮件详情都读签名 Cookie `__session`；没有 `SESSION_SECRETS` 会直接 500。Cookie：`httpOnly`、`SameSite=Lax`、生产 `Secure`、`maxAge` 24 小时。

#### 4. Workers Builds（用 CI 时）

| 项 | 值 |
| --- | --- |
| Build command | `pnpm run build` |
| Deploy command | `pnpm run deploy` |

不要把 Deploy 再包一层 `pnpm run build`，否则会构建两次。

`wrangler.jsonc` 的 `secrets.required` 会在 `pnpm run build` 时检查构建环境是否看得到 `SESSION_SECRETS`、`MAIL_DOMAIN`、`MAIL_DOMAINS`。Builds 里缺任一项会出现 `Missing required secrets` **警告**，构建仍会成功。这与运行时无关：

- 构建期：Builds → Variables 可加同名变量（可随便填占位），仅消警告
- 运行期：必须在 Worker Variables and Secrets 里 `secret put`。构建变量**不会**变成 Worker Secret

#### 5. 生产 D1 迁移

```bash
pnpm run migrate
```

该命令是 `wrangler d1 migrations apply D1 --remote --preview=false`，打到 Worker 绑定的生产库。不要对生产库使用 `--preview`。preview 库单独建、单独迁：

```bash
pnpm wrangler d1 migrations apply D1 --remote --preview
```

ID 写在 `preview_database_id`（当前 `smail-v3-preview`）。

当前迁移：

- `migrations/20260211_create_emails.sql`
- `migrations/20260212_email_indexes.sql`
- `migrations/20260830_issued_addresses.sql`

在生产库执行 `SELECT name FROM sqlite_master WHERE type='table'`，应看到 `emails` 与 `issued_addresses`。

### E. 网站域名（能打开页面）

1. 把要访问的域名加进 Cloudflare，NS 生效
2. Dashboard → Worker `smail-app` → Settings → Domains & Routes → Custom Domain，绑定 `mice.pub`（需要 `www` 就再绑一条）
3. 确认 `BASE_URL` 与这个访问域名一致，然后重新部署
4. 浏览器打开 `https://mice.pub`、`https://mice.pub/zh`

Custom Domain 只解决 HTTP。收信还要做下一节。

### F. 收信域名（能进验证码）

Email Routing **不写** `wrangler.jsonc`。Wrangler 部署日志里只有 `workers.dev` 和 cron、看不到 email 路由，是正常的。域名必须走 Cloudflare DNS（NS 已切到该账号）。**先 deploy Worker**，控制台才能选到 `smail-app`。

启用 Email Routing 会改该域的 MX。若该域还在用 Google Workspace / 企业邮，整域 catch-all 会抢走收信；需要并存时改用独立收信子域（例如只把 `mail.example.com` 放进 `MAIL_DOMAINS`，只给子域开 Routing）。

对 Secret `MAIL_DOMAINS` 里每一个域名都做一遍：

1. Dashboard 选中该域名 → **Email** → **Email Routing**（有的账号在 **Compute → Email Service → Email Routing**）→ 启用
2. 让 Cloudflare **自动添加** DNS，不要手改优先级。启用后 DNS 里应能看到类似记录（具体 priority 由控制台分配，以控制台为准）：
   - MX `@` → `route1.mx.cloudflare.net`
   - MX `@` → `route2.mx.cloudflare.net`
   - MX `@` → `route3.mx.cloudflare.net`
   - TXT `@` → `v=spf1 include:_spf.mx.cloudflare.net ~all`（若该域还要对外发信，把原有 SPF 机制合并进**同一条** TXT，不要并排两条 `v=spf1`）
3. **Routing rules** → Catch-all → Action 选 **Send to a Worker** → Worker 选 **`smail-app`**（名称必须与 `wrangler.jsonc` 的 `name` 一致）→ Save  
   送到 Worker **不必**验证个人邮箱。Custom address 规则可空着，靠 catch-all 即可。
4. 回站点选该域名签发一个地址，从 Gmail / 其它站外邮箱给这个地址发一封信，首页点刷新应出现。

加新收信域名：先更新 Secret `MAIL_DOMAINS`（不必改代码、不必重新 deploy）→ 再对该域名做本节 1–3 → 用第 4 步验收。

入站会被丢掉的常见原因：MX 还指着旧邮局；catch-all 指错 Worker；`MAIL_DOMAINS` 写成 `https://mice.pub` 或中文逗号，运行时解析不到该域，Worker 会 `setReject`。

### G. 验收清单

- [ ] `https://mice.pub` 与 `/zh` 能打开，语言切换正常
- [ ] 空用户名点「获取邮箱」得到随机 `name-xxxxxx@所选域名`
- [ ] 填写用户名能签发 `用户名@所选域名`
- [ ] 「恢复邮箱」能打开已签发过的合法地址
- [ ] 对每个收信域名各发一封测试信，刷新后能打开正文
- [ ] `/sitemap.xml` 里 `<loc>` 前缀等于 `BASE_URL`
- [ ] `/about` 301 到 `/`，`/zh/about` 301 到 `/zh`，`/es` 301 到 `/`

### H. 出问题对照

| 现象 | 先查 |
| --- | --- |
| 首页 / 签发 500 | 运行时有没有 `SESSION_SECRETS`（Builds 变量不算） |
| 签发 500，日志有 `issued_addresses` / no such table | 没跑生产迁移：`pnpm run migrate` |
| 下拉没有域名 / 签发失败 | `MAIL_DOMAIN` / `MAIL_DOMAINS` 格式；是否英文逗号 |
| 能签发、永远收不到 | 该域 Email Routing、MX 是否 `route1/2/3.mx.cloudflare.net`、catch-all 是否 `smail-app` |
| 列表有信、打不开正文 | R2 绑定名是否为 `R2`，桶是否 `smailv3` |
| `pnpm run build` 报 `Missing required secrets` | 只是 Builds 警告；在 Builds Variables 加同名占位即可，与线上收信无关 |
| 改完 Secret 仍像旧域名 | 看的是不是 Worker `smail-app`；明文 Variable 是否被旧 `vars` 盖掉（本仓库已 `keep_vars` 且不写 `vars`） |

---

## 一键部署注意点

上方按钮把项目部署到**你自己的** Cloudflare 账号。点成功、`*.workers.dev` 能打开，只说明 Worker 已上线。

上线后仍须做完教程 **B.0（三项 Secret）**、**D（绑定 + 迁移）**、**E（Custom Domain）**、**F（每个收信域名的 Email Routing）**。漏任何一步，通常是「能打开、收不到验证码」或首页 500。

---

## 技术栈

- React 19 + React Router 7（Framework Mode，SSR）
- Cloudflare Workers（`fetch` + `email`）
- Cloudflare D1（邮件元数据）
- Cloudflare R2（邮件原始内容）
- Signed Cookie Session（React Router 内置 Session）
- Tailwind CSS 4
- Markdoc（条款与长尾 SEO 页）

## 核心功能

- 首页：自定义用户名或随机签发、域名下拉、恢复已有地址、收件箱
- 邮件预览弹窗（`/api/email/:id`，校验会话归属与 24h 过期）
- 中英路由：`/`、`/zh`
- SEO：`/robots.txt`、`/sitemap.xml`、条款与长尾 Markdown 页

## 数据流

1. 邮件进入 Worker 的 `email` 事件（`workers/app.ts`）
2. 解析后：元数据写入 D1 `emails`（`id` / `to_address` / `from` / `subject` / `time`）；原文写入 R2（key = `id`）
3. 首页按 Cookie Session 里的地址读 D1 列表；签发会写入 `issued_addresses`，避免重复发放同一地址
4. 打开详情时 `/api/email/:id` 校验：该邮件属于当前会话地址，且地址未超过约 24 小时，再从 R2 解析返回

「24 小时」主要体现在 Session 可访问窗口与前端逻辑；`scheduled` 清理入口已预留，尚未做库内物理删除。

## 目录结构

```text
app/
  routes/              # home、md、api、sitemap、robots
  md/                  # 中英 SEO Markdown（en/、zh/）
  i18n/                # 语言配置与文案
  .server/             # Session、地址签发
  utils/               # mail 域名、meta、retention
workers/
  app.ts               # fetch + email
migrations/
  *.sql                # D1 迁移
wrangler.jsonc         # D1 / R2 / cron（收信域名走 Secret，不写 vars）
```

## 常用命令

- `pnpm run dev`：本地开发（启动前自动 `migrate:local`）
- `pnpm run build`：生产构建
- `pnpm run preview`：预览构建产物（启动前自动 `migrate:local`）
- `pnpm run typecheck`：`wrangler types` + Router 类型 + `tsc`
- `pnpm run cf-typegen`：重新生成 Cloudflare 环境类型
- `pnpm run migrate`：远端生产 D1 迁移（绑定名 `D1`，`--preview=false`）
- `pnpm run migrate:local`：本机 Miniflare D1 迁移
- `pnpm run deploy`：生产迁移 + `wrangler deploy --keep-vars`（不含 build）

发布前建议：

```bash
pnpm run typecheck
pnpm run build
```
