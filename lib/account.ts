import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import { auth, db, googleProvider } from './firebase';

/**
 * 계정 영구 삭제: Firestore의 내 데이터 전부 → Auth 계정 순서로 지운다.
 * 데이터를 먼저 지우는 이유 — 계정이 먼저 사라지면 보안 규칙상
 * 남은 데이터에 접근할 방법이 없어 고아 데이터가 되기 때문.
 * 마지막 로그인이 오래됐으면 Firebase가 재인증을 요구 → 팝업 재로그인 후 재시도.
 */
export async function deleteAccount(): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error('not-signed-in');
  for (const col of ['subs', 'oneTime']) {
    const snap = await getDocs(collection(db, 'users', u.uid, col));
    // Firestore 배치 한도 500 미만으로 분할 커밋
    for (let i = 0; i < snap.docs.length; i += 400) {
      const b = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
      await b.commit();
    }
  }
  try {
    await deleteUser(u);
  } catch (e) {
    if ((e as { code?: string })?.code === 'auth/requires-recent-login') {
      await reauthenticateWithPopup(u, googleProvider);
      await deleteUser(u);
    } else {
      throw e;
    }
  }
}
