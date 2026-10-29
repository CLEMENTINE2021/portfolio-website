/**
 * 作品集主应用逻辑 (app.js)
 * 极简高信息密度实现：
 * 1. 上方横排直接选择作品 (Top Project Strip，已关闭左侧椭圆分类)
 * 2. 下面左侧选择该作品的不同视频片段 (Subvideo Sidebar)
 * 3. 下面右侧展示区域：上方自动播放视频，下方是紧凑关键信息说明 (Showcase & Details)
 */

(function () {
  'use strict';

  // -------------------------------------------------------------
  // 全局状态管理
  // -------------------------------------------------------------
  const state = {
    projects: [],
    currentProjectIndex: 0,
    currentVideoIndex: 0,
    isMuted: true,              // 现代浏览器默认静音以保障 100% 自动起播顺畅
    userWantsAudio: false,      // 用户主动开启声音后保持
    volume: 0.8,
    isDraggingProgress: false,
    isAdmin: false              // 管理员编辑权限 (本地默认开启，云端需密码或暗号解锁)
  };

  // -------------------------------------------------------------
  // DOM 元素缓存
  // -------------------------------------------------------------
  const els = {
    // 顶部横排作品选择栏
    topProjectListContainer: document.getElementById('topProjectListContainer'),

    // 下面左侧：该作品的视频片段选择
    subvideoSidebar: document.getElementById('subvideoSidebar'),
    subvideoListContainer: document.getElementById('subvideoListContainer'),

    // 下面右侧：视频播放器与展示舞台
    videoWrapper: document.getElementById('videoWrapper'),
    videoPlayerBox: document.getElementById('videoPlayerBox'),
    showcaseVideo: document.getElementById('showcaseVideo'),
    showcaseIframe: document.getElementById('showcaseIframe'),
    showcaseImage: document.getElementById('showcaseImage'),
    dragDropOverlay: document.getElementById('dragDropOverlay'),
    videoSpinner: document.getElementById('videoSpinner'),
    unmuteBanner: document.getElementById('unmuteBanner'),
    unmuteActionBtn: document.getElementById('unmuteActionBtn'),
    playPauseIndicator: document.getElementById('playPauseIndicator'),

    // 自定义视频控制器 (纯文本控制按钮)
    customControls: document.getElementById('customControls'),
    progressContainer: document.getElementById('progressContainer'),
    bufferBar: document.getElementById('bufferBar'),
    playedBar: document.getElementById('playedBar'),
    progressHandle: document.getElementById('progressHandle'),
    progressTooltip: document.getElementById('progressTooltip'),
    playPauseBtn: document.getElementById('playPauseBtn'),
    playPauseBtnIcon: document.getElementById('playPauseBtnIcon'),
    nextClipBtn: document.getElementById('nextClipBtn'),
    muteToggleBtn: document.getElementById('muteToggleBtn'),
    volumeBtnIcon: document.getElementById('volumeBtnIcon'),
    volumeSlider: document.getElementById('volumeSlider'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    fullscreenLabel: document.getElementById('fullscreenLabel'),

    // 项目简介说明 (Project Details - 视频上方)
    projectPosterSide: document.getElementById('projectPosterSide'),
    projectPosterImg: document.getElementById('projectPosterImg'),
    projectPosterPlaceholder: document.getElementById('projectPosterPlaceholder'),
    quickPosterPicker: document.getElementById('quickPosterPicker'),
    detailTitle: document.getElementById('detailTitle'),
    detailSubtitle: document.getElementById('detailSubtitle'),
    editProjectBtn: document.getElementById('editProjectBtn'),
    detailOverviewText: document.getElementById('detailOverviewText'),

    // 空白视频占位与上传
    videoEmptyState: document.getElementById('videoEmptyState'),
    emptyVideoPicker: document.getElementById('emptyVideoPicker'),

    // 视频片段说明 (Clip Details - 视频下方)
    clipDetailCard: document.getElementById('clipDetailCard'),
    clipTitle: document.getElementById('clipTitle'),
    clipDesc: document.getElementById('clipDesc'),
    editClipBtn: document.getElementById('editClipBtn'),

    // 模态框 1: 管理作品
    projectModal: document.getElementById('projectModal'),
    projectForm: document.getElementById('projectForm'),
    modalProjectTabs: document.getElementById('modalProjectTabs'),
    closeProjectModalBtn: document.getElementById('closeProjectModalBtn'),
    cancelFormBtn: document.getElementById('cancelFormBtn'),

    // 模态框 2: 编辑片段
    clipEditModal: document.getElementById('clipEditModal'),
    clipEditForm: document.getElementById('clipEditForm'),
    clipModalTitle: document.getElementById('clipModalTitle'),
    clipFormTitle: document.getElementById('clipFormTitle'),
    clipFormDuration: document.getElementById('clipFormDuration'),
    clipFormSrc: document.getElementById('clipFormSrc'),
    clipFormDesc: document.getElementById('clipFormDesc'),
    clipModalFilePicker: document.getElementById('clipModalFilePicker'),
    saveClipBtn: document.getElementById('saveClipBtn'),
    deleteCurrentClipBtn: document.getElementById('deleteCurrentClipBtn'),
    closeClipModalBtn: document.getElementById('closeClipModalBtn'),
    cancelClipFormBtn: document.getElementById('cancelClipFormBtn'),

    // 模态框 3: 快捷键指南
    shortcutsModal: document.getElementById('shortcutsModal'),
    closeShortcutsModalBtn: document.getElementById('closeShortcutsModalBtn'),
    confirmShortcutsBtn: document.getElementById('confirmShortcutsBtn'),

    // 管理员状态指示
    adminStatusIndicator: document.getElementById('adminStatusIndicator'),

    toastContainer: document.getElementById('toastContainer')
  };

  // -------------------------------------------------------------
  // 管理员权限与环境认证
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // 管理员权限控制 (严格限定：仅 localhost / 127.0.0.1 本地环境具备管理员模式)
  // -------------------------------------------------------------
  function isLocalHost() {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '' || host === '0.0.0.0';
  }

  function checkAdminAuth() {
    // 严格设定：只有 localhost 是管理员模式，其它所有环境（线上域名/手机访问等）绝无管理员模式
    state.isAdmin = isLocalHost();
    applyAdminState();
  }

  function applyAdminState() {
    state.isAdmin = isLocalHost();
    document.body.classList.toggle('is-admin-mode', state.isAdmin);

    if (els.adminStatusIndicator) {
      if (state.isAdmin) {
        els.adminStatusIndicator.innerHTML = '<span class="indicator-dot">●</span> 本地编辑模式 (实时写入文件)';
        els.adminStatusIndicator.style.display = 'inline-flex';
      } else {
        els.adminStatusIndicator.style.display = 'none';
      }
    }
    if (els.topProjectListContainer && state.projects.length > 0) {
      renderTopProjectStrip();
    }
  }

  // -------------------------------------------------------------
  // 初始化
  // -------------------------------------------------------------
  function init() {
    checkAdminAuth();
    startHeartbeat();
    loadProjectsData();
    initBaseRev();
    normalizeProjectsData();
    renderTopProjectStrip();

    // 根据 URL Hash 决定初始作品
    const hashId = window.location.hash.replace('#', '').trim();
    let initialIndex = 0;
    if (hashId) {
      const foundIdx = state.projects.findIndex(p => p.id === hashId);
      if (foundIdx !== -1) initialIndex = foundIdx;
    }

    selectProject(initialIndex, 0, true);
    setupEventListeners();
    setupKeyboardShortcuts();

    if (restoredFromCache) {
      showToast('检测到上次未写入 js/projects.js 的修改，已从浏览器缓存恢复，正在尝试写入文件');
      syncProjectsToServer();
    }
  }

  const DATA_VERSION = 'v7_20261028_synced_user_edits';
  // 'portfolio_unsynced' = '1' 表示浏览器里有尚未写入 js/projects.js 的修改 (js/projects.js 才是数据源)
  const UNSYNCED_KEY = 'portfolio_unsynced';
  let restoredFromCache = false;

  // -------------------------------------------------------------
  // 工具函数: 提取与检测 Bilibili BV 号
  // -------------------------------------------------------------
  function extractBvid(str) {
    if (!str) return null;
    const match = str.match(/BV[a-zA-Z0-9]{10}/i);
    return match ? match[0] : null;
  }

  function getBvid(clip) {
    if (!clip) return null;
    if (clip.bvid) return clip.bvid;
    return extractBvid(clip.src);
  }

  // -------------------------------------------------------------
  // 工具函数: HTML 转义 (数据值拼入 innerHTML 前必须转义)
  // -------------------------------------------------------------
  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  // 片段来源为图片 (按扩展名判断，忽略查询串)：以图片展示，而不是视频播放器
  function isImageSrc(src) {
    return !!src && /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i.test(src);
  }

  // -------------------------------------------------------------
  // 数据存取与格式规范化
  // -------------------------------------------------------------
  function loadProjectsData() {
    try {
      const isLocal = isLocalHost();
      const storedVersion = localStorage.getItem('portfolio_data_version');
      const stored = localStorage.getItem('portfolio_projects_custom');
      const unsynced = localStorage.getItem(UNSYNCED_KEY) === '1';
      // js/projects.js 是数据源；仅当本地有尚未写入文件的修改时才读取 localStorage 缓存，
      // 否则过期缓存 (如 localhost 与 127.0.0.1 不同源、手动改过 projects.js) 会覆盖较新的文件内容
      if (isLocal && stored && storedVersion === DATA_VERSION && unsynced) {
        state.projects = JSON.parse(stored);
        restoredFromCache = true;
      } else if (window.PORTFOLIO_DATA && window.PORTFOLIO_DATA.projects) {
        state.projects = [...window.PORTFOLIO_DATA.projects];
        if (isLocal) {
          localStorage.setItem('portfolio_data_version', DATA_VERSION);
          localStorage.removeItem('portfolio_projects_custom');
          localStorage.removeItem(UNSYNCED_KEY);
        }
      }
    } catch (e) {
      console.warn('读取本地数据失败，使用默认作品集', e);
      state.projects = window.PORTFOLIO_DATA ? [...window.PORTFOLIO_DATA.projects] : [];
    }
  }

  function normalizeProjectsData() {
    state.projects.forEach((proj, idx) => {
      if (!proj.videos || proj.videos.length === 0) {
        proj.videos = [
          {
            id: `${proj.id || 'p' + idx}-v1`,
            title: `01. ${proj.title} 核心演示`,
            desc: proj.subtitle || '实机功能演示录像',
            src: proj.video || 'assets/videos/overspace-prediction.mp4',
            duration: proj.duration || '00:15'
          }
        ];
      }
    });
  }

  // 保存计数：每次保存 +1，用于判断某次同步完成时是否已有更新的修改
  let saveSeq = 0;
  // 同步串行化：服务器是多线程的，并发 POST 可能乱序落盘导致旧快照覆盖新数据
  let syncChain = Promise.resolve();

  // 服务器是否处于"同步失败"状态：此时修改只存在浏览器缓存里，用常驻横幅提醒 (toast 2 秒就消失，容易错过)
  let syncFailed = false;
  let retryTimer = null;

  function hasUnsyncedChanges() {
    try {
      return localStorage.getItem(UNSYNCED_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  // 乐观并发控制：记录本页面数据基于 js/projects.js 的哪个版本。
  // 保存时带上该版本号，服务器发现文件已被更新 (旧标签页 / 缓存 / git 操作) 就拒绝写入，避免整体覆盖较新的内容
  const BASE_REV_KEY = 'portfolio_base_rev';
  let baseRev = null;
  let baseRevPromise = Promise.resolve();
  let conflict = false;

  async function fetchBaseRev() {
    try {
      const r = await fetch('/api/projects-rev', { cache: 'no-store' });
      if (r.ok) baseRev = (await r.json()).rev;
    } catch (e) {}
  }

  function initBaseRev() {
    if (!state.isAdmin) return;
    let stored = null;
    try {
      stored = localStorage.getItem(BASE_REV_KEY);
    } catch (e) {}
    // 从浏览器缓存恢复的数据是基于缓存当时的版本编辑的，必须沿用当时的版本号；
    // 没有记录版本号的旧缓存无法判断是否过期，若按当前文件版本放行，会把旧快照写回去覆盖较新的内容，所以直接当作过期处理
    if (restoredFromCache && stored) {
      baseRev = stored;
    } else if (restoredFromCache) {
      showConflict();
    } else {
      baseRevPromise = fetchBaseRev();
    }
  }

  function downloadMyEdits() {
    const blob = new Blob([JSON.stringify(state.projects, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `my_unsaved_edits_${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function discardAndReload() {
    if (!confirm('将丢弃本页尚未写入文件的修改并加载最新数据，确定吗？(建议先下载我的修改)')) return;
    try {
      localStorage.removeItem('portfolio_projects_custom');
      localStorage.removeItem(UNSYNCED_KEY);
      localStorage.removeItem(BASE_REV_KEY);
    } catch (e) {}
    location.reload();
  }

  // 遮罩：断线 / 数据过期时阻止继续编辑
  function updateSyncBanner() {
    const mode = !state.isAdmin ? '' : conflict ? 'conflict' : syncFailed ? 'offline' : '';
    let banner = document.getElementById('syncFailBanner');
    if (banner && banner.dataset.mode !== mode) {
      banner.remove();
      banner = null;
    }
    if (!mode || banner) return;
    banner = document.createElement('div');
    banner.id = 'syncFailBanner';
    banner.dataset.mode = mode;
    banner.className = 'sync-fail-banner';
    banner.setAttribute('role', 'alert');
    if (mode === 'conflict') {
      banner.innerHTML = '<div class="sync-fail-box"><p>⚠️ 页面数据已过期，已暂停编辑</p>' +
        '<p>js/projects.js 在你打开本页之后被更新过 (其它标签页、git 操作或手动修改)。继续保存会覆盖较新的内容，所以本页的修改没有写入。</p>' +
        '<button type="button" id="downloadEditsBtn">下载我的修改 (JSON)</button> ' +
        '<button type="button" id="discardReloadBtn">放弃本页修改并刷新</button></div>';
      document.body.appendChild(banner);
      banner.querySelector('#downloadEditsBtn').addEventListener('click', downloadMyEdits);
      banner.querySelector('#discardReloadBtn').addEventListener('click', discardAndReload);
    } else {
      banner.innerHTML = '<div class="sync-fail-box"><p>⚠️ 与服务器断开，已暂停编辑</p>' +
        '<p>无法写入 js/projects.js，此时的任何修改都不会被保存。请重新运行 ./start.sh，连上后会自动恢复。</p>' +
        '<button type="button" id="syncRetryBtn">立即重试</button></div>';
      document.body.appendChild(banner);
      banner.querySelector('#syncRetryBtn').addEventListener('click', checkServer);
    }
  }

  function showConflict() {
    conflict = true;
    syncFailed = false;
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
    updateSyncBanner();
  }

  function notifySyncFailed(silent) {
    syncFailed = true;
    updateSyncBanner();
    // 断线期间每 5 秒自动重试一次，服务器恢复后自动补写
    if (!retryTimer) {
      retryTimer = setInterval(() => {
        if (!hasUnsyncedChanges()) {
          clearInterval(retryTimer);
          retryTimer = null;
          return;
        }
        syncProjectsToServer(true);
      }, 5000);
    }
    if (!silent) {
      showToast('⚠️ 未能写入 js/projects.js（请用 ./start.sh 启动 server.py），修改已暂存在浏览器中');
    }
  }

  // 心跳：每 3 秒探测服务器，断线时弹出遮罩阻止编辑，恢复后自动解除
  async function checkServer() {
    if (conflict) return;
    let online = false;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2000);
      const r = await fetch('/', { method: 'HEAD', cache: 'no-store', signal: ctrl.signal });
      clearTimeout(timer);
      online = r.ok;
    } catch (e) {}
    if (!online) {
      if (!syncFailed) notifySyncFailed(true);
    } else if (syncFailed) {
      if (hasUnsyncedChanges()) {
        syncProjectsToServer();
      } else {
        syncFailed = false;
        updateSyncBanner();
      }
    }
  }

  function startHeartbeat() {
    if (state.isAdmin) setInterval(checkServer, 3000);
  }

  // 离开页面前，若还有未写入文件的修改则让浏览器弹确认框
  window.addEventListener('beforeunload', (e) => {
    if (state.isAdmin && hasUnsyncedChanges() && (syncFailed || conflict)) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // 实际执行一次同步 (开始时才序列化 state.projects，保证发送最新状态；绝不 reject，避免链条卡死)
  async function doSync(silent) {
    if (conflict) return;
    const seqAtStart = saveSeq;
    try {
      await baseRevPromise;
      if (baseRev === null) await fetchBaseRev();
      if (baseRev === null) {
        notifySyncFailed(silent);
        return;
      }
      const response = await fetch('/api/save-projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Base-Rev': baseRev
        },
        body: JSON.stringify(state.projects)
      });
      if (response.status === 409) {
        showConflict();
        return;
      }
      if (response.ok) {
        const res = await response.json();
        if (res.success) {
          if (res.rev) baseRev = res.rev;
          if (res.updatedProjects) {
            // 只回填服务器落地后的图片路径，不替换 state.projects，
            // 否则已渲染列表的事件闭包和进行中的编辑会指向旧对象，修改被静默丢弃
            res.updatedProjects.forEach((updated, idx) => {
              const proj = state.projects[idx];
              if (!proj || proj.id !== updated.id) return;
              if (proj.thumbnail && proj.thumbnail.startsWith('data:image/')) proj.thumbnail = updated.thumbnail;
              if (proj.icon && proj.icon.startsWith('data:image/')) proj.icon = updated.icon;
            });
            try {
              localStorage.setItem('portfolio_projects_custom', JSON.stringify(state.projects));
            } catch (e) {}
          }
          // 同步期间若又有新的保存，则仍有未写入文件的修改，保留标记等待下一次同步
          if (seqAtStart === saveSeq) {
            try {
              localStorage.removeItem(UNSYNCED_KEY);
            } catch (e) {}
          }
          const recovered = syncFailed;
          syncFailed = false;
          updateSyncBanner();
          showToast(recovered ? '✅ 服务器已恢复，缓存的修改已写入 js/projects.js' : '💾 已同步修改本地 js/projects.js 文件！');
          return;
        }
      }
      notifySyncFailed(silent);
    } catch (e) {
      notifySyncFailed(silent);
    }
  }

  function syncProjectsToServer(silent) {
    syncChain = syncChain.then(() => doSync(silent === true));
    return syncChain;
  }

  function saveCustomProjects() {
    if (syncFailed || conflict) {
      showToast(conflict ? '⚠️ 页面数据已过期，无法保存' : '⚠️ 服务器已断开，无法保存');
      return;
    }
    saveSeq++;
    try {
      if (baseRev) localStorage.setItem(BASE_REV_KEY, baseRev);
      localStorage.setItem('portfolio_data_version', DATA_VERSION);
      localStorage.setItem('portfolio_projects_custom', JSON.stringify(state.projects));
      localStorage.setItem(UNSYNCED_KEY, '1');
    } catch (e) {
      console.error('无法保存到 localStorage', e);
    }
    // 触发自动同步写入本地代码文件
    syncProjectsToServer();
  }

  // -------------------------------------------------------------
  // 工具函数: 读取本地图片为压缩的 Data URL (在 localStorage 中持久化保存)
  // -------------------------------------------------------------
  function fileToDataUrl(file, maxWidth = 800, maxHeight = 800) {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith('image/')) {
        resolve('');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxHeight) {
            if (width / maxWidth > height / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(dataUrl);
          } catch (err) {
            resolve(e.target.result);
          }
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(URL.createObjectURL(file));
      reader.readAsDataURL(file);
    });
  }

  // -------------------------------------------------------------
  // 工具函数: 上传本地视频 / 图片到 server.py，落地为 assets/videos/ 或 assets/images/ 下的真实文件
  // (blob: 临时地址刷新即失效，也无法随网站部署，因此不再写入数据)
  // -------------------------------------------------------------
  const PAGES_FILE_LIMIT = 25 * 1024 * 1024; // Cloudflare Pages 单文件上限 25 MiB

  async function uploadMediaFile(file) {
    const response = await fetch(`/api/upload-video?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });
    let res = null;
    try {
      res = await response.json();
    } catch (e) {}
    if (!response.ok || !res || !res.success) {
      throw new Error((res && res.error) || `HTTP ${response.status}`);
    }
    if (file.size > PAGES_FILE_LIMIT) {
      setTimeout(() => showToast(`注意: ${file.name} 超过 25 MiB，部署到 Cloudflare Pages 会失败，建议压缩`), 2400);
    }
    return res.src;
  }

  function showUploadError(err) {
    console.error('上传失败', err);
    showToast(`上传失败 (${err.message})，请确认通过 ./start.sh 启动了 server.py`);
  }

  // -------------------------------------------------------------
  // 获取项目对应的高清矢量图标 SVG 或自定义图片图标
  // -------------------------------------------------------------
  function getProjectIconSvg(project) {
    if (project.iconSvg) return project.iconSvg;
    if (project.id === 'overspace') {
      // OVERSPACE: 太空战术穿梭机 / 物理矢量机动
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="project-icon-svg">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
          <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
          <path d="M9 12H4s.55-3.03 2-4.5c1.62-1.63 5-2 5-2"/>
          <path d="M12 15v5s3.03-.55 4.5-2c1.63-1.62 2-5 2-5"/>
          <circle cx="14.5" cy="9.5" r="1.5" fill="currentColor"/>
        </svg>
      `;
    }
    // 人质营救关卡设计 (hostage-rescue): 战术准星与防护盾牌
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="project-icon-svg">
        <path d="M12 2l7 3.5v6.2c0 5.4-3.5 10.4-7 11.8-3.5-1.4-7-6.4-7-11.8V5.5L12 2z"/>
        <circle cx="12" cy="11" r="3.2"/>
        <path d="M12 6.5v1.8"/>
        <path d="M12 13.7v1.8"/>
        <path d="M7.5 11h1.8"/>
        <path d="M14.7 11h1.8"/>
      </svg>
    `;
  }

  function getProjectIcon(project) {
    if (project.icon) {
      const iconStr = project.icon.trim();
      if (iconStr.startsWith('<svg')) {
        return iconStr;
      }
      return `<img src="${escapeHtml(iconStr)}" alt="${escapeHtml(project.title)}" class="project-icon-img">`;
    }
    return getProjectIconSvg(project);
  }

  // -------------------------------------------------------------
  // 顶部横排作品选择条 (Top Project Strip - 自定义图标与下方标题)
  // -------------------------------------------------------------
  function renderTopProjectStrip() {
    els.topProjectListContainer.innerHTML = '';

    state.projects.forEach((project, originalIdx) => {
      const isSelected = originalIdx === state.currentProjectIndex;

      const card = document.createElement('button');
      card.className = `top-project-card ${isSelected ? 'active' : ''}`;
      card.dataset.index = originalIdx;
      card.setAttribute('role', 'tab');
      card.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      card.setAttribute('aria-label', project.title);
      card.title = project.title;
      card.tabIndex = 0;

      card.innerHTML = `
        <div class="project-icon-wrapper">
          ${getProjectIcon(project)}
        </div>
        <span class="top-project-title-text">${escapeHtml(project.title)}</span>
      `;

      // 自定义图标加载失败时回退为内置 SVG 图标 (IIFE 内函数无法在内联 onerror 中调用)
      const iconImg = card.querySelector('img.project-icon-img');
      if (iconImg) {
        iconImg.addEventListener('error', () => {
          const wrapper = card.querySelector('.project-icon-wrapper');
          if (wrapper) wrapper.innerHTML = getProjectIconSvg(project);
        }, { once: true });
      }

      card.addEventListener('click', () => {
        selectProject(originalIdx, 0);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectProject(originalIdx, 0);
        }
      });

      els.topProjectListContainer.appendChild(card);
    });

    // 管理员模式下：作品列表末尾添加“+ 添加新作品”卡片
    if (state.isAdmin) {
      const addCard = document.createElement('button');
      addCard.className = 'top-project-card top-project-add-card admin-only';
      addCard.title = '添加新作品';
      addCard.setAttribute('aria-label', '添加新作品');
      addCard.tabIndex = 0;

      addCard.innerHTML = `
        <div class="project-icon-wrapper top-add-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="project-icon-svg">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
        <span class="top-project-title-text">+ 添加作品</span>
      `;

      addCard.addEventListener('click', () => {
        addNewProjectToPortfolio();
      });

      addCard.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          addNewProjectToPortfolio();
        }
      });

      els.topProjectListContainer.appendChild(addCard);
    }

    const activeEl = els.topProjectListContainer.querySelector('.top-project-card.active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  // -------------------------------------------------------------
  // 管理员模式：添加新作品并选中
  // -------------------------------------------------------------
  function addNewProjectToPortfolio() {
    const nextIdx = state.projects.length + 1;
    const newProj = {
      id: `proj-${Date.now()}`,
      title: `《新建作品 ${nextIdx}》`,
      subtitle: '请点击右侧「编辑」设置作品副标题',
      category: '独立游戏',
      engine: 'Godot 4.x',
      year: '2025',
      status: '开发中',
      role: '游戏系统策划 / 关卡设计',
      thumbnail: '',
      icon: '',
      controls: '',
      overview: '暂无项目介绍。点击卡片右侧「编辑」按钮可详细介绍作品的设计背景、核心机制与体验目标。',
      videos: [
        {
          id: `proj-${Date.now()}-v1`,
          title: '01. 核心机制演示',
          desc: '暂无片段解析说明。点击下方「编辑」可设置视频文件与机制说明。',
          src: '',
          duration: '00:00'
        }
      ],
      links: {}
    };

    state.projects.push(newProj);
    saveCustomProjects();
    renderTopProjectStrip();
    selectProject(state.projects.length - 1, 0);
    showToast(`已添加《${newProj.title}》，点击「编辑」可完善信息`);
  }

  // -------------------------------------------------------------
  // 工具函数: 片段顺序调整
  // -------------------------------------------------------------
  function reorderClips(project, fromIdx, toIdx, insertAfter) {
    if (fromIdx === toIdx && !insertAfter) return;
    const videos = project.videos;
    const [movedClip] = videos.splice(fromIdx, 1);
    let newIdx = toIdx;
    if (fromIdx < toIdx) {
      newIdx = insertAfter ? toIdx : toIdx - 1;
    } else {
      newIdx = insertAfter ? toIdx + 1 : toIdx;
    }
    if (newIdx < 0) newIdx = 0;
    if (newIdx > videos.length) newIdx = videos.length;
    videos.splice(newIdx, 0, movedClip);
  }

  function cleanupDragOverStyles() {
    document.querySelectorAll('.subvideo-item-card').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom', 'dragging');
    });
  }

  // -------------------------------------------------------------
  // 下面右侧：选择该作品的不同视频片段 (Subvideo Sidebar)
  // -------------------------------------------------------------
  function renderSubvideoList() {
    const project = state.projects[state.currentProjectIndex];
    if (!project) return;

    const videos = project.videos || [];
    els.subvideoListContainer.innerHTML = '';

    let draggedClipIndex = null;

    videos.forEach((vid, vIdx) => {
      const isSelected = vIdx === state.currentVideoIndex;

      const item = document.createElement('div');
      item.className = `subvideo-item-card ${isSelected ? 'active' : ''}`;
      item.dataset.vidx = vIdx;
      item.setAttribute('role', 'tab');
      item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      item.tabIndex = 0;

      // 管理员模式下手柄：三条杠拖拽排序 (显式设置 draggable="true")
      const dragHandleHtml = state.isAdmin ? `
        <span class="clip-drag-handle admin-only" draggable="true" title="按住三条杠拖拽调整片段顺序" aria-label="按住拖拽排序">
          <span class="drag-bar"></span>
          <span class="drag-bar"></span>
          <span class="drag-bar"></span>
        </span>
      ` : '';

      item.innerHTML = `
        ${dragHandleHtml}
        <div class="clip-row-title-wrap">
          <span class="wifi-row-title">${escapeHtml(vid.title)}</span>
        </div>
      `;

      item.addEventListener('click', (e) => {
        // 如果点击的是拖拽手柄，不触发播放切换
        if (e.target.closest('.clip-drag-handle')) {
          return;
        }
        selectSubvideo(vIdx);
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectSubvideo(vIdx);
        }
      });

      // 管理员模式下手柄拖拽事件绑定
      if (state.isAdmin) {
        const handle = item.querySelector('.clip-drag-handle');
        if (handle) {
          // 桌面鼠标拖拽事件 (直接以手柄作为 draggable 发起者)
          handle.addEventListener('dragstart', (e) => {
            draggedClipIndex = vIdx;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(vIdx));
            if (e.dataTransfer.setDragImage) {
              e.dataTransfer.setDragImage(item, 20, 26);
            }
          });

          handle.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            cleanupDragOverStyles();
            draggedClipIndex = null;
          });

          // 触屏滑动排序支持 (兼容触控板与移动端)
          handle.addEventListener('touchstart', (e) => {
            draggedClipIndex = vIdx;
            item.classList.add('dragging');
          }, { passive: true });

          handle.addEventListener('touchmove', (e) => {
            if (draggedClipIndex === null) return;
            const touchY = e.touches[0].clientY;
            const targetCard = document.elementFromPoint(e.touches[0].clientX, touchY)?.closest('.subvideo-item-card');
            cleanupDragOverStyles();
            if (targetCard && targetCard !== item) {
              const rect = targetCard.getBoundingClientRect();
              const isTop = (touchY - rect.top) < (rect.height / 2);
              targetCard.classList.toggle('drag-over-top', isTop);
              targetCard.classList.toggle('drag-over-bottom', !isTop);
            }
          }, { passive: true });

          handle.addEventListener('touchend', (e) => {
            if (draggedClipIndex === null) return;
            const touchY = e.changedTouches[0].clientY;
            const targetCard = document.elementFromPoint(e.changedTouches[0].clientX, touchY)?.closest('.subvideo-item-card');
            if (targetCard && targetCard !== item) {
              const toIdx = parseInt(targetCard.dataset.vidx, 10);
              const rect = targetCard.getBoundingClientRect();
              const insertAfter = (touchY - rect.top) >= (rect.height / 2);

              const currentClip = project.videos[state.currentVideoIndex];
              reorderClips(project, draggedClipIndex, toIdx, insertAfter);
              const newSelectedIdx = project.videos.indexOf(currentClip);
              if (newSelectedIdx !== -1) {
                state.currentVideoIndex = newSelectedIdx;
              }
              saveCustomProjects();
              renderSubvideoList();
              showToast('已更新片段顺序');
            }
            cleanupDragOverStyles();
            draggedClipIndex = null;
          });

          // 放置目标事件 (绑定在整个卡片上，方便接收放下动作)
          item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const rect = item.getBoundingClientRect();
            const isTop = (e.clientY - rect.top) < (rect.height / 2);
            item.classList.toggle('drag-over-top', isTop);
            item.classList.toggle('drag-over-bottom', !isTop);
          });

          item.addEventListener('dragleave', (e) => {
            if (!item.contains(e.relatedTarget)) {
              item.classList.remove('drag-over-top', 'drag-over-bottom');
            }
          });

          item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over-top', 'drag-over-bottom');
            const fromIdx = draggedClipIndex;
            const toIdx = vIdx;
            if (fromIdx === null || fromIdx === undefined || fromIdx === toIdx) return;

            const rect = item.getBoundingClientRect();
            const insertAfter = (e.clientY - rect.top) >= (rect.height / 2);

            const currentClip = project.videos[state.currentVideoIndex];

            reorderClips(project, fromIdx, toIdx, insertAfter);

            // 保持当前查看片段
            const newSelectedIdx = project.videos.indexOf(currentClip);
            if (newSelectedIdx !== -1) {
              state.currentVideoIndex = newSelectedIdx;
            }

            saveCustomProjects();
            renderSubvideoList();
            showToast('已更新片段顺序');
          });
        }
      }

      els.subvideoListContainer.appendChild(item);
    });

    // 片段选择最下方常驻“+ 添加片段”项 (仅在管理员模式下展示)
    if (state.isAdmin) {
      const addItem = document.createElement('div');
      addItem.className = 'subvideo-add-item admin-only';
      addItem.setAttribute('role', 'button');
      addItem.tabIndex = 0;
      addItem.innerHTML = `<span class="add-icon">+</span><span>添加片段</span>`;

      addItem.addEventListener('click', () => {
        addNewClipToCurrentProject();
      });

      addItem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          addNewClipToCurrentProject();
        }
      });

      els.subvideoListContainer.appendChild(addItem);
    }

    const activeItem = els.subvideoListContainer.querySelector('.subvideo-item-card.active');
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // -------------------------------------------------------------
  // 添加空白新片段
  // -------------------------------------------------------------
  function addNewClipToCurrentProject() {
    const project = state.projects[state.currentProjectIndex];
    if (!project) return;
    if (!project.videos) project.videos = [];

    const nextNum = project.videos.length + 1;
    const displayNum = String(nextNum).padStart(2, '0');
    const newClip = {
      id: `${project.id}-v${Date.now()}`,
      title: `${displayNum}. 新视频片段`,
      desc: '暂无片段简介。点击右侧「编辑」按钮可设置视频文件、片段标题与机制说明。',
      src: '',
      duration: '00:00'
    };

    project.videos.push(newClip);
    saveCustomProjects();
    renderSubvideoList();
    selectSubvideo(project.videos.length - 1);
    showToast('已添加新片段，点击右侧「编辑」可上传视频与撰写简介');
  }

  // -------------------------------------------------------------
  // 作品与视频片段切换
  // -------------------------------------------------------------
  function selectProject(projectIndex, videoIndex = 0, isInitial = false) {
    if (!state.projects[projectIndex]) return;

    const project = state.projects[projectIndex];
    // 片段序号越界 (如从其它作品带来的序号) 时回到第一个片段
    if (!project.videos || !project.videos[videoIndex]) videoIndex = 0;
    state.currentProjectIndex = projectIndex;
    state.currentVideoIndex = videoIndex;

    // 更新 URL Hash
    if (history.replaceState) {
      history.replaceState(null, '', `#${project.id}`);
    }

    // 更新上方横排激活状态
    document.querySelectorAll('.top-project-card').forEach(card => {
      const cIdx = parseInt(card.dataset.index, 10);
      const isActive = cIdx === projectIndex;
      card.classList.toggle('active', isActive);
      card.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // 渲染右侧视频片段
    renderSubvideoList();

    // 播放所选片段
    playCurrentSubvideo(isInitial);

    // 渲染下方关键说明
    renderProjectDetails(project);

    // 更新作品专属背景主题 (如 OVERSPACE 星空主题)
    updateProjectTheme(project.id);

    if (!isInitial) {
      showToast(`已切换至: ${project.title}`);
    }
  }

  function updateProjectTheme(projectId) {
    ['overspace', 'hostage-rescue', 'pixel-plane'].forEach(id => {
      document.body.classList.toggle(`theme-${id}`, projectId === id);
    });
  }

  function selectSubvideo(videoIndex) {
    const project = state.projects[state.currentProjectIndex];
    if (!project || !project.videos || !project.videos[videoIndex]) return;

    state.currentVideoIndex = videoIndex;

    document.querySelectorAll('.subvideo-item-card').forEach(item => {
      const vIdx = parseInt(item.dataset.vidx, 10);
      const isActive = vIdx === videoIndex;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if (isActive) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });

    playCurrentSubvideo(false);
  }

  function playCurrentSubvideo(isInitial) {
    const project = state.projects[state.currentProjectIndex];
    if (!project || !project.videos) return;

    const clip = project.videos[state.currentVideoIndex] || project.videos[0];
    const video = els.showcaseVideo;

    // 实时更新视频下方当前片段的介绍信息
    renderClipDetails(clip);

    // 默认隐藏图片，仅图片片段时再显示
    if (els.showcaseImage) els.showcaseImage.style.display = 'none';

    // 检查是否为 Bilibili 嵌入流 (支持 clip.iframeSrc 或 clip.bvid 或 clip.src 中含有 BV 号)
    const bvid = getBvid(clip);
    if (clip.iframeSrc || bvid) {
      if (video) {
        video.pause();
        video.style.display = 'none';
      }
      if (els.customControls) els.customControls.style.display = 'none';
      if (els.videoSpinner) els.videoSpinner.classList.remove('active');
      if (els.unmuteBanner) els.unmuteBanner.classList.add('hidden');
      if (els.videoEmptyState) els.videoEmptyState.style.display = 'none';

      if (els.showcaseIframe) {
        els.showcaseIframe.style.display = 'block';
        let targetSrc = '';
        if (clip.iframeSrc) {
          targetSrc = clip.iframeSrc.startsWith('//') ? ('https:' + clip.iframeSrc) : clip.iframeSrc;
          if (!targetSrc.includes('autoplay=')) targetSrc += '&autoplay=1';
          if (!targetSrc.includes('danmaku=')) targetSrc += '&danmaku=0';
          if (!targetSrc.includes('high_quality=')) targetSrc += '&high_quality=1';
        } else {
          targetSrc = `https://player.bilibili.com/player.html?isOutside=true&bvid=${bvid}&page=1&autoplay=1&danmaku=0&high_quality=1`;
        }
        if (els.showcaseIframe.src !== targetSrc) {
          els.showcaseIframe.src = targetSrc;
        }
      }
      return;
    }

    // 图片片段：隐藏 video / iframe / 播放控制条，直接展示图片
    if (isImageSrc(clip.src) && els.showcaseImage) {
      if (els.showcaseIframe) {
        els.showcaseIframe.style.display = 'none';
        els.showcaseIframe.src = 'about:blank';
      }
      video.pause();
      video.style.display = 'none';
      if (els.customControls) els.customControls.style.display = 'none';
      els.videoSpinner.classList.remove('active');
      if (els.unmuteBanner) els.unmuteBanner.classList.add('hidden');
      if (els.videoEmptyState) els.videoEmptyState.style.display = 'none';
      els.showcaseImage.alt = clip.title || '';
      els.showcaseImage.src = clip.src;
      els.showcaseImage.style.display = 'block';
      updatePlayPauseUI(false);
      return;
    }

    // 切换回原生 HTML5 Video 播放模式
    if (els.showcaseIframe) {
      els.showcaseIframe.style.display = 'none';
      els.showcaseIframe.src = 'about:blank';
    }
    if (video) {
      video.style.display = 'block';
    }
    if (els.customControls) {
      els.customControls.style.display = 'flex';
    }

    // 检查片段是否有视频文件/URL，若为空则显示空白引导层
    // (blob: 临时地址随页面销毁而失效，持久化后必然打不开，按空地址处理)
    const isDeadBlob = !!clip.src && clip.src.startsWith('blob:');
    if (!clip.src || isDeadBlob) {
      const emptyText = els.videoEmptyState && els.videoEmptyState.querySelector('.empty-text');
      if (emptyText) {
        emptyText.textContent = (isDeadBlob && state.isAdmin)
          ? '视频链接已失效 (临时 blob 地址)，请重新上传'
          : '当前片段尚未上传视频或图片';
      }
      video.pause();
      video.removeAttribute('src');
      video.load();
      els.videoSpinner.classList.remove('active');
      if (els.unmuteBanner) els.unmuteBanner.classList.add('hidden');
      if (els.videoEmptyState) els.videoEmptyState.style.display = 'flex';
      updatePlayPauseUI(false);
      return;
    }

    if (els.videoEmptyState) {
      els.videoEmptyState.style.display = 'none';
    }

    els.videoSpinner.classList.add('active');

    video.muted = state.userWantsAudio ? false : true;
    state.isMuted = video.muted;
    updateAudioUI();

    video.poster = project.thumbnail || '';
    video.src = clip.src;
    video.currentTime = 0;
    video.playbackRate = 1.0;
    video.loop = true;

    video.load();
    const playPromise = video.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          els.videoSpinner.classList.remove('active');
          updatePlayPauseUI(true);

          if (video.muted) {
            els.unmuteBanner.classList.remove('hidden');
          } else {
            els.unmuteBanner.classList.add('hidden');
          }

          // 当前主视频起播成功，后台预载下一个片段
          preloadRemainingVideos(project);
        })
        .catch(error => {
          console.warn('自动播放策略受限:', error.name, error.message);
          els.videoSpinner.classList.remove('active');

          if (error.name === 'NotAllowedError') {
            video.muted = true;
            state.isMuted = true;
            updateAudioUI();
            video.play()
              .then(() => {
                updatePlayPauseUI(true);
                els.unmuteBanner.classList.remove('hidden');
                preloadRemainingVideos(project);
              })
              .catch(() => {
                updatePlayPauseUI(false);
              });
          } else {
            updatePlayPauseUI(false);
          }
        });
    }
  }

  // -------------------------------------------------------------
  // 智能预加载机制: 当前视频起播后，仅预载「下一个」原生视频片段 (单个隐藏 video，节省流量)
  // -------------------------------------------------------------
  const preloadedVideoUrls = new Set();
  let preloadGhostVideo = null;
  let preloadGhostUrl = null;
  let preloadGhostReady = false;

  // 释放隐藏 video；若尚未加载完成，则允许该地址以后再次被预载
  function releasePreloadGhost() {
    if (!preloadGhostVideo) return;
    if (!preloadGhostReady && preloadGhostUrl) preloadedVideoUrls.delete(preloadGhostUrl);
    preloadGhostVideo.pause();
    preloadGhostVideo.removeAttribute('src');
    preloadGhostVideo.load();
    preloadGhostVideo = null;
    preloadGhostUrl = null;
    preloadGhostReady = false;
  }

  function preloadRemainingVideos(project) {
    if (!project || !project.videos || project.videos.length < 2) return;
    // 用户开启了流量节省模式时不预加载
    if (navigator.connection && navigator.connection.saveData) return;

    const nextClip = project.videos[(state.currentVideoIndex + 1) % project.videos.length];
    if (!nextClip || !nextClip.src || getBvid(nextClip) || nextClip.iframeSrc) return;

    const url = nextClip.src;
    if (url.startsWith('blob:') || url.startsWith('data:') || isImageSrc(url) || preloadedVideoUrls.has(url)) return;
    preloadedVideoUrls.add(url);

    // 同一时间最多保留一个隐藏 video，先释放上一个
    releasePreloadGhost();

    console.log(`[智能预加载] 当前视频已就绪，后台预载《${project.title}》下一个片段: ${url}`);

    const ghost = document.createElement('video');
    preloadGhostVideo = ghost;
    preloadGhostUrl = url;
    preloadGhostReady = false;
    ghost.addEventListener('canplaythrough', () => {
      if (preloadGhostVideo === ghost) preloadGhostReady = true;
    }, { once: true });
    ghost.preload = 'auto';
    ghost.muted = true;
    ghost.src = url;
    ghost.load();
  }

  // -------------------------------------------------------------
  // 下方说明板块渲染 (极简风格，聚焦核心关键信息)
  // -------------------------------------------------------------
  function renderProjectDetails(project) {
    // 0. 最左侧正方形海报更新
    if (els.projectPosterImg) {
      if (project.thumbnail) {
        els.projectPosterImg.src = project.thumbnail;
        els.projectPosterImg.style.display = 'block';
        if (els.projectPosterPlaceholder) els.projectPosterPlaceholder.style.display = 'none';
      } else {
        els.projectPosterImg.removeAttribute('src');
        els.projectPosterImg.style.display = 'none';
        if (els.projectPosterPlaceholder) els.projectPosterPlaceholder.style.display = 'flex';
      }
    }

    // 1. 标题与副标题
    if (els.detailTitle) {
      els.detailTitle.textContent = project.title;
    }
    if (els.detailSubtitle) {
      els.detailSubtitle.textContent = project.subtitle || '';
    }

    // 2. 项目简述 (纯文本清晰展示，已按要求去除底部操作按钮)
    if (els.detailOverviewText) {
      els.detailOverviewText.textContent = project.overview || '暂无项目说明';
    }
  }

  // -------------------------------------------------------------
  // 视频下方当前片段介绍渲染
  // -------------------------------------------------------------
  function renderClipDetails(clip) {
    if (!clip) return;
    if (els.clipTitle) {
      els.clipTitle.textContent = clip.title || '片段介绍';
    }
    if (els.clipDesc) {
      els.clipDesc.textContent = clip.desc || '该片段暂无详细说明。';
    }
  }

  // -------------------------------------------------------------
  // 视频控制事件监听
  // -------------------------------------------------------------
  function setupEventListeners() {
    const video = els.showcaseVideo;

    // 图片加载失败时回到空白占位层，避免显示一片黑
    if (els.showcaseImage) {
      els.showcaseImage.addEventListener('error', () => {
        if (els.showcaseImage.style.display === 'none') return;
        els.showcaseImage.style.display = 'none';
        const emptyText = els.videoEmptyState && els.videoEmptyState.querySelector('.empty-text');
        if (emptyText) emptyText.textContent = '图片加载失败，请检查文件路径';
        if (els.videoEmptyState) els.videoEmptyState.style.display = 'flex';
      });
    }

    function togglePlayPause() {
      if (video.paused || video.ended) {
        video.play();
        showPlayIndicator('▶');
      } else {
        video.pause();
        showPlayIndicator('⏸');
      }
    }

    video.addEventListener('click', togglePlayPause);
    els.playPauseBtn.addEventListener('click', togglePlayPause);

    video.addEventListener('play', () => updatePlayPauseUI(true));
    video.addEventListener('pause', () => updatePlayPauseUI(false));

    if (els.nextClipBtn) {
      els.nextClipBtn.addEventListener('click', () => {
        const curProject = state.projects[state.currentProjectIndex];
        if (curProject && curProject.videos && curProject.videos.length > 0) {
          const nextVIdx = (state.currentVideoIndex + 1) % curProject.videos.length;
          selectSubvideo(nextVIdx);
        }
      });
    }

    video.addEventListener('waiting', () => els.videoSpinner.classList.add('active'));
    video.addEventListener('playing', () => {
      els.videoSpinner.classList.remove('active');
      const curProject = state.projects[state.currentProjectIndex];
      if (curProject) preloadRemainingVideos(curProject);
    });
    video.addEventListener('canplay', () => els.videoSpinner.classList.remove('active'));
    video.addEventListener('canplaythrough', () => {
      els.videoSpinner.classList.remove('active');
      const curProject = state.projects[state.currentProjectIndex];
      if (curProject) preloadRemainingVideos(curProject);
    });

    video.addEventListener('timeupdate', () => {
      if (!state.isDraggingProgress) {
        const percent = (video.currentTime / video.duration) * 100 || 0;
        els.playedBar.style.width = `${percent}%`;
        els.progressHandle.style.left = `${percent}%`;
      }
    });

    video.addEventListener('progress', () => {
      if (video.buffered.length > 0 && video.duration) {
        const bufferEnd = video.buffered.end(video.buffered.length - 1);
        const percent = (bufferEnd / video.duration) * 100;
        els.bufferBar.style.width = `${percent}%`;
      }
    });

    // 进度条拖拽
    function seek(e) {
      const rect = els.progressContainer.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      els.playedBar.style.width = `${pos * 100}%`;
      els.progressHandle.style.left = `${pos * 100}%`;
      if (video.duration) {
        video.currentTime = pos * video.duration;
      }
    }

    els.progressContainer.addEventListener('mousedown', (e) => {
      state.isDraggingProgress = true;
      seek(e);
      const onMouseMove = (ev) => seek(ev);
      const onMouseUp = () => {
        state.isDraggingProgress = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    els.progressContainer.addEventListener('mousemove', (e) => {
      const rect = els.progressContainer.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const previewTime = pos * (video.duration || 0);
      els.progressTooltip.textContent = formatTime(previewTime);
      els.progressTooltip.style.left = `${pos * 100}%`;
    });

    // 声音控制 (播放器控制条内)
    function toggleMute() {
      if (video.muted) {
        video.muted = false;
        state.isMuted = false;
        state.userWantsAudio = true;
        video.volume = state.volume > 0 ? state.volume : 0.8;
        els.unmuteBanner.classList.add('hidden');
        showToast('已开启声音');
      } else {
        video.muted = true;
        state.isMuted = true;
        showToast('已静音');
      }
      updateAudioUI();
    }

    els.muteToggleBtn.addEventListener('click', toggleMute);
    els.unmuteActionBtn.addEventListener('click', () => {
      video.muted = false;
      state.isMuted = false;
      state.userWantsAudio = true;
      video.volume = state.volume > 0 ? state.volume : 0.8;
      els.unmuteBanner.classList.add('hidden');
      updateAudioUI();
      showToast('声音已开启');
    });

    els.volumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.volume = val;
      video.volume = val;
      if (val === 0) {
        video.muted = true;
        state.isMuted = true;
      } else {
        video.muted = false;
        state.isMuted = false;
        state.userWantsAudio = true;
        els.unmuteBanner.classList.add('hidden');
      }
      updateAudioUI();
    });

    // 全屏模式
    function toggleFullscreen() {
      const box = els.videoPlayerBox;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (box.requestFullscreen) box.requestFullscreen();
        else if (box.webkitRequestFullscreen) box.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
    }

    els.fullscreenBtn.addEventListener('click', toggleFullscreen);
    video.addEventListener('dblclick', toggleFullscreen);

    document.addEventListener('fullscreenchange', () => {
      const isFull = !!document.fullscreenElement;
      els.fullscreenLabel.textContent = isFull ? '退出' : '全屏';
    });

    // 空白视频占位区本地视频选择 (上传到 assets/videos/ 后写入当前片段)
    if (els.emptyVideoPicker) {
      els.emptyVideoPicker.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        const project = state.projects[state.currentProjectIndex];
        const clip = project && project.videos && project.videos[state.currentVideoIndex];
        if (!file || !clip) return;

        showToast(`正在上传视频: ${file.name}...`);
        try {
          clip.src = await uploadMediaFile(file);
        } catch (err) {
          showUploadError(err);
          return;
        }
        saveCustomProjects();
        if (project.videos[state.currentVideoIndex] === clip) {
          playCurrentSubvideo(false);
        }
        showToast(`已上传并保存: ${clip.src}`);
      });
    }

    // 快捷更换当前项目海报
    if (els.quickPosterPicker) {
      els.quickPosterPicker.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          showToast('正在处理海报图片...');
          const imgUrl = await fileToDataUrl(file);
          const project = state.projects[state.currentProjectIndex];
          if (project) {
            project.thumbnail = imgUrl;
            if (!project.icon || project.icon.startsWith('assets/thumbnails/')) {
              project.icon = imgUrl;
            }
            saveCustomProjects();
            renderProjectDetails(project);
            renderTopProjectStrip();
            showToast(`已更换《${project.title}》海报: ${file.name}`);
          }
        }
      });
    }

    // 拖拽视频文件
    const playerBox = els.videoPlayerBox;
    ['dragenter', 'dragover'].forEach(eventName => {
      playerBox.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        els.dragDropOverlay.classList.add('active');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      playerBox.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        els.dragDropOverlay.classList.remove('active');
      });
    });

    playerBox.addEventListener('drop', (e) => {
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('video/')) {
          const localUrl = URL.createObjectURL(file);
          video.src = localUrl;
          video.load();
          video.play();
          showToast(`已载入本地视频: ${file.name}`);
        } else {
          showToast('请拖入 MP4 或 WebM 格式视频');
        }
      }
    });

    // 右下角管理员状态指示标签点击 (仅本地生效)
    if (els.adminStatusIndicator) {
      els.adminStatusIndicator.addEventListener('click', () => {
        if (isLocalHost()) {
          showToast('当前处于 localhost 本地环境 (始终拥有编辑权限，编辑后直接写入本地文件)');
        }
      });
    }

    // 模态框控制
    setupModals();
  }

  // -------------------------------------------------------------
  // 切换管理员身份验证 (仅本地有效)
  // -------------------------------------------------------------
  function toggleAdminAuth() {
    if (!isLocalHost()) {
      return;
    }
    showToast('当前处于 localhost 本地环境 (已具备全部编辑权限)');
  }

  // -------------------------------------------------------------
  // 键盘快捷键导航
  // -------------------------------------------------------------
  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // 快捷键: Ctrl + Shift + E (仅在本地生效)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        if (isLocalHost()) {
          toggleAdminAuth();
        }
        return;
      }

      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      const video = els.showcaseVideo;
      const curProject = state.projects[state.currentProjectIndex];

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A': {
          e.preventDefault();
          const prevIdx = (state.currentProjectIndex - 1 + state.projects.length) % state.projects.length;
          selectProject(prevIdx, 0);
          break;
        }
        case 'ArrowRight':
        case 'd':
        case 'D': {
          e.preventDefault();
          const nextIdx = (state.currentProjectIndex + 1) % state.projects.length;
          selectProject(nextIdx, 0);
          break;
        }
        case 'ArrowUp':
        case 'w':
        case 'W': {
          e.preventDefault();
          if (curProject && curProject.videos) {
            const prevVIdx = (state.currentVideoIndex - 1 + curProject.videos.length) % curProject.videos.length;
            selectSubvideo(prevVIdx);
          }
          break;
        }
        case 'ArrowDown':
        case 's':
        case 'S': {
          e.preventDefault();
          if (curProject && curProject.videos) {
            const nextVIdx = (state.currentVideoIndex + 1) % curProject.videos.length;
            selectSubvideo(nextVIdx);
          }
          break;
        }
        case ' ': {
          e.preventDefault();
          if (video && video.style.display !== 'none') {
            if (video.paused) video.play();
            else video.pause();
          }
          break;
        }
        case 'm':
        case 'M': {
          e.preventDefault();
          if (video && video.style.display !== 'none') {
            video.muted = !video.muted;
            state.isMuted = video.muted;
            if (!video.muted) state.userWantsAudio = true;
            updateAudioUI();
            showToast(video.muted ? '已静音' : '已开启声音');
          }
          break;
        }
        case 'f':
        case 'F': {
          e.preventDefault();
          if (els.showcaseIframe && els.showcaseIframe.style.display !== 'none') {
            if (els.showcaseIframe.requestFullscreen) {
              els.showcaseIframe.requestFullscreen();
            }
          } else if (els.fullscreenBtn) {
            els.fullscreenBtn.click();
          }
          break;
        }
        case '?': {
          e.preventDefault();
          els.shortcutsModal.classList.add('active');
          break;
        }
        case 'Escape': {
          if (els.clipEditModal) els.clipEditModal.classList.remove('active');
          els.projectModal.classList.remove('active');
          els.shortcutsModal.classList.remove('active');
          break;
        }
      }
    });
  }

  // -------------------------------------------------------------
  // 模态框与作品管理
  // -------------------------------------------------------------
  function setupModals() {
    let editingProjectIndex = 0;

    function renderModalTabs() {
      if (!els.modalProjectTabs) return;
      els.modalProjectTabs.innerHTML = '';

      state.projects.forEach((proj, idx) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = `modal-tab-btn ${idx === editingProjectIndex ? 'active' : ''}`;
        tab.textContent = proj.title;
        tab.addEventListener('click', () => {
          editingProjectIndex = idx;
          renderModalTabs();
          loadProjectIntoForm(state.projects[idx]);
        });
        els.modalProjectTabs.appendChild(tab);
      });

      const addTab = document.createElement('button');
      addTab.type = 'button';
      addTab.className = `modal-tab-btn tab-add ${editingProjectIndex === -1 ? 'active' : ''}`;
      addTab.textContent = '+ 新增作品';
      addTab.addEventListener('click', () => {
        editingProjectIndex = -1;
        renderModalTabs();
        loadProjectIntoForm({ title: '', subtitle: '', overview: '' });
      });
      els.modalProjectTabs.appendChild(addTab);
    }

    function loadProjectIntoForm(proj) {
      const fTitle = document.getElementById('formTitle');
      const fSubtitle = document.getElementById('formSubtitle');
      const fOverview = document.getElementById('formOverview');
      if (fTitle) fTitle.value = proj.title || '';
      if (fSubtitle) fSubtitle.value = proj.subtitle || '';
      if (fOverview) fOverview.value = proj.overview || '';
    }

    // 打开项目信息编辑模态框
    function openProjectModal(index) {
      editingProjectIndex = (typeof index === 'number' && index >= 0) ? index : state.currentProjectIndex;
      renderModalTabs();
      loadProjectIntoForm(state.projects[editingProjectIndex] || state.projects[0]);
      els.projectModal.classList.add('active');
    }

    if (els.editProjectBtn) {
      els.editProjectBtn.addEventListener('click', () => {
        openProjectModal(state.currentProjectIndex);
      });
    }

    els.closeProjectModalBtn.addEventListener('click', () => {
      els.projectModal.classList.remove('active');
    });
    els.cancelFormBtn.addEventListener('click', () => {
      els.projectModal.classList.remove('active');
    });

    // 模态框点击背景关闭
    els.projectModal.addEventListener('click', (e) => {
      if (e.target === els.projectModal) {
        els.projectModal.classList.remove('active');
      }
    });

    // 快捷键指南模态框：关闭按钮、确认按钮、点击背景关闭
    if (els.closeShortcutsModalBtn) {
      els.closeShortcutsModalBtn.addEventListener('click', () => {
        els.shortcutsModal.classList.remove('active');
      });
    }
    if (els.confirmShortcutsBtn) {
      els.confirmShortcutsBtn.addEventListener('click', () => {
        els.shortcutsModal.classList.remove('active');
      });
    }
    if (els.shortcutsModal) {
      els.shortcutsModal.addEventListener('click', (e) => {
        if (e.target === els.shortcutsModal) {
          els.shortcutsModal.classList.remove('active');
        }
      });
    }

    // =========================================================
    // 模态框 2: 当前视频片段编辑与管理
    // =========================================================
    function openClipModal() {
      const project = state.projects[state.currentProjectIndex];
      if (!project || !project.videos || !project.videos[state.currentVideoIndex]) return;
      const clip = project.videos[state.currentVideoIndex];

      if (els.clipModalTitle) {
        els.clipModalTitle.textContent = `编辑片段: ${clip.title || ''}`;
      }
      if (els.clipFormTitle) els.clipFormTitle.value = clip.title || '';
      if (els.clipFormDuration) els.clipFormDuration.value = clip.duration || '00:00';
      if (els.clipFormSrc) els.clipFormSrc.value = clip.bvid || clip.src || '';
      if (els.clipFormDesc) els.clipFormDesc.value = clip.desc || '';

      els.clipEditModal.classList.add('active');
    }

    if (els.editClipBtn) {
      els.editClipBtn.addEventListener('click', openClipModal);
    }

    if (els.closeClipModalBtn) {
      els.closeClipModalBtn.addEventListener('click', () => {
        els.clipEditModal.classList.remove('active');
      });
    }

    if (els.cancelClipFormBtn) {
      els.cancelClipFormBtn.addEventListener('click', () => {
        els.clipEditModal.classList.remove('active');
      });
    }

    if (els.clipEditModal) {
      els.clipEditModal.addEventListener('click', (e) => {
        if (e.target === els.clipEditModal) {
          els.clipEditModal.classList.remove('active');
        }
      });
    }

    // 片段模态框内本地视频文件选择 (上传完成前禁用保存，避免存入旧路径)
    if (els.clipModalFilePicker) {
      els.clipModalFilePicker.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;

        if (els.saveClipBtn) els.saveClipBtn.disabled = true;
        showToast(`正在上传视频: ${file.name}...`);
        try {
          const src = await uploadMediaFile(file);
          if (els.clipFormSrc) els.clipFormSrc.value = src;
          showToast(`已上传至 ${src}，点击「保存修改」生效`);
        } catch (err) {
          showUploadError(err);
        } finally {
          if (els.saveClipBtn) els.saveClipBtn.disabled = false;
        }
      });
    }

    // 删除当前视频片段
    if (els.deleteCurrentClipBtn) {
      els.deleteCurrentClipBtn.addEventListener('click', () => {
        const project = state.projects[state.currentProjectIndex];
        if (!project || !project.videos) return;
        if (confirm('确定要删除当前视频片段吗？')) {
          project.videos.splice(state.currentVideoIndex, 1);
          if (project.videos.length === 0) {
            project.videos.push({
              id: `${project.id}-v1`,
              title: '01. 新视频片段',
              desc: '暂无片段简介。点击右侧「编辑」设置视频与解析。',
              src: '',
              duration: '00:00'
            });
          }
          if (state.currentVideoIndex >= project.videos.length) {
            state.currentVideoIndex = project.videos.length - 1;
          }
          saveCustomProjects();
          renderSubvideoList();
          selectSubvideo(state.currentVideoIndex);
          els.clipEditModal.classList.remove('active');
          showToast('已删除当前片段');
        }
      });
    }

    // 保存当前片段修改
    if (els.clipEditForm) {
      els.clipEditForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const project = state.projects[state.currentProjectIndex];
        if (!project || !project.videos || !project.videos[state.currentVideoIndex]) return;
        const clip = project.videos[state.currentVideoIndex];

        clip.title = els.clipFormTitle.value.trim() || '未命名片段';
        clip.duration = els.clipFormDuration.value.trim() || '00:00';
        clip.src = els.clipFormSrc.value.trim();
        clip.desc = els.clipFormDesc.value.trim();

        // iframeSrc 里固定了旧视频的 aid/cid，且播放时优先于 src，
        // 来源换成本地视频或其它 BV 号时必须一并清除
        const detectedBvid = extractBvid(clip.src);
        if (detectedBvid) {
          if (detectedBvid !== clip.bvid) delete clip.iframeSrc;
          clip.bvid = detectedBvid;
        } else {
          delete clip.bvid;
          delete clip.iframeSrc;
        }

        saveCustomProjects();
        renderSubvideoList();
        selectSubvideo(state.currentVideoIndex);
        els.clipEditModal.classList.remove('active');
        showToast(`已保存片段: ${clip.title}`);
      });
    }

    // 保存提交
    els.projectForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const fTitle = document.getElementById('formTitle');
      const fSubtitle = document.getElementById('formSubtitle');
      const fOverview = document.getElementById('formOverview');
      const title = fTitle ? fTitle.value.trim() : '';
      const subtitle = fSubtitle ? fSubtitle.value.trim() : '';
      const overview = fOverview ? fOverview.value.trim() : '';

      if (!title) {
        showToast('作品名称不能为空');
        return;
      }

      if (editingProjectIndex >= 0 && state.projects[editingProjectIndex]) {
        // 编辑已有作品：只更新名称、副标题、介绍，完好保留已有视频片段与海报
        const targetProj = state.projects[editingProjectIndex];
        targetProj.title = title;
        targetProj.subtitle = subtitle;
        targetProj.overview = overview;

        saveCustomProjects();
        renderTopProjectStrip();
        // 仅在编辑当前作品时保留片段序号，否则该序号属于之前查看的作品
        const keepIdx = editingProjectIndex === state.currentProjectIndex ? state.currentVideoIndex : 0;
        selectProject(editingProjectIndex, keepIdx);
        els.projectModal.classList.remove('active');
        showToast(`已更新作品《${title}》`);
      } else {
        // 新建作品
        const newProj = {
          id: `proj-${Date.now()}`,
          title,
          category: '独立游戏',
          subtitle,
          engine: '',
          year: new Date().getFullYear().toString(),
          status: '独立开发',
          role: '游戏系统策划 / 关卡设计',
          thumbnail: 'assets/thumbnails/overspace.jpg',
          icon: 'assets/thumbnails/overspace.jpg',
          controls: '',
          overview,
          videos: [
            {
              id: `clip-${Date.now()}-0`,
              title: '01. 核心演示',
              desc: '暂无片段解析说明。点击右侧「编辑」可设置视频与机制说明。',
              src: '',
              duration: '00:00'
            }
          ],
          links: {}
        };
        state.projects.push(newProj);
        saveCustomProjects();
        renderTopProjectStrip();
        selectProject(state.projects.length - 1, 0);
        els.projectModal.classList.remove('active');
        showToast(`已添加新作品《${title}》`);
      }
    });
  }

  // -------------------------------------------------------------
  // 辅助 UI 状态更新
  // -------------------------------------------------------------
  function updatePlayPauseUI(isPlaying) {
    els.playPauseBtnIcon.textContent = isPlaying ? '暂停' : '播放';
    els.videoPlayerBox.classList.toggle('paused', !isPlaying);
  }

  function updateAudioUI() {
    const isMuted = els.showcaseVideo.muted;
    const vol = isMuted ? 0 : els.showcaseVideo.volume;

    els.volumeSlider.value = vol;
    els.volumeBtnIcon.textContent = isMuted ? '静音' : '声音';
  }

  function showPlayIndicator(iconText) {
    const ind = els.playPauseIndicator;
    ind.querySelector('.indicator-icon').textContent = iconText;
    ind.classList.add('show');
    setTimeout(() => ind.classList.remove('show'), 350);
  }

  function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    els.toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2200);
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
