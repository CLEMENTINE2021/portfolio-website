/**
 * 作品集数据配置文件 (projects.js)
 * 葛文轩 (Wenxuan Ge) - 游戏系统策划 / 关卡设计
 */

const DEFAULT_PROJECTS = [
  {
    id: "overspace",
    title: "《OVERSPACE》",
    subtitle: "2D 太空物理模拟与战术飞行独立游戏",
    category: "独立游戏 / 物理模拟",
    engine: "Godot 4.x",
    year: "2025 - 至今",
    status: "在研商业项目",
    role: "系统策划 / 关卡设计 / 程序实现",
    thumbnail: "assets/thumbnails/overspace.jpg",
    icon: "assets/thumbnails/overspace.jpg",
    videos: [
      {
        id: "overspace-v1",
        title: "01. 轨道预测与引力弹弓变轨机制",
        desc: "根据飞船质量、推进矢量与多体引力场实时动态积分求解预测轨道，并在 HUD 呈现预测轨迹线；利用天体引力弹弓实现零工质加速与大角度战术变轨。",
        src: "assets/videos/overspace-prediction.mp4",
        duration: "00:24"
      },
      {
        id: "overspace-v2",
        title: "02. 武器后坐力与模块化废弃弹出",
        desc: "射击冲量实时反作用于飞船质心导致姿态偏转与动量反冲；限制单体武器弹药上限，耗尽即自动废弃弹出，促使高速交火中拾取战术补给。",
        src: "assets/videos/overspace-weapon.mp4",
        duration: "00:14"
      },
      {
        id: "overspace-v3",
        title: "03. 基础敌人巡逻警戒与索敌追击",
        desc: "基于微重力失重环境设计的自主巡逻无人机；视锥索敌后动态施加转向力矩与推进矢量，模拟物理惯性追逐与走位缠斗。",
        src: "assets/videos/overspace-enemies.mp4",
        duration: "00:48"
      },
      {
        id: "overspace-v4",
        title: "04. 精英敌人牵引交互与战术博弈",
        desc: "配备高威胁近战牵引光束的精英无人机；被牵引时需利用反冲力反推或借助环境掩体切断光束，构建高压拉扯对抗。",
        src: "assets/videos/overspace-elite.mp4",
        duration: "00:29"
      },
      {
        id: "overspace-v5",
        title: "05. 狙击关卡视线遮挡与掩体机动",
        desc: "高精度红外狙击无人机关卡设计；玩家必须结合巨型空间站骨架柱体掩体进行视线遮挡盲区推进，在致命射击间隙切入盲区反打。",
        src: "assets/videos/overspace-sniper.mp4",
        duration: "00:56"
      },
      {
        id: "overspace-v6",
        title: "06. 猎手敌人暗区潜伏与动态照明",
        desc: "完全隐匿在无光深空暗区的潜伏型猎手敌人；依靠飞船探照灯有限扇形视野与雷达告警指示探照定位，带来高压惊悚与突袭反制体验。",
        src: "assets/videos/overspace-hunter.mp4",
        duration: "00:31"
      }
    ],
    links: {
      itch: "https://kineticplanet.itch.io/overspace",
      pan: "https://pan.baidu.com/s/1Ib28cr995nGAERLTFYQfsA?pwd=j6tn"
    },
    metaText: "Godot 4.x · PC / Steam · 2025.01 - 至今 · 在研商业项目",
    overview: "取消常规重力与地面行走的 2D 太空战术飞行游戏。飞船矢量机动、武器战斗与空间关卡均围绕牛顿第三定律反作用力与多体天体引力场展开，探索失重环境下的纯物理反馈、战术拉扯与轨道博弈。",
    keyPoints: [
      {
        title: "力学核心闭环",
        desc: "取消常规直接坐标位移，推进器推力、武器后坐力与碰撞冲量均基于刚体物理与反作用力实时解算。"
      },
      {
        title: "动态轨道积分预测",
        desc: "实时积分多体引力场与推进推力，在 HUD 绘制轨道预测线，支持引力弹弓与无动力滑行变轨。"
      },
      {
        title: "去背包与模块化抛弃",
        desc: "限制单体弹药上限，耗尽即自动废弃弹出，促使玩家在高速交火中拾取掉落动态调整打法。"
      },
      {
        title: "多样化失重战术 AI",
        desc: "包含基础巡逻蜂群、近战牵引精英、红外狙击无人机及暗区潜伏猎手，构建多层次空间交火体验。"
      }
    ],
    controls: "【WASD】推进机动 | 【鼠标】朝向瞄准 | 【左键】主武器 | 【右键】副道具 | 【长按G】丢弃装备"
  },
  {
    id: "hostage-rescue",
    title: "《人质营救关卡设计》",
    subtitle: "立体战术网格与高压时限机制战棋关卡",
    category: "关卡设计 / 回合制战棋",
    engine: "Godot 4.7",
    year: "2024",
    status: "可玩原型 Demo",
    role: "关卡设计 / 战术系统策划 / GDScript 实现",
    thumbnail: "assets/thumbnails/hostage_rescue.jpg",
    icon: "assets/thumbnails/hostage_rescue.jpg",
    videos: [
      {
        id: "hostage-v1",
        title: "01. 类幽浮2关卡设计完整实机演示",
        desc: "基于 Godot 4.7 开发的 XCOM 风格战术回合制战棋关卡。从初始隐蔽渗透、破门解救人质到登顶固守阻击三波增援并成功撤离的完整实机通关录像（3分54秒）。",
        src: "assets/videos/hostage-full.mp4",
        bvid: "BV1pon16WEuu",
        iframeSrc: "https://player.bilibili.com/player.html?isOutside=true&aid=117482824140776&bvid=BV1pon16WEuu&cid=42946924020&p=1",
        duration: "03:54"
      }
    ],
    links: {
      github: "https://github.com/spaceyjase/TurnBasedStrategyGodot"
    },
    metaText: "Godot 4.7 · GDScript · 关卡设计与系统原型 · 已完成",
    overview: "基于 Godot 4.7 开发的 XCOM 风格战术回合制战棋关卡。构建了 40×40 战场与 12×10 双层可破坏建筑，围绕“隐蔽潜入 -> 强攻歼灭挟持看守 -> 双层高地固守抗击三波援兵 -> 屋顶直升机撤离”展开高紧张度心流设计。",
    keyPoints: [
      {
        title: "紧迫时限博弈（看守处决机制）",
        desc: "看守小队被惊动后立即挟持人质，玩家必须在单回合内消灭所有挟持者，否则人质即刻被处决导致任务失败，极大提升决策压力。"
      },
      {
        title: "隐蔽潜入与 Scamper 警戒机制",
        desc: "还原 XCOM 风格全队隐蔽状态与巡逻 Pod 机制。敌方未察觉时可规划盲区走位；惊动敌人瞬间触发免费找掩体机制（Scamper），并支持伏击监视射击（Overwatch）。"
      },
      {
        title: "双层立体建筑与视距遮挡",
        desc: "12×10 核心建筑包含门、窗半掩体、外墙梯子与可走屋顶。镜头降落时屋顶动态半透明以呈现室内纵深战术，自如完成从地面潜入到梯子登顶的高低差战术转移。"
      },
      {
        title: "高地防守与波次援军收缩",
        desc: "成功救出人质后触发三波动态增援包夹，迫使玩家掩护人质登顶，依托屋顶女儿墙与箱子掩体构筑火力交叉阵地，坚守至撤离点抵达。"
      }
    ],
    controls: "【WASD】平移相机 | 【Q/E】旋转90° | 【滚轮】升降相机/切屋顶透视 | 【左键】选人/执行动作 | 【Tab】切换队员 | 【R】手动切换屋顶显示"
  }
];

window.PORTFOLIO_DATA = {
  author: {
    name: "葛文轩",
    pinyin: "WENXUAN GE",
    title: "游戏系统策划 / 关卡设计",
    bio: "专注于力学拟真、无缝心流与物理交互设计。",
    email: "wge66689@gmail.com",
    itch: "https://kineticplanet.itch.io",
    resumeUrl: ""
  },
  projects: DEFAULT_PROJECTS
};
