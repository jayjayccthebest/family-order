'use strict';

var API = '/api';
var CATEGORIES = [
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

var meta = { members: [], dishes: [], settings: { pinSet: false } };
var day = { date: todayStr(), orders: [], shopping: [] };
var currentCategory = 'pork';
var currentTab = 'order';
var searchQuery = '';
var es = null;
var dishForm = null;
var deviceId = localStorage.getItem('fo_did');
if (!deviceId) { deviceId = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); localStorage.setItem('fo_did', deviceId); }

function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
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
  var filtered = currentCategory === 'all' ? meta.dishes : meta.dishes.filter(function(d) { return d.category === currentCategory; });
  if (searchQuery) {
    var q = searchQuery.toLowerCase();
    filtered = filtered.filter(function(d) { return d.name.toLowerCase().indexOf(q) !== -1; });
  }

  var myOrders = day.orders.filter(function(o) { return o.memberId === deviceId && o.date === day.date; });

  // 左侧分类栏（不包含"全部"）
  var catBar = CATEGORIES.map(function(c) {
    return '<button class="cat-bar-item' + (c.key === currentCategory ? ' sel' : '') + '" data-action="setcat" data-cat="' + c.key + '"><span class="ci">' + c.emoji + '</span>' + c.name + '</button>';
  }).join('');

  // 右侧菜品列表
  var dishHtml = filtered.length ? filtered.map(function(d, idx) {
    var added = myOrders.find(function(o) { return o.dishId === d.id; });
    // App deep links：抖音用 snssdk1128，小红书用 xhsdiscover
    var kw = encodeURIComponent(d.name);
    var xhsScheme = 'xhsdiscover://search?keyword=' + kw;
    var dyScheme = 'snssdk1128://search?keyword=' + kw;
    var xhsBtn = '', dyBtn = '';
    if (d.xhsLink) xhsBtn = '<button class="app-link xhs" onclick="event.stopPropagation();var u=this.getAttribute(\'data-w\');location.href=u;setTimeout(function(){window.open(u,\'_blank\')},800)" data-w="' + esc(d.xhsLink) + '">📕</button>';
    if (d.dyLink) dyBtn = '<button class="app-link dy" onclick="event.stopPropagation();var u=this.getAttribute(\'data-d\');location.href=u;setTimeout(function(){window.open(u,\'_blank\')},800)" data-d="' + esc(d.dyLink) + '">🎵</button>';

    return '<div class="dish-card card-in' + (added ? ' added' : '') + '" data-action="adddish" data-id="' + d.id + '">'
      + '<div class="dish-left">'
      + '<div class="dish-name">' + esc(d.name) + '</div>'
      + '</div>'
      + '<div class="dish-right">'
      + (xhsBtn || dyBtn ? '<div style="display:flex;gap:3px">' + xhsBtn + dyBtn + '</div>' : '')
      + '<button class="btn-order' + (added ? ' added' : '') + '" data-action="adddish" data-id="' + d.id + '">' + (added ? '已选' : '点单') + '</button>'
      + '</div></div>';
  }).join('') : '<div class="empty">没有匹配的菜品</div>';

  // 已点区
  var myOrdersHtml = myOrders.length ? myOrders.map(function(o) {
    return '<div class="my-order-item">'
      + '<div style="flex:1;min-width:0"><div style="font-weight:600;margin-bottom:4px">' + esc(o.dishName) + '</div>'
      + '<input type="text" class="note-input" placeholder="备注…" value="' + esc(o.note) + '" data-action="note" data-id="' + o.id + '" />'
      + '</div>'
      + '<button class="btn-del" data-action="rmorder" data-id="' + o.id + '">×</button></div>';
  }).join('') : '<div class="empty">还没点菜</div>';

  document.getElementById('view').innerHTML =
    '<div class="card" style="padding:8px"><input type="text" class="search-input" id="searchBox" placeholder="🔍 搜索菜名…" value="' + esc(searchQuery) + '" /></div>'
    + '<div class="card order-page" style="padding:0;overflow:hidden">'
    + '<div class="cat-bar">' + catBar + '</div>'
    + '<div class="dish-panel">' + dishHtml + '</div>'
    + '</div>'
    + '<div class="card"><div class="section-title">我已点</div>' + myOrdersHtml + '</div>';

  // 搜索框焦点恢复
  setTimeout(function() {
    var sb = document.getElementById('searchBox');
    if (sb && searchQuery) { sb.focus(); sb.setSelectionRange(sb.value.length, sb.value.length); }
  }, 30);
}

/* ========== 阿姨总览 ========== */
function renderOverview() {
  var dateOrders = day.orders.filter(function(o) { return o.date === day.date; });
  var byDish = {};
  dateOrders.forEach(function(o) { if (!byDish[o.dishId]) byDish[o.dishId] = []; byDish[o.dishId].push(o); });
  var cards = [];
  Object.keys(byDish).forEach(function(k) {
    var os = byDish[k], first = os[0], count = os.length;
    var allDone = os.every(function(o) { return o.done; });
    var xhs = first.xhsLink || '', dy = first.dyLink || '';
    var linkBtns = '';
    if (xhs) linkBtns += '<button class="link-pill xhs" style="padding:3px 8px;font-size:11px" onclick="event.stopPropagation();window.open(\'' + esc(xhs) + '\',\'_blank\')">📕</button>';
    if (dy) linkBtns += '<button class="link-pill dy" style="padding:3px 8px;font-size:11px" onclick="event.stopPropagation();window.open(\'' + esc(dy) + '\',\'_blank\')">🎵</button>';
    var ingsHtml = (first.ingredients || []).map(function(i) {
      return '<span class="ing-tag" style="font-size:10px;padding:2px 6px">' + esc(i.name) + ' ' + i.qty + esc(i.unit) + '</span>';
    }).join('');
    var notes = [];
    os.forEach(function(o) { if (o.note) notes.push(esc(o.note)); });
    var noteHtml = notes.length ? '<div class="ov-notes">📝 ' + notes.join(' · ') + '</div>' : '';
    cards.push('<div class="ov-dish"><div class="ov-left">'
      + '<div class="ov-name' + (allDone ? ' done-mark' : '') + '">' + esc(first.dishName) + '<span class="ov-count">×' + count + '份</span></div>'
      + '<div class="dish-ings" style="margin-top:4px">' + ingsHtml + '</div>' + noteHtml + '</div>'
      + '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">'
      + '<div style="display:flex;gap:3px">' + linkBtns + '</div>'
      + '<button class="done-btn' + (allDone ? ' done-btn--on' : '') + '" data-action="doneDish" data-dish="' + first.dishId + '">' + (allDone ? '已做 ✓' : '标记已做') + '</button>'
      + '</div></div>');
  });

  document.getElementById('view').innerHTML =
    '<div class="card"><div class="section-title">🍽️ ' + esc(day.date) + ' · 全家点菜总览</div>'
    + (cards.length ? cards.join('') : '<div class="empty">今天还没有人点餐</div>')
    + '<div class="section-hint">实时更新 · 打勾表示已做好</div></div>';
}

/* ========== 买菜清单 ========== */
function renderShopping() {
  var list = day.shopping;
  var total = list.reduce(function(s, i) { return s + (i.bought ? 0 : 1); }, 0);
  var html = list.length ? list.map(function(i) {
    var key = i.name + '|' + i.unit;
    return '<div class="buy-item' + (i.bought ? ' bought' : '') + '">'
      + '<div class="buy-check' + (i.bought ? ' on' : '') + '" data-action="toggleBought" data-key="' + esc(key) + '">' + (i.bought ? '✓' : '') + '</div>'
      + '<div class="buy-name">' + esc(i.name) + '</div>'
      + '<div class="buy-qty">' + i.qty + esc(i.unit) + '</div></div>';
  }).join('') : '<div class="empty">今天还没有需要买的食材</div>';

  document.getElementById('view').innerHTML =
    '<div class="card"><div class="section-title">🛒 ' + esc(day.date) + ' · 买菜清单</div>'
    + '<div class="section-hint" style="margin-bottom:10px">5人份 · 调味料已排除 · 还需买 <b style="color:var(--orange)">' + total + '</b> 项</div>'
    + html + '</div>';
}

/* ========== 管理 ========== */
function renderAdmin() {
  if (meta.settings.pinSet) {
    var input = prompt('管理页已上锁，请输入 PIN：');
    if (input === null || input !== meta.settings.pin) { toast('PIN 错误'); switchTab('order'); return; }
  }
  var dishes = meta.dishes.map(function(d) {
    var ings = (d.ingredients || []).map(function(i) { return esc(i.name) + ' ' + i.qty + esc(i.unit); }).join('、') || '无';
    return '<div class="admin-item"><div style="flex:1;min-width:0">'
      + '<div style="font-weight:600">' + esc(d.name) + ' <span class="tag">' + catName(d.category) + '</span></div>'
      + '<div style="font-size:12px;color:var(--sub)">' + esc(d.xhsLink ? '📕' : '') + esc(d.dyLink ? ' 🎵' : '') + ' · ' + ings + '</div>'
      + '</div>'
      + '<button class="btn-base btn-ghost" data-action="editDish" data-id="' + d.id + '">改</button>'
      + '<button class="btn-base btn-danger" data-action="delDish" data-id="' + d.id + '">删</button></div>';
  }).join('') || '<div class="empty">还没有菜谱</div>';

  document.getElementById('view').innerHTML =
    '<div class="card"><div class="section-title">📋 菜谱管理 · ' + meta.dishes.length + '道' + (dishForm ? '（编辑中）' : '') + '</div>'
    + dishes + dishFormHtml()
    + '<div style="display:flex;gap:8px;margin-top:10px">'
    + '<button class="btn-base btn-ghost" data-action="newDish">+ 新增菜谱</button>'
    + (dishForm ? '<button class="btn-base btn-green" data-action="saveDish">保存</button><button class="btn-base btn-ghost" data-action="cancelDish">取消</button>' : '')
    + '</div></div>'
    + '<div class="card"><div class="section-title">⚙️ 设置</div>'
    + '<div class="field"><label>管理页 PIN</label><input type="text" id="pinInput" placeholder="留空=不上锁" value="' + esc(meta.settings.pin || '') + '" /></div>'
    + '<button class="btn-base btn-ghost" data-action="savePin">保存 PIN</button>'
    + '<hr style="border:none;border-top:0.5px solid var(--line);margin:14px 0" />'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<button class="btn-base btn-ghost" data-action="exportData">⬇ 导出备份</button>'
    + '<button class="btn-base btn-ghost" data-action="importData">⬆ 导入备份</button>'
    + '</div><div class="section-hint" style="margin-top:8px">定期导出备份，防止数据丢失</div></div>';
}

function dishFormHtml() {
  if (!dishForm) return '';
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
  return '<div class="card" style="background:#fafafc;margin-top:10px">'
    + '<div class="field"><label>菜名</label><input type="text" id="dfName" value="' + esc(dishForm.name || '') + '" placeholder="如 番茄炒蛋" /></div>'
    + '<div class="field"><label>分类</label><select id="dfCategory">' + catOpts + '</select></div>'
    + '<div class="field"><label>📕 小红书搜索链接</label><input type="url" id="dfXhsLink" value="' + esc(dishForm.xhsLink || '') + '" placeholder="https://www.xiaohongshu.com/search_result?keyword=菜名" /></div>'
    + '<div class="field"><label>🎵 抖音搜索链接</label><input type="url" id="dfDyLink" value="' + esc(dishForm.dyLink || '') + '" placeholder="https://www.douyin.com/search/菜名" /></div>'
    + '<div class="field"><label>所需食材（5人份参考）</label>' + ings + '<button class="btn-base btn-ghost" style="width:100%" data-action="addIng">+ 加食材</button></div></div>';
}

/* ========== actions ========== */
async function onAction(action, el, e) {
  try {
    if (action === 'setcat') { currentCategory = el.dataset.cat; renderOrder(); }
    else if (action === 'adddish') {
      var id = el.dataset.id;
      var existing = day.orders.find(function(o) { return o.memberId === deviceId && o.date === day.date && o.dishId === id; });
      if (existing) { await api('/orders/' + existing.id, { method: 'DELETE' }); }
      else { await api('/orders', { method: 'POST', body: JSON.stringify({ date: day.date, memberId: deviceId, dishId: id }) }); }
      await refresh();
    }
    else if (action === 'rmorder') { await api('/orders/' + el.dataset.id, { method: 'DELETE' }); await refresh(); }
    else if (action === 'note') {
      var v = el.value; clearTimeout(el._t);
      el._t = setTimeout(async function() { await api('/orders/' + el.dataset.id, { method: 'PUT', body: JSON.stringify({ note: v }) }); await refresh(); }, 500);
    }
    else if (action === 'doneDish') {
      var dishId = el.dataset.dish;
      var orders = day.orders.filter(function(o) { return o.date === day.date && o.dishId === dishId; });
      var allDone = orders.every(function(o) { return o.done; });
      for (var i = 0; i < orders.length; i++) { await api('/orders/' + orders[i].id, { method: 'PUT', body: JSON.stringify({ done: !allDone }) }); }
      await refresh();
    }
    else if (action === 'toggleBought') { var key = el.dataset.key; var item = day.shopping.find(function(s) { return s.name + '|' + s.unit === key; }); await api('/shopping/' + encodeURIComponent(day.date), { method: 'PUT', body: JSON.stringify({ key: key, bought: !(item && item.bought) }) }); await refresh(); }
    else if (action === 'newDish') { dishForm = { name: '', category: 'veggie', xhsLink: '', dyLink: '', ingredients: [{ name: '', qty: '', unit: '' }] }; renderAdmin(); }
    else if (action === 'editDish') { var d = meta.dishes.find(function(x) { return x.id === el.dataset.id; }); dishForm = JSON.parse(JSON.stringify(d)); dishForm.ingredients = (dishForm.ingredients || []).length ? dishForm.ingredients : [{ name: '', qty: '', unit: '' }]; renderAdmin(); }
    else if (action === 'cancelDish') { dishForm = null; renderAdmin(); }
    else if (action === 'saveDish') {
      var name = document.getElementById('dfName').value.trim(); if (!name) return toast('请输入菜名');
      var category = document.getElementById('dfCategory').value;
      var xhsLink = document.getElementById('dfXhsLink').value.trim();
      var dyLink = document.getElementById('dfDyLink').value.trim();
      var ingredients = (dishForm.ingredients || []).map(function(i) { return { name: (i.name || '').trim(), qty: Number(i.qty) || 0, unit: (i.unit || '').trim() }; }).filter(function(i) { return i.name; });
      var body = { name: name, category: category, xhsLink: xhsLink, dyLink: dyLink, ingredients: ingredients };
      if (dishForm.id) { await api('/dishes/' + dishForm.id, { method: 'PUT', body: JSON.stringify(body) }); }
      else { await api('/dishes', { method: 'POST', body: JSON.stringify(body) }); }
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
  if (currentTab === tab) return;
  var v = document.getElementById('view');
  v.classList.add('fading');
  setTimeout(function() {
    currentTab = tab;
    var btns = document.querySelectorAll('.tabbar button');
    for (var i = 0; i < btns.length; i++) { btns[i].classList.toggle('active', btns[i].dataset.tab === tab); }
    render();
    v.classList.remove('fading');
    document.getElementById('view-wrap').scrollTop = 0;
  }, 150);
}

// events
function boot() {
  var gd = document.getElementById('globalDate');
  if (gd) gd.addEventListener('change', async function(e) { day.date = e.target.value; await refresh(); });
  var btns = document.querySelectorAll('.tabbar button');
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function() { switchTab(this.dataset.tab); });
  }
  (async function init() {
    try { await refresh(); } catch(e) { document.getElementById('view').innerHTML = '<div class="empty">⚠️ 加载失败，请检查网络后刷新</div>'; }
    try { connectSSE(); } catch(e) {}
  })();
}

document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-action]');
  if (el) { e.preventDefault(); onAction(el.dataset.action, el, e); }
});
document.addEventListener('input', function(e) {
  // 搜索框事件委托，不随 DOM 重建丢失
  if (e.target.id === 'searchBox') {
    var v = e.target.value, p = v.length;
    searchQuery = v;
    renderOrder();
    setTimeout(function() {
      var sb = document.getElementById('searchBox');
      if (sb) { sb.focus(); sb.setSelectionRange(p, p); }
    }, 30);
  }
  onInput(e);
});
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); }
else { boot(); }
