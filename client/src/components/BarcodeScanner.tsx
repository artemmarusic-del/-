import { useEffect, useRef, useState } from "react";

/**
 * Сканер штрихкода с упаковки.
 *
 * Библиотека сканирования подгружается динамически — только когда пользователь
 * открыл сканер, чтобы не утяжелять запуск приложения. Если камера недоступна
 * (например, на компьютере без веб-камеры), остаётся ручной ввод цифр.
 */
const ELEMENT_ID = "xe-barcode-reader";

/**
 * Остановка сканера, которая не может уронить приложение.
 * html5-qrcode бросает исключение, если камера так и не запустилась
 * (нет разрешения, нет камеры) — а это происходит при закрытии окна.
 */
function safeStop(scanner: any) {
  try {
    const result = scanner?.stop?.();
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {
    /* сканер и не был запущен — останавливать нечего */
  }
  try {
    scanner?.clear?.();
  } catch {
    /* очищать тоже нечего */
  }
}

export default function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [manual, setManual] = useState("");
  const scannerRef = useRef<any>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(ELEMENT_ID, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (decodedText: string) => {
            if (stoppedRef.current) return;
            stoppedRef.current = true;
            safeStop(scanner);
            onDetected(decodedText.replace(/\D/g, ""));
          },
          () => {
            /* кадр без кода — это норма, ничего не делаем */
          }
        );
        if (!cancelled) setStarting(false);
      } catch (err) {
        if (cancelled) return;
        setStarting(false);
        setError(
          "Не удалось включить камеру. Разрешите доступ к камере в браузере или введите цифры штрихкода вручную."
        );
      }
    })();

    return () => {
      cancelled = true;
      safeStop(scannerRef.current);
    };
  }, [onDetected]);

  return (
    <div className="flex flex-col gap-3">
      <div
        id={ELEMENT_ID}
        className="overflow-hidden rounded-xl bg-slate-900"
        style={{ minHeight: error ? 0 : 220 }}
      />

      {starting && !error && (
        <p className="text-center text-sm text-slate-400">Включаем камеру…</p>
      )}

      {!error && !starting && (
        <p className="text-center text-xs text-slate-400">
          Наведите камеру на штрихкод на упаковке
        </p>
      )}

      {error && <p className="text-sm text-accent-600">{error}</p>}

      <div>
        <label className="label">Или введите цифры под штрихкодом</label>
        <div className="flex gap-2">
          <input
            className="input"
            inputMode="numeric"
            value={manual}
            onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))}
            placeholder="например, 4600682001010"
          />
          <button
            type="button"
            className="btn-primary shrink-0"
            disabled={manual.length < 8}
            onClick={() => onDetected(manual)}
          >
            Найти
          </button>
        </div>
      </div>

      <button type="button" className="btn-secondary" onClick={onClose}>
        Отмена
      </button>
    </div>
  );
}
