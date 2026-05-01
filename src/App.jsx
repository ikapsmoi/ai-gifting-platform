import { useEffect, useMemo, useState } from "react";

const WHATSAPP_URL = "https://wa.me/919871621921";

const popularHrSearches = [
  "Employee welcome kits for 100 new hires under INR 1500",
  "Diwali corporate gift sets for employees under INR 1000",
  "Eco-friendly corporate gifts with logo for 200 employees",
  "Branded tech gadgets: wireless chargers and power banks under INR 2000",
  "Office essentials: diary, pen, bottle, and mug sets for HR onboarding",
];

const proofPoints = [
  "AI catalog matching",
  "India-wide corporate gifting",
  "Real GiftsZone products",
];

const processSteps = [
  {
    title: "Tell AI the brief",
    body: "Share quantity, occasion, budget, and audience in one natural sentence.",
  },
  {
    title: "Get catalog picks",
    body: "The system shortlists real products from your uploaded GiftsZone catalog.",
  },
  {
    title: "Connect with Expert Now",
    body: "Every recommended product has a direct WhatsApp action for quick buying.",
  },
];

const deliveredBrandLogos = ["adidas", "KPMG", "Coca-Cola", "Deloitte", "Infosys"];

const giftInputPlaceholder = "e.g. Diwali gifts for 200 employees under INR 1500";

export default function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showcaseProducts, setShowcaseProducts] = useState([]);

  const canSubmit = input.trim().length > 7 && !isLoading;
  const giftOptions = (result?.giftOptions || []).slice(0, 20);
  const scrollerProducts = useMemo(
    () => [...showcaseProducts, ...showcaseProducts],
    [showcaseProducts],
  );

  const statLine = useMemo(() => {
    if (!result) {
      return ["Audience", "Budget", "Occasion"];
    }

    return [result.audience, result.budget, result.occasion].filter(Boolean);
  }, [result]);

  useEffect(() => {
    let isActive = true;

    async function loadShowcaseProducts() {
      try {
        const response = await fetch("/api/product-showcase");
        const payload = await parseJsonResponse(response);

        if (response.ok && isActive) {
          setShowcaseProducts(payload.products || []);
        }
      } catch {
        if (isActive) {
          setShowcaseProducts([]);
        }
      }
    }

    loadShowcaseProducts();

    return () => {
      isActive = false;
    };
  }, []);

  async function generateRecommendations(event) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/gift-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: input.trim() }),
      });

      const payload = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(payload.error || "Could not generate recommendations.");
      }

      setResult(payload?.data || null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf1] pb-28 text-[#171717] md:pb-0">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-[#fffaf1]/90 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <a className="flex items-center gap-3" href="#top">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffb000] text-sm font-black text-black sm:h-11 sm:w-11">
              GZ
            </span>
            <span className="text-base font-black tracking-tight sm:text-xl">
              CorporateGiftsZone
            </span>
          </a>

          <div className="hidden items-center gap-6 text-sm font-semibold text-black/70 md:flex">
            <a href="#ai-gifting">AI Finder</a>
            <a href="#catalog">Catalog</a>
            <a href="#how-it-works">How it works</a>
            <a href="#contact">Contact</a>
          </div>

          <a
            className="hidden rounded-full bg-black px-5 py-3 text-sm font-bold text-white shadow-[0_8px_0_#ffb000] transition hover:-translate-y-0.5 sm:inline-flex"
            href={WHATSAPP_URL}
            rel="noreferrer"
            target="_blank"
          >
            WhatsApp
          </a>
        </nav>
      </header>

      <section
        className="relative mx-auto grid w-full max-w-7xl items-center gap-7 overflow-hidden px-4 pb-7 pt-6 sm:px-6 sm:py-10 lg:min-h-[calc(100vh-76px)] lg:grid-cols-[1fr_0.9fr] lg:px-8"
        id="top"
      >
        <div className="relative z-10">
          <div className="mb-4 inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-black shadow-sm sm:mb-5">
            Transparent. Trusted. Your India Gifting Partner
          </div>

          <h1 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-normal text-black sm:text-6xl lg:text-7xl">
            Real products your teams will love.
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-black/65 sm:mt-6 sm:text-lg sm:leading-8">
            Search your GiftsZone catalog with one brief and get curated
            recommendations for employees, clients, events, and festive gifting.
          </p>

          <GiftSearchForm
            canSubmit={canSubmit}
            input={input}
            isLoading={isLoading}
            onChange={setInput}
            onSubmit={generateRecommendations}
            variant="hero"
          />

          <div className="mt-5">
            <p className="mb-3 text-xs font-black uppercase text-black/45">
              Popular HR searches in India
            </p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
              {popularHrSearches.map((brief) => (
                <button
                  className="shrink-0 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-black/70 shadow-sm transition hover:-translate-y-0.5 hover:border-black hover:text-black"
                  key={brief}
                  onClick={() => setInput(brief)}
                  type="button"
                >
                  {brief}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3">
            {proofPoints.map((item) => (
              <div
                className="rounded-2xl border border-black/10 bg-white p-3 text-sm font-black shadow-sm sm:p-4"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <HeroProductBoard products={showcaseProducts} />
      </section>

      <ProductScroller products={scrollerProducts} />

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {statLine.map((item) => (
            <div
              className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm"
              key={item}
            >
              <p className="text-xs font-black uppercase text-black/35">Focus</p>
              <p className="mt-2 text-base font-black text-black">{item}</p>
            </div>
          ))}
        </div>

        <section className="mt-6 rounded-[26px] border border-black/10 bg-white p-3 shadow-[0_18px_60px_rgba(0,0,0,0.08)] sm:rounded-[32px] sm:p-6">
          <div className="mb-6 flex flex-col gap-3 border-b border-black/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-[#ff5a1f]">
                AI recommendations
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-normal text-black sm:text-3xl">
                Product picks from your catalog
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">
                {result?.summary ||
                  "Generated results will appear here as clean product cards from your catalog."}
              </p>
            </div>
            {result ? (
              <span className="rounded-full bg-[#eaff5b] px-4 py-2 text-xs font-black text-black">
                {giftOptions.length} products
              </span>
            ) : null}
          </div>

          {isLoading ? <LoadingGrid /> : null}

          {!isLoading && giftOptions.length > 0 ? (
            <ProductGrid products={giftOptions} />
          ) : null}
        </section>
      </section>

      <section
        className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8"
        id="how-it-works"
      >
        {processSteps.map((step, index) => (
          <article
            className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm"
            key={step.title}
          >
            <p className="text-sm font-black text-[#ff5a1f]">
              0{index + 1}
            </p>
            <h3 className="mt-4 text-2xl font-black text-black">{step.title}</h3>
            <p className="mt-3 text-sm leading-6 text-black/60">{step.body}</p>
          </article>
        ))}
      </section>

      <Footer />

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/10 bg-[#fffaf1]/95 p-3 shadow-[0_-14px_40px_rgba(0,0,0,0.16)] backdrop-blur md:hidden">
        <GiftSearchForm
          canSubmit={canSubmit}
          input={input}
          isLoading={isLoading}
          onChange={setInput}
          onSubmit={generateRecommendations}
          variant="sticky"
        />
      </div>

      <a
        className="fixed bottom-28 right-4 z-40 flex min-h-12 items-center justify-center rounded-full bg-[#128c7e] px-4 text-sm font-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] md:bottom-6 md:h-14 md:w-14 md:px-0"
        href={WHATSAPP_URL}
        rel="noreferrer"
        target="_blank"
        title="Talk to expert"
      >
        <span className="md:hidden">Expert</span>
        <span className="hidden md:inline">WA</span>
      </a>
    </main>
  );
}

function GiftSearchForm({
  canSubmit,
  input,
  isLoading,
  onChange,
  onSubmit,
  variant,
}) {
  const isSticky = variant === "sticky";

  return (
    <form
      className={
        isSticky
          ? "rounded-3xl border border-black/10 bg-white p-2 shadow-sm"
          : "mt-7 rounded-[28px] border border-black/10 bg-white p-3 shadow-[0_18px_60px_rgba(0,0,0,0.12)] sm:mt-8"
      }
      id={isSticky ? "sticky-ai-gifting" : "ai-gifting"}
      onSubmit={onSubmit}
    >
      {!isSticky ? (
        <label
          className="mb-3 block px-3 text-sm font-black uppercase text-black/45"
          htmlFor="gift-brief"
        >
          AI gifting brief
        </label>
      ) : null}
      <div className="flex gap-2 sm:gap-3">
        <input
          id={isSticky ? "sticky-gift-brief" : "gift-brief"}
          type="text"
          placeholder={isSticky ? "Describe gifting need..." : giftInputPlaceholder}
          className="min-h-12 min-w-0 flex-1 rounded-2xl border border-black/10 bg-[#fffaf1] px-4 text-sm font-semibold text-black outline-none transition focus:border-black focus:ring-4 focus:ring-[#ffb000]/30 sm:min-h-14 sm:px-5 sm:text-base"
          value={input}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          className="min-h-12 shrink-0 rounded-2xl bg-[#ff5a1f] px-4 text-sm font-black text-white shadow-[0_4px_0_#111] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none sm:min-h-14 sm:px-7 sm:text-base"
          disabled={!canSubmit}
          type="submit"
        >
          {isLoading ? "..." : isSticky ? "Find" : "Find Gifts"}
        </button>
      </div>
    </form>
  );
}

function HeroProductBoard({ products }) {
  const featured = products.slice(0, 6);

  return (
    <div className="relative min-h-[260px] sm:min-h-[420px] lg:min-h-[520px]">
      <div className="absolute right-2 top-4 h-36 w-36 rounded-full bg-[#eaff5b] sm:h-72 sm:w-72" />
      <div className="absolute bottom-4 left-2 h-32 w-32 rounded-full bg-[#ffb000] sm:h-60 sm:w-60" />
      <div className="absolute inset-4 rounded-[32px] border border-black/10 bg-white/70 shadow-[0_24px_80px_rgba(0,0,0,0.16)] backdrop-blur sm:inset-8 sm:rounded-[40px]" />

      <div className="relative grid h-full grid-cols-3 gap-2 p-5 sm:gap-4 sm:p-8">
        {(featured.length ? featured : Array.from({ length: 6 })).map(
          (product, index) => (
            <article
              className={`overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg sm:rounded-[28px] ${
                index % 2 === 0 ? "translate-y-4 sm:translate-y-8" : ""
              }`}
              key={product?.id || index}
            >
              <img
                alt={product?.name || `Catalog gift ${index + 1}`}
                className="aspect-square w-full bg-[#f3f4f6] object-cover"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = buildFallbackImageUrl(index);
                }}
                src={product?.imageUrl || buildFallbackImageUrl(index)}
              />
            </article>
          ),
        )}
      </div>
    </div>
  );
}

function ProductScroller({ products }) {
  return (
    <section
      className="border-y border-black/10 bg-black py-6 text-white"
      id="catalog"
    >
      <div className="mx-auto mb-5 flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-black uppercase text-[#eaff5b]">
            Live catalog preview
          </p>
          <h2 className="mt-1 text-3xl font-black tracking-normal">
            Products from our corporate gifting catalog
          </h2>
        </div>
        <span className="hidden rounded-full bg-white px-4 py-2 text-xs font-black text-black sm:inline-flex">
          From uploaded data
        </span>
      </div>

      <div className="overflow-hidden">
        <div className="product-marquee flex w-max gap-4 px-4">
          {(products.length ? products : Array.from({ length: 12 })).map(
            (product, index) => (
              <article
                className="w-44 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-white text-black shadow-lg sm:w-56 sm:rounded-[28px]"
                key={`${product?.id || "placeholder"}-${index}`}
              >
                <img
                  alt={product?.name || `Catalog product ${index + 1}`}
                  className="aspect-[4/3] w-full bg-[#f3f4f6] object-cover"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = buildFallbackImageUrl(index);
                  }}
                  src={product?.imageUrl || buildFallbackImageUrl(index)}
                />
                <div className="p-3">
                  <p className="line-clamp-2 min-h-10 text-sm font-black leading-5">
                    {product?.name || "Catalog product"}
                  </p>
                  <p className="mt-2 text-xs font-bold uppercase text-black/45">
                    {product?.category || "GiftsZone"}
                  </p>
                </div>
              </article>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

function ProductGrid({ products }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((gift, index) => (
        <article
          className="grid grid-cols-[112px_1fr] overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:block sm:rounded-[28px]"
          key={`${gift.name}-${index}`}
        >
          <img
            alt={gift.name}
            className="h-full min-h-36 w-full bg-[#f3f4f6] object-cover sm:aspect-[4/3] sm:h-auto sm:min-h-0"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = buildFallbackImageUrl(index);
            }}
            src={gift.imageUrl || buildFallbackImageUrl(index)}
          />

          <div className="grid gap-3 p-3">
            <div className="min-h-0 sm:min-h-20">
              <p className="text-sm font-black leading-5 text-black">
                {gift.introLine1}
              </p>
              <p className="mt-1 text-sm leading-5 text-black/55">
                {gift.introLine2}
              </p>
            </div>

            <a
              className="flex min-h-10 items-center justify-center rounded-full bg-[#128c7e] px-4 text-sm font-black text-white transition hover:bg-[#0f766e]"
              href={gift.whatsappUrl || WHATSAPP_URL}
              rel="noreferrer"
              target="_blank"
            >
              WhatsApp
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer
      className="mt-10 border-t border-black/10 bg-[#171717] text-white"
      id="contact"
    >
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 sm:py-10 md:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <div>
          <p className="text-sm font-black uppercase text-[#ffb000]">
            Vision: GiftsZone
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-normal sm:text-4xl">
            Your Branding Partner
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
            Leading provider of promotional gifts and corporate branding
            solutions across India. Quality products, competitive prices, and
            exceptional service.
          </p>

          <div className="mt-8">
            <p className="text-xs font-black uppercase tracking-normal text-white/40">
              Delivered to brands
            </p>
            <div className="mt-3 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
              {deliveredBrandLogos.map((brand) => (
                <div
                  className="flex min-h-14 items-center justify-center rounded-2xl border border-white/10 bg-white px-3 text-center text-base font-black text-black shadow-sm sm:min-h-16 sm:px-4 sm:text-lg"
                  key={brand}
                >
                  {brand}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-sm font-black uppercase text-[#eaff5b]">
            Contact Info
          </p>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-white/75">
            <p>
              SG Alpha Tower, 6th Floor
              <br />
              Vasundhara, Ghaziabad
              <br />
              India
            </p>
            <a className="font-bold text-white" href="tel:+919871621921">
              +91-9871621921
            </a>
            <a className="font-bold text-white" href="tel:+919990093697">
              +91-9990093697
            </a>
            <a
              className="font-bold text-white"
              href="mailto:vishal.giftszone@gmail.com"
            >
              vishal.giftszone@gmail.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

async function parseJsonResponse(response) {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      "The API returned an empty response. Make sure the API server is running with `npm run api`.",
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `The API returned a non-JSON response (${response.status}). Check the API server terminal for the full error.`,
    );
  }
}

function buildFallbackImageUrl(index) {
  const label = `Gift ${String(index + 1).padStart(2, "0")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="#f3f4f6"/><rect x="48" y="48" width="544" height="384" rx="18" fill="#ffffff" stroke="#d1d5db"/><text x="320" y="246" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#111827">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 20 }, (_, index) => (
        <div
          className="h-72 animate-pulse rounded-[28px] border border-black/10 bg-[#f3f4f6]"
          key={index}
        />
      ))}
    </div>
  );
}
