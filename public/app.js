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
let me = localStorage.getItem('fo_me') || '';
let currentMeal = '晚';
let currentCategory = 'all';
let currentTab = 'order';
let shopMeal = 'all';
let es = null;
let dishForm = null;

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function safeLink(href) {
  return typeof href === 'string' && /^https?:\/\//i.test(href) ? href : '';
}
function memberById(id) {
  return meta.members.find((m) => m.id === id);
}
function dishById(id) {
  return meta.dishes.find((d) => d.id === id);
}
function catName(key) {
  const c = CATEGORIES.find((x) => x.key === key);
  return c ? `${c.emoji} ${c.name}` : '其他';
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 1800);
}

// ---------- data ----------
async function api(path, opts) {
  const res = await fetch(API + path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {}));
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || '请求失败');
  }
  return res.json();
}
async function loadMeta() {
  meta = await api('/meta');
  if (!memberById(me)) me = '';
}
async function loadDay() {
  day = await api('/day?date=' + day.date);
}
async function refresh() {
  try {
    await Promise.all([loadMeta(), loadDay()]);
  } catch (e) {
    toast('加载失败: ' + e.message);
  }
  render();
}

function connectSSE() {
  if (es) return;
  es = new EventSource(API + '/events');
  es.onmessage = () => refresh();
  es.onerror = () => {
    document.getElementById('liveDot').classList.add('off');
  };
  es.onopen = () => {
    document.getElementById('liveDot').classList.remove('off');
  };
}

// ---------- render ----------
const view = () => document.getElementById('view');

function render() {
  document.getElementById('globalDate').value = day.date;
  if (currentTab === 'order') renderOrder();
  else if (currentTab === 'overview') renderOverview();
  else if (currentTab === 'shopping') renderShopping();
  else if (currentTab === 'admin') renderAdmin();
}

/* ========== 点餐（分类浏览） ========== */
function renderOrder() {
  const meMember = memberById(me);
  const meName = meMember ? `${esc(meMember.emoji)} ${esc(meMember.name)}` : '请选人';
  const membersChips = meta.members
    .map((m) => `<button class="chip sm ${m.id === me ? 'sel' : ''}" data-action="setme" data-id="${m.id}">${esc(m.emoji || '🙂')} ${esc(m.name)}</button>`)
    .join('');

  // meal segment
  const seg = MEALS.map(
    (m) => `<button class="${m === currentMeal ? 'sel' : ''}" data-action="setmeal" data-meal="${m}">${m}餐</button>`
  ).join('');

  // category chips
  const catChips = ['all', ...CATEGORIES.map((c) => c.key)]
    .map((k) => {
      const label = k === 'all' ? '全部' : catName(k);
      return `<button class="chip cat-chip ${k === currentCategory ? 'sel' : ''}" data-action="setcat" data-cat="${k}">${label}</button>`;
    })
    .join('');

  // filter dishes
  const filtered = meta.dishes.filter((d) => (d.mealTypes || []).includes(currentMeal));
  const list = currentCategory === 'all'
    ? filtered
    : filtered.filter((d) => d.category === currentCategory);

  const myOrders = day.orders.filter(
    (o) => o.memberId === me && o.date === day.date && o.mealType === currentMeal
  );

  const dishHtml = list.length
    ? list
        .map((d) => {
          const added = myOrders.find((o) => o.dishId === d.id);
          const link = safeLink(d.link);
          const linkBtn = link
            ? `<a class="link-btn ${d.linkPlatform === '小红书' ? 'xhs' : d.linkPlatform === '抖音' ? 'dy' : ''}" href="${esc(link)}" target="_blank" rel="noopener">${esc(d.linkPlatform)}</a>`
            : '';
          return `<div class="dish ${added ? 'added' : ''}">
            <div class="grow">
              <div class="name">${esc(d.name)} <span class="tag">${catName(d.category)}</span></div>
              <div class="meta">${(d.ingredients || []).map((i) => `${esc(i.name)}${i.unit ? esc(i.unit) : ''}`).join('、') || '无食材信息'}</div>
            </div>
            ${linkBtn}
            <button class="btn sm ${added ? 'ghost' : ''}" data-action="adddish" data-id="${d.id}">${added ? '已点✓' : '点这个'}</button>
          </div>`;
        })
        .join('')
    : '<div class="empty">这个分类还没有菜，去「管理」添加吧</div>';

  // 我点的
  const myOrdersHtml = myOrders.length
    ? myOrders
        .map((o) => {
          const link = safeLink(o.link);
          const linkBtn = link
            ? `<a class="link-btn ${o.linkPlatform === '小红书' ? 'xhs' : o.linkPlatform === '抖音' ? 'dy' : ''}" href="${esc(link)}" target="_blank" rel="noopener">${esc(o.linkPlatform)}</a>`
            : '';
          return `<div class="dish">
            <div class="grow">
              <div class="name">${esc(o.dishName)}</div>
              <input type="text" placeholder="备注，如少辣/不要葱" value="${esc(o.note)}" data-action="note" data-id="${o.id}" style="margin-top:4px" />
            </div>
            ${linkBtn}
            <button class="btn sm danger" data-action="rmorder" data-id="${o.id}">删</button>
          </div>`;
        })
        .join('')
    : '<div class="empty">你还没点菜，上面分类里点一个</div>';

  view().innerHTML = `
    <div class="card">
      <div class="row spread" style="margin-bottom:8px">
        <span style="font-size:13px;color:var(--muted)">我是</span>
        <span style="font-weight:700">${meName}</span>
      </div>
      <div class="chips">${membersChips}</div>
    </div>
    <div class="card">
      <div class="seg">${seg}</div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="section-title" style="margin:0">🍽️ 分类菜单</div>
      </div>
      <div class="cat-scroll">${catChips}</div>
      <div class="meal-block" style="margin-top:8px">${dishHtml}</div>
    </div>
    <div class="card">
      <div class="section-title">我点的 ${esc(currentMeal)}餐</div>
      ${myOrdersHtml}
    </div>`;
}

/* ========== 阿姨总览（按菜汇总，不按人） ========== */
function renderOverview() {
  const dateOrders = day.orders.filter((o) => o.date === day.date);
  const blocks = MEALS.map((meal) => {
    const mealOrders = dateOrders.filter((o) => o.mealType === meal);
    if (!mealOrders.length) return '';

    // group by dishId
    const byDish = {};
    mealOrders.forEach((o) => {
      const dk = o.dishId;
      if (!byDish[dk]) byDish[dk] = [];
      byDish[dk].push(o);
    });

    const dishCards = Object.values(byDish)
      .map((os) => {
        const first = os[0];
        const count = os.length;
        const allDone = os.every((o) => o.done);
        const link = safeLink(first.link);
        const linkBtn = link
          ? `<a class="link-btn ${first.linkPlatform === '小红书' ? 'xhs' : first.linkPlatform === '抖音' ? 'dy' : ''}" href="${esc(link)}" target="_blank" rel="noopener">${esc(first.linkPlatform)}</a>`
          : '';

        // who ordered + notes
        const notes = os
          .map((o) => {
            const m = memberById(o.memberId);
            const who = m ? `${esc(m.emoji)}${esc(m.name)}` : '?';
            return o.note ? `<span>${who}：${esc(o.note)}</span>` : '';
          })
          .filter(Boolean);
        const whoList = os
          .map((o) => {
            const m = memberById(o.memberId);
            return m ? `${esc(m.emoji)}${esc(m.name)}` : '?';
          })
          .join('、');

        return `<div class="dish">
          <div class="grow">
            <div class="name ${allDone ? 'done-mark' : ''}">${esc(first.dishName)} <span class="tag">×${count}份</span></div>
            <div class="meta" style="font-size:12px">${whoList}</div>
            ${notes.length ? `<div class="meta" style="color:#e67e22">${notes.join(' · ')}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
            ${linkBtn}
            <button class="btn sm ${allDone ? 'green' : 'ghost'}" data-action="doneDish" data-dish="${first.dishId}" data-meal="${first.mealType}">${allDone ? '已做✓' : '标记已做'}</button>
          </div>
        </div>`;
      })
      .join('');

    return `<div class="ov-meal">
      <h3>${meal}餐 · ${Object.keys(byDish).length}道菜</h3>
      ${dishCards}
    </div>`;
  }).join('');

  view().innerHTML = `
    <div class="card">
      <div class="row spread">
        <div class="section-title" style="margin:0">${esc(day.date)} · 全家点菜实时总览</div>
      </div>
      ${blocks || '<div class="empty">今天还没有人点餐</div>'}
      <div class="muted" style="margin-top:8px">实时更新 · 按菜汇总，打勾表示已做好</div>
    </div>`;
}

/* ========== 买菜清单 ========== */
function renderShopping() {
  const dateOrders = day.orders.filter((o) => o.date === day.date);
  let list = day.shopping;
  if (shopMeal !== 'all') {
    const map = new Map();
    dateOrders.filter((o) => o.mealType === shopMeal).forEach((o) => {
      (o.ingredients || []).forEach((i) => {
        const key = i.name + '|' + (i.unit || '');
        const cur = map.get(key) || { name: i.name, unit: i.unit || '', qty: 0 };
        cur.qty += Number(i.qty) || 0;
        map.set(key, cur);
      });
    });
    list = [...map.values()].map((x) => ({
      ...x,
      bought: !!(day.shopping.find((s) => s.name === x.name && s.unit === x.unit) || {}).bought,
    }));
    list.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  }

  const chips = ['all', ...MEALS]
    .map((m) => `<button class="chip ${shopMeal === m ? 'sel' : ''}" data-action="shopmeal" data-meal="${m}">${m === 'all' ? '全部' : m}</button>`)
    .join('');

  const total = list.reduce((s, i) => s + (i.bought ? 0 : 1), 0);
  const ingHtml = list.length
    ? list
        .map((i) => {
          const key = i.name + '|' + i.unit;
          return `<div class="ing ${i.bought ? 'bought' : ''}">
            <div class="check ${i.bought ? 'on' : ''}" data-action="toggleBought" data-key="${esc(key)}">${i.bought ? '✓' : ''}</div>
            <div class="grow"><div class="nm">${esc(i.name)}</div></div>
            <div class="qty">${i.qty}${esc(i.unit)}</div>
          </div>`;
        })
        .join('')
    : '<div class="empty">今天还没有需要买的食材</div>';

  view().innerHTML = `
    <div class="card">
      <div class="section-title">${esc(day.date)} · 买菜清单总览</div>
      <div class="chips" style="margin-bottom:10px">${chips}</div>
      <div class="muted" style="margin-bottom:4px">还需购买 ${total} 项（打勾表示已买）</div>
      ${ingHtml}
    </div>`;
}

/* ========== 管理 ========== */
function renderAdmin() {
  if (meta.settings.pinSet) {
    const input = prompt('管理页已上锁，请输入 PIN：');
    if (input === null) { switchTab('order'); return; }
    if (input !== meta.settings.pin) { toast('PIN 错误'); switchTab('order'); return; }
  }

  const members = meta.members
    .map((m) => `<div class="item">
      <div class="avatar" style="background:${esc(m.color)}">${esc(m.emoji || '🙂')}</div>
      <div class="grow">${esc(m.name)}</div>
      <button class="btn sm ghost" data-action="editMember" data-id="${m.id}">改</button>
      <button class="btn sm danger" data-action="delMember" data-id="${m.id}">删</button>
    </div>`).join('') || '<div class="empty">还没有成员</div>';

  const dishes = meta.dishes
    .map((d) => {
      const ings = (d.ingredients || []).map((i) => `${esc(i.name)} ${i.qty}${esc(i.unit)}`).join('、') || '无';
      return `<div class="item">
        <div class="grow">
          <div style="font-weight:600">${esc(d.name)} <span class="tag">${catName(d.category)}</span></div>
          <div class="muted">${esc((d.mealTypes || []).join('/'))} · ${esc(d.linkPlatform)}${d.link ? ' 🔗' : ''} · ${ings}</div>
        </div>
        <button class="btn sm ghost" data-action="editDish" data-id="${d.id}">改</button>
        <button class="btn sm danger" data-action="delDish" data-id="${d.id}">删</button>
      </div>`;
    }).join('') || '<div class="empty">还没有菜谱</div>';

  view().innerHTML = `
    <div class="card">
      <div class="section-title">成员管理</div>
      <div class="admin-list">${members}</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <input type="text" id="newMemName" placeholder="姓名，如 爷爷" />
        <input type="text" id="newMemEmoji" placeholder="emoji" style="max-width:70px" value="🙂" />
        <button class="btn sm" data-action="addMember">添加</button>
      </div>
    </div>
    <div class="card">
      <div class="section-title">菜谱管理${dishForm ? '（编辑中）' : ''}</div>
      <div class="admin-list">${dishes}</div>
      ${dishFormHtml()}
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn sm" data-action="newDish">+ 新增菜谱</button>
        ${dishForm ? '<button class="btn sm green" data-action="saveDish">保存</button><button class="btn sm ghost" data-action="cancelDish">取消</button>' : ''}
      </div>
    </div>
    <div class="card">
      <div class="section-title">设置</div>
      <div class="field">
        <label>管理页 PIN（留空=不上锁）</label>
        <input type="text" id="pinInput" placeholder="设置数字密码，防娃乱改" value="${esc(meta.settings.pin || '')}" />
      </div>
      <button class="btn sm" data-action="savePin">保存 PIN</button>
      <hr style="border:none;border-top:1px solid var(--line);margin:14px 0" />
      <div class="row spread">
        <button class="btn sm ghost" data-action="exportData">⬇️ 导出备份</button>
        <button class="btn sm ghost" data-action="importData">⬆️ 导入备份</button>
      </div>
      <div class="muted" style="margin-top:8px">免费云盘可能偶尔重置，重要数据记得导出备份。</div>
    </div>`;
}

function dishFormHtml() {
  if (!dishForm) return '';
  const mealChk = MEALS.map(
    (m) => `<label style="display:inline-flex;gap:4px;margin-right:10px;font-size:14px"><input type="checkbox" data-mealchk="${m}" ${(dishForm.mealTypes || []).includes(m) ? 'checked' : ''}/>${m}</label>`
  ).join('');
  const platform = ['无', '小红书', '抖音']
    .map((p) => `<option value="${p}" ${dishForm.linkPlatform === p ? 'selected' : ''}>${p}</option>`)
    .join('');
  const catOpts = CATEGORIES
    .map((c) => `<option value="${c.key}" ${dishForm.category === c.key ? 'selected' : ''}>${c.emoji} ${c.name}</option>`)
    .join('');
  const ings = (dishForm.ingredients || [])
    .map(
      (ing, idx) => `<div class="ing-row">
        <input type="text" placeholder="食材" value="${esc(ing.name)}" data-ing="name" data-idx="${idx}" />
        <input type="number" placeholder="数量" value="${esc(ing.qty)}" data-ing="qty" data-idx="${idx}" />
        <input type="text" placeholder="单位" value="${esc(ing.unit)}" data-ing="unit" data-idx="${idx}" />
        <button class="ing-del" data-action="delIng" data-idx="${idx}">×</button>
      </div>`
    )
    .join('');
  return `<div class="card" style="background:#fffaf6;margin-top:10px">
    <div class="field"><label>菜名</label><input type="text" id="dfName" value="${esc(dishForm.name || '')}" placeholder="如 番茄炒蛋" /></div>
    <div class="field"><label>分类</label><select id="dfCategory">${catOpts}</select></div>
    <div class="field"><label>适用餐次</label><div>${mealChk}</div></div>
    <div class="field"><label>做法平台</label><select id="dfPlatform">${platform}</select></div>
    <div class="field"><label>做法链接（小红书/抖音分享链接）</label><input type="url" id="dfLink" value="${esc(dishForm.link || '')}" placeholder="https://..." /></div>
    <div class="field"><label>所需食材</label>${ings}<button class="btn sm ghost" data-action="addIng">+ 加一行食材</button></div>
  </div>`;
}

/* ========== actions ========== */
async function onAction(action, el, e) {
  try {
    if (action === 'setme') {
      me = el.dataset.id;
      localStorage.setItem('fo_me', me);
      renderOrder();
    } else if (action === 'setmeal') {
      currentMeal = el.dataset.meal;
      currentCategory = 'all';
      renderOrder();
    } else if (action === 'setcat') {
      currentCategory = el.dataset.cat;
      renderOrder();
    } else if (action === 'adddish') {
      if (!me) { toast('请先选「我是谁」'); return; }
      const id = el.dataset.id;
      const existing = day.orders.find((o) => o.memberId === me && o.date === day.date && o.mealType === currentMeal && o.dishId === id);
      if (existing) {
        await api('/orders/' + existing.id, { method: 'DELETE' });
      } else {
        await api('/orders', { method: 'POST', body: JSON.stringify({ date: day.date, memberId: me, mealType: currentMeal, dishId: id }) });
      }
      await refresh();
    } else if (action === 'rmorder') {
      await api('/orders/' + el.dataset.id, { method: 'DELETE' });
      await refresh();
    } else if (action === 'note') {
      const v = el.value;
      clearTimeout(el._t);
      el._t = setTimeout(async () => {
        await api('/orders/' + el.dataset.id, { method: 'PUT', body: JSON.stringify({ note: v }) });
        await refresh();
      }, 500);
    } else if (action === 'doneDish') {
      // mark all orders for this dish+meal+date as done/undone
      const dishId = el.dataset.dish;
      const mealType = el.dataset.meal;
      const orders = day.orders.filter((o) => o.date === day.date && o.mealType === mealType && o.dishId === dishId);
      const allDone = orders.every((o) => o.done);
      for (const o of orders) {
        await api('/orders/' + o.id, { method: 'PUT', body: JSON.stringify({ done: !allDone }) });
      }
      await refresh();
    } else if (action === 'toggleBought') {
      const key = el.dataset.key;
      const item = day.shopping.find((s) => s.name + '|' + s.unit === key);
      const bought = !(item && item.bought);
      await api('/shopping/' + encodeURIComponent(day.date), { method: 'PUT', body: JSON.stringify({ key, bought }) });
      await refresh();
    } else if (action === 'shopmeal') {
      shopMeal = el.dataset.meal;
      renderShopping();
    } else if (action === 'addMember') {
      const name = document.getElementById('newMemName').value.trim();
      const emoji = document.getElementById('newMemEmoji').value.trim() || '🙂';
      if (!name) return toast('请输入姓名');
      await api('/members', { method: 'POST', body: JSON.stringify({ name, emoji }) });
      await refresh();
    } else if (action === 'editMember') {
      const m = memberById(el.dataset.id);
      const name = prompt('姓名', m.name);
      if (name === null) return;
      const emoji = prompt('emoji', m.emoji || '🙂');
      const color = prompt('颜色(十六进制)', m.color || '#888888');
      await api('/members/' + m.id, { method: 'PUT', body: JSON.stringify({ name, emoji, color }) });
      await refresh();
    } else if (action === 'delMember') {
      if (!confirm('删除该成员？其历史点餐也会移除')) return;
      await api('/members/' + el.dataset.id, { method: 'DELETE' });
      await refresh();
    } else if (action === 'newDish') {
      dishForm = { name: '', category: 'veggie', mealTypes: ['午', '晚'], linkPlatform: '无', link: '', ingredients: [{ name: '', qty: '', unit: '' }] };
      renderAdmin();
    } else if (action === 'editDish') {
      const d = dishById(el.dataset.id);
      dishForm = JSON.parse(JSON.stringify(d));
      dishForm.ingredients = (dishForm.ingredients || []).length ? dishForm.ingredients : [{ name: '', qty: '', unit: '' }];
      renderAdmin();
    } else if (action === 'cancelDish') { dishForm = null; renderAdmin();
    } else if (action === 'saveDish') {
      const name = document.getElementById('dfName').value.trim();
      if (!name) return toast('请输入菜名');
      const category = document.getElementById('dfCategory').value;
      const mealTypes = MEALS.filter((m) => document.querySelector(`[data-mealchk="${m}"]`).checked);
      const linkPlatform = document.getElementById('dfPlatform').value;
      const link = document.getElementById('dfLink').value.trim();
      const ingredients = (dishForm.ingredients || [])
        .map((i) => ({ name: (i.name || '').trim(), qty: Number(i.qty) || 0, unit: (i.unit || '').trim() }))
        .filter((i) => i.name);
      const body = { name, category, mealTypes, linkPlatform, link, ingredients };
      if (dishForm.id) {
        await api('/dishes/' + dishForm.id, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/dishes', { method: 'POST', body: JSON.stringify(body) });
      }
      dishForm = null;
      await refresh();
    } else if (action === 'addIng') {
      (dishForm.ingredients = dishForm.ingredients || []).push({ name: '', qty: '', unit: '' });
      renderAdmin();
    } else if (action === 'delIng') {
      dishForm.ingredients.splice(Number(el.dataset.idx), 1);
      renderAdmin();
    } else if (action === 'savePin') {
      const pin = document.getElementById('pinInput').value.trim();
      await api('/settings/pin', { method: 'PUT', body: JSON.stringify({ pin }) });
      await refresh();
      toast('已保存');
    } else if (action === 'exportData') {
      window.location.href = API + '/export';
    } else if (action === 'importData') {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'application/json';
      inp.onchange = async () => {
        try {
          const text = await inp.files[0].text();
          const data = JSON.parse(text);
          await api('/import', { method: 'POST', body: JSON.stringify(data) });
          await refresh();
          toast('导入成功');
        } catch (err) { toast('导入失败: ' + err.message); }
      };
      inp.click();
    }
  } catch (err) { toast('操作失败: ' + err.message); }
}

function onInput(e) {
  if (!dishForm) return;
  const t = e.target;
  if (t.dataset.ing !== undefined) {
    const idx = Number(t.dataset.idx);
    (dishForm.ingredients = dishForm.ingredients || []);
    dishForm.ingredients[idx][t.dataset.ing] = t.value;
  }
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  render();
}

// events
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (el) { e.preventDefault(); onAction(el.dataset.action, el, e); }
});
document.addEventListener('input', onInput);
document.getElementById('globalDate').addEventListener('change', async (e) => {
  day.date = e.target.value;
  await refresh();
});
document.querySelectorAll('.tabbar button').forEach((b) => {
  b.addEventListener('click', () => switchTab(b.dataset.tab));
});

// boot
(async function init() {
  await refresh();
  connectSSE();
})();
