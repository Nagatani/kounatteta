/**
 * renderer.js
 * ピクトグラム調の Canvas 2D 描画エンジンおよび座標変換・ヒットテスト。
 */
(function (global) {
  'use strict';

  const NS = (global.SituDiagram = global.SituDiagram || {});

  // 座標変換ヘルパー（オブジェクトのローカル座標 <-> キャンバス論理座標）
  function localToWorld(obj, lx, ly) {
    const sx = obj.flipX ? -1 : 1;
    const x = lx * sx;
    const y = ly;
    const rad = obj.rotation || 0;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: obj.x + x * cos - y * sin,
      y: obj.y + x * sin + y * cos
    };
  }

  function worldToLocal(obj, wx, wy) {
    const dx = wx - obj.x;
    const dy = wy - obj.y;
    const rad = -(obj.rotation || 0);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return {
      x: obj.flipX ? -rx : rx,
      y: ry
    };
  }

  // テキストの寸法計測（複数行対応）
  function measureTextBox(ctx, obj) {
    const fontSize = obj.fontSize || 18;
    const lines = String(obj.text || '').split('\n');
    ctx.save();
    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif`;
    let maxW = 0;
    for (const line of lines) {
      const w = ctx.measureText(line || ' ').width;
      if (w > maxW) maxW = w;
    }
    ctx.restore();
    const lineH = fontSize * 1.35;
    const padX = obj.textType === 'bubble' ? 18 : 10;
    const padY = obj.textType === 'bubble' ? 12 : 6;
    return {
      lines,
      lineH,
      w: Math.max(48, maxW + padX * 2),
      h: Math.max(36, lines.length * lineH + padY * 2)
    };
  }

  // オブジェクトのローカル境界ボックスを取得
  function getLocalBounds(ctx, obj) {
    if (obj.kind === 'furniture') {
      return {
        minX: -obj.w / 2,
        maxX: obj.w / 2,
        minY: -obj.h / 2,
        maxY: obj.h / 2
      };
    }
    if (obj.kind === 'stamp') {
      const half = (obj.size || 42) / 2;
      return { minX: -half, maxX: half, minY: -half, maxY: half };
    }
    if (obj.kind === 'rig') {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const k of Object.keys(obj.joints)) {
        const pt = obj.joints[k];
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
      const pad = 26;
      return { minX: minX - pad, maxX: maxX + pad, minY: minY - pad, maxY: maxY + pad };
    }
    if (obj.kind === 'text') {
      const box = measureTextBox(ctx, obj);
      return { minX: -box.w / 2, maxX: box.w / 2, minY: -box.h / 2, maxY: box.h / 2 };
    }
    if (obj.kind === 'arrow') {
      const pts = [obj.start, obj.ctrl, obj.end];
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const pt of pts) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
      return { minX: minX - 18, maxX: maxX + 18, minY: minY - 18, maxY: maxY + 18 };
    }
    return { minX: -30, maxX: 30, minY: -30, maxY: 30 };
  }

  function roundedRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
  }

  function hexToRgba(hex, alpha) {
    const clean = (hex || '#1e293b').replace('#', '');
    if (clean.length !== 6) return `rgba(30, 41, 59, ${alpha})`;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // --- 白抜き枠線ピクトグラム人間の描画（2パス描画で継ぎ目のないアウトライン） ---
  function drawHuman(ctx, obj) {
    const j = obj.joints;
    const color = obj.color || '#1e293b';
    const border = 4; // 枠線の太さ

    // 胴体の向きに直交する左右単位ベクトル
    const dx = j.hip.x - j.shoulder.x;
    const dy = j.hip.y - j.shoulder.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const shL = { x: j.shoulder.x + nx * 10, y: j.shoulder.y + ny * 10 };
    const shR = { x: j.shoulder.x - nx * 10, y: j.shoulder.y - ny * 10 };
    const hipL = { x: j.hip.x + nx * 8, y: j.hip.y + ny * 8 };
    const hipR = { x: j.hip.x - nx * 8, y: j.hip.y - ny * 8 };

    function strokeBody(strokeColor, extraW) {
      ctx.strokeStyle = strokeColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 胴体
      ctx.beginPath();
      ctx.moveTo(j.shoulder.x, j.shoulder.y);
      ctx.lineTo(j.hip.x, j.hip.y);
      ctx.lineWidth = 32 + extraW;
      ctx.stroke();

      // 両腕
      ctx.lineWidth = 13 + extraW;
      ctx.beginPath();
      ctx.moveTo(shL.x, shL.y);
      ctx.lineTo(j.elbowL.x, j.elbowL.y);
      ctx.lineTo(j.handL.x, j.handL.y);
      ctx.moveTo(shR.x, shR.y);
      ctx.lineTo(j.elbowR.x, j.elbowR.y);
      ctx.lineTo(j.handR.x, j.handR.y);
      ctx.stroke();

      // 両脚
      ctx.lineWidth = 15 + extraW;
      ctx.beginPath();
      ctx.moveTo(hipL.x, hipL.y);
      ctx.lineTo(j.kneeL.x, j.kneeL.y);
      ctx.lineTo(j.footL.x, j.footL.y);
      ctx.moveTo(hipR.x, hipR.y);
      ctx.lineTo(j.kneeR.x, j.kneeR.y);
      ctx.lineTo(j.footR.x, j.footR.y);
      ctx.stroke();
    }

    ctx.save();
    // パス1: 外枠
    strokeBody(color, border * 2);
    // パス2: 白抜き内側
    strokeBody('#ffffff', 0);

    // 頭（白抜き＋枠線の真円）
    ctx.beginPath();
    ctx.arc(j.head.x, j.head.y, 23, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = border;
    ctx.stroke();

    ctx.restore();
  }

  // --- 白抜き枠線ピクトグラム猫の描画（2パス描画） ---
  function drawCat(ctx, obj) {
    const j = obj.joints;
    const color = obj.color || '#f97316';
    const border = 3.8;

    const legs = [
      [j.chest, j.pawFL],
      [j.chest, j.pawFR],
      [j.hip, j.pawBL],
      [j.hip, j.pawBR]
    ];

    function drawCatSilhouette(col, extraW) {
      ctx.fillStyle = col;
      ctx.strokeStyle = col;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // しっぽ
      ctx.beginPath();
      ctx.moveTo(j.hip.x, j.hip.y);
      ctx.quadraticCurveTo(j.tailMid.x, j.tailMid.y, j.tailTip.x, j.tailTip.y);
      ctx.lineWidth = 8.5 + extraW;
      ctx.stroke();

      // 4本足
      ctx.lineWidth = 10 + extraW;
      ctx.beginPath();
      for (const [from, to] of legs) {
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
      }
      ctx.stroke();

      // 胴体
      ctx.beginPath();
      ctx.moveTo(j.chest.x, j.chest.y);
      ctx.lineTo(j.hip.x, j.hip.y);
      ctx.lineWidth = 32 + extraW;
      ctx.stroke();

      // 頭＋耳
      const hx = j.head.x;
      const hy = j.head.y;
      const r = 17 + extraW / 2;

      // 左耳
      ctx.beginPath();
      ctx.moveTo(hx - 14, hy - 4);
      ctx.lineTo(hx - 15, hy - 26);
      ctx.lineTo(hx - 1, hy - 15);
      ctx.closePath();
      ctx.fill();
      if (extraW > 0) {
        ctx.lineWidth = extraW;
        ctx.stroke();
      }

      // 右耳
      ctx.beginPath();
      ctx.moveTo(hx + 14, hy - 4);
      ctx.lineTo(hx + 15, hy - 26);
      ctx.lineTo(hx + 1, hy - 15);
      ctx.closePath();
      ctx.fill();
      if (extraW > 0) {
        ctx.lineWidth = extraW;
        ctx.stroke();
      }

      // 頭丸
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    // パス1: 外枠
    drawCatSilhouette(color, border * 2);
    // パス2: 白抜き内側
    drawCatSilhouette('#ffffff', 0);
    ctx.restore();
  }

  // --- 白抜き枠線ピクトグラム犬の描画（2パス描画） ---
  function drawDog(ctx, obj) {
    const j = obj.joints;
    const color = obj.color || '#92400e';
    const border = 3.8;

    const legs = [
      [j.chest, j.pawFL],
      [j.chest, j.pawFR],
      [j.hip, j.pawBL],
      [j.hip, j.pawBR]
    ];

    function drawDogSilhouette(col, extraW) {
      ctx.fillStyle = col;
      ctx.strokeStyle = col;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // しっぽ
      ctx.beginPath();
      ctx.moveTo(j.hip.x, j.hip.y);
      ctx.lineTo(j.tailTip.x, j.tailTip.y);
      ctx.lineWidth = 9.5 + extraW;
      ctx.stroke();

      // 4本足
      ctx.lineWidth = 11 + extraW;
      ctx.beginPath();
      for (const [from, to] of legs) {
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
      }
      ctx.stroke();

      // 胴体
      ctx.beginPath();
      ctx.moveTo(j.chest.x, j.chest.y);
      ctx.lineTo(j.hip.x, j.hip.y);
      ctx.lineWidth = 34 + extraW;
      ctx.stroke();

      // 頭＋マズル
      const hx = j.head.x;
      const hy = j.head.y;
      ctx.beginPath();
      ctx.arc(hx, hy, 17 + extraW / 2, 0, Math.PI * 2);
      ctx.fill();

      roundedRectPath(
        ctx,
        hx + 6 - extraW / 2,
        hy - 3 - extraW / 2,
        19 + extraW,
        13 + extraW,
        6 + extraW / 2
      );
      ctx.fill();
    }

    ctx.save();
    // パス1: 外枠
    drawDogSilhouette(color, border * 2);
    // パス2: 白抜き内側
    drawDogSilhouette('#ffffff', 0);

    // 垂れ耳（白抜き＋枠線で前面に重ねる）
    ctx.beginPath();
    ctx.ellipse(j.head.x - 7, j.head.y + 5, 7, 14, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = border;
    ctx.stroke();

    ctx.restore();
  }

  // --- ピクトグラム家具・モノの描画 ---
  function drawFurniture(ctx, obj) {
    const w = obj.w;
    const h = obj.h;
    const x = -w / 2;
    const y = -h / 2;
    const color = obj.color || '#0ea5e9';

    ctx.save();
    switch (obj.furnitureType) {
      case 'bed_top': {
        // 俯瞰ベッド（上に人や猫を乗せても見やすいフラットピクトグラム）
        roundedRectPath(ctx, x, y, w, h, 14);
        ctx.fillStyle = hexToRgba(color, 0.1);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.stroke();

        // ヘッドボード（上端の単色バー）
        const headH = Math.min(20, h * 0.08);
        roundedRectPath(ctx, x, y, w, headH, 8);
        ctx.fillStyle = color;
        ctx.fill();

        // 枕（角丸ピクト）
        const pillowY = y + headH + Math.min(14, h * 0.045);
        const pillowH = Math.min(44, h * 0.15);
        const pillowW = Math.min(w * 0.54, 128);
        roundedRectPath(ctx, -pillowW / 2, pillowY, pillowW, pillowH, 12);
        ctx.fillStyle = hexToRgba(color, 0.24);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();

        // 掛け布団エリア（下側フラット2トーン）
        const quiltY = y + h * 0.36;
        const quiltH = h * 0.61;
        roundedRectPath(ctx, x + 8, quiltY, w - 16, quiltH, 10);
        ctx.fillStyle = hexToRgba(color, 0.22);
        ctx.fill();

        // 布団折り返しの太い区切りバー
        roundedRectPath(ctx, x + 8, quiltY, w - 16, 16, 6);
        ctx.fillStyle = hexToRgba(color, 0.42);
        ctx.fill();
        break;
      }

      case 'bed_side': {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        // マットレスベース
        const matY = y + h * 0.48;
        const matH = h * 0.28;
        roundedRectPath(ctx, x + 16, matY, w - 30, matH, 8);
        ctx.fill();
        ctx.stroke();
        // 枕
        roundedRectPath(ctx, x + 22, matY - 22, Math.min(54, w * 0.22), 20, 9);
        ctx.fill();
        ctx.stroke();
        // 掛け布団
        roundedRectPath(ctx, x + w * 0.32, matY - 10, w * 0.61, matH * 0.65, 10);
        ctx.fillStyle = hexToRgba(color, 0.14);
        ctx.fill();
        ctx.stroke();
        // ヘッドボード・フットボード
        ctx.fillStyle = '#ffffff';
        roundedRectPath(ctx, x, y + h * 0.08, 16, h * 0.92, 6);
        ctx.fill();
        ctx.stroke();
        roundedRectPath(ctx, x + w - 14, y + h * 0.38, 14, h * 0.62, 6);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'futon': {
        roundedRectPath(ctx, x, y, w, h, 14);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.8;
        ctx.stroke();
        // 折り返しライン
        roundedRectPath(ctx, x + 2, y + 2, w - 4, 24, 10);
        ctx.fillStyle = hexToRgba(color, 0.16);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 26);
        ctx.lineTo(x + w - 2, y + 26);
        ctx.stroke();
        break;
      }

      case 'table': {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        const topH = Math.min(18, h * 0.2);
        const legW = 12;
        roundedRectPath(ctx, x + 16, y + topH, legW, h - topH, 4);
        ctx.fill();
        ctx.stroke();
        roundedRectPath(ctx, x + w - 28, y + topH, legW, h - topH, 4);
        ctx.fill();
        ctx.stroke();
        roundedRectPath(ctx, x, y, w, topH, 5);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'sofa': {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        // 背もたれ
        roundedRectPath(ctx, x + 14, y, w - 28, h * 0.5, 10);
        ctx.fill();
        ctx.stroke();
        // 座面
        roundedRectPath(ctx, x + 16, y + h * 0.44, w - 32, h * 0.5, 8);
        ctx.fillStyle = hexToRgba(color, 0.12);
        ctx.fill();
        ctx.stroke();
        // ひじ掛け（左右）
        ctx.fillStyle = '#ffffff';
        roundedRectPath(ctx, x, y + h * 0.24, 18, h * 0.76, 8);
        ctx.fill();
        ctx.stroke();
        roundedRectPath(ctx, x + w - 18, y + h * 0.24, 18, h * 0.76, 8);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'chair': {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        // 脚
        roundedRectPath(ctx, x + 4, y + h * 0.6, 10, h * 0.4, 4);
        ctx.fill();
        ctx.stroke();
        roundedRectPath(ctx, x + w - 14, y + h * 0.6, 10, h * 0.4, 4);
        ctx.fill();
        ctx.stroke();
        // 背もたれ
        roundedRectPath(ctx, x, y, 13, h * 0.56, 5);
        ctx.fill();
        ctx.stroke();
        // 座面
        roundedRectPath(ctx, x, y + h * 0.5, w, 13, 5);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'wall': {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        roundedRectPath(ctx, x, y, w, h, 4);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'device': {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        roundedRectPath(ctx, x + w * 0.14, y + 2, w * 0.72, h * 0.68, 6);
        ctx.fill();
        ctx.stroke();
        roundedRectPath(ctx, x, y + h * 0.74, w, h * 0.24, 5);
        ctx.fill();
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  // --- ピクトグラム記号スタンプの描画 ---
  function drawStamp(ctx, obj) {
    const s = (obj.size || 42) / 36; // 36x36座標系からスケーリング
    const color = obj.color || '#ef4444';

    ctx.save();
    ctx.scale(s, s);
    ctx.translate(-18, -18);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (obj.stampType) {
      case 'anger': {
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(13, 6); ctx.quadraticCurveTo(15, 14, 6, 14);
        ctx.moveTo(23, 6); ctx.quadraticCurveTo(21, 14, 30, 14);
        ctx.moveTo(13, 30); ctx.quadraticCurveTo(15, 22, 6, 22);
        ctx.moveTo(23, 30); ctx.quadraticCurveTo(21, 22, 30, 22);
        ctx.stroke();
        break;
      }
      case 'zzz': {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(6, 22); ctx.lineTo(15, 22); ctx.lineTo(6, 31); ctx.lineTo(15, 31);
        ctx.moveTo(15, 14); ctx.lineTo(23, 14); ctx.lineTo(15, 21); ctx.lineTo(23, 21);
        ctx.moveTo(22, 6); ctx.lineTo(29, 6); ctx.lineTo(22, 12); ctx.lineTo(29, 12);
        ctx.stroke();
        break;
      }
      case 'sweat': {
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(18, 4);
        ctx.bezierCurveTo(18, 4, 28, 16, 28, 23);
        ctx.arc(18, 23, 10, 0, Math.PI, false);
        ctx.bezierCurveTo(8, 16, 18, 4, 18, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'bang': {
        const pts = [
          [18, 3], [21.5, 12], [31, 8.5], [25.5, 17], [33, 22.5],
          [23.5, 23.5], [25.5, 33], [18, 26.5], [10.5, 33],
          [12.5, 23.5], [3, 22.5], [10.5, 17], [5, 8.5], [14.5, 12]
        ];
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'excl': {
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2.8;
        roundedRectPath(ctx, 15, 5, 6, 17, 3);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(18, 28, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'paw': {
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2.6;
        const toes = [[10, 14.5], [18, 10], [26, 14.5]];
        for (const [tx, ty] of toes) {
          ctx.beginPath();
          ctx.arc(tx, ty, 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.ellipse(18, 23, 8.5, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  // --- 矢印の描画 ---
  function drawArrow(ctx, obj) {
    const s = obj.start;
    const c = obj.ctrl;
    const e = obj.end;
    const color = obj.color || '#ef4444';

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.quadraticCurveTo(c.x, c.y, e.x, e.y);
    ctx.stroke();

    const angle = Math.atan2(e.y - c.y, e.x - c.x);
    const headLen = 16;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x - headLen * Math.cos(angle - 0.5), e.y - headLen * Math.sin(angle - 0.5));
    ctx.lineTo(e.x - headLen * Math.cos(angle + 0.5), e.y - headLen * Math.sin(angle + 0.5));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // --- テキスト・吹き出しの描画 ---
  function drawTextObj(ctx, obj) {
    const box = measureTextBox(ctx, obj);
    const fontSize = obj.fontSize || 18;
    const color = obj.color || '#1e293b';

    ctx.save();
    if (obj.textType === 'bubble') {
      const rx = -box.w / 2;
      const ry = -box.h / 2;
      const tail = obj.tail || { x: -20, y: box.h / 2 + 24 };

      const baseAngle = Math.atan2(tail.y, tail.x);
      const bx1 = Math.cos(baseAngle + 0.35) * 14;
      const by1 = Math.sin(baseAngle + 0.35) * 14;
      const bx2 = Math.cos(baseAngle - 0.35) * 14;
      const by2 = Math.sin(baseAngle - 0.35) * 14;

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.2;
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(bx1, by1);
      ctx.lineTo(tail.x, tail.y);
      ctx.lineTo(bx2, by2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      roundedRectPath(ctx, rx, ry, box.w, box.h, 14);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(bx1, by1);
      ctx.lineTo(tail.x * 0.72, tail.y * 0.72);
      ctx.lineTo(bx2, by2);
      ctx.closePath();
      ctx.fill();
    } else if (obj.textType === 'label') {
      roundedRectPath(ctx, -box.w / 2, -box.h / 2, box.w, box.h, 8);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fill();
    }

    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const startY = -((box.lines.length - 1) * box.lineH) / 2;
    box.lines.forEach((line, idx) => {
      ctx.fillText(line, 0, startY + idx * box.lineH);
    });
    ctx.restore();
  }

  // --- 選択ハンドル群の取得（キャンバス論理座標） ---
  function getHandles(ctx, obj) {
    const handles = [];
    if (obj.kind === 'rig') {
      for (const key of Object.keys(obj.joints)) {
        const pt = obj.joints[key];
        const w = localToWorld(obj, pt.x, pt.y);
        handles.push({ type: 'joint', key, x: w.x, y: w.y });
      }
      const b = getLocalBounds(ctx, obj);
      const rotPt = localToWorld(obj, 0, b.minY - 26);
      handles.push({ type: 'rotate', key: 'rotate', x: rotPt.x, y: rotPt.y });
    } else if (obj.kind === 'furniture') {
      const hw = obj.w / 2;
      const hh = obj.h / 2;
      const corners = [
        ['nw', -hw, -hh],
        ['ne', hw, -hh],
        ['se', hw, hh],
        ['sw', -hw, hh]
      ];
      for (const [key, cx, cy] of corners) {
        const w = localToWorld(obj, cx, cy);
        handles.push({ type: 'resize', key, x: w.x, y: w.y });
      }
      const rotPt = localToWorld(obj, 0, -hh - 28);
      handles.push({ type: 'rotate', key: 'rotate', x: rotPt.x, y: rotPt.y });
    } else if (obj.kind === 'stamp') {
      const half = (obj.size || 42) / 2;
      const corners = [
        ['nw', -half, -half],
        ['ne', half, -half],
        ['se', half, half],
        ['sw', -half, half]
      ];
      for (const [key, cx, cy] of corners) {
        const w = localToWorld(obj, cx, cy);
        handles.push({ type: 'resize-stamp', key, x: w.x, y: w.y });
      }
      const rotPt = localToWorld(obj, 0, -half - 26);
      handles.push({ type: 'rotate', key: 'rotate', x: rotPt.x, y: rotPt.y });
    } else if (obj.kind === 'arrow') {
      for (const key of ['start', 'ctrl', 'end']) {
        const pt = obj[key];
        const w = localToWorld(obj, pt.x, pt.y);
        handles.push({ type: 'arrow-pt', key, x: w.x, y: w.y });
      }
    } else if (obj.kind === 'text' && obj.textType === 'bubble') {
      const tail = obj.tail || { x: -20, y: 46 };
      const w = localToWorld(obj, tail.x, tail.y);
      handles.push({ type: 'tail', key: 'tail', x: w.x, y: w.y });
    }
    return handles;
  }

  // --- 選択枠・ハンドルの描画 ---
  function drawSelectionOverlay(ctx, obj) {
    ctx.save();
    const b = getLocalBounds(ctx, obj);

    if (obj.kind !== 'arrow') {
      ctx.save();
      ctx.translate(obj.x, obj.y);
      ctx.rotate(obj.rotation || 0);
      if (obj.flipX) ctx.scale(-1, 1);

      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 5]);
      ctx.strokeRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
      ctx.setLineDash([]);

      if (obj.kind === 'rig' || obj.kind === 'furniture' || obj.kind === 'stamp') {
        const topY = obj.kind === 'furniture' ? -obj.h / 2 : b.minY;
        const rotOffset = obj.kind === 'furniture' ? 28 : 26;
        ctx.beginPath();
        ctx.moveTo(0, topY);
        ctx.lineTo(0, topY - rotOffset);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      const s = localToWorld(obj, obj.start.x, obj.start.y);
      const c = localToWorld(obj, obj.ctrl.x, obj.ctrl.y);
      const e = localToWorld(obj, obj.end.x, obj.end.y);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const handles = getHandles(ctx, obj);
    for (const h of handles) {
      ctx.beginPath();
      const radius = h.type === 'rotate' ? 10 : 8.5;
      ctx.arc(h.x, h.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = h.type === 'rotate' ? '#10b981' : '#2563eb';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- メイン描画関数 ---
  function renderScene(ctx, state, options) {
    const opts = options || {};
    const { width, height, objects, selectedId, showGrid } = state;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    if (showGrid && !opts.forExport) {
      ctx.strokeStyle = '#eef2f6';
      ctx.lineWidth = 1;
      const step = 30;
      ctx.beginPath();
      for (let x = step; x < width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = step; y < height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    }

    for (const obj of objects) {
      ctx.save();
      ctx.translate(obj.x, obj.y);
      ctx.rotate(obj.rotation || 0);
      if (obj.flipX) ctx.scale(-1, 1);

      if (obj.kind === 'rig') {
        if (obj.rigType === 'human') drawHuman(ctx, obj);
        else if (obj.rigType === 'cat') drawCat(ctx, obj);
        else if (obj.rigType === 'dog') drawDog(ctx, obj);
      } else if (obj.kind === 'furniture') {
        drawFurniture(ctx, obj);
      } else if (obj.kind === 'stamp') {
        drawStamp(ctx, obj);
      } else if (obj.kind === 'arrow') {
        drawArrow(ctx, obj);
      } else if (obj.kind === 'text') {
        drawTextObj(ctx, obj);
      }
      ctx.restore();
    }

    if (!opts.forExport && selectedId) {
      const sel = objects.find((o) => o.id === selectedId);
      if (sel) {
        drawSelectionOverlay(ctx, sel);
      }
    }

    ctx.restore();
  }

  function hitTestHandles(ctx, obj, wx, wy) {
    const handles = getHandles(ctx, obj);
    const hitRadius = 24;
    let best = null;
    let bestDist = hitRadius;
    for (const h of handles) {
      const d = Math.hypot(wx - h.x, wy - h.y);
      if (d <= bestDist) {
        bestDist = d;
        best = h;
      }
    }
    return best;
  }

  function hitTestObjects(ctx, objects, wx, wy) {
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      const lp = worldToLocal(obj, wx, wy);
      const b = getLocalBounds(ctx, obj);
      const pad = 10;
      if (
        lp.x >= b.minX - pad &&
        lp.x <= b.maxX + pad &&
        lp.y >= b.minY - pad &&
        lp.y <= b.maxY + pad
      ) {
        return obj;
      }
    }
    return null;
  }

  NS.Renderer = {
    renderScene,
    localToWorld,
    worldToLocal,
    hitTestHandles,
    hitTestObjects,
    getLocalBounds
  };
})(window);
