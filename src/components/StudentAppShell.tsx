"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { GameEndedScreen } from "@/components/GameEndedScreen";
import { useEventFrozen } from "@/contexts/EventContext";
import { useStudent } from "@/contexts/StudentContext";
import { verifyAdminAccess, formatAdminVerifyError } from "@/lib/adminApi";
import { isGoogleUser } from "@/lib/adminClient";
import {
  isAdminPath,
  isProtectedStudentPath,
} from "@/lib/studentSession";

type StudentAppShellProps = {
  children: ReactNode;
};

function StatusScreen({ message }: { message: string }) {
  return (
    <main className="flex flex-1 items-center justify-center py-12">
      <p className="text-xl text-slate-600">{message}</p>
    </main>
  );
}

export function StudentAppShell({ children }: StudentAppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { authUser, loading: authLoading, isStudentSession } = useStudent();
  const { frozen, loading: eventLoading } = useEventFrozen();
  const isAdminRoute = isAdminPath(pathname);
  const isLoginPage = pathname === "/";
  const isProtectedRoute = isProtectedStudentPath(pathname);
  const shouldCheckAdmin =
    isLoginPage &&
    !isStudentSession &&
    Boolean(authUser && isGoogleUser(authUser));
  const [adminRedirectMessage, setAdminRedirectMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (authLoading || eventLoading || isAdminRoute) {
      return;
    }

    if (isProtectedRoute && !isStudentSession) {
      if (pathname !== "/") {
        router.replace("/");
      }
      return;
    }

    if (isLoginPage && isStudentSession) {
      router.replace("/dashboard");
    }
  }, [
    authLoading,
    eventLoading,
    isAdminRoute,
    isLoginPage,
    isProtectedRoute,
    isStudentSession,
    pathname,
    router,
  ]);

  useEffect(() => {
    if (authLoading || eventLoading || isAdminRoute || !shouldCheckAdmin) {
      return;
    }

    let cancelled = false;

    async function redirectAdminIfSignedIn() {
      setAdminRedirectMessage("正在確認管理員權限...");

      try {
        const token = await authUser!.getIdToken();
        const result = await verifyAdminAccess(token);

        if (cancelled) {
          return;
        }

        if (result.ok) {
          setAdminRedirectMessage("正在前往管理員控制台...");
          router.replace("/admin/dashboard");
          return;
        }

        if (result.reason === "server_error") {
          setAdminRedirectMessage(formatAdminVerifyError(result));
          return;
        }

        setAdminRedirectMessage(null);
      } catch (redirectError) {
        console.error(redirectError);

        if (!cancelled) {
          setAdminRedirectMessage(null);
        }
      }
    }

    void redirectAdminIfSignedIn();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    authUser,
    eventLoading,
    isAdminRoute,
    router,
    shouldCheckAdmin,
  ]);

  if (isAdminRoute) {
    return <>{children}</>;
  }

  if (authLoading || eventLoading) {
    return <StatusScreen message="載入中..." />;
  }

  if (frozen) {
    return <GameEndedScreen />;
  }

  if (isProtectedRoute && !isStudentSession) {
    return <StatusScreen message="正在返回登入頁..." />;
  }

  if (isLoginPage && isStudentSession) {
    return <StatusScreen message="正在前往你的主頁..." />;
  }

  if (isLoginPage && shouldCheckAdmin && adminRedirectMessage) {
    return <StatusScreen message={adminRedirectMessage} />;
  }

  return <>{children}</>;
}
