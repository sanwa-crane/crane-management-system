/**
 * 認証・権限管理モジュール（Firebase Authentication版）
 *
 * 管理者ページはFirebase Authのメール/パスワードログインを必須にします。
 * 現場QRページはDataStore側で匿名ログインし、Firestore Rulesで権限を制限します。
 */

const Auth = {

  async waitForReady() {
    if (!window.firebase?.auth) return null;
    return new Promise(resolve => {
      const unsubscribe = firebase.auth().onAuthStateChanged(user => {
        unsubscribe();
        resolve(user);
      });
    });
  },

  async login(email, password) {
    try {
      const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
      return !!(cred.user && !cred.user.isAnonymous);
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  /** ログアウト処理 */
  async logout() {
    try {
      await firebase.auth().signOut();
    } finally {
      window.location.href = 'admin-login.html';
    }
  },

  /** ログイン中か確認 */
  isLoggedIn() {
    const user = firebase.auth().currentUser;
    return !!(user && !user.isAnonymous);
  },

  /**
   * 管理者ページ保護用ガード
   * 未ログインなら管理者ログインページへリダイレクト
   */
  async requireAuth() {
    const user = await this.waitForReady();
    if (!user || user.isAnonymous) {
      window.location.href = 'admin-login.html';
      return false;
    }
    return true;
  },
};
