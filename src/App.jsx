import { useMemo, useState, useEffect } from "react";
import productsData from "./data/transformed_products.json";

// --- UPGRADE: WhatsApp Dual-Number Lead Splitter ---
const SALES_NUMBERS = [
  "919871621921", // Number 1 (Vishal)
  "919990093697"  // <-- REPLACE THIS WITH YOUR SECOND NUMBER
];

function getWhatsAppUrl(message = "") {
  const targetNumber = SALES_NUMBERS[Math.floor(Math.random() * SALES_NUMBERS.length)];
  return `https://wa.me/${targetNumber}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
// ---------------------------------------------------

const popularHrSearches = [
  "Welcome kits",
  "Eco friendly",
  "Premium bags",
  "Bluetooth speakers",
  "Drinkware sets",
  "Tech gadgets",
  "Diwali hampers",
  "Onboarding boxes",
  "Award trophies"
];

const animatedHeroWords = ["teams", "clients", "partners", "employees"];

const processSteps = [
  {
    title: "Tell AI the brief",
    body: "Share quantity, occasion, budget, and audience in one natural sentence.",
  },
  {
    title: "Get catalog picks",
    body: "The system shortlists real products from your uploaded CorporateGiftsZone catalog.",
  },
  {
    title: "Connect with Expert",
    body: "Every recommended product has a direct WhatsApp action for quick buying.",
  },
];

const deliveredBrandLogos = [
  "Microsoft", "Google", "TCS", "Infosys", "Wipro",
  "HDFC Bank", "SBI", "KPMG", "Deloitte", "ICICI",
  "Sun Pharma", "Johnson & Johnson", "Pfizer", "Apollo Hospitals", "Cipla",
  "Zara", "H&M", "Nike", "Levi's", "Puma",
  "Tata Steel", "Larsen & Toubro", "3M", "Siemens", "Mahindra"
];

const trustMetrics = [
  { text: "Wholesale Pricing", icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg> },
  { text: "Prompt Delivery", icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
  { text: "Full Customization", icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> },
  { text: "Quality Assured", icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> }
];

const giftInputPlaceholder = "e.g. Diwali gifts for 200 employees...";

/* ------------------ SMART ENGINE ------------------ */

function getScore(product, query, selectedWords) {
  let score = 0;
  const q = query.toLowerCase();
  const searchWords = (product.leader_search_words || []).map(w => w.toLowerCase());

  if (selectedWords.length > 0) {
    const hasAll = selectedWords.every(word => searchWords.includes(word));
    const hasSome = selectedWords.some(word => searchWords.includes(word));
    if (hasAll) score += 50; 
    else if (hasSome) score += 10; 
    else return 0; 
  }

  if (q && product.name && product.name.toLowerCase().includes(q)) score += 20;

  if (q && searchWords.length > 0) {
    searchWords.forEach((word) => {
      if (word.includes(q) || q.includes(word)) score += 10;
    });
  }

  if (q && score === 0) {
    const nameWords = product.name ? product.name.toLowerCase().split(" ") : [];
    if (nameWords.some(nw => q.includes(nw))) score += 5;
  }

  if (!q && selectedWords.length > 0 && score > 0) return score;

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

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  
  const [heroWordIndex, setHeroWordIndex] = useState(0);

  // Exit Intent State
  const [showExitModal, setShowExitModal] = useState(false);
  const [hasExited, setHasExited] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroWordIndex((prev) => (prev + 1) % animatedHeroWords.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Exit Intent Listener
  useEffect(() => {
    const handleMouseLeave = (e) => {
      if (e.clientY <= 0 && !hasExited) {
        setShowExitModal(true);
        setHasExited(true);
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [hasExited]);

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

  const showcaseProducts = useMemo(() => allProducts.slice(0, 8), [allProducts]);
  const canSubmit = (input.trim().length > 1 || selectedWords.length > 0) && !isLoading;
  const giftOptions = (result?.giftOptions || []).slice(0, 20);

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
        
        const summaryText = `We analyzed the catalog and curated ${filtered.length} perfect matches based on ${conditions.join(" and ")}.`;

        setResult({
          summary: summaryText,
          giftOptions: filtered.map((p, index) => ({
            ...p,
            badge: index === 0 ? "Top Pick" : "Recommended",
            whatsappUrl: getWhatsAppUrl(`Hi, I'm interested in ${p.name}`),
          })),
        });

        setTimeout(() => {
          document.getElementById("ai-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    } catch (err) {
      setError("An error occurred during search.");
    } finally {
      setIsLoading(false);
    }
  };

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

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToBottom = () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

  return (
    <main className="overflow-x-hidden min-h-screen bg-slate-50 pb-32 md:pb-0 text-slate-900 font-sans w-full selection:bg-orange-200">
      
      <style>{`
        .animate-fade-scroll {
          animation: fadeScroll 3s ease-in-out infinite;
        }
        @keyframes fadeScroll {
          0%, 10% { opacity: 0; transform: translateY(15px); }
          20%, 80% { opacity: 1; transform: translateY(0); }
          90%, 100% { opacity: 0; transform: translateY(-15px); }
        }
        .animate-marquee-slow {
          animation: marquee 40s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        @keyframes sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-sweep {
          animation: sweep 2s ease-in-out infinite;
        }
        @keyframes scrollY {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes scrollYReverse {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
        .animate-scroll-y { 
          animation: scrollY 25s linear infinite; 
        }
        .animate-scroll-y-reverse { 
          animation: scrollYReverse 30s linear infinite; 
        }
        .hover-pause:hover {
          animation-play-state: paused;
        }
        /* New animations for upgrades */
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a className="flex items-center gap-2 group" href="#top">
            <BrandLogo className="w-10 h-10 sm:w-12 sm:h-12 text-orange-500 drop-shadow-sm group-active:scale-95 transition-transform" />
            <span className="text-base sm:text-xl font-black tracking-tight text-slate-900">
              CorporateGifts<span className="text-orange-500">Zone.</span>
            </span>
          </a>
          <div className="hidden items-center gap-8 text-sm font-bold text-slate-500 md:flex">
            <a href="#premium" className="hover:text-slate-900 transition-colors">Premium</a>
            <a href="#kit-builder" className="hover:text-slate-900 transition-colors">Kit Builder</a>
            <a href="#catalog" className="hover:text-slate-900 transition-colors">Catalog</a>
          </div>
          <a
            className="flex items-center justify-center h-10 sm:h-12 px-5 sm:px-6 rounded-full bg-slate-900 text-xs sm:text-sm font-bold text-white shadow-md active:scale-95 transition-all hover:bg-slate-800"
            href={getWhatsAppUrl()}
            rel="noreferrer"
            target="_blank"
          >
            Contact
          </a>
        </nav>
      </header>

      {/* HERO SECTION */}
      <section className="relative mx-auto grid w-full max-w-7xl items-center gap-8 overflow-hidden px-4 pb-12 pt-8 sm:px-6 sm:py-16 grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] lg:px-8" id="top">
        <div className="relative z-10 w-full flex flex-col items-start min-w-0">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            AI-Powered Corporate Gifting
          </div>

          <h1 className="w-full text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.1] tracking-tight text-slate-900 min-h-[90px] sm:min-h-[140px]">
            Real products your <br className="hidden sm:block"/>
            <span className="text-orange-500 inline-block animate-fade-scroll">
              {animatedHeroWords[heroWordIndex]}
            </span> will love.
          </h1>

          <div className="mt-4 mb-8 w-full max-w-2xl flex flex-col gap-4 min-w-0">
            <p className="text-base sm:text-lg leading-relaxed text-slate-600">
              Tell our AI what you need. We instantly curate the perfect merchandise, backed by our enterprise guarantee.
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {trustMetrics.map((metric, i) => {
                const isActive = heroWordIndex === i;
                return (
                  <div 
                    key={i} 
                    className={`relative overflow-hidden flex items-center gap-2 rounded-full px-3 py-2 sm:px-4 sm:py-2 text-[11px] sm:text-sm font-bold shadow-sm transition-all duration-500 cursor-default ${
                      isActive 
                        ? "bg-slate-900 text-white ring-1 ring-slate-900 scale-105 shadow-md" 
                        : "bg-white text-slate-700 ring-1 ring-slate-900/5 hover:ring-slate-900/10"
                    }`}
                  >
                    {isActive && <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-sweep pointer-events-none z-10" />}
                    <span className={`transition-colors duration-500 ${isActive ? "text-orange-400" : "text-orange-500"}`}>
                      {metric.icon}
                    </span>
                    {metric.text}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-6 w-full">
             <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1 pb-1 scrollbar-hide">
               {uniqueWords.slice(0, 15).map(word => (
                  <button
                    key={word}
                    onClick={() => toggleWord(word)}
                    type="button"
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all active:scale-95 ${
                      selectedWords.includes(word) 
                      ? "bg-slate-900 text-white shadow-md ring-2 ring-slate-900 ring-offset-2 ring-offset-slate-50" 
                      : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-900/5 hover:ring-slate-900/20"
                    }`}
                  >
                    {word}
                  </button>
               ))}
             </div>
          </div>

          <div className="w-full max-w-2xl min-w-0">
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
          </div>

          <div className="mt-8 w-full min-w-0">
            <p className="mb-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
              Popular Searches
            </p>
            {/* UPGRADE FIX: 3 Column Grid for popular searches */}
            <div className="grid grid-cols-3 gap-2 pb-4">
              {popularHrSearches.map((brief) => (
                <button
                  className="shrink-0 rounded-lg bg-white px-2 py-2 text-[10px] sm:text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-900/5 transition-all active:scale-95 hover:shadow-md flex items-center justify-center gap-1.5 text-center leading-tight"
                  key={brief}
                  onClick={() => {
                    setInput(brief);
                    executeSearch(brief, selectedWords);
                  }}
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500 shrink-0"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <span className="truncate">{brief}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-6 w-full rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600 border border-red-100 flex items-center gap-3">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {error}
            </div>
          )}
        </div>

        <HeroProductBoard products={showcaseProducts} />
      </section>

      {!result && <BulkEstimator />}

      {/* UPGRADE 3: INTERACTIVE KIT BUILDER */}
      {!result && <KitBuilder />}

      {!result && <PremiumCollection products={allProducts} />}

      {/* RESULTS GRID */}
      {result && (
        <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 scroll-mt-24" id="ai-results">
          <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-3">
                 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                 AI Results
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900">Your curated picks</h2>
              <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-600">{result.summary}</p>
            </div>
            <span className="inline-flex items-center justify-center h-10 px-4 rounded-full bg-slate-100 text-sm font-bold text-slate-700 shrink-0">
              {giftOptions.length} Items Found
            </span>
          </div>
          {isLoading ? <LoadingGrid /> : <ProductGrid products={giftOptions} />}
        </section>
      )}

      {!result && <LiveCatalog products={allProducts} />}

      <section className="mx-auto grid w-full max-w-7xl gap-4 sm:gap-6 px-4 py-16 sm:py-24 sm:px-6 md:grid-cols-3 lg:px-8" id="how-it-works">
        {processSteps.map((step, index) => (
          <article className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-900/5 flex flex-col items-start" key={step.title}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-black text-lg mb-6">
              {index + 1}
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">{step.title}</h3>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-500">{step.body}</p>
          </article>
        ))}
      </section>

      <Footer />

      {/* UPGRADE 1: LIVE FOMO NOTIFICATIONS */}
      <FomoNotification />

      {/* UPGRADE 2: EXIT INTENT MODAL */}
      {showExitModal && <ExitIntentModal onClose={() => setShowExitModal(false)} />}

      {/* FLOATING MOBILE SEARCH ISLAND (Adjusted for VIP Bar) */}
      <div className="fixed bottom-20 left-4 right-4 z-40 md:hidden transition-transform duration-300">
        <div className="bg-white/90 backdrop-blur-xl p-2 rounded-[2rem] shadow-2xl ring-1 ring-slate-900/10">
          <GiftSearchForm
            canSubmit={canSubmit}
            input={input}
            isLoading={isLoading}
            onChange={handleInputChange}
            onSubmit={handleFormSubmit}
            variant="sticky"
          />
        </div>
      </div>

      {/* FLOATING NAVIGATION PANEL */}
      <div className="fixed bottom-[140px] right-4 md:bottom-8 md:right-8 z-40 flex flex-col gap-2">
        <button onClick={scrollToTop} className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg ring-1 ring-slate-900/10 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-90" title="Scroll to Top">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
        </button>
        <button onClick={scrollToBottom} className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg ring-1 ring-slate-900/10 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-90" title="Scroll to Bottom">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <a href={getWhatsAppUrl()} rel="noreferrer" target="_blank" className="hidden md:flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 hover:bg-[#20bd5a] transition-all active:scale-90 mt-1" title="Talk to expert">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
        </a>
      </div>

      {/* UPGRADE 5: STICKY VIP BAR FOR MOBILE */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-3 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-slate-700">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Volume Orders (50+)</span>
          <span className="text-sm font-bold text-white">Get a Free Curation Call</span>
        </div>
        <a href={getWhatsAppUrl("Hi, I need corporate gifts for 50+ people. Can I get a free curation call?")} target="_blank" rel="noreferrer" className="bg-orange-500 text-white px-4 py-2 rounded-full text-xs font-black shadow-md active:scale-95 transition-transform flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
          Let's Talk
        </a>
      </div>
    </main>
  );
}

/* ------------------ UI COMPONENTS ------------------ */

// --- UPGRADE 1: LIVE FOMO NOTIFICATIONS ---
function FomoNotification() {
  const [notification, setNotification] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const events = useMemo(() => [
    "An HR Manager in Delhi requested a quote for 250 Welcome Kits.",
    "A Startup in Bangalore shortlisted Premium Tech Gadgets.",
    "An Admin in Mumbai claimed the 15% Volume Discount.",
    "A Tech Company in Pune ordered 500 Corporate Hoodies.",
    "A Marketing Head in Gurgaon downloaded the 2026 Catalog."
  ], []);

  useEffect(() => {
    const triggerFomo = () => {
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      setNotification(randomEvent);
      setIsVisible(true);
      
      setTimeout(() => {
        setIsVisible(false);
      }, 5000); // Hide after 5 seconds
    };

    // Initial delay then trigger every 20 seconds
    const initialDelay = setTimeout(triggerFomo, 3000);
    const interval = setInterval(triggerFomo, 20000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [events]);

  if (!notification) return null;

  return (
    <div className={`fixed bottom-28 left-4 md:bottom-8 md:left-8 z-50 max-w-xs bg-white p-3 sm:p-4 rounded-2xl shadow-2xl border border-slate-100 flex items-start gap-3 transition-all duration-500 ease-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      </div>
      <div>
        <p className="text-xs sm:text-sm font-bold text-slate-700 leading-tight">{notification}</p>
        <p className="text-[10px] text-slate-400 font-semibold mt-1">Just now • Verified Inquiry</p>
      </div>
    </div>
  );
}

// --- UPGRADE 2: EXIT INTENT MODAL ---
function ExitIntentModal({ onClose }) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-slide-up">
      <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 max-w-lg w-full relative shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-yellow-500"></div>
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        {!submitted ? (
          <>
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Leaving so soon?</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Don't leave without our exclusive <strong>2026 Corporate Gifts Catalog</strong>. Drop your email and we'll send the PDF instantly.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); setTimeout(onClose, 2500); }} className="space-y-4">
              <input type="email" placeholder="Your Work Email" required className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-5 font-semibold outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" />
              <button type="submit" className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black transition-all active:scale-95 shadow-md">
                Download Free Catalog
              </button>
            </form>
            <p className="text-center text-[10px] text-slate-400 mt-4 font-semibold uppercase tracking-wider">No spam. Only premium gifts.</p>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Check your inbox!</h2>
            <p className="text-slate-500">The 2026 PDF catalog is on its way to you.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- UPGRADE 3: KIT BUILDER VISUALIZER ---
function KitBuilder() {
  const [selectedItems, setSelectedItems] = useState({
    packaging: "Premium Magnet Box",
    drinkware: null,
    tech: null,
    apparel: null
  });

  const categories = [
    { id: 'packaging', name: 'Packaging', items: ['Premium Magnet Box', 'Eco Tote Bag', 'Leather Bag'] },
    { id: 'drinkware', name: 'Drinkware', items: ['Thermal Flask', 'Ceramic Mug', 'Glass Tumbler'] },
    { id: 'tech', name: 'Tech Gadget', items: ['Wireless Charger', 'Bluetooth Speaker', 'Smart Journal'] },
    { id: 'apparel', name: 'Apparel', items: ['Corporate Hoodie', 'Polo T-Shirt', 'Premium Cap'] }
  ];

  const handleSelect = (categoryId, item) => {
    setSelectedItems(prev => ({
      ...prev,
      [categoryId]: prev[categoryId] === item ? null : item
    }));
  };

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const buildSummary = Object.values(selectedItems).filter(Boolean).join(" + ");
  const waMessage = `Hi, I built a custom kit: [${buildSummary}]. Can I get a quote for this bundle?`;

  return (
    <section id="kit-builder" className="w-full bg-slate-900 text-white py-16 sm:py-24 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-4">
             Interactive
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">Build Your Welcome Kit</h2>
          <p className="text-slate-400 text-base sm:text-lg">Mix and match items to create the perfect bundle for your employees or clients.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          
          {/* Options Selector */}
          <div className="space-y-6">
            {categories.map(cat => (
              <div key={cat.id} className="bg-slate-800/50 border border-slate-700/50 rounded-[2rem] p-6">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">{cat.name}</h3>
                <div className="flex flex-wrap gap-3">
                  {cat.items.map(item => {
                    const isSelected = selectedItems[cat.id] === item;
                    return (
                      <button
                        key={item}
                        onClick={() => handleSelect(cat.id, item)}
                        className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                          isSelected 
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 border border-orange-400' 
                          : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-white'
                        }`}
                      >
                        {isSelected && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1.5 -mt-0.5"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Visualizer & CTA */}
          <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 text-slate-900 flex flex-col items-center justify-center text-center shadow-2xl">
            <div className="w-32 h-32 sm:w-40 sm:h-40 bg-slate-50 rounded-full border-8 border-slate-100 flex items-center justify-center mb-8 relative">
               <span className="text-4xl sm:text-5xl font-black text-slate-300">{selectedCount}</span>
               <div className="absolute -bottom-4 bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md">
                 Items Selected
               </div>
            </div>
            
            <h3 className="text-2xl font-black mb-3">Your Custom Bundle</h3>
            <p className="text-slate-500 mb-8 min-h-[48px] text-sm sm:text-base font-semibold">
              {selectedCount > 0 ? buildSummary : "Select items from the left to start building your kit."}
            </p>

            <a 
              href={getWhatsAppUrl(waMessage)} 
              target="_blank" 
              rel="noreferrer" 
              className={`w-full h-14 rounded-full font-black flex items-center justify-center gap-2 transition-all shadow-lg ${selectedCount > 0 ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/30 active:scale-95' : 'bg-slate-200 text-slate-400 pointer-events-none'}`}
            >
              Get Pricing For This Kit
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}

function BrandLogo({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={className} fill="none">
      <rect x="26" y="26" width="60" height="50" rx="12" fill="currentColor" fillOpacity="0.2" />
      <rect x="14" y="34" width="60" height="50" rx="12" fill="currentColor" />
      <path d="M14 59H74" stroke="white" strokeWidth="6" strokeLinecap="round" />
      <path d="M44 34V84" stroke="white" strokeWidth="6" strokeLinecap="round" />
      <path d="M44 34C44 34 26 14 38 14C48 14 44 34 44 34Z" fill="currentColor" />
      <path d="M44 34C44 34 62 14 50 14C40 14 44 34 44 34Z" fill="currentColor" />
    </svg>
  );
}

function PremiumCollection({ products }) {
  const [index, setIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const itemsPerPage = 4;

  useEffect(() => {
    if (!products.length) return;
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setIndex((prev) => (prev + itemsPerPage) % products.length);
        setIsFading(false);
      }, 500); 
    }, 6000); 
    return () => clearInterval(timer);
  }, [products.length]);

  const visibleProducts = products.slice(index, index + itemsPerPage);
  if (visibleProducts.length < itemsPerPage && products.length >= itemsPerPage) {
    visibleProducts.push(...products.slice(0, itemsPerPage - visibleProducts.length));
  }

  return (
    <section id="premium" className="w-full bg-white py-16 sm:py-20 border-t border-slate-200 overflow-hidden">
      <div className="px-4 max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 sm:px-6 lg:px-8 gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
             Premium Collection
             <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
          </h2>
          <p className="text-base text-slate-500 mt-2">Auto-curating executive gifts designed to leave an impression.</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto transition-all duration-500 transform ${isFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {visibleProducts.map((item, idx) => (
          <div key={`premium-${item.uniqueId}-${idx}`} className="bg-white rounded-[2rem] p-3 sm:p-4 shadow-sm ring-1 ring-slate-900/5 transition-all duration-300 group hover:shadow-xl hover:ring-slate-900/10 flex flex-col">
            <div className="relative aspect-[4/5] bg-slate-50 rounded-[1.5rem] overflow-hidden mb-4 p-6 flex items-center justify-center">
              <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-950 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest z-10">Premium</div>
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700 ease-out" onError={(e) => { e.target.src = buildFallbackImageUrl(item.id); }} />
            </div>
            <div className="px-2 flex-1 flex flex-col">
              <h3 className="font-bold text-base sm:text-lg leading-snug line-clamp-2 text-slate-900 mb-2">{item.name}</h3>
              <div className="mt-auto pt-4">
                <a href={getWhatsAppUrl(`Hi, I'm interested in the premium ${item.name}`)} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full h-12 bg-slate-900 text-white text-sm rounded-full font-bold transition-all active:scale-95 hover:bg-slate-800">
                  Inquire Now
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LiveCatalog({ products }) {
  const [index, setIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const itemsPerPage = 6; 

  useEffect(() => {
    if (!products.length) return;
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setIndex((prev) => (prev + itemsPerPage) % products.length);
        setIsFading(false);
      }, 600);
    }, 4500); 
    return () => clearInterval(timer);
  }, [products.length]);

  const visibleProducts = products.slice(index, index + itemsPerPage);
  if (visibleProducts.length < itemsPerPage && products.length >= itemsPerPage) {
    visibleProducts.push(...products.slice(0, itemsPerPage - visibleProducts.length));
  }

  return (
    <section className="border-y border-slate-200 bg-white py-12 sm:py-16 w-full overflow-hidden bg-slate-50/50" id="catalog">
      <div className="mx-auto mb-6 sm:mb-8 flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
           Live Catalog
           <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
        </h2>
      </div>
      
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 transition-all duration-700 ${isFading ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}>
        {visibleProducts.map((product, idx) => (
          <article className="shrink-0 overflow-hidden rounded-[2rem] bg-white ring-1 ring-slate-900/5 p-2 shadow-sm hover:shadow-md transition-shadow" key={`catalog-${product?.uniqueId || "placeholder"}-${idx}`}>
            <div className="aspect-[4/3] w-full bg-slate-50/50 rounded-[1.5rem] p-4 flex items-center justify-center">
               <img alt={product?.name || "Catalog product"} className="w-full h-full object-contain mix-blend-multiply" onError={(e) => { e.currentTarget.src = buildFallbackImageUrl(idx); }} src={product?.imageUrl || buildFallbackImageUrl(idx)} />
            </div>
            <div className="p-4 text-center">
              <p className="line-clamp-1 text-xs sm:text-sm font-bold text-slate-700">{product?.name || "Catalog product"}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function BulkEstimator() {
  const [teamSize, setTeamSize] = useState(250);
  const [budget, setBudget] = useState(1500);

  const discount = teamSize >= 1000 ? 10 : teamSize >= 500 ? 5 : teamSize >= 100 ? 2 : 10;
  const savings = Math.round((teamSize * budget) * (discount / 100));

  const perks = [
    { threshold: 50, name: "Wholesale Pricing" },
    { threshold: 100, name: "Free Logo Branding" },
    { threshold: 500, name: "Dedicated Manager" },
    { threshold: 1000, name: "Free Pan-India Delivery" }
  ];

  const prefilledMessage = `Hi, I'm looking for corporate gifts for my team of ${teamSize}. Our budget is approx ₹${budget}/person. I'd like to claim the ${discount}% wholesale volume discount and unlocked perks.`;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[2.5rem] bg-slate-900 overflow-hidden shadow-2xl relative p-6 sm:p-12 lg:p-16">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 grid gap-12 lg:grid-cols-[1fr_400px]">
          <div className="flex flex-col justify-center">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">Estimate Volume Savings</h2>
            <p className="text-slate-400 text-sm sm:text-base mb-10">Slide to adjust your team size and see your wholesale perks unlock instantly.</p>

            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-end mb-4">
                  <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Team Size</label>
                  <span className="text-2xl font-black text-white">{teamSize} <span className="text-sm text-slate-500 font-bold">employees</span></span>
                </div>
                <input 
                  type="range" min="50" max="2500" step="50" value={teamSize} 
                  onChange={(e) => setTeamSize(Number(e.target.value))} 
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-4">
                  <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Budget Per Person</label>
                  <span className="text-2xl font-black text-white">₹{budget} <span className="text-sm text-slate-500 font-bold">approx</span></span>
                </div>
                <input 
                  type="range" min="500" max="5000" step="100" value={budget} 
                  onChange={(e) => setBudget(Number(e.target.value))} 
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              <div className="pt-6">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Unlocked Perks</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {perks.map((perk, i) => {
                    const isUnlocked = teamSize >= perk.threshold;
                    return (
                      <div key={i} className={`p-3 rounded-2xl border transition-all duration-500 ${isUnlocked ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 scale-105' : 'bg-slate-800/50 border-slate-700/50 text-slate-600'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {isUnlocked ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                          )}
                          <span className="text-[10px] font-black uppercase tracking-wider">{perk.threshold}+</span>
                        </div>
                        <p className={`text-xs font-bold leading-tight ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>{perk.name}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* UPGRADE 4: (Added CTA functionality to existing Estimator box) */}
          <div className="bg-slate-800/80 backdrop-blur-md rounded-[2rem] p-8 border border-slate-700/50 flex flex-col items-center justify-center text-center shadow-xl">
             <div className="bg-orange-500/10 text-orange-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6 border border-orange-500/20">
               Tier {discount === 10 ? "4" : discount === 5 ? "3" : discount === 2 ? "2" : "1"} Unlocked
             </div>
             
             <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">You Save Approx</p>
             <h3 className="text-5xl sm:text-6xl font-black text-white mb-2">
               ₹{savings.toLocaleString()}
             </h3>
             <p className="text-orange-400 font-bold mb-8 text-lg">({discount}% Volume Discount)</p>
             
             <div className="w-full space-y-3">
               <a 
                 href={getWhatsAppUrl(prefilledMessage)} 
                 target="_blank" 
                 rel="noreferrer" 
                 className="w-full flex items-center justify-center gap-2 h-14 bg-orange-500 text-white rounded-full font-black text-base transition-all active:scale-95 hover:bg-orange-400 shadow-lg shadow-orange-500/25"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                 Claim {discount}% Off
               </a>
             </div>
             <p className="text-xs text-slate-500 mt-4 font-semibold">Message pre-filled with your requirements.</p>
          </div>

        </div>
      </div>
    </section>
  );
}

function GiftSearchForm({ canSubmit, input, isLoading, onChange, onSubmit, variant, suggestions, showSuggestions, onSuggestionClick, onFocus, onBlur }) {
  const isSticky = variant === "sticky";

  return (
    <form className={`relative w-full min-w-0 ${isSticky ? "flex items-center" : ""}`} id={isSticky ? "sticky-ai-gifting" : "ai-gifting"} onSubmit={onSubmit}>
      <div className={`flex w-full relative ${isSticky ? "gap-2" : "flex-col sm:flex-row gap-3"}`}>
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <input
            id={isSticky ? "sticky-gift-brief" : "gift-brief"}
            type="text"
            placeholder={isSticky ? "Search gifts..." : giftInputPlaceholder}
            className={`w-full min-w-0 border bg-white font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
              isSticky ? "h-14 rounded-full pl-12 pr-4 text-base border-slate-200" : "h-14 sm:h-16 rounded-full pl-12 sm:pl-14 pr-5 text-base sm:text-lg border-slate-200 shadow-sm"
            }`}
            value={input}
            onChange={(event) => onChange(event.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            autoComplete="off"
          />
          
          {showSuggestions && suggestions?.length > 0 && (
            <ul className="absolute left-0 right-0 bottom-full mb-3 sm:bottom-auto sm:top-full sm:mt-3 z-50 rounded-[1.5rem] border border-slate-100 bg-white shadow-2xl overflow-hidden py-2">
              {suggestions.map((sug, index) => (
                <li key={`${sug}-${index}`} onMouseDown={(e) => { e.preventDefault(); onSuggestionClick(sug); }} className="px-5 py-3.5 text-sm font-bold text-slate-600 cursor-pointer hover:bg-slate-50 hover:text-orange-500 transition-colors flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
                  <span className="truncate">{sug}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className={`shrink-0 flex items-center justify-center bg-orange-500 text-white font-black transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 hover:bg-orange-600 ${isSticky ? "h-14 w-14 rounded-full" : "w-full sm:w-auto h-14 sm:h-16 px-8 rounded-full shadow-lg shadow-orange-500/20 text-base"}`} disabled={!canSubmit} type="submit">
          {isLoading ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : isSticky ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg> : "Find Gifts"}
        </button>
      </div>
    </form>
  );
}

function HeroProductBoard({ products }) {
  const validProducts = products.length >= 8 ? products : Array.from({ length: 8 });
  const col1 = [...validProducts.slice(0, 4), ...validProducts.slice(0, 4)];
  const col2 = [...validProducts.slice(4, 8), ...validProducts.slice(4, 8)];

  return (
    <div className="relative h-[400px] sm:h-[500px] w-full flex items-center justify-center overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)] pointer-events-none">
      <div className="absolute right-0 sm:right-10 top-0 sm:top-10 h-40 w-40 rounded-full bg-orange-200 blur-3xl opacity-50" />
      <div className="absolute bottom-0 sm:bottom-10 left-0 sm:left-10 h-40 w-40 rounded-full bg-blue-200 blur-3xl opacity-50" />
      
      <div className="relative grid grid-cols-2 gap-3 sm:gap-5 w-full max-w-md mx-auto min-w-0">
        <div className="flex flex-col gap-3 sm:gap-5 animate-scroll-y hover-pause pt-[50%]">
          {col1.map((product, index) => (
            <article className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-900/5 aspect-square p-4 flex items-center justify-center shrink-0" key={`col1-${product?.uniqueId || index}`}>
              <img alt={product?.name || `Gift`} className="w-full h-full object-contain mix-blend-multiply" onError={(e) => { e.currentTarget.src = buildFallbackImageUrl(index); }} src={product?.imageUrl || buildFallbackImageUrl(index)} />
            </article>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:gap-5 animate-scroll-y-reverse hover-pause">
          {col2.map((product, index) => (
            <article className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-900/5 aspect-square p-4 flex items-center justify-center shrink-0" key={`col2-${product?.uniqueId || index}`}>
              <img alt={product?.name || `Gift`} className="w-full h-full object-contain mix-blend-multiply" onError={(e) => { e.currentTarget.src = buildFallbackImageUrl(index + 4); }} src={product?.imageUrl || buildFallbackImageUrl(index + 4)} />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductGrid({ products }) {
  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((gift, index) => (
        <article className="flex flex-col overflow-hidden rounded-[2rem] bg-white p-2 shadow-sm ring-1 ring-slate-900/5 transition-all hover:shadow-lg hover:ring-slate-900/10" key={gift.uniqueId}>
          <div className="relative aspect-square w-full bg-slate-50 rounded-[1.5rem] p-6 flex items-center justify-center overflow-hidden">
            <span className="absolute top-4 left-4 bg-white text-slate-900 text-[10px] font-black px-3 py-1.5 rounded-full uppercase z-10 shadow-sm border border-slate-100">{gift.badge || "Pick"}</span>
            <img alt={gift.name} className="max-h-full max-w-full object-contain mix-blend-multiply hover:scale-105 transition-transform duration-500" loading="lazy" onError={(e) => { e.currentTarget.src = buildFallbackImageUrl(index); }} src={gift.imageUrl || buildFallbackImageUrl(index)} />
          </div>
          <div className="flex flex-col flex-1 p-4 pb-2">
            <div className="flex-1 mb-4">
              <p className="text-base font-bold leading-snug text-slate-900 line-clamp-2">{gift.name}</p>
            </div>
            <a className="flex h-12 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-900 transition-all active:scale-95 hover:bg-slate-200" href={gift.whatsappUrl || getWhatsAppUrl()} rel="noreferrer" target="_blank">Request Quote</a>
          </div>
        </article>
      ))}
    </div>
  );
}

function Footer() {
  const seamlessLogos = [...deliveredBrandLogos, ...deliveredBrandLogos, ...deliveredBrandLogos, ...deliveredBrandLogos];

  return (
    <footer className="bg-slate-900 text-white w-full rounded-t-[2rem] sm:rounded-t-[3rem] mt-10 relative overflow-hidden pb-16 md:pb-0" id="contact">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8">
        
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <BrandLogo className="w-10 h-10 text-orange-500" />
              <span className="text-xl font-black tracking-tight text-white">
                CorporateGifts<span className="text-orange-500">Zone.</span>
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">Your Branding Partner.</h2>
            <p className="max-w-md text-base leading-relaxed text-slate-400 mb-10">
              Leading provider of promotional gifts and corporate branding solutions across India. Quality products, seamless execution.
            </p>
            
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Trusted By</p>
            
            <div className="w-full relative overflow-hidden flex -ml-4">
               <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none"></div>
               <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none"></div>
               
               <div className="flex w-max gap-3 animate-marquee-slow py-1">
                 {seamlessLogos.map((brand, i) => (
                   <div className="flex h-10 sm:h-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800/50 px-5 text-xs sm:text-sm font-bold text-slate-300 shrink-0" key={`${brand}-${i}`}>
                     {brand}
                   </div>
                 ))}
               </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-slate-800/50 border border-slate-700 p-8 sm:p-10 flex flex-col justify-center">
            <h3 className="text-lg font-black mb-6 flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
               Contact Us
            </h3>
            <div className="grid gap-4 text-base text-slate-300">
              <p className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <span>SG Alpha Tower, 6th Floor<br />Vasundhara, Ghaziabad<br />India</span>
              </p>
              <div className="h-px w-full bg-slate-700/50 my-2"></div>
              <a className="flex items-center gap-3 hover:text-white transition-colors" href="tel:+919990093697"><span className="font-bold">+91 98716 21921</span></a>
              <a className="flex items-center gap-3 hover:text-white transition-colors" href="mailto:vishal.giftszone@gmail.com"><span className="font-bold">vishal.giftszone@gmail.com</span></a>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <p className="text-xs text-slate-500 font-semibold">© {new Date().getFullYear()} CorporateGiftsZone. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="https://www.linkedin.com/in/vishal-gulati-934140b4" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-[#0a66c2] transition-colors" aria-label="LinkedIn">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
              <a href="https://www.instagram.com/p/DLt-VwxRxAJ/?utm_source=ig_web_copy_link" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-[#E1306C] transition-colors" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-[10px] font-black tracking-wider text-slate-300 uppercase">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                256-Bit SSL
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-[10px] font-black tracking-wider text-slate-300 uppercase">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                ISO 9001
              </div>
            </div>

            <div className="hidden sm:block w-px h-6 bg-slate-800"></div>

            <div className="flex items-center gap-2">
              <div className="px-2 py-1 bg-white rounded-[4px] text-[10px] font-black text-blue-800 italic tracking-tighter">VISA</div>
              <div className="px-2 py-1 bg-white rounded-[4px] text-[10px] font-bold text-red-600 flex items-center gap-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-orange-400 -ml-1.5 mix-blend-multiply opacity-90"></div>
              </div>
              <div className="px-2 py-1 bg-white rounded-[4px] text-[10px] font-black text-slate-800 tracking-tight">UPI</div>
              <div className="px-2 py-1 bg-white rounded-[4px] text-[10px] font-black text-blue-500 tracking-tight">AMEX</div>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}

function buildFallbackImageUrl(index) {
  const label = `Gift ${String(index + 1).padStart(2, "0")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="#f8fafc"/><rect x="48" y="48" width="544" height="384" rx="40" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/><text x="320" y="246" text-anchor="middle" font-family="system-ui, sans-serif" font-size="24" font-weight="800" fill="#94a3b8">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div className="h-72 animate-pulse rounded-[2rem] bg-slate-100" key={index} />
      ))}
    </div>
  );
}