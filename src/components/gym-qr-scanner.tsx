"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorInstance = { detect(source: HTMLVideoElement): Promise<DetectedBarcode[]> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

function joinPath(rawValue: string) {
  try {
    const url = new URL(rawValue, window.location.origin);
    return url.origin === window.location.origin
      && /^\/join\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(url.pathname)
      ? url.pathname
      : null;
  } catch {
    return null;
  }
}

export function GymQrScanner() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef<number | null>(null);
  const [supported] = useState(() => typeof window !== "undefined"
    && typeof navigator !== "undefined"
    && typeof navigator.mediaDevices?.getUserMedia === "function"
    && "BarcodeDetector" in window);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("Camera scanning is off.");

  function stop() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setActive(false);
  }

  useEffect(() => {
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function start() {
    const Constructor = (window as typeof window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!Constructor || !video.current) return;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      stream.current = media;
      video.current.srcObject = media;
      await video.current.play();
      setActive(true);
      setMessage("Camera active. Point it at a MyCrux gym QR code.");
      const detector = new Constructor({ formats: ["qr_code"] });
      const scan = async () => {
        if (!video.current || !stream.current) return;
        try {
          const codes = await detector.detect(video.current);
          const destination = codes.map(({ rawValue }) => joinPath(rawValue)).find(Boolean);
          if (destination) {
            stop();
            setMessage("Gym QR code found. Opening join confirmation.");
            window.location.assign(destination);
            return;
          }
        } catch {
          setMessage("The camera is active, but that QR code could not be read. Try the gym code instead.");
        }
        frame.current = requestAnimationFrame(scan);
      };
      frame.current = requestAnimationFrame(scan);
    } catch {
      stop();
      setMessage("Camera access was unavailable or declined. Use your phone camera or enter the gym code.");
    }
  }

  if (supported === false) return <p className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-[var(--muted)]">In-app scanning is not supported by this browser. Scan with your phone camera or enter the gym code below.</p>;
  return (
    <div className="mt-5">
      <div className={`overflow-hidden rounded-2xl bg-black ${active ? "block" : "hidden"}`}>
        <video aria-label="Live camera preview for gym QR scanning" className="aspect-[4/3] w-full object-cover" muted playsInline ref={video} />
      </div>
      <p aria-live="polite" className="mt-3 text-sm text-[var(--muted)]">{message}</p>
      <div className="mt-3 flex gap-3">
        {active ? <Button onClick={stop} type="button" variant="secondary">Stop camera</Button> : <Button onClick={start} type="button">Scan QR code</Button>}
      </div>
    </div>
  );
}
