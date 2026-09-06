// frontend/src/pages/organizer/ScanTickets.tsx
import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  ScanLine,
  Calendar,
  MapPin,
  Ticket,
  Send,
  RefreshCw,
} from "lucide-react";
import { apiGet, apiPost } from "../../lib/apiClient";
import { formatEventDateTime } from "../../lib/constants";
import { Html5Qrcode } from "html5-qrcode";

interface TicketData {
  id: string;
  code: string;
  holder_name: string;
  checked_in: boolean;
  checked_in_at: string | null;
  transferred_at: string | null;
  transferred_to_name: string | null;
  ticket_type: {
    id: string;
    name: string;
    price: number;
  };
  order: {
    id: string;
    buyer_name: string;
    buyer_email: string;
    payment_reference: string;
  };
  event_id: string;
}

interface EventInfo {
  id: string;
  title: string;
  venue_name: string;
  address: string;
  city: string;
  start_at: string;
  timezone: string;
}

type ScanStatus = "idle" | "scanning" | "success" | "error" | "already_checked" | "not_found" | "transferred";

export default function ScanTickets() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScannerReady, setIsScannerReady] = useState(false);
  const [isCameraAccessible, setIsCameraAccessible] = useState(false);

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scannedTicket, setScannedTicket] = useState<TicketData | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [transferredCount, setTransferredCount] = useState(0);
  const [isCheckingCamera, setIsCheckingCamera] = useState(false);

  // ─── Fetch event info and stats ──────────────────────────────────
  useEffect(() => {
    if (!eventId) {
      navigate("/organizer");
      return;
    }

    (async () => {
      try {
        const eventResponse = await apiGet<{ event: EventInfo }>(`/api/events/${eventId}`);
        if (!eventResponse.event) throw new Error("Event not found");
        setEvent(eventResponse.event);

        const statsResponse = await apiGet<{ stats: { checkedInCount: number; transferredCount: number } }>(
          `/api/organizer/events/${eventId}/stats`
        );
        if (statsResponse.stats) {
          setCheckedInCount(statsResponse.stats.checkedInCount || 0);
          setTransferredCount(statsResponse.stats.transferredCount || 0);
        }
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load event");
        setLoading(false);
      }
    })();

    // Cleanup scanner on unmount
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
          scannerRef.current.clear();
        } catch (err) {
          console.error("Cleanup error:", err);
        }
      }
    };
  }, [eventId, navigate]);

  // ─── Initialize scanner AFTER loading completes ─────────────────
  useEffect(() => {
    if (loading) return; // wait for event load

    const container = document.getElementById("scanner-container");
    if (!container) {
      console.error("Scanner container not found");
      setError("Scanner container not found. Please refresh the page.");
      return;
    }

    // Avoid re‑initialising if already done
    if (scannerRef.current) return;

    try {
      scannerRef.current = new Html5Qrcode("scanner-container");
      setIsScannerReady(true);
      console.log("✅ Scanner initialized");
    } catch (err) {
      console.error("Scanner init error:", err);
      setError("Failed to initialize QR scanner. Please refresh the page.");
    }
  }, [loading]); // runs when loading becomes false

  // ─── Camera access check ─────────────────────────────────────────
  const checkCameraAccess = async () => {
    if (!scannerRef.current) {
      setError("Scanner not initialized");
      return false;
    }

    try {
      setIsCheckingCamera(true);
      const cameras = await Html5Qrcode.getCameras();
      console.log("📸 Cameras found:", cameras);

      if (!cameras || cameras.length === 0) {
        throw new Error("No camera found. Please connect a camera and grant permission.");
      }

      setIsCameraAccessible(true);
      setError(null);
      console.log("✅ Camera accessible");
      return true;
    } catch (err) {
      console.error("Camera access error:", err);
      setIsCameraAccessible(false);
      setError(err instanceof Error ? err.message : "Failed to access camera");
      return false;
    } finally {
      setIsCheckingCamera(false);
    }
  };

  // ─── Start scanner ───────────────────────────────────────────────
  const startScanner = async () => {
    if (!scannerRef.current) {
      setError("Scanner not ready. Please refresh the page.");
      return;
    }

    try {
      setScanning(true);
      setScanStatus("scanning");
      setStatusMessage("Accessing camera...");

      let cameraAvailable = isCameraAccessible;
      if (!cameraAvailable) {
        cameraAvailable = await checkCameraAccess();
        if (!cameraAvailable) {
          throw new Error("Camera not accessible. Please grant camera permissions.");
        }
      }

      let cameras;
      try {
        cameras = await Html5Qrcode.getCameras();
      } catch (err) {
        console.error("Get cameras error:", err);
        await checkCameraAccess();
        cameras = await Html5Qrcode.getCameras();
      }

      if (!cameras || cameras.length === 0) {
        throw new Error("No camera found. Please connect a camera and try again.");
      }

      // Prefer back/environment camera
      let cameraId = cameras[0]?.id;
      const backCam = cameras.find(
        (c: any) => c.label.toLowerCase().includes("back") || c.label.toLowerCase().includes("environment")
      );
      if (backCam) cameraId = backCam.id;

      console.log("📸 Using camera:", cameraId);

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      setStatusMessage("Scanning for QR codes...");
      await scannerRef.current.start(cameraId, config, onScanSuccess, onScanError);
      setScanStatus("scanning");
      console.log("✅ Scanner started successfully");
    } catch (err) {
      console.error("Scanner start error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to start scanner";
      setError(errorMessage);
      setScanning(false);
      setScanStatus("idle");
      setStatusMessage("");

      if (errorMessage.toLowerCase().includes("camera") || errorMessage.toLowerCase().includes("permission")) {
        setIsCameraAccessible(false);
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
        setScanning(false);
        setScanStatus("idle");
        setStatusMessage("");
        console.log("🛑 Scanner stopped");
      } catch (err) {
        console.error("Stop scanner error:", err);
      }
    }
  };

  // ─── Scan success handler ────────────────────────────────────────
  const onScanSuccess = async (decodedText: string) => {
    console.log("✅ QR Code detected:", decodedText);

    if (scannerRef.current) {
      try {
        await scannerRef.current.pause();
      } catch (err) {
        console.error("Pause scanner error:", err);
      }
    }

    setScanStatus("scanning");
    setStatusMessage("Checking ticket...");

    try {
      const ticketResponse = await apiGet<{ ticket: TicketData }>(`/api/tickets/${decodedText}`);
      const ticket = ticketResponse.ticket;

      if (!ticket) {
        setScanStatus("not_found");
        setStatusMessage("Ticket not found for this event");
        setScannedTicket(null);
        setTimeout(resumeScanner, 3000);
        return;
      }

      if (ticket.event_id !== eventId) {
        setScanStatus("not_found");
        setStatusMessage("Ticket does not belong to this event");
        setScannedTicket(null);
        setTimeout(resumeScanner, 3000);
        return;
      }

      console.log("🎫 Ticket found:", ticket);
      setScannedTicket(ticket);

      if (ticket.transferred_at) {
        setScanStatus("transferred");
        setStatusMessage(`⚠️ Ticket was transferred to ${ticket.transferred_to_name || "another person"}`);
        setTimeout(resumeScanner, 3000);
        return;
      }

      if (ticket.checked_in) {
        setScanStatus("already_checked");
        setStatusMessage(`Ticket already checked in at ${new Date(ticket.checked_in_at || "").toLocaleTimeString()}`);
        setTimeout(resumeScanner, 3000);
        return;
      }

      const checkInResponse = await apiPost<{
        message: string;
        success: boolean;
        ticket: TicketData;
      }>(`/api/tickets/${decodedText}/check-in`);

      if (!checkInResponse.success) {
        throw new Error(checkInResponse.message || "Failed to check in ticket");
      }

      const updatedTicket = checkInResponse.ticket;
      setScannedTicket(updatedTicket);

      setScanStatus("success");
      setStatusMessage(`✅ ${updatedTicket.holder_name} checked in successfully!`);
      setScanCount((prev) => prev + 1);
      setCheckedInCount((prev) => prev + 1);

      setTimeout(resumeScanner, 3000);
    } catch (err) {
      console.error("❌ Scan processing error:", err);
      setScanStatus("error");
      setStatusMessage(err instanceof Error ? err.message : "Failed to process ticket");
      setTimeout(resumeScanner, 3000);
    }
  };

  const onScanError = (err: any) => {
    if (err && !err.message?.includes("No MultiFormat Readers")) {
      console.debug("Scan error:", err);
    }
  };

  const resumeScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.resume();
        setScanStatus("scanning");
        setStatusMessage("Scanning for QR codes...");
        setScannedTicket(null);
        console.log("🔄 Scanner resumed");
      } catch (err) {
        console.error("Resume scanner error:", err);
      }
    }
  };

  // ─── Manual entry ────────────────────────────────────────────────
  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    setIsSubmitting(true);
    await onScanSuccess(manualCode.trim());
    setIsSubmitting(false);
    setManualCode("");
  };

  // ─── Utilities ────────────────────────────────────────────────────
  const formatDate = (date: string, timezone?: string) => {
    return formatEventDateTime(date, timezone || "Africa/Lagos", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: ScanStatus) => {
    switch (status) {
      case "success":
        return "border-green-400/30 bg-green-400/5";
      case "error":
        return "border-red-400/30 bg-red-400/5";
      case "already_checked":
        return "border-yellow-400/30 bg-yellow-400/5";
      case "transferred":
        return "border-blue-400/30 bg-blue-400/5";
      case "not_found":
        return "border-red-400/30 bg-red-400/5";
      case "scanning":
        return "border-gold/30 bg-gold/5";
      default:
        return "border-line";
    }
  };

  const getStatusIcon = (status: ScanStatus) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-400 shrink-0" />;
      case "already_checked":
        return <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />;
      case "transferred":
        return <Send className="w-5 h-5 text-blue-400 shrink-0" />;
      case "not_found":
        return <XCircle className="w-5 h-5 text-red-400 shrink-0" />;
      case "scanning":
        return <Loader2 className="w-5 h-5 text-gold animate-spin shrink-0" />;
      default:
        return null;
    }
  };

  const getStatusTextColor = (status: ScanStatus) => {
    switch (status) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "already_checked":
        return "text-yellow-400";
      case "transferred":
        return "text-blue-400";
      case "not_found":
        return "text-red-400";
      case "scanning":
        return "text-gold";
      default:
        return "text-smoke";
    }
  };

  // ─── Render ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ink to-black/95">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-line rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-gold rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-smoke text-sm animate-pulse">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ink to-black/95">
        <div className="max-w-4xl mx-auto px-6 pb-24 text-center">
          <div className="bg-panel border border-line rounded-2xl p-12">
            <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="font-display text-3xl mb-3 text-bone">Event not found</h2>
            <p className="text-smoke mb-6">This event doesn't exist or you don't have access.</p>
            <Link
              to="/organizer"
              className="inline-flex items-center gap-2 text-gold font-semibold hover:text-gold-bright transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink to-black/95">
      <div className="max-w-4xl mx-auto px-6 lg:px-10 pt-8 pb-24">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Link
              to={`/organizer/event/${eventId}`}
              className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-2 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to event
            </Link>
            <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-bone">Scan Tickets</h1>
            <p className="text-smoke text-sm mt-1">{event.title}</p>
          </div>
          <div className="flex items-center gap-4 bg-panel border border-line rounded-2xl px-4 py-2">
            <div className="text-center">
              <p className="text-xs text-smoke">Scanned</p>
              <p className="text-lg font-bold text-gold">{scanCount}</p>
            </div>
            <div className="w-px h-8 bg-line" />
            <div className="text-center">
              <p className="text-xs text-smoke">Checked in</p>
              <p className="text-lg font-bold text-green-400">{checkedInCount}</p>
            </div>
            <div className="w-px h-8 bg-line" />
            <div className="text-center">
              <p className="text-xs text-smoke">Transferred</p>
              <p className="text-lg font-bold text-blue-400">{transferredCount}</p>
            </div>
          </div>
        </div>

        {/* Event info */}
        <div className="bg-panel border border-line rounded-2xl p-4 mb-6 grid sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm text-smoke">
            <Calendar className="w-4 h-4 text-gold shrink-0" />
            <span>{formatDate(event.start_at, event.timezone)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-smoke">
            <MapPin className="w-4 h-4 text-gold shrink-0" />
            <span className="truncate">
              {event.venue_name}, {event.city}
            </span>
          </div>
        </div>

        {/* Scanner */}
        <div className="bg-panel border border-line rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-gold" />
              <h2 className="font-bold text-sm uppercase tracking-widest text-gold">QR Scanner</h2>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  scanning
                    ? "text-green-400 bg-green-400/10 border border-green-400/20"
                    : "text-smoke bg-panel border border-line"
                }`}
              >
                {scanning ? "● Scanning" : "● Idle"}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    await stopScanner();
                    await checkCameraAccess();
                    setError(null);
                  }}
                  className="p-2 rounded-xl border border-line hover:border-gold/50 transition-colors"
                  title="Refresh camera"
                >
                  <RefreshCw className={`w-4 h-4 text-smoke ${isCheckingCamera ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={scanning ? stopScanner : startScanner}
                  className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-colors ${
                    scanning
                      ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                      : "bg-gold hover:bg-gold-bright text-ink"
                  }`}
                  disabled={!isScannerReady || isCheckingCamera}
                >
                  {scanning ? (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      {isCheckingCamera ? "Checking..." : isScannerReady ? "Start" : "Loading..."}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Camera Error */}
          {error && !scanning && (
            <div className="mb-4 p-3 bg-red-400/10 border border-red-400/20 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-400">{error}</p>
                  <button
                    onClick={async () => {
                      await checkCameraAccess();
                      setError(null);
                    }}
                    className="text-xs text-gold hover:text-gold-bright transition-colors mt-1"
                  >
                    Try again →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scanner viewport */}
          <div className="relative">
            <div
              id="scanner-container"
              className="w-full max-w-md mx-auto aspect-square bg-black rounded-xl overflow-hidden border border-line relative"
            >
              {!scanning && !scannedTicket && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 gap-3">
                  <Camera className="w-16 h-16 text-white/20" />
                  <p className="text-sm font-medium">Ready to scan</p>
                  <p className="text-xs text-white/30">Click "Start" to begin</p>
                </div>
              )}
              {!isCameraAccessible && scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 gap-3 bg-black/90">
                  <AlertTriangle className="w-16 h-16 text-yellow-400/50" />
                  <p className="text-sm font-medium text-yellow-400">Camera not accessible</p>
                  <p className="text-xs text-white/30">Please grant camera permissions</p>
                </div>
              )}
            </div>

            {/* Status overlay */}
            {scanStatus !== "idle" && statusMessage && (
              <div className={`mt-4 p-3 rounded-xl border ${getStatusColor(scanStatus)}`}>
                <div className="flex items-center gap-3">
                  {getStatusIcon(scanStatus)}
                  <span className={`text-sm font-medium ${getStatusTextColor(scanStatus)}`}>
                    {statusMessage}
                  </span>
                </div>
              </div>
            )}

            {/* Scanned ticket info */}
            {scannedTicket && (
              <div className="mt-4 p-4 bg-ink rounded-xl border border-line">
                <div className="flex items-center gap-2 mb-3">
                  <Ticket className="w-4 h-4 text-gold" />
                  <span className="text-xs text-smoke">Ticket details</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-smoke">Ticket holder</span>
                    <span className="text-sm font-semibold text-bone">{scannedTicket.holder_name}</span>
                  </div>

                  {scannedTicket.transferred_at && (
                    <div className="flex justify-between items-center bg-blue-400/5 p-2 rounded-lg border border-blue-400/20">
                      <span className="text-xs text-smoke flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-blue-400" />
                        Transferred
                      </span>
                      <span className="text-sm font-semibold text-blue-400">
                        → {scannedTicket.transferred_to_name || "Unknown"}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-xs text-smoke">Ticket type</span>
                    <span className="text-sm text-bone">{scannedTicket.ticket_type?.name || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-smoke">Status</span>
                    <span
                      className={`text-sm font-semibold ${
                        scannedTicket.transferred_at
                          ? "text-blue-400"
                          : scannedTicket.checked_in
                            ? "text-green-400"
                            : "text-yellow-400"
                      }`}
                    >
                      {scannedTicket.transferred_at
                        ? "🔄 Transferred"
                        : scannedTicket.checked_in
                          ? "✓ Checked in"
                          : "Pending"}
                    </span>
                  </div>
                  {scannedTicket.checked_in_at && (
                    <div className="flex justify-between">
                      <span className="text-xs text-smoke">Checked in at</span>
                      <span className="text-sm text-bone">
                        {new Date(scannedTicket.checked_in_at).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  {scannedTicket.transferred_at && (
                    <div className="flex justify-between">
                      <span className="text-xs text-smoke">Transferred at</span>
                      <span className="text-sm text-bone">
                        {new Date(scannedTicket.transferred_at).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-line">
                    <div className="flex justify-between text-xs text-smoke">
                      <span>Order: {scannedTicket.order?.payment_reference || "N/A"}</span>
                      <span>Buyer: {scannedTicket.order?.buyer_name || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Manual entry */}
          <div className="mt-6">
            <button
              onClick={() => setIsManualEntry(!isManualEntry)}
              className="text-xs text-smoke hover:text-bone transition-colors"
            >
              {isManualEntry ? "Hide manual entry" : "Enter ticket code manually"}
            </button>

            {isManualEntry && (
              <form onSubmit={handleManualEntry} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Paste ticket code"
                  className="flex-1 bg-ink border border-line rounded-xl px-4 py-2 text-sm text-bone outline-none focus:border-gold/50 transition-colors font-mono placeholder:text-smoke/50"
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !manualCode.trim()}
                  className="bg-gold hover:bg-gold-bright disabled:opacity-50 text-ink font-bold px-4 py-2 rounded-xl transition-colors text-sm"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check in"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-panel border border-line rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gold mb-2">How to scan</h3>
          <ol className="text-xs text-smoke space-y-1.5 list-decimal list-inside">
            <li>Click "Start" to activate the camera</li>
            <li>Position the QR code within the scanning frame</li>
            <li>The ticket will be automatically checked in</li>
            <li>Each ticket can only be scanned once</li>
            <li>Transferred tickets show the new holder name</li>
            <li>Use manual entry for QR codes that won't scan</li>
          </ol>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2 bg-green-400/5 border border-green-400/20 rounded-lg">
              <p className="text-[11px] text-green-400/70 flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Valid ticket – will be checked in</span>
              </p>
            </div>
            <div className="p-2 bg-blue-400/5 border border-blue-400/20 rounded-lg">
              <p className="text-[11px] text-blue-400/70 flex items-start gap-2">
                <Send className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Transferred ticket – shows new holder</span>
              </p>
            </div>
            <div className="p-2 bg-yellow-400/5 border border-yellow-400/20 rounded-lg">
              <p className="text-[11px] text-yellow-400/70 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Already checked in – can't scan again</span>
              </p>
            </div>
            <div className="p-2 bg-red-400/5 border border-red-400/20 rounded-lg">
              <p className="text-[11px] text-red-400/70 flex items-start gap-2">
                <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Invalid code – not found for this event</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}