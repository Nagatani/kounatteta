/**
 * app.js
 * アプリの状態管理、Pointer Events によるドラッグ＆ドロップ、UI連携、PNG書き出し。
 */
(function (global) {
  'use strict';

  const NS = global.SituDiagram;
  const Renderer = NS.Renderer;

  const FALLBACK_VERSION = '1.2.0';
  let appVersion = FALLBACK_VERSION;
  const STORAGE_KEY = 'situ-diagram-state-v4';
  const RATIOS = [
    { id: '1:1', label: '1:1', width: 600, height: 600 },
    { id: '4:3', label: '4:3', width: 600, height: 450 },
    { id: '3:4', label: '3:4', width: 540, height: 720 }
  ];

  // アプリ状態
  const state = {
    ratioIndex: 0,
    width: 600,
    height: 600,
    showGrid: true,
    objects: [],
    selectedId: null,
    history: [],
    historyIndex: -1,
    activeCategory: 'character'
  };

  // DOM要素
  const canvas = document.getElementById('diagram-canvas');
  const ctx = canvas.getContext('2d');
  const stageArea = document.getElementById('stage-area');
  const hintToast = document.getElementById('hint-toast');

  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  const btnRatio = document.getElementById('btn-ratio');
  const btnGrid = document.getElementById('btn-grid');
  const btnExport = document.getElementById('btn-export');

  const barDefault = document.getElementById('bar-default');
  const barSelected = document.getElementById('bar-selected');
  const btnSelPose = document.getElementById('btn-sel-pose');
  const btnSelConfig = document.getElementById('btn-sel-config');
  const btnSelConfigLabel = document.getElementById('btn-sel-config-label');
  const btnSelEditText = document.getElementById('btn-sel-edit-text');
  const btnSelColor = document.getElementById('btn-sel-color');
  const selColorDot = document.getElementById('sel-color-dot');

  const dialogAdd = document.getElementById('dialog-add');
  const templateGrid = document.getElementById('template-grid');
  const customPanel = document.getElementById('custom-panel');
  const customGrid = document.getElementById('custom-grid');
  const customEmpty = document.getElementById('custom-empty');
  const btnCustomCreateRig = document.getElementById('btn-custom-create-rig');
  const btnCustomAddImage = document.getElementById('btn-custom-add-image');
  const btnCustomImportJson = document.getElementById('btn-custom-import-json');
  const btnCustomAddSample = document.getElementById('btn-custom-add-sample');
  const inputCustomImage = document.getElementById('input-custom-image');
  const inputCustomJson = document.getElementById('input-custom-json');
  const dialogPose = document.getElementById('dialog-pose');
  const posePresetGrid = document.getElementById('pose-preset-grid');
  const dialogConfig = document.getElementById('dialog-config');
  const dialogConfigTitle = document.getElementById('dialog-config-title');
  const configSheetBody = document.getElementById('config-sheet-body');
  const dialogColor = document.getElementById('dialog-color');
  const colorGrid = document.getElementById('color-grid');
  const dialogText = document.getElementById('dialog-text');
  const inputObjText = document.getElementById('input-obj-text');
  const inputFontSize = document.getElementById('input-font-size');
  const outputFontSize = document.getElementById('output-font-size');
  const dialogSamples = document.getElementById('dialog-samples');
  const sampleList = document.getElementById('sample-list');
  const dialogExport = document.getElementById('dialog-export');
  const exportPreviewImg = document.getElementById('export-preview-img');
  const btnDownloadPng = document.getElementById('btn-download-png');
  const btnSharePng = document.getElementById('btn-share-png');
  const btnCopyPng = document.getElementById('btn-copy-png');
  const dialogClear = document.getElementById('dialog-clear');

  // アプリ管理・PWAメニュー関連
  const btnAppMenu = document.getElementById('btn-app-menu');
  const updateDot = document.getElementById('update-dot');
  const dialogAppMenu = document.getElementById('dialog-app-menu');
  const appInfoVersion = document.getElementById('app-info-version');
  const appInfoMode = document.getElementById('app-info-mode');
  const appInfoSw = document.getElementById('app-info-sw');
  const appInfoPersist = document.getElementById('app-info-persist');
  const btnPwaInstall = document.getElementById('btn-pwa-install');
  const btnPwaApplyUpdate = document.getElementById('btn-pwa-apply-update');
  const btnPwaCheckUpdate = document.getElementById('btn-pwa-check-update');
  const btnBackupCustom = document.getElementById('btn-backup-custom');
  const btnClearCache = document.getElementById('btn-clear-cache');
  const btnResetStorage = document.getElementById('btn-reset-storage');
  const pwaInstallHint = document.getElementById('pwa-install-hint');

  // 汎用確認ダイアログ
  const dialogConfirm = document.getElementById('dialog-confirm');
  const dialogConfirmTitle = document.getElementById('dialog-confirm-title');
  const dialogConfirmDesc = document.getElementById('dialog-confirm-desc');
  const btnConfirmOk = document.getElementById('btn-confirm-ok');

  let swRegistration = null;
  let deferredInstallPrompt = null;
  let isReloadingForUpdate = false;

  let displayScale = 1;
  let toastTimer = null;
  let lastExportBlob = null;
  let lastExportUrl = null;

  // ドラッグ操作の状態
  let drag = null;
  let lastTap = { time: 0, id: null };

  // --- ユーティリティ ---
  function uid() {
    return 'obj_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function deepClone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function getSelected() {
    return state.objects.find((o) => o.id === state.selectedId) || null;
  }

  function showToast(msg) {
    hintToast.textContent = msg;
    hintToast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      hintToast.classList.remove('visible');
    }, 2200);
  }

  // ネイティブ <dialog> による汎用確認ダイアログ
  function confirmAction({ title, message, confirmLabel }) {
    return new Promise((resolve) => {
      dialogConfirmTitle.textContent = title;
      dialogConfirmDesc.textContent = message;
      btnConfirmOk.textContent = confirmLabel || '実行する';

      function handleClose() {
        const result = dialogConfirm.returnValue === 'confirm';
        dialogConfirm.returnValue = '';
        dialogConfirm.removeEventListener('close', handleClose);
        resolve(result);
      }

      dialogConfirm.addEventListener('close', handleClose);
      dialogConfirm.showModal();
    });
  }

  // --- 履歴（Undo / Redo）＆自動保存 ---
  function commitHistory() {
    const snapshot = deepClone(state.objects);
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    if (state.history.length > 40) {
      state.history.shift();
    }
    state.historyIndex = state.history.length - 1;
    updateHistoryButtons();
    saveToStorage();
  }

  function undo() {
    if (state.historyIndex <= 0) return;
    state.historyIndex--;
    state.objects = deepClone(state.history[state.historyIndex]);
    if (!getSelected()) state.selectedId = null;
    updateUI();
    render();
    saveToStorage();
  }

  function redo() {
    if (state.historyIndex >= state.history.length - 1) return;
    state.historyIndex++;
    state.objects = deepClone(state.history[state.historyIndex]);
    if (!getSelected()) state.selectedId = null;
    updateUI();
    render();
    saveToStorage();
  }

  function updateHistoryButtons() {
    btnUndo.disabled = state.historyIndex <= 0;
    btnRedo.disabled = state.historyIndex >= state.history.length - 1;
  }

  function saveToStorage() {
    try {
      const payload = {
        ratioIndex: state.ratioIndex,
        showGrid: state.showGrid,
        objects: state.objects
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {
      // プライベートブラウズ等の保存失敗は無視
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.objects)) return false;
      state.ratioIndex = typeof parsed.ratioIndex === 'number' ? parsed.ratioIndex % RATIOS.length : 0;
      const ratio = RATIOS[state.ratioIndex];
      state.width = ratio.width;
      state.height = ratio.height;
      state.showGrid = parsed.showGrid !== false;
      state.objects = parsed.objects;
      return true;
    } catch (_) {
      return false;
    }
  }

  // --- キャンバスリサイズ＆描画 ---
  function resizeCanvas() {
    const rect = stageArea.getBoundingClientRect();
    const availW = Math.max(200, rect.width - 24);
    const availH = Math.max(200, rect.height - 24);

    displayScale = Math.min(availW / state.width, availH / state.height);
    const cssW = Math.floor(state.width * displayScale);
    const cssH = Math.floor(state.height * displayScale);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    ctx.setTransform((canvas.width / state.width), 0, 0, (canvas.height / state.height), 0, 0);
    render();
  }

  function render() {
    Renderer.renderScene(ctx, state, { forExport: false });
  }

  // ポインタのイベント座標をキャンバス論理座標へ変換
  function getCanvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * state.width,
      y: ((e.clientY - rect.top) / rect.height) * state.height
    };
  }

  // --- UI更新 ---
  function updateUI() {
    updateHistoryButtons();
    const ratio = RATIOS[state.ratioIndex];
    btnRatio.textContent = ratio.label;
    btnGrid.setAttribute('aria-pressed', String(state.showGrid));

    const sel = getSelected();
    if (!sel) {
      barDefault.hidden = false;
      barSelected.hidden = true;
      return;
    }

    barDefault.hidden = true;
    barSelected.hidden = false;
    btnSelPose.hidden = !(sel.kind === 'rig' && sel.rigType !== 'custom');
    btnSelEditText.hidden = sel.kind !== 'text';
    btnSelColor.hidden = sel.kind === 'image';
    if (sel.kind === 'road') {
      btnSelConfig.hidden = false;
      btnSelConfigLabel.textContent = '道路設定';
    } else if (sel.kind === 'signal') {
      btnSelConfig.hidden = false;
      btnSelConfigLabel.textContent = '信号色';
    } else {
      btnSelConfig.hidden = true;
    }
    selColorDot.style.setProperty('--dot-color', sel.color || '#1e293b');
  }

  // --- Pointer Events（タッチ＆マウス共通のドラッグ＆ドロップ） ---
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    canvas.setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    const sel = getSelected();

    // 1. 選択中オブジェクトのハンドル判定を最優先
    if (sel) {
      const handle = Renderer.hitTestHandles(ctx, sel, pt.x, pt.y);
      if (handle) {
        drag = {
          pointerId: e.pointerId,
          mode: handle.type,
          handleKey: handle.key,
          obj: sel,
          startPt: pt,
          origObj: deepClone(sel),
          moved: false
        };
        canvas.classList.add('dragging');
        return;
      }
    }

    // 2. オブジェクト本体のヒット判定
    const hit = Renderer.hitTestObjects(ctx, state.objects, pt.x, pt.y);
    if (hit) {
      // ダブルタップ判定（テキスト編集）
      const now = Date.now();
      if (lastTap.id === hit.id && now - lastTap.time < 350 && hit.kind === 'text') {
        lastTap = { time: 0, id: null };
        state.selectedId = hit.id;
        updateUI();
        render();
        openTextDialog();
        return;
      }
      lastTap = { time: now, id: hit.id };

      state.selectedId = hit.id;
      updateUI();
      render();

      drag = {
        pointerId: e.pointerId,
        mode: 'move',
        obj: hit,
        startPt: pt,
        origObj: deepClone(hit),
        moved: false
      };
      canvas.classList.add('dragging');
    } else {
      // 何もない場所をタップ → 選択解除
      if (state.selectedId) {
        state.selectedId = null;
        updateUI();
        render();
      }
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const pt = getCanvasPoint(e);
    const dx = pt.x - drag.startPt.x;
    const dy = pt.y - drag.startPt.y;
    if (Math.hypot(dx, dy) > 2) drag.moved = true;

    const obj = drag.obj;

    if (drag.mode === 'move') {
      obj.x = drag.origObj.x + dx;
      obj.y = drag.origObj.y + dy;
    } else if (drag.mode === 'joint') {
      const lp = Renderer.worldToLocal(obj, pt.x, pt.y);
      obj.joints[drag.handleKey] = { x: lp.x, y: lp.y };
    } else if (drag.mode === 'rotate') {
      const rawAngle = Math.atan2(pt.y - obj.y, pt.x - obj.x) + Math.PI / 2;
      // 0°, ±90°, 180° 付近で軽く吸着
      const snapStep = Math.PI / 2;
      const nearest = Math.round(rawAngle / snapStep) * snapStep;
      obj.rotation = Math.abs(rawAngle - nearest) < 0.08 ? nearest : rawAngle;
    } else if (drag.mode === 'resize') {
      const lp = Renderer.worldToLocal(obj, pt.x, pt.y);
      obj.w = Math.max(36, Math.min(state.width * 1.2, Math.abs(lp.x) * 2));
      obj.h = Math.max(16, Math.min(state.height * 1.2, Math.abs(lp.y) * 2));
    } else if (drag.mode === 'resize-stamp') {
      const lp = Renderer.worldToLocal(obj, pt.x, pt.y);
      obj.size = Math.max(24, Math.min(160, Math.max(Math.abs(lp.x), Math.abs(lp.y)) * 2));
    } else if (drag.mode === 'arrow-pt') {
      const lp = Renderer.worldToLocal(obj, pt.x, pt.y);
      obj[drag.handleKey] = { x: lp.x, y: lp.y };
    } else if (drag.mode === 'tail') {
      const lp = Renderer.worldToLocal(obj, pt.x, pt.y);
      obj.tail = { x: lp.x, y: lp.y };
    }

    render();
  });

  function endDrag(e) {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const moved = drag.moved;
    drag = null;
    canvas.classList.remove('dragging');
    if (moved) {
      commitHistory();
    }
  }

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // --- 追加シート ---
  function renderTemplateGrid() {
    if (state.activeCategory === 'custom') {
      templateGrid.hidden = true;
      customPanel.hidden = false;
      renderCustomGrid();
      return;
    }
    templateGrid.hidden = false;
    customPanel.hidden = true;
    templateGrid.innerHTML = '';
    const items = NS.TEMPLATES.filter((t) => t.category === state.activeCategory);
    for (const tpl of items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'template-card';
      btn.innerHTML = `<span class="template-icon" aria-hidden="true">${tpl.iconSvg}</span><span class="template-label">${tpl.label}</span>`;
      btn.addEventListener('click', () => {
        const isRoad = tpl.id.startsWith('road_');
        const cx = isRoad ? state.width / 2 : state.width / 2 + (Math.random() * 40 - 20);
        const cy = isRoad ? state.height / 2 : state.height / 2 + (Math.random() * 40 - 20);
        const newObj = tpl.create(cx, cy);
        newObj.id = uid();
        if (newObj.kind === 'road') {
          newObj.w = state.width;
          newObj.h = state.height;
          state.objects.unshift(newObj);
        } else {
          state.objects.push(newObj);
        }
        state.selectedId = newObj.id;
        dialogAdd.close();
        updateUI();
        render();
        commitHistory();
        if (newObj.kind === 'rig') {
          showToast('青い丸をドラッグして手足や頭を動かせます');
        } else if (newObj.kind === 'road') {
          showToast('下部の「道路設定」で形状・車線・横断歩道を切替できます');
        } else if (newObj.kind === 'signal') {
          showToast('下部の「信号色」で青・黄・赤・右折矢印を切替できます');
        } else if (newObj.kind === 'furniture') {
          showToast('角の丸でサイズ変更、緑の丸で回転できます');
        } else if (newObj.kind === 'text') {
          showToast('ダブルタップまたは「文字編集」で書き換えられます');
        }
      });
      templateGrid.appendChild(btn);
    }
  }

  // --- カスタムオブジェクト管理（画像読込・JSON共有） ---
  async function renderCustomGrid() {
    const items = await NS.Custom.listAll();
    customGrid.innerHTML = '';
    customEmpty.hidden = items.length > 0;

    for (const item of items) {
      const card = document.createElement('div');
      card.className = 'custom-card';

      const mainBtn = document.createElement('button');
      mainBtn.type = 'button';
      mainBtn.className = 'custom-card-main';

      if (item.kind === 'custom-image') {
        const img = document.createElement('img');
        img.className = 'custom-thumb';
        img.src = item.imageData;
        img.alt = '';
        mainBtn.appendChild(img);
      } else {
        const badge = document.createElement('span');
        badge.className = 'custom-badge';
        badge.textContent = 'ボーンJSON';
        mainBtn.appendChild(badge);
      }

      const label = document.createElement('span');
      label.className = 'template-label';
      label.textContent = item.name || 'カスタム';
      mainBtn.appendChild(label);

      mainBtn.addEventListener('click', () => {
        const cx = state.width / 2 + (Math.random() * 40 - 20);
        const cy = state.height / 2 + (Math.random() * 40 - 20);
        const newObj = NS.Custom.instantiateOnCanvas(item, cx, cy);
        if (!newObj) return;
        newObj.id = uid();
        state.objects.push(newObj);
        state.selectedId = newObj.id;
        dialogAdd.close();
        updateUI();
        render();
        commitHistory();
        showToast(
          newObj.kind === 'rig'
            ? '青い丸をドラッグして関節を動かせます'
            : '角の丸でサイズ変更、緑の丸で回転できます'
        );
      });

      const footer = document.createElement('div');
      footer.className = 'custom-card-footer' + (item.kind === 'custom-rig' ? ' cols-3' : '');

      if (item.kind === 'custom-rig') {
        const btnEdit = document.createElement('button');
        btnEdit.type = 'button';
        btnEdit.className = 'custom-mini-btn';
        btnEdit.textContent = '編集';
        btnEdit.setAttribute('aria-label', `${item.name}を編集`);
        btnEdit.addEventListener('click', () => {
          NS.RigEditor.open(item, async (saved) => {
            await renderCustomGrid();
            showToast(`「${saved.name}」を更新しました`);
          });
        });
        footer.appendChild(btnEdit);
      }

      const btnExportJson = document.createElement('button');
      btnExportJson.type = 'button';
      btnExportJson.className = 'custom-mini-btn';
      btnExportJson.textContent = 'JSON';
      btnExportJson.setAttribute('aria-label', `${item.name}をJSONで書き出す`);
      btnExportJson.addEventListener('click', () => {
        NS.Custom.exportItemAsJson(item);
        showToast(`「${item.name}」をJSONで書き出しました`);
      });

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'custom-mini-btn danger';
      btnDel.textContent = '削除';
      btnDel.setAttribute('aria-label', `${item.name}を削除`);
      btnDel.addEventListener('click', async () => {
        const ok = await confirmAction({
          title: `「${item.name}」を削除しますか？`,
          message: '登録したカスタムオブジェクトが削除されます。この操作は元に戻せません。',
          confirmLabel: '削除する'
        });
        if (!ok) return;
        await NS.Custom.deleteItem(item.id);
        renderCustomGrid();
        showToast(`「${item.name}」を削除しました`);
      });

      footer.appendChild(btnExportJson);
      footer.appendChild(btnDel);
      card.appendChild(mainBtn);
      card.appendChild(footer);
      customGrid.appendChild(card);
    }
  }

  btnCustomCreateRig.addEventListener('click', () => {
    NS.RigEditor.open(null, async (saved) => {
      await renderCustomGrid();
      showToast(`「${saved.name}」を登録しました（タップで配置）`);
    });
  });

  btnCustomAddImage.addEventListener('click', () => {
    inputCustomImage.value = '';
    inputCustomImage.click();
  });

  inputCustomImage.addEventListener('change', async () => {
    const file = inputCustomImage.files && inputCustomImage.files[0];
    if (!file) return;
    try {
      const item = await NS.Custom.createFromImageFile(file);
      await renderCustomGrid();
      showToast(`画像「${item.name}」を登録しました（タップで配置）`);
    } catch (err) {
      showToast(err.message || '画像の読み込みに失敗しました');
    }
  });

  btnCustomImportJson.addEventListener('click', () => {
    inputCustomJson.value = '';
    inputCustomJson.click();
  });

  inputCustomJson.addEventListener('change', async () => {
    const file = inputCustomJson.files && inputCustomJson.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = await NS.Custom.importFromJsonText(text);
      await renderCustomGrid();
      showToast(`${imported.length}件のカスタムJSONを読み込みました`);
    } catch (err) {
      showToast(err.message || 'JSONの読み込みに失敗しました');
    }
  });

  btnCustomAddSample.addEventListener('click', async () => {
    try {
      const sampleJson = JSON.stringify(NS.Custom.getSampleCustomRig());
      await NS.Custom.importFromJsonText(sampleJson);
      await renderCustomGrid();
      showToast('見本「うさぎ（関節あり）」を登録しました');
    } catch (_) {
      showToast('見本の追加に失敗しました');
    }
  });

  document.querySelectorAll('.tab-btn').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.activeCategory = tab.dataset.cat;
      document.querySelectorAll('.tab-btn').forEach((b) => {
        const active = b === tab;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      });
      renderTemplateGrid();
    });
  });

  document.getElementById('btn-open-add').addEventListener('click', () => {
    renderTemplateGrid();
    dialogAdd.showModal();
  });

  // --- ポーズ選択シート ---
  btnSelPose.addEventListener('click', () => {
    const sel = getSelected();
    if (!sel || sel.kind !== 'rig') return;

    let poses = {};
    if (sel.rigType === 'human') poses = NS.HUMAN_POSES;
    else if (sel.rigType === 'cat') poses = NS.CAT_POSES;
    else if (sel.rigType === 'dog') poses = NS.DOG_POSES;

    posePresetGrid.innerHTML = '';
    for (const [, pose] of Object.entries(poses)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-btn';
      btn.textContent = pose.label;
      btn.addEventListener('click', () => {
        sel.joints = NS.cloneJoints(pose.joints);
        render();
        commitHistory();
        dialogPose.close();
      });
      posePresetGrid.appendChild(btn);
    }

    dialogPose.showModal();
  });

  // --- 道路・信号設定シート ---
  function renderConfigSheet(sel) {
    configSheetBody.innerHTML = '';

    function addSection(title, options, currentVal, onSelect) {
      const sec = document.createElement('div');
      sec.className = 'sheet-section';
      const h3 = document.createElement('h3');
      h3.textContent = title;
      const grid = document.createElement('div');
      grid.className = 'chip-grid';
      for (const opt of options) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip-btn' + (currentVal === opt.value ? ' active' : '');
        btn.textContent = opt.label;
        btn.addEventListener('click', () => {
          onSelect(opt.value);
          render();
          commitHistory();
          renderConfigSheet(sel);
        });
        grid.appendChild(btn);
      }
      sec.appendChild(h3);
      sec.appendChild(grid);
      configSheetBody.appendChild(sec);
    }

    if (sel.kind === 'road') {
      dialogConfigTitle.textContent = '道路・交差点の設定';
      addSection(
        '道路の形',
        [
          { value: 'cross', label: '十字路' },
          { value: 't_junction', label: 'T字路' },
          { value: 'straight', label: '直線道路' }
        ],
        sel.roadType || 'cross',
        (v) => { sel.roadType = v; }
      );
      addSection(
        '車線数',
        [
          { value: 1, label: '片側1車線' },
          { value: 2, label: '片側2車線' }
        ],
        sel.lanes === 2 ? 2 : 1,
        (v) => { sel.lanes = v; }
      );
      addSection(
        '横断歩道',
        [
          { value: true, label: 'あり' },
          { value: false, label: 'なし' }
        ],
        Boolean(sel.crosswalk),
        (v) => { sel.crosswalk = v; }
      );
      addSection(
        '停止線',
        [
          { value: true, label: 'あり' },
          { value: false, label: 'なし' }
        ],
        Boolean(sel.stopLine),
        (v) => { sel.stopLine = v; }
      );
    } else if (sel.kind === 'signal') {
      dialogConfigTitle.textContent = '信号機の状態';
      addSection(
        '点灯ランプ',
        [
          { value: 'green', label: '青' },
          { value: 'yellow', label: '黄' },
          { value: 'red', label: '赤' },
          { value: 'red_right', label: '赤＋右折矢印' }
        ],
        sel.state || 'green',
        (v) => { sel.state = v; }
      );
    }
  }

  btnSelConfig.addEventListener('click', () => {
    const sel = getSelected();
    if (!sel || (sel.kind !== 'road' && sel.kind !== 'signal')) return;
    renderConfigSheet(sel);
    dialogConfig.showModal();
  });

  // --- 色選択シート ---
  btnSelColor.addEventListener('click', () => {
    const sel = getSelected();
    if (!sel) return;
    colorGrid.innerHTML = '';
    for (const hex of NS.COLOR_PALETTE) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'color-swatch' + (sel.color === hex ? ' active' : '');
      btn.style.setProperty('--swatch-color', hex);
      btn.setAttribute('aria-label', '色 ' + hex);
      btn.addEventListener('click', () => {
        sel.color = hex;
        updateUI();
        render();
        commitHistory();
        dialogColor.close();
      });
      colorGrid.appendChild(btn);
    }
    dialogColor.showModal();
  });

  // --- テキスト編集ダイアログ ---
  function openTextDialog() {
    const sel = getSelected();
    if (!sel || sel.kind !== 'text') return;
    inputObjText.value = sel.text || '';
    inputFontSize.value = String(sel.fontSize || 18);
    outputFontSize.textContent = inputFontSize.value;
    dialogText.showModal();
  }

  btnSelEditText.addEventListener('click', openTextDialog);
  inputFontSize.addEventListener('input', () => {
    outputFontSize.textContent = inputFontSize.value;
  });

  dialogText.addEventListener('close', () => {
    const action = dialogText.returnValue;
    dialogText.returnValue = '';
    if (action !== 'save') return;
    const sel = getSelected();
    if (!sel || sel.kind !== 'text') return;
    sel.text = inputObjText.value.trim() || ' ';
    sel.fontSize = Number(inputFontSize.value) || 18;
    render();
    commitHistory();
  });

  // --- 選択アクション（反転・前面・背面・複製・削除） ---
  document.getElementById('btn-sel-flip').addEventListener('click', () => {
    const sel = getSelected();
    if (!sel) return;
    sel.flipX = !sel.flipX;
    render();
    commitHistory();
  });

  document.getElementById('btn-sel-front').addEventListener('click', () => {
    const idx = state.objects.findIndex((o) => o.id === state.selectedId);
    if (idx < 0 || idx === state.objects.length - 1) return;
    const [item] = state.objects.splice(idx, 1);
    state.objects.push(item);
    render();
    commitHistory();
  });

  document.getElementById('btn-sel-back').addEventListener('click', () => {
    const idx = state.objects.findIndex((o) => o.id === state.selectedId);
    if (idx <= 0) return;
    const [item] = state.objects.splice(idx, 1);
    state.objects.unshift(item);
    render();
    commitHistory();
  });

  document.getElementById('btn-sel-duplicate').addEventListener('click', () => {
    const sel = getSelected();
    if (!sel) return;
    const copy = deepClone(sel);
    copy.id = uid();
    copy.x += 24;
    copy.y += 24;
    state.objects.push(copy);
    state.selectedId = copy.id;
    updateUI();
    render();
    commitHistory();
  });

  document.getElementById('btn-sel-delete').addEventListener('click', () => {
    const idx = state.objects.findIndex((o) => o.id === state.selectedId);
    if (idx < 0) return;
    state.objects.splice(idx, 1);
    state.selectedId = null;
    updateUI();
    render();
    commitHistory();
  });

  // --- 上部バー操作（Undo / Redo / 比率 / グリッド） ---
  btnUndo.addEventListener('click', undo);
  btnRedo.addEventListener('click', redo);

  btnRatio.addEventListener('click', () => {
    state.ratioIndex = (state.ratioIndex + 1) % RATIOS.length;
    const ratio = RATIOS[state.ratioIndex];
    state.width = ratio.width;
    state.height = ratio.height;
    updateUI();
    resizeCanvas();
    saveToStorage();
    showToast(`キャンバス比率を ${ratio.label} に変更しました`);
  });

  btnGrid.addEventListener('click', () => {
    state.showGrid = !state.showGrid;
    updateUI();
    render();
    saveToStorage();
  });

  // --- サンプル選択 ---
  document.getElementById('btn-open-samples').addEventListener('click', () => {
    sampleList.innerHTML = '';
    for (const s of NS.SAMPLES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sample-item';
      btn.innerHTML = `
        <span class="template-icon" aria-hidden="true">${s.iconSvg}</span>
        <span class="sample-meta">
          <span class="sample-title">${s.title}</span>
          <span class="sample-desc">${s.desc}</span>
        </span>
      `;
      btn.addEventListener('click', () => {
        const rIdx = RATIOS.findIndex((r) => r.id === s.ratio);
        state.ratioIndex = rIdx >= 0 ? rIdx : 0;
        state.width = RATIOS[state.ratioIndex].width;
        state.height = RATIOS[state.ratioIndex].height;
        state.objects = s.build();
        state.selectedId = null;
        dialogSamples.close();
        updateUI();
        resizeCanvas();
        commitHistory();
        showToast(`「${s.title}」を読み込みました`);
      });
      sampleList.appendChild(btn);
    }
    dialogSamples.showModal();
  });

  // --- 全消去 ---
  document.getElementById('btn-clear-all').addEventListener('click', () => {
    if (state.objects.length === 0) return;
    dialogClear.showModal();
  });

  dialogClear.addEventListener('close', () => {
    const action = dialogClear.returnValue;
    dialogClear.returnValue = '';
    if (action !== 'clear') return;
    state.objects = [];
    state.selectedId = null;
    updateUI();
    render();
    commitHistory();
    showToast('キャンバスをクリアしました');
  });

  // --- PNG画像書き出し＆共有 ---
  btnExport.addEventListener('click', () => {
    // 2倍解像度のオフスクリーンキャンバスでくっきり書き出し
    const scale = 2;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = state.width * scale;
    outCanvas.height = state.height * scale;
    const outCtx = outCanvas.getContext('2d');
    outCtx.scale(scale, scale);

    Renderer.renderScene(outCtx, state, { forExport: true });

    if (lastExportUrl) URL.revokeObjectURL(lastExportUrl);

    outCanvas.toBlob((blob) => {
      if (!blob) return;
      lastExportBlob = blob;
      lastExportUrl = URL.createObjectURL(blob);
      exportPreviewImg.src = lastExportUrl;

      // スマホのネイティブ共有シート対応チェック
      const testFile = new File([blob], 'kounatteta.png', { type: 'image/png' });
      const canShareFile =
        typeof navigator.canShare === 'function' && navigator.canShare({ files: [testFile] });
      btnSharePng.hidden = !canShareFile;

      dialogExport.showModal();
    }, 'image/png');
  });

  btnDownloadPng.addEventListener('click', () => {
    if (!lastExportUrl) return;
    const a = document.createElement('a');
    a.href = lastExportUrl;
    a.download = `kounatteta-${Date.now()}.png`;
    a.click();
    showToast('PNG画像を保存しました');
  });

  btnSharePng.addEventListener('click', async () => {
    if (!lastExportBlob || typeof navigator.share !== 'function') return;
    try {
      const file = new File([lastExportBlob], 'kounatteta.png', { type: 'image/png' });
      await navigator.share({
        title: 'こうなってた',
        files: [file]
      });
    } catch (_) {
      // キャンセル時は何もしない
    }
  });

  btnCopyPng.addEventListener('click', async () => {
    if (!lastExportBlob || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
      showToast('このブラウザは画像コピーに未対応です。保存をご利用ください');
      return;
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': lastExportBlob })]);
      showToast('クリップボードにコピーしました');
    } catch (_) {
      showToast('コピーに失敗しました。保存をご利用ください');
    }
  });

  // --- キーボードショートカット（PCで調整するとき用） ---
  window.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]')) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedId) {
      e.preventDefault();
      document.getElementById('btn-sel-delete').click();
    }
  });

  // --- <dialog closedby="any"> のフォールバック（Safari等向け） ---
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const outside = (e, dialog) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (e) => {
        pressedOutside = outside(e, dialog);
      });
      dialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && outside(e, dialog)) dialog.close();
      });
    }
  }

  // --- PWA管理・更新・キャッシュクリア ---
  function isStandaloneMode() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  // manifest.json の version を設定元として動的に読み込む
  async function loadManifestVersion() {
    try {
      const link = document.querySelector('link[rel="manifest"]');
      const url = (link && link.getAttribute('href')) || './manifest.json';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const manifest = await res.json();
      if (manifest && typeof manifest.version === 'string' && manifest.version.trim()) {
        appVersion = manifest.version.trim();
        appInfoVersion.textContent = 'v' + appVersion;
      }
    } catch (_) {
      // file:// 起動時などはフォールバック値を使用
    }
  }

  // Persistent Storage API でストレージ自動削除からの保護をリクエスト
  async function ensurePersistentStorage() {
    if (!navigator.storage || typeof navigator.storage.persisted !== 'function') {
      appInfoPersist.textContent = '標準保存';
      return;
    }
    try {
      let persisted = await navigator.storage.persisted();
      if (!persisted && typeof navigator.storage.persist === 'function') {
        persisted = await navigator.storage.persist();
      }
      appInfoPersist.textContent = persisted ? '保護済み（永続）' : '通常（ブラウザ管理）';
    } catch (_) {
      appInfoPersist.textContent = '通常（ブラウザ管理）';
    }
  }

  function refreshAppMenuStatus() {
    appInfoVersion.textContent = 'v' + appVersion;
    const standalone = isStandaloneMode();
    appInfoMode.textContent = standalone ? 'PWA（アプリ起動）' : 'ブラウザ表示';
    pwaInstallHint.hidden = standalone || Boolean(deferredInstallPrompt);
    btnPwaInstall.hidden = !deferredInstallPrompt;

    const hasWaiting = Boolean(swRegistration && swRegistration.waiting);
    updateDot.hidden = !hasWaiting;
    btnPwaApplyUpdate.hidden = !hasWaiting;

    if (!('serviceWorker' in navigator)) {
      appInfoSw.textContent = '未対応ブラウザ';
    } else if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      appInfoSw.textContent = 'ローカルファイル起動';
    } else if (hasWaiting) {
      appInfoSw.textContent = '新しいバージョンあり';
    } else if (swRegistration && swRegistration.active) {
      appInfoSw.textContent = '有効（最新）';
    } else {
      appInfoSw.textContent = '準備中';
    }
  }

  function applySwUpdate() {
    if (!swRegistration || !swRegistration.waiting) return;
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    showToast('最新バージョンを適用しています...');
  }

  function setupPwa() {
    // Android Chrome等のインストールプロンプトを保持
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      refreshAppMenuStatus();
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      refreshAppMenuStatus();
      showToast('ホーム画面に追加されました');
    });

    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;

    // 新しい Service Worker が有効になったら自動で再読み込み
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (isReloadingForUpdate) return;
      isReloadingForUpdate = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        swRegistration = reg;
        refreshAppMenuStatus();

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              refreshAppMenuStatus();
              showToast('新しいバージョンがあります（タイトルをタップして更新）');
            }
          });
        });
      })
      .catch(() => {
        refreshAppMenuStatus();
      });
  }

  btnAppMenu.addEventListener('click', () => {
    refreshAppMenuStatus();
    loadManifestVersion();
    ensurePersistentStorage();
    dialogAppMenu.showModal();
  });

  btnBackupCustom.addEventListener('click', async () => {
    try {
      const count = await NS.Custom.exportAllAsJson();
      if (count === 0) {
        showToast('バックアップするカスタムオブジェクトがありません');
      } else {
        showToast(`${count}件のカスタムオブジェクトを書き出しました`);
      }
    } catch (_) {
      showToast('バックアップの書き出しに失敗しました');
    }
  });

  btnPwaInstall.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    refreshAppMenuStatus();
  });

  btnPwaApplyUpdate.addEventListener('click', () => {
    dialogAppMenu.close();
    applySwUpdate();
  });

  btnPwaCheckUpdate.addEventListener('click', async () => {
    if (!swRegistration) {
      showToast('Service Worker が有効な環境（HTTPS / localhost）で利用できます');
      return;
    }
    try {
      await swRegistration.update();
      refreshAppMenuStatus();
      if (swRegistration.waiting) {
        showToast('新しいバージョンが見つかりました');
      } else {
        showToast('すでに最新バージョンです');
      }
    } catch (_) {
      showToast('更新の確認に失敗しました（オフラインの可能性があります）');
    }
  });

  btnClearCache.addEventListener('click', async () => {
    const ok = await confirmAction({
      title: 'アプリキャッシュを削除しますか？',
      message: '保存されているアプリのキャッシュをすべて削除し、最新ファイルを再読み込みします（作成中の図解データは残ります）。',
      confirmLabel: '削除して再読込'
    });
    if (!ok) return;

    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (_) {
      // 無視してリロード続行
    }
    dialogAppMenu.close();
    window.location.reload();
  });

  btnResetStorage.addEventListener('click', async () => {
    const ok = await confirmAction({
      title: '自動保存データを初期化しますか？',
      message: '現在キャンバスに自動保存されている図解データが削除され、初期状態に戻ります。この操作は元に戻せません。',
      confirmLabel: '初期化する'
    });
    if (!ok) return;

    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('situ-diagram-state-')) {
          localStorage.removeItem(key);
        }
      }
    } catch (_) {
      // 無視
    }
    state.objects = NS.SAMPLES[0].build();
    state.selectedId = null;
    state.ratioIndex = 0;
    state.width = RATIOS[0].width;
    state.height = RATIOS[0].height;
    dialogAppMenu.close();
    updateUI();
    resizeCanvas();
    commitHistory();
    showToast('自動保存データを初期化しました');
  });

  // --- 初期化 ---
  function init() {
    Renderer.setOnImageLoaded(render);
    const loaded = loadFromStorage();
    if (!loaded) {
      // 初回は「信号ありの交差点」サンプルを表示
      state.objects = NS.SAMPLES[0].build();
    }
    updateUI();
    resizeCanvas();
    commitHistory();
    showToast('タップして選択・ドラッグで移動や設定ができます');
    loadManifestVersion();
    ensurePersistentStorage();
    setupPwa();
  }

  window.addEventListener('resize', resizeCanvas);
  init();
})(window);
