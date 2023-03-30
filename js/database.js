class DataBase {
  constructor() {
    const dbVersion = 3;
    const dbName = "SimpleNewTab";
    const tables = ["Picture", "Config", "BackgroundPosition"];
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, dbVersion);
      req.onerror = (err) => {
        console.warn("打开数据库失败", err);
        reject(false);
      };
      req.onsuccess = (e) => {
        this[db] = e.target.result;
        resolve(this);
      };
      req.onupgradeneeded = async (e) => {
        this[db] = e.target.result;
        for (let table of tables) {
          if (!this[db].objectStoreNames.contains(table)) {
            await new Promise((resolve) => {
              this[db].createObjectStore(table, {
                keyPath: "id",
              });
              resolve(this);
            });
          }
        }
      };
    });
  }
  /**
   * 打开一张表
   * @param {String} tableName 表名称
   * @returns 
   */
  open(tableName) {
    if (this[db].objectStoreNames.contains(tableName)) {
      return new Table(this[db], tableName);
    }
    return false;
  }
  get tables() {
    return this[db].objectStoreNames || new DOMStringList();
  }
}

class Table {
/**
 * 封装表格方法
 * @param {IDBIndex} database 数据库对象
 * @param {String} tableName 表名称
 */
  constructor(database, tableName) {
    this[db] = database;
    this[table] = tableName;
  }
  get transaction() {
    return this[db].transaction([this[table]], "readwrite").objectStore(this[table]);
  }
  /**
   * 获取表中主键为key的数据
   * @param  {...String} keys 键名
   * @returns any
   */
  async get(...keys) {
    const result = {};
    for (const key of keys) {
      const res = await new Promise((resolve) => {
        const req = this.transaction.get(key);
        req.onerror = (e) => resolve(null);
        req.onsuccess = (e) => {
          if (typeof req.result != "undefined") return resolve(req.result.data);
          return resolve(null);
        };
      });
      if (keys.length == 1) return res;
      result[key] = typeof res == "undefined" ? null : res;
    }
    return JSON.stringify(result) == "{}" ? null : result;
  }
  /**
   * 获取所有数据
   * @returns {}
   */
  async getAll() {
    const keys = [];
    await new Promise((resolve) => {
      const req = this.transaction.openCursor();
      req.onsuccess = function (event) {
        const cursor = event.target.result;
        if (!cursor) return resolve();
        keys.push(cursor.key);
        cursor.continue();
      };
    });
    return await this.get(...keys);
  }
  /**
   * 添加主键为key的数据
   * @param {String} key 键名
   * @param {Object} data 数据
   * @param {Boolean} overwrite 是否覆盖写入
   * @returns {}
   */
  async set(key, data = {}, overwrite = false) {
    if (!key || typeof data === "undefined") return false;
    const value = {
      id: key,
      data: data,
    };
    try {
      await new Promise((resolve, reject) => {
        const req = this.transaction.add(value);
        req.onsuccess = (e) => resolve();
        req.onerror = (e) => reject();
      });
      return true;
    } catch {
      if (!overwrite) return false;
      return new Promise((resolve) => {
        const req = this.transaction.put(value);
        req.onsuccess = (e) => resolve(true);
        req.onerror = (e) => resolve(false);
      });
    }
  }
  /**
   * 一次性设置多个数据
   * @param {Object} data 属性名即为键名，属性值即为数据
   * @param {Boolean} overwrite 是否覆盖写入
   */
  async setMutiple(data, overwrite = false) {
    for (let key in data) {
      await this.set(key, data[key] === false ? false : data[key] || "", overwrite);
    }
  }
  /**
   * 清除主键为id的数据
   * @param {String} key 键名
   * @returns true
   */
  remove(key) {
    return new Promise((resolve) => {
      const req = this.transaction.delete(key);
      req.onsuccess = (e) => resolve(true);
    });
  }
}

const db = Symbol("db");
const table = Symbol("table");

export default Promise.resolve(new DataBase());
