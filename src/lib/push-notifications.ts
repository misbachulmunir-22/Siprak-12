import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  where,
} from "@react-native-firebase/firestore";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";

const db = getFirestore();

export type DataPush = Record<string, string>;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function daftarkanPushToken(uid: string): Promise<string | null> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("siprak", {
      name: "Notifikasi SIPRAK",
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#173F7A",
    });
  }

  const izinAwal = await Notifications.getPermissionsAsync();
  let statusIzin = izinAwal.status;

  if (statusIzin !== "granted") {
    const hasilIzin = await Notifications.requestPermissionsAsync();
    statusIzin = hasilIzin.status;
  }

  if (statusIzin !== "granted") return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error("EAS projectId belum ditemukan.");
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  const keanggotaan = await getDocs(
    query(
      collectionGroup(db, "anggota"),
      where("uid", "==", uid),
      where("status", "==", "aktif"),
    ),
  );

  const praktikumAktif = new Map<
    string,
    { kelasId: string; praktikumId: string }
  >();

  for (const anggota of keanggotaan.docs) {
    const bagianPath = anggota.ref.path.split("/");

    if (
      bagianPath.length === 6 &&
      bagianPath[0] === "kelas" &&
      bagianPath[2] === "praktikum" &&
      bagianPath[4] === "anggota"
    ) {
      const kelasId = bagianPath[1];
      const praktikumId = bagianPath[3];

      praktikumAktif.set(`${kelasId}/${praktikumId}`, {
        kelasId,
        praktikumId,
      });
    }
  }

  await Promise.all(
    [...praktikumAktif.values()].map(async ({ kelasId, praktikumId }) => {
      const tokenCollection = collection(
        db,
        "kelas",
        kelasId,
        "praktikum",
        praktikumId,
        "pushTokens",
      );

      const tokenLama = await getDocs(
        query(tokenCollection, where("uid", "==", uid)),
      );

      await Promise.all(
        tokenLama.docs
          .filter((item) => item.id !== token)
          .map((item) => deleteDoc(item.ref)),
      );

      await setDoc(
        doc(
          db,
          "kelas",
          kelasId,
          "praktikum",
          praktikumId,
          "pushTokens",
          token,
        ),
        {
          uid,
          token,
          platform: Platform.OS,
          updatedAt: new Date().toISOString(),
        },
      );
    }),
  );

  return token;
}

async function kirimKeToken(
  tokens: string[],
  title: string,
  body: string,
  data: DataPush,
) {
  const unik = [...new Set(tokens)].filter(Boolean);

  for (let index = 0; index < unik.length; index += 100) {
    const pesan = unik.slice(index, index + 100).map((token) => ({
      to: token,
      title,
      body,
      sound: "default",
      channelId: "siprak",
      priority: "high",
      data,
    }));

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pesan),
      });

      if (!response.ok) {
        console.warn("Expo Push Service menolak permintaan:", response.status);
        continue;
      }

      const hasil = (await response.json()) as {
        data?: { status?: string; message?: string }[];
      };

      const gagal = hasil.data?.filter((item) => item.status === "error") ?? [];

      if (gagal.length > 0) {
        console.warn("Sebagian push gagal dikirim:", gagal);
      }
    } catch (error) {
      console.warn("Gagal menghubungi Expo Push Service:", error);
    }
  }
}

export async function kirimPushKePraktikum(
  kelasId: string,
  praktikumId: string,
  sesiId: string,
  title: string,
  body: string,
  type: string,
) {
  try {
    const anggotaCollection = collection(
      db,
      "kelas",
      kelasId,
      "praktikum",
      praktikumId,
      "anggota",
    );
    const tokenCollection = collection(
      db,
      "kelas",
      kelasId,
      "praktikum",
      praktikumId,
      "pushTokens",
    );

    const [anggotaSnapshot, tokenSnapshot] = await Promise.all([
      getDocs(anggotaCollection),
      getDocs(tokenCollection),
    ]);

    const uidAktif = new Set(
      anggotaSnapshot.docs
        .filter((item) => item.data().status === "aktif")
        .map((item) => item.id),
    );

    const tokens = tokenSnapshot.docs.flatMap((item) => {
      const data = item.data();

      return uidAktif.has(String(data.uid)) && typeof data.token === "string"
        ? [data.token]
        : [];
    });

    await kirimKeToken(tokens, title, body, {
      type,
      kelasId,
      praktikumId,
      sesiId,
    });
  } catch (error) {
    console.warn("Gagal menyiapkan push untuk praktikum:", error);
  }
}

export async function kirimPushKePraktikan(
  kelasId: string,
  praktikumId: string,
  praktikanUid: string,
  sesiId: string,
  title: string,
  body: string,
  type: string,
) {
  try {
    const tokenSnapshot = await getDocs(
      query(
        collection(
          db,
          "kelas",
          kelasId,
          "praktikum",
          praktikumId,
          "pushTokens",
        ),
        where("uid", "==", praktikanUid),
      ),
    );

    const tokens = tokenSnapshot.docs.flatMap((item) => {
      const token = item.data().token;
      return typeof token === "string" ? [token] : [];
    });

    await kirimKeToken(tokens, title, body, {
      type,
      kelasId,
      praktikumId,
      sesiId,
    });
  } catch (error) {
    console.warn("Gagal menyiapkan push untuk praktikan:", error);
  }
}
