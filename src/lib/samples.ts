// Real products, used as one-click examples. Ingredient lists were copied from
// the cited source on the date shown; formulas change between batches and
// regions, so the UI tells people to check their own packaging.

export interface SampleSource {
  label: string;
  url: string;
  retrieved: string;
}

export interface SampleProduct {
  name: string;
  text: string;
  source: SampleSource;
}

export interface Sample {
  id: string;
  /** English label; translated labels live in src/i18n/messages. */
  label: string;
  products: SampleProduct[];
}

const obf = (code: string): SampleSource => ({
  label: "Open Beauty Facts",
  url: `https://world.openbeautyfacts.org/product/${code}`,
  retrieved: "2026-10-24",
});

export const samples: Sample[] = [
  {
    id: "routine-retinol-aha",
    label: "Routine: CeraVe retinol serum + The Ordinary glycolic toner",
    products: [
      {
        name: "CeraVe Skin Renewing Retinol Serum",
        text: "AQUA/WATER/EAU, GLYCERIN, CAPRYLIC/CAPRIC TRIGLYCERIDE, POTASSIUM CETYL PHOSPHATE, HYDROGENATED PALM GLYCERIDES, POLYSORBATE 20, DIMETHICONE, PEG-40 STEARATE, POTASSIUM PHOSPHATE, CERAMIDE NP, CERAMIDE AP, CERAMIDE EOP, CARBOMER, NIACINAMIDE, TRIETHANOLAMINE, CETEARYL ALCOHOL, BEHENTRIMONIUM METHOSULFATE, TRIETHYL CITRATE, CICHORIUM INTYBUS ROOT EXTRACT/CHICORY ROOT EXTRACT, LECITHIN, RETINOL, SODIUM LAUROYL LACTYLATE, SODIUM HYALURONATE, CHOLESTEROL, PHENOXYETHANOL, ALCOHOL, TOCOPHEROL, HYDROXYETHYLCELLULOSE, CAPRYLYL METHICONE, HYDROXYACETOPHENONE, CITRIC ACID, CAPRYLYL GLYCOL, TRISODIUM ETHYLENEDIAMINE DISUCCINATE, PENTYLENE GLYCOL, XANTHAN GUM, PHYTOSPHINGOSINE, BUTYROSPERMUM PARKII BUTTER/SHEA BUTTER, ETHYLHEXYLGLYCERIN, BENZOIC ACID",
        source: obf("3606000537316"),
      },
      {
        name: "The Ordinary Glycolic Acid 7% Toning Solution",
        text: "Aqua (Water), Glycolic Acid, Rosa Damascena Flower Water, Centaurea Cyanus Flower Water, Aloe Barbadensis Leaf Water, Propanediol, Glycerin, Triethanolamine, Aminomethyl Propanol, Panax Ginseng Root Extract, Tasmannia Lanceolata Fruit/Leaf Extract, Aspartic Acid, Alanine, Glycine, Serine, Valine, Isoleucine, Proline, Threonine, Histidine, Phenylalanine, Glutamic Acid, Arginine, Pca, Sodium Pca, Sodium Lactate, Fructose, Glucose, Sucrose, Urea, Hexyl Nicotinate, Dextrin, Citric Acid, Polysorbate 20, Gellan Gum, Trisodium Ethylenediamine Disuccinate, Sodium Chloride, Hexylene Glycol, Potassium Sorbate, Sodium Benzoate, 1,2-Hexanediol, Caprylyl Glycol.",
        source: obf("0769915190977"),
      },
    ],
  },
  {
    id: "routine-retinoid-bha",
    label: "Routine: Olay Retinol 24 + The INKEY List salicylic cleanser",
    products: [
      {
        name: "Olay Regenerist Retinol 24 Night Serum",
        text: "Water, Dimethicone, Glycerin, Dimethicone Crosspolymer, Polyacrylamide, Retinyl Propionate, Titanium Dioxide, C13-14 Isoparaffin, Laureth-4, Polysorbate 20, Hydroxyacetophenone, Dimethiconol, Laureth-7, Phenoxyethanol, Disodium Edta, Niacinamide, Benzyl Alcohol, Caprylic/Capric Triglyceride, Retinol, Palmitoyl Pentapeptide-4, Ci 77019",
        source: obf("4902430917896"),
      },
      {
        name: "The INKEY List Salicylic Acid Cleanser",
        text: "Aqua (Water), Sodium C12-15 Alkyl Benzenesulfonate, Coco-Glucoside, Sodium Coco-Sulfate, Glycerin, Salicylic Acid, Sodium Chloride, Sodium Benzoate, Citric Acid, Polyquaternium-7, Sodium Hydroxide, Potassium Sorbate, Tocopherol, Hydrogenated Palm Glycerides Citrate.",
        source: obf("8806443052901"),
      },
    ],
  },
  {
    id: "ocr-messy",
    label: "Messy scan (simulated typos): CeraVe Hydrating Facial Cleanser",
    products: [
      {
        name: "CeraVe Hydrating Facial Cleanser (simulated scan)",
        // The real list with typical text-recognition mistakes added on purpose:
        // a garbled header, a split word, "l" for "i", and mixed separators.
        text: "INGREDlENTS: Aqua/Water/Eau, Glycerin, Cetearyl Alcohol,\nPEG-40 Stearate, Stearyl Alcohol • Potassium Phosphate, Ceramide NP, Ceramide AP, Ceramide EOP; Carbomer, Glyceryl Stearate, Behentrimonium Methosulfate, Sodium Lauroyl Lactylate, Sodium Hyaluronate, Cholesterol, Phenoxy-\nethanol, Disodium EDTA, Dipotassium Phosphate, Tocopherol, Phytosphlngosine, Xanthan Gum, Cetyl Alcohol, Polysorbate 20, Ethylhexylglycerin",
        source: obf("3606000537538"),
      },
    ],
  },
  {
    id: "gentle-moisturizer",
    label: "Barrier cream: CeraVe Moisturizing Cream",
    products: [
      {
        name: "CeraVe Moisturizing Cream",
        text: "AQUA / WATER / EAU, GLYCERIN, CETEARYL ALCOHOL, CAPRYLIC/CAPRIC TRIGLYCERIDE, CETYL ALCOHOL, CETEARETH-20, PETROLATUM, POTASSIUM PHOSPHATE, CERAMIDE NP, CERAMIDE AP, CERAMIDE EOP, CARBOMER, DIMETHICONE, BEHENTRIMONIUM METHOSULFATE, SODIUM LAUROYL LACTYLATE, SODIUM HYALURONATE, CHOLESTEROL, PHENOXYETHANOL, DISODIUM EDTA, DIPOTASSIUM PHOSPHATE, TOCOPHEROL, PHYTOSPHINGOSINE, XANTHAN GUM, ETHYLHEXYLGLYCERIN",
        source: { label: "CeraVe", url: "https://www.cerave.com/skincare/moisturizers/moisturizing-cream", retrieved: "2026-10-24" },
      },
    ],
  },
];

/** Text rendered into public/samples/label.png (a made-up product), used to check the OCR path. */
export const SAMPLE_LABEL_TEXT =
  "INGREDIENTS: Aqua (Water), Glycerin, Niacinamide, Salicylic Acid, Retinol, Panthenol, Phenoxyethanol, Parfum (Fragrance), Limonene.";
