'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_FILE = path.join(ROOT, 'data.json');

let db = {
  members: [],
  dishes: [],
  orders: [],
  shopping: {}, // { [date]: { "name|unit": true } }
  settings: { pin: '' },
};

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      db.members = Array.isArray(parsed.members) ? parsed.members : [];
      db.dishes = Array.isArray(parsed.dishes) ? parsed.dishes : [];
      db.orders = Array.isArray(parsed.orders) ? parsed.orders : [];
      db.shopping = parsed.shopping && typeof parsed.shopping === 'object' ? parsed.shopping : {};
      db.settings = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : { pin: '' };
    } else {
      seed();
    }
  } catch (e) {
    console.error('加载数据失败，使用种子数据:', e.message);
    seed();
  }
}

function ing(name, qty, unit) {
  return { name, qty: Number(qty) || 0, unit: unit || '' };
}
function dish(name, category, mealTypes, linkPlatform, link, ingredients) {
  return {
    id: crypto.randomUUID(),
    name,
    category: category || 'veggie',
    mealTypes,
    linkPlatform: linkPlatform || '无',
    link: link || '',
    ingredients: ingredients || [],
  };
}

function seed() {
  // 链接生成辅助：小红书 = xhs("菜名"), 抖音 = dy("菜名")
  function xhs(k) { return 'https://www.xiaohongshu.com/search_result?keyword=' + encodeURIComponent(k); }
  function dy(k) { return 'https://www.douyin.com/search/' + encodeURIComponent(k); }
  // 食材份量均按 5 人份

  db = {
    members: [
      { id: crypto.randomUUID(), name: '家厨', emoji: '🍳', color: '#ff7043' },
    ],
    dishes: [
      // ===== 猪肉类 (8道) =====
      dish('红烧肉',       'pork',  ['午','晚'], '小红书', xhs('红烧肉 家常做法'),       [ing('五花肉',750,'g'),ing('冰糖',50,'g'),ing('生抽',3,'勺'),ing('老抽',1,'勺'),ing('八角',3,'个')]),
      dish('糖醋排骨',     'pork',  ['午','晚'], '抖音',   dy('糖醋排骨'),                 [ing('排骨',800,'g'),ing('醋',3,'勺'),ing('糖',4,'勺'),ing('番茄酱',2,'勺')]),
      dish('回锅肉',       'pork',  ['午','晚'], '小红书', xhs('回锅肉'),                   [ing('五花肉',500,'g'),ing('蒜苗',200,'g'),ing('豆瓣酱',2,'勺'),ing('豆豉',1,'勺')]),
      dish('鱼香肉丝',     'pork',  ['午','晚'], '抖音',   dy('鱼香肉丝'),                 [ing('里脊肉',400,'g'),ing('木耳',50,'g'),ing('胡萝卜',1,'根'),ing('青椒',2,'个'),ing('郫县豆瓣',1,'勺')]),
      dish('梅菜扣肉',     'pork',  ['午','晚'], '小红书', xhs('梅菜扣肉'),                 [ing('五花肉',600,'g'),ing('梅干菜',150,'g'),ing('老抽',2,'勺')]),
      dish('粉蒸肉',       'pork',  ['午','晚'], '抖音',   dy('粉蒸肉'),                   [ing('五花肉',600,'g'),ing('蒸肉粉',200,'g'),ing('红薯',2,'个')]),
      dish('蒜泥白肉',     'pork',  ['午','晚'], '小红书', xhs('蒜泥白肉'),                 [ing('五花肉',500,'g'),ing('蒜',8,'瓣'),ing('酱油',3,'勺'),ing('红油',2,'勺'),ing('黄瓜',1,'根')]),
      dish('京酱肉丝',     'pork',  ['午','晚'], '抖音',   dy('京酱肉丝'),                 [ing('里脊肉',400,'g'),ing('甜面酱',3,'勺'),ing('大葱',2,'根'),ing('豆腐皮',3,'张')]),

      // ===== 牛羊肉类 (6道) =====
      dish('土豆炖牛肉',   'beef',  ['午','晚'], '小红书', xhs('土豆炖牛肉'),               [ing('牛腩',700,'g'),ing('土豆',3,'个'),ing('胡萝卜',2,'根'),ing('洋葱',1,'个'),ing('番茄',2,'个')]),
      dish('孜然羊肉',     'beef',  ['午','晚'], '抖音',   dy('孜然羊肉'),                 [ing('羊肉片',500,'g'),ing('洋葱',1,'个'),ing('孜然粉',2,'勺'),ing('辣椒面',1,'勺'),ing('香菜',3,'根')]),
      dish('葱爆羊肉',     'beef',  ['午','晚'], '小红书', xhs('葱爆羊肉'),                 [ing('羊肉片',500,'g'),ing('大葱',3,'根'),ing('姜',1,'块'),ing('酱油',2,'勺')]),
      dish('水煮牛肉',     'beef',  ['午','晚'], '抖音',   dy('水煮牛肉'),                 [ing('牛肉',400,'g'),ing('白菜',300,'g'),ing('豆芽',200,'g'),ing('干辣椒',10,'个'),ing('花椒',2,'勺'),ing('郫县豆瓣',2,'勺')]),
      dish('萝卜炖牛腩',   'beef',  ['午','晚'], '小红书', xhs('萝卜炖牛腩'),               [ing('牛腩',700,'g'),ing('白萝卜',1,'根'),ing('姜',1,'块'),ing('八角',3,'个')]),
      dish('西红柿炖牛腩', 'beef',  ['午','晚'], '抖音',   dy('西红柿炖牛腩'),             [ing('牛腩',700,'g'),ing('番茄',4,'个'),ing('土豆',2,'个'),ing('洋葱',1,'个')]),

      // ===== 鸡鸭禽类 (7道) =====
      dish('宫保鸡丁',     'poultry', ['午','晚'], '小红书', xhs('宫保鸡丁'),               [ing('鸡胸肉',500,'g'),ing('花生',80,'g'),ing('黄瓜',1,'根'),ing('干辣椒',8,'个'),ing('花椒',1,'勺')]),
      dish('啤酒鸭',       'poultry', ['午','晚'], '抖音',   dy('啤酒鸭'),                 [ing('鸭',1,'只'),ing('啤酒',1,'罐'),ing('八角',3,'个'),ing('桂皮',1,'块'),ing('干辣椒',6,'个'),ing('蒜',5,'瓣')]),
      dish('可乐鸡翅',     'poultry', ['午','晚'], '小红书', xhs('可乐鸡翅'),               [ing('鸡翅',12,'个'),ing('可乐',1,'罐'),ing('生抽',2,'勺'),ing('姜',1,'块')]),
      dish('辣子鸡',       'poultry', ['午','晚'], '抖音',   dy('辣子鸡'),                 [ing('鸡腿肉',600,'g'),ing('干辣椒',20,'个'),ing('花椒',2,'勺'),ing('花生',50,'g')]),
      dish('小鸡炖蘑菇',   'poultry', ['午','晚'], '小红书', xhs('小鸡炖蘑菇'),               [ing('三黄鸡',1,'只'),ing('干香菇',50,'g'),ing('粉条',100,'g'),ing('姜',1,'块')]),
      dish('红烧鸡块',     'poultry', ['午','晚'], '抖音',   dy('红烧鸡块'),               [ing('鸡',1,'只'),ing('土豆',3,'个'),ing('青椒',2,'个'),ing('生抽',3,'勺'),ing('八角',3,'个')]),
      dish('白切鸡',       'poultry', ['午','晚'], '小红书', xhs('白切鸡'),                 [ing('三黄鸡',1,'只'),ing('姜',2,'块'),ing('葱',3,'根'),ing('沙姜',1,'块')]),

      // ===== 鱼虾海鲜 (7道) =====
      dish('清蒸鲈鱼',     'seafood', ['午','晚'], '抖音',   dy('清蒸鲈鱼'),               [ing('鲈鱼',1,'条'),ing('葱',3,'根'),ing('姜',1,'块'),ing('蒸鱼豉油',3,'勺')]),
      dish('油焖大虾',     'seafood', ['午','晚'], '小红书', xhs('油焖大虾'),               [ing('大虾',700,'g'),ing('蒜',8,'瓣'),ing('番茄酱',2,'勺'),ing('生抽',2,'勺')]),
      dish('红烧带鱼',     'seafood', ['午','晚'], '抖音',   dy('红烧带鱼'),               [ing('带鱼',600,'g'),ing('葱',2,'根'),ing('姜',1,'块'),ing('生抽',3,'勺'),ing('糖',1,'勺')]),
      dish('蒜蓉粉丝蒸虾', 'seafood', ['午','晚'], '小红书', xhs('蒜蓉粉丝蒸虾'),             [ing('大虾',600,'g'),ing('粉丝',100,'g'),ing('蒜',10,'瓣'),ing('小米辣',3,'个')]),
      dish('水煮鱼',       'seafood', ['午','晚'], '抖音',   dy('水煮鱼'),                 [ing('草鱼',1,'条'),ing('豆芽',300,'g'),ing('干辣椒',15,'个'),ing('花椒',3,'勺'),ing('郫县豆瓣',2,'勺')]),
      dish('剁椒鱼头',     'seafood', ['午','晚'], '小红书', xhs('剁椒鱼头'),               [ing('胖头鱼头',1,'个'),ing('剁椒',200,'g'),ing('姜',1,'块'),ing('蒜',5,'瓣'),ing('蒸鱼豉油',2,'勺')]),
      dish('葱姜炒花蟹',   'seafood', ['午','晚'], '抖音',   dy('葱姜炒花蟹'),             [ing('花蟹',3,'只'),ing('葱',3,'根'),ing('姜',2,'块'),ing('料酒',2,'勺')]),

      // ===== 豆制品/蛋类 (6道) =====
      dish('番茄炒蛋',     'eggtofu', ['早','午','晚'], '小红书', xhs('番茄炒蛋'),         [ing('番茄',5,'个'),ing('鸡蛋',8,'个'),ing('葱',2,'根'),ing('糖',1,'勺')]),
      dish('麻婆豆腐',     'eggtofu', ['午','晚'],  '抖音',   dy('麻婆豆腐'),             [ing('嫩豆腐',2,'块'),ing('肉末',150,'g'),ing('豆瓣酱',2,'勺'),ing('花椒粉',1,'勺'),ing('蒜',3,'瓣')]),
      dish('韭菜炒蛋',     'eggtofu', ['早','午','晚'], '小红书', xhs('韭菜炒蛋'),         [ing('韭菜',300,'g'),ing('鸡蛋',8,'个'),ing('盐',1,'小勺')]),
      dish('家常豆腐',     'eggtofu', ['午','晚'],  '抖音',   dy('家常豆腐'),             [ing('老豆腐',2,'块'),ing('青椒',2,'个'),ing('木耳',50,'g'),ing('豆瓣酱',1,'勺')]),
      dish('虾仁蒸蛋',     'eggtofu', ['午','晚'],  '小红书', xhs('虾仁蒸蛋'),             [ing('鸡蛋',8,'个'),ing('虾仁',200,'g'),ing('温水',1,'碗'),ing('生抽',1,'勺')]),
      dish('皮蛋拌豆腐',   'eggtofu', ['午','晚'],  '抖音',   dy('皮蛋拌豆腐'),           [ing('嫩豆腐',2,'块'),ing('皮蛋',4,'个'),ing('蒜',3,'瓣'),ing('生抽',2,'勺'),ing('香油',1,'勺')]),

      // ===== 蔬菜类 (7道) =====
      dish('蒜蓉空心菜',   'veggie', ['午','晚'],  '无', '',                              [ing('空心菜',2,'把'),ing('蒜',10,'瓣'),ing('盐',1,'小勺')]),
      dish('干煸四季豆',   'veggie', ['午','晚'],  '抖音',   dy('干煸四季豆'),           [ing('四季豆',600,'g'),ing('干辣椒',6,'个'),ing('花椒',1,'勺'),ing('蒜',5,'瓣')]),
      dish('手撕包菜',     'veggie', ['午','晚'],  '小红书', xhs('手撕包菜'),             [ing('包菜',1,'个'),ing('干辣椒',8,'个'),ing('蒜',5,'瓣'),ing('生抽',2,'勺'),ing('醋',1,'勺')]),
      dish('地三鲜',       'veggie', ['午','晚'],  '抖音',   dy('地三鲜'),               [ing('土豆',3,'个'),ing('茄子',2,'个'),ing('青椒',3,'个'),ing('蒜',5,'瓣'),ing('生抽',2,'勺')]),
      dish('蚝油生菜',     'veggie', ['午','晚'],  '小红书', xhs('蚝油生菜'),             [ing('生菜',2,'棵'),ing('蚝油',3,'勺'),ing('蒜',8,'瓣')]),
      dish('醋溜白菜',     'veggie', ['午','晚'],  '抖音',   dy('醋溜白菜'),             [ing('大白菜',1,'棵'),ing('干辣椒',5,'个'),ing('醋',3,'勺'),ing('蒜',5,'瓣')]),
      dish('清炒西兰花',   'veggie', ['午','晚'],  '小红书', xhs('清炒西兰花'),           [ing('西兰花',2,'颗'),ing('蒜',6,'瓣'),ing('盐',1,'小勺'),ing('蚝油',1,'勺')]),

      // ===== 凉菜小食 (6道) =====
      dish('拍黄瓜',       'cold',   ['午','晚'],  '无', '',                              [ing('黄瓜',4,'根'),ing('蒜',8,'瓣'),ing('醋',3,'勺'),ing('生抽',2,'勺'),ing('辣椒油',1,'勺')]),
      dish('凉拌木耳',     'cold',   ['午','晚'],  '小红书', xhs('凉拌木耳'),             [ing('木耳',80,'g'),ing('香菜',4,'根'),ing('蒜',5,'瓣'),ing('醋',2,'勺'),ing('生抽',2,'勺'),ing('辣椒油',1,'勺')]),
      dish('凉拌三丝',     'cold',   ['午','晚'],  '抖音',   dy('凉拌三丝'),             [ing('粉丝',100,'g'),ing('黄瓜',2,'根'),ing('胡萝卜',1,'根'),ing('蒜',5,'瓣'),ing('醋',2,'勺')]),
      dish('口水鸡',       'cold',   ['午','晚'],  '小红书', xhs('口水鸡'),               [ing('鸡腿',4,'个'),ing('花生碎',50,'g'),ing('红油',3,'勺'),ing('花椒粉',1,'勺'),ing('蒜',5,'瓣'),ing('芝麻酱',1,'勺')]),
      dish('炸花生米',     'cold',   ['午','晚'],  '无', '',                              [ing('花生米',300,'g'),ing('盐',1,'小勺'),ing('油',2,'勺')]),
      dish('凉拌海带丝',   'cold',   ['午','晚'],  '抖音',   dy('凉拌海带丝'),           [ing('海带丝',300,'g'),ing('蒜',5,'瓣'),ing('醋',2,'勺'),ing('辣椒油',1,'勺')]),

      // ===== 汤羹类 (6道) =====
      dish('紫菜蛋花汤',   'soup',   ['午','晚'],  '无', '',                              [ing('紫菜',2,'张'),ing('鸡蛋',5,'个'),ing('葱',2,'根'),ing('虾皮',1,'小勺'),ing('香油',1,'勺')]),
      dish('排骨玉米汤',   'soup',   ['午','晚'],  '小红书', xhs('排骨玉米汤'),           [ing('排骨',700,'g'),ing('玉米',3,'根'),ing('胡萝卜',2,'根'),ing('姜',1,'块')]),
      dish('番茄蛋汤',     'soup',   ['午','晚'],  '抖音',   dy('番茄蛋汤'),             [ing('番茄',4,'个'),ing('鸡蛋',5,'个'),ing('葱',2,'根')]),
      dish('冬瓜排骨汤',   'soup',   ['午','晚'],  '小红书', xhs('冬瓜排骨汤'),           [ing('排骨',700,'g'),ing('冬瓜',500,'g'),ing('薏米',50,'g'),ing('姜',1,'块')]),
      dish('菌菇汤',       'soup',   ['午','晚'],  '抖音',   dy('菌菇汤'),               [ing('香菇',100,'g'),ing('金针菇',150,'g'),ing('杏鲍菇',1,'个'),ing('枸杞',1,'小勺'),ing('姜',1,'块')]),
      dish('酸辣汤',       'soup',   ['午','晚'],  '小红书', xhs('酸辣汤'),               [ing('豆腐',1,'块'),ing('鸡蛋',4,'个'),ing('木耳',30,'g'),ing('醋',3,'勺'),ing('白胡椒粉',1,'勺'),ing('火腿',100,'g')]),

      // ===== 主食类 (7道) =====
      dish('白米饭',       'staple', ['早','午','晚'], '无', '',                          [ing('大米',4,'杯')]),
      dish('小米粥',       'staple', ['早'],  '小红书', xhs('小米粥'),                     [ing('小米',3,'杯')]),
      dish('蛋炒饭',       'staple', ['早','午'], '抖音', dy('蛋炒饭'),                    [ing('米饭',5,'碗'),ing('鸡蛋',6,'个'),ing('火腿',100,'g'),ing('青豆',50,'g'),ing('葱',2,'根')]),
      dish('葱油拌面',     'staple', ['早','午'], '小红书', xhs('葱油拌面'),               [ing('面条',500,'g'),ing('小葱',6,'根'),ing('油',4,'勺'),ing('生抽',3,'勺'),ing('老抽',1,'勺')]),
      dish('馒头',         'staple', ['早','午','晚'], '无', '',                           [ing('面粉',750,'g'),ing('酵母',5,'g')]),
      dish('饺子',         'staple', ['午','晚'], '抖音', dy('饺子'),                      [ing('面粉',500,'g'),ing('肉末',500,'g'),ing('白菜',300,'g'),ing('葱姜',1,'份')]),
      dish('南瓜粥',       'staple', ['早'],  '小红书', xhs('南瓜粥'),                     [ing('大米',2,'杯'),ing('南瓜',500,'g')]),
    ],
    orders: [],
    shopping: {},
    settings: { pin: '' },
  };
  save();
}

function save() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('保存失败:', e.message);
  }
}

// ---------- SSE ----------
const sseClients = new Set();
function broadcast() {
  const payload = `data: ${JSON.stringify({ type: 'update', ts: Date.now() })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch (e) {
      sseClients.delete(res);
    }
  }
}
function changed() {
  save();
  broadcast();
}

// ---------- helpers ----------
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 2e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, obj, status = 200) {
  const s = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(s);
}

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function aggregateShopping(date) {
  const map = new Map();
  const dayOrders = db.orders.filter((o) => o.date === date);
  for (const o of dayOrders) {
    for (const ing of o.ingredients || []) {
      const unit = ing.unit || '';
      const key = ing.name + '|' + unit;
      const cur = map.get(key) || { name: ing.name, unit, qty: 0 };
      cur.qty += Number(ing.qty) || 0;
      map.set(key, cur);
    }
  }
  const boughtMap = (db.shopping && db.shopping[date]) || {};
  const list = [...map.values()].map((x) => ({ ...x, bought: !!boughtMap[x.name + '|' + x.unit] }));
  list.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  return list;
}

// ---------- API ----------
async function handleApi(req, res, parsed) {
  const { pathname, query } = parsed;
  const method = req.method;
  const p = pathname.replace(/^\/api\//, '').replace(/\/+$/, '');

  if (p === 'ping') return sendJson(res, { ok: true });

  if (p === 'meta' && method === 'GET') {
    return sendJson(res, {
      members: db.members,
      dishes: db.dishes,
      settings: { pinSet: !!db.settings.pin },
    });
  }

  if (p === 'day' && method === 'GET') {
    const date = query.date || todayStr();
    return sendJson(res, {
      date,
      orders: db.orders.filter((o) => o.date === date),
      shopping: aggregateShopping(date),
    });
  }

  // orders
  if (p === 'orders' && method === 'POST') {
    const b = await readBody(req);
    if (!b.date || !b.memberId || !b.dishId) return sendJson(res, { error: '缺少参数' }, 400);
    const d = db.dishes.find((x) => x.id === b.dishId);
    if (!d) return sendJson(res, { error: '菜谱不存在' }, 404);
    const order = {
      id: crypto.randomUUID(),
      date: b.date,
      memberId: b.memberId,
      mealType: b.mealType || '晚',
      dishId: d.id,
      dishName: d.name,
      link: d.link || '',
      linkPlatform: d.linkPlatform || '无',
      ingredients: (d.ingredients || []).map((x) => ({ ...x })),
      note: b.note || '',
      done: false,
      createdAt: new Date().toISOString(),
    };
    db.orders.push(order);
    changed();
    return sendJson(res, order, 201);
  }

  if (p.startsWith('orders/')) {
    const id = decodeURIComponent(p.split('/')[1]);
    const order = db.orders.find((o) => o.id === id);
    if (!order) return sendJson(res, { error: '订单不存在' }, 404);
    if (method === 'PUT') {
      const b = await readBody(req);
      if ('note' in b) order.note = b.note;
      if ('done' in b) order.done = !!b.done;
      if ('mealType' in b) order.mealType = b.mealType;
      changed();
      return sendJson(res, order);
    }
    if (method === 'DELETE') {
      db.orders = db.orders.filter((o) => o.id !== id);
      changed();
      return sendJson(res, { ok: true });
    }
  }

  // shopping bought toggle
  if (p.startsWith('shopping/')) {
    const date = decodeURIComponent(p.split('/')[1]);
    if (method === 'PUT') {
      const b = await readBody(req);
      const key = b.key;
      if (!db.shopping[date]) db.shopping[date] = {};
      if (b.bought) db.shopping[date][key] = true;
      else delete db.shopping[date][key];
      changed();
      return sendJson(res, { ok: true });
    }
  }

  // members
  if (p === 'members') {
    if (method === 'GET') return sendJson(res, db.members);
    if (method === 'POST') {
      const b = await readBody(req);
      if (!b.name) return sendJson(res, { error: '缺少姓名' }, 400);
      const m = { id: crypto.randomUUID(), name: b.name, emoji: b.emoji || '🙂', color: b.color || '#888888' };
      db.members.push(m);
      changed();
      return sendJson(res, m, 201);
    }
  }
  if (p.startsWith('members/')) {
    const id = decodeURIComponent(p.split('/')[1]);
    const m = db.members.find((x) => x.id === id);
    if (!m) return sendJson(res, { error: '成员不存在' }, 404);
    if (method === 'PUT') {
      const b = await readBody(req);
      if ('name' in b) m.name = b.name;
      if ('emoji' in b) m.emoji = b.emoji;
      if ('color' in b) m.color = b.color;
      changed();
      return sendJson(res, m);
    }
    if (method === 'DELETE') {
      db.members = db.members.filter((x) => x.id !== id);
      db.orders = db.orders.filter((o) => o.memberId !== id);
      changed();
      return sendJson(res, { ok: true });
    }
  }

  // dishes
  if (p === 'dishes') {
    if (method === 'GET') return sendJson(res, db.dishes);
    if (method === 'POST') {
      const b = await readBody(req);
      if (!b.name) return sendJson(res, { error: '缺少菜名' }, 400);
      const d = {
        id: crypto.randomUUID(),
        name: b.name,
        category: b.category || 'veggie',
        mealTypes: Array.isArray(b.mealTypes) ? b.mealTypes : ['午', '晚'],
        linkPlatform: b.linkPlatform || '无',
        link: b.link || '',
        ingredients: Array.isArray(b.ingredients) ? b.ingredients : [],
      };
      db.dishes.push(d);
      changed();
      return sendJson(res, d, 201);
    }
  }
  if (p.startsWith('dishes/')) {
    const id = decodeURIComponent(p.split('/')[1]);
    const d = db.dishes.find((x) => x.id === id);
    if (!d) return sendJson(res, { error: '菜谱不存在' }, 404);
    if (method === 'PUT') {
      const b = await readBody(req);
      if ('name' in b) d.name = b.name;
      if ('category' in b) d.category = b.category;
      if ('mealTypes' in b) d.mealTypes = b.mealTypes;
      if ('linkPlatform' in b) d.linkPlatform = b.linkPlatform;
      if ('link' in b) d.link = b.link;
      if ('ingredients' in b) d.ingredients = b.ingredients;
      changed();
      return sendJson(res, d);
    }
    if (method === 'DELETE') {
      db.dishes = db.dishes.filter((x) => x.id !== id);
      changed();
      return sendJson(res, { ok: true });
    }
  }

  // settings pin
  if (p === 'settings/pin' && method === 'PUT') {
    const b = await readBody(req);
    db.settings.pin = b.pin || '';
    changed();
    return sendJson(res, { ok: true, pinSet: !!db.settings.pin });
  }

  // export / import
  if (p === 'export' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="family-order-backup.json"',
    });
    return res.end(JSON.stringify(db, null, 2));
  }
  if (p === 'import' && method === 'POST') {
    const b = await readBody(req);
    if (!b || !Array.isArray(b.members)) return sendJson(res, { error: '格式错误' }, 400);
    db.members = b.members || [];
    db.dishes = b.dishes || [];
    db.orders = b.orders || [];
    db.shopping = b.shopping || {};
    db.settings = b.settings || { pin: '' };
    changed();
    return sendJson(res, { ok: true });
  }

  return sendJson(res, { error: 'not found' }, 404);
}

// ---------- static ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  try {
    if (pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write('retry: 3000\n\n');
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }
    if (pathname.startsWith('/api/')) {
      return await handleApi(req, res, parsed);
    }
    return serveStatic(req, res, pathname);
  } catch (e) {
    console.error('请求错误:', e);
    if (!res.headersSent) sendJson(res, { error: String(e && e.message ? e.message : e) }, 500);
  }
});

load();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`家庭点餐系统已启动: http://localhost:${PORT}`);
});
