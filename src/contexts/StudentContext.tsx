"use client";

import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useStudentHeartbeat } from "@/hooks/useStudentHeartbeat";
import { getClientAuth } from "@/lib/firebaseClient";
import {
  clearStoredStudentId,
  isStudentSession,
  readStoredStudentId,
  writeStoredStudentId,
} from "@/lib/studentSession";

type StudentContextValue = {
  studentId: string | null;
  authUser: User | null;
  loading: boolean;
  isStudentSession: boolean;
  setStudentId: (studentId: string) => void;
  logout: () => Promise<void>;
};

const StudentContext = createContext<StudentContextValue | null>(null);

export function StudentProvider({ children }: { children: ReactNode }) {
  const [studentId, setStudentIdState] = useState<string | null>(() =>
    readStoredStudentId(),
  );
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const signingOutRef = useRef(false);

  useStudentHeartbeat(authUser?.uid);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getClientAuth(), (user) => {
      if (user) {
        setAuthUser(user);
        setStudentIdState(readStoredStudentId());
        setLoading(false);
        return;
      }

      if (signingOutRef.current) {
        setAuthUser(null);
        setStudentIdState(null);
        setLoading(false);
        return;
      }

      const persistedUser = getClientAuth().currentUser;

      if (persistedUser) {
        setAuthUser(persistedUser);
        setStudentIdState(readStoredStudentId());
      } else {
        setAuthUser(null);
        setStudentIdState(readStoredStudentId());
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const setStudentId = useCallback((id: string) => {
    writeStoredStudentId(id);
    setStudentIdState(id);
  }, []);

  const logout = useCallback(async () => {
    signingOutRef.current = true;

    try {
      await signOut(getClientAuth());
      clearStoredStudentId();
      setStudentIdState(null);
      setAuthUser(null);
    } finally {
      signingOutRef.current = false;
    }
  }, []);

  const studentSession = isStudentSession(authUser, studentId);

  const value = useMemo(
    () => ({
      studentId,
      authUser,
      loading,
      isStudentSession: studentSession,
      setStudentId,
      logout,
    }),
    [studentId, authUser, loading, studentSession, setStudentId, logout],
  );

  return (
    <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
  );
}

export function useStudent() {
  const context = useContext(StudentContext);

  if (!context) {
    throw new Error("useStudent must be used within a StudentProvider");
  }

  return context;
}
