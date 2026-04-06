// renderer.js — Canvas 渲染
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.time = 0;
    this.beatPulse = 0; // 0-1 脉冲强度
    this.flashAlpha = 0; // 连接闪光
    this.flashColor = '#ff6496';
  }

  // 触发节拍脉冲
  triggerBeatPulse() {
    this.beatPulse = 1;
  }

  // 触发闪光
  triggerFlash(color) {
    this.flashAlpha = 0.6;
    this.flashColor = color || '#ff6496';
  }

  clear() {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  // 绘制一只虫
  drawBug(bug, color, glowColor) {
    const ctx = this.ctx;
    if (!bug.segments.length) return;

    // 节拍脉冲放大
    const pulseScale = 1 + this.beatPulse * 0.05;

    ctx.save();

    // 虫身体轮廓
    ctx.beginPath();
    ctx.moveTo(0, bug.y);

    for (let i = 0; i < bug.segments.length; i++) {
      const seg = bug.segments[i];
      const amp = seg.amplitude * 50 * bug.width * pulseScale;
      const roughness = 1 - seg.smoothness;

      // 上半部分
      if (roughness > 0.4) {
        // 粗糙：锯齿
        const jitter = roughness * 8 * Math.sin(i * 7 + this.time * 3);
        ctx.lineTo(seg.x, bug.y - amp + jitter);
      } else {
        // 光滑：贝塞尔
        const nextSeg = bug.segments[Math.min(i + 1, bug.segments.length - 1)];
        const nextAmp = nextSeg.amplitude * 50 * bug.width * pulseScale;
        const cpx = (seg.x + nextSeg.x) / 2;
        ctx.quadraticCurveTo(cpx, bug.y - amp, nextSeg.x, bug.y - nextAmp);
      }
    }

    // 下半部分（镜像）
    for (let i = bug.segments.length - 1; i >= 0; i--) {
      const seg = bug.segments[i];
      const amp = seg.amplitude * 50 * bug.width * pulseScale;
      const roughness = 1 - seg.smoothness;
      if (roughness > 0.4) {
        const jitter = roughness * 8 * Math.cos(i * 5 + this.time * 2);
        ctx.lineTo(seg.x, bug.y + amp + jitter);
      } else {
        const prevSeg = bug.segments[Math.max(i - 1, 0)];
        const prevAmp = prevSeg.amplitude * 50 * bug.width * pulseScale;
        const cpx = (seg.x + prevSeg.x) / 2;
        ctx.quadraticCurveTo(cpx, bug.y + amp, prevSeg.x, bug.y + prevAmp);
      }
    }

    ctx.closePath();

    // 渐变填充
    const grad = ctx.createLinearGradient(0, bug.y - 60, 0, bug.y + 60);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, glowColor);
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.fill();

    // 光滑段发光
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = glowColor + '80';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 频谱填充（体内）
    this.drawSpectrumFill(bug, ctx);

    // 瘤状物 + 粒子
    for (const m of bug.mutations) {
      // 瘤本身
      ctx.beginPath();
      ctx.arc(m.x, bug.y, m.size * 15, 0, Math.PI * 2);
      ctx.fillStyle = '#4a3728';
      ctx.fill();

      // 瘤周围的粒子
      for (let p = 0; p < 3; p++) {
        const angle = (this.time * 2 + p * 2.09) % (Math.PI * 2);
        const dist = m.size * 18 + Math.sin(this.time * 4 + p) * 5;
        const px = m.x + Math.cos(angle) * dist;
        const py = bug.y + Math.sin(angle) * dist * 0.6;
        const pSize = 1.5 + Math.sin(this.time * 3 + p * 1.5) * 0.8;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 120, 80, ${0.4 + Math.sin(this.time * 2 + p) * 0.2})`;
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawSpectrumFill(bug, ctx) {
    // 在虫体内绘制频谱条纹
    for (const seg of bug.segments) {
      const amp = seg.amplitude * 50 * bug.width;
      if (amp < 2) continue;
      const hue = seg.amplitude * 240; // 低频=红，高频=蓝
      ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.15)`;
      ctx.fillRect(seg.x - 2, bug.y - amp * 0.8, 4, amp * 1.6);
    }
  }

  // 绘制感情线
  drawConnection(line) {
    if (!line || line.broken || line.points.length === 0) return;
    const ctx = this.ctx;
    const alpha = line.strength;
    const width = 1 + line.strength * 5;

    // 颜色渐变：粉色 (弱) → 金色 (强)
    const r = Math.round(255);
    const g = Math.round(100 + line.strength * 120); // 100→220
    const b = Math.round(150 - line.strength * 100); // 150→50
    const lineColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;

    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = width;
    ctx.shadowColor = line.strength > 0.7 ? '#ffd700' : '#ff6496';
    ctx.shadowBlur = 8 + line.strength * 15;

    for (const pt of line.points) {
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.yA);
      ctx.lineTo(pt.x, pt.yB);
      ctx.stroke();

      // 养分粒子
      if (line.strength > 0.2) {
        const particleY = pt.yA + (pt.yB - pt.yA) * ((Math.sin(this.time * 3 + pt.x) + 1) / 2);
        ctx.beginPath();
        ctx.arc(pt.x, particleY, 2 + line.strength * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 200, 100, ${alpha})`;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 绘制体液条
  drawFluidBar(bug, x, y) {
    const ctx = this.ctx;
    const w = 120, h = 8;
    // 背景
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, w, h);
    // 体液
    const fluidW = (bug.bodyFluid / 100) * w;
    const fluidColor = bug.bodyFluid > 30 ? '#4fc3f7' : '#e94560';
    ctx.fillStyle = fluidColor;
    ctx.fillRect(x, y, fluidW, h);
    // 文字
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${bug.isPlayer ? '你' : 'AI'} 体液: ${Math.round(bug.bodyFluid)}%`, x, y - 4);
  }

  // 绘制胜利/失败
  drawEndState(state) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.textAlign = 'center';
    ctx.font = '48px sans-serif';
    if (state === 'won') {
      ctx.fillStyle = '#ff6496';
      ctx.fillText('新生命诞生', this.width / 2, this.height / 2);
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.fillText('两颗心找到了共鸣的频率', this.width / 2, this.height / 2 + 40);
    } else {
      ctx.fillStyle = '#e94560';
      ctx.fillText('枯萎', this.width / 2, this.height / 2);
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.fillText('失去了连接的能力', this.width / 2, this.height / 2 + 40);
    }
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('按 R 重新开始', this.width / 2, this.height / 2 + 80);
    ctx.restore();
  }

  // 绘制操作提示
  drawControlsHint() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#666';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('按住 空格 = 瘪（掏空自己） | 松开 = 胀（恢复饱满）', this.width / 2, this.height - 12);
    ctx.restore();
  }

  // 主绘制
  render(game) {
    this.time += 0.016;

    // 节拍脉冲衰减
    this.beatPulse = Math.max(0, this.beatPulse - 0.05);

    // 闪光衰减
    this.flashAlpha = Math.max(0, this.flashAlpha - 0.03);

    this.clear();
    this.drawBug(game.bugA, '#e94560', '#ff8a9e');
    this.drawBug(game.bugB, '#4fc3f7', '#80d8ff');
    this.drawConnection(game.connection);
    this.drawFluidBar(game.bugA, 20, 30);
    this.drawFluidBar(game.bugB, this.width - 140, 30);
    this.drawControlsHint();

    // 连接闪光效果
    if (this.flashAlpha > 0) {
      this.ctx.save();
      this.ctx.fillStyle = this.flashColor;
      this.ctx.globalAlpha = this.flashAlpha;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
    }

    if (game.state !== 'playing') {
      this.drawEndState(game.state);
    }
  }
}
