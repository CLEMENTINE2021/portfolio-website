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
    currentProjectSubvideoLabel: document.getElementById('currentProjectSubvideoLabel'),
    subvideosCountLabel: document.getElementById('subvideosCountLabel'),
    subvideoListContainer: document.getElementById('subvideoListContainer'),
    copyEmailQuickBtn: document.getElementById('copyEmailQuickBtn'),

    // 下面右侧：视频播放器与展示舞台
    videoWrapper: document.getElementById('videoWrapper'),
    videoPlayerBox: document.getElementById('videoPlayerBox'),
    showcaseVideo: document.getElementById('showcaseVideo'),
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
    restartBtn: document.getElementById('restartBtn'),
    currentTime: document.getElementById('currentTime'),
    totalDuration: document.getElementById('totalDuration'),
    muteToggleBtn: document.getElementById('muteToggleBtn'),
    volumeBtnIcon: document.getElementById('volumeBtnIcon'),
    volumeSlider: document.getElementById('volumeSlider'),
    localVideoPicker: document.getElementById('localVideoPicker'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    fullscreenLabel: document.getElementById('fullscreenLabel'),

    // 顶部全局工具
    manageProjectsBtn: document.getElementById('manageProjectsBtn'),
    shortcutsBtn: document.getElementById('shortcutsBtn'),

    // 项目简介说明 (Project Details - 视频上方)
    projectPosterSide: document.getElementById('projectPosterSide'),
    projectPosterImg: document.getElementById('projectPosterImg'),
    projectPosterPlaceholder: document.getElementById('projectPosterPlaceholder'),
    quickPosterPicker: document.getElementById('quickPosterPicker'),
    detailCategoryLabel: document.getElementById('detailCategoryLabel'),
    detailStatusLabel: document.getElementById('detailStatusLabel'),
    detailMetaText: document.getElementById('detailMetaText'),
    detailTitle: document.getElementById('detailTitle'),
    detailSubtitle: document.getElementById('detailSubtitle'),
    editProjectBtn: document.getElementById('editProjectBtn'),
    detailActionsContainer: document.getElementById('detailActionsContainer'),
    detailOverviewText: document.getElementById('detailOverviewText'),

    // 空白视频占位与上传
    videoEmptyState: document.getElementById('videoEmptyState'),
    emptyVideoPicker: document.getElementById('emptyVideoPicker'),

    // 视频片段说明 (Clip Details - 视频下方)
    clipDetailCard: document.getElementById('clipDetailCard'),
    clipMetaIndex: document.getElementById('clipMetaIndex'),
    clipDurationTag: document.getElementById('clipDurationTag'),
    clipTitle: document.getElementById('clipTitle'),
    clipDesc: document.getElementById('clipDesc'),
    editClipBtn: document.getElementById('editClipBtn'),

    // 模态框 1: 管理作品
    projectModal: document.getElementById('projectModal'),
    projectForm: document.getElementById('projectForm'),
    modalProjectTabs: document.getElementById('modalProjectTabs'),
    modalClipCount: document.getElementById('modalClipCount'),
    modalAddClipBtn: document.getElementById('modalAddClipBtn'),
    modalClipsList: document.getElementById('modalClipsList'),
    deleteProjectBtn: document.getElementById('deleteProjectBtn'),
    closeProjectModalBtn: document.getElementById('closeProjectModalBtn'),
    cancelFormBtn: document.getElementById('cancelFormBtn'),
    formVideoFileInput: document.getElementById('formVideoFileInput'),
    formThumbFilePicker: document.getElementById('formThumbFilePicker'),
    formIconFilePicker: document.getElementById('formIconFilePicker'),
    exportDataBtn: document.getElementById('exportDataBtn'),
    resetDataBtn: document.getElementById('resetDataBtn'),

    // 模态框 2: 编辑片段
    clipEditModal: document.getElementById('clipEditModal'),
    clipEditForm: document.getElementById('clipEditForm'),
    clipModalTitle: document.getElementById('clipModalTitle'),
    clipFormTitle: document.getElementById('clipFormTitle'),
    clipFormDuration: document.getElementById('clipFormDuration'),
    clipFormSrc: document.getElementById('clipFormSrc'),
    clipFormDesc: document.getElementById('clipFormDesc'),
    clipModalFilePicker: document.getElementById('clipModalFilePicker'),
    deleteCurrentClipBtn: document.getElementById('deleteCurrentClipBtn'),
    closeClipModalBtn: document.getElementById('closeClipModalBtn'),
    cancelClipFormBtn: document.getElementById('cancelClipFormBtn'),

    // 模态框 3: 快捷键指南
    shortcutsModal: document.getElementById('shortcutsModal'),
    closeShortcutsModalBtn: document.getElementById('closeShortcutsModalBtn'),
    confirmShortcutsBtn: document.getElementById('confirmShortcutsBtn'),

    // 模态框 4: 管理员身份验证
    brandLogo: document.getElementById('brandLogo'),
    adminStatusIndicator: document.getElementById('adminStatusIndicator'),
    adminAuthModal: document.getElementById('adminAuthModal'),
    adminAuthForm: document.getElementById('adminAuthForm'),
    adminPasswordInput: document.getElementById('adminPasswordInput'),
    closeAdminModalBtn: document.getElementById('closeAdminModalBtn'),
    cancelAdminBtn: document.getElementById('cancelAdminBtn'),

    toastContainer: document.getElementById('toastContainer')
  };

  // -------------------------------------------------------------
  // 管理员权限与环境认证
  // -------------------------------------------------------------
  const ADMIN_STORAGE_KEY = 'portfolio_admin_auth';
  const ADMIN_PASSWORD = 'wenxuan2026';

  function checkAdminAuth() {
    const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

    // 检查 URL 参数是否包含管理员暗号 (?edit=wenxuan2026 或 ?admin=wenxuan2026)
    const params = new URLSearchParams(window.location.search);
    const secretKey = params.get('edit') || params.get('admin');

    if (secretKey === ADMIN_PASSWORD) {
      localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
      state.isAdmin = true;

      // 净化 URL，清除地址栏中暴露的暗号密码
      params.delete('edit');
      params.delete('admin');
      const newSearch = params.toString() ? '?' + params.toString() : '';
      if (history.replaceState) {
        history.replaceState(null, '', window.location.pathname + newSearch + window.location.hash);
      }
      setTimeout(() => showToast('已成功开启管理员编辑模式'), 400);
    } else if (params.has('logout') || params.has('exit')) {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      state.isAdmin = isLocal;
      params.delete('logout');
      params.delete('exit');
      const newSearch = params.toString() ? '?' + params.toString() : '';
      if (history.replaceState) {
        history.replaceState(null, '', window.location.pathname + newSearch + window.location.hash);
      }
      setTimeout(() => showToast('已退出管理员编辑模式'), 400);
    } else {
      state.isAdmin = isLocal || localStorage.getItem(ADMIN_STORAGE_KEY) === 'true';
    }

    applyAdminState();
  }

  function applyAdminState() {
    document.body.classList.toggle('is-admin-mode', state.isAdmin);
    if (els.adminStatusIndicator) {
      const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
      els.adminStatusIndicator.innerHTML = isLocal
        ? '<span class="indicator-dot">●</span> 本地模式 (全权限)'
        : '<span class="indicator-dot">●</span> 管理员模式 (点击退出)';
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
    loadProjectsData();
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
  }

  const DATA_VERSION = 'v3_20261028_custom_icons';

  // -------------------------------------------------------------
  // 数据存取与格式规范化
  // -------------------------------------------------------------
  function loadProjectsData() {
    try {
      const storedVersion = localStorage.getItem('portfolio_data_version');
      const stored = localStorage.getItem('portfolio_projects_custom');
      if (stored && storedVersion === DATA_VERSION) {
        state.projects = JSON.parse(stored);
      } else if (window.PORTFOLIO_DATA && window.PORTFOLIO_DATA.projects) {
        state.projects = [...window.PORTFOLIO_DATA.projects];
        localStorage.setItem('portfolio_data_version', DATA_VERSION);
        localStorage.removeItem('portfolio_projects_custom');
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

  function saveCustomProjects() {
    try {
      localStorage.setItem('portfolio_data_version', DATA_VERSION);
      localStorage.setItem('portfolio_projects_custom', JSON.stringify(state.projects));
    } catch (e) {
      console.error('无法保存到 localStorage', e);
    }
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
      return `<img src="${iconStr}" alt="${project.title}" class="project-icon-img" onerror="this.onerror=null;this.parentElement.innerHTML=getProjectIconSvg({id:'${project.id}'});">`;
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
        <span class="top-project-title-text">${project.title}</span>
      `;

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
  // 下面右侧：选择该作品的不同视频片段 (Subvideo Sidebar)
  // -------------------------------------------------------------
  function renderSubvideoList() {
    const project = state.projects[state.currentProjectIndex];
    if (!project) return;

    const videos = project.videos || [];
    if (els.currentProjectSubvideoLabel) {
      els.currentProjectSubvideoLabel.textContent = project.title;
    }
    if (els.subvideosCountLabel) {
      els.subvideosCountLabel.textContent = `${videos.length} 个片段`;
    }
    els.subvideoListContainer.innerHTML = '';

    videos.forEach((vid, vIdx) => {
      const isSelected = vIdx === state.currentVideoIndex;

      const item = document.createElement('div');
      item.className = `subvideo-item-card ${isSelected ? 'active' : ''}`;
      item.dataset.vidx = vIdx;
      item.setAttribute('role', 'tab');
      item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      item.tabIndex = 0;

      const displayIdx = String(vIdx + 1).padStart(2, '0');

      // 仅显示片段标题，去除正文与时长，保持紧凑纯净
      item.innerHTML = `
        <div class="clip-row-title-wrap">
          <span class="wifi-row-title">${vid.title}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        selectSubvideo(vIdx);
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectSubvideo(vIdx);
        }
      });

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

    state.currentProjectIndex = projectIndex;
    state.currentVideoIndex = videoIndex;
    const project = state.projects[projectIndex];

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
    const isOverspace = projectId === 'overspace';
    document.body.classList.toggle('theme-overspace', isOverspace);
    if (window.spaceStarfield) {
      window.spaceStarfield.setActive(isOverspace);
    }
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
    renderClipDetails(clip, state.currentVideoIndex, project.videos.length);

    // 检查片段是否有视频文件/URL，若为空则显示空白引导层
    if (!clip.src) {
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

    // 1. 顶部基础元数据与标题 (Quickshell 通知卡片分栏)
    if (els.detailCategoryLabel) {
      els.detailCategoryLabel.textContent = project.category || '独立游戏';
    }
    if (els.detailStatusLabel) {
      els.detailStatusLabel.textContent = project.status || '在研项目';
    }
    if (els.detailMetaText) {
      els.detailMetaText.textContent = `${project.engine || '游戏开发'} · ${project.year || ''}`;
    }
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
  function renderClipDetails(clip, index, total) {
    if (!clip) return;
    if (els.clipMetaIndex) {
      els.clipMetaIndex.textContent = `片段 ${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    }
    if (els.clipDurationTag) {
      els.clipDurationTag.textContent = clip.duration || '--:--';
    }
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

    els.restartBtn.addEventListener('click', () => {
      video.currentTime = 0;
      video.play();
      showToast('从头播放');
    });

    video.addEventListener('waiting', () => els.videoSpinner.classList.add('active'));
    video.addEventListener('playing', () => els.videoSpinner.classList.remove('active'));
    video.addEventListener('canplay', () => els.videoSpinner.classList.remove('active'));

    video.addEventListener('timeupdate', () => {
      if (!state.isDraggingProgress) {
        const percent = (video.currentTime / video.duration) * 100 || 0;
        els.playedBar.style.width = `${percent}%`;
        els.progressHandle.style.left = `${percent}%`;
        els.currentTime.textContent = formatTime(video.currentTime);
      }
    });

    video.addEventListener('loadedmetadata', () => {
      els.totalDuration.textContent = formatTime(video.duration);
      els.currentTime.textContent = formatTime(0);
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

    // 本地视频测试
    els.localVideoPicker.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const localUrl = URL.createObjectURL(file);
        video.src = localUrl;
        video.load();
        video.play();
        showToast(`正在播放本地文件: ${file.name}`);
      }
    });

    // 空白视频占位区本地视频选择
    if (els.emptyVideoPicker) {
      els.emptyVideoPicker.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const localUrl = URL.createObjectURL(file);
          const project = state.projects[state.currentProjectIndex];
          if (project && project.videos && project.videos[state.currentVideoIndex]) {
            project.videos[state.currentVideoIndex].src = localUrl;
            saveCustomProjects();
          }
          if (els.videoEmptyState) els.videoEmptyState.style.display = 'none';
          video.src = localUrl;
          video.load();
          video.play();
          showToast(`已加载本地视频: ${file.name}`);
        }
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

    // 复制邮箱
    if (els.copyEmailQuickBtn) {
      els.copyEmailQuickBtn.addEventListener('click', () => {
        navigator.clipboard.writeText('wge66689@gmail.com')
          .then(() => showToast('邮箱地址已复制到剪贴板'))
          .catch(() => showToast('复制失败，请手动记录: wge66689@gmail.com'));
      });
    }

    // 隐藏暗门：连续快速点击左上角名字/头像 5 次唤起管理员验证
    let avatarClickCount = 0;
    let avatarClickTimer = null;
    if (els.brandLogo) {
      els.brandLogo.addEventListener('click', (e) => {
        avatarClickCount++;
        clearTimeout(avatarClickTimer);
        avatarClickTimer = setTimeout(() => {
          avatarClickCount = 0;
        }, 2200);

        if (avatarClickCount >= 5) {
          e.preventDefault();
          avatarClickCount = 0;
          toggleAdminAuth();
        }
      });
    }

    // 右下角管理员状态指示标签点击 (云端可随时安全退出)
    if (els.adminStatusIndicator) {
      els.adminStatusIndicator.addEventListener('click', () => {
        const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
        if (isLocal) {
          showToast('当前处于本地开发环境 (始终拥有编辑权限)');
          return;
        }
        if (confirm('确定要退出管理员编辑模式吗？退出后页面将恢复访客纯展示状态。')) {
          localStorage.removeItem(ADMIN_STORAGE_KEY);
          state.isAdmin = false;
          applyAdminState();
          renderSubvideoList();
          showToast('已安全退出管理员模式');
        }
      });
    }

    // 模态框控制
    setupModals();
  }

  // -------------------------------------------------------------
  // 切换管理员身份验证弹窗
  // -------------------------------------------------------------
  function toggleAdminAuth() {
    if (state.isAdmin) {
      const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
      if (isLocal) {
        showToast('当前处于本地环境 (始终拥有全权限)');
        return;
      }
      if (confirm('当前已处于管理员编辑模式，是否退出编辑模式？')) {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        state.isAdmin = false;
        applyAdminState();
        renderSubvideoList();
        showToast('已退出管理员模式');
      }
    } else {
      if (els.adminPasswordInput) els.adminPasswordInput.value = '';
      if (els.adminAuthModal) {
        els.adminAuthModal.classList.add('active');
        setTimeout(() => {
          if (els.adminPasswordInput) els.adminPasswordInput.focus();
        }, 150);
      }
    }
  }

  // -------------------------------------------------------------
  // 键盘快捷键导航
  // -------------------------------------------------------------
  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // 快捷键: Ctrl + Shift + E (或 Cmd + Shift + E) 唤起管理员验证
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        toggleAdminAuth();
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
          if (video.paused) video.play();
          else video.pause();
          break;
        }
        case 'm':
        case 'M': {
          e.preventDefault();
          video.muted = !video.muted;
          state.isMuted = video.muted;
          if (!video.muted) state.userWantsAudio = true;
          updateAudioUI();
          showToast(video.muted ? '已静音' : '已开启声音');
          break;
        }
        case 'f':
        case 'F': {
          e.preventDefault();
          els.fullscreenBtn.click();
          break;
        }
        case '?': {
          e.preventDefault();
          els.shortcutsModal.classList.add('active');
          break;
        }
        case 'Escape': {
          if (els.adminAuthModal) els.adminAuthModal.classList.remove('active');
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
        loadProjectIntoForm({
          title: '',
          category: '独立游戏',
          subtitle: '',
          engine: 'Godot 4.x',
          thumbnail: 'assets/thumbnails/overspace.jpg',
          controls: '',
          overview: '',
          videos: [
            {
              id: 'v-' + Date.now(),
              title: '01. 核心机制演示',
              desc: '实机演示片段',
              src: 'assets/videos/overspace-prediction.mp4',
              duration: '00:30'
            }
          ]
        });
      });
      els.modalProjectTabs.appendChild(addTab);
    }

    function createClipRow(clip = {}, index = 0) {
      const item = document.createElement('div');
      item.className = 'clip-manager-item';

      item.innerHTML = `
        <div class="clip-item-row">
          <input type="text" class="form-input-sm flex-2 clip-input-title" placeholder="片段标题 (如: 01. 机制演示)" value="${clip.title || ''}" required>
          <input type="text" class="form-input-sm flex-1 clip-input-duration" placeholder="时长 (如 00:25)" value="${clip.duration || '00:20'}">
          <button type="button" class="clip-delete-btn" title="删除该片段">删除</button>
        </div>
        <div class="clip-item-row">
          <input type="text" class="form-input-sm flex-2 clip-input-src" placeholder="视频路径 (如 assets/videos/demo.mp4)" value="${clip.src || ''}" required>
          <label class="btn btn-xs btn-outline file-select-label" style="cursor:pointer;" title="选择本地视频文件">
            <span>浏览文件</span>
            <input type="file" class="clip-file-picker" accept="video/mp4,video/webm" style="display:none;">
          </label>
        </div>
        <div class="clip-item-row">
          <input type="text" class="form-input-sm flex-1 clip-input-desc" placeholder="片段设计与机制要点解析说明" value="${clip.desc || ''}">
        </div>
      `;

      // 删除片段
      item.querySelector('.clip-delete-btn').addEventListener('click', () => {
        if (els.modalClipsList.children.length <= 1) {
          showToast('作品至少需保留一个视频片段');
          return;
        }
        item.remove();
        updateClipCount();
      });

      // 本地文件选取
      const picker = item.querySelector('.clip-file-picker');
      const srcInput = item.querySelector('.clip-input-src');
      picker.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          srcInput.value = URL.createObjectURL(file);
          showToast(`已加载本地视频: ${file.name}`);
        }
      });

      return item;
    }

    function updateClipCount() {
      if (els.modalClipCount && els.modalClipsList) {
        els.modalClipCount.textContent = els.modalClipsList.children.length;
      }
    }

    function loadProjectIntoForm(proj) {
      document.getElementById('formTitle').value = proj.title || '';
      document.getElementById('formCategory').value = proj.category || '独立游戏';
      document.getElementById('formSubtitle').value = proj.subtitle || '';
      document.getElementById('formEngine').value = proj.engine || '';
      document.getElementById('formThumbUrl').value = proj.thumbnail || '';
      const formIconUrl = document.getElementById('formIconUrl');
      if (formIconUrl) formIconUrl.value = proj.icon || '';
      document.getElementById('formControls').value = proj.controls || '';
      document.getElementById('formOverview').value = proj.overview || '';

      const formThumbPreview = document.getElementById('formThumbPreview');
      if (formThumbPreview) {
        if (proj.thumbnail) {
          formThumbPreview.src = proj.thumbnail;
          formThumbPreview.style.display = 'block';
        } else {
          formThumbPreview.style.display = 'none';
        }
      }
      const formIconPreview = document.getElementById('formIconPreview');
      if (formIconPreview) {
        if (proj.icon && !proj.icon.startsWith('<svg')) {
          formIconPreview.src = proj.icon;
          formIconPreview.style.display = 'block';
        } else {
          formIconPreview.style.display = 'none';
        }
      }

      els.modalClipsList.innerHTML = '';
      const vids = proj.videos && proj.videos.length > 0 ? proj.videos : [
        { title: '01. 实机演示', duration: '00:30', src: '', desc: '' }
      ];
      vids.forEach((v, i) => {
        els.modalClipsList.appendChild(createClipRow(v, i));
      });
      updateClipCount();

      if (els.deleteProjectBtn) {
        els.deleteProjectBtn.style.display = (editingProjectIndex >= 0 && state.projects.length > 1) ? 'inline-block' : 'none';
      }
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

    if (els.manageProjectsBtn) {
      els.manageProjectsBtn.addEventListener('click', () => {
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

    // 监听海报与图标路径输入框实时预览
    const formThumbInput = document.getElementById('formThumbUrl');
    const formThumbPreview = document.getElementById('formThumbPreview');
    if (formThumbInput && formThumbPreview) {
      formThumbInput.addEventListener('input', () => {
        const val = formThumbInput.value.trim();
        if (val) {
          formThumbPreview.src = val;
          formThumbPreview.style.display = 'block';
        } else {
          formThumbPreview.style.display = 'none';
        }
      });
      formThumbPreview.onerror = () => {
        formThumbPreview.style.display = 'none';
      };
    }

    const formIconInput = document.getElementById('formIconUrl');
    const formIconPreview = document.getElementById('formIconPreview');
    if (formIconInput && formIconPreview) {
      formIconInput.addEventListener('input', () => {
        const val = formIconInput.value.trim();
        if (val) {
          formIconPreview.src = val;
          formIconPreview.style.display = 'block';
        } else {
          formIconPreview.style.display = 'none';
        }
      });
      formIconPreview.onerror = () => {
        formIconPreview.style.display = 'none';
      };
    }

    // 表单中本地海报图片选择 (压缩转换为 DataURL 持久存储)
    if (els.formThumbFilePicker) {
      els.formThumbFilePicker.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          showToast('正在处理海报图片...');
          const dataUrl = await fileToDataUrl(file);
          if (formThumbInput) formThumbInput.value = dataUrl;
          if (formThumbPreview) {
            formThumbPreview.src = dataUrl;
            formThumbPreview.style.display = 'block';
          }
          showToast(`已选择海报: ${file.name}`);
        }
      });
    }

    // 表单中本地图标图片选择
    if (els.formIconFilePicker) {
      els.formIconFilePicker.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          showToast('正在处理图标图片...');
          const dataUrl = await fileToDataUrl(file, 200, 200);
          if (formIconInput) formIconInput.value = dataUrl;
          if (formIconPreview) {
            formIconPreview.src = dataUrl;
            formIconPreview.style.display = 'block';
          }
          showToast(`已选择图标: ${file.name}`);
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
      if (els.clipFormSrc) els.clipFormSrc.value = clip.src || '';
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

    // 片段模态框内本地视频文件选择
    if (els.clipModalFilePicker) {
      els.clipModalFilePicker.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const objUrl = URL.createObjectURL(file);
          if (els.clipFormSrc) els.clipFormSrc.value = objUrl;
          showToast(`已选择本地视频: ${file.name}`);
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

        saveCustomProjects();
        renderSubvideoList();
        selectSubvideo(state.currentVideoIndex);
        els.clipEditModal.classList.remove('active');
        showToast(`已保存片段: ${clip.title}`);
      });
    }

    // 添加片段按钮
    if (els.modalAddClipBtn) {
      els.modalAddClipBtn.addEventListener('click', () => {
        const nextIdx = els.modalClipsList.children.length + 1;
        const newClip = {
          title: `0${nextIdx}. 机制特性演示`,
          duration: '00:25',
          src: '',
          desc: ''
        };
        els.modalClipsList.appendChild(createClipRow(newClip, nextIdx));
        updateClipCount();
      });
    }

    // 删除当前作品
    if (els.deleteProjectBtn) {
      els.deleteProjectBtn.addEventListener('click', () => {
        if (state.projects.length <= 1) {
          showToast('作品集至少需保留一个作品');
          return;
        }
        const curProj = state.projects[editingProjectIndex];
        if (confirm(`确定要删除作品《${curProj.title}》吗？`)) {
          state.projects.splice(editingProjectIndex, 1);
          saveCustomProjects();
          renderTopProjectStrip();
          selectProject(0, 0);
          els.projectModal.classList.remove('active');
          showToast('已删除作品');
        }
      });
    }

    // 保存提交
    els.projectForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = document.getElementById('formTitle').value.trim();
      const category = document.getElementById('formCategory').value.trim() || '独立游戏';
      const subtitle = document.getElementById('formSubtitle').value.trim();
      const engine = document.getElementById('formEngine').value.trim();
      const thumbnail = document.getElementById('formThumbUrl').value.trim() || 'assets/thumbnails/overspace.jpg';
      const iconUrl = document.getElementById('formIconUrl') ? document.getElementById('formIconUrl').value.trim() : '';
      const icon = iconUrl || thumbnail;
      const controls = document.getElementById('formControls').value.trim();
      const overview = document.getElementById('formOverview').value.trim();

      // 提取片段列表
      const clips = [];
      const clipItems = els.modalClipsList.querySelectorAll('.clip-manager-item');
      clipItems.forEach((item, idx) => {
        const cTitle = item.querySelector('.clip-input-title').value.trim() || `0${idx + 1}. 机制演示`;
        const cDuration = item.querySelector('.clip-input-duration').value.trim() || '00:30';
        const cSrc = item.querySelector('.clip-input-src').value.trim();
        const cDesc = item.querySelector('.clip-input-desc').value.trim();
        clips.push({
          id: `clip-${Date.now()}-${idx}`,
          title: cTitle,
          duration: cDuration,
          src: cSrc,
          desc: cDesc
        });
      });

      if (clips.length === 0) {
        showToast('请至少添加一个视频片段');
        return;
      }

      if (editingProjectIndex >= 0 && state.projects[editingProjectIndex]) {
        // 编辑已有作品
        const targetProj = state.projects[editingProjectIndex];
        targetProj.title = title;
        targetProj.category = category;
        targetProj.subtitle = subtitle;
        targetProj.engine = engine;
        targetProj.thumbnail = thumbnail;
        targetProj.icon = icon;
        targetProj.controls = controls;
        targetProj.overview = overview;
        targetProj.videos = clips;

        saveCustomProjects();
        renderTopProjectStrip();
        selectProject(editingProjectIndex, 0);
        els.projectModal.classList.remove('active');
        showToast(`已更新作品《${title}》`);
      } else {
        // 新建作品
        const newProj = {
          id: `proj-${Date.now()}`,
          title,
          category,
          subtitle,
          engine,
          year: '2025',
          status: '独立开发',
          role: '游戏系统策划 / 关卡设计',
          thumbnail,
          icon,
          controls,
          overview,
          videos: clips,
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

    // 导出配置
    els.exportDataBtn.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.projects, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "projects.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('已导出 projects.json 配置文件');
    });

    // 恢复默认
    els.resetDataBtn.addEventListener('click', () => {
      if (confirm('确定要清除所有自定义修改并恢复默认作品集吗？')) {
        localStorage.removeItem('portfolio_projects_custom');
        localStorage.removeItem('portfolio_data_version');
        loadProjectsData();
        normalizeProjectsData();
        renderTopProjectStrip();
        selectProject(0, 0);
        els.projectModal.classList.remove('active');
        showToast('已恢复默认作品集');
      }
    });

    // =========================================================
    // 模态框 4: 管理员身份验证
    // =========================================================
    if (els.closeAdminModalBtn) {
      els.closeAdminModalBtn.addEventListener('click', () => {
        els.adminAuthModal.classList.remove('active');
      });
    }

    if (els.cancelAdminBtn) {
      els.cancelAdminBtn.addEventListener('click', () => {
        els.adminAuthModal.classList.remove('active');
      });
    }

    if (els.adminAuthModal) {
      els.adminAuthModal.addEventListener('click', (e) => {
        if (e.target === els.adminAuthModal) {
          els.adminAuthModal.classList.remove('active');
        }
      });
    }

    if (els.adminAuthForm) {
      els.adminAuthForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pwd = els.adminPasswordInput.value.trim();
        if (pwd === ADMIN_PASSWORD) {
          localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
          state.isAdmin = true;
          applyAdminState();
          renderSubvideoList();
          els.adminAuthModal.classList.remove('active');
          showToast('验证通过！已开启管理员编辑模式');
        } else {
          showToast('密码错误，请重新输入');
          els.adminPasswordInput.value = '';
          els.adminPasswordInput.focus();
        }
      });
    }
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
