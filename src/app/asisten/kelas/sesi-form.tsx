import { useFocusEffect, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type ScrollViewInstance,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DataState, SkeletonCards } from "@/components/DataStates";
import { useSiprak } from "@/context/SiprakContext";
import { ambilKelasAsisten } from "@/lib/firebase-classes";
import { ambilLaboratorium } from "@/lib/firebase-laboratories";
import { ambilPraktikumKelas } from "@/lib/firebase-practicums";
import { buatSesiKelas, ubahSesiKelas } from "@/lib/firebase-sessions";
import { jadwalDefaultSesi, tanggalJakartaSekarang, waktuMulaiMasihAkanDatang, waktuSelesaiMasihAkanDatang } from "@/lib/session-schedule-time";
import type { KelasPraktikum, Laboratorium, Praktikum } from "@/types/siprak";

type WaktuTarget = "mulai" | "selesai";
const ROW_HEIGHT = 44;
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function formatDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateFromValue(value?: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
    : new Date();
}

function formatDateLabel(value: string) {
  if (!value) return "Pilih tanggal";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateFromValue(value));
}

function formatTimeLabel(value: string) {
  return value ? value.replace(":", ".") : "Pilih jam";
}

export default function SesiFormScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { kelasId: kelasParam, praktikumId: praktikumParam, sesiId: sesiParam } =
    useLocalSearchParams<{ kelasId: string; praktikumId: string; sesiId?: string }>();
  const kelasId = typeof kelasParam === "string" ? kelasParam : "";
  const praktikumId = typeof praktikumParam === "string" ? praktikumParam : "";
  const sesiId = typeof sesiParam === "string" ? sesiParam : "";
  const isEdit = Boolean(sesiId);
  const { sessions, refreshSessions } = useSiprak();

  const [kelas, setKelas] = useState<KelasPraktikum | null>(null);
  const [praktikum, setPraktikum] = useState<Praktikum | null>(null);
  const [rooms, setRooms] = useState<Laboratorium[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [defaultSchedule] = useState(() => jadwalDefaultSesi());
  const [meeting, setMeeting] = useState("1");
  const [roomId, setRoomId] = useState("");
  const [draftRoomId, setDraftRoomId] = useState("");
  const [date, setDate] = useState(defaultSchedule.tanggal);
  const [start, setStart] = useState(defaultSchedule.jamMulai);
  const [end, setEnd] = useState(defaultSchedule.jamSelesai);
  const [roomSheetVisible, setRoomSheetVisible] = useState(false);
  const [dateSheetVisible, setDateSheetVisible] = useState(false);
  const [timeSheetVisible, setTimeSheetVisible] = useState(false);
  const [timeTarget, setTimeTarget] = useState<WaktuTarget>("mulai");
  const [draftDate, setDraftDate] = useState("");
  const [draftMonth, setDraftMonth] = useState(() => dateFromValue(date));
  const [draftTime, setDraftTime] = useState("08:00");
  const [timeMode, setTimeMode] = useState<WaktuTarget>("mulai");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const hourRef = useRef<ScrollViewInstance | null>(null);
  const minuteRef = useRef<ScrollViewInstance | null>(null);
  const initializedSession = useRef("");
  const initializedNewForm = useRef(false);
  const initializedRoom = useRef(false);

  const sesi = sessions.find((item) => item.id === sesiId);
  const activeRooms = useMemo(() => rooms.filter((room) => room.status === "aktif"), [rooms]);
  const selectedRoom = activeRooms.find((room) => room.id === roomId);
  const startIsInPast = Boolean(date && start && !waktuMulaiMasihAkanDatang(date, start, currentTime));
  const endIsInPast = Boolean(date && end && !waktuSelesaiMasihAkanDatang(date, end, currentTime));
  const todayJakarta = tanggalJakartaSekarang();

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 15_000);
    return () => clearInterval(interval);
  }, []);

  const load = useCallback(async () => {
    if (!kelasId || !praktikumId) {
      setLoadError("Kelas atau praktikum tidak ditemukan. Kembali lalu buka praktikum lagi.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const [classList, courseList, roomList] = await Promise.all([
        ambilKelasAsisten(),
        ambilPraktikumKelas(kelasId),
        ambilLaboratorium(),
      ]);
      const selectedClass = classList.find((item) => item.id === kelasId) ?? null;
      const selectedPracticum = courseList.find((item) => item.id === praktikumId) ?? null;
      if (!selectedClass || !selectedPracticum) {
        throw new Error("Kelas atau praktikum tidak ditemukan atau akses sudah berubah.");
      }
      setKelas(selectedClass);
      setPraktikum(selectedPracticum);
      setRooms(roomList);
      if (!sesiId && !initializedRoom.current) {
        setRoomId(roomList.find((room) => room.status === "aktif")?.id ?? "");
        initializedRoom.current = true;
      }
      await refreshSessions();
    } catch (loadError) {
      setLoadError(loadError instanceof Error ? loadError.message : "Data form sesi gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [kelasId, praktikumId, refreshSessions, sesiId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (isEdit && sesi && (sesi.ruanganId || rooms.length > 0) && initializedSession.current !== sesi.id) {
      initializedSession.current = sesi.id;
      setMeeting(String(sesi.pertemuan));
      setRoomId(sesi.ruanganId ?? rooms.find((room) => room.nama === sesi.lab)?.id ?? "");
      setDate(sesi.tanggal);
      setStart(sesi.jamMulai);
      setEnd(sesi.jamSelesai);
    }
  }, [isEdit, rooms, sesi]);

  useEffect(() => {
    if (!isEdit && praktikum && !initializedNewForm.current) {
      const lastMeeting = sessions
        .filter((item) => item.kelasId === kelasId && item.praktikumId === praktikumId)
        .reduce((max, item) => Math.max(max, item.pertemuan), 0);
      setMeeting(String(lastMeeting + 1));
      initializedNewForm.current = true;
    }
  }, [isEdit, kelasId, praktikum, praktikumId, sessions]);

  const conflict = useMemo(() => {
    if (!selectedRoom || !date || !start || !end || start >= end) return null;
    return sessions.find((item) => {
      const sameRoom = item.ruanganId
        ? item.ruanganId === selectedRoom.id
        : item.lab === selectedRoom.nama;
      const overlaps = item.jamMulai < end && start < item.jamSelesai;
      return item.id !== sesiId && item.status !== "diarsipkan" && sameRoom && item.tanggal === date && overlaps;
    }) ?? null;
  }, [date, end, selectedRoom, sesiId, sessions, start]);

  const validMeeting = Number.isInteger(Number(meeting)) && Number(meeting) > 0;
  const validTime = Boolean(start && end && start < end);
  const canSave = Boolean(
    !loading && !saving && kelas?.status === "aktif" && praktikum?.status === "aktif" &&
    activeRooms.length && selectedRoom && date && validMeeting && validTime && !startIsInPast && !endIsInPast && !conflict &&
    (!isEdit || (sesi && sesi.status === "belum_dibuka")),
  );

  function openDatePicker() {
    const initial = dateFromValue(date);
    setDraftDate(date || formatDate(initial));
    setDraftMonth(initial);
    setDateSheetVisible(true);
  }

  function openTimePicker(target: WaktuTarget) {
    const value = target === "mulai" ? start : end;
    setTimeTarget(target);
    setTimeMode(target);
    setDraftTime(value || (target === "mulai" ? "08:00" : start ? start : "09:40"));
    setTimeSheetVisible(true);
  }

  useEffect(() => {
    if (!timeSheetVisible) return;
    const [hour, minute] = draftTime.split(":").map(Number);
    hourRef.current?.scrollTo({ y: (hour ?? 8) * ROW_HEIGHT, animated: false });
    minuteRef.current?.scrollTo({ y: (minute ?? 0) * ROW_HEIGHT, animated: false });
  }, [draftTime, timeSheetVisible]);

  function updateDraftTime(part: "hour" | "minute", value: number) {
    const [currentHour, currentMinute] = draftTime.split(":").map(Number);
    const nextHour = part === "hour" ? value : currentHour ?? 8;
    const nextMinute = part === "minute" ? value : currentMinute ?? 0;
    const nextValue = `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
    setDraftTime(nextValue);
  }

  function onWheelEnd(part: "hour" | "minute", offset: number) {
    const max = part === "hour" ? 23 : 59;
    const value = Math.max(0, Math.min(max, Math.round(offset / ROW_HEIGHT)));
    updateDraftTime(part, value);
  }

  function pilihJam() {
    setFormError("");
    if (timeTarget === "mulai") setStart(draftTime);
    else setEnd(draftTime);
    setTimeSheetVisible(false);
  }

  async function simpanSesi() {
    if (!kelas || !praktikum || !selectedRoom) return;
    const validationTime = new Date();
    if (date && end && !waktuSelesaiMasihAkanDatang(date, end, validationTime)) {
      setFormError("Tanggal dan jam selesai harus setelah waktu saat ini (WIB).");
      return;
    }
    if (date && start && !waktuMulaiMasihAkanDatang(date, start, validationTime)) {
      setFormError("Tanggal dan jam mulai harus setelah waktu saat ini (WIB).");
      return;
    }
    if (start && end && start >= end) {
      setFormError("Jam selesai harus setelah jam mulai.");
      return;
    }
    if (!canSave) return;
    setSaving(true);
    setFormError("");
    try {
      const input = {
        pertemuan: Number(meeting),
        ruanganId: selectedRoom.id,
        tanggal: date,
        jamMulai: start,
        jamSelesai: end,
      };
      if (isEdit) {
        if (!sesi) throw new Error("Data sesi tidak ditemukan. Muat ulang lalu coba lagi.");
        await ubahSesiKelas(sesi, input);
      } else {
        await buatSesiKelas(kelas.id, praktikum.id, input);
      }
      await refreshSessions();
      router.back();
    } catch (saveError) {
      const failedAt = new Date();
      const message = date && end && !waktuSelesaiMasihAkanDatang(date, end, failedAt)
        ? "Tanggal dan jam selesai harus setelah waktu saat ini (WIB)."
        : date && start && !waktuMulaiMasihAkanDatang(date, start, failedAt)
          ? "Tanggal dan jam mulai harus setelah waktu saat ini (WIB)."
          : saveError instanceof Error
            ? saveError.message
            : "Sesi gagal disimpan. Coba lagi.";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  const calendarFirstDay = new Date(draftMonth.getFullYear(), draftMonth.getMonth(), 1);
  const leadingDays = (calendarFirstDay.getDay() + 6) % 7;
  const monthLength = new Date(draftMonth.getFullYear(), draftMonth.getMonth() + 1, 0).getDate();
  const calendarCells = [
    ...Array.from({ length: leadingDays }, () => null),
    ...Array.from({ length: monthLength }, (_, index) => index + 1),
  ];

  const tabBarHidden = pathname.endsWith("/sesi-form");

  if (loading || loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Text style={styles.title}>{isEdit ? "Edit sesi" : "Buat sesi"}</Text>
          </View>
          <Text style={styles.breadcrumb}>Kelas / {kelas?.nama ?? "…"} / {praktikum?.nama ?? "Praktikum"}</Text>
          {loading ? <SkeletonCards count={2} /> : <DataState kind="error" title="Form sesi belum bisa dimuat" message={loadError} actionLabel="Coba lagi" onAction={() => void load()} />}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardRoot}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Text style={styles.title}>{isEdit ? "Edit sesi" : "Buat sesi"}</Text>
          </View>
          <Text style={styles.breadcrumb}>
            Kelas / {kelas?.nama ?? "…"} / {praktikum?.nama ?? "Praktikum"}
          </Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{praktikum?.nama ?? "Praktikum"}</Text>
            <Text style={styles.summarySubtitle}>
              {kelas?.nama ?? "Kelas"} · {isEdit ? `Edit pertemuan ${meeting}` : "Atur jadwal sesi praktikum"}
            </Text>
          </View>

          {isEdit && sesi && sesi.status !== "belum_dibuka" ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Jadwal sesi terkunci</Text>
              <Text style={styles.errorText}>Sesi hanya dapat diubah sebelum dibuka.</Text>
            </View>
          ) : null}
          {isEdit && !loading && !sesi ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Data sesi tidak ditemukan</Text>
              <Text style={styles.errorText}>Kembali ke detail sesi lalu muat ulang daftar sesi.</Text>
            </View>
          ) : null}
          {(kelas?.status === "diarsipkan" || praktikum?.status === "diarsipkan") ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>Kelas atau praktikum sedang diarsipkan. Aktifkan kembali sebelum mengatur sesi.</Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Nomor pertemuan</Text>
          <TextInput
            accessibilityLabel="Nomor pertemuan"
            value={meeting}
            onChangeText={setMeeting}
            keyboardType="number-pad"
            placeholder="Contoh: 1"
            placeholderTextColor="#52627B"
            style={styles.input}
          />
          {!validMeeting && meeting ? <Text style={styles.fieldError}>Masukkan nomor pertemuan minimal 1.</Text> : null}

          <Text style={styles.fieldLabel}>Ruangan / laboratorium</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pilih ruangan atau laboratorium"
            onPress={() => { setDraftRoomId(roomId); setRoomSheetVisible(true); }}
            style={[styles.selectInput, conflict && styles.invalidInput]}
          >
            <Text style={selectedRoom ? styles.selectValue : styles.placeholder}>
              {selectedRoom?.nama ?? "Pilih ruangan"}
            </Text>
            <SymbolView name={{ android: "expand_more", ios: "chevron.down", web: "expand_more" }} size={24} tintColor="#52627B" />
          </Pressable>
          {!loading && !activeRooms.length ? (
            <Pressable onPress={() => router.push("/asisten/laboratorium")}>
              <Text style={styles.fieldError}>Belum ada ruangan aktif. Kelola ruangan terlebih dahulu.</Text>
            </Pressable>
          ) : null}

          <Text style={styles.fieldLabel}>Tanggal sesi</Text>
          <Pressable accessibilityRole="button" onPress={openDatePicker} style={styles.selectInput}>
            <Text style={date ? styles.selectValue : styles.placeholder}>{formatDateLabel(date)}</Text>
            <SymbolView name={{ android: "calendar_month", ios: "calendar", web: "calendar_month" }} size={24} tintColor="#52627B" />
          </Pressable>

          <View style={styles.timeFields}>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>Jam mulai</Text>
              <Pressable accessibilityRole="button" onPress={() => openTimePicker("mulai")} style={[styles.selectInput, (conflict || startIsInPast) && styles.invalidInput]}>
                <Text style={start ? styles.selectValue : styles.placeholder}>{formatTimeLabel(start)}</Text>
                <SymbolView name={{ android: "schedule", ios: "clock", web: "schedule" }} size={24} tintColor="#52627B" />
              </Pressable>
            </View>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>Jam selesai</Text>
              <Pressable accessibilityRole="button" onPress={() => openTimePicker("selesai")} style={[styles.selectInput, (conflict || endIsInPast) && styles.invalidInput]}>
                <Text style={end ? styles.selectValue : styles.placeholder}>{formatTimeLabel(end)}</Text>
                <SymbolView name={{ android: "schedule", ios: "clock", web: "schedule" }} size={24} tintColor="#52627B" />
              </Pressable>
            </View>
          </View>

          {formError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Sesi gagal disimpan</Text>
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          {endIsInPast ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Waktu selesai sudah lewat</Text>
              <Text style={styles.errorText}>Pilih tanggal dan waktu selesai setelah waktu saat ini (WIB).</Text>
            </View>
          ) : startIsInPast ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Waktu mulai sudah lewat</Text>
              <Text style={styles.errorText}>Pilih tanggal dan waktu mulai setelah waktu saat ini (WIB).</Text>
            </View>
          ) : start && end && !validTime ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Waktu sesi tidak valid</Text>
              <Text style={styles.errorText}>Jam selesai harus setelah jam mulai.</Text>
            </View>
          ) : conflict ? (
            <View style={styles.errorBox}>
              <View style={styles.conflictHeading}>
                <SymbolView name={{ android: "warning", ios: "exclamationmark.triangle", web: "warning" }} size={24} tintColor="#B42332" />
                <Text style={styles.errorTitle}>Ruangan sudah digunakan</Text>
              </View>
              <Text style={styles.errorText}>
                {conflict.praktikum} · {conflict.kelas}, {conflict.jamMulai.replace(":", ".")}–{conflict.jamSelesai.replace(":", ".")}.
                {"\n"}Pilih ruangan atau waktu lain.
              </Text>
            </View>
          ) : (
            <Text style={styles.helper}>Pastikan ruangan dan waktu sudah sesuai sebelum menyimpan sesi.</Text>
          )}
        </ScrollView>

        <View style={[styles.footer, tabBarHidden && styles.footerFull]}>
          <Pressable
            accessibilityRole="button"
            disabled={!canSave}
            onPress={() => void simpanSesi()}
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          >
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>{isEdit ? "Simpan perubahan" : "Buat sesi"}</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal transparent animationType="slide" visible={roomSheetVisible} onRequestClose={() => setRoomSheetVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.scrim} onPress={() => setRoomSheetVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>Pilih ruangan</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Tutup" onPress={() => setRoomSheetVisible(false)} style={styles.closeButton}>
                <SymbolView name={{ android: "close", ios: "xmark", web: "close" }} size={24} tintColor="#52627B" />
              </Pressable>
            </View>
            <Text style={styles.sheetSubtitle}>Untuk sesi {praktikum?.nama ?? "praktikum"} · {kelas?.nama ?? "kelas"}</Text>
            <ScrollView style={styles.roomList} nestedScrollEnabled showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
              {activeRooms.map((room) => (
                <Pressable key={room.id} accessibilityRole="button" accessibilityState={{ selected: room.id === draftRoomId }} onPress={() => setDraftRoomId(room.id)} style={[styles.roomOption, room.id === draftRoomId && styles.roomOptionSelected]}>
                  <SymbolView name={{ android: "apartment", ios: "building.2", web: "apartment" }} size={28} tintColor={room.id === draftRoomId ? "#173F7A" : "#52627B"} />
                  <Text style={[styles.roomOptionText, room.id === draftRoomId && styles.roomOptionTextSelected]}>{room.nama}</Text>
                  {room.id === draftRoomId ? <SymbolView name={{ android: "check", ios: "checkmark", web: "check" }} size={24} tintColor="#173F7A" /> : null}
                </Pressable>
              ))}
              {!activeRooms.length ? <Text style={styles.sheetEmpty}>Belum ada ruangan aktif.</Text> : null}
            </ScrollView>
            <Pressable disabled={!draftRoomId} style={[styles.sheetPrimaryButton, !draftRoomId && styles.sheetPrimaryDisabled]} onPress={() => { setRoomId(draftRoomId); setFormError(""); setRoomSheetVisible(false); }}><Text style={styles.sheetPrimaryText}>Gunakan ruangan</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="slide" visible={dateSheetVisible} onRequestClose={() => setDateSheetVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.scrim} onPress={() => setDateSheetVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>Pilih tanggal</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Tutup kalender" onPress={() => setDateSheetVisible(false)} style={styles.closeButton}>
                <SymbolView name={{ android: "close", ios: "xmark", web: "close" }} size={24} tintColor="#52627B" />
              </Pressable>
            </View>
            <Text style={styles.selectedDateText}>
              {new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(dateFromValue(draftDate))}
            </Text>
            <View style={styles.calendarHeader}>
              <Pressable accessibilityRole="button" accessibilityLabel="Bulan sebelumnya" onPress={() => setDraftMonth(new Date(draftMonth.getFullYear(), draftMonth.getMonth() - 1, 1))} style={styles.monthArrow}>
                <SymbolView name={{ android: "chevron_left", ios: "chevron.left", web: "chevron_left" }} size={24} tintColor="#52627B" />
              </Pressable>
              <Text style={styles.monthTitle}>{new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(draftMonth)}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Bulan berikutnya" onPress={() => setDraftMonth(new Date(draftMonth.getFullYear(), draftMonth.getMonth() + 1, 1))} style={styles.monthArrow}>
                <SymbolView name={{ android: "chevron_right", ios: "chevron.right", web: "chevron_right" }} size={24} tintColor="#52627B" />
              </Pressable>
            </View>
            <View style={styles.calendarGrid}>
              {WEEKDAYS.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
              {calendarCells.map((day, index) => {
                if (day === null) return <View key={`empty-${index}`} style={styles.calendarCell} />;
                const value = formatDate(new Date(draftMonth.getFullYear(), draftMonth.getMonth(), day, 12));
                const selected = draftDate === value;
                const disabled = value < todayJakarta;
                return (
                  <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => setDraftDate(value)} style={styles.calendarCell}>
                    <View style={[styles.dayCircle, selected && styles.dayCircleSelected]}>
                      <Text style={[styles.dayText, disabled && styles.dayTextDisabled, selected && styles.dayTextSelected]}>{day}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={styles.sheetPrimaryButton} onPress={() => { setDate(draftDate); setFormError(""); setDateSheetVisible(false); }}><Text style={styles.sheetPrimaryText}>Gunakan tanggal</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="slide" visible={timeSheetVisible} onRequestClose={() => setTimeSheetVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.scrim} onPress={() => setTimeSheetVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>Pilih jam</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Tutup pemilih jam" onPress={() => setTimeSheetVisible(false)} style={styles.closeButton}>
                <SymbolView name={{ android: "close", ios: "xmark", web: "close" }} size={24} tintColor="#52627B" />
              </Pressable>
            </View>
            <View style={styles.timeModeTabs}>
              {(["mulai", "selesai"] as const).map((kind) => {
                const selected = timeMode === kind;
                const value = kind === "mulai" ? start : end;
                return <Pressable key={kind} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { setTimeMode(kind); setTimeTarget(kind); setDraftTime(value || (kind === "mulai" ? "08:00" : start || "09:40")); }} style={[styles.timeMode, selected && styles.timeModeSelected]}><Text style={[styles.timeModeText, selected && styles.timeModeTextSelected]}>{kind === "mulai" ? "Mulai" : "Selesai"} · {value ? value.replace(":", ".") : "—"}</Text></Pressable>;
              })}
            </View>
            <View style={styles.wheelLabels}><Text style={styles.wheelLabel}>Jam</Text><Text style={styles.wheelLabel}>Menit</Text></View>
            <View style={styles.wheelArea}>
              <View pointerEvents="none" style={styles.wheelSelection} />
              <ScrollView
                ref={hourRef}
                style={styles.wheelColumn}
                contentContainerStyle={styles.wheelContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={ROW_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={(event) => onWheelEnd("hour", event.nativeEvent.contentOffset.y)}
              >
                {Array.from({ length: 24 }, (_, hour) => {
                  const selected = Number(draftTime.slice(0, 2)) === hour;
                  return <Pressable key={hour} onPress={() => { updateDraftTime("hour", hour); hourRef.current?.scrollTo({ y: hour * ROW_HEIGHT, animated: true }); }} style={styles.wheelItem}><Text style={[styles.wheelItemText, selected && styles.wheelItemSelected]}>{String(hour).padStart(2, "0")}</Text></Pressable>;
                })}
              </ScrollView>
              <Text style={styles.wheelColon}>:</Text>
              <ScrollView
                ref={minuteRef}
                style={styles.wheelColumn}
                contentContainerStyle={styles.wheelContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={ROW_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={(event) => onWheelEnd("minute", event.nativeEvent.contentOffset.y)}
              >
                {Array.from({ length: 60 }, (_, minute) => {
                  const selected = Number(draftTime.slice(3, 5)) === minute;
                  return <Pressable key={minute} onPress={() => { updateDraftTime("minute", minute); minuteRef.current?.scrollTo({ y: minute * ROW_HEIGHT, animated: true }); }} style={styles.wheelItem}><Text style={[styles.wheelItemText, selected && styles.wheelItemSelected]}>{String(minute).padStart(2, "0")}</Text></Pressable>;
                })}
              </ScrollView>
            </View>
            <Text style={styles.wheelHint}>Format 24 jam · Selesai setelah jam mulai</Text>
            <Pressable style={styles.sheetPrimaryButton} onPress={pilihJam}><Text style={styles.sheetPrimaryText}>Gunakan waktu</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: "#F4F7FC", flex: 1 },
  keyboardRoot: { flex: 1 },
  content: { paddingBottom: 24, paddingHorizontal: 24, paddingTop: 12 },
  titleRow: { alignItems: "center", flexDirection: "row", marginLeft: -8 },
  backButton: { alignItems: "center", height: 48, justifyContent: "center", width: 40 },
  backIcon: { color: "#173F7A", fontSize: 34, lineHeight: 38, marginTop: -4 },
  title: { color: "#172B4D", fontSize: 26, fontWeight: "800" },
  breadcrumb: { color: "#52627B", fontSize: 15, lineHeight: 22, marginTop: 7 },
  summaryCard: { backgroundColor: "#E9EFFA", borderRadius: 16, marginTop: 24, paddingHorizontal: 16, paddingVertical: 16 },
  summaryTitle: { color: "#173F7A", fontSize: 18, fontWeight: "800" },
  summarySubtitle: { color: "#173F7A", fontSize: 14, marginTop: 6 },
  loading: { marginTop: 20 },
  fieldLabel: { color: "#172B4D", fontSize: 15, fontWeight: "700", marginBottom: 8, marginTop: 22 },
  input: { backgroundColor: "#FFFFFF", borderColor: "#D8E1EE", borderRadius: 13, borderWidth: 1, color: "#172B4D", fontSize: 17, minHeight: 54, paddingHorizontal: 14 },
  selectInput: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D8E1EE", borderRadius: 13, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 54, paddingHorizontal: 14 },
  invalidInput: { borderColor: "#B42332", borderWidth: 2 },
  selectValue: { color: "#172B4D", flex: 1, fontSize: 16 },
  placeholder: { color: "#52627B", flex: 1, fontSize: 16 },
  timeFields: { flexDirection: "row", gap: 12 },
  timeField: { flex: 1 },
  helper: { color: "#52627B", fontSize: 14, lineHeight: 21, marginTop: 24 },
  fieldError: { color: "#B42332", fontSize: 13, lineHeight: 19, marginTop: 7 },
  warningBox: { backgroundColor: "#FFF3D6", borderRadius: 13, marginTop: 16, padding: 13 },
  warningText: { color: "#8A4B08", fontSize: 14, lineHeight: 20 },
  errorBox: { backgroundColor: "#FCEBEC", borderRadius: 16, marginTop: 22, padding: 16 },
  conflictHeading: { alignItems: "center", flexDirection: "row", gap: 12 },
  errorTitle: { color: "#B42332", flex: 1, fontSize: 16, fontWeight: "800" },
  errorText: { color: "#B42332", fontSize: 14, lineHeight: 21, marginTop: 8 },
  footer: { backgroundColor: "#F4F7FC", paddingHorizontal: 24, paddingTop: 12 },
  footerFull: { paddingBottom: 12 },
  saveButton: { alignItems: "center", backgroundColor: "#173F7A", borderRadius: 14, justifyContent: "center", minHeight: 56 },
  saveButtonDisabled: { backgroundColor: "#E1E8F2" },
  saveText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  saveTextDisabled: { color: "#52627B" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(23,43,77,0.42)" },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: "90%", paddingBottom: 28, paddingHorizontal: 24, paddingTop: 12 },
  sheetHandle: { alignSelf: "center", backgroundColor: "#D8E1EE", borderRadius: 3, height: 5, marginBottom: 22, width: 48 },
  sheetTitleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sheetTitle: { color: "#172B4D", flex: 1, fontSize: 23, fontWeight: "800" },
  closeButton: { alignItems: "center", borderRadius: 24, height: 44, justifyContent: "center", width: 44 },
  sheetSubtitle: { color: "#52627B", fontSize: 14, marginTop: 3 },
  roomList: { marginTop: 48, maxHeight: 420 },
  roomOption: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D8E1EE", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 20, justifyContent: "flex-start", marginBottom: 14, minHeight: 104, paddingHorizontal: 18 },
  roomOptionSelected: { backgroundColor: "#E9EFFA", borderColor: "#173F7A", borderWidth: 1.5 },
  roomOptionText: { color: "#172B4D", flex: 1, fontSize: 17 },
  roomOptionTextSelected: { color: "#173F7A", fontWeight: "800" },
  sheetEmpty: { color: "#52627B", paddingVertical: 24, textAlign: "center" },
  sheetPrimaryButton: { alignItems: "center", backgroundColor: "#173F7A", borderRadius: 14, justifyContent: "center", marginTop: 18, minHeight: 54 },
  sheetPrimaryDisabled: { opacity: 0.55 },
  sheetPrimaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  selectedDateText: { color: "#173F7A", fontSize: 15, fontWeight: "600", marginTop: 10 },
  calendarHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  monthArrow: { alignItems: "center", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  monthTitle: { color: "#172B4D", fontSize: 19, fontWeight: "800", textTransform: "capitalize" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  weekday: { color: "#52627B", fontSize: 13, fontWeight: "600", height: 36, lineHeight: 36, textAlign: "center", width: "14.2857%" },
  calendarCell: { alignItems: "center", height: 48, justifyContent: "center", width: "14.2857%" },
  dayCircle: { alignItems: "center", borderRadius: 24, height: 42, justifyContent: "center", width: 42 },
  dayCircleSelected: { backgroundColor: "#173F7A" },
  dayText: { color: "#172B4D", fontSize: 15 },
  dayTextDisabled: { color: "#A8B3C4" },
  dayTextSelected: { color: "#FFFFFF", fontWeight: "800" },
  timeModeTabs: { backgroundColor: "#E9EFFA", borderRadius: 14, flexDirection: "row", gap: 4, marginTop: 20, padding: 4 },
  timeMode: { alignItems: "center", borderRadius: 11, flex: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 6 },
  timeModeSelected: { backgroundColor: "#FFFFFF" },
  timeModeText: { color: "#52627B", fontSize: 14, fontWeight: "600" },
  timeModeTextSelected: { color: "#173F7A", fontWeight: "800" },
  wheelLabels: { flexDirection: "row", justifyContent: "space-around", marginTop: 18 },
  wheelLabel: { color: "#52627B", fontSize: 14, width: "42%", textAlign: "center" },
  wheelArea: { alignItems: "center", flexDirection: "row", height: 190, justifyContent: "center", marginTop: 8, overflow: "hidden", position: "relative" },
  wheelColumn: { flex: 1, height: 190 },
  wheelContent: { paddingVertical: 73 },
  wheelSelection: { backgroundColor: "#E9EFFA", borderRadius: 14, height: ROW_HEIGHT, left: 0, position: "absolute", right: 0, top: 73, zIndex: 0 },
  wheelItem: { alignItems: "center", height: ROW_HEIGHT, justifyContent: "center" },
  wheelItemText: { color: "#52627B", fontSize: 21 },
  wheelItemSelected: { color: "#173F7A", fontSize: 29, fontWeight: "800" },
  wheelColon: { color: "#173F7A", fontSize: 25, fontWeight: "800", paddingHorizontal: 6 },
  wheelHint: { color: "#52627B", fontSize: 14, marginTop: 18, textAlign: "center" },
});
