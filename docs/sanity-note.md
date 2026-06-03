# Sanity Studio 运行说明（重要）

当前你的 Node 版本是 **v26**。在这个版本下，Sanity CLI 依赖链里会触发 `yargs` 的 **ESM/CJS 兼容问题**，导致直接报：

- `ReferenceError: require is not defined in ES module scope`

这不是你的代码问题，而是 **CLI 运行时兼容**造成的。

## 推荐解决方案（任选其一）

### 方案 A：切换到 Node 20 LTS（推荐）

如果你安装了 `nvm`：

```bash
nvm install 20
nvm use 20
node -v
```

然后在项目根目录运行：

```bash
npm -w studio run dev
```

### 方案 B：暂时先不跑 Studio

我们已经把 `studio/schemaTypes/*` 写好了，你随时可以继续做前端和 3D 交互；等你愿意切 Node 版本时，再把 `studio/sanity.config.ts` 的 `projectId` 替换成真实值并启动 Studio。

