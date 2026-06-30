"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function PixQrCode({ brCode }: { brCode: string }) {
  const [qrCodeSrc, setQrCodeSrc] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    QRCode.toDataURL(brCode, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 180,
    })
      .then((nextSrc) => {
        if (isMounted) {
          setQrCodeSrc(nextSrc);
        }
      })
      .catch(() => {
        if (isMounted) {
          setQrCodeSrc(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [brCode]);

  return (
    <div className="flex flex-col items-center gap-2 rounded border border-slate-200 bg-white p-3">
      {qrCodeSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt="Pix QR code"
          className="h-[180px] w-[180px]"
          height={180}
          src={qrCodeSrc}
          width={180}
        />
      ) : (
        <div className="flex h-[180px] w-[180px] items-center justify-center rounded bg-slate-100 text-xs text-slate-500">
          QR pending
        </div>
      )}
      <p className="text-xs font-medium text-slate-600">Pix QR code</p>
    </div>
  );
}
