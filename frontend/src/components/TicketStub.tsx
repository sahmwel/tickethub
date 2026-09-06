// components/TicketStub.tsx

import { Repeat } from "lucide-react";

interface TicketStubProps {
  code: string;
  holderName: string;
  checkedIn: boolean;
  transferredAt?: string | null;
  transferredToName?: string | null;
  index: number;
  total: number;
  onTransferClick: () => void;
}

export default function TicketStub({
  code,
  holderName,
  checkedIn,
  transferredAt,
  transferredToName,
  index,
  total,
  onTransferClick,
}: TicketStubProps) {
  if (transferredAt) {
    return (
      <div className="bg-panel border border-line border-dashed rounded-2xl p-5 opacity-70">
        <p className="text-[10px] uppercase tracking-widest text-smoke mb-1">
          Ticket {index + 1} of {total}
        </p>
        <p className="font-display text-lg text-bone mb-1">Transferred away</p>
        <p className="text-sm text-smoke">
          This ticket now belongs to <span className="text-bone font-semibold">{transferredToName}</span>.
          It's no longer valid on your account.
        </p>
        <p className="text-[11px] text-smoke/60 mt-2">
          Transferred on{" "}
          {new Date(transferredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(code)}`;

  return (
    <div className="relative">
      <div className="bg-panel border border-line rounded-2xl overflow-hidden flex">
        <div className="flex-1 p-5 flex flex-col justify-center min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-smoke mb-1">
            Ticket {index + 1} of {total}
          </p>
          <p className="font-display text-lg text-bone truncate">{holderName}</p>
          <p className="font-mono text-[11px] text-smoke/70 mt-1 truncate">{code}</p>

          {checkedIn ? (
            <span className="mt-2 inline-block text-[10px] uppercase tracking-wide text-smoke">Checked in</span>
          ) : (
            <button
              onClick={onTransferClick}
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-gold hover:text-gold-bright w-fit"
            >
              <Repeat className="w-3 h-3" />
              Transfer ticket
            </button>
          )}
        </div>

        <div className="relative w-0 border-l border-dashed border-line/70">
          <span className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-ink border border-line" />
          <span className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-ink border border-line" />
        </div>

        <div className="w-[104px] shrink-0 flex items-center justify-center p-3 bg-bone">
          <img src={qrUrl} alt={`QR code for ticket ${index + 1}`} className="w-full h-full object-contain rounded" />
        </div>
      </div>
    </div>
  );
}