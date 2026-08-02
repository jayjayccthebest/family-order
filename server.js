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
function dish(name, category, xhsKeyword, dyKeyword, ingredients) {
  return {
    id: crypto.randomUUID(),
    name,
    category: category || 'veggie',
    xhsLink: xhsKeyword ? ('https://www.xiaohongshu.com/search_result?keyword=' + encodeURIComponent(xhsKeyword)) : '',
    dyLink: dyKeyword ? ('https://www.douyin.com/search/' + encodeURIComponent(dyKeyword)) : '',
    ingredients: ingredients || [],
  };
}
// 调味料：家里常备，不列入买菜清单
const SEASONINGS = new Set([
  '盐','糖','生抽','老抽','醋','料酒','蚝油','酱油',
  '淀粉','姜','蒜','葱','花椒','八角','桂皮','香叶',
  '干辣椒','食用油','香油','鸡精','味精','白胡椒粉','黑胡椒粉',
  '豆瓣酱','郫县豆瓣','辣椒油','花椒油','番茄酱','冰糖',
  '小葱','大葱','生姜','蒜瓣','香菜','花椒粉','辣椒面',
  '孜然粉','十三香','芝麻油','花生油','色拉油','豆豉',
  '蒸鱼豉油','小米辣','白芝麻','芝麻酱','甜面酱','沙姜',
  '辣椒面','料酒','黄酒','啤酒'
]);

function seed() {
  // 100+ 道家常菜，5人份，小红薯+抖音双链接
  var D = dish;
  function I(n,q,u){return ing(n,q,u);}
  db = {
    members: [{ id: crypto.randomUUID(), name: '家厨', emoji: '🍳', color: '#ff7043' }],
    dishes: [
      // ==================== 猪肉类 (15道) ====================
      D('红烧肉',       'pork',  '红烧肉 家常做法',   '红烧肉 正宗做法',     [I('五花肉',750,'g'),I('鹌鹑蛋',15,'个')]),
      D('糖醋排骨',     'pork',  '糖醋排骨',          '糖醋排骨 家常',        [I('排骨',800,'g')]),
      D('回锅肉',       'pork',  '回锅肉 做法',       '回锅肉',               [I('五花肉',500,'g'),I('蒜苗',200,'g')]),
      D('鱼香肉丝',     'pork',  '鱼香肉丝',          '鱼香肉丝 做法',        [I('里脊肉',400,'g'),I('木耳',50,'g'),I('胡萝卜',1,'根'),I('青椒',2,'个')]),
      D('梅菜扣肉',     'pork',  '梅菜扣肉',          '梅菜扣肉 做法',        [I('五花肉',600,'g'),I('梅干菜',150,'g')]),
      D('粉蒸肉',       'pork',  '粉蒸肉 做法',       '粉蒸肉',               [I('五花肉',600,'g'),I('蒸肉粉',200,'g'),I('红薯',2,'个')]),
      D('蒜泥白肉',     'pork',  '蒜泥白肉',          '蒜泥白肉 做法',        [I('五花肉',500,'g'),I('黄瓜',1,'根')]),
      D('京酱肉丝',     'pork',  '京酱肉丝',          '京酱肉丝 做法',        [I('里脊肉',400,'g'),I('豆腐皮',3,'张'),I('大葱',2,'根')]),
      D('红烧排骨',     'pork',  '红烧排骨 做法',     '红烧排骨',             [I('排骨',800,'g'),I('土豆',3,'个')]),
      D('锅包肉',       'pork',  '锅包肉 做法',       '锅包肉',               [I('里脊肉',400,'g'),I('胡萝卜',1,'根')]),
      D('农家小炒肉',   'pork',  '农家小炒肉',        '农家小炒肉 做法',      [I('五花肉',400,'g'),I('青椒',4,'个'),I('豆豉',1,'勺')]),
      D('香干炒肉',     'pork',  '香干炒肉',          '香干炒肉 做法',        [I('香干',300,'g'),I('五花肉',250,'g'),I('青椒',3,'个')]),
      D('红烧狮子头',   'pork',  '红烧狮子头',        '红烧狮子头 做法',      [I('肉末',600,'g'),I('马蹄',100,'g'),I('鸡蛋',2,'个')]),
      D('酱骨架',       'pork',  '酱骨架 做法',       '酱骨架',               [I('猪脊骨',1,'根')]),
      D('蒜苗炒腊肉',   'pork',  '蒜苗炒腊肉',        '蒜苗炒腊肉 做法',      [I('腊肉',300,'g'),I('蒜苗',200,'g')]),

      // ==================== 牛羊肉类 (10道) ====================
      D('土豆炖牛肉',   'beef',  '土豆炖牛肉',        '土豆炖牛肉 做法',       [I('牛腩',700,'g'),I('土豆',3,'个'),I('胡萝卜',2,'根'),I('洋葱',1,'个'),I('番茄',2,'个')]),
      D('孜然羊肉',     'beef',  '孜然羊肉',          '孜然羊肉 做法',         [I('羊肉片',500,'g'),I('洋葱',1,'个')]),
      D('葱爆羊肉',     'beef',  '葱爆羊肉',          '葱爆羊肉 做法',         [I('羊肉片',500,'g'),I('大葱',3,'根')]),
      D('水煮牛肉',     'beef',  '水煮牛肉',          '水煮牛肉 做法',         [I('牛肉',400,'g'),I('白菜',300,'g'),I('豆芽',200,'g')]),
      D('萝卜炖牛腩',   'beef',  '萝卜炖牛腩',        '萝卜炖牛腩 做法',       [I('牛腩',700,'g'),I('白萝卜',1,'根')]),
      D('西红柿炖牛腩', 'beef',  '西红柿炖牛腩',      '西红柿炖牛腩 做法',     [I('牛腩',700,'g'),I('番茄',4,'个'),I('土豆',2,'个'),I('洋葱',1,'个')]),
      D('黑椒牛柳',     'beef',  '黑椒牛柳',          '黑椒牛柳 做法',         [I('牛肉',400,'g'),I('青椒',2,'个'),I('洋葱',1,'个')]),
      D('红烧羊肉',     'beef',  '红烧羊肉 做法',     '红烧羊肉',              [I('羊肉',800,'g'),I('胡萝卜',2,'根')]),
      D('牛排',         'beef',  '牛排 家常做法',     '牛排 做法',             [I('牛排',5,'块'),I('西兰花',1,'颗')]),
      D('香菜牛肉',     'beef',  '香菜牛肉',          '香菜牛肉 做法',         [I('牛肉',400,'g'),I('香菜',1,'把')]),

      // ==================== 鸡鸭禽类 (14道) ====================
      D('宫保鸡丁',     'poultry','宫保鸡丁',         '宫保鸡丁 做法',         [I('鸡胸肉',500,'g'),I('花生',80,'g'),I('黄瓜',1,'根')]),
      D('啤酒鸭',       'poultry','啤酒鸭 做法',      '啤酒鸭',                [I('鸭',1,'只'),I('啤酒',1,'罐')]),
      D('可乐鸡翅',     'poultry','可乐鸡翅',         '可乐鸡翅 做法',         [I('鸡翅',15,'个'),I('可乐',1,'罐')]),
      D('辣子鸡',       'poultry','辣子鸡',           '辣子鸡 做法',           [I('鸡腿肉',600,'g'),I('花生',50,'g')]),
      D('小鸡炖蘑菇',   'poultry','小鸡炖蘑菇',       '小鸡炖蘑菇 做法',       [I('三黄鸡',1,'只'),I('干香菇',50,'g'),I('粉条',100,'g')]),
      D('红烧鸡块',     'poultry','红烧鸡块 做法',    '红烧鸡块',              [I('鸡',1,'只'),I('土豆',3,'个'),I('青椒',2,'个')]),
      D('白切鸡',       'poultry','白切鸡 做法',      '白切鸡',                [I('三黄鸡',1,'只')]),
      D('黄焖鸡',       'poultry','黄焖鸡 做法',      '黄焖鸡',                [I('鸡腿肉',600,'g'),I('香菇',100,'g'),I('土豆',2,'个')]),
      D('大盘鸡',       'poultry','大盘鸡 做法',      '大盘鸡',                [I('鸡',1,'只'),I('土豆',4,'个'),I('青椒',3,'个'),I('皮带面',300,'g')]),
      D('柠檬鸡爪',     'poultry','柠檬鸡爪',         '柠檬鸡爪 做法',         [I('鸡爪',800,'g'),I('柠檬',2,'个')]),
      D('烤鸡翅',       'poultry','烤鸡翅 做法',      '烤鸡翅',                [I('鸡翅',15,'个'),I('蜂蜜',1,'勺')]),
      D('口水鸡',       'poultry','口水鸡 做法',      '口水鸡',                [I('鸡腿',5,'个'),I('花生碎',50,'g')]),
      D('盐水鸭',       'poultry','盐水鸭 做法',      '盐水鸭',                [I('鸭子',1,'只')]),
      D('三杯鸡',       'poultry','三杯鸡 做法',      '三杯鸡',                [I('鸡腿肉',600,'g'),I('罗勒叶',1,'把')]),

      // ==================== 鱼虾海鲜 (14道) ====================
      D('清蒸鲈鱼',     'seafood','清蒸鲈鱼',         '清蒸鲈鱼 做法',         [I('鲈鱼',1,'条')]),
      D('油焖大虾',     'seafood','油焖大虾',         '油焖大虾 做法',         [I('大虾',700,'g')]),
      D('红烧带鱼',     'seafood','红烧带鱼 做法',    '红烧带鱼',              [I('带鱼',600,'g')]),
      D('蒜蓉粉丝蒸虾', 'seafood','蒜蓉粉丝蒸虾',     '蒜蓉粉丝蒸虾 做法',     [I('大虾',600,'g'),I('粉丝',100,'g')]),
      D('水煮鱼',       'seafood','水煮鱼 做法',      '水煮鱼',                [I('草鱼',1,'条'),I('豆芽',300,'g')]),
      D('剁椒鱼头',     'seafood','剁椒鱼头',         '剁椒鱼头 做法',         [I('胖头鱼头',1,'个'),I('剁椒',200,'g')]),
      D('葱姜炒花蟹',   'seafood','葱姜炒花蟹',       '葱姜炒花蟹 做法',       [I('花蟹',4,'只')]),
      D('蒜香烤鱼',     'seafood','蒜香烤鱼 做法',    '蒜香烤鱼',              [I('鱼',1,'条'),I('土豆',2,'个'),I('藕',1,'节')]),
      D('香辣虾',       'seafood','香辣虾 做法',      '香辣虾',                [I('大虾',700,'g'),I('藕',1,'节'),I('土豆',2,'个')]),
      D('清蒸大闸蟹',   'seafood','清蒸大闸蟹',       '清蒸大闸蟹 做法',       [I('大闸蟹',6,'只')]),
      D('椒盐皮皮虾',   'seafood','椒盐皮皮虾',       '椒盐皮皮虾 做法',       [I('皮皮虾',800,'g')]),
      D('酸菜鱼',       'seafood','酸菜鱼 做法',      '酸菜鱼',                [I('草鱼',1,'条'),I('酸菜',300,'g'),I('豆芽',200,'g')]),
      D('香煎带鱼',     'seafood','香煎带鱼',         '香煎带鱼 做法',         [I('带鱼',600,'g')]),
      D('白灼虾',       'seafood','白灼虾 做法',      '白灼虾',                [I('基围虾',700,'g')]),

      // ==================== 豆制品/蛋类 (12道) ====================
      D('番茄炒蛋',     'eggtofu','番茄炒蛋',         '番茄炒蛋 做法',         [I('番茄',5,'个'),I('鸡蛋',8,'个')]),
      D('麻婆豆腐',     'eggtofu','麻婆豆腐',         '麻婆豆腐 做法',         [I('嫩豆腐',2,'块'),I('肉末',150,'g')]),
      D('韭菜炒蛋',     'eggtofu','韭菜炒蛋',         '韭菜炒蛋 做法',         [I('韭菜',300,'g'),I('鸡蛋',8,'个')]),
      D('家常豆腐',     'eggtofu','家常豆腐',         '家常豆腐 做法',         [I('老豆腐',2,'块'),I('青椒',2,'个'),I('木耳',50,'g')]),
      D('虾仁蒸蛋',     'eggtofu','虾仁蒸蛋',         '虾仁蒸蛋 做法',         [I('鸡蛋',8,'个'),I('虾仁',200,'g'),I('温水',1,'碗')]),
      D('皮蛋拌豆腐',   'eggtofu','皮蛋拌豆腐',       '皮蛋拌豆腐 做法',       [I('嫩豆腐',2,'块'),I('皮蛋',4,'个')]),
      D('红烧日本豆腐', 'eggtofu','红烧日本豆腐',     '红烧日本豆腐 做法',     [I('日本豆腐',5,'条'),I('青椒',2,'个'),I('胡萝卜',1,'根')]),
      D('肉末蒸蛋',     'eggtofu','肉末蒸蛋',         '肉末蒸蛋 做法',         [I('鸡蛋',6,'个'),I('肉末',200,'g')]),
      D('煎豆腐',       'eggtofu','煎豆腐 做法',      '煎豆腐',                [I('老豆腐',2,'块')]),
      D('臭豆腐煲',     'eggtofu','臭豆腐煲',         '臭豆腐煲 做法',         [I('臭豆腐',1,'份')]),
      D('腐竹炒肉',     'eggtofu','腐竹炒肉',         '腐竹炒肉 做法',         [I('腐竹',150,'g'),I('五花肉',250,'g')]),
      D('韭菜炒豆芽',   'eggtofu','韭菜炒豆芽',       '韭菜炒豆芽 做法',       [I('韭菜',200,'g'),I('豆芽',400,'g'),I('鸡蛋',4,'个')]),

      // ==================== 蔬菜类 (15道) ====================
      D('蒜蓉空心菜',   'veggie', '蒜蓉空心菜',       '蒜蓉空心菜 做法',       [I('空心菜',2,'把')]),
      D('干煸四季豆',   'veggie', '干煸四季豆',       '干煸四季豆 做法',       [I('四季豆',600,'g')]),
      D('手撕包菜',     'veggie', '手撕包菜',         '手撕包菜 做法',         [I('包菜',1,'个')]),
      D('地三鲜',       'veggie', '地三鲜 做法',      '地三鲜',                [I('土豆',3,'个'),I('茄子',2,'个'),I('青椒',3,'个')]),
      D('蚝油生菜',     'veggie', '蚝油生菜',         '蚝油生菜 做法',         [I('生菜',2,'棵')]),
      D('醋溜白菜',     'veggie', '醋溜白菜',         '醋溜白菜 做法',         [I('大白菜',1,'棵')]),
      D('清炒西兰花',   'veggie', '清炒西兰花',       '清炒西兰花 做法',       [I('西兰花',2,'颗')]),
      D('蒜蓉油麦菜',   'veggie', '蒜蓉油麦菜',       '蒜蓉油麦菜 做法',       [I('油麦菜',2,'把')]),
      D('酸辣土豆丝',   'veggie', '酸辣土豆丝',       '酸辣土豆丝 做法',       [I('土豆',4,'个'),I('青椒',2,'个')]),
      D('鱼香茄子',     'veggie', '鱼香茄子',         '鱼香茄子 做法',         [I('茄子',3,'个'),I('肉末',100,'g')]),
      D('清炒豆苗',     'veggie', '清炒豆苗',         '清炒豆苗 做法',         [I('豆苗',400,'g')]),
      D('红烧冬瓜',     'veggie', '红烧冬瓜',         '红烧冬瓜 做法',         [I('冬瓜',500,'g')]),
      D('上汤娃娃菜',   'veggie', '上汤娃娃菜',       '上汤娃娃菜 做法',       [I('娃娃菜',3,'棵'),I('皮蛋',2,'个'),I('火腿',50,'g')]),
      D('香菇油菜',     'veggie', '香菇油菜',         '香菇油菜 做法',         [I('油菜',400,'g'),I('香菇',100,'g')]),
      D('清炒时蔬',     'veggie', '清炒时蔬',         '清炒时蔬',              [I('时蔬',500,'g')]),

      // ==================== 凉菜小食 (10道) ====================
      D('拍黄瓜',       'cold',   '拍黄瓜 做法',      '拍黄瓜',                [I('黄瓜',4,'根')]),
      D('凉拌木耳',     'cold',   '凉拌木耳',         '凉拌木耳 做法',         [I('木耳',80,'g'),I('香菜',4,'根')]),
      D('凉拌三丝',     'cold',   '凉拌三丝',         '凉拌三丝 做法',         [I('粉丝',100,'g'),I('黄瓜',2,'根'),I('胡萝卜',1,'根')]),
      D('炸花生米',     'cold',   '炸花生米',         '炸花生米 做法',         [I('花生米',300,'g')]),
      D('凉拌海带丝',   'cold',   '凉拌海带丝',       '凉拌海带丝 做法',       [I('海带丝',300,'g')]),
      D('泡椒凤爪',     'cold',   '泡椒凤爪',         '泡椒凤爪 做法',         [I('鸡爪',800,'g'),I('泡椒',200,'g')]),
      D('凉拌腐竹',     'cold',   '凉拌腐竹',         '凉拌腐竹 做法',         [I('腐竹',150,'g'),I('黄瓜',2,'根')]),
      D('手撕鸡',       'cold',   '手撕鸡 做法',      '手撕鸡',                [I('三黄鸡',1,'只')]),
      D('卤牛肉',       'cold',   '卤牛肉 做法',      '卤牛肉',                [I('牛腱子',600,'g')]),
      D('凉拌藕片',     'cold',   '凉拌藕片',         '凉拌藕片 做法',         [I('藕',2,'节')]),

      // ==================== 汤羹类 (10道) ====================
      D('紫菜蛋花汤',   'soup',   '紫菜蛋花汤',       '紫菜蛋花汤 做法',       [I('紫菜',2,'张'),I('鸡蛋',5,'个'),I('虾皮',1,'小勺')]),
      D('排骨玉米汤',   'soup',   '排骨玉米汤',       '排骨玉米汤 做法',       [I('排骨',700,'g'),I('玉米',3,'根'),I('胡萝卜',2,'根')]),
      D('番茄蛋汤',     'soup',   '番茄蛋汤',         '番茄蛋汤 做法',         [I('番茄',4,'个'),I('鸡蛋',5,'个')]),
      D('冬瓜排骨汤',   'soup',   '冬瓜排骨汤',       '冬瓜排骨汤 做法',       [I('排骨',700,'g'),I('冬瓜',500,'g'),I('薏米',50,'g')]),
      D('菌菇汤',       'soup',   '菌菇汤 做法',      '菌菇汤',                [I('香菇',100,'g'),I('金针菇',150,'g'),I('杏鲍菇',1,'个'),I('枸杞',1,'小勺')]),
      D('酸辣汤',       'soup',   '酸辣汤 做法',      '酸辣汤',                [I('豆腐',1,'块'),I('鸡蛋',4,'个'),I('木耳',30,'g'),I('火腿',100,'g')]),
      D('鲫鱼豆腐汤',   'soup',   '鲫鱼豆腐汤',       '鲫鱼豆腐汤 做法',       [I('鲫鱼',2,'条'),I('豆腐',1,'块')]),
      D('莲藕排骨汤',   'soup',   '莲藕排骨汤',       '莲藕排骨汤 做法',       [I('排骨',700,'g'),I('莲藕',2,'节'),I('花生',50,'g')]),
      D('山药排骨汤',   'soup',   '山药排骨汤',       '山药排骨汤 做法',       [I('排骨',700,'g'),I('山药',300,'g')]),
      D('白萝卜排骨汤', 'soup',   '白萝卜排骨汤',     '白萝卜排骨汤 做法',     [I('排骨',700,'g'),I('白萝卜',1,'根'),I('枸杞',1,'小勺')]),

      // ==================== 主食类 (10道) ====================
      D('白米饭',       'staple', '蒸米饭 做法',      '蒸米饭',                [I('大米',4,'杯')]),
      D('小米粥',       'staple', '小米粥 做法',      '小米粥',                [I('小米',3,'杯')]),
      D('馒头',         'staple', '蒸馒头 做法',      '蒸馒头',                [I('面粉',750,'g'),I('酵母',5,'g')]),
      D('饺子',         'staple', '饺子 做法',        '包饺子',                [I('面粉',500,'g'),I('肉末',500,'g'),I('白菜',300,'g')]),
      D('南瓜粥',       'staple', '南瓜粥 做法',      '南瓜粥',                [I('大米',2,'杯'),I('南瓜',500,'g')]),
      D('葱油拌面',     'staple', '葱油拌面 做法',    '葱油拌面',              [I('面条',500,'g'),I('小葱',6,'根')]),
      D('蛋炒饭',       'staple', '蛋炒饭 做法',      '蛋炒饭',                [I('米饭',5,'碗'),I('鸡蛋',6,'个'),I('火腿',100,'g'),I('青豆',50,'g')]),
      D('炒河粉',       'staple', '炒河粉 做法',      '炒河粉',                [I('河粉',500,'g'),I('牛肉',200,'g'),I('豆芽',200,'g')]),
      D('炸酱面',       'staple', '炸酱面 做法',      '炸酱面',                [I('面条',500,'g'),I('肉末',300,'g'),I('黄瓜',2,'根'),I('黄豆芽',100,'g')]),
      D('红烧牛肉面',   'staple', '红烧牛肉面 做法',  '红烧牛肉面',            [I('面条',500,'g'),I('牛肉',400,'g'),I('白萝卜',1,'根')]),
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
  var map = new Map();
  var dayOrders = db.orders.filter(function(o) { return o.date === date; });
  for (var i = 0; i < dayOrders.length; i++) {
    var o = dayOrders[i];
    for (var j = 0; j < (o.ingredients || []).length; j++) {
      var ing = o.ingredients[j];
      // 排除调味料
      if (SEASONINGS.has(ing.name)) continue;
      var unit = ing.unit || '';
      var key = ing.name + '|' + unit;
      var cur = map.get(key) || { name: ing.name, unit: unit, qty: 0 };
      cur.qty += Number(ing.qty) || 0;
      map.set(key, cur);
    }
  }
  var boughtMap = (db.shopping && db.shopping[date]) || {};
  var list = [];
  map.forEach(function(x) { list.push({ name: x.name, unit: x.unit, qty: x.qty, bought: !!boughtMap[x.name + '|' + x.unit] }); });
  list.sort(function(a, b) { return a.name.localeCompare(b.name, 'zh'); });
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
      mealType: '正餐',
      dishId: d.id,
      dishName: d.name,
      xhsLink: d.xhsLink || '',
      dyLink: d.dyLink || '',
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
        xhsLink: b.xhsLink || '',
        dyLink: b.dyLink || '',
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
      if ('xhsLink' in b) d.xhsLink = b.xhsLink;
      if ('dyLink' in b) d.dyLink = b.dyLink;
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
