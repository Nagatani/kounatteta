/**
 * templates.js
 * 白抜きピクトグラム調オブジェクトのテンプレート、ポーズプリセット、カラーパレット、作例データ。
 * ここを編集するだけで、新しい家具やポーズを簡単に追加できます。
 */
(function (global) {
  'use strict';

  const NS = (global.SituDiagram = global.SituDiagram || {});

  // 共通カラーパレット（白抜き枠線ピクトグラムが映えるカラー）
  NS.COLOR_PALETTE = [
    '#1e293b', // ピクトブラック
    '#475569', // スレートグレー
    '#64748b', // ミディアムグレー
    '#ef4444', // レッド
    '#f97316', // オレンジ（茶トラ）
    '#eab308', // イエロー
    '#16a34a', // グリーン
    '#0ea5e9', // スカイブルー
    '#2563eb', // ピクトブルー
    '#8b5cf6', // パープル
    '#ec4899', // ピンク
    '#92400e'  // ブラウン
  ];

  // 追加メニュー用の白抜き枠線ピクトグラムSVGアイコン
  const ICONS = {
    human: '<svg viewBox="0 0 36 36"><circle cx="18" cy="7" r="4" fill="#fff" stroke="currentColor" stroke-width="2.2"/><rect x="13" y="13" width="10" height="10" rx="3.5" fill="#fff" stroke="currentColor" stroke-width="2.2"/><path d="M13 15 L8 22 M23 15 L28 22 M15.5 23 L13.5 33 M20.5 23 L22.5 33" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    cat: '<svg viewBox="0 0 36 36"><path d="M10 20 Q4 16 7 10 M13 24 L12 31 M23 24 L24 31" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><rect x="10" y="16" width="16" height="9" rx="4.5" fill="#fff" stroke="currentColor" stroke-width="2.2"/><path d="M22 10 L23 4.5 L26 9 L29 4.5 L30 10" fill="#fff" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="26" cy="13.5" r="4.8" fill="#fff" stroke="currentColor" stroke-width="2.2"/></svg>',
    dog: '<svg viewBox="0 0 36 36"><path d="M9 19 L4 13 M12 24 L11 31 M22 24 L23 31" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><rect x="9" y="16" width="16" height="9.5" rx="4.5" fill="#fff" stroke="currentColor" stroke-width="2.2"/><rect x="26" y="12" width="6.5" height="4.5" rx="2.2" fill="#fff" stroke="currentColor" stroke-width="2"/><circle cx="25" cy="13.5" r="4.8" fill="#fff" stroke="currentColor" stroke-width="2.2"/><ellipse cx="22.5" cy="15" rx="2.2" ry="4.5" fill="#fff" stroke="currentColor" stroke-width="1.8"/></svg>',
    bed_top: '<svg viewBox="0 0 36 36"><rect x="7" y="4" width="22" height="28" rx="3.5" fill="#fff" stroke="currentColor" stroke-width="2.2"/><rect x="7" y="4" width="22" height="5" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="2"/><rect x="12" y="11" width="12" height="5" rx="2" fill="#fff" stroke="currentColor" stroke-width="2"/><rect x="9.5" y="18.5" width="17" height="11" rx="2" fill="currentColor" opacity="0.14" stroke="currentColor" stroke-width="1.8"/></svg>',
    bed_side: '<svg viewBox="0 0 36 36"><rect x="4" y="11" width="3.5" height="18" rx="1.5" fill="#fff" stroke="currentColor" stroke-width="2"/><rect x="28.5" y="17" width="3.5" height="12" rx="1.5" fill="#fff" stroke="currentColor" stroke-width="2"/><rect x="7.5" y="19" width="21" height="6" rx="2" fill="#fff" stroke="currentColor" stroke-width="2"/><rect x="9.5" y="14.5" width="7" height="4" rx="1.8" fill="#fff" stroke="currentColor" stroke-width="2"/></svg>',
    futon: '<svg viewBox="0 0 36 36"><rect x="6" y="7" width="24" height="22" rx="4" fill="#fff" stroke="currentColor" stroke-width="2.2"/><line x1="6" y1="14" x2="30" y2="14" stroke="currentColor" stroke-width="2.2"/></svg>',
    table: '<svg viewBox="0 0 36 36"><rect x="4" y="10" width="28" height="4.5" rx="1.5" fill="#fff" stroke="currentColor" stroke-width="2.2"/><rect x="7.5" y="14.5" width="3.5" height="13.5" rx="1.2" fill="#fff" stroke="currentColor" stroke-width="2"/><rect x="25" y="14.5" width="3.5" height="13.5" rx="1.2" fill="#fff" stroke="currentColor" stroke-width="2"/></svg>',
    sofa: '<svg viewBox="0 0 36 36"><rect x="7" y="10" width="22" height="10" rx="3" fill="#fff" stroke="currentColor" stroke-width="2"/><rect x="4" y="15" width="5" height="12" rx="2" fill="#fff" stroke="currentColor" stroke-width="2"/><rect x="27" y="15" width="5" height="12" rx="2" fill="#fff" stroke="currentColor" stroke-width="2"/><rect x="9" y="19" width="18" height="7" rx="1.5" fill="#fff" stroke="currentColor" stroke-width="2"/></svg>',
    chair: '<svg viewBox="0 0 36 36"><rect x="10" y="6" width="3.5" height="15" rx="1.5" fill="#fff" stroke="currentColor" stroke-width="2"/><rect x="10" y="18" width="16" height="3.8" rx="1.5" fill="#fff" stroke="currentColor" stroke-width="2"/><rect x="10.5" y="21.5" width="3" height="9.5" rx="1.2" fill="#fff" stroke="currentColor" stroke-width="2"/><rect x="22.5" y="21.5" width="3" height="9.5" rx="1.2" fill="#fff" stroke="currentColor" stroke-width="2"/></svg>',
    wall: '<svg viewBox="0 0 36 36"><rect x="4" y="14" width="28" height="8" rx="2" fill="#fff" stroke="currentColor" stroke-width="2.2"/></svg>',
    device: '<svg viewBox="0 0 36 36"><rect x="8" y="8" width="20" height="14" rx="2.5" fill="#fff" stroke="currentColor" stroke-width="2.2"/><rect x="4" y="24" width="28" height="4" rx="2" fill="#fff" stroke="currentColor" stroke-width="2"/></svg>',
    bubble: '<svg viewBox="0 0 36 36"><path d="M6 10a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v11a4 4 0 0 1-4 4H16l-6 5v-5h0a4 4 0 0 1-4-4Z" fill="#fff" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>',
    label: '<svg viewBox="0 0 36 36"><path d="M8 10h20M18 10v18M13 28h10" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
    arrow: '<svg viewBox="0 0 36 36"><path d="M7 25 Q16 9 28 15" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><polygon points="29,15 21,11 23,19" fill="currentColor"/></svg>',
    anger: '<svg viewBox="0 0 36 36"><path d="M13 7 Q15 14 7 14 M23 7 Q21 14 29 14 M13 29 Q15 22 7 22 M23 29 Q21 22 29 22" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
    zzz: '<svg viewBox="0 0 36 36"><path d="M8 22h8l-8 8h8 M16 14h7l-7 7h7 M22 7h6l-6 6h6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sweat: '<svg viewBox="0 0 36 36"><path d="M18 6 C18 6 27 17 27 23 A9 9 0 1 1 9 23 C9 17 18 6 18 6Z" fill="#fff" stroke="currentColor" stroke-width="2.4"/></svg>',
    bang: '<svg viewBox="0 0 36 36"><polygon points="18,4 21,12 30,9 25,17 32,22 23,23 25,32 18,26 11,32 13,23 4,22 11,17 6,9 15,12" fill="#fff" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
    excl: '<svg viewBox="0 0 36 36"><rect x="15.5" y="6" width="5" height="16" rx="2.5" fill="#fff" stroke="currentColor" stroke-width="2.2"/><circle cx="18" cy="27.5" r="3" fill="#fff" stroke="currentColor" stroke-width="2.2"/></svg>',
    paw: '<svg viewBox="0 0 36 36"><circle cx="11" cy="14" r="2.8" fill="#fff" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="10.5" r="2.8" fill="#fff" stroke="currentColor" stroke-width="2"/><circle cx="25" cy="14" r="2.8" fill="#fff" stroke="currentColor" stroke-width="2"/><path d="M18 17 c-5 0 -8 4 -7 8 c1 3 4 3 7 2 c3 1 6 1 7-2 c1-4 -2-8 -7-8Z" fill="#fff" stroke="currentColor" stroke-width="2"/></svg>',
    road_cross: '<svg viewBox="0 0 36 36"><path d="M12 3v9H3v12h9v9h12v-9h9V12h-9V3Z" fill="#fff" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M18 5v6M18 25v6M5 18h6M25 18h6" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2.5 2"/></svg>',
    road_t: '<svg viewBox="0 0 36 36"><path d="M3 12h30v12H24v9H12v-9H3Z" fill="#fff" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M6 18h24M18 24v7" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2.5 2"/></svg>',
    road_straight: '<svg viewBox="0 0 36 36"><rect x="10" y="3" width="16" height="30" rx="2" fill="#fff" stroke="currentColor" stroke-width="2.2"/><line x1="18" y1="6" x2="18" y2="30" stroke="currentColor" stroke-width="2" stroke-dasharray="3.5 3"/></svg>',
    signal: '<svg viewBox="0 0 36 36"><rect x="4" y="11" width="28" height="14" rx="7" fill="#fff" stroke="currentColor" stroke-width="2.2"/><circle cx="11" cy="18" r="3" fill="#22c55e"/><circle cx="18" cy="18" r="3" fill="#eab308" opacity="0.35"/><circle cx="25" cy="18" r="3" fill="#ef4444" opacity="0.35"/></svg>',
    car: '<svg viewBox="0 0 36 36"><rect x="10" y="4" width="16" height="28" rx="5" fill="#fff" stroke="currentColor" stroke-width="2.2"/><rect x="13" y="10" width="10" height="6" rx="1.8" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.6"/><line x1="13" y1="24" x2="23" y2="24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    truck: '<svg viewBox="0 0 36 36"><rect x="9" y="3" width="18" height="9" rx="3" fill="#fff" stroke="currentColor" stroke-width="2.2"/><rect x="8.5" y="12" width="19" height="21" rx="2" fill="#fff" stroke="currentColor" stroke-width="2.2"/></svg>',
    bicycle: '<svg viewBox="0 0 36 36"><line x1="18" y1="5" x2="18" y2="31" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="10" y1="11" x2="26" y2="11" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="18" cy="19" r="3.2" fill="#fff" stroke="currentColor" stroke-width="2"/></svg>',
    crosswalk: '<svg viewBox="0 0 36 36"><rect x="5" y="12" width="4" height="12" rx="1" fill="#fff" stroke="currentColor" stroke-width="1.8"/><rect x="12.5" y="12" width="4" height="12" rx="1" fill="#fff" stroke="currentColor" stroke-width="1.8"/><rect x="20" y="12" width="4" height="12" rx="1" fill="#fff" stroke="currentColor" stroke-width="1.8"/><rect x="27.5" y="12" width="4" height="12" rx="1" fill="#fff" stroke="currentColor" stroke-width="1.8"/></svg>'
  };

  // ピクトグラム人間のポーズプリセット（現実的なスケール：身長約260px）
  NS.HUMAN_POSES = {
    stand: {
      label: '立つ',
      joints: {
        head: { x: 0, y: -108 },
        shoulder: { x: 0, y: -62 },
        hip: { x: 0, y: 18 },
        elbowL: { x: -38, y: -24 },
        handL: { x: -46, y: 24 },
        elbowR: { x: 38, y: -24 },
        handR: { x: 46, y: 24 },
        kneeL: { x: -22, y: 74 },
        footL: { x: -28, y: 128 },
        kneeR: { x: 22, y: 74 },
        footR: { x: 28, y: 128 }
      }
    },
    sleep: {
      label: '仰向け寝',
      joints: {
        head: { x: 0, y: -112 },
        shoulder: { x: 0, y: -64 },
        hip: { x: 0, y: 18 },
        elbowL: { x: -32, y: -20 },
        handL: { x: -36, y: 28 },
        elbowR: { x: 32, y: -20 },
        handR: { x: 36, y: 28 },
        kneeL: { x: -16, y: 74 },
        footL: { x: -18, y: 130 },
        kneeR: { x: 16, y: 74 },
        footR: { x: 18, y: 130 }
      }
    },
    cramped: {
      label: '端っこで丸まる',
      joints: {
        head: { x: -8, y: -104 },
        shoulder: { x: -12, y: -58 },
        hip: { x: -16, y: 16 },
        elbowL: { x: 16, y: -38 },
        handL: { x: 26, y: -12 },
        elbowR: { x: 18, y: -18 },
        handR: { x: 28, y: 10 },
        kneeL: { x: 24, y: 50 },
        footL: { x: -8, y: 96 },
        kneeR: { x: 34, y: 64 },
        footR: { x: 2, y: 112 }
      }
    },
    sit: {
      label: '座る',
      joints: {
        head: { x: -16, y: -102 },
        shoulder: { x: -16, y: -56 },
        hip: { x: -12, y: 18 },
        elbowL: { x: 18, y: -26 },
        handL: { x: 56, y: -18 },
        elbowR: { x: 24, y: -12 },
        handR: { x: 64, y: -6 },
        kneeL: { x: 46, y: 24 },
        footL: { x: 46, y: 94 },
        kneeR: { x: 56, y: 36 },
        footR: { x: 62, y: 104 }
      }
    },
    banzai: {
      label: 'バンザイ',
      joints: {
        head: { x: 0, y: -108 },
        shoulder: { x: 0, y: -62 },
        hip: { x: 0, y: 18 },
        elbowL: { x: -46, y: -88 },
        handL: { x: -60, y: -136 },
        elbowR: { x: 46, y: -88 },
        handR: { x: 60, y: -136 },
        kneeL: { x: -24, y: 74 },
        footL: { x: -36, y: 128 },
        kneeR: { x: 24, y: 74 },
        footR: { x: 36, y: 128 }
      }
    },
    orz: {
      label: 'がっくり',
      joints: {
        head: { x: 74, y: 6 },
        shoulder: { x: 34, y: -10 },
        hip: { x: -40, y: -6 },
        elbowL: { x: 40, y: 32 },
        handL: { x: 50, y: 72 },
        elbowR: { x: 24, y: 32 },
        handR: { x: 32, y: 72 },
        kneeL: { x: -30, y: 58 },
        footL: { x: -84, y: 72 },
        kneeR: { x: -44, y: 58 },
        footR: { x: -96, y: 72 }
      }
    }
  };

  // ピクトグラム猫のポーズプリセット（人との比率に合わせた自然なサイズ）
  NS.CAT_POSES = {
    walk: {
      label: '歩く・立つ',
      joints: {
        head: { x: 42, y: -24 },
        chest: { x: 20, y: -4 },
        hip: { x: -26, y: -2 },
        pawFL: { x: 28, y: 28 },
        pawFR: { x: 10, y: 28 },
        pawBL: { x: -18, y: 28 },
        pawBR: { x: -34, y: 28 },
        tailMid: { x: -50, y: -22 },
        tailTip: { x: -46, y: -50 }
      }
    },
    loaf: {
      label: '香箱座り',
      joints: {
        head: { x: 34, y: -16 },
        chest: { x: 16, y: 2 },
        hip: { x: -22, y: 4 },
        pawFL: { x: 24, y: 18 },
        pawFR: { x: 12, y: 18 },
        pawBL: { x: -16, y: 18 },
        pawBR: { x: -28, y: 18 },
        tailMid: { x: -42, y: 12 },
        tailTip: { x: -50, y: -2 }
      }
    },
    sprawl: {
      label: '大の字（占領）',
      joints: {
        head: { x: 52, y: 0 },
        chest: { x: 18, y: 0 },
        hip: { x: -24, y: 2 },
        pawFL: { x: 40, y: -32 },
        pawFR: { x: 38, y: 32 },
        pawBL: { x: -38, y: -30 },
        pawBR: { x: -40, y: 32 },
        tailMid: { x: -52, y: 4 },
        tailTip: { x: -72, y: -12 }
      }
    },
    stretch: {
      label: 'のび〜',
      joints: {
        head: { x: 38, y: 6 },
        chest: { x: 18, y: 16 },
        hip: { x: -26, y: -16 },
        pawFL: { x: 64, y: 28 },
        pawFR: { x: 52, y: 30 },
        pawBL: { x: -20, y: 28 },
        pawBR: { x: -36, y: 28 },
        tailMid: { x: -46, y: -36 },
        tailTip: { x: -36, y: -58 }
      }
    },
    curl: {
      label: '丸まる',
      joints: {
        head: { x: 22, y: -14 },
        chest: { x: 14, y: 6 },
        hip: { x: -16, y: 8 },
        pawFL: { x: 24, y: 16 },
        pawFR: { x: 8, y: 20 },
        pawBL: { x: -10, y: 20 },
        pawBR: { x: -20, y: 16 },
        tailMid: { x: -28, y: -10 },
        tailTip: { x: -4, y: -22 }
      }
    }
  };

  // ピクトグラム犬のポーズプリセット
  NS.DOG_POSES = {
    stand: {
      label: '立つ',
      joints: {
        head: { x: 48, y: -26 },
        chest: { x: 22, y: -4 },
        hip: { x: -28, y: -2 },
        pawFL: { x: 30, y: 34 },
        pawFR: { x: 12, y: 34 },
        pawBL: { x: -20, y: 34 },
        pawBR: { x: -38, y: 34 },
        tailTip: { x: -58, y: -28 }
      }
    },
    sit: {
      label: 'おすわり',
      joints: {
        head: { x: 28, y: -40 },
        chest: { x: 14, y: -14 },
        hip: { x: -20, y: 18 },
        pawFL: { x: 24, y: 34 },
        pawFR: { x: 10, y: 34 },
        pawBL: { x: -6, y: 34 },
        pawBR: { x: -24, y: 34 },
        tailTip: { x: -50, y: 12 }
      }
    },
    down: {
      label: '伏せ・ゴロン',
      joints: {
        head: { x: 46, y: 4 },
        chest: { x: 18, y: 14 },
        hip: { x: -26, y: 14 },
        pawFL: { x: 52, y: 26 },
        pawFR: { x: 38, y: 28 },
        pawBL: { x: -40, y: 26 },
        pawBR: { x: -52, y: 24 },
        tailTip: { x: -62, y: 4 }
      }
    }
  };

  function cloneJoints(joints) {
    const out = {};
    for (const key of Object.keys(joints)) {
      out[key] = { x: joints[key].x, y: joints[key].y };
    }
    return out;
  }

  // 追加メニューに表示するテンプレート定義
  NS.TEMPLATES = [
    // --- ひと・ペット ---
    {
      id: 'human',
      category: 'character',
      label: 'ひと',
      iconSvg: ICONS.human,
      create: (x, y) => ({
        kind: 'rig',
        rigType: 'human',
        x, y,
        rotation: 0,
        flipX: false,
        color: '#1e293b',
        joints: cloneJoints(NS.HUMAN_POSES.stand.joints)
      })
    },
    {
      id: 'cat',
      category: 'character',
      label: 'ねこ',
      iconSvg: ICONS.cat,
      create: (x, y) => ({
        kind: 'rig',
        rigType: 'cat',
        x, y,
        rotation: 0,
        flipX: false,
        color: '#f97316',
        joints: cloneJoints(NS.CAT_POSES.walk.joints)
      })
    },
    {
      id: 'dog',
      category: 'character',
      label: 'いぬ',
      iconSvg: ICONS.dog,
      create: (x, y) => ({
        kind: 'rig',
        rigType: 'dog',
        x, y,
        rotation: 0,
        flipX: false,
        color: '#92400e',
        joints: cloneJoints(NS.DOG_POSES.stand.joints)
      })
    },

    // --- 交通・道路 ---
    {
      id: 'car',
      category: 'traffic',
      label: '車（普通車）',
      iconSvg: ICONS.car,
      create: (x, y) => ({
        kind: 'furniture',
        furnitureType: 'car',
        x, y,
        w: 38,
        h: 72,
        rotation: 0,
        flipX: false,
        color: '#2563eb'
      })
    },
    {
      id: 'truck',
      category: 'traffic',
      label: 'トラック',
      iconSvg: ICONS.truck,
      create: (x, y) => ({
        kind: 'furniture',
        furnitureType: 'truck',
        x, y,
        w: 44,
        h: 102,
        rotation: 0,
        flipX: false,
        color: '#475569'
      })
    },
    {
      id: 'bicycle',
      category: 'traffic',
      label: '自転車',
      iconSvg: ICONS.bicycle,
      create: (x, y) => ({
        kind: 'furniture',
        furnitureType: 'bicycle',
        x, y,
        w: 24,
        h: 48,
        rotation: 0,
        flipX: false,
        color: '#16a34a'
      })
    },
    {
      id: 'signal',
      category: 'traffic',
      label: '信号機',
      iconSvg: ICONS.signal,
      create: (x, y) => ({
        kind: 'signal',
        x, y,
        w: 66,
        h: 26,
        rotation: 0,
        flipX: false,
        color: '#1e293b',
        state: 'green'
      })
    },
    {
      id: 'road_cross',
      category: 'traffic',
      label: '交差点(十字)',
      iconSvg: ICONS.road_cross,
      create: (x, y) => ({
        kind: 'road',
        roadType: 'cross',
        x, y,
        w: 600,
        h: 600,
        rotation: 0,
        flipX: false,
        color: '#64748b',
        lanes: 1,
        crosswalk: true,
        stopLine: true
      })
    },
    {
      id: 'road_t',
      category: 'traffic',
      label: 'T字路',
      iconSvg: ICONS.road_t,
      create: (x, y) => ({
        kind: 'road',
        roadType: 't_junction',
        x, y,
        w: 600,
        h: 600,
        rotation: 0,
        flipX: false,
        color: '#64748b',
        lanes: 1,
        crosswalk: true,
        stopLine: true
      })
    },
    {
      id: 'road_straight',
      category: 'traffic',
      label: '直線道路',
      iconSvg: ICONS.road_straight,
      create: (x, y) => ({
        kind: 'road',
        roadType: 'straight',
        x, y,
        w: 600,
        h: 600,
        rotation: 0,
        flipX: false,
        color: '#64748b',
        lanes: 1,
        crosswalk: false,
        stopLine: false
      })
    },
    {
      id: 'crosswalk',
      category: 'traffic',
      label: '横断歩道',
      iconSvg: ICONS.crosswalk,
      create: (x, y) => ({
        kind: 'furniture',
        furnitureType: 'crosswalk',
        x, y,
        w: 110,
        h: 34,
        rotation: 0,
        flipX: false,
        color: '#64748b'
      })
    },

    // --- 家具・モノ ---
    {
      id: 'bed_top',
      category: 'furniture',
      label: 'ベッド(上)',
      iconSvg: ICONS.bed_top,
      create: (x, y) => ({
        kind: 'furniture',
        furnitureType: 'bed_top',
        x, y,
        w: 260,
        h: 350,
        rotation: 0,
        flipX: false,
        color: '#0ea5e9'
      })
    },
    {
      id: 'bed_side',
      category: 'furniture',
      label: 'ベッド(横)',
      iconSvg: ICONS.bed_side,
      create: (x, y) => ({
        kind: 'furniture',
        furnitureType: 'bed_side',
        x, y,
        w: 320,
        h: 130,
        rotation: 0,
        flipX: false,
        color: '#0ea5e9'
      })
    },
    {
      id: 'futon',
      category: 'furniture',
      label: '掛け布団',
      iconSvg: ICONS.futon,
      create: (x, y) => ({
        kind: 'furniture',
        furnitureType: 'futon',
        x, y,
        w: 220,
        h: 210,
        rotation: 0,
        flipX: false,
        color: '#0ea5e9'
      })
    },
    {
      id: 'table',
      category: 'furniture',
      label: '机・テーブル',
      iconSvg: ICONS.table,
      create: (x, y) => ({
        kind: 'furniture',
        furnitureType: 'table',
        x, y,
        w: 240,
        h: 125,
        rotation: 0,
        flipX: false,
        color: '#64748b'
      })
    },
    {
      id: 'sofa',
      category: 'furniture',
      label: 'ソファ',
      iconSvg: ICONS.sofa,
      create: (x, y) => ({
        kind: 'furniture',
        furnitureType: 'sofa',
        x, y,
        w: 250,
        h: 115,
        rotation: 0,
        flipX: false,
        color: '#16a34a'
      })
    },
    {
      id: 'chair',
      category: 'furniture',
      label: '椅子',
      iconSvg: ICONS.chair,
      create: (x, y) => ({
        kind: 'furniture',
        furnitureType: 'chair',
        x, y,
        w: 96,
        h: 132,
        rotation: 0,
        flipX: false,
        color: '#64748b'
      })
    },
    {
      id: 'wall',
      category: 'furniture',
      label: '壁・仕切り',
      iconSvg: ICONS.wall,
      create: (x, y) => ({
        kind: 'furniture',
        furnitureType: 'wall',
        x, y,
        w: 260,
        h: 18,
        rotation: 0,
        flipX: false,
        color: '#475569'
      })
    },
    {
      id: 'device',
      category: 'furniture',
      label: 'PC・スマホ',
      iconSvg: ICONS.device,
      create: (x, y) => ({
        kind: 'furniture',
        furnitureType: 'device',
        x, y,
        w: 84,
        h: 58,
        rotation: 0,
        flipX: false,
        color: '#475569'
      })
    },

    // --- 文字・矢印・記号 ---
    {
      id: 'bubble',
      category: 'annotation',
      label: '吹き出し',
      iconSvg: ICONS.bubble,
      create: (x, y) => ({
        kind: 'text',
        textType: 'bubble',
        x, y,
        text: 'ここが狭い…',
        fontSize: 18,
        color: '#1e293b',
        tail: { x: -24, y: 46 }
      })
    },
    {
      id: 'label',
      category: 'annotation',
      label: '文字ラベル',
      iconSvg: ICONS.label,
      create: (x, y) => ({
        kind: 'text',
        textType: 'label',
        x, y,
        text: '状況メモ',
        fontSize: 20,
        color: '#1e293b'
      })
    },
    {
      id: 'arrow',
      category: 'annotation',
      label: '矢印',
      iconSvg: ICONS.arrow,
      create: (x, y) => ({
        kind: 'arrow',
        x, y,
        color: '#ef4444',
        start: { x: -55, y: 18 },
        ctrl: { x: 0, y: -22 },
        end: { x: 55, y: 18 }
      })
    },
    {
      id: 'stamp_anger',
      category: 'annotation',
      label: '怒り',
      iconSvg: ICONS.anger,
      create: (x, y) => ({
        kind: 'stamp',
        stampType: 'anger',
        x, y,
        size: 44,
        rotation: 0,
        flipX: false,
        color: '#ef4444'
      })
    },
    {
      id: 'stamp_zzz',
      category: 'annotation',
      label: 'すやすや',
      iconSvg: ICONS.zzz,
      create: (x, y) => ({
        kind: 'stamp',
        stampType: 'zzz',
        x, y,
        size: 46,
        rotation: 0,
        flipX: false,
        color: '#2563eb'
      })
    },
    {
      id: 'stamp_sweat',
      category: 'annotation',
      label: 'あせり',
      iconSvg: ICONS.sweat,
      create: (x, y) => ({
        kind: 'stamp',
        stampType: 'sweat',
        x, y,
        size: 38,
        rotation: 0,
        flipX: false,
        color: '#0ea5e9'
      })
    },
    {
      id: 'stamp_bang',
      category: 'annotation',
      label: '衝撃',
      iconSvg: ICONS.bang,
      create: (x, y) => ({
        kind: 'stamp',
        stampType: 'bang',
        x, y,
        size: 48,
        rotation: 0,
        flipX: false,
        color: '#f97316'
      })
    },
    {
      id: 'stamp_excl',
      category: 'annotation',
      label: 'ビックリ',
      iconSvg: ICONS.excl,
      create: (x, y) => ({
        kind: 'stamp',
        stampType: 'excl',
        x, y,
        size: 44,
        rotation: 0,
        flipX: false,
        color: '#ef4444'
      })
    },
    {
      id: 'stamp_paw',
      category: 'annotation',
      label: '肉球',
      iconSvg: ICONS.paw,
      create: (x, y) => ({
        kind: 'stamp',
        stampType: 'paw',
        x, y,
        size: 40,
        rotation: 0,
        flipX: false,
        color: '#f97316'
      })
    }
  ];

  // 作例（プリセットシーン）
  NS.SAMPLES = [
    {
      id: 'traffic-intersection',
      iconSvg: ICONS.road_cross,
      title: '信号ありの交差点（交通状況）',
      desc: '自分の車＋他の車3台＋信号機つきの十字路',
      ratio: '1:1',
      build: () => [
        {
          id: 't_road',
          kind: 'road',
          roadType: 'cross',
          x: 300,
          y: 300,
          w: 600,
          h: 600,
          rotation: 0,
          flipX: false,
          color: '#64748b',
          lanes: 1,
          crosswalk: true,
          stopLine: true
        },
        {
          id: 't_sig_v',
          kind: 'signal',
          x: 194,
          y: 196,
          w: 66,
          h: 26,
          rotation: 0,
          flipX: false,
          color: '#1e293b',
          state: 'green'
        },
        {
          id: 't_sig_h',
          kind: 'signal',
          x: 406,
          y: 404,
          w: 66,
          h: 26,
          rotation: Math.PI / 2,
          flipX: false,
          color: '#1e293b',
          state: 'red'
        },
        {
          id: 't_car_me',
          kind: 'furniture',
          furnitureType: 'car',
          x: 266,
          y: 454,
          w: 38,
          h: 72,
          rotation: 0,
          flipX: false,
          color: '#2563eb'
        },
        {
          id: 't_car_opp',
          kind: 'furniture',
          furnitureType: 'car',
          x: 326,
          y: 274,
          w: 38,
          h: 72,
          rotation: 2.6,
          flipX: false,
          color: '#ef4444'
        },
        {
          id: 't_car_other1',
          kind: 'furniture',
          furnitureType: 'car',
          x: 334,
          y: 122,
          w: 38,
          h: 72,
          rotation: Math.PI,
          flipX: false,
          color: '#475569'
        },
        {
          id: 't_car_other2',
          kind: 'furniture',
          furnitureType: 'car',
          x: 140,
          y: 334,
          w: 38,
          h: 72,
          rotation: Math.PI / 2,
          flipX: false,
          color: '#475569'
        },
        {
          id: 't_car_other3',
          kind: 'furniture',
          furnitureType: 'car',
          x: 460,
          y: 266,
          w: 38,
          h: 72,
          rotation: -Math.PI / 2,
          flipX: false,
          color: '#64748b'
        },
        {
          id: 't_arrow_me',
          kind: 'arrow',
          x: 266,
          y: 368,
          color: '#2563eb',
          start: { x: 0, y: 42 },
          ctrl: { x: 0, y: 0 },
          end: { x: 0, y: -42 }
        },
        {
          id: 't_arrow_opp',
          kind: 'arrow',
          x: 280,
          y: 310,
          color: '#ef4444',
          start: { x: 30, y: -12 },
          ctrl: { x: 2, y: 18 },
          end: { x: -46, y: 20 }
        },
        {
          id: 't_lbl_me',
          kind: 'text',
          textType: 'label',
          x: 184,
          y: 454,
          text: '自分の車',
          fontSize: 17,
          color: '#2563eb'
        },
        {
          id: 't_bubble_opp',
          kind: 'text',
          textType: 'bubble',
          x: 482,
          y: 150,
          text: '対向車が\n急に右折！',
          fontSize: 16,
          color: '#ef4444',
          tail: { x: -72, y: 74 }
        },
        {
          id: 't_title',
          kind: 'text',
          textType: 'label',
          x: 112,
          y: 46,
          text: '交差点の状況',
          fontSize: 20,
          color: '#0f172a'
        }
      ]
    },
    {
      id: 'bed-cat',
      iconSvg: ICONS.bed_top,
      title: 'ベッドを飼い猫に占領された夜',
      desc: '俯瞰ベッド＋大の字の猫＋端っこで縮こまる人間',
      ratio: '1:1',
      build: () => [
        {
          id: 's1',
          kind: 'furniture',
          furnitureType: 'bed_top',
          x: 295,
          y: 340,
          w: 270,
          h: 360,
          rotation: 0,
          flipX: false,
          color: '#0ea5e9'
        },
        {
          id: 's2',
          kind: 'rig',
          rigType: 'human',
          x: 215,
          y: 340,
          rotation: 0,
          flipX: false,
          color: '#1e293b',
          joints: cloneJoints(NS.HUMAN_POSES.cramped.joints)
        },
        {
          id: 's3',
          kind: 'rig',
          rigType: 'cat',
          x: 345,
          y: 340,
          rotation: 0.12,
          flipX: false,
          color: '#f97316',
          joints: cloneJoints(NS.CAT_POSES.sprawl.joints)
        },
        {
          id: 's4',
          kind: 'text',
          textType: 'bubble',
          x: 112,
          y: 162,
          text: '私のスペース\nここだけ…',
          fontSize: 17,
          color: '#1e293b',
          tail: { x: 64, y: 54 }
        },
        {
          id: 's5',
          kind: 'stamp',
          stampType: 'zzz',
          x: 416,
          y: 268,
          size: 44,
          rotation: 0,
          flipX: false,
          color: '#2563eb'
        },
        {
          id: 's6',
          kind: 'arrow',
          x: 410,
          y: 448,
          color: '#ef4444',
          start: { x: 52, y: 30 },
          ctrl: { x: 18, y: 12 },
          end: { x: -34, y: -44 }
        },
        {
          id: 's7',
          kind: 'text',
          textType: 'label',
          x: 492,
          y: 498,
          text: 'ど真ん中で大の字',
          fontSize: 17,
          color: '#ef4444'
        },
        {
          id: 's8',
          kind: 'text',
          textType: 'label',
          x: 300,
          y: 52,
          text: '昨夜のベッド状況（上から見た図）',
          fontSize: 22,
          color: '#0f172a'
        }
      ]
    },
    {
      id: 'desk-cat',
      iconSvg: ICONS.device,
      title: '作業中のキーボードに居座る猫',
      desc: '横から見たデスク＋PCの上の猫＋困る人間',
      ratio: '1:1',
      build: () => [
        {
          id: 'd1',
          kind: 'furniture',
          furnitureType: 'table',
          x: 395,
          y: 412,
          w: 240,
          h: 132,
          rotation: 0,
          flipX: false,
          color: '#64748b'
        },
        {
          id: 'd2',
          kind: 'furniture',
          furnitureType: 'chair',
          x: 170,
          y: 410,
          w: 100,
          h: 136,
          rotation: 0,
          flipX: false,
          color: '#64748b'
        },
        {
          id: 'd3',
          kind: 'furniture',
          furnitureType: 'device',
          x: 382,
          y: 314,
          w: 88,
          h: 60,
          rotation: 0,
          flipX: false,
          color: '#475569'
        },
        {
          id: 'd4',
          kind: 'rig',
          rigType: 'human',
          x: 205,
          y: 356,
          rotation: 0,
          flipX: false,
          color: '#1e293b',
          joints: cloneJoints(NS.HUMAN_POSES.sit.joints)
        },
        {
          id: 'd5',
          kind: 'rig',
          rigType: 'cat',
          x: 364,
          y: 306,
          rotation: 0,
          flipX: true,
          color: '#475569',
          joints: cloneJoints(NS.CAT_POSES.loaf.joints)
        },
        {
          id: 'd6',
          kind: 'text',
          textType: 'bubble',
          x: 156,
          y: 148,
          text: '仕事できない…',
          fontSize: 18,
          color: '#1e293b',
          tail: { x: 24, y: 58 }
        },
        {
          id: 'd7',
          kind: 'text',
          textType: 'label',
          x: 300,
          y: 54,
          text: 'テレワーク中の現状',
          fontSize: 22,
          color: '#0f172a'
        }
      ]
    },
    {
      id: 'blank',
      iconSvg: '<svg viewBox="0 0 36 36"><rect x="8" y="5" width="20" height="26" rx="3" fill="#fff" stroke="currentColor" stroke-width="2.2"/></svg>',
      title: 'まっさらなキャンバス',
      desc: 'ゼロから自由に配置して作図する',
      ratio: '1:1',
      build: () => []
    }
  ];

  NS.cloneJoints = cloneJoints;
})(window);
