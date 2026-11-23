/**
 * custom.js
 * カスタムオブジェクトの永続化（IndexedDB）、画像リサイズ最適化、JSONインポート/エクスポート。
 * 統一フォーマット: "kounatteta-object-v1"
 *   - kind: "custom-image"（1枚画像オブジェクト）
 *   - kind: "custom-rig"  （ボーン＋図形の白抜きピクトグラムJSON）
 */
(function (global) {
  'use strict';

  const NS = (global.SituDiagram = global.SituDiagram || {});

  const DB_NAME = 'kounatteta-custom-db';
  const DB_VERSION = 1;
  const STORE_NAME = 'objects';
  const FORMAT_ID = 'kounatteta-object-v1';

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in global)) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function listAll() {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => {
          const items = req.result || [];
          items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          resolve(items);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (_) {
      return [];
    }
  }

  async function saveItem(item) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(item);
      tx.oncomplete = () => resolve(item);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function deleteItem(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function makeCustomId() {
    return 'cust_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  // 画像ファイルを読み込み、共有しやすいサイズ（最大512px）にリサイズしてData URL化
  function fileToOptimizedImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      reader.onload = () => {
        const rawUrl = reader.result;
        const img = new Image();
        img.onerror = () => reject(new Error('対応していない画像形式です'));
        img.onload = () => {
          const natW = img.naturalWidth || 200;
          const natH = img.naturalHeight || 200;

          // キャンバス初期配置サイズ（最大180pxに収める）
          const initScale = Math.min(1, 180 / Math.max(natW, natH));
          const w = Math.max(48, Math.round(natW * initScale));
          const h = Math.max(48, Math.round(natH * initScale));

          // SVGはベクターのまま保持
          if (file.type === 'image/svg+xml') {
            resolve({ imageData: rawUrl, w, h });
            return;
          }

          // ラスター画像は最大512pxに縮小して軽量化（透過維持のためPNG）
          const maxDim = 512;
          const scale = Math.min(1, maxDim / Math.max(natW, natH));
          const outW = Math.max(1, Math.round(natW * scale));
          const outH = Math.max(1, Math.round(natH * scale));
          const c = document.createElement('canvas');
          c.width = outW;
          c.height = outH;
          const cctx = c.getContext('2d');
          cctx.drawImage(img, 0, 0, outW, outH);
          const dataUrl = c.toDataURL('image/png');
          resolve({ imageData: dataUrl, w, h });
        };
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  async function createFromImageFile(file) {
    const { imageData, w, h } = await fileToOptimizedImage(file);
    const baseName = (file.name || 'カスタム画像').replace(/\.[^.]+$/, '').slice(0, 18);
    const item = {
      format: FORMAT_ID,
      id: makeCustomId(),
      name: baseName || 'カスタム画像',
      kind: 'custom-image',
      imageData,
      w,
      h,
      createdAt: Date.now()
    };
    await saveItem(item);
    return item;
  }

  // 統一JSONフォーマットの検証・正規化
  function validateAndNormalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const name = String(raw.name || 'カスタム').trim().slice(0, 20) || 'カスタム';

    if (raw.kind === 'custom-image') {
      if (typeof raw.imageData !== 'string' || !raw.imageData.startsWith('data:image/')) {
        return null;
      }
      return {
        format: FORMAT_ID,
        id: makeCustomId(),
        name,
        kind: 'custom-image',
        imageData: raw.imageData,
        w: Math.max(36, Math.min(480, Number(raw.w) || 160)),
        h: Math.max(36, Math.min(480, Number(raw.h) || 160)),
        createdAt: Date.now()
      };
    }

    if (raw.kind === 'custom-rig') {
      if (!raw.joints || typeof raw.joints !== 'object') return null;
      const joints = {};
      for (const [k, pt] of Object.entries(raw.joints)) {
        if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
          joints[k] = { x: pt.x, y: pt.y };
        }
      }
      if (Object.keys(joints).length === 0) return null;

      const bones = Array.isArray(raw.bones)
        ? raw.bones.filter((b) => b && joints[b.from] && joints[b.to])
        : [];
      const shapes = Array.isArray(raw.shapes)
        ? raw.shapes.filter((s) => s && joints[s.at])
        : [];

      return {
        format: FORMAT_ID,
        id: makeCustomId(),
        name,
        kind: 'custom-rig',
        color: typeof raw.color === 'string' ? raw.color : '#1e293b',
        joints,
        bones,
        shapes,
        createdAt: Date.now()
      };
    }

    return null;
  }

  // JSON文字列またはファイルからインポート（単体・配列どちらにも対応）
  async function importFromJsonText(text) {
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const imported = [];
    for (const raw of list) {
      const normalized = validateAndNormalize(raw);
      if (normalized) {
        await saveItem(normalized);
        imported.push(normalized);
      }
    }
    if (imported.length === 0) {
      throw new Error('有効なカスタムオブジェクトJSONではありません');
    }
    return imported;
  }

  // 単体カスタムオブジェクトを共有用JSONファイルとしてダウンロード
  function exportItemAsJson(item) {
    const payload = Object.assign({ format: FORMAT_ID }, item);
    delete payload.createdAt;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (item.name || 'custom-object').replace(/[\\/:*?"<>|]/g, '_');
    a.download = `${safeName}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // 全カスタムオブジェクトを1つのバックアップJSONファイルとして書き出し
  async function exportAllAsJson() {
    const items = await listAll();
    if (items.length === 0) return 0;
    const payload = items.map((item) => {
      const copy = Object.assign({ format: FORMAT_ID }, item);
      delete copy.createdAt;
      return copy;
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.download = `kounatteta-custom-backup-${stamp}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return items.length;
  }

  // カスタムオブジェクト定義からキャンバス配置用インスタンスを生成
  function instantiateOnCanvas(item, x, y) {
    if (item.kind === 'custom-image') {
      return {
        kind: 'image',
        x, y,
        w: item.w || 160,
        h: item.h || 160,
        rotation: 0,
        flipX: false,
        color: '#1e293b',
        name: item.name,
        imageData: item.imageData
      };
    }
    if (item.kind === 'custom-rig') {
      return {
        kind: 'rig',
        rigType: 'custom',
        x, y,
        rotation: 0,
        flipX: false,
        color: item.color || '#1e293b',
        name: item.name,
        joints: NS.cloneJoints(item.joints),
        bones: JSON.parse(JSON.stringify(item.bones || [])),
        shapes: JSON.parse(JSON.stringify(item.shapes || []))
      };
    }
    return null;
  }

  // お試し用の見本カスタムボーンJSON（うさぎピクトグラム）
  function getSampleCustomRig() {
    return {
      format: FORMAT_ID,
      name: 'うさぎ（見本）',
      kind: 'custom-rig',
      color: '#ec4899',
      joints: {
        head: { x: 0, y: -32 },
        body: { x: 0, y: 14 },
        earL: { x: -16, y: -76 },
        earR: { x: 16, y: -76 },
        footL: { x: -16, y: 42 },
        footR: { x: 16, y: 42 },
        tail: { x: -24, y: 20 }
      },
      bones: [
        { from: 'head', to: 'earL', width: 11 },
        { from: 'head', to: 'earR', width: 11 },
        { from: 'head', to: 'body', width: 30 },
        { from: 'body', to: 'footL', width: 12 },
        { from: 'body', to: 'footR', width: 12 }
      ],
      shapes: [
        { type: 'circle', at: 'head', r: 19 },
        { type: 'circle', at: 'tail', r: 9 }
      ]
    };
  }

  NS.Custom = {
    FORMAT_ID,
    listAll,
    saveItem,
    deleteItem,
    makeCustomId,
    fileToOptimizedImage,
    createFromImageFile,
    importFromJsonText,
    exportItemAsJson,
    exportAllAsJson,
    instantiateOnCanvas,
    getSampleCustomRig
  };
})(window);
