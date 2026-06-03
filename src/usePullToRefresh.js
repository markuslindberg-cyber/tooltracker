import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
];

// Debounce: ignore duplicate scans within this window
const SCAN_COOLDOWN_MS = 1500;

export function useBarcodeCamera(containerId, isActive, onScan) {
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const lastScanRef = useRef({ text: '', time: 0 });
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!isActive || !containerId) return;

    let stopped = false;

    const startScanner = async () => {
      const el = document.getElementById(containerId);
      if (!el) return;

      try {
        const scanner = new Html5Qrcode(containerId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (stopped || cameras.length === 0) return;

        const backCam = cameras.find(c => /back|rear|environment/i.test(c.label));
        const cameraId = backCam ? backCam.id : cameras[cameras.length - 1].id;

        await scanner.start(
          cameraId,
          {
            fps: 20,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const w = Math.min(Math.floor(viewfinderWidth * 0.85), 500);
              const h = Math.min(Math.floor(viewfinderHeight * 0.45), 250);
              return { width: Math.max(w, 200), height: Math.max(h, 100) };
            },
            aspectRatio: 1.777,
            disableFlip: false,
          },
          (decodedText) => {
            const now = Date.now();
            const last = lastScanRef.current;
            if (decodedText === last.text && now - last.time < SCAN_COOLDOWN_MS) return;
            lastScanRef.current = { text: decodedText, time: now };
            const container = document.getElementById(containerId);
            if (container) {
              const flash = container.parentElement?.querySelector('.scan-flash-overlay');
              if (flash) {
                flash.style.opacity = '1';
                setTimeout(() => { flash.style.opacity = '0'; }, 500);
              }
            }
            onScanRef.current(decodedText);
          },
          () => {}
        );

        // Check torch/flashlight support
        try {
          const videoElement = el.querySelector('video');
          if (videoElement?.srcObject) {
            const track = videoElement.srcObject.getVideoTracks()[0];
            const capabilities = track?.getCapabilities?.();
            if (capabilities?.torch) {
              setTorchSupported(true);
            }
          }
        } catch {}
      } catch (error) {
        console.error('Fel vid kamerastart:', error);
      }
    };

    startScanner();

    return () => {
      stopped = true;
      setTorchOn(false);
      setTorchSupported(false);
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        scanner.stop().then(() => {
          try { scanner.clear(); } catch {}
        }).catch(() => {
          try { scanner.clear(); } catch {}
        });
      }
    };
  }, [isActive, containerId]);

  const toggleTorch = useCallback(async () => {
    try {
      const el = document.getElementById(containerId);
      const videoElement = el?.querySelector('video');
      if (videoElement?.srcObject) {
        const track = videoElement.srcObject.getVideoTracks()[0];
        const newState = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: newState }] });
        setTorchOn(newState);
      }
    } catch (err) {
      console.error('Torch toggle failed:', err);
    }
  }, [containerId, torchOn]);

  return { torchOn, torchSupported, toggleTorch };
}