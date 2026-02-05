// @ts-nocheck
"use client";

import { useState } from "react";

/* 
  Fat Wash Calculator - ported exactly from Drink Bible
  Inline styles with CSS variables
*/

const cssVars = {
  '--bg-primary': '#111',
  '--bg-secondary': '#1a1a1a',
  '--bg-tertiary': '#222',
  '--text-primary': '#eee',
  '--text-secondary': '#888',
  '--border-color': '#333',
  '--accent': '#eee',
  '--accent-hover': '#fff',
  '--card-bg': '#1a1a1a',
};

export default function FatWashPage() {
  return (
    <div style={cssVars}>
      <FatWashCalculator />
    </div>
  );
}

function FatWashCalculator() {
  const [washType, setWashType] = useState('olive');
  const [inputMode, setInputMode] = useState('fat');
  const [fatAmount, setFatAmount] = useState('');
  const [ginAmount, setGinAmount] = useState('');
  
  const washes = {
    olive: {
      name: 'Olive Oil Washed Gin',
      ratio: 600 / 85,
      fatLabel: 'Olive Oil',
      base: 'Tanqueray Gin',
      fat: 'Frankies Olive Oil',
      steps: [
        'Combine gin and olive oil in container',
        'Shake vigorously to combine',
        'Sous vide at 145°F for 1 hour',
        'Remove, shake again',
        'Let rest at room temp for 45 minutes',
        'Transfer to freezer for 6 hours (until oil is hard puck)',
        'Remove oil puck, strain through cheesecloth'
      ]
    },
    duck: {
      name: 'Duck Fat Washed Gin',
      ratio: 8,
      fatLabel: 'Total Fat (50% duck fat, 50% olive oil)',
      base: 'Tanqueray Gin',
      fat: 'Duck Fat + Frankies Olive Oil',
      steps: [
        'Combine gin with duck fat and olive oil (split 50/50)',
        'Shake vigorously to combine',
        'Sous vide at 145°F for 1 hour',
        'Remove, shake again',
        'Let rest at room temp for 45 minutes',
        'Transfer to freezer for 6 hours (until fat is hard puck)',
        'Remove fat puck, strain through cheesecloth'
      ]
    }
  };
  
  const wash = washes[washType];
  
  let fat, gin;
  if (inputMode === 'fat') {
    fat = parseFloat(fatAmount) || 0;
    gin = Math.round(fat * wash.ratio);
  } else {
    gin = parseFloat(ginAmount) || 0;
    fat = Math.round(gin / wash.ratio);
  }
  
  const estimatedYield = gin > 0 ? Math.round(gin * 0.95) : 0;
  
  const reserveDirtyOz = 2.5;
  const dirtyGTOz = 1;
  const mlPerOz = 29.57;
  
  const reserveDirtyCount = estimatedYield > 0 ? Math.floor(estimatedYield / (reserveDirtyOz * mlPerOz)) : 0;
  const dirtyGTCount = estimatedYield > 0 ? Math.floor(estimatedYield / (dirtyGTOz * mlPerOz)) : 0;

  const handlePreset = (ml) => {
    setGinAmount(ml.toString());
    setInputMode('gin');
  };

  const hasInput = inputMode === 'fat' ? fat > 0 : gin > 0;
  
  return (
    <div style={{ padding: '16px', maxWidth: '480px' }}>
      <h1 style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '24px',
        fontWeight: 500,
        marginBottom: '4px',
      }}>
        Fat Wash Calculator
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Start from what you have
      </p>
      
      {/* Wash Type */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Wash Type
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setWashType('olive')}
            style={{
              flex: 1,
              padding: '12px',
              border: washType === 'olive' ? 'none' : '1px solid var(--border-color)',
              background: washType === 'olive' ? 'var(--accent)' : 'var(--card-bg)',
              color: washType === 'olive' ? 'var(--bg-primary)' : 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Olive Oil (7:1)
          </button>
          <button
            onClick={() => setWashType('duck')}
            style={{
              flex: 1,
              padding: '12px',
              border: washType === 'duck' ? 'none' : '1px solid var(--border-color)',
              background: washType === 'duck' ? 'var(--accent)' : 'var(--card-bg)',
              color: washType === 'duck' ? 'var(--bg-primary)' : 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Duck Fat (8:1)
          </button>
        </div>
      </div>

      {/* Input Mode Toggle */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Calculate From
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setInputMode('fat')}
            style={{
              flex: 1,
              padding: '12px',
              border: inputMode === 'fat' ? 'none' : '1px solid var(--border-color)',
              background: inputMode === 'fat' ? 'var(--accent)' : 'var(--card-bg)',
              color: inputMode === 'fat' ? 'var(--bg-primary)' : 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            I have fat
          </button>
          <button
            onClick={() => setInputMode('gin')}
            style={{
              flex: 1,
              padding: '12px',
              border: inputMode === 'gin' ? 'none' : '1px solid var(--border-color)',
              background: inputMode === 'gin' ? 'var(--accent)' : 'var(--card-bg)',
              color: inputMode === 'gin' ? 'var(--bg-primary)' : 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            I have gin
          </button>
        </div>
      </div>
      
      {/* Input */}
      {inputMode === 'fat' ? (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {wash.fatLabel} (ml)
          </div>
          <input
            type="number"
            value={fatAmount}
            onChange={(e) => setFatAmount(e.target.value)}
            placeholder="e.g., 85"
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '16px',
            }}
          />
        </div>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Gin Amount (ml)
          </div>
          <input
            type="number"
            value={ginAmount}
            onChange={(e) => setGinAmount(e.target.value)}
            placeholder="e.g., 600"
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '16px',
              marginBottom: '10px',
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            {[750, 1000, 1750].map(ml => (
              <button
                key={ml}
                onClick={() => handlePreset(ml)}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {ml}ml
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Results */}
      {hasInput && (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{wash.fat}</span>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>{fat} ml</span>
          </div>
          {washType === 'duck' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 6px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>↳ Duck Fat</span>
                <span>{(fat / 2).toFixed(1)} ml</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 8px 16px', borderBottom: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>↳ Olive Oil</span>
                <span>{(fat / 2).toFixed(1)} ml</span>
              </div>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{wash.base}</span>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>{gin} ml</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 8px', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Estimated Yield</span>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>~{estimatedYield} ml</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Reserve Dirty (2.5 oz)</span>
            <span style={{ fontSize: '13px' }}>{reserveDirtyCount} drinks</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Dirty G&T (1 oz)</span>
            <span style={{ fontSize: '13px' }}>{dirtyGTCount} drinks</span>
          </div>
        </div>
      )}
      
      {/* Process */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        padding: '16px',
      }}>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: 600, 
          color: 'var(--text-secondary)', 
          letterSpacing: '0.5px',
          marginBottom: '12px',
          textTransform: 'uppercase',
        }}>
          Process
        </div>
        <ol style={{ paddingLeft: '20px', margin: 0 }}>
          {wash.steps.map((step, i) => (
            <li key={i} style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', padding: '2px 0' }}>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
