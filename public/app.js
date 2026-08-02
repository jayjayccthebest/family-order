'use strict';

const API = '/api';
const MEALS = ['早', '午', '晚'];
const CATEGORIES = [
  { key: 'pork', name: '猪肉类', emoji: '🐷' },
  { key: 'beef', name: '牛羊肉类', emoji: '🐂' },
  { key: 'poultry', name: '鸡鸭禽类', emoji: '🐔' },
  { key: 'seafood', name: '鱼虾海鲜', emoji: '🦐' },
  { key: 'eggtofu', name: '豆制品/蛋类', emoji: '🫘' },
  { key: 'veggie', name: '蔬菜类', emoji: '🥬' },
  { key: 'cold', name: '凉菜/小食', emoji: '🥗' },
  { key: 'soup', name: '汤羹类', emoji: '🍲' },
  { key: 'staple', name: '主食类', emoji: '🍚' },
];

let meta = { members: [], dishes: [], settings: { pinSet: false } };
let day = { date: todayStr(), orders: [], shopping: [] };
let currentMeal = '晚';
let currentCategory = 'all';
let currentTab = 'order';
let shopMeal = 'all';
let searchQuery = '';
let es = null;
let dishForm = null;
// 设备匿名 ID：每台设备独立，不追踪身份
let deviceId = localStorage.getItem('fo_did');
if (!deviceId) { deviceId = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); localStorage.setItem('fo_did', deviceId); }

function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>\"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function safeLink(href) {
  return typeof href === 'string' && /^https?:\/\//i.test(href) ? href : '';
}
function catName(key) {
  var c = CATEGORIES.find(function(x) { return x.key === key; });
  return c ? c.emoji + ' ' + c.name : '其他';
}
function toast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(function() { t.classList.remove('show'); }, 1800);
}

async function api(path, opts) {
  var res = await fetch(API + path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {}));
  if (!res.ok) { var e = await res.json().catch(function() { return {}; }); throw new Error(e.error || '请求失败'); }
  return res.json();
}
async function loadMeta() { meta = await api('/meta'); }
async function loadDay() { day = await api('/day?date=' + day.date); }
async function refresh() {
  try { await Promise.all([loadMeta(), loadDay()]); } catch (e) { toast('加载失败'); }
  render();
}
function connectSSE() {
  if (es) return;
  es = new EventSource(API + '/events');
  es.onmessage = function() { refresh(); };
  es.onerror = function() { document.getElementById('liveDot').classList.add('off'); };
  es.onopen = function() { document.getElementById('liveDot').classList.remove('off'); };
}

function render() {
  var gd = document.getElementById('globalDate');
  if (gd) gd.value = day.date;
  if (currentTab === 'order') renderOrder();
  else if (currentTab === 'overview') renderOverview();
  else if (currentTab === 'shopping') renderShopping();
  else if (currentTab === 'admin') renderAdmin();
}

/* ========== 点餐 ========== */
function renderOrder() {
  // 餐次
  var seg = MEALS.map(function(m) {
    return '<button class="' + (m === currentMeal ? 'sel' : '') + '" data-action="setmeal" data-meal="' + m + '">' + m + '餐</button>';
  }).join('');

  // 分类滚动条
  var catChips = ['all'].concat(CATEGORIES.map(function(c) { return c.key; })).map(function(k) {
    var label = k === 'all' ? '全部' : catName(k);
    return '<button class="chip cat-chip ' + (k === currentCategory ? 'sel' : '') + '" data-action="setcat" data-cat="' + k + '">' + label + '</button>';
  }).join('');

  // 过滤：餐次 + 分类 + 搜索
  var filtered = meta.dishes.filter(function(d) { return (d.mealTypes || []).indexOf(currentMeal) !== -1; });
  if (currentCategory !== 'all') {
    filtered = filtered.filter(function(d) { return d.category === currentCategory; });
  }
  if (searchQuery) {
    var q = searchQuery.toLowerCase();
    filtered = filtered.filter(function(d) { return d.name.toLowerCase().indexOf(q) !== -1; });
  }

  var myOrders = day.orders.filter(function(o) {
    return o.memberId === deviceId && o.date === day.date && o.mealType === currentMeal;
  });

  // 菜品列表
  var dishHtml = filtered.length ? filtered.map(function(d) {
    var added = myOrders.find(function(o) { return o.dishId === d.id; });
    var link = safeLink(d.link);
    var linkBtn = link
      ? '<button class="btn sm ghost" style="padding:4px 8px;font-size:12px;color:' + (d.linkPlatform === '小红书' ? '#ff2741' : '#000') + ';border-color:' + (d.linkPlatform === '小红书' ? '#ff2741' : '#000') + '" onclick="event.stopPropagation();window.open(\'' + esc(link) + '\',\'_blank\')">📖 做法</button>'
      : '';
    // 食材列表用换行显示更清晰
    var ingsHtml = (d.ingredients || []).map(function(i) {
      return '<span style="display:inline-block;background:#fff7f2;border-radius:6px;padding:2px 7px;margin:2px 3px;font-size:12px">' + esc(i.name) + ' <b>' + i.qty + esc(i.unit) + '</b></span>';
    }).join('') || '<span style="font-size:12px;color:var(--muted)">暂无食材信息</span>';
    return '<div class="dish' + (added ? ' added' : '') + '">'
      + '<div class="grow" style="cursor:pointer" data-action="adddish" data-id="' + d.id + '">'
      + '<div class="name">' + esc(d.name) + ' <span class="tag">' + catName(d.category) + '</span></div>'
      + '<div style="margin-top:4px;line-height:1.8">' + ingsHtml + '</div>'
      + '</div>'
      + '<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">'
      + linkBtn
      + '<button class="btn sm ' + (added ? 'green' : '') + '" data-action="adddish" data-id="' + d.id + '" style="min-width:56px">' + (added ? '已点✓' : '点这个') + '</button>'
      + '</div></div>';
  }).join('') : '<div class="empty">没有匹配的菜品<br>去「管理」添加，或用搜索框搜别的关键词</div>';

  // 我的已点
  var myOrdersHtml = myOrders.length ? myOrders.map(function(o) {
    var link = safeLink(o.link);
    var linkBtn = link
      ? '<button class="btn sm ghost" style="padding:4px 8px;font-size:12px" onclick="event.stopPropagation();window.open(\'' + esc(link) + '\',\'_blank\')">📖 做法</button>'
      : '';
    return '<div class="dish"><div class="grow">'
      + '<div class="name">' + esc(o.dishName) + '</div>'
      + '<input type="text" placeholder="备注 · 如少辣/不要葱" value="' + esc(o.note) + '" data-action="note" data-id="' + o.id + '" style="margin-top:4px" />'
      + '</div>' + linkBtn
      + '<button class="btn sm danger" data-action="rmorder" data-id="' + o.id + '">删</button></div>';
  }).join('') : '<div class="empty">还没点菜，上面翻分类挑一个</div>';

  document.getElementById('view').innerHTML =
    '<div class="card"><div class="seg">' + seg + '</div></div>'
    + '<div class="card">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
    + '<div class="section-title" style="margin:0">🍽️ ' + esc(currentMeal) + '餐 · 分类菜单（' + filtered.length + '道）</div>'
    + '</div>'
    + '<div style="margin-bottom:6px"><input type="text" id="searchBox" placeholder="🔍 搜索菜名…快速找菜" value="' + esc(searchQuery) + '" style="padding:8px;font-size:14px" /></div>'
    + '<div class="cat-scroll" style="margin-bottom:10px">' + catChips + '</div>'
    + '<div class="meal-block">' + dishHtml + '</div>'
    + '</div>'
    + '<div class="card"><div class="section-title">我已点的 ' + esc(currentMeal) + '餐</div>' + myOrdersHtml + '</div>';

  // 搜索框事件
  setTimeout(function() {
    var sb = document.getElementById('searchBox');
    if (sb) {
      sb.addEventListener('input', function() {
        searchQuery = sb.value;
        renderOrder();
        sb.focus();
        sb.setSelectionRange(sb.value.length, sb.value.length);
      });
    }
  }, 50);
}

/* ========== 阿姨总览（按菜汇总，无角色） ========== */
function renderOverview() {
  var dateOrders = day.orders.filter(function(o) { return o.date === day.date; });
  var blocks = MEALS.map(function(meal) {
    var mealOrders = dateOrders.filter(function(o) { return o.mealType === meal; });
    if (!mealOrders.length) return '';
    var byDish = {};
    mealOrders.forEach(function(o) {
      var dk = o.dishId;
      if (!byDish[dk]) byDish[dk] = [];
      byDish[dk].push(o);
    });
    var dishCards = [];
    Object.keys(byDish).forEach(function(k) {
      var os = byDish[k];
      var first = os[0];
      var count = os.length;
      var allDone = os.every(function(o) { return o.done; });
      var link = safeLink(first.link);
      var linkBtn = link
        ? '<button class="btn sm ghost" style="padding:4px 8px;font-size:12px;color:' + (first.linkPlatform === '小红书' ? '#ff2741' : '#000') + ';border-color:' + (first.linkPlatform === '小红书' ? '#ff2741' : '#000') + '" onclick="event.stopPropagation();window.open(\'' + esc(link) + '\',\'_blank\')">📖 ' + esc(first.linkPlatform) + '</button>'
        : '';
      var ingsHtml = (first.ingredients || []).map(function(i) {
        return '<span style="display:inline-block;background:#fff7f2;border-radius:4px;padding:1px 5px;margin:1px 2px;font-size:11px">' + esc(i.name) + ' ' + i.qty + esc(i.unit) + '</span>';
      }).join('');
      var notes = [];
      os.forEach(function(o) {
        if (o.note) notes.push(esc(o.note));
      });
      var noteHtml = notes.length ? '<div style="color:#e67e22;font-size:12px;margin-top:3px">📝 ' + notes.join(' · ') + '</div>' : '';
      dishCards.push('<div class="dish">'
        + '<div class="grow">'
        + '<div class="name' + (allDone ? ' done-mark' : '') + '">' + esc(first.dishName) + ' <span class="tag">×' + count + '份</span></div>'
        + '<div style="margin-top:3px;line-height:1.6">' + ingsHtml + '</div>'
        + noteHtml
        + '</div>'
        + '<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">'
        + linkBtn
        + '<button class="btn sm ' + (allDone ? 'green' : 'ghost') + '" data-action="doneDish" data-dish="' + first.dishId + '" data-meal="' + first.mealType + '">' + (allDone ? '已做✓' : '标记已做') + '</button>'
        + '</div></div>');
    });
    return '<div class="ov-meal"><h3>' + meal + '餐 · ' + Object.keys(byDish).length + '道菜</h3>' + dishCards.join('') + '</div>';
  }).join('');

  document.getElementById('view').innerHTML =
    '<div class="card">'
    + '<div class="section-title">' + esc(day.date) + ' · 全家点菜总览</div>'
    + (blocks || '<div class="empty">今天还没有人点餐</div>')
    + '<div class="muted" style="margin-top:6px">实时更新 · 打勾表示已做好</div>'
    + '</div>';
}

/* ========== 买菜清单 ========== */
function renderShopping() {
  var dateOrders = day.orders.filter(function(o) { return o.date === day.date; });
  var list = day.shopping;
  if (shopMeal !== 'all') {
    var map = new Map();
    dateOrders.filter(function(o) { return o.mealType === shopMeal; }).forEach(function(o) {
      (o.ingredients || []).forEach(function(i) {
        var key = i.name + '|' + (i.unit || '');
        var cur = map.get(key) || { name: i.name, unit: i.unit || '', qty: 0 };
        cur.qty += Number(i.qty) || 0;
        map.set(key, cur);
      });
    });
    list = [];
    map.forEach(function(x) { list.push({ name: x.name, unit: x.unit, qty: x.qty, bought: !!(day.shopping.find(function(s) { return s.name === x.name && s.unit === x.unit; }) || {}).bought }); });
    list.sort(function(a, b) { return a.name.localeCompare(b.name, 'zh'); });
  }
  var chips = ['all'].concat(MEALS).map(function(m) {
    return '<button class="chip ' + (shopMeal === m ? 'sel' : '') + '" data-action="shopmeal" data-meal="' + m + '">' + (m === 'all' ? '全部' : m) + '</button>';
  }).join('');
  var total = list.reduce(function(s, i) { return s + (i.bought ? 0 : 1); }, 0);
  var ingHtml = list.length ? list.map(function(i) {
    var key = i.name + '|' + i.unit;
    return '<div class="ing ' + (i.bought ? 'bought' : '') + '">'
      + '<div class="check ' + (i.bought ? 'on' : '') + '" data-action="toggleBought" data-key="' + esc(key) + '">' + (i.bought ? '✓' : '') + '</div>'
      + '<div class="grow"><div class="nm">' + esc(i.name) + '</div></div>'
      + '<div class="qty">' + i.qty + esc(i.unit) + '</div></div>';
  }).join('') : '<div class="empty">今天还没有需要买的食材</div>';

  document.getElementById('view').innerHTML =
    '<div class="card"><div class="section-title">' + esc(day.date) + ' · 买菜清单（5人份）</div>'
    + '<div class="chips" style="margin-bottom:10px">' + chips + '</div>'
    + '<div class="muted" style="margin-bottom:4px">还需买 ' + total + ' 项（打勾=已买）</div>'
    + ingHtml + '</div>';
}

/* ========== 管理 ========== */
function renderAdmin() {
  if (meta.settings.pinSet) {
    var input = prompt('管理页已上锁，请输入 PIN：');
    if (input === null || input !== meta.settings.pin) { toast('PIN 错误'); switchTab('order'); return; }
  }
  var dishes = meta.dishes.map(function(d) {
    var ings = (d.ingredients || []).map(function(i) { return esc(i.name) + ' ' + i.qty + esc(i.unit); }).join('、') || '无';
    return '<div class="item"><div class="grow">'
      + '<div style="font-weight:600">' + esc(d.name) + ' <span class="tag">' + catName(d.category) + '</span></div>'
      + '<div class="muted">' + esc((d.mealTypes || []).join('/')) + ' · ' + esc(d.linkPlatform) + (d.link ? ' 🔗' : '') + ' · ' + ings + '</div>'
      + '</div>'
      + '<button class="btn sm ghost" data-action="editDish" data-id="' + d.id + '">改</button>'
      + '<button class="btn sm danger" data-action="delDish" data-id="' + d.id + '">删</button></div>';
  }).join('') || '<div class="empty">还没有菜谱</div>';

  document.getElementById('view').innerHTML =
    '<div class="card"><div class="section-title">菜谱管理 · ' + meta.dishes.length + '道菜' + (dishForm ? '（编辑中）' : '') + '</div>'
    + '<div class="admin-list">' + dishes + '</div>'
    + dishFormHtml()
    + '<div style="display:flex;gap:8px;margin-top:10px">'
    + '<button class="btn sm" data-action="newDish">+ 新增菜谱</button>'
    + (dishForm ? '<button class="btn sm green" data-action="saveDish">保存</button><button class="btn sm ghost" data-action="cancelDish">取消</button>' : '')
    + '</div></div>'
    + '<div class="card"><div class="section-title">设置</div>'
    + '<div class="field"><label>管理页 PIN（留空=不上锁）</label>'
    + '<input type="text" id="pinInput" placeholder="设置数字密码" value="' + esc(meta.settings.pin || '') + '" /></div>'
    + '<button class="btn sm" data-action="savePin">保存 PIN</button>'
    + '<hr style="border:none;border-top:1px solid var(--line);margin:14px 0" />'
    + '<div class="row spread">'
    + '<button class="btn sm ghost" data-action="exportData">⬇️ 导出备份</button>'
    + '<button class="btn sm ghost" data-action="importData">⬆️ 导入备份</button>'
    + '</div><div class="muted" style="margin-top:8px">免费云盘可能偶尔重置，记得导出备份</div></div>';
}

function dishFormHtml() {
  if (!dishForm) return '';
  var mealChk = MEALS.map(function(m) {
    return '<label style="display:inline-flex;gap:4px;margin-right:10px;font-size:14px"><input type="checkbox" data-mealchk="' + m + '" ' + ((dishForm.mealTypes || []).indexOf(m) !== -1 ? 'checked' : '') + '/>' + m + '</label>';
  }).join('');
  var platform = ['无', '小红书', '抖音'].map(function(p) {
    return '<option value="' + p + '" ' + (dishForm.linkPlatform === p ? 'selected' : '') + '>' + p + '</option>';
  }).join('');
  var catOpts = CATEGORIES.map(function(c) {
    return '<option value="' + c.key + '" ' + (dishForm.category === c.key ? 'selected' : '') + '>' + c.emoji + ' ' + c.name + '</option>';
  }).join('');
  var ings = (dishForm.ingredients || []).map(function(ing, idx) {
    return '<div class="ing-row">'
      + '<input type="text" placeholder="食材" value="' + esc(ing.name) + '" data-ing="name" data-idx="' + idx + '" />'
      + '<input type="number" placeholder="数量" value="' + esc(ing.qty) + '" data-ing="qty" data-idx="' + idx + '" />'
      + '<input type="text" placeholder="单位" value="' + esc(ing.unit) + '" data-ing="unit" data-idx="' + idx + '" />'
      + '<button class="ing-del" data-action="delIng" data-idx="' + idx + '">×</button></div>';
  }).join('');
  return '<div class="card" style="background:#fffaf6;margin-top:10px">'
    + '<div class="field"><label>菜名</label><input type="text" id="dfName" value="' + esc(dishForm.name || '') + '" placeholder="如 番茄炒蛋" /></div>'
    + '<div class="field"><label>分类</label><select id="dfCategory">' + catOpts + '</select></div>'
    + '<div class="field"><label>适用餐次</label><div>' + mealChk + '</div></div>'
    + '<div class="field"><label>做法平台</label><select id="dfPlatform">' + platform + '</select></div>'
    + '<div class="field"><label>做法链接</label><input type="url" id="dfLink" value="' + esc(dishForm.link || '') + '" placeholder="https://..." /></div>'
    + '<div class="field"><label>所需食材（5人份）</label>' + ings + '<button class="btn sm ghost" data-action="addIng">+ 加一行食材</button></div></div>';
}

/* ========== actions ========== */
async function onAction(action, el, e) {
  try {
    if (action === 'setmeal') { currentMeal = el.dataset.meal; currentCategory = 'all'; searchQuery = ''; renderOrder(); }
    else if (action === 'setcat') { currentCategory = el.dataset.cat; renderOrder(); }
    else if (action === 'adddish') {
      var id = el.dataset.id;
      var existing = day.orders.find(function(o) { return o.memberId === deviceId && o.date === day.date && o.mealType === currentMeal && o.dishId === id; });
      if (existing) { await api('/orders/' + existing.id, { method: 'DELETE' }); }
      else { await api('/orders', { method: 'POST', body: JSON.stringify({ date: day.date, memberId: deviceId, mealType: currentMeal, dishId: id }) }); }
      await refresh();
    }
    else if (action === 'rmorder') { await api('/orders/' + el.dataset.id, { method: 'DELETE' }); await refresh(); }
    else if (action === 'note') {
      var v = el.value;
      clearTimeout(el._t);
      el._t = setTimeout(async function() { await api('/orders/' + el.dataset.id, { method: 'PUT', body: JSON.stringify({ note: v }) }); await refresh(); }, 500);
    }
    else if (action === 'doneDish') {
      var dishId = el.dataset.dish, mealType = el.dataset.meal;
      var orders = day.orders.filter(function(o) { return o.date === day.date && o.mealType === mealType && o.dishId === dishId; });
      var allDone = orders.every(function(o) { return o.done; });
      for (var i = 0; i < orders.length; i++) { await api('/orders/' + orders[i].id, { method: 'PUT', body: JSON.stringify({ done: !allDone }) }); }
      await refresh();
    }
    else if (action === 'toggleBought') { var key = el.dataset.key; var item = day.shopping.find(function(s) { return s.name + '|' + s.unit === key; }); await api('/shopping/' + encodeURIComponent(day.date), { method: 'PUT', body: JSON.stringify({ key: key, bought: !(item && item.bought) }) }); await refresh(); }
    else if (action === 'shopmeal') { shopMeal = el.dataset.meal; renderShopping(); }
    else if (action === 'newDish') { dishForm = { name: '', category: 'veggie', mealTypes: ['午', '晚'], linkPlatform: '无', link: '', ingredients: [{ name: '', qty: '', unit: '' }] }; renderAdmin(); }
    else if (action === 'editDish') { var d = meta.dishes.find(function(x) { return x.id === el.dataset.id; }); dishForm = JSON.parse(JSON.stringify(d)); dishForm.ingredients = (dishForm.ingredients || []).length ? dishForm.ingredients : [{ name: '', qty: '', unit: '' }]; renderAdmin(); }
    else if (action === 'cancelDish') { dishForm = null; renderAdmin(); }
    else if (action === 'saveDish') {
      var name = document.getElementById('dfName').value.trim(); if (!name) return toast('请输入菜名');
      var category = document.getElementById('dfCategory').value;
      var mealTypes = MEALS.filter(function(m) { return document.querySelector('[data-mealchk="' + m + '"]').checked; });
      var linkPlatform = document.getElementById('dfPlatform').value;
      var link = document.getElementById('dfLink').value.trim();
      var ingredients = (dishForm.ingredients || []).map(function(i) { return { name: (i.name || '').trim(), qty: Number(i.qty) || 0, unit: (i.unit || '').trim() }; }).filter(function(i) { return i.name; });
      if (dishForm.id) { await api('/dishes/' + dishForm.id, { method: 'PUT', body: JSON.stringify({ name: name, category: category, mealTypes: mealTypes, linkPlatform: linkPlatform, link: link, ingredients: ingredients }) }); }
      else { await api('/dishes', { method: 'POST', body: JSON.stringify({ name: name, category: category, mealTypes: mealTypes, linkPlatform: linkPlatform, link: link, ingredients: ingredients }) }); }
      dishForm = null; await refresh();
    }
    else if (action === 'addIng') { (dishForm.ingredients = dishForm.ingredients || []).push({ name: '', qty: '', unit: '' }); renderAdmin(); }
    else if (action === 'delIng') { dishForm.ingredients.splice(Number(el.dataset.idx), 1); renderAdmin(); }
    else if (action === 'savePin') { var pin = document.getElementById('pinInput').value.trim(); await api('/settings/pin', { method: 'PUT', body: JSON.stringify({ pin: pin }) }); await refresh(); toast('已保存'); }
    else if (action === 'exportData') { window.location.href = API + '/export'; }
    else if (action === 'importData') {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json';
      inp.onchange = async function() { try { var text = await inp.files[0].text(); await api('/import', { method: 'POST', body: text }); await refresh(); toast('导入成功'); } catch (err) { toast('导入失败'); } };
      inp.click();
    }
  } catch (err) { toast('操作失败: ' + err.message); }
}

function onInput(e) {
  if (!dishForm) return;
  var t = e.target;
  if (t.dataset.ing !== undefined) { var idx = Number(t.dataset.idx); (dishForm.ingredients = dishForm.ingredients || []); dishForm.ingredients[idx][t.dataset.ing] = t.value; }
}

function switchTab(tab) {
  currentTab = tab;
  var btns = document.querySelectorAll('.tabbar button');
  for (var i = 0; i < btns.length; i++) { btns[i].classList.toggle('active', btns[i].dataset.tab === tab); }
  render();
}

// 兜底渲染：即使数据为空也显示界面
function renderSafe() {
  try { render(); } catch(e) {
    document.getElementById('view').innerHTML = '<div style="text-align:center;padding:60px 20px;color:#999;font-size:15px">⚠️ 加载失败<br><span style="font-size:13px">请检查网络后刷新</span></div>';
  }
}

// 仅在 DOM 就绪后绑定事件和启动
function boot() {
  var gd = document.getElementById('globalDate');
  if (gd) gd.addEventListener('change', async function(e) { day.date = e.target.value; await refresh(); });
  var btns = document.querySelectorAll('.tabbar button');
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function() { switchTab(this.dataset.tab); });
  }
  // 启动
  (async function init() {
    try { await refresh(); } catch(e) { renderSafe(); }
    try { connectSSE(); } catch(e) {}
  })();
}

document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-action]');
  if (el) { e.preventDefault(); onAction(el.dataset.action, el, e); }
});
document.addEventListener('input', onInput);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
