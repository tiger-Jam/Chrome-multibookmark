'use client';

import { useSession, signIn } from 'next-auth/react';
import KyuubiWorkspace from '@/components/KyuubiWorkspace';

export default function Home() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-xl">認証状態を確認中...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-xl text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Kyuubi
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            サインインして知識管理を始めましょう
          </p>
          <button
            onClick={() => signIn('google')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Googleでサインイン
          </button>
        </div>
      </div>
    );
  }

  return <KyuubiWorkspace />;
}