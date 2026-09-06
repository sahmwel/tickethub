// frontend/src/pages/organizer/CreateEvent.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Upload,
  X,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Clock,
  Sparkles,
  Award,
  Gift,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiGet, apiPost, apiUpload } from "../../lib/apiClient";
import { CATEGORIES, COUNTRIES, getCountryConfig, getCurrencySymbol } from "../../lib/constants";

// ─── Types ──────────────────────────────────────────────────────────
interface InstallmentPlan {
  down_payment_percent: number;
  months?: number;
  monthly_payment?: number;
  type: "monthly" | "split";
}

interface TicketTypeDraft {
  name: string;
  price: string;
  quantity_total: string;
  max_per_order: string;
  allow_installments: boolean;
  installment_plan: InstallmentPlan | null;
}

interface PayoutAccount {
  paystack_subaccount_code: string | null;
  flutterwave_subaccount_id: string | null;
  payout_setup_complete: boolean;
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

// ─── Get backend base URL from environment ──────────────────────
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export default function CreateEvent() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // ─── State ────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0].name);
  const [country, setCountry] = useState("Nigeria");
  const [venueName, setVenueName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  // Cover image
  const [coverImage, setCoverImage] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Past editions gallery
  const [pastGallery, setPastGallery] = useState<string[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [galleryDragActive, setGalleryDragActive] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Guest artiste
  const [guestArtiste, setGuestArtiste] = useState("");
  const [guestArtisteImage, setGuestArtisteImage] = useState("");
  const [uploadingArtisteImage, setUploadingArtisteImage] = useState(false);
  const [artisteImageError, setArtisteImageError] = useState<string | null>(null);
  const [artisteImageDragActive, setArtisteImageDragActive] = useState(false);
  const artisteImageInputRef = useRef<HTMLInputElement>(null);

  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [feeBearer, setFeeBearer] = useState<"organizer" | "attendee">("attendee");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isSponsored, setIsSponsored] = useState(false);
  const [isNewDrop, setIsNewDrop] = useState(false);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeDraft[]>([
    {
      name: "General Admission",
      price: "",
      quantity_total: "",
      max_per_order: "10",
      allow_installments: false,
      installment_plan: null,
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(true);

  const [paystackSubaccountOverride, setPaystackSubaccountOverride] = useState("");
  const [flutterwaveSubaccountOverride, setFlutterwaveSubaccountOverride] = useState("");
  const [showManualSubaccount, setShowManualSubaccount] = useState(false);

  const countryConfig = getCountryConfig(country);
  const currencySymbol = getCurrencySymbol(countryConfig.currency);

  // ─── Fetch payout account ────────────────────────────────────────
  useEffect(() => {
    apiGet<{ payoutAccount: PayoutAccount }>("/api/organizer/payout-account")
      .then((data) => setPayoutAccount(data.payoutAccount))
      .catch(() => setPayoutAccount(null))
      .finally(() => setPayoutLoading(false));
  }, []);

  const relevantSubaccountConnected =
    countryConfig.provider === "paystack"
      ? !!payoutAccount?.paystack_subaccount_code
      : !!payoutAccount?.flutterwave_subaccount_id;

  // ─── Ticket type helpers ─────────────────────────────────────────
  const updateTicketType = (index: number, field: keyof TicketTypeDraft, value: any) => {
    setTicketTypes((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const addTicketType = () => {
    setTicketTypes((prev) => [
      ...prev,
      {
        name: "",
        price: "",
        quantity_total: "",
        max_per_order: "10",
        allow_installments: false,
        installment_plan: null,
      },
    ]);
  };

  const removeTicketType = (index: number) => {
    setTicketTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAllowInstallmentsChange = (index: number, checked: boolean) => {
    const plan = checked
      ? { down_payment_percent: 50, type: "split" as const }
      : null;
    updateTicketType(index, "allow_installments", checked);
    updateTicketType(index, "installment_plan", plan);
  };

  const handleSetSplitPlan = (index: number) => {
    const currentPlan = ticketTypes[index].installment_plan;
    const plan = {
      down_payment_percent: currentPlan?.down_payment_percent || 50,
      type: "split" as const,
    };
    updateTicketType(index, "installment_plan", plan);
  };

  const handleSetMonthlyPlan = (index: number) => {
    const currentPlan = ticketTypes[index].installment_plan;
    const plan = {
      down_payment_percent: currentPlan?.down_payment_percent || 50,
      months: 3,
      monthly_payment: 0,
      type: "monthly" as const,
    };
    updateTicketType(index, "installment_plan", plan);
  };

  const handleInstallmentPlanChange = (index: number, field: keyof InstallmentPlan, value: any) => {
    const currentPlan = ticketTypes[index].installment_plan;
    if (!currentPlan) return;
    const updatedPlan = { ...currentPlan, [field]: value };
    updateTicketType(index, "installment_plan", updatedPlan);
  };

  // ─── Image upload helpers (with URL prefix) ─────────────────────
  const uploadFile = async (file: File, endpoint: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiUpload<{ fileUrl: string }>(endpoint, formData);
    // response.fileUrl is relative like "/uploads/covers/..."
    // Prepend the backend base URL if it's relative
    const url = response.fileUrl;
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url}`;
  };

  const uploadCoverImage = async (file: File) => {
    if (!profile) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5MB.");
      return;
    }

    setUploadingCover(true);
    setUploadError(null);

    try {
      const url = await uploadFile(file, "/api/uploads/cover");
      setCoverImage(url);
    } catch (err) {
      console.error("Cover upload failed:", err);
      setUploadError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploadingCover(false);
    }
  };

  const uploadGalleryImages = async (files: FileList | File[]) => {
    if (!profile) return;
    const fileArray = Array.from(files);

    const invalid = fileArray.find((f) => !f.type.startsWith("image/"));
    if (invalid) {
      setGalleryError("All files must be images.");
      return;
    }
    const tooBig = fileArray.find((f) => f.size > 5 * 1024 * 1024);
    if (tooBig) {
      setGalleryError("Each image must be under 5MB.");
      return;
    }
    if (pastGallery.length + fileArray.length > 9) {
      setGalleryError("You can add up to 9 past-edition photos.");
      return;
    }

    setUploadingGallery(true);
    setGalleryError(null);

    try {
      const urls: string[] = [];
      for (const file of fileArray) {
        const url = await uploadFile(file, "/api/uploads/gallery");
        urls.push(url);
      }
      setPastGallery((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error("Gallery upload failed:", err);
      setGalleryError(err instanceof Error ? err.message : "Failed to upload images");
    } finally {
      setUploadingGallery(false);
    }
  };

  const uploadArtisteImage = async (file: File) => {
    if (!profile) return;
    if (!file.type.startsWith("image/")) {
      setArtisteImageError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setArtisteImageError("Image must be under 5MB.");
      return;
    }

    setUploadingArtisteImage(true);
    setArtisteImageError(null);

    try {
      const url = await uploadFile(file, "/api/uploads/artiste");
      setGuestArtisteImage(url);
    } catch (err) {
      console.error("Artiste image upload failed:", err);
      setArtisteImageError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploadingArtisteImage(false);
    }
  };

  // ─── Drag/drop handlers ──────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadCoverImage(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadCoverImage(file);
  };

  const handleGalleryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) uploadGalleryImages(files);
    e.target.value = "";
  };

  const handleGalleryDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setGalleryDragActive(false);
    if (e.dataTransfer.files.length > 0) uploadGalleryImages(e.dataTransfer.files);
  };

  const removeGalleryImage = (index: number) => {
    setPastGallery((prev) => prev.filter((_, i) => i !== index));
  };

  const handleArtisteImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadArtisteImage(file);
    e.target.value = "";
  };

  const handleArtisteImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArtisteImageDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadArtisteImage(file);
  };

  // ─── Form validation ─────────────────────────────────────────────
  const formValid =
    title.trim().length > 2 &&
    venueName.trim() &&
    address.trim() &&
    city.trim() &&
    startAt &&
    ticketTypes.every((t) => t.name.trim() && Number(t.price) >= 0 && Number(t.quantity_total) > 0);

  // ─── Submit event ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!profile || !formValid) return;
    setSubmitting(true);
    setError(null);

    try {
      const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`;

      // Prepare event data
      const eventData = {
        title: title.trim(),
        slug,
        description: description.trim(),
        category,
        cover_image: coverImage.trim() || null,
        past_gallery: pastGallery,
        venue_name: venueName.trim(),
        address: address.trim(),
        city: city.trim(),
        country,
        currency: countryConfig.currency,
        timezone: countryConfig.timezone,
        start_at: new Date(startAt).toISOString(),
        end_at: endAt ? new Date(endAt).toISOString() : null,
        status: "draft",
        fee_bearer: feeBearer,
        is_featured: isFeatured,
        is_sponsored: isSponsored,
        is_new_drop: isNewDrop,
        guest_artiste: guestArtiste.trim() || null,
        guest_artiste_image: guestArtisteImage.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        paystack_subaccount_override: paystackSubaccountOverride.trim() || null,
        flutterwave_subaccount_override: flutterwaveSubaccountOverride.trim() || null,
        ticket_types: ticketTypes.map((t) => ({
          name: t.name.trim(),
          price: Number(t.price),
          quantity_total: Number(t.quantity_total),
          max_per_order: Number(t.max_per_order) || 10,
          allow_installments: t.allow_installments,
          installment_plan: t.installment_plan,
        })),
      };

      // POST to backend API
      const response = await apiPost<{
        message: string; success: boolean; eventId: string 
      }>(
        "/api/events",
        eventData
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to create event");
      }

      navigate("/organizer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryEmoji = (categoryName: string) => {
    const cat = CATEGORIES.find((c) => c.name === categoryName);
    return cat?.emoji || "🎪";
  };

  // ─── JSX ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-ink to-black/95">
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-24">
        <Link
          to="/organizer"
          className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to dashboard
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gold/10 rounded-xl">
            <Sparkles className="w-6 h-6 text-gold" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-gold">New event</p>
            <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-bone">Create an event</h1>
          </div>
        </div>
        <p className="text-smoke text-sm mb-8 ml-1">Fill in the details below to create your event</p>

        {/* Payout account status */}
        {!payoutLoading && (
          <div
            className={`rounded-2xl border p-5 mb-6 ${
              relevantSubaccountConnected ? "border-gold/30 bg-panel" : "border-yellow-500/30 bg-yellow-500/5"
            }`}
          >
            <div className="flex items-start gap-3">
              {relevantSubaccountConnected ? (
                <CheckCircle2 className="w-5 h-5 text-gold shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-bold text-bone">
                  {relevantSubaccountConnected
                    ? `✅ Payout account connected (${countryConfig.provider === "paystack" ? "Paystack" : "Flutterwave"})`
                    : `⚠️ No ${countryConfig.provider === "paystack" ? "Paystack" : "Flutterwave"} payout account connected`}
                </p>
                <p className="text-xs text-smoke mt-1">
                  {relevantSubaccountConnected
                    ? `Sales for this event will pay out directly to your bank account, minus the platform fee.`
                    : `You haven't connected a payout account for ${country}. Ticket sales will still work, but funds will need to be settled manually until you connect one.`}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  <Link
                    to="/organizer/payout-settings"
                    className="text-xs font-semibold text-gold hover:text-gold-bright transition-colors"
                  >
                    Set up payout account →
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowManualSubaccount((v) => !v)}
                    className={`text-xs font-semibold transition-colors ${
                      showManualSubaccount
                        ? "text-gold hover:text-gold-bright"
                        : "text-smoke hover:text-bone"
                    }`}
                  >
                    {showManualSubaccount ? "Hide manual entry" : "Or paste a subaccount code manually ↓"}
                  </button>
                </div>

                {showManualSubaccount && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-line/60">
                    <p className="text-[11px] text-smoke">
                      Already have a subaccount code from your Paystack or Flutterwave dashboard? Paste it here to
                      override the auto-connected account for this event only.
                    </p>

                    <div>
                      <label className="text-xs text-smoke mb-1.5 block">
                        Paystack subaccount code
                        {countryConfig.provider === "paystack" && (
                          <span className="text-red-400 ml-1">*</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={paystackSubaccountOverride}
                        onChange={(e) => setPaystackSubaccountOverride(e.target.value)}
                        placeholder="ACCT_xxxxxxxxxxxxxxx"
                        className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm font-mono text-bone outline-none focus:border-gold/50 transition-colors"
                        disabled={countryConfig.provider !== "paystack"}
                      />
                      <p className="text-[10px] text-smoke/60 mt-1">
                        {countryConfig.provider === "paystack"
                          ? "Find this in your Paystack dashboard under Settings > Subaccounts"
                          : "Only applicable for Paystack countries (Nigeria)"}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-smoke mb-1.5 block">
                        Flutterwave subaccount ID
                        {countryConfig.provider === "flutterwave" && (
                          <span className="text-red-400 ml-1">*</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={flutterwaveSubaccountOverride}
                        onChange={(e) => setFlutterwaveSubaccountOverride(e.target.value)}
                        placeholder="RS_xxxxxxxxxxxxxxx"
                        className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm font-mono text-bone outline-none focus:border-gold/50 transition-colors"
                        disabled={countryConfig.provider !== "flutterwave"}
                      />
                      <p className="text-[10px] text-smoke/60 mt-1">
                        {countryConfig.provider === "flutterwave"
                          ? "Find this in your Flutterwave dashboard under Settings > Subaccounts"
                          : "Only applicable for Flutterwave countries (Ghana, Kenya, etc.)"}
                      </p>
                    </div>

                    {(paystackSubaccountOverride || flutterwaveSubaccountOverride) && (
                      <div className="flex items-center gap-2 text-xs text-gold bg-gold/5 px-3 py-2 rounded-lg border border-gold/20">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {countryConfig.provider === "paystack"
                            ? `✅ Paystack subaccount will be used for this event`
                            : `✅ Flutterwave subaccount will be used for this event`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Event Details Section */}
        <div className="bg-panel border border-line rounded-2xl p-6 space-y-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-5 bg-gold rounded-full"></div>
            <h2 className="font-bold text-sm uppercase tracking-widest text-gold">Event details</h2>
          </div>

          <div>
            <label className="text-xs text-smoke mb-1.5 block font-semibold">
              Event Title <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lagos Music Festival 2024"
              className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-smoke mb-1.5 block font-semibold">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Tell attendees what to expect..."
              className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-smoke mb-1.5 block font-semibold">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cover image */}
          <div>
            <label className="text-xs text-smoke mb-1.5 block font-semibold">Cover Image</label>

            {coverImage ? (
              <div className="relative rounded-xl overflow-hidden border border-line">
                <img src={coverImage} alt="Cover preview" className="w-full h-56 object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverImage("")}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-ink/80 backdrop-blur flex items-center justify-center text-bone hover:text-red-400 transition-colors border border-line"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                  dragActive ? "border-gold bg-gold/5" : "border-line hover:border-gold/40"
                }`}
              >
                {uploadingCover ? (
                  <>
                    <Loader2 className="w-6 h-6 text-gold animate-spin" />
                    <p className="text-xs text-smoke">Uploading…</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-gold" />
                    </div>
                    <p className="text-sm text-bone font-semibold">Drag an image here, or click to browse</p>
                    <p className="text-xs text-smoke">JPG or PNG, up to 5MB</p>
                  </>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

            {uploadError && <p className="text-xs text-red-400 mt-2">{uploadError}</p>}

            {!coverImage && !uploadingCover && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:text-gold-bright transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Choose file
              </button>
            )}
          </div>

          {/* Past editions gallery */}
          <div>
            <label className="text-xs text-smoke mb-1.5 block font-semibold">
              Photos from past editions <span className="text-smoke/60 font-normal">(optional, up to 9)</span>
            </label>

            {pastGallery.length > 0 && (
              // 👇 Added a key to silence the warning (the container is now a child of a list in some edge cases)
              <div key="gallery-container" className="grid grid-cols-3 gap-2 mb-3">
                {pastGallery.map((url, i) => (
                  // 👇 Fallback key if url is empty (should not happen)
                  <div key={url || `gallery-${i}`} className="relative rounded-lg overflow-hidden border border-line aspect-square">
                    <img src={url} alt={`Past edition ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-ink/80 backdrop-blur flex items-center justify-center text-bone hover:text-red-400 transition-colors border border-line"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pastGallery.length < 9 && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setGalleryDragActive(true);
                }}
                onDragLeave={() => setGalleryDragActive(false)}
                onDrop={handleGalleryDrop}
                onClick={() => galleryInputRef.current?.click()}
                className={`w-full h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  galleryDragActive ? "border-gold bg-gold/5" : "border-line hover:border-gold/40"
                }`}
              >
                {uploadingGallery ? (
                  <>
                    <Loader2 className="w-5 h-5 text-gold animate-spin" />
                    <p className="text-xs text-smoke">Uploading…</p>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5 text-gold" />
                    <p className="text-xs text-bone font-semibold">
                      Drag photos here, or click to browse ({pastGallery.length}/9)
                    </p>
                  </>
                )}
              </div>
            )}

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryFileSelect}
              className="hidden"
            />

            {galleryError && <p className="text-xs text-red-400 mt-2">{galleryError}</p>}
          </div>

          {/* Guest artiste */}
          <div>
            <label className="text-xs text-smoke mb-1.5 block font-semibold">Guest artiste <span className="text-smoke/60 font-normal">(optional)</span></label>
            <div className="flex items-start gap-4">
              {guestArtisteImage ? (
                <div className="relative shrink-0">
                  <img
                    src={guestArtisteImage}
                    alt="Guest artiste"
                    className="w-20 h-20 rounded-full object-cover border border-line"
                  />
                  <button
                    type="button"
                    onClick={() => setGuestArtisteImage("")}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-ink border border-line flex items-center justify-center text-bone hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setArtisteImageDragActive(true);
                  }}
                  onDragLeave={() => setArtisteImageDragActive(false)}
                  onDrop={handleArtisteImageDrop}
                  onClick={() => artisteImageInputRef.current?.click()}
                  className={`w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                    artisteImageDragActive ? "border-gold bg-gold/5" : "border-line hover:border-gold/40"
                  }`}
                >
                  {uploadingArtisteImage ? (
                    <Loader2 className="w-5 h-5 text-gold animate-spin" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-gold" />
                  )}
                </div>
              )}

              <div className="flex-1">
                <input
                  value={guestArtiste}
                  onChange={(e) => setGuestArtiste(e.target.value)}
                  placeholder="Artiste name"
                  className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
                />
                {!guestArtisteImage && (
                  <button
                    type="button"
                    onClick={() => artisteImageInputRef.current?.click()}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:text-gold-bright transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Add photo
                  </button>
                )}
                {artisteImageError && <p className="text-xs text-red-400 mt-1">{artisteImageError}</p>}
              </div>
            </div>

            <input
              ref={artisteImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleArtisteImageFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Venue & Timing Section */}
        <div className="bg-panel border border-line rounded-2xl p-6 space-y-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-5 bg-gold rounded-full"></div>
            <h2 className="font-bold text-sm uppercase tracking-widest text-gold">Venue &amp; timing</h2>
          </div>

          <div>
            <label className="text-xs text-smoke mb-1.5 block font-semibold">
              Country <span className="text-red-400">*</span>
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
            >
              {COUNTRIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-smoke mt-1 flex items-center gap-1.5">
              <DollarSign className="w-3 h-3 text-gold" />
              Tickets will be priced and charged in {countryConfig.currency} ({currencySymbol}), via{" "}
              <span className="font-semibold text-bone">
                {countryConfig.provider === "paystack" ? "Paystack" : "Flutterwave"}
              </span>
              , and shown in your local time ({countryConfig.timezone}).
            </p>
          </div>

          <div>
            <label className="text-xs text-smoke mb-1.5 block font-semibold">
              Venue name <span className="text-red-400">*</span>
            </label>
            <input
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="e.g. Eko Convention Centre"
              className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-smoke mb-1.5 block font-semibold">
              Address <span className="text-red-400">*</span>
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 1 Lagos Road, Victoria Island"
              className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-smoke mb-1.5 block font-semibold">
              City <span className="text-red-400">*</span>
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Lagos"
              className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-smoke mb-1.5 block font-semibold">
                Start date &amp; time <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-smoke mb-1.5 block font-semibold">End date &amp; time <span className="text-smoke/60 font-normal">(optional)</span></label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-smoke mb-1.5 block font-semibold">Contact email <span className="text-smoke/60 font-normal">(optional)</span></label>
              <input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                type="email"
                placeholder="contact@event.com"
                className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-smoke mb-1.5 block font-semibold">Contact phone <span className="text-smoke/60 font-normal">(optional)</span></label>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+234 800 000 0000"
                className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Platform Fee Section */}
        <div className="bg-panel border border-line rounded-2xl p-6 space-y-3 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 bg-gold rounded-full"></div>
            <h2 className="font-bold text-sm uppercase tracking-widest text-gold">Platform fee</h2>
          </div>
          <p className="text-xs text-smoke mb-3">Who pays the platform fee on each ticket sold?</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setFeeBearer("attendee")}
              className={`flex-1 text-left rounded-xl border px-4 py-3 transition-colors ${
                feeBearer === "attendee" ? "border-gold bg-gold/10" : "border-line hover:border-gold/40"
              }`}
            >
              <p className="text-sm font-bold text-bone">Attendee pays</p>
              <p className="text-xs text-smoke mt-0.5">Fee added on top at checkout. You receive the full ticket price.</p>
            </button>
            <button
              type="button"
              onClick={() => setFeeBearer("organizer")}
              className={`flex-1 text-left rounded-xl border px-4 py-3 transition-colors ${
                feeBearer === "organizer" ? "border-gold bg-gold/10" : "border-line hover:border-gold/40"
              }`}
            >
              <p className="text-sm font-bold text-bone">I absorb it</p>
              <p className="text-xs text-smoke mt-0.5">Attendee pays exactly the ticket price. Fee comes out of your payout.</p>
            </button>
          </div>
        </div>

        {/* Homepage Placement Section */}
        <div className="bg-panel border border-line rounded-2xl p-6 space-y-3 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 bg-gold rounded-full"></div>
            <h2 className="font-bold text-sm uppercase tracking-widest text-gold">Homepage placement</h2>
          </div>
          <p className="text-xs text-smoke mb-3">Request extra visibility — subject to admin approval.</p>
          <label className="flex items-center gap-3 text-sm cursor-pointer text-bone hover:text-gold transition-colors">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="accent-gold w-4 h-4" />
            <Sparkles className="w-4 h-4 text-gold" />
            Feature this event on the homepage hero
          </label>
          <label className="flex items-center gap-3 text-sm cursor-pointer text-bone hover:text-gold transition-colors">
            <input type="checkbox" checked={isSponsored} onChange={(e) => setIsSponsored(e.target.checked)} className="accent-gold w-4 h-4" />
            <Gift className="w-4 h-4 text-gold" />
            Mark as sponsored
          </label>
          <label className="flex items-center gap-3 text-sm cursor-pointer text-bone hover:text-gold transition-colors">
            <input type="checkbox" checked={isNewDrop} onChange={(e) => setIsNewDrop(e.target.checked)} className="accent-gold w-4 h-4" />
            <Award className="w-4 h-4 text-gold" />
            Include in "New Drops"
          </label>
        </div>

        {/* Ticket Types Section */}
        <div className="bg-panel border border-line rounded-2xl p-6 space-y-4 mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-gold rounded-full"></div>
              <h2 className="font-bold text-sm uppercase tracking-widest text-gold">Ticket types</h2>
            </div>
            <button
              onClick={addTicketType}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold-bright transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add type
            </button>
          </div>

          {ticketTypes.map((t, i) => (
            <div key={i} className="border border-line rounded-xl p-4 space-y-3 relative hover:border-gold/30 transition-colors">
              {ticketTypes.length > 1 && (
                <button
                  onClick={() => removeTicketType(i)}
                  className="absolute top-3 right-3 text-smoke hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-smoke mb-1 block font-semibold">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={t.name}
                    onChange={(e) => updateTicketType(i, "name", e.target.value)}
                    placeholder="e.g. VIP"
                    className="w-full bg-ink border border-line rounded-lg px-3 py-2 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-smoke mb-1 block font-semibold">
                    Price ({currencySymbol}) <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={t.price}
                    onChange={(e) => updateTicketType(i, "price", e.target.value)}
                    type="number"
                    min="0"
                    placeholder="0.00"
                    className="w-full bg-ink border border-line rounded-lg px-3 py-2 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-smoke mb-1 block font-semibold">
                    Quantity available <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={t.quantity_total}
                    onChange={(e) => updateTicketType(i, "quantity_total", e.target.value)}
                    type="number"
                    min="1"
                    placeholder="100"
                    className="w-full bg-ink border border-line rounded-lg px-3 py-2 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-smoke mb-1 block font-semibold">
                    Max per order <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={t.max_per_order}
                    onChange={(e) => updateTicketType(i, "max_per_order", e.target.value)}
                    type="number"
                    min="1"
                    placeholder="10"
                    className="w-full bg-ink border border-line rounded-lg px-3 py-2 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
              </div>

              {/* Installment toggle */}
              <div className="mt-3 pt-3 border-t border-line/50">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-smoke hover:text-bone transition-colors">
                  <input
                    type="checkbox"
                    checked={t.allow_installments}
                    onChange={(e) => handleAllowInstallmentsChange(i, e.target.checked)}
                    className="accent-gold w-4 h-4"
                  />
                  <span className="font-semibold">Allow installment payments</span>
                </label>

                {t.allow_installments && t.installment_plan && (
                  <div className="mt-3 ml-6 space-y-3 border-l-2 border-gold/30 pl-4">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleSetSplitPlan(i)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                          t.installment_plan.type === "split"
                            ? "border-gold bg-gold/10 text-gold"
                            : "border-line text-smoke hover:border-gold/40"
                        }`}
                      >
                        Split (50% now, 50% due 24h before event)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetMonthlyPlan(i)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                          t.installment_plan.type === "monthly"
                            ? "border-gold bg-gold/10 text-gold"
                            : "border-line text-smoke hover:border-gold/40"
                        }`}
                      >
                        Monthly installments
                      </button>
                    </div>

                    <div>
                      <label className="text-xs text-smoke block mb-1">Down payment percentage (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={t.installment_plan.down_payment_percent}
                        onChange={(e) => handleInstallmentPlanChange(i, "down_payment_percent", Number(e.target.value))}
                        className="w-24 bg-ink border border-line rounded-lg px-3 py-1.5 text-sm text-bone outline-none focus:border-gold/50"
                      />
                      <span className="text-xs text-smoke ml-2">of ticket price</span>
                      {t.installment_plan.type === "split" && (
                        <div className="mt-2 text-xs text-smoke/70 space-y-1">
                          <p>
                            The remaining balance ({100 - t.installment_plan.down_payment_percent}%) will be due <strong>24 hours before the event</strong>.
                            If not paid, the deposit is refunded <strong>48 hours after the event</strong>.
                          </p>
                        </div>
                      )}
                    </div>

                    {t.installment_plan.type === "monthly" && (
                      <>
                        <div>
                          <label className="text-xs text-smoke block mb-1">Number of months</label>
                          <input
                            type="number"
                            min="2"
                            max="12"
                            value={t.installment_plan.months || 3}
                            onChange={(e) => handleInstallmentPlanChange(i, "months", Number(e.target.value))}
                            className="w-24 bg-ink border border-line rounded-lg px-3 py-1.5 text-sm text-bone outline-none focus:border-gold/50"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-smoke block mb-1">Monthly payment amount ({currencySymbol})</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={t.installment_plan.monthly_payment || 0}
                            onChange={(e) => handleInstallmentPlanChange(i, "monthly_payment", Number(e.target.value))}
                            className="w-40 bg-ink border border-line rounded-lg px-3 py-1.5 text-sm text-bone outline-none focus:border-gold/50"
                            placeholder="e.g. 1500"
                          />
                          <p className="text-[10px] text-smoke/60 mt-1">
                            Tip: this should be (remaining price after down payment) ÷ months
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!formValid || submitting || uploadingCover || uploadingGallery || uploadingArtisteImage}
          className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-bright disabled:opacity-50 text-ink font-bold py-4 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-glow"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating event...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Create event (draft)
            </>
          )}
        </button>
        <p className="text-xs text-smoke text-center mt-3">
          Your event is saved as a draft. An admin needs to verify and publish it before it goes live.
        </p>
      </div>
    </div>
  );
}