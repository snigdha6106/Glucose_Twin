export interface OrganAnatomyInfo {
  id: string;
  name: string;
  latinName: string;
  system: string;
  location: string;
  primaryGlucoseRole: string;
  insulinInteraction: string;
  healthyPhysiology: string;
  type1DiabetesImpact: string;
  type2DiabetesImpact: string;
  transportersAndHormones: string[];
  clinicalMetrics: {
    label: string;
    normalValue: string;
    unit: string;
  }[];
}

export const ANATOMY_ORGAN_DATABASE: Record<string, OrganAnatomyInfo> = {
  pancreas: {
    id: 'pancreas',
    name: 'Pancreas (Endocrine Islets of Langerhans)',
    latinName: 'Pancreas',
    system: 'Endocrine & Digestive System',
    location: 'Retroperitoneal upper abdomen, nestled in C-loop of duodenum behind stomach',
    primaryGlucoseRole:
      'Master endocrine sensor and regulator of systemic glucose homeostasis. Contains ~1 million Islets of Langerhans comprising beta cells (~65-80%) that synthesize and secrete insulin, alpha cells (~15-20%) that secrete glucagon, and delta cells (~3-5%) that produce somatostatin.',
    insulinInteraction:
      'Beta cells detect glucose influx via GLUT2/GLUT1 transporters and glucokinase phosphorylation. Elevated ATP/ADP ratio closes ATP-sensitive K+ channels, depolarizing the cell membrane, opening voltage-gated Ca2+ channels, and triggering exocytosis of pre-formed insulin granules.',
    healthyPhysiology:
      'Maintains baseline euglycemia (70–99 mg/dL) with low basal insulin secretion. Upon meal ingestion, mounts a sharp first-phase insulin spike (within 5–10 min) followed by a sustained second-phase secretion until glucose returns to baseline.',
    type1DiabetesImpact:
      'Target of chronic autoimmune destruction mediated by autoreactive CD4+ and CD8+ T lymphocytes. Beta-cell mass decreases by >85–90%, leading to absolute insulin deficiency. Patients require lifelong exogenous insulin replacement to survive.',
    type2DiabetesImpact:
      'Progressive secretory defect. Initially compensates for peripheral insulin resistance through hyperinsulinemia and beta-cell hypertrophy. Over time, glucotoxicity, lipotoxicity, and islet amyloid polypeptide (IAPP/amylin) aggregation lead to beta-cell apoptosis and exhaustion.',
    transportersAndHormones: ['Insulin', 'Glucagon', 'Somatostatin', 'Amylin', 'GLUT2', 'K_ATP Channels', 'SUR1'],
    clinicalMetrics: [
      { label: 'Endogenous Insulin Output', normalValue: '18 - 40', unit: 'U/day' },
      { label: 'Fasting C-Peptide', normalValue: '0.8 - 3.1', unit: 'ng/mL' },
      { label: 'First-Phase Peak', normalValue: '5 - 10', unit: 'min post-prandial' }
    ]
  },

  liver: {
    id: 'liver',
    name: 'Liver (Hepatic Metabolic Hub)',
    latinName: 'Hepar',
    system: 'Digestive & Metabolic System',
    location: 'Right upper quadrant (hypochondrium) beneath the diaphragm, anterior to stomach',
    primaryGlucoseRole:
      'Primary organ for endogenous glucose production, storage, and buffering. Stores up to 100–120g of glycogen (~400 kcal) and serves as the immediate buffer for ingested nutrients via first-pass clearance of the portal vein.',
    insulinInteraction:
      'High portal insulin activates glycogen synthase (glycogenesis) and potently suppresses glycogen phosphorylase and key gluconeogenic enzymes (PEPCK, G6Pase), halting endogenous glucose release. Glucagon reverses this, promoting glycogenolysis and gluconeogenesis.',
    healthyPhysiology:
      'Absorbs 30–50% of ingested glucose during the postprandial period. In the post-absorptive (fasting) state, hepatic glucose output matches cerebral and peripheral consumption at ~2.0 mg/kg/min.',
    type1DiabetesImpact:
      'Without portal insulin delivery, the liver fails to suppress gluconeogenesis even during severe hyperglycemia. Continuous uninhibited breakdown of fatty acids into acetoacetate and beta-hydroxybutyrate creates diabetic ketoacidosis (DKA).',
    type2DiabetesImpact:
      'Hepatic insulin resistance: Insulin fails to shut down hepatic glucose production, causing elevated fasting hyperglycemia despite hyperinsulinemia. Simultaneously, insulin-stimulated lipogenesis continues, fostering non-alcoholic fatty liver disease (NAFLD/MASLD).',
    transportersAndHormones: ['GLUT2 (bidirectional)', 'Glucokinase', 'Glycogen Synthase', 'G6Pase', 'PEPCK'],
    clinicalMetrics: [
      { label: 'Basal Hepatic Glucose Output', normalValue: '2.0 - 2.2', unit: 'mg/kg/min' },
      { label: 'Glycogen Storage Capacity', normalValue: '100 - 120', unit: 'g' },
      { label: 'First-Pass Portal Clearance', normalValue: '30 - 50', unit: '%' }
    ]
  },

  stomach: {
    id: 'stomach',
    name: 'Stomach (Gastric Reservoir & Digestion)',
    latinName: 'Gaster / Ventriculus',
    system: 'Gastrointestinal System',
    location: 'Left upper quadrant beneath the diaphragm, connecting esophagus to duodenum',
    primaryGlucoseRole:
      'Mechanically churns ingested food with gastric acid and pepsins to form acidic chyme. Controls the rate of carbohydrate delivery into the duodenum (gastric emptying rate, represented mathematically as k_abs in pharmacokinetic models).',
    insulinInteraction:
      'Does not directly absorb glucose. However, high circulating glucose and autonomic insulin balance modulate the vagus nerve and enteric pacemaker cells that drive gastric peristalsis.',
    healthyPhysiology:
      'Regulates gastric emptying of carbohydrates in a controlled linear rate (~1.5 to 4 kcal/min), preventing sudden saturation of intestinal absorption and blunting postprandial glycemic excursions.',
    type1DiabetesImpact:
      'Long-standing diabetes with diabetic autonomic neuropathy can cause Diabetic Gastroparesis (delayed gastric emptying). This creates severe mismatch between meal digestion and injected bolus insulin, leading to early hypoglycemia followed by late severe hyperglycemia.',
    type2DiabetesImpact:
      'Altered gastric emptying rates are common. Therapeutic GLP-1 receptor agonists (e.g. semaglutide) intentionally decelerate gastric emptying to prolong satiety and flatten postprandial glucose curves.',
    transportersAndHormones: ['Ghrelin', 'Gastrin', 'Intrinsic Factor', 'Enteric Pacemaker ICCs'],
    clinicalMetrics: [
      { label: 'Gastric Emptying Rate', normalValue: '1.5 - 4.0', unit: 'kcal/min' },
      { label: 'Transit Time to Duodenum', normalValue: '15 - 45', unit: 'min' }
    ]
  },

  small_intestine: {
    id: 'small_intestine',
    name: 'Small Intestine (Duodenum, Jejunum, Ileum)',
    latinName: 'Intestinum Tenue',
    system: 'Gastrointestinal System',
    location: 'Central abdominal cavity, coiled between stomach and large intestine',
    primaryGlucoseRole:
      'Exclusive site of carbohydrate breakdown and monosaccharide absorption into the bloodstream. Membrane-bound brush border disaccharidases (maltase, sucrase, isomaltase) cleave complex starches into free D-glucose.',
    insulinInteraction:
      'Active glucose absorption occurs via SGLT1 (sodium-glucose cotransporter 1) at the apical enterocyte membrane and GLUT2 at the basolateral membrane into mesenteric capillaries. Incretin hormones (GLP-1 from L-cells, GIP from K-cells) trigger anticipatory insulin secretion (the incretin effect).',
    healthyPhysiology:
      'The incretin effect accounts for 50–70% of total insulin secretion following oral glucose compared to an identical intravenous glucose infusion. Efficient, complete absorption occurs in the duodenum and upper jejunum.',
    type1DiabetesImpact:
      'Intestinal glucose absorption remains fully functional; however, the absence of beta-cell responsiveness prevents the incretin effect from triggering endogenous insulin.',
    type2DiabetesImpact:
      'Markedly impaired incretin response: GLP-1 and GIP insulinotropic efficacy is blunted, while glucagon suppression is lost, exacerbating postprandial hyperglycemia. GLP-1 receptor agonists and DPP-4 inhibitors restore this pathway.',
    transportersAndHormones: ['SGLT1', 'GLUT2', 'GLP-1', 'GIP', 'Alpha-Glucosidase'],
    clinicalMetrics: [
      { label: 'Carbohydrate Absorption Rate', normalValue: '0.010 - 0.025', unit: 'min⁻¹ (k_abs)' },
      { label: 'Incretin Contribution to Insulin', normalValue: '50 - 70', unit: '%' }
    ]
  },

  large_intestine: {
    id: 'large_intestine',
    name: 'Large Intestine (Colon & Gut Microbiome)',
    latinName: 'Colon / Intestinum Crassum',
    system: 'Gastrointestinal System',
    location: 'Peripheral abdominal frame surrounding small intestine (ascending, transverse, descending, sigmoid)',
    primaryGlucoseRole:
      'Absorbs remaining water, electrolytes, and houses ~100 trillion commensal microorganisms. Anaerobic fermentation of non-digestible prebiotic dietary fibers yields Short-Chain Fatty Acids (SCFAs: acetate, propionate, butyrate).',
    insulinInteraction:
      'SCFAs bind free fatty acid receptors (FFAR2/3) on colonic L-cells, stimulating baseline GLP-1 and PYY secretion, reducing systemic inflammation, and improving peripheral insulin sensitivity.',
    healthyPhysiology:
      'Diverse, balanced gut microbiota maintains mucosal barrier integrity, synthesizes vitamin K, and produces metabolically protective metabolites that sustain insulin sensitivity.',
    type1DiabetesImpact:
      'Altered gut microbiome diversity (dysbiosis) and leaky mucosal junctions are associated with autoimmune pathogenesis, increasing systemic endotoxin translocation (LPS).',
    type2DiabetesImpact:
      'Gut dysbiosis with reduced butyrate-producing species (e.g. Faecalibacterium prausnitzii) correlates with increased systemic metabolic endotoxemia, macrophage infiltration into fat, and worsening insulin resistance.',
    transportersAndHormones: ['SCFAs (Butyrate, Acetate, Propionate)', 'FFAR2', 'FFAR3', 'Tight Junction Claudins'],
    clinicalMetrics: [
      { label: 'Colonic Transit Time', normalValue: '24 - 48', unit: 'hours' },
      { label: 'Daily SCFA Production', normalValue: '300 - 400', unit: 'mmol/day' }
    ]
  },

  skeletal_muscle: {
    id: 'skeletal_muscle',
    name: 'Skeletal Muscle Tissue',
    latinName: 'Musculi Sceleti',
    system: 'Musculoskeletal System',
    location: 'Quadriceps, pectoralis, deltoids, biceps, core, and major limb muscle groups (~40% body weight)',
    primaryGlucoseRole:
      'Quantitatively the largest sink for postprandial glucose disposal, accounting for 70–80% of total insulin-mediated glucose clearance. Utilizes glucose for immediate aerobic/anaerobic ATP generation or stores it as intracellular muscle glycogen.',
    insulinInteraction:
      'Insulin binds to muscle cell tyrosine kinase receptors, activating IRS-1 -> PI3K -> Akt kinase cascade. This triggers the translocation of intracellular vesicles containing GLUT4 glucose transporters to fuse with the sarcolemma, allowing glucose uptake.',
    healthyPhysiology:
      'In the presence of insulin or physical activity, skeletal muscle glucose uptake increases up to 20- to 50-fold. Muscle contraction activates AMPK, which mobilizes GLUT4 independently of insulin.',
    type1DiabetesImpact:
      'In absolute insulin deficiency, GLUT4 remains sequestered intracellularly. Muscle cannot take up glucose, switching to amino acid and fatty acid catabolism, causing muscle wasting and severe systemic hyperglycemia.',
    type2DiabetesImpact:
      'Primary site of peripheral insulin resistance. Intramyocellular lipid accumulation (diacylglycerols, ceramides) inhibits IRS-1 phosphorylation, drastically reducing GLUT4 translocation. Regular exercise bypasses this defect via AMPK activation.',
    transportersAndHormones: ['GLUT4 (Insulin-dependent)', 'GLUT1 (Basal)', 'AMPK', 'Glycogen Synthase', 'Hexokinase II'],
    clinicalMetrics: [
      { label: 'Share of Postprandial Disposal', normalValue: '70 - 80', unit: '%' },
      { label: 'Muscle Glycogen Storage', normalValue: '350 - 500', unit: 'g' },
      { label: 'Exercise Glucose Clearance Boost', normalValue: '5x - 20x', unit: 'fold increase' }
    ]
  },

  adipose_tissue: {
    id: 'adipose_tissue',
    name: 'Adipose Tissue (Visceral & Subcutaneous Fat)',
    latinName: 'Textus Adiposus',
    system: 'Endocrine & Metabolic System',
    location: 'Subcutaneous abdominal/thigh layers and visceral depots surrounding internal organs',
    primaryGlucoseRole:
      'Responsible for ~5-10% of systemic glucose uptake. Converts glucose into glycerol-3-phosphate for triglyceride synthesis (lipogenesis). Functions as a dynamic endocrine organ secreting adipokines (adiponectin, leptin, resistin).',
    insulinInteraction:
      'Insulin promotes GLUT4-mediated glucose uptake and stimulates Lipoprotein Lipase (LPL). Most critically, insulin potently inhibits Hormone-Sensitive Lipase (HSL), shutting down intracellular lipolysis and preventing free fatty acid (FFA) overflow.',
    healthyPhysiology:
      'In the fed state, insulin keeps circulating free fatty acids low (<0.4 mmol/L) and stores surplus energy safely as neutral triglycerides in subcutaneous adipocytes.',
    type1DiabetesImpact:
      'Absence of insulin causes unchecked, catastrophic activation of HSL. Rapid uncontrolled lipolysis floods the liver with free fatty acids, supplying the substrate for ketogenesis and life-threatening diabetic ketoacidosis (DKA).',
    type2DiabetesImpact:
      'Adipocyte hypertrophy and visceral fat expansion cause chronic low-grade inflammation (macrophage crown-like structures). Secretion of inflammatory cytokines (TNF-alpha, IL-6) and excess FFAs promotes ectopic fat deposition in liver and muscle, driving systemic insulin resistance.',
    transportersAndHormones: ['GLUT4', 'Hormone-Sensitive Lipase (HSL)', 'LPL', 'Adiponectin', 'Leptin'],
    clinicalMetrics: [
      { label: 'Fasting Free Fatty Acids (FFA)', normalValue: '0.1 - 0.6', unit: 'mmol/L' },
      { label: 'Insulin-Mediated Lipolysis Suppression', normalValue: '> 85', unit: '%' }
    ]
  },

  blood_vessels: {
    id: 'blood_vessels',
    name: 'Vascular Network & Portal Circulation',
    latinName: 'Systema Cardiovasculare',
    system: 'Cardiovascular System',
    location: 'Aorta, vena cava, hepatic portal vein, mesenteric bed, peripheral capillary networks',
    primaryGlucoseRole:
      'High-speed conduit carrying dissolved glucose (molecular mass 180.16 g/mol) and endocrine hormones (insulin, glucagon, amylin) throughout the entire organism. Maintains osmotic balance and delivers oxygenated fuel to vital organs.',
    insulinInteraction:
      'Insulin has direct endothelial vasodilatory properties by stimulating endothelial nitric oxide synthase (eNOS) via the PI3K-Akt pathway. This opens capillary recruitment in skeletal muscle, accelerating nutrient delivery.',
    healthyPhysiology:
      'Circulates ~5 liters of blood with ~4 grams of total dissolved glucose under normal fasting conditions (equivalent to one single teaspoon of sugar in the entire bloodstream).',
    type1DiabetesImpact:
      'Acute severe hyperglycemia elevates plasma osmolality and hyperviscosity. Chronic fluctuations cause microvascular damage (endothelial thickening, microaneurysms) in retinal, renal, and neural capillaries.',
    type2DiabetesImpact:
      'Endothelial insulin resistance impairs nitric oxide release while preserving the MAP kinase pathway (which drives endothelin-1 and vascular smooth muscle hypertrophy), accelerating atherosclerosis and hypertension.',
    transportersAndHormones: ['Endothelial NOS (eNOS)', 'Nitric Oxide (NO)', 'Endothelin-1', 'AGE Receptors (RAGE)'],
    clinicalMetrics: [
      { label: 'Total Circulating Glucose (Fasting)', normalValue: '3.8 - 4.5', unit: 'g (in 5L blood)' },
      { label: 'Portal-Systemic Gradient (Fed)', normalValue: '+20 - 40', unit: 'mg/dL higher in portal' },
      { label: 'Capillary Transit Time', normalValue: '1 - 2', unit: 'seconds' }
    ]
  },

  kidneys: {
    id: 'kidneys',
    name: 'Kidneys (Renal Filtration & Reabsorption)',
    latinName: 'Renes',
    system: 'Urinary & Renal System',
    location: 'Retroperitoneal posterior abdomen flanking the vertebral column (T12 to L3)',
    primaryGlucoseRole:
      'Filters approximately 180 liters of blood plasma daily, processing ~160 to 180 grams of glucose through glomeruli. Under normal conditions, virtually 100% of filtered glucose is reabsorbed back into circulation in the proximal convoluted tubules.',
    insulinInteraction:
      'Reabsorption is performed actively by SGLT2 (Sodium-Glucose Cotransporter 2, accounts for ~90%) and SGLT1 (~10%). Does not require insulin for reabsorption, but renal gluconeogenesis is regulated by insulin and acid-base status.',
    healthyPhysiology:
      'No detectable glucose in urine (<0.5 g/day). The renal threshold for glucose (RT_G) is approximately 180 mg/dL (10 mmol/L).',
    type1DiabetesImpact:
      'When blood glucose exceeds ~180 mg/dL, tubule reabsorptive transport maximum (Tm_G) is saturated. Excess glucose spills into urine (glucosuria), creating osmotic diuresis, fluid depletion (polyuria), thirst (polydipsia), and electrolyte loss.',
    type2DiabetesImpact:
      'Maladaptively, the renal threshold for glucose is upregulated in T2D due to increased SGLT2 expression, exacerbating hyperglycemia. SGLT2 inhibitor medications (e.g. empagliflozin, dapagliflozin) block this reabsorption, excreting 60–80g of glucose daily.',
    transportersAndHormones: ['SGLT2 (Proximal Tubule S1/S2)', 'SGLT1 (S3 segment)', 'GLUT2', 'Renin', 'Erythropoietin'],
    clinicalMetrics: [
      { label: 'Filtered Glucose Daily', normalValue: '160 - 180', unit: 'g/day' },
      { label: 'Renal Glucose Threshold (RT_G)', normalValue: '180', unit: 'mg/dL' },
      { label: 'Normal Urinary Glucose', normalValue: '0', unit: 'g/day' }
    ]
  },

  brain: {
    id: 'brain',
    name: 'Brain (Central Nervous & Hypothalamic Sensing)',
    latinName: 'Cerebrum / Encephalon',
    system: 'Central Nervous System',
    location: 'Cranial cavity within the skull',
    primaryGlucoseRole:
      'The brain represents only ~2% of total body mass but consumes ~20-25% of whole-body resting glucose (~120 g/day or ~5 g/hour). Obligate glucose consumer unable to store or synthesize its own energy reserves.',
    insulinInteraction:
      'Glucose transport across the blood-brain barrier occurs via insulin-independent GLUT1, and neuronal uptake is facilitated by GLUT3. However, insulin receptors in the hypothalamus, hippocampus, and limbic structures regulate appetite, hepatic glucose output, and cognitive function.',
    healthyPhysiology:
      'Hypothalamic glucose-sensing neurons monitor ambient glycemic levels. When glucose falls below ~65–70 mg/dL, the autonomic sympathetic nervous system triggers the counter-regulatory hormone response (glucagon, epinephrine, norepinephrine).',
    type1DiabetesImpact:
      'Recurrent hypoglycemia blunts the sympathoadrenal response, causing Hypoglycemia-Associated Autonomic Failure (HAAF) or hypoglycemia unawareness. Severe neuroglycopenia (<50 mg/dL) produces cognitive deficits, seizures, or coma.',
    type2DiabetesImpact:
      'Central cerebral insulin resistance impairs hypothalamic appetite control (satiety signaling) and contributes to neurodegenerative pathology (sometimes termed Type 3 Diabetes in Alzheimer research).',
    transportersAndHormones: ['GLUT1 (Blood-Brain Barrier)', 'GLUT3 (Neuronal)', 'Insulin Receptors (Hypothalamus)', 'POMC / NPY Neurons'],
    clinicalMetrics: [
      { label: 'Daily Brain Glucose Usage', normalValue: '120 - 140', unit: 'g/day (~5.5 g/hr)' },
      { label: 'Sympathetic Trigger Threshold', normalValue: '65 - 70', unit: 'mg/dL' },
      { label: 'Neuroglycopenia Threshold', normalValue: '< 54', unit: 'mg/dL' }
    ]
  },

  heart: {
    id: 'heart',
    name: 'Heart (Cardiovascular Central Pump)',
    latinName: 'Cor',
    system: 'Cardiovascular System',
    location: 'Thoracic middle mediastinum between the lungs, resting on diaphragm',
    primaryGlucoseRole:
      'The constantly contracting myocardium requires vast ATP. In the healthy fasting state, it derives 60–70% of energy from fatty acid beta-oxidation and 20–30% from glucose and lactate. Following meals, insulin shifts cardiac fuel utilization toward glucose oxidation.',
    insulinInteraction:
      'Insulin enhances myocardial glucose uptake via GLUT4 and GLUT1. Normal insulin signaling is vital for cardiac metabolic flexibility (switching seamlessly between fatty acids and carbohydrates).',
    healthyPhysiology:
      'Pumps ~70 mL per beat (~5 L/min at rest), ensuring immediate systemic distribution of absorbed nutrients and insulin throughout the arterial tree.',
    type1DiabetesImpact:
      'Diabetic cardiomyopathy can develop independent of coronary artery disease, characterized by myocardial fibrosis, impaired diastolic relaxation, and autonomic neuropathy (resting tachycardia, reduced heart rate variability).',
    type2DiabetesImpact:
      'Cardiovascular disease is the leading cause of morbidity and mortality in T2D (2- to 4-fold higher risk of heart failure, myocardial infarction, and stroke). SGLT2 inhibitors and GLP-1 receptor agonists deliver proven cardiovascular protective benefits.',
    transportersAndHormones: ['GLUT4', 'GLUT1', 'CD36 (Fatty Acid Transporter)', 'AMPK', 'Pyruvate Dehydrogenase'],
    clinicalMetrics: [
      { label: 'Cardiac Output', normalValue: '4.8 - 6.0', unit: 'L/min' },
      { label: 'Myocardial Glucose Share', normalValue: '20 - 30', unit: '% of ATP fuel' }
    ]
  },

  lungs: {
    id: 'lungs',
    name: 'Lungs (Pulmonary Gas Exchange & Acid-Base Buffer)',
    latinName: 'Pulmones',
    system: 'Respiratory System',
    location: 'Right and left pleural cavities flanking the heart in the thorax',
    primaryGlucoseRole:
      'Performs pulmonary alveolar gas exchange (supplying O2 essential for oxidative phosphorylation and removing metabolic CO2). Serves as the immediate physiological buffer against metabolic acidosis through respiratory rate adjustments.',
    insulinInteraction:
      'Pulmonary alveolar epithelial cells express abundant insulin receptors. Inhaled technosphere insulin (Afrezza) utilizes the immense alveolar capillary surface area (~100 m²) for ultra-rapid systemic insulin absorption.',
    healthyPhysiology:
      'Maintains systemic arterial pH strictly between 7.35 and 7.45 by modulating alveolar ventilation to blow off or retain carbon dioxide.',
    type1DiabetesImpact:
      'In Diabetic Ketoacidosis (DKA), excess ketoacids deplete bicarbonate. The respiratory center stimulates deep, rapid, labored hyperventilation (Kussmaul breathing) with characteristic fruity acetone breath odor to eliminate CO2 and compensate for metabolic acidosis.',
    type2DiabetesImpact:
      'Associated with microvascular pulmonary capillary thickening, reduced diffusing capacity for carbon monoxide (DLCO), and high prevalence of Obstructive Sleep Apnea (OSA), which compounds insulin resistance via nocturnal hypoxia and cortisol surges.',
    transportersAndHormones: ['Carbonic Anhydrase', 'GLUT1', 'ACE (Angiotensin Converting Enzyme)'],
    clinicalMetrics: [
      { label: 'Alveolar Surface Area', normalValue: '100 - 140', unit: 'm²' },
      { label: 'Normal Arterial pH', normalValue: '7.35 - 7.45', unit: 'pH' }
    ]
  }
};
