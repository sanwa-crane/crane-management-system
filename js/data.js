/**
 * データ管理モジュール（Firebase Firestore版）
 * 全端末でリアルタイムにデータが同期されます。
 *
 * コレクション構成:
 *   cranes/       - クレーン情報
 *   maintenance/  - メンテナンス記録
 */

/* ─── メンテナンス種別定義（拡張時はここに追加） ─── */
const MAINT_TYPES = [
  { key: 'engine_oil',             label: 'エンジンオイル交換',               icon: 'fa-oil-can'          },
  { key: 'engine_oil_filter',      label: 'エンジンオイルフィルター交換',     icon: 'fa-filter'           },
  { key: 'fuel_filter',            label: '燃料フィルター交換',               icon: 'fa-gas-pump'         },
  { key: 'blowby_filter',          label: 'ブローバイフィルター交換',         icon: 'fa-wind'             },
  { key: 'water_separator_filter', label: 'ウォーターセパレーターフィルター交換', icon: 'fa-water'         },
  { key: 'air_dryer_filter',       label: 'エアドライヤーフィルター交換',     icon: 'fa-fan'              },
  { key: 'coolant',                label: 'クーラント交換',                   icon: 'fa-temperature-half' },
  { key: 'hydraulic_oil',          label: '作動油交換',                       icon: 'fa-droplet'          },
  { key: 'hydraulic_oil_filter',   label: '作動油フィルター交換',             icon: 'fa-filter'           },
  { key: 'other',                  label: 'その他',                           icon: 'fa-wrench'           },
];

const DataStore = {

  /* ============================================================
     初期化：認証だけを行う
     本番データ保護のため、サンプルデータの自動投入は行いません。
     初期データが必要な場合は管理画面から明示的に登録してください。
     ============================================================ */
  async init() {
    await this._ensureSignedIn();
  },

  /* ============================================================
     クレーン CRUD
     ============================================================ */

  async getCranes() {
    const snap = await db.collection('cranes').get();
    const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    return list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  },

  async getCrane(id) {
    const doc = await db.collection('cranes').doc(id).get();
    return doc.exists ? { ...doc.data(), id: doc.id } : null;
  },

  async saveCrane(crane) {
    if (!crane.id) {
      const ref = db.collection('cranes').doc();
      crane.id        = ref.id;
      crane.createdAt = new Date().toISOString();
      crane.updatedAt = new Date().toISOString();
      await ref.set(crane);
      return crane;
    }
    crane.updatedAt = new Date().toISOString();
    await db.collection('cranes').doc(crane.id).set(crane);
    return crane;
  },

  async deleteCrane(id) {
    const batch = db.batch();
    batch.delete(db.collection('cranes').doc(id));

    const collections = ['maintenance', 'inspections', 'repairs'];
    for (const name of collections) {
      const snap = await db.collection(name).where('craneId', '==', id).get();
      snap.docs.forEach(d => batch.delete(d.ref));
    }

    await batch.commit();
  },

  /* ============================================================
     メンテナンス記録 CRUD
     ============================================================ */

  async getAllMaintenanceRecords() {
    const snap = await db.collection('maintenance').get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  },

  async getMaintenanceRecords(craneId) {
    const snap = await db.collection('maintenance')
      .where('craneId', '==', craneId)
      .get();
    const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },

  async getLatestMaintenanceByType(craneId) {
    const records = await this.getMaintenanceRecords(craneId);
    const latest  = {};
    MAINT_TYPES.forEach(t => {
      latest[t.key] = records.find(r => r.type === t.key) || null;
    });
    return latest;
  },

  async saveMaintenanceRecord(record) {
    if (!record.id) {
      record.id        = this._generateId('M');
      record.createdAt = new Date().toISOString();
    }
    record.updatedAt = new Date().toISOString();
    await db.collection('maintenance').doc(record.id).set(record);
    return record;
  },

  async deleteMaintenanceRecord(id) {
    await db.collection('maintenance').doc(id).delete();
  },

  async getMaintenanceRecord(id) {
    const doc = await db.collection('maintenance').doc(id).get();
    return doc.exists ? { ...doc.data(), id: doc.id } : null;
  },

  /* ============================================================
     点検記録 CRUD
     ============================================================ */

  async getInspectionRecords(craneId) {
    const snap = await db.collection('inspections').where('craneId', '==', craneId).get();
    const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },

  async getInspectionRecord(id) {
    const doc = await db.collection('inspections').doc(id).get();
    return doc.exists ? { ...doc.data(), id: doc.id } : null;
  },

  async saveInspectionRecord(record) {
    if (!record.id) {
      record.id        = this._generateId('I');
      record.createdAt = new Date().toISOString();
    }
    record.updatedAt = new Date().toISOString();
    await db.collection('inspections').doc(record.id).set(record);
    return record;
  },

  async deleteInspectionRecord(id) {
    await db.collection('inspections').doc(id).delete();
  },

  /* ============================================================
     修理記録 CRUD
     ============================================================ */

  async getRepairRecords(craneId) {
    const snap = await db.collection('repairs').where('craneId', '==', craneId).get();
    const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },

  async getRepairRecord(id) {
    const doc = await db.collection('repairs').doc(id).get();
    return doc.exists ? { ...doc.data(), id: doc.id } : null;
  },

  async saveRepairRecord(record) {
    if (!record.id) {
      record.id        = this._generateId('R');
      record.createdAt = new Date().toISOString();
    }
    record.updatedAt = new Date().toISOString();
    await db.collection('repairs').doc(record.id).set(record);
    return record;
  },

  async deleteRepairRecord(id) {
    await db.collection('repairs').doc(id).delete();
  },

  async getAllRepairRecords() {
    const snap = await db.collection('repairs').get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  },

  /* ============================================================
     ユーティリティ
     ============================================================ */

  async _ensureSignedIn() {
    if (!window.firebase?.auth) return;

    /* 既存セッション（管理者ログイン含む）の復元を待つ。
       待たずに匿名ログインすると管理者セッションを上書きしてしまう。 */
    const user = await new Promise(resolve => {
      const unsubscribe = firebase.auth().onAuthStateChanged(u => {
        unsubscribe();
        resolve(u);
      });
    });
    if (user) return;

    await firebase.auth().signInAnonymously();
  },

  _generateId(prefix = 'ID') {
    return prefix + Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase();
  },

  getMaintTypes()       { return MAINT_TYPES; },
  getMaintLabel(key)    { return MAINT_TYPES.find(t => t.key === key)?.label || key; },
  getMaintIcon(key)     { return MAINT_TYPES.find(t => t.key === key)?.icon  || 'fa-wrench'; },
};
