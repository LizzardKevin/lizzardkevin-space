# 腾讯云部署（COS + CDN）建议

适用于本项目：**静态前端 + 大资源（glb / mp3 / mp4）**。核心思想：前端与资源都走对象存储 + CDN，不必先买 ECS。

## 1. 你需要准备

- 个人域名（建议一个主域名 + 子域名）
- 备案（国内 CDN/HTTPS 基本绕不开）

推荐域名结构：

- `space.example.com`：前端站点
- `assets.example.com`：资源域名（可选，后期有助于缓存策略）

## 2. 前端（静态站）如何发布

### 构建

在项目根目录：

```bash
cd "/Users/lizzardkevin/Documents/LizzardKevin Space"
npm run build
```

构建产物在：

- `apps/web/dist/`

### 上传到 COS

创建一个 COS Bucket（公开读），把 `apps/web/dist` 全部上传到 Bucket 根路径（或固定前缀）。

> 你可以用 COS 控制台上传，也可以后续用 `coscmd` 自动化（等你需要再加）。

## 3. 资源（glb/mp3/mp4）推荐组织

本地开发阶段可以先放在：

- `apps/web/public/models/...`
- `apps/web/public/media/...`
- `apps/web/public/exhibits/...`

上线时建议迁移到 COS：

```
/models/space_main.glb
/exhibits/<exhibitId>/focus.glb
/media/<file>.mp3
/media/<file>.mp4
```

建议**版本化路径**（避免缓存更新困难）：

```
/v1/models/...
/v1/exhibits/...
```

## 4. CDN 配置要点

- 给站点 Bucket 绑定 CDN，加速国内访问
- 对 `glb/mp3/mp4` 设置更长缓存（版本化后可以 `max-age=31536000`）
- HTML（`index.html`）缓存短一些（例如 0～300s），避免发布后用户拿旧入口

## 5. HTTPS

- 在腾讯云申请免费证书（或从其他 CA 购买）
- CDN/对象存储绑定证书，开启 HTTPS

## 6. 未来如果要“后端”

只有在你需要以下功能时才考虑 ECS/Serverless：

- 自建 CMS 或后台（当前以本地 JSON / Markdown 为主）
- 上传/鉴权
- 数据库（收藏、登录、留言）

否则：**纯静态 + COS + CDN** 是最稳、成本最低的起点。
