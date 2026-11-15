import { useEffect, useState } from 'react';
import { useSiprakContext } from '@/context/SiprakContext';
import { classService } from '@/services/classService';
import { scheduleService } from '@/services/scheduleService';
import type { Jadwal, Kelas, KeanggotaanKelas, Sesi } from '@/types/siprak';

export function useP2Classes() {
  const { currentUser, registerCleanupListener } = useSiprakContext();
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!currentUser) { setClasses([]); setLoading(false); return; }
    setLoading(true); setError(null);
    const receive = (items: Kelas[]) => { setClasses(items); setLoading(false); };
    const fail = (e: Error) => { setError(e.message); setLoading(false); };
    const unsub = currentUser.peran === 'asisten'
      ? classService.subscribeForAssistant(currentUser.id, receive, fail)
      : classService.subscribeForStudent(currentUser.id, receive, fail);
    const unregister = registerCleanupListener(unsub);
    return unregister;
  }, [currentUser, registerCleanupListener]);
  return { classes, loading, error };
}

export function useP2Schedules() {
  const { currentUser, registerCleanupListener } = useSiprakContext();
  const { classes, loading: classesLoading, error: classesError } = useP2Classes();
  const [schedules, setSchedules] = useState<Jadwal[]>([]);
  const [sessions, setSessions] = useState<Sesi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const classIds = classes.map(c => c.id).sort().join('|');
  useEffect(() => {
    if (!currentUser || !classIds) {
      setSchedules([]); setSessions([]); setLoading(false); return;
    }
    setLoading(true); setError(null);
    const ids = classIds.split('|');
    let receivedSchedules = false;
    let receivedSessions = false;
    const finish = () => { if (receivedSchedules && receivedSessions) setLoading(false); };
    const u1 = scheduleService.subscribeSchedules(ids, items => { setSchedules(items); receivedSchedules = true; finish(); }, e => { setError(e.message); setLoading(false); });
    const u2 = scheduleService.subscribeSessions(ids, items => { setSessions(items); receivedSessions = true; finish(); }, e => { setError(e.message); setLoading(false); });
    const unregister1 = registerCleanupListener(u1);
    const unregister2 = registerCleanupListener(u2);
    return () => { unregister1(); unregister2(); };
  }, [currentUser, classIds, registerCleanupListener]);
  return { classes, schedules, sessions, loading: loading || classesLoading, error: error ?? classesError };
}

export function useP2Members(classId: string | null) {
  const [members, setMembers] = useState<KeanggotaanKelas[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!classId) { setMembers([]); return; }
    setLoading(true); setError(null);
    const unsub = classService.subscribeMembers(classId, items => { setMembers(items); setLoading(false); }, e => { setError(e.message); setLoading(false); });
    return unsub;
  }, [classId]);
  return { members, loading, error };
}
