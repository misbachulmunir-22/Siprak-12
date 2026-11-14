import { StatusAI } from '@/types/siprak';

export interface AIClassificationResult {
  status: StatusAI;
  category?: string;
  confidence?: number;
  model?: string;
  processedAt?: string;
  errorMessage?: string;
  isMock?: boolean;
}

export interface AIClassificationRequest {
  text: string;
  requestId: string;
}

export interface AIClassificationResponse {
  category?: string;
  confidence?: number;
  model?: string;
  message?: string;
}

/**
 * Adapter API Model AI Pengajar.
 * Sesuai SRS Sprint 2 Bab 6.6, 6.7, Lampiran C.
 * 
 * ATURAN MUTLAK SRS:
 * 1. AI hanya memberikan prediksi kategori dan metadata.
 * 2. Hasil AI TIDAK BOLEH mengubah status persetujuan izin ('menunggu').
 * 3. Jika API AI gagal, timeout, atau belum dikonfigurasi, pengajuan tetap aman
 *    dan hanya status AI yang menjadi 'gagal' atau 'tidak_tersedia'.
 */
export async function classifyLeaveReason(
  reasonText: string,
  requestId: string
): Promise<AIClassificationResult> {
  const baseUrl = process.env.EXPO_PUBLIC_AI_API_BASE_URL?.trim();
  const useMock = process.env.EXPO_PUBLIC_USE_AI_MOCK === 'true';

  // 1. Endpoint belum dikonfigurasi
  if (!baseUrl && !useMock) {
    return {
      status: 'tidak_tersedia',
      errorMessage: 'Endpoint API AI belum dikonfigurasi di environment (EXPO_PUBLIC_AI_API_BASE_URL).',
      processedAt: new Date().toISOString(),
    };
  }

  // 2. Mode mock untuk pengujian lokal / pengembangan paralel bila endpoint pengajar belum tersedia
  if (useMock || baseUrl === 'mock') {
    return simulateMockClassification(reasonText, requestId);
  }

  // 3. Panggilan ke API HTTP pengajar
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // Batas waktu 8 detik

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const authToken = process.env.EXPO_PUBLIC_AI_API_TOKEN;
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const endpoint = baseUrl.endsWith('/') ? `${baseUrl}classify` : `${baseUrl}/classify`;

    const requestBody: AIClassificationRequest = {
      text: reasonText,
      requestId,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        status: 'gagal',
        errorMessage: `API AI mengembalikan status HTTP ${response.status}`,
        processedAt: new Date().toISOString(),
      };
    }

    const data: AIClassificationResponse = await response.json();

    if (!data || typeof data.category !== 'string' || data.category.trim().length === 0) {
      return {
        status: 'gagal',
        errorMessage: 'Respons API AI tidak memuat field category yang valid.',
        processedAt: new Date().toISOString(),
      };
    }

    const confidence = typeof data.confidence === 'number' && !Number.isNaN(data.confidence)
      ? Math.min(1, Math.max(0, data.confidence))
      : undefined;

    return {
      status: 'berhasil',
      category: data.category.trim(),
      confidence,
      model: typeof data.model === 'string' ? data.model.trim() : 'AI Model Pengajar',
      processedAt: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    const message = isTimeout
      ? 'Permintaan ke API AI melebihi batas waktu (timeout).'
      : err instanceof Error
        ? err.message
        : 'Gagal terhubung ke layanan AI.';

    return {
      status: 'gagal',
      errorMessage: message,
      processedAt: new Date().toISOString(),
    };
  }
}

/**
 * Mock classifier sederhana untuk pengujian otomatis / fallback dev tanpa jaringan luar.
 * Mengklasifikasikan kata kunci umum ke kategori yang relevan.
 */
function simulateMockClassification(text: string, _requestId: string): Promise<AIClassificationResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lower = text.toLowerCase();
      let category = 'Lainnya';
      let confidence = 0.85;

      if (
        lower.includes('sakit') ||
        lower.includes('demam') ||
        lower.includes('flu') ||
        lower.includes('rawat') ||
        lower.includes('dokter') ||
        lower.includes('pusing')
      ) {
        category = 'Sakit';
        confidence = 0.94;
      } else if (
        lower.includes('lomba') ||
        lower.includes('olimpiade') ||
        lower.includes('kompetisi') ||
        lower.includes('seminar') ||
        lower.includes('konferensi')
      ) {
        category = 'Tugas Akademik/Lomba';
        confidence = 0.91;
      } else if (
        lower.includes('keluarga') ||
        lower.includes('menikah') ||
        lower.includes('lelayu') ||
        lower.includes('duka') ||
        lower.includes('orang tua')
      ) {
        category = 'Kepentingan Keluarga';
        confidence = 0.88;
      }

      resolve({
        status: 'berhasil',
        category,
        confidence,
        model: 'simulated-siprak-classifier-v1',
        processedAt: new Date().toISOString(),
        isMock: true,
      });
    }, 400);
  });
}
