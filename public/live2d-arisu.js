(() => {
  const LOBBY_SUBTITLES = {
    Aris_MemorialLobby_1: 'Panpakapan~! Chào mừng Sensei đến với căn cứ Câu lạc bộ Phát triển Game ạ!',
    Aris_MemorialLobby_2_1: 'Sensei ơi, cùng Arisu chơi một ván game mới nhé!',
    Aris_MemorialLobby_2_2: 'Chỉ cần có Sensei trong Party, nhiệm vụ nào Arisu cũng vượt qua được!',
    Aris_MemorialLobby_3_1: 'Hả...? Sensei đang xoa đầu Arisu sao ạ?',
    Aris_MemorialLobby_3_2: 'Ấm quá... thanh Hạnh Phúc của Arisu đang tăng vọt luôn đó Sensei!',
    Aris_MemorialLobby_3_3: 'Hehe... Arisu thích được ở bên cạnh Sensei như thế này lắm ạ!',
    Aris_MemorialLobby_4_1: 'Hệ thống Kiếm Ánh Sáng Supernova đã sẵn sàng kích hoạt!',
    Aris_MemorialLobby_4_2: 'Level Up! Năng lượng của Arisu đã đạt mức tối đa 100%!',
    Aris_MemorialLobby_5_1: 'Sensei vất vả rồi ạ! Hãy nghỉ ngơi một chút tại điểm Save nhé.',
    Aris_MemorialLobby_5_2: 'Arisu sẽ luôn đồng hành cùng Sensei trong mọi cuộc phiêu lưu!'
  };

  const HEADPAT_LINES = [
    'Panpakapan~! Được Sensei xoa đầu ấm áp quá đi mất!',
    'Thanh Hạnh Phúc của Arisu vừa tăng vọt lên 9999/9999 luôn ạ!',
    'Hehe, bàn tay của Sensei làm Arisu thấy bình yên lắm luôn!',
    'Đó là một đòn Critical Hit siêu dễ thương từ Sensei!'
  ];

  class ArisuLive2DController {
    constructor() {
      this.canvas = null;
      this.context = null;
      this.renderer = null;
      this.assetManager = null;
      this.models = {};
      this.activeKey = 'lobby';
      this.expanded = false;
      this.visible = true;
      this.running = false;
      this.lastTime = performance.now();

      // Pointer & interaction state
      this.cursorNormX = 0;
      this.cursorNormY = 0;
      this.eyeTargetX = 0;
      this.eyeTargetY = 0;
      this.patTargetX = 0;
      this.patTargetY = 0;
      this.isPatting = false;
      this.pointerDown = false;
      this.downTime = 0;
      this.downX = 0;
      this.downY = 0;
      this.lastMoveX = 0;
      this.lastMoveY = 0;
      this.patAccumDist = 0;
      this.patHeartCooldown = 0;
      this.hoverZone = 'idle';

      // Talk & Audio state
      this.currentAudio = null;
      this.muteClipVoice = false;
      this.talkIdx = 0;
      this.spriteExpr = '01';
      this.nextBlinkTimer = 2.8;
      this.chatTalking = false;

      // Callbacks
      this.onAffectionGain = null;
      this.onBubble = null;
      this.onSpawnHeart = null;
      this.isVoiceEnabled = () => true;
      this.loadingOverlay = null;
    }

    init(canvasEl, options = {}) {
      if (!canvasEl || typeof spine === 'undefined') return false;
      this.canvas = canvasEl;
      this.loadingOverlay = options.loadingOverlay || null;
      this.onAffectionGain = options.onAffectionGain || null;
      this.onBubble = options.onBubble || null;
      this.onSpawnHeart = options.onSpawnHeart || null;
      if (options.isVoiceEnabled) this.isVoiceEnabled = options.isVoiceEnabled;
      if (options.initialModel) this.activeKey = options.initialModel;

      // Tắt Premultiply Alpha khi upload texture vì ảnh PNG Blue Archive là Straight Alpha
      spine.GLTexture.DISABLE_UNPACK_PREMULTIPLIED_ALPHA_WEBGL = true;

      this.context = new spine.ManagedWebGLRenderingContext(this.canvas, {
        alpha: true,
        premultipliedAlpha: false,
        antialias: true
      });
      if (!this.context.gl) {
        if (this.loadingOverlay) this.loadingOverlay.textContent = 'WebGL không khả dụng';
        return false;
      }

      this.renderer = new spine.SceneRenderer(this.canvas, this.context, true);
      this.assetManager = new spine.AssetManager(this.context, '/live2d/');

      this.assetManager.loadTextureAtlas('aris_home/Aris_home.atlas');
      this.assetManager.loadBinary('aris_home/Aris_home.skel');
      this.assetManager.loadTextureAtlas('aris_spr/aris_spr.atlas');
      this.assetManager.loadBinary('aris_spr/aris_spr.skel');

      this.bindPointerEvents();
      this.waitForAssets();
      return true;
    }

    waitForAssets() {
      if (!this.assetManager) return;
      if (this.assetManager.isLoadingComplete()) {
        if (this.assetManager.hasErrors()) {
          console.error('[Live2D] Asset load error:', this.assetManager.getErrors());
          if (this.loadingOverlay) this.loadingOverlay.textContent = 'Lỗi tải tài nguyên Live2D';
          return;
        }
        this.buildModel('lobby', 'aris_home/Aris_home.atlas', 'aris_home/Aris_home.skel', 'Idle_01');
        this.buildModel('sprite', 'aris_spr/aris_spr.atlas', 'aris_spr/aris_spr.skel', 'Idle_01');

        if (this.models.sprite) {
          this.models.sprite.state.setAnimation(1, '01', true);
        }

        if (this.loadingOverlay) {
          this.loadingOverlay.style.display = 'none';
        }
        this.setModel(this.activeKey);
        this.startLoop();
        return;
      }
      requestAnimationFrame(() => this.waitForAssets());
    }

    buildModel(key, atlasPath, skelPath, defaultAnim) {
      const atlas = this.assetManager.get(atlasPath);
      const skelBytes = this.assetManager.get(skelPath);
      if (!atlas || !skelBytes) return;

      const loader = new spine.AtlasAttachmentLoader(atlas);
      const bin = new spine.SkeletonBinary(loader);
      const skeletonData = bin.readSkeletonData(skelBytes);
      const skeleton = new spine.Skeleton(skeletonData);
      skeleton.setToSetupPose();

      const stateData = new spine.AnimationStateData(skeletonData);
      stateData.defaultMix = 0.25;
      const state = new spine.AnimationState(stateData);
      state.setAnimation(0, defaultAnim, true);

      // Lắng nghe event âm thanh & thoại từ Spine Memorial Lobby
      state.addListener({
        event: (entry, event) => {
          if (key !== 'lobby' || this.muteClipVoice) return;
          if (event.data?.name === 'Talk' && event.stringValue) {
            const clipName = event.stringValue;
            const sub = LOBBY_SUBTITLES[clipName];
            if (sub && this.onBubble) this.onBubble(sub, 4200);
            if (this.isVoiceEnabled()) {
              this.playVoiceClip(`/live2d/audio/${clipName}.ogg`);
            }
          }
        }
      });

      this.models[key] = {
        skeletonData,
        skeleton,
        state,
        tempVec: new spine.Vector2(),
        screenVec: new spine.Vector3()
      };
    }

    playVoiceClip(url) {
      try {
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio.currentTime = 0;
        }
        const audio = new Audio(url);
        audio.volume = 0.72;
        this.currentAudio = audio;
        audio.play().catch(() => {});
      } catch (e) {}
    }

    stopVoiceClip() {
      if (this.currentAudio) {
        try {
          this.currentAudio.pause();
          this.currentAudio.currentTime = 0;
        } catch (e) {}
        this.currentAudio = null;
      }
    }

    setModel(key) {
      if (key !== 'lobby' && key !== 'sprite') return;
      this.activeKey = key;
      this.stopVoiceClip();
      this.isPatting = false;
      this.pointerDown = false;
      const m = this.models[key];
      if (m) {
        m.state.clearTrack(1);
        m.state.clearTrack(2);
        m.state.setAnimation(0, 'Idle_01', true);
        if (key === 'sprite') {
          m.state.setAnimation(1, this.spriteExpr || '01', true);
        }
      }
    }

    setExpanded(expanded) {
      this.expanded = !!expanded;
    }

    setVisible(visible) {
      this.visible = !!visible;
      if (this.visible) {
        this.startLoop();
      } else {
        this.stopVoiceClip();
      }
    }

    setExpression(exprCode) {
      this.spriteExpr = exprCode;
      const m = this.models.sprite;
      if (m && m.skeletonData.findAnimation(exprCode)) {
        m.state.setAnimation(1, exprCode, true);
      }
    }

    // Đồng bộ phản ứng Live2D khi AI trả lời trong Terminal
    setChatTalking(isTalking, mood = 'normal') {
      this.chatTalking = !!isTalking;
      if (this.activeKey === 'sprite') {
        const expr = isTalking ? (mood === 'happy' ? '03' : '02') : '01';
        this.setExpression(expr);
        return;
      }
      const m = this.models.lobby;
      if (!m || this.isPatting) return;
      if (isTalking) {
        this.muteClipVoice = true;
        m.state.setAnimation(2, 'Talk_01_M', true);
      } else {
        this.muteClipVoice = false;
        m.state.addEmptyAnimation(2, 0.3, 0);
      }
    }

    triggerTalk(index) {
      if (this.activeKey === 'sprite') {
        this.setExpression('03');
        if (this.onBubble) {
          this.onBubble('Panpakapan~! Arisu luôn sẵn sàng đồng hành cùng Sensei!', 3200);
        }
        setTimeout(() => {
          if (!this.chatTalking) this.setExpression('01');
        }, 2500);
        return;
      }

      const m = this.models.lobby;
      if (!m) return;
      this.muteClipVoice = false;
      this.talkIdx = index ? index : (this.talkIdx % 5) + 1;
      const animA = `Talk_0${this.talkIdx}_A`;
      const animM = `Talk_0${this.talkIdx}_M`;
      m.state.setAnimation(1, animA, false);
      m.state.addEmptyAnimation(1, 0.35, 0);
      m.state.setAnimation(2, animM, false);
      m.state.addEmptyAnimation(2, 0.35, 0);
    }

    screenToSpineWorld(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
      const vec = new spine.Vector3(clientX - rect.left, clientY - rect.top, 0);
      this.renderer.camera.screenToWorld(vec, rect.width, rect.height);
      return { x: vec.x, y: vec.y };
    }

    detectHitZone(clientX, clientY) {
      const m = this.models[this.activeKey];
      if (!m) return 'body';
      const wp = this.screenToSpineWorld(clientX, clientY);

      if (this.activeKey === 'lobby') {
        const ptBone = m.skeleton.findBone('Touch_Point');
        const eyeBone = m.skeleton.findBone('Touch_Eye');
        if (ptBone) {
          const dHead = Math.hypot(wp.x - ptBone.worldX, wp.y - ptBone.worldY);
          if (dHead < 260 || wp.y > (eyeBone ? eyeBone.worldY + 110 : 1200)) {
            return 'head';
          }
        }
        if (eyeBone) {
          const dEye = Math.hypot(wp.x - eyeBone.worldX, wp.y - eyeBone.worldY);
          if (dEye < 150) return 'eye';
        }
        return 'body';
      } else {
        // Standing sprite
        if (wp.y > 700) return 'head';
        return 'body';
      }
    }

    startPatting() {
      if (this.isPatting) return;
      this.isPatting = true;
      this.patAccumDist = 0;
      const m = this.models.lobby;
      if (this.activeKey === 'lobby' && m) {
        this.stopVoiceClip();
        m.state.setAnimation(1, 'Pat_01_A', true);
        m.state.setAnimation(2, 'Pat_01_M', true);
      } else if (this.activeKey === 'sprite') {
        this.setExpression('03');
      }
    }

    stopPatting() {
      if (!this.isPatting) return;
      this.isPatting = false;
      this.patTargetX = 0;
      this.patTargetY = 0;
      const m = this.models.lobby;
      if (this.activeKey === 'lobby' && m) {
        m.state.setAnimation(1, 'PatEnd_01_A', false);
        m.state.addEmptyAnimation(1, 0.28, 0);
        m.state.setAnimation(2, 'PatEnd_01_M', false);
        m.state.addEmptyAnimation(2, 0.28, 0);
      } else if (this.activeKey === 'sprite' && !this.chatTalking) {
        this.setExpression('01');
      }
      if (this.patAccumDist > 20) {
        const line = HEADPAT_LINES[Math.floor(Math.random() * HEADPAT_LINES.length)];
        if (this.onBubble) this.onBubble(line, 3200);
        if (this.onAffectionGain) this.onAffectionGain(5);
      }
    }

    bindPointerEvents() {
      // Theo dõi chuột toàn cửa sổ để mắt & đầu Arisu nhìn theo Sensei
      window.addEventListener('pointermove', (e) => {
        if (!this.visible || !this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.38;
        const dx = (e.clientX - cx) / Math.max(220, window.innerWidth * 0.35);
        const dy = (cy - e.clientY) / Math.max(220, window.innerHeight * 0.35);

        this.cursorNormX = Math.max(-1, Math.min(1, dx));
        this.cursorNormY = Math.max(-1, Math.min(1, dy));

        if (this.pointerDown && this.isPatting) {
          const moveDist = Math.hypot(e.clientX - this.lastMoveX, e.clientY - this.lastMoveY);
          this.patAccumDist += moveDist;
          this.lastMoveX = e.clientX;
          this.lastMoveY = e.clientY;

          // Đầu Arisu nghiêng/lắc nhẹ theo nhịp xoa đầu
          const localRelX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
          const localRelY = (0.32 - (e.clientY - rect.top) / rect.height) * 2;
          this.patTargetX = Math.max(-1, Math.min(1, localRelX));
          this.patTargetY = Math.max(-1, Math.min(1, localRelY));

          const now = performance.now();
          if (moveDist > 5 && now - this.patHeartCooldown > 360) {
            this.patHeartCooldown = now;
            if (this.onSpawnHeart) this.onSpawnHeart();
            if (this.onAffectionGain) this.onAffectionGain(2);
          }
        }
      });

      this.canvas.addEventListener('pointermove', (e) => {
        if (this.pointerDown) return;
        const zone = this.detectHitZone(e.clientX, e.clientY);
        this.hoverZone = zone;
        this.canvas.style.cursor = zone === 'head' ? 'grab' : 'pointer';
      });

      this.canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        this.pointerDown = true;
        this.downTime = performance.now();
        this.downX = e.clientX;
        this.downY = e.clientY;
        this.lastMoveX = e.clientX;
        this.lastMoveY = e.clientY;

        const zone = this.detectHitZone(e.clientX, e.clientY);
        if (zone === 'head') {
          this.canvas.style.cursor = 'grabbing';
          this.startPatting();
          if (this.onSpawnHeart) this.onSpawnHeart();
        }
      });

      window.addEventListener('pointerup', (e) => {
        if (!this.pointerDown) return;
        const wasPatting = this.isPatting;
        const elapsed = performance.now() - this.downTime;
        const dragDist = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);

        this.pointerDown = false;
        this.canvas.style.cursor = this.hoverZone === 'head' ? 'grab' : 'pointer';

        if (wasPatting) {
          this.stopPatting();
          if (dragDist < 8 && elapsed < 260) {
            if (this.onSpawnHeart) this.onSpawnHeart();
            if (this.onAffectionGain) this.onAffectionGain(5);
            const line = HEADPAT_LINES[Math.floor(Math.random() * HEADPAT_LINES.length)];
            if (this.onBubble) this.onBubble(line, 3000);
          }
          return;
        }

        // Click nhanh vào mắt hoặc thân người -> Phản ứng mắt hoặc nói chuyện!
        if (dragDist < 10 && elapsed < 350) {
          const rect = this.canvas.getBoundingClientRect();
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          ) {
            const zone = this.detectHitZone(e.clientX, e.clientY);
            if (zone === 'eye' && this.activeKey === 'lobby') {
              const m = this.models.lobby;
              if (m) {
                m.state.setAnimation(2, 'Look_01_M', false);
                m.state.addAnimation(2, 'LookEnd_01_M', false, 0.35);
                m.state.addEmptyAnimation(2, 0.25, 0);
                m.state.setAnimation(1, 'LookEnd_01_A', false);
                m.state.addEmptyAnimation(1, 0.25, 0);
              }
              if (this.onBubble) {
                this.onBubble('Hả? Mắt của Arisu có gì đặc biệt sao Sensei?', 2800);
              }
            } else {
              this.triggerTalk();
            }
          }
        }
      });

      this.canvas.addEventListener('pointerleave', () => {
        this.hoverZone = 'idle';
        if (!this.pointerDown) this.canvas.style.cursor = 'default';
      });
    }

    updateCameraForModel() {
      const gl = this.context.gl;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = this.canvas.clientWidth;
      const ch = this.canvas.clientHeight;
      if (cw <= 0 || ch <= 0) return false;

      const pw = Math.round(cw * dpr);
      const ph = Math.round(ch * dpr);
      if (this.canvas.width !== pw || this.canvas.height !== ph) {
        this.canvas.width = pw;
        this.canvas.height = ph;
      }

      gl.viewport(0, 0, pw, ph);
      const aspect = pw / ph;

      let camX = -195;
      let camY = 920;
      let targetH = 1980;

      if (this.activeKey === 'lobby') {
        if (this.expanded) {
          camX = -40;
          camY = 930;
          targetH = 2240;
        } else {
          camX = -195;
          camY = 910;
          targetH = 1980;
        }
      } else {
        if (this.expanded) {
          camX = -25;
          camY = 310;
          targetH = 2240;
        } else {
          camX = -25;
          camY = 460;
          targetH = 1780;
        }
      }

      this.renderer.camera.setViewport(targetH * aspect, targetH);
      this.renderer.camera.position.x = camX;
      this.renderer.camera.position.y = camY;
      this.renderer.camera.zoom = 1;
      this.renderer.camera.update();
      return true;
    }

    startLoop() {
      if (this.running) return;
      this.running = true;
      this.lastTime = performance.now();
      const tick = (now) => {
        if (!this.visible) {
          this.running = false;
          return;
        }
        const delta = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
        this.lastTime = now;
        this.renderFrame(delta);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    renderFrame(delta) {
      const m = this.models[this.activeKey];
      if (!m || !this.renderer) return;
      if (!this.updateCameraForModel()) return;

      const gl = this.context.gl;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Chớp mắt tự nhiên cho Standing Sprite
      if (this.activeKey === 'sprite') {
        this.nextBlinkTimer -= delta;
        if (this.nextBlinkTimer <= 0) {
          this.nextBlinkTimer = 2.8 + Math.random() * 2.5;
          m.state.setAnimation(2, 'Eye_Close_01', false);
          m.state.addEmptyAnimation(2, 0.1, 0);
        }
      }

      m.state.update(delta);
      m.state.apply(m.skeleton);

      // Nội suy mượt cho ánh mắt & độ nghiêng đầu theo con trỏ chuột
      const lerpFactor = Math.min(1, delta * 9);
      this.eyeTargetX += (this.cursorNormX - this.eyeTargetX) * lerpFactor;
      this.eyeTargetY += (this.cursorNormY - this.eyeTargetY) * lerpFactor;

      if (this.activeKey === 'lobby') {
        const eyeKey = m.skeleton.findBone('Touch_Eye_Key');
        if (eyeKey && eyeKey.parent) {
          m.tempVec.set(
            eyeKey.parent.worldX + this.eyeTargetX * 145,
            eyeKey.parent.worldY + this.eyeTargetY * 115
          );
          eyeKey.parent.worldToLocal(m.tempVec);
          eyeKey.x = m.tempVec.x;
          eyeKey.y = m.tempVec.y;
        }

        if (this.isPatting) {
          const ptKey = m.skeleton.findBone('Touch_Point_Key');
          if (ptKey && ptKey.parent) {
            m.tempVec.set(
              ptKey.parent.worldX + this.patTargetX * 95,
              ptKey.parent.worldY + this.patTargetY * 70
            );
            ptKey.parent.worldToLocal(m.tempVec);
            ptKey.x = m.tempVec.x;
            ptKey.y = m.tempVec.y;
          }
        }
      } else {
        // Parallax nhẹ cho Standing Sprite
        const rootBone = m.skeleton.findBone('root');
        if (rootBone) {
          rootBone.x = this.eyeTargetX * 28;
          rootBone.y = this.eyeTargetY * 14;
        }
      }

      m.skeleton.updateWorldTransform(spine.Physics.update);

      this.renderer.begin();
      this.renderer.drawSkeleton(m.skeleton, false);
      this.renderer.end();
    }
  }

  window.ArisuLive2D = new ArisuLive2DController();
})();
