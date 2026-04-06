# 🐛❤️🐛 爱情虫 (Bugs Love)

一个浏览器内可交互的音频游戏原型。

两只程序生成旋律的虫，通过频率筛检产生碰撞与感情线。

## 玩法

- **按住空格**：瘪（掏空自己，消耗体液）
- **松开空格**：胀（恢复饱满，回收体液）
- **目标**：让两只虫光滑碰撞，建立并强化感情线至满格
- **危险**：粗糙碰撞会蔓延，感情线可能断裂，体液耗尽则枯萎

## 运行

直接在浏览器中打开 `index.html`（需要 HTTPS 或 localhost 才能使用 Web Audio API）。

```bash
# 快速启动
python3 -m http.server 8080
# 然后访问 http://localhost:8080
```

## 文件结构

| 文件 | 职责 |
|------|------|
| `index.html` | 入口页面 + 基础样式 |
| `audio-engine.js` | Web Audio 合成、滤波、频谱分析、音效 |
| `game-engine.js` | Bug 类、碰撞检测、感情线、体液系统 |
| `renderer.js` | Canvas 渲染（虫曲线、皮肤质感、感情线、UI） |
| `main.js` | 主循环、输入处理、状态机 |

## 技术栈

- 纯 HTML5 Canvas 2D + Web Audio API
- 零依赖，无构建工具
