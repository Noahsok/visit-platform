"use client";

import { useState } from "react";

/* ============================================
   Fat Wash Calculator
   Ported from Drink Bible - standalone component
   ============================================ */

interface WashProfile {
  name: string;
  ratio: number;
  fatLabel: string;
  base: string;
  fat: string;
  steps: string[];
}

const WASHES: Record<string, WashProfile> = {
  olive: {
    name: "Olive Oil Washed Gin",
    ratio: 600 / 85, // 7.06:1 gin to fat
    fatLabel: "Olive Oil",
    base: "Tanqueray Gin",
    fat: "Frankies Olive Oil",
    steps: [
      "Combine gin and olive oil in container",
      "Shake vigorously to combine",
      "Sous vide at 145°F for 1 hour",
      "Remove, shake again",
      "Let rest at room temp for 45 minutes",
      "Transfer to freezer for 6 hours (until oil is hard puck)",
      "Remove oil puck, strain through cheesecloth",
    ],
  },
  duck: {
    name: "Duck Fat Washed Gin",
    ratio: 8, // 8:1 gin to fat
    fatLabel: "Total Fat (50% duck fat, 50% olive oil)",
    base: "Tanqueray Gin",
    fat: "Duck Fat + Frankies Olive Oil",
    steps: [
      "Combine gin with duck fat and olive oil (split 50/50)",
      "Shake vigorously to combine",
      "Sous vide at 145°F for 1 hour",
      "Remove, shake again",
      "Let rest at room temp for 45 minutes",
      "Transfer to freezer for 6 hours (until fat is hard puck)",
      "Remove fat puck, strain through cheesecloth",
    ],
  },
};

// Drinks that use fat-washed gin, with pour sizes
const DRINKS = [
  { name: "Reserve Dirty", oz: 2.5 },
  { name: "Dirty G&T", oz: 1 },
];

const ML_PER_OZ = 29.57;
const YIELD_LOSS = 0.05; // ~5% loss during process

export default function FatWashCalculator() {
  const [washType, setWashType] = useState<string>("olive");
  const [inputMode, setInputMode] = useState<"fat" | "gin">("fat");
  const [fatAmount, setFatAmount] = useState("");
  const [ginAmount, setGinAmount] = useState("");

  const wash = WASHES[washType];

  let fat: number, gin: number;
  if (inputMode === "fat") {
    fat = parseFloat(fatAmount) || 0;
    gin = Math.round(fat * wash.ratio);
  } else {
    gin = parseFloat(ginAmount) || 0;
    fat = Math.round(gin / wash.ratio);
  }

  const estimatedYield = gin > 0 ? Math.round(gin * (1 - YIELD_LOSS)) : 0;

  const handlePreset = (ml: number) => {
    setGinAmount(ml.toString());
    setInputMode("gin");
  };

  const hasInput = inputMode === "fat" ? fat > 0 : gin > 0;

  return (
    <div style={{ maxWidth: 480 }}>
      {/* Wash type toggle */}
      <div className="calc-mode-toggle" style={{ marginBottom: 16 }}>
        {Object.entries(WASHES).map(([key, w]) => (
          <button
            key={key}
            className={`calc-mode-btn ${washType === key ? "active" : ""}`}
            onClick={() => setWashType(key)}
          >
            {key === "olive" ? "Olive Oil (7:1)" : "Duck Fat (8:1)"}
          </button>
        ))}
      </div>

      {/* Input mode toggle */}
      <div className="calc-mode-toggle" style={{ marginBottom: 16 }}>
        <button
          className={`calc-mode-btn ${inputMode === "fat" ? "active" : ""}`}
          onClick={() => setInputMode("fat")}
        >
          I have fat
        </button>
        <button
          className={`calc-mode-btn ${inputMode === "gin" ? "active" : ""}`}
          onClick={() => setInputMode("gin")}
        >
          I have gin
        </button>
      </div>

      {/* Input */}
      <div className="calc-inputs">
        {inputMode === "fat" ? (
          <>
            <div className="calc-label">{wash.fatLabel.toUpperCase()} (ML)</div>
            <input
              type="number"
              className="calc-custom-input"
              value={fatAmount}
              onChange={(e) => setFatAmount(e.target.value)}
              placeholder="e.g., 85"
            />
          </>
        ) : (
          <>
            <div className="calc-label">GIN AMOUNT (ML)</div>
            <div className="calc-bottle-sizes" style={{ marginBottom: 8 }}>
              {[750, 1000, 1750].map((ml) => (
                <button
                  key={ml}
                  className={`calc-size-btn ${ginAmount === String(ml) ? "active" : ""}`}
                  onClick={() => handlePreset(ml)}
                >
                  {ml}ml
                </button>
              ))}
            </div>
            <input
              type="number"
              className="calc-custom-input"
              value={ginAmount}
              onChange={(e) => setGinAmount(e.target.value)}
              placeholder="or enter custom amount"
            />
          </>
        )}
      </div>

      {/* Results */}
      {hasInput && (
        <div className="calc-results" style={{ marginTop: 16 }}>
          <div className="calc-result-row">
            <span>{wash.fat}</span>
            <span className="calc-result-amount">{fat} ml</span>
          </div>
          {washType === "duck" && (
            <>
              <div className="calc-result-row" style={{ paddingLeft: 16, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                <span>↳ Duck Fat</span>
                <span>{(fat / 2).toFixed(1)} ml</span>
              </div>
              <div className="calc-result-row" style={{ paddingLeft: 16, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                <span>↳ Olive Oil</span>
                <span>{(fat / 2).toFixed(1)} ml</span>
              </div>
            </>
          )}
          <div className="calc-result-row">
            <span>{wash.base}</span>
            <span className="calc-result-amount">{gin} ml</span>
          </div>
          <div className="calc-result-row calc-result-yield">
            <span>Estimated Yield</span>
            <span className="calc-result-amount">~{estimatedYield} ml</span>
          </div>
          {DRINKS.map((drink) => (
            <div key={drink.name} className="calc-result-row" style={{ fontSize: '0.85rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{drink.name} ({drink.oz} oz)</span>
              <span>{Math.floor(estimatedYield / (drink.oz * ML_PER_OZ))} drinks</span>
            </div>
          ))}
        </div>
      )}

      {/* Process steps */}
      <div style={{ marginTop: 20 }}>
        <div className="calc-label" style={{ marginBottom: 10 }}>PROCESS</div>
        <ol className="prep-method-steps">
          {wash.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
