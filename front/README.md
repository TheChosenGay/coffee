# Coffee Room Service Tester 🏠☕

这是一个用于测试 Coffee 后端 Room Service API 的前端界面。

## 技术栈

- **Bun** - 快速的 JavaScript 运行时和包管理器
- **Vite** - 现代化的前端构建工具
- **TypeScript** - 类型安全的 JavaScript
- **Vanilla JS** - 无框架，纯 TypeScript

## 功能

- ✅ 查看所有房间列表
- ✅ 创建新房间（指定最大用户数）
- ✅ 删除房间
- ✅ 实时刷新
- ✅ 美观的 UI 界面
- ✅ 错误处理和通知

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 启动开发服务器

```bash
bun run dev
```

服务器将在 http://localhost:5173 启动

### 3. 确保后端运行

确保后端服务器运行在 `http://localhost:8080`：

```bash
# 在项目根目录
make run
```

## 可用脚本

- `bun run dev` - 启动开发服务器（带热更新）
- `bun run build` - 构建生产版本
- `bun run preview` - 预览生产构建

## API 端点

前端会调用以下 API：

- `GET /room/list` - 获取所有房间
- `GET /room/create?max_unit_size=N` - 创建房间
- `GET /room/delete?room_id=N` - 删除房间

## 项目结构

```
front/
├── index.html          # 主 HTML 文件
├── src/
│   ├── main.ts        # 主应用逻辑
│   ├── api.ts         # API 客户端
│   └── style.css      # 样式文件
├── package.json       # 项目配置
├── tsconfig.json      # TypeScript 配置
└── vite.config.ts     # Vite 配置
```

## 注意事项

⚠️ **CORS 问题**：如果遇到跨域问题，需要在后端添加 CORS 支持：

```bash
go get github.com/rs/cors
```

然后在 Go 代码中添加 CORS 中间件。

## 开发提示

- 前端运行在端口 5173
- 后端运行在端口 8080
- Vite 支持热模块替换（HMR），修改代码后自动刷新
- TypeScript 提供类型安全

## 截图

访问 http://localhost:5173 查看界面！

---

Made with ❤️ using Bun + Vite + TypeScript
