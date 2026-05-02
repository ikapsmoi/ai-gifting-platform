import { useMemo, useState, useEffect } from "react";
import productsData from "./data/transformed_products.json";

const WHATSAPP_URL = "https://wa.me/919871621921";

// NEW: Replaced long sentences with short, punchy leader-search combinations
const popularHrSearches = [
  "Welcome kits",
  "Eco friendly",
  "Premium bags",
  "Bluetooth speakers",
  "Drinkware sets",
  "Tech gadgets"
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

/* ------------------ SMART ENGINE ------------------ */

function getScore(product, query, selectedWords) {
  let score = 0;
  const q = query.toLowerCase();
  const searchWords = (product.leader_search_words || []).map(w => w.toLowerCase());

  // 1. STRICT KEYWORD FILTERING
  if (selectedWords.length > 0) {
    const hasAll = selectedWords.every(word => searchWords.includes(word));
    const hasSome = selectedWords.some(word => searchWords.includes(word));
    
    if (hasAll) {
      score += 50; 
    } else if (hasSome) {
      score += 10; 
    } else {
      return 0; // STRICT DROP: Hide if tags selected but none match
    }
  }

  // 2. Name Match
  if (q && product.name && product.name.toLowerCase().includes(q)) {
    score += 20;
  }

  // 3. Keyword Match via Text Input
  if (q && searchWords.length > 0) {
    searchWords.forEach((word) => {
      if (word.includes(q) || q.includes(word)) score += 10;
    });
  }

  // 4. Baseline query fallback
  if (q && score === 0) {
    const nameWords = product.name ? product.name.toLowerCase().split(" ") : [];
    if (nameWords.some(nw => q.includes(nw))) score += 5;
  }

  if (!q && selectedWords.length > 0 && score > 0) {
    return score;
  }

  return score;
}

function getRecommendations(input, productsList, selectedWords) {
  const query = input.trim().toLowerCase();
  
  if (!query && selectedWords.length === 0) return [];

  return productsList
    .map((p) => ({
      ...p,
      score: getScore(p, query, selectedWords),
    }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);
}

/* ------------------ MAIN APP ------------------ */

export default function App() {
  const [input, setInput] = useState("");
  const [selectedWords, setSelectedWords] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Auto-suggest State
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  const { allProducts, uniqueWords } = useMemo(() => {
    const rawList = Array.isArray(productsData) ? productsData : (productsData?.products || []);
    const wordsSet = new Set();
    
    const processed = rawList.map((p, index) => {
      if (Array.isArray(p.leader_search_words)) {
        p.leader_search_words.forEach(w => wordsSet.add(w.toLowerCase()));
      }
      return { ...p, uniqueId: p.id || `prod-${index}` };
    });

    return { 
      allProducts: processed, 
      uniqueWords: Array.from(wordsSet).sort() 
    };
  }, []);

  const showcaseProducts = useMemo(() => allProducts.slice(0, 6), [allProducts]);
  const scrollerProducts = useMemo(() => [...allProducts.slice(0, 12), ...allProducts.slice(0, 12)], [allProducts]);
  const canSubmit = (input.trim().length > 1 || selectedWords.length > 0) && !isLoading;
  const giftOptions = (result?.giftOptions || []).slice(0, 20);

  // Centralized search executor
  const executeSearch = (currentInput, currentWords) => {
    if (currentInput.trim().length < 2 && currentWords.length === 0) {
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const filtered = getRecommendations(currentInput, allProducts, currentWords);

      if (filtered.length === 0) {
        setError("No matching products found. Try adjusting your keywords.");
        setResult(null);
      } else {
        const conditions = [];
        if (currentWords.length > 0) conditions.push(`the tags [${currentWords.join(" + ")}]`);
        if (currentInput.trim()) conditions.push(`"${currentInput.trim()}"`);
        
        const summaryText = `We analyzed the GiftsZone catalog and curated ${filtered.length} perfect matches based on ${conditions.join(" and ")}.`;

        setResult({
          summary: summaryText,
          giftOptions: filtered.map((p, index) => ({
            ...p,
            badge: index === 0 ? "Top Pick" : "Recommended",
            whatsappUrl: `${WHATSAPP_URL}?text=${encodeURIComponent(`Hi, I'm interested in ${p.name}`)}`,
          })),
        });
      }
    } catch (err) {
      setError("An error occurred during search.");
    } finally {
      setIsLoading(false);
    }
  };

  // Live Input Handler (Auto-suggest + Live Filter)
  const handleInputChange = (val) => {
    setInput(val);
    
    if (val.trim().length > 1) {
      const q = val.toLowerCase();
      const matches = allProducts
        .filter(p => p.name.toLowerCase().includes(q))
        .map(p => p.name);
      
      setSuggestions(Array.from(new Set(matches)).slice(0, 5));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }

    if (typingTimeout) clearTimeout(typingTimeout);
    
    setTypingTimeout(setTimeout(() => {
      if (val.trim().length > 1 || selectedWords.length > 0) {
        executeSearch(val, selectedWords);
      } else if (val.trim().length === 0 && selectedWords.length === 0) {
        setResult(null);
      }
    }, 500));
  };

  const handleSuggestionClick = (suggestionText) => {
    setInput(suggestionText);
    setShowSuggestions(false);
    if (typingTimeout) clearTimeout(typingTimeout);
    executeSearch(suggestionText, selectedWords);
  };

  const toggleWord = (word) => {
    const newWords = selectedWords.includes(word) 
      ? selectedWords.filter(w => w !== word) 
      : [...selectedWords, word];
    
    setSelectedWords(newWords);
    executeSearch(input, newWords); 
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (typingTimeout) clearTimeout(typingTimeout);
    setShowSuggestions(false);
    if (canSubmit) executeSearch(input, selectedWords);
  };

  return (
    <main className="min-h-screen bg-[#fffaf1] pb-28 text-[#171717] md:pb-0 font-sans">
      
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#fffaf1]/90 backdrop-blur">
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
            <a href="#premium">Premium</a>
            <a href="#catalog">Catalog</a>
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

      <section className="relative mx-auto grid w-full max-w-7xl items-center gap-7 overflow-hidden px-4 pb-7 pt-6 sm:px-6 sm:py-10 lg:min-h-[calc(100vh-76px)] lg:grid-cols-[1fr_0.9fr] lg:px-8" id="top">
        <div className="relative z-10">
          <div className="mb-4 inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-black shadow-sm sm:mb-5">
            Transparent. Trusted. Your India Gifting Partner
          </div>

          <h1 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-normal text-black sm:text-6xl lg:text-7xl">
            Real products your teams will love.
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-black/65 sm:mt-6 sm:text-lg sm:leading-8 mb-6">
            Search your GiftsZone catalog with one brief and get curated recommendations for employees, clients, events, and festive gifting.
          </p>

          <div className="mb-4">
             <p className="mb-2 text-xs font-black uppercase text-black/45">Quick Filters (Auto-Applies)</p>
             <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 pb-2">
               {uniqueWords.map(word => (
                  <button
                    key={word}
                    onClick={() => toggleWord(word)}
                    type="button"
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      selectedWords.includes(word) 
                      ? "bg-black text-white border-black" 
                      : "bg-white text-black/60 border-black/10 hover:border-black/40"
                    }`}
                  >
                    {word}
                  </button>
               ))}
             </div>
          </div>

          <GiftSearchForm
            canSubmit={canSubmit}
            input={input}
            isLoading={isLoading}
            onChange={handleInputChange}
            onSubmit={handleFormSubmit}
            variant="hero"
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            onSuggestionClick={handleSuggestionClick}
            onFocus={() => input.trim().length > 1 && setShowSuggestions(true)}
            onBlur={() => setShowSuggestions(false)}
          />

          <div className="mt-5">
            <p className="mb-3 text-xs font-black uppercase text-black/45">
              Popular searches
            </p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
              {popularHrSearches.map((brief) => (
                <button
                  className="shrink-0 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-black/70 shadow-sm transition hover:-translate-y-0.5 hover:border-black hover:text-black flex items-center gap-1.5"
                  key={brief}
                  onClick={() => {
                    setInput(brief);
                    executeSearch(brief, selectedWords);
                  }}
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#ff5a1f]"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  {brief}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
        </div>

        <HeroProductBoard products={showcaseProducts} />
      </section>

      {!result && (
        <section id="premium" className="w-full bg-[#f8f9fa] border-y border-black/5 py-12">
          <div className="px-4 max-w-7xl mx-auto flex items-end justify-between mb-8 sm:px-6 lg:px-8">
            <div>
              <h2 className="text-3xl font-black tracking-normal">Premium Collection</h2>
              <p className="text-base text-black/60 mt-2">Exclusive high-end corporate gifts.</p>
            </div>
          </div>

          <div className="flex overflow-x-auto gap-6 px-4 pb-8 pt-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] sm:px-6 lg:px-8">
            {allProducts.slice(0, 8).map((item) => (
              <div key={item.uniqueId} className="snap-center shrink-0 w-[280px] bg-white rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 hover:-translate-y-1 transition-all duration-300 group">
                <div className="relative aspect-square bg-gradient-to-tr from-[#f3f4f6] to-white rounded-2xl overflow-hidden mb-5 p-4">
                  <div className="absolute top-3 left-3 bg-[#ffb000] text-black text-[10px] font-black px-3 py-1 rounded-full uppercase z-10 shadow-sm">Premium</div>
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.target.src = buildFallbackImageUrl(item.id); }} />
                </div>
                <h3 className="font-bold text-base leading-snug line-clamp-2 mb-2 text-black">{item.name}</h3>
                <a href={`${WHATSAPP_URL}?text=${encodeURIComponent(`Hi, I'm interested in the premium ${item.name}`)}`} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-center w-full bg-[#171717] text-white text-sm py-3 rounded-xl font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Inquire Now
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {result && (
        <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8" id="ai-results">
          <section className="rounded-[26px] border border-black/10 bg-white p-4 shadow-[0_18px_60px_rgba(0,0,0,0.08)] sm:rounded-[32px] sm:p-8">
            <div className="mb-6 flex flex-col gap-3 border-b border-black/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase text-[#ff5a1f]">AI Recommendations</p>
                <h2 className="mt-2 text-2xl font-black tracking-normal text-black sm:text-3xl">Product picks from your catalog</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-black/60">{result.summary}</p>
              </div>
              <span className="rounded-full bg-[#eaff5b] px-4 py-2 text-xs font-black text-black self-start sm:self-auto shrink-0">
                {giftOptions.length} products
              </span>
            </div>
            {isLoading ? <LoadingGrid /> : <ProductGrid products={giftOptions} />}
          </section>
        </section>
      )}

      {!result && <ProductScroller products={scrollerProducts} />}

      <Footer />
    </main>
  );
}

/* ------------------ UI COMPONENTS ------------------ */

function GiftSearchForm({ canSubmit, input, isLoading, onChange, onSubmit, variant, suggestions, showSuggestions, onSuggestionClick, onFocus, onBlur }) {
  const isSticky = variant === "sticky";

  return (
    <form
      className={isSticky ? "rounded-3xl border border-black/10 bg-white p-2 shadow-sm flex items-center relative" : "mt-4 rounded-[28px] border border-black/10 bg-white p-3 shadow-[0_18px_60px_rgba(0,0,0,0.12)] relative"}
      id={isSticky ? "sticky-ai-gifting" : "ai-gifting"}
      onSubmit={onSubmit}
    >
      {!isSticky && <label className="mb-3 block px-3 text-sm font-black uppercase text-black/45" htmlFor="gift-brief">AI gifting brief</label>}
      <div className={`flex gap-2 ${!isSticky ? "sm:gap-3" : ""} relative`}>
        <div className="relative flex-1">
          <input
            id={isSticky ? "sticky-gift-brief" : "gift-brief"}
            type="text"
            placeholder={isSticky ? "Describe gifting need..." : giftInputPlaceholder}
            className="w-full min-h-12 min-w-0 flex-1 rounded-2xl border border-black/10 bg-[#fffaf1] px-4 text-sm font-semibold text-black outline-none transition focus:border-black focus:ring-4 focus:ring-[#ffb000]/30 sm:min-h-14 sm:px-5 sm:text-base"
            value={input}
            onChange={(event) => onChange(event.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            autoComplete="off"
          />
          
          {/* AUTO-SUGGEST DROPDOWN */}
          {showSuggestions && suggestions?.length > 0 && (
            <ul className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-black/10 bg-white shadow-xl overflow-hidden py-2">
              {suggestions.map((sug, index) => (
                <li 
                  key={`${sug}-${index}`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevents input blur before click registers
                    onSuggestionClick(sug);
                  }}
                  className="px-5 py-3 text-sm font-semibold text-black cursor-pointer hover:bg-[#fffaf1] hover:text-[#ff5a1f] transition-colors border-b border-black/5 last:border-none truncate"
                >
                  {sug}
                </li>
              ))}
            </ul>
          )}
        </div>

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

// ... [HeroProductBoard, ProductScroller, ProductGrid, Footer, buildFallbackImageUrl, LoadingGrid remain identical] ...

function HeroProductBoard({ products }) {
  const featured = products.length ? products : Array.from({ length: 6 });
  return (
    <div className="relative min-h-[260px] sm:min-h-[420px] lg:min-h-[520px]">
      <div className="absolute right-2 top-4 h-36 w-36 rounded-full bg-[#eaff5b] sm:h-72 sm:w-72" />
      <div className="absolute bottom-4 left-2 h-32 w-32 rounded-full bg-[#ffb000] sm:h-60 sm:w-60" />
      <div className="absolute inset-4 rounded-[32px] border border-black/10 bg-white/70 shadow-[0_24px_80px_rgba(0,0,0,0.16)] backdrop-blur sm:inset-8 sm:rounded-[40px]" />
      <div className="relative grid h-full grid-cols-3 gap-2 p-5 sm:gap-4 sm:p-8">
        {featured.map((product, index) => (
          <article className={`overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg flex items-center justify-center p-2 bg-[#f3f4f6] ${index % 2 === 0 ? "translate-y-4 sm:translate-y-8" : ""}`} key={product?.uniqueId || index}>
            <img alt={product?.name || `Catalog gift ${index + 1}`} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.src = buildFallbackImageUrl(index); }} src={product?.imageUrl || buildFallbackImageUrl(index)} />
          </article>
        ))}
      </div>
    </div>
  );
}

function ProductScroller({ products }) {
  return (
    <section className="border-y border-black/10 bg-black py-10 text-white" id="catalog">
      <div className="mx-auto mb-6 flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-black uppercase text-[#eaff5b]">Live catalog preview</p>
          <h2 className="mt-1 text-3xl font-black tracking-normal">Products from our corporate gifting catalog</h2>
        </div>
      </div>
      <div className="overflow-hidden">
        <div className="flex w-max gap-4 px-4 animate-marquee hover:pause">
          {products.map((product, index) => (
            <article className="w-48 shrink-0 overflow-hidden rounded-[24px] border border-white/10 bg-[#1a1a1a] text-white shadow-lg sm:w-64" key={`${product?.uniqueId || "placeholder"}-${index}`}>
              <img alt={product?.name || "Catalog product"} className="aspect-[4/3] w-full bg-white object-contain p-4" onError={(e) => { e.currentTarget.src = buildFallbackImageUrl(index); }} src={product?.imageUrl || buildFallbackImageUrl(index)} />
              <div className="p-4">
                <p className="line-clamp-2 min-h-10 text-sm font-bold leading-5">{product?.name || "Catalog product"}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductGrid({ products }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((gift, index) => (
        <article className="flex flex-col overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl" key={gift.uniqueId}>
          <div className="relative aspect-square w-full bg-[#f3f4f6] p-4 flex items-center justify-center">
            <span className="absolute top-3 left-3 bg-black text-white text-[10px] font-black px-2 py-1 rounded-full uppercase z-10">{gift.badge || "Pick"}</span>
            <img alt={gift.name} className="max-h-full max-w-full object-contain" loading="lazy" onError={(e) => { e.currentTarget.src = buildFallbackImageUrl(index); }} src={gift.imageUrl || buildFallbackImageUrl(index)} />
          </div>
          <div className="flex flex-col flex-1 gap-3 p-4">
            <div className="flex-1">
              <p className="text-sm font-black leading-snug text-black line-clamp-2">{gift.name}</p>
            </div>
            <a className="flex min-h-12 items-center justify-center rounded-xl bg-[#128c7e] px-4 text-sm font-black text-white transition hover:bg-[#0f766e]" href={gift.whatsappUrl || WHATSAPP_URL} rel="noreferrer" target="_blank">WhatsApp Inquiry</a>
          </div>
        </article>
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-10 border-t border-black/10 bg-[#171717] text-white pb-20 md:pb-0" id="contact">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <div>
          <p className="text-sm font-black uppercase text-[#ffb000]">Vision: GiftsZone</p>
          <h2 className="mt-3 text-3xl font-black tracking-normal sm:text-4xl">Your Branding Partner</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
            Leading provider of promotional gifts and corporate branding solutions across India. Quality products, competitive prices, and exceptional service.
          </p>

          <div className="mt-10">
            <p className="text-xs font-black uppercase tracking-normal text-white/40">Delivered to brands</p>
            <div className="mt-3 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
              {deliveredBrandLogos.map((brand) => (
                <div className="flex min-h-14 items-center justify-center rounded-2xl border border-white/10 bg-white px-3 text-center text-sm font-black text-black shadow-sm" key={brand}>
                  {brand}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 sm:p-8">
          <p className="text-sm font-black uppercase text-[#eaff5b]">Contact Info</p>
          <div className="mt-6 grid gap-4 text-sm leading-6 text-white/75">
            <p>
              SG Alpha Tower, 6th Floor<br />
              Vasundhara, Ghaziabad<br />
              India
            </p>
            <a className="font-bold text-white hover:text-[#ffb000] transition-colors" href="tel:+919871621921">+91-9871621921</a>
            <a className="font-bold text-white hover:text-[#ffb000] transition-colors" href="tel:+919990093697">+91-9990093697</a>
            <a className="font-bold text-white hover:text-[#ffb000] transition-colors" href="mailto:vishal.giftszone@gmail.com">vishal.giftszone@gmail.com</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function buildFallbackImageUrl(index) {
  const label = `Gift ${String(index + 1).padStart(2, "0")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="#f3f4f6"/><rect x="48" y="48" width="544" height="384" rx="18" fill="#ffffff" stroke="#d1d5db"/><text x="320" y="246" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#111827">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div className="h-80 animate-pulse rounded-[24px] border border-black/10 bg-[#f3f4f6]" key={index} />
      ))}
    </div>
  );
}