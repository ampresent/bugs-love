// main.js — 主循环、输入、状态机
(function () {
  const canvas = document.getElementById('game');
  const startBtn = document.getElementById('start-btn');
  const instructions = document.getElementById('instructions');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let audio = null;
  let game = null;
  let renderer = null;
  let running = false;
  let spaceHeld = false;
  let aiDifficulty = 1; // 0=温柔, 1=平衡, 2=挑战
  let startTime = 0; // 对局开始时间
  let elapsedTime = 0; // 对局已用时间
  const aiProfiles = [
    { name: '温柔', conflictThreshold: 0.4, filterLow: 1200, filterHigh: 3500 },
    { name: '平衡', conflictThreshold: 0.3, filterLow: 800, filterHigh: 3000 },
    { name: '挑战', conflictThreshold: 0.15, filterLow: 500, filterHigh: 2500 },
  ];

  startBtn.addEventListener('click', () => {
    audio = new AudioEngine();
    audio.init();
    game = new GameEngine(canvas.width, canvas.height);
    renderer = new Renderer(canvas);
    startBtn.classList.add('hidden');
    instructions.classList.remove('hidden');
    running = true;
    startTime = performance.now();

    // 音效回调绑定
    game.onConnectionCreated = () => { audio.playChordArpeggio(); if (renderer) renderer.triggerFlash('#ff6496'); };
    game.onConnectionBroken = () => { audio.playDissonance(); if (renderer) renderer.triggerFlash('#e94560'); };
    game.onWon = () => { audio.playVictory(); if (renderer) renderer.triggerFlash('#ffd700'); };
    game.onLost = () => { audio.playDefeat(); if (renderer) renderer.triggerFlash('#4a3728'); };
    game.onCollision = (smooth) => audio.playCollision(smooth);

    requestAnimationFrame(loop);
  });

  // 键盘输入
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      spaceHeld = true;
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      spaceHeld = false;
    }
  });

  // 移动端触摸支持
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); spaceHeld = true; }, { passive: false });
  canvas.addEventListener('touchend', (e) => { e.preventDefault(); spaceHeld = false; }, { passive: false });
  canvas.addEventListener('touchcancel', () => { spaceHeld = false; });

  // 切换 AI 难度 (D 键)
  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyD' && game && game.state === 'playing') {
      aiDifficulty = (aiDifficulty + 1) % aiProfiles.length;
    }
  });

  // 重新开始
  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR' && game && game.state !== 'playing') {
      if (audio.bugA && audio.bugB) {
        try { audio.bugA.osc.stop(); } catch (e) {}
        try { audio.bugB.osc.stop(); } catch (e) {}
      }
      audio.init();
      game = new GameEngine(canvas.width, canvas.height);
      // 重新绑定音效回调
      game.onConnectionCreated = () => { audio.playChordArpeggio(); if (renderer) renderer.triggerFlash('#ff6496'); };
      game.onConnectionBroken = () => { audio.playDissonance(); if (renderer) renderer.triggerFlash('#e94560'); };
      game.onWon = () => { audio.playVictory(); if (renderer) renderer.triggerFlash('#ffd700'); };
      game.onLost = () => { audio.playDefeat(); if (renderer) renderer.triggerFlash('#4a3728'); };
      game.onCollision = (smooth) => audio.playCollision(smooth);
    }
  });

  // 移动端检测
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isMobile) {
    instructions.textContent = '触摸屏幕 = 瘪 | 松开 = 胀';
  }

  let lastTime = 0;

  function loop(timestamp) {
    if (!running) return;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap dt
    lastTime = timestamp;

    // 计时
    if (game.state === 'playing') {
      elapsedTime = (performance.now() - startTime) / 1000;
    }

    // 玩家操作
    if (spaceHeld) {
      game.bugA.deflate(dt);
      audio.setPlayerFilter(200); // 瘪：只留低频
    } else {
      game.bugA.inflate(dt);
      audio.setPlayerFilter(4000); // 胀：全频
    }

    // 获取频谱数据
    const freqDataA = audio.getFrequencyData(audio.bugA);
    const freqDataB = audio.getFrequencyData(audio.bugB);
    const harmony = audio.computeHarmony(freqDataA, freqDataB);

    // AI 逻辑：根据难度档位调整
    const profile = aiProfiles[aiDifficulty];
    if (harmony.conflict > profile.conflictThreshold) {
      audio.setAIFilter(profile.filterLow);
    } else {
      audio.setAIFilter(profile.filterHigh);
    }

    // 旋律更新
    if (audio.ctx) {
      const wasOnBeat = audio.isOnBeat(audio.ctx.currentTime);
      audio.updateMelody(audio.ctx.currentTime);
      // 节拍脉冲
      if (wasOnBeat && renderer) {
        renderer.triggerBeatPulse();
      }
    }

    // 游戏逻辑更新
    if (game.state === 'playing') {
      game.update(freqDataA, freqDataB, harmony, dt);
    }

    // 渲染
    renderer.render(game, aiProfiles[aiDifficulty].name, harmony, elapsedTime);

    requestAnimationFrame(loop);
  }

  // 窗口大小变化
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (renderer) {
      renderer.width = canvas.width;
      renderer.height = canvas.height;
    }
    if (game) {
      game.canvasWidth = canvas.width;
      game.canvasHeight = canvas.height;
      game.bugA.y = canvas.height * 0.35;
      game.bugB.y = canvas.height * 0.65;
    }
  });
})();
