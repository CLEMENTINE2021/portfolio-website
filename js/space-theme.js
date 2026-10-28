/**
 * space-theme.js
 * 《OVERSPACE》专属深空星空背景引擎
 * 特性：
 * - 纯净深空黑底 (#000000) 与真实星系冷色谱 (O/B/A/F 恒星冷白、冰蓝与微弱星尘)
 * - 三层深度视差 (Parallax Layers)，微小自然闪烁 (Natural Twinkling)
 * - 偶现流星划过深空 (Shooting Meteor Streak)
 * - 鼠标微视差联动，优雅细腻，绝无 AI 塑料荧光
 * - 高性能 requestAnimationFrame，支持页面隐藏自动休眠省电
 */

(function () {
  class SpaceStarfield {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.active = false;
      this.animId = null;

      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.stars = [];
      this.meteors = [];
      this.lastMeteorTime = Date.now();
      this.meteorInterval = 8000 + Math.random() * 6000;

      // 鼠标微视差坐标
      this.mouseX = 0;
      this.mouseY = 0;
      this.targetMouseX = 0;
      this.targetMouseY = 0;

      this.init();
    }

    init() {
      this.handleResize();
      this.generateStars();
      this.bindEvents();
    }

    bindEvents() {
      window.addEventListener('resize', () => {
        this.handleResize();
        this.generateStars();
      });

      window.addEventListener('mousemove', (e) => {
        // 微弱视差归一化偏移量 (-1 到 1)
        this.targetMouseX = (e.clientX / this.width - 0.5) * 2;
        this.targetMouseY = (e.clientY / this.height - 0.5) * 2;
      });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pause();
        } else if (this.active) {
          this.resume();
        }
      });
    }

    handleResize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.scale(this.dpr, this.dpr);
    }

    generateStars() {
      this.stars = [];
      // 根据屏幕面积计算星体数量，保证密度适中、不显杂乱
      const baseCount = Math.floor((this.width * this.height) / 6500);
      const starCount = Math.min(Math.max(baseCount, 160), 280);

      // 恒星真实冷光谱色系
      const starColors = [
        'rgba(255, 255, 255, ',    // 70% 纯白
        'rgba(255, 255, 255, ',
        'rgba(255, 255, 255, ',
        'rgba(224, 242, 254, ',    // 冰蓝 (B型星)
        'rgba(186, 230, 253, ',    // 浅天蓝
        'rgba(254, 249, 195, '     // 极微弱暖白 (F型星)
      ];

      for (let i = 0; i < starCount; i++) {
        // 划分 3 层深度
        const layer = Math.random() < 0.6 ? 1 : Math.random() < 0.88 ? 2 : 3;
        let radius, speed, baseAlpha;

        if (layer === 1) {
          // 远景微星 (细腻点缀)
          radius = 0.45 + Math.random() * 0.45;
          speed = 0.015 + Math.random() * 0.02;
          baseAlpha = 0.25 + Math.random() * 0.35;
        } else if (layer === 2) {
          // 中景恒星
          radius = 0.9 + Math.random() * 0.55;
          speed = 0.03 + Math.random() * 0.035;
          baseAlpha = 0.55 + Math.random() * 0.35;
        } else {
          // 近景明亮恒星 (带极轻微衍射光晕)
          radius = 1.4 + Math.random() * 0.7;
          speed = 0.05 + Math.random() * 0.04;
          baseAlpha = 0.75 + Math.random() * 0.25;
        }

        const colorPrefix = starColors[Math.floor(Math.random() * starColors.length)];

        this.stars.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius,
          layer,
          speed,
          colorPrefix,
          baseAlpha,
          alpha: baseAlpha,
          twinkleSpeed: 0.008 + Math.random() * 0.02,
          twinklePhase: Math.random() * Math.PI * 2,
          hasCross: layer === 3 && Math.random() < 0.35 // 少数明亮恒星具备微星芒
        });
      }
    }

    createMeteor() {
      const startX = Math.random() * (this.width * 0.8) + this.width * 0.1;
      const startY = Math.random() * (this.height * 0.35);
      const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.3; // 约45度斜向下
      const speed = 7 + Math.random() * 5;
      const length = 70 + Math.random() * 90;

      this.meteors.push({
        x: startX,
        y: startY,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        length,
        alpha: 1,
        life: 0,
        maxLife: 35 + Math.random() * 20
      });
    }

    setActive(isActive) {
      if (this.active === isActive) return;
      this.active = isActive;

      if (isActive) {
        this.canvas.classList.add('active');
        this.resume();
      } else {
        this.canvas.classList.remove('active');
        // 等待淡出过渡完成后停止动画渲染循环，节约 GPU/CPU
        setTimeout(() => {
          if (!this.active) {
            this.pause();
          }
        }, 800);
      }
    }

    resume() {
      if (!this.animId) {
        this.lastTime = performance.now();
        this.render = this.render.bind(this);
        this.animId = requestAnimationFrame(this.render);
      }
    }

    pause() {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }

    render(now) {
      if (!this.active && this.meteors.length === 0) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.animId = null;
        return;
      }

      this.ctx.clearRect(0, 0, this.width, this.height);

      // 平滑插值鼠标视差位移
      this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
      this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

      // 1. 绘制极淡的冷调深空星云微晕 (Deep Cosmic Cold Dust，克制沉稳)
      const grad = this.ctx.createRadialGradient(
        this.width * 0.65,
        this.height * 0.45,
        60,
        this.width * 0.65,
        this.height * 0.45,
        this.width * 0.7
      );
      grad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');  // 极深石板蓝
      grad.addColorStop(0.5, 'rgba(10, 18, 36, 0.25)'); // 冷夜空微光
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.width, this.height);

      // 2. 绘制星群与闪烁动效
      const nowTime = now * 0.001;

      for (let i = 0; i < this.stars.length; i++) {
        const star = this.stars[i];

        // 闪烁运算
        const twinkle = Math.sin(nowTime * star.twinkleSpeed * 100 + star.twinklePhase);
        star.alpha = star.baseAlpha + twinkle * 0.22;
        star.alpha = Math.max(0.12, Math.min(1.0, star.alpha));

        // 视差位移量：层级越近，位移越大
        const parallaxFactor = star.layer * 10;
        const currentX = star.x + this.mouseX * parallaxFactor;
        const currentY = star.y + this.mouseY * parallaxFactor;

        // 循环边界检查
        let drawX = (currentX % this.width + this.width) % this.width;
        let drawY = (currentY % this.height + this.height) % this.height;

        this.ctx.fillStyle = `${star.colorPrefix}${star.alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(drawX, drawY, star.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // 为部分明亮近景星体绘制微弱的四角衍射星芒
        if (star.hasCross && star.alpha > 0.6) {
          const crossSize = star.radius * 3.5;
          this.ctx.strokeStyle = `rgba(255, 255, 255, ${star.alpha * 0.4})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.beginPath();
          // 横线
          this.ctx.moveTo(drawX - crossSize, drawY);
          this.ctx.lineTo(drawX + crossSize, drawY);
          // 竖线
          this.ctx.moveTo(drawX, drawY - crossSize);
          this.ctx.lineTo(drawX, drawY + crossSize);
          this.ctx.stroke();
        }

        // 极微弱缓慢恒星漂移
        star.y -= star.speed * 0.3;
        if (star.y < 0) {
          star.y = this.height;
          star.x = Math.random() * this.width;
        }
      }

      // 3. 流星逻辑 (稀有而真实，划破深空)
      const currentTime = Date.now();
      if (currentTime - this.lastMeteorTime > this.meteorInterval) {
        if (Math.random() < 0.65) {
          this.createMeteor();
        }
        this.lastMeteorTime = currentTime;
        this.meteorInterval = 9000 + Math.random() * 8000;
      }

      for (let i = this.meteors.length - 1; i >= 0; i--) {
        const m = this.meteors[i];
        m.life++;
        m.x += m.dx;
        m.y += m.dy;

        const progress = m.life / m.maxLife;
        m.alpha = Math.sin(progress * Math.PI); // 先亮后暗

        const tailX = m.x - (m.dx / 10) * m.length;
        const tailY = m.y - (m.dy / 10) * m.length;

        const meteorGrad = this.ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        meteorGrad.addColorStop(0, `rgba(255, 255, 255, ${m.alpha * 0.85})`);
        meteorGrad.addColorStop(0.2, `rgba(186, 230, 253, ${m.alpha * 0.6})`);
        meteorGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        this.ctx.strokeStyle = meteorGrad;
        this.ctx.lineWidth = 1.2;
        this.ctx.beginPath();
        this.ctx.moveTo(m.x, m.y);
        this.ctx.lineTo(tailX, tailY);
        this.ctx.stroke();

        if (m.life >= m.maxLife || m.x < 0 || m.x > this.width || m.y > this.height) {
          this.meteors.splice(i, 1);
        }
      }

      this.animId = requestAnimationFrame(this.render);
    }
  }

  // 实例化并挂载到 window
  function initStarfield() {
    window.spaceStarfield = new SpaceStarfield('spaceCanvas');
    if (document.body.classList.contains('theme-overspace')) {
      window.spaceStarfield.setActive(true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStarfield);
  } else {
    initStarfield();
  }
})();
