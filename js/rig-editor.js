/**
 * rig-editor.js
 * アプリ内で関節（ボーン）・丸図形・パーツ画像を配置して
 * カスタムオブジェクト（kounatteta-object-v1）を作成・編集するエディタ。
 */
(function (global) {
  'use strict';

  const NS = (global.SituDiagram = global.SituDiagram || {});

  const EDITOR_W = 320;
  const EDITOR_H = 260;

  let initialized = false;
  let onSavedCallback = null;

  const ed = {
    editingId: null,
    mode: 'bone', // 'bone' | 'shape' | 'image'
    color: '#1e293b',
    boneWidth: 16,
    joints: {},
    bones: [],
    shapes: [],
    selectedJoint: null,
    selectedBoneIdx: -1,
    jointSeq: 1,
    history: []
  };

  let dragJoint = null;
  let dragMoved = false;
  let targetBoneForImage = -1;

  // DOM要素
  let dialog, canvas, ctx, inputName, inputWidth, outputWidth, hintEl;
  let btnUndo, btnClear, btnSave, inputBoneImage;

  function deepCloneState() {
    return JSON.parse(
      JSON.stringify({
        joints: ed.joints,
        bones: ed.bones,
        shapes: ed.shapes,
        selectedJoint: ed.selectedJoint,
        selectedBoneIdx: ed.selectedBoneIdx,
        jointSeq: ed.jointSeq
      })
    );
  }

  function pushHistory() {
    ed.history.push(deepCloneState());
    if (ed.history.length > 30) ed.history.shift();
    btnUndo.disabled = ed.history.length <= 1;
  }

  function undo() {
    if (ed.history.length <= 1) return;
    ed.history.pop();
    const prev = JSON.parse(JSON.stringify(ed.history[ed.history.length - 1]));
    ed.joints = prev.joints;
    ed.bones = prev.bones;
    ed.shapes = prev.shapes;
    ed.selectedJoint = prev.selectedJoint;
    ed.selectedBoneIdx = prev.selectedBoneIdx;
    ed.jointSeq = prev.jointSeq;
    btnUndo.disabled = ed.history.length <= 1;
    renderEditor();
  }

  function getPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * EDITOR_W - EDITOR_W / 2,
      y: ((e.clientY - rect.top) / rect.height) * EDITOR_H - EDITOR_H / 2
    };
  }

  function hitTestJoint(pt) {
    let best = null;
    let bestD = 20;
    for (const [key, j] of Object.entries(ed.joints)) {
      const d = Math.hypot(pt.x - j.x, pt.y - j.y);
      if (d <= bestD) {
        bestD = d;
        best = key;
      }
    }
    return best;
  }

  function distToSegment(p, a, b) {
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const lenSq = vx * vx + vy * vy;
    if (lenSq < 1e-4) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
  }

  function hitTestBone(pt) {
    let bestIdx = -1;
    let bestD = 18;
    ed.bones.forEach((b, idx) => {
      const a = ed.joints[b.from];
      const c = ed.joints[b.to];
      if (!a || !c) return;
      const d = distToSegment(pt, a, c);
      if (d <= bestD) {
        bestD = d;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }

  function updateModeHint() {
    if (ed.mode === 'bone') {
      hintEl.textContent = 'タップで関節を追加・接続、ドラッグで位置調整できます';
    } else if (ed.mode === 'shape') {
      hintEl.textContent = '関節をタップすると丸（頭など）のサイズを切替できます';
    } else {
      hintEl.textContent = 'ボーン（線）をタップしてパーツ画像を貼り付けできます';
    }
  }

  function renderEditor() {
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, EDITOR_W, EDITOR_H);

    // 方眼グリッド
    ctx.strokeStyle = '#eef2f6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 20; x < EDITOR_W; x += 20) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, EDITOR_H);
    }
    for (let y = 20; y < EDITOR_H; y += 20) {
      ctx.moveTo(0, y);
      ctx.lineTo(EDITOR_W, y);
    }
    ctx.stroke();

    // 中心十字ガイド
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(EDITOR_W / 2, 0);
    ctx.lineTo(EDITOR_W / 2, EDITOR_H);
    ctx.moveTo(0, EDITOR_H / 2);
    ctx.lineTo(EDITOR_W, EDITOR_H / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 本番と同じ2パス白抜きピクトグラム描画
    ctx.translate(EDITOR_W / 2, EDITOR_H / 2);
    NS.Renderer.drawCustomRig(ctx, {
      color: ed.color,
      joints: ed.joints,
      bones: ed.bones,
      shapes: ed.shapes
    });

    // 選択中ボーンのハイライト
    if (ed.selectedBoneIdx >= 0 && ed.bones[ed.selectedBoneIdx]) {
      const b = ed.bones[ed.selectedBoneIdx];
      const a = ed.joints[b.from];
      const c = ed.joints[b.to];
      if (a && c) {
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 関節ハンドル表示
    for (const [key, pt] of Object.entries(ed.joints)) {
      const isSel = key === ed.selectedJoint;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isSel ? 8.5 : 6.5, 0, Math.PI * 2);
      ctx.fillStyle = isSel ? '#2563eb' : '#64748b';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    ctx.restore();
  }

  function setupDom() {
    if (initialized) return;
    initialized = true;

    dialog = document.getElementById('dialog-rig-editor');
    canvas = document.getElementById('rig-editor-canvas');
    ctx = canvas.getContext('2d');
    inputName = document.getElementById('input-rig-name');
    inputWidth = document.getElementById('input-bone-width');
    outputWidth = document.getElementById('output-bone-width');
    hintEl = document.getElementById('rig-editor-hint');
    btnUndo = document.getElementById('btn-rig-undo');
    btnClear = document.getElementById('btn-rig-clear');
    btnSave = document.getElementById('btn-rig-save');
    inputBoneImage = document.getElementById('input-bone-image');

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = EDITOR_W * dpr;
    canvas.height = EDITOR_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // モード切替ボタン
    document.querySelectorAll('.rig-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        ed.mode = btn.dataset.mode;
        document.querySelectorAll('.rig-mode-btn').forEach((b) => {
          const active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-pressed', String(active));
        });
        updateModeHint();
      });
    });

    // ボーン太さスライダー
    inputWidth.addEventListener('input', () => {
      ed.boneWidth = Number(inputWidth.value) || 16;
      outputWidth.textContent = String(ed.boneWidth);
      if (ed.selectedBoneIdx >= 0 && ed.bones[ed.selectedBoneIdx]) {
        ed.bones[ed.selectedBoneIdx].width = ed.boneWidth;
        renderEditor();
      }
    });

    // キャンバス操作（Pointer Events）
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      canvas.setPointerCapture(e.pointerId);
      const pt = getPoint(e);
      const hitJ = hitTestJoint(pt);

      if (ed.mode === 'shape') {
        if (!hitJ) return;
        const idx = ed.shapes.findIndex((s) => s.at === hitJ);
        const sizes = [12, 20, 28];
        if (idx < 0) {
          ed.shapes.push({ type: 'circle', at: hitJ, r: sizes[0] });
        } else {
          const curIdx = sizes.indexOf(ed.shapes[idx].r);
          if (curIdx >= 0 && curIdx < sizes.length - 1) {
            ed.shapes[idx].r = sizes[curIdx + 1];
          } else {
            ed.shapes.splice(idx, 1);
          }
        }
        ed.selectedJoint = hitJ;
        pushHistory();
        renderEditor();
        return;
      }

      if (ed.mode === 'image') {
        const bIdx = hitTestBone(pt);
        if (bIdx < 0) return;
        ed.selectedBoneIdx = bIdx;
        targetBoneForImage = bIdx;
        renderEditor();
        inputBoneImage.value = '';
        inputBoneImage.click();
        return;
      }

      // モード: 'bone'
      if (hitJ) {
        // 別の関節が選択中ならボーンで接続（重複接続はしない）
        if (ed.selectedJoint && ed.selectedJoint !== hitJ) {
          const exists = ed.bones.some(
            (b) =>
              (b.from === ed.selectedJoint && b.to === hitJ) ||
              (b.from === hitJ && b.to === ed.selectedJoint)
          );
          if (!exists) {
            ed.bones.push({
              from: ed.selectedJoint,
              to: hitJ,
              width: ed.boneWidth
            });
            ed.selectedBoneIdx = ed.bones.length - 1;
            pushHistory();
          }
        }
        ed.selectedJoint = hitJ;
        dragJoint = hitJ;
        dragMoved = false;
        renderEditor();
      } else {
        // 新規関節を追加し、選択中関節があれば自動接続
        const newKey = 'j' + ed.jointSeq++;
        ed.joints[newKey] = { x: Math.round(pt.x), y: Math.round(pt.y) };
        if (ed.selectedJoint && ed.joints[ed.selectedJoint]) {
          ed.bones.push({
            from: ed.selectedJoint,
            to: newKey,
            width: ed.boneWidth
          });
          ed.selectedBoneIdx = ed.bones.length - 1;
        }
        ed.selectedJoint = newKey;
        dragJoint = newKey;
        dragMoved = false;
        pushHistory();
        renderEditor();
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!dragJoint || !ed.joints[dragJoint]) return;
      const pt = getPoint(e);
      ed.joints[dragJoint] = {
        x: Math.round(Math.max(-EDITOR_W / 2 + 12, Math.min(EDITOR_W / 2 - 12, pt.x))),
        y: Math.round(Math.max(-EDITOR_H / 2 + 12, Math.min(EDITOR_H / 2 - 12, pt.y)))
      };
      dragMoved = true;
      renderEditor();
    });

    function finishDrag() {
      if (dragJoint && dragMoved) {
        pushHistory();
      }
      dragJoint = null;
      dragMoved = false;
    }

    canvas.addEventListener('pointerup', finishDrag);
    canvas.addEventListener('pointercancel', finishDrag);

    // パーツ画像の読み込み
    inputBoneImage.addEventListener('change', async () => {
      const file = inputBoneImage.files && inputBoneImage.files[0];
      if (!file || targetBoneForImage < 0 || !ed.bones[targetBoneForImage]) return;
      try {
        const { imageData } = await NS.Custom.fileToOptimizedImage(file);
        ed.bones[targetBoneForImage].imageData = imageData;
        pushHistory();
        renderEditor();
        // 画像キャッシュの読み込み完了後に再描画
        setTimeout(renderEditor, 120);
      } catch (_) {
        // 読み込み失敗時は何もしない
      }
    });

    btnUndo.addEventListener('click', undo);

    btnClear.addEventListener('click', () => {
      ed.joints = {};
      ed.bones = [];
      ed.shapes = [];
      ed.selectedJoint = null;
      ed.selectedBoneIdx = -1;
      ed.jointSeq = 1;
      pushHistory();
      renderEditor();
    });

    btnSave.addEventListener('click', async () => {
      const keys = Object.keys(ed.joints);
      if (keys.length === 0) {
        hintEl.textContent = 'キャンバスをタップして関節を1つ以上置いてください';
        return;
      }

      // 関節の重心を (0, 0) にセンタリング
      let sumX = 0;
      let sumY = 0;
      for (const k of keys) {
        sumX += ed.joints[k].x;
        sumY += ed.joints[k].y;
      }
      const cx = sumX / keys.length;
      const cy = sumY / keys.length;
      const centeredJoints = {};
      for (const k of keys) {
        centeredJoints[k] = {
          x: Math.round(ed.joints[k].x - cx),
          y: Math.round(ed.joints[k].y - cy)
        };
      }

      const item = {
        format: NS.Custom.FORMAT_ID,
        id: ed.editingId || NS.Custom.makeCustomId(),
        name: (inputName.value || '').trim().slice(0, 20) || 'カスタムボーン',
        kind: 'custom-rig',
        color: ed.color || '#1e293b',
        joints: centeredJoints,
        bones: JSON.parse(JSON.stringify(ed.bones)),
        shapes: JSON.parse(JSON.stringify(ed.shapes)),
        createdAt: Date.now()
      };

      await NS.Custom.saveItem(item);
      dialog.close();
      if (typeof onSavedCallback === 'function') {
        onSavedCallback(item);
      }
    });
  }

  function open(existingItem, onSaved) {
    setupDom();
    onSavedCallback = onSaved;

    if (existingItem && existingItem.kind === 'custom-rig') {
      ed.editingId = existingItem.id;
      ed.color = existingItem.color || '#1e293b';
      ed.joints = NS.cloneJoints(existingItem.joints || {});
      ed.bones = JSON.parse(JSON.stringify(existingItem.bones || []));
      ed.shapes = JSON.parse(JSON.stringify(existingItem.shapes || []));
      const keys = Object.keys(ed.joints);
      ed.selectedJoint = keys[keys.length - 1] || null;
      ed.selectedBoneIdx = ed.bones.length - 1;
      ed.jointSeq = keys.length + 1;
      inputName.value = existingItem.name || '';
    } else {
      ed.editingId = null;
      ed.color = '#1e293b';
      ed.joints = {};
      ed.bones = [];
      ed.shapes = [];
      ed.selectedJoint = null;
      ed.selectedBoneIdx = -1;
      ed.jointSeq = 1;
      inputName.value = '';
    }

    ed.mode = 'bone';
    ed.boneWidth = 16;
    inputWidth.value = '16';
    outputWidth.textContent = '16';
    document.querySelectorAll('.rig-mode-btn').forEach((b) => {
      const active = b.dataset.mode === 'bone';
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    updateModeHint();

    ed.history = [];
    pushHistory();
    renderEditor();
    dialog.showModal();
  }

  NS.RigEditor = { open };
})(window);
